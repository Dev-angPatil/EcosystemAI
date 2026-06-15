"use client";

import React, { useState, useMemo } from "react";
import { useSimulationStore } from "../store";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Line,
  Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { HelpCircle, AlertTriangle, Wind, Droplets } from "lucide-react";
import { CustomTooltip } from "./custom-tooltip";

export function CanopyPhysiologyView() {
  const { species, setSpecies, controls, timeline, currentYear } = useSimulationStore();
  const [selectedProducerId, setSelectedProducerId] = useState<string>("grass");

  // Retrieve current active data point
  const currentPt = useMemo(() => {
    return timeline[currentYear] ?? timeline[timeline.length - 1] ?? null;
  }, [timeline, currentYear]);

  // Calculate average soil moisture across cells
  const avgSoilMoisture = useMemo(() => {
    if (!currentPt || !currentPt.cells || currentPt.cells.length === 0) return 0.15;
    const sum = currentPt.cells.reduce((acc, c) => acc + (c.soil_moisture ?? 0.15), 0);
    return sum / currentPt.cells.length;
  }, [currentPt]);

  // Active species
  const activeProducers = useMemo(() => {
    return species.filter((s) => s.trophic_level === "Producer" && s.active);
  }, [species]);

  // Selected producer config
  const selectedProducer = useMemo(() => {
    return activeProducers.find((s) => s.id === selectedProducerId) || activeProducers[0] || null;
  }, [activeProducers, selectedProducerId]);

  // Ensure selectedProducerId is valid
  React.useEffect(() => {
    if (activeProducers.length > 0 && !activeProducers.find((s) => s.id === selectedProducerId)) {
      setSelectedProducerId(activeProducers[0].id);
    }
  }, [activeProducers, selectedProducerId]);

  // Formula for local JS compute_photosynthesis (matching backend + showing intermediate variables)
  const computePhotosynthesisIntermediate = (
    pathway: "C3" | "C4" | "CAM",
    Ca: number,
    Temp: number,
    RH: number,
    I: number,
    soilMoisture: number,
    growthRate: number
  ) => {
    const f_water = Math.min(1.0, Math.max(0.05, (soilMoisture - 0.08) / (0.30 - 0.08)));
    const hs = RH / 100.0;
    const Q10 = 2.0;
    const Rd = 0.015 * growthRate * Math.pow(Q10, (Temp - 20.0) / 10.0);
    
    let Ac = 0;
    let Aj = 0;
    let A_net = 0;
    let a_slope = 9.0;
    
    if (pathway === "C3") {
      const gamma_star = 40.0 + 1.8 * (Temp - 20.0);
      const Vc_max = growthRate * 2.5;
      Ac = Vc_max * Math.max(0.0, Ca - gamma_star) / (Ca + 736.0);
      const J_max = Vc_max * 1.8;
      const J = J_max * I / (I + 500.0);
      Aj = (J / 4.0) * Math.max(0.0, Ca - gamma_star) / (Ca + 2.0 * gamma_star);
      A_net = Math.max(0.0, Math.min(Ac, Aj) - Rd);
      a_slope = 9.0;
    } else if (pathway === "C4") {
      const Vc_max = growthRate * 2.5;
      Ac = Vc_max * Ca / (Ca + 50.0);
      const J_max = Vc_max * 1.8;
      Aj = (J_max * I / (I + 400.0)) * 0.2;
      A_net = Math.max(0.0, Math.min(Ac, Aj) - Rd);
      a_slope = 4.0;
    } else { // CAM
      const Vc_max = growthRate * 2.2;
      const A_raw = (Vc_max * Ca / (Ca + 100.0)) * (0.3 + 0.7 * f_water);
      Ac = A_raw;
      Aj = A_raw * 0.9; // CAM is mostly Rubisco-driven during the day
      A_net = Math.max(0.0, A_raw - Rd);
      a_slope = 1.5;
    }
    
    const g0 = 0.02;
    let gs = g0 + a_slope * (A_net * hs / Math.max(100.0, Ca)) * f_water;
    gs = Math.min(0.6, Math.max(g0, gs));

    // Vapor Pressure Deficit (VPD)
    const es = 0.6108 * Math.exp((17.27 * Temp) / (Temp + 237.3));
    const vpd = es * (1.0 - hs);
    const transpiration = gs * vpd * 1000; // mmol H2O / m2 / s

    return { A_net, gs, Ac, Aj, Rd, transpiration, vpd, f_water };
  };

  const currentStats = useMemo(() => {
    if (!selectedProducer) return null;
    return computePhotosynthesisIntermediate(
      selectedProducer.photosynthetic_pathway || "C3",
      controls.co2 ?? 420.0,
      controls.temperature,
      controls.relative_humidity ?? 65.0,
      controls.light_intensity ?? 800.0,
      avgSoilMoisture,
      selectedProducer.growth_rate
    );
  }, [selectedProducer, controls, avgSoilMoisture]);

  // Generate curve data for charts
  const parCurveData = useMemo(() => {
    if (!selectedProducer) return [];
    const pathway = selectedProducer.photosynthetic_pathway || "C3";
    const gr = selectedProducer.growth_rate;
    return Array.from({ length: 21 }).map((_, i) => {
      const par = i * 100;
      const stats = computePhotosynthesisIntermediate(
        pathway,
        controls.co2 ?? 420.0,
        controls.temperature,
        controls.relative_humidity ?? 65.0,
        par,
        avgSoilMoisture,
        gr
      );
      return {
        par,
        A_net: parseFloat(stats.A_net.toFixed(4)),
        Ac: parseFloat(stats.Ac.toFixed(4)),
        Aj: parseFloat(stats.Aj.toFixed(4)),
      };
    });
  }, [selectedProducer, controls, avgSoilMoisture]);

  const co2CurveData = useMemo(() => {
    if (!selectedProducer) return [];
    const pathway = selectedProducer.photosynthetic_pathway || "C3";
    const gr = selectedProducer.growth_rate;
    return Array.from({ length: 21 }).map((_, i) => {
      const co2 = i * 50;
      const stats = computePhotosynthesisIntermediate(
        pathway,
        co2,
        controls.temperature,
        controls.relative_humidity ?? 65.0,
        controls.light_intensity ?? 800.0,
        avgSoilMoisture,
        gr
      );
      return {
        co2,
        A_net: parseFloat(stats.A_net.toFixed(4)),
        Ac: parseFloat(stats.Ac.toFixed(4)),
        Aj: parseFloat(stats.Aj.toFixed(4)),
      };
    });
  }, [selectedProducer, controls, avgSoilMoisture]);

  const pathway = selectedProducer?.photosynthetic_pathway || "C3";

  return (
    <div className="space-y-4 h-full overflow-y-auto pr-1">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Physiology Controls Card */}
        <div className="bg-surface-card border border-hairline p-4 rounded-lg space-y-4">
          <h3 className="text-xs font-mono text-primary uppercase tracking-wider">Physiology Controls</h3>
          
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-muted block uppercase">Selected Autotroph:</label>
            <select
              value={selectedProducerId}
              onChange={(e) => setSelectedProducerId(e.target.value)}
              className="w-full bg-canvas border border-hairline rounded p-2 text-xs text-body-strong font-mono focus:outline-none focus:border-primary"
            >
              {activeProducers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-muted block uppercase">Photosynthetic Pathway:</label>
            <select
              value={pathway}
              onChange={(e) => {
                const path = e.target.value as "C3" | "C4" | "CAM";
                setSpecies(species.map(s => s.id === selectedProducerId ? { ...s, photosynthetic_pathway: path } : s));
              }}
              className="w-full bg-canvas border border-hairline rounded p-2 text-xs text-body-strong font-mono focus:outline-none focus:border-primary"
            >
              <option value="C3">C3 Pathway (RuBisCO Standard)</option>
              <option value="C4">C4 Pathway (PEPC Concentration)</option>
              <option value="CAM">CAM Pathway (Nocturnal Vacuolar)</option>
            </select>
          </div>

          {currentStats && (
            <div className="border-t border-hairline pt-3 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted">Net Photosynthesis (A):</span>
                <span className="text-emerald-400 font-bold">
                  {currentStats.A_net.toFixed(4)} <span className="text-[10px] text-muted">mol C/m²/yr</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Stomatal Conductance (gs):</span>
                <span className="text-primary font-bold">
                  {currentStats.gs.toFixed(4)} <span className="text-[10px] text-muted">mol/m²/s</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Transpiration Rate (E):</span>
                <span className="text-blue-400 font-bold">
                  {currentStats.transpiration.toFixed(2)} <span className="text-[10px] text-muted">mmol/m²/s</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Vapor Pressure Deficit (VPD):</span>
                <span className="text-amber-500 font-bold">
                  {currentStats.vpd.toFixed(3)} <span className="text-[10px] text-muted">kPa</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Water Use Efficiency (WUE):</span>
                <span className="text-primary font-bold">
                  {currentStats.transpiration > 0 ? (currentStats.A_net / currentStats.transpiration).toFixed(3) : "∞"}{" "}
                  <span className="text-[10px] text-muted">μmol/mmol</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Stomatal Pore Simulator & Pathway Diagram */}
        <div className="bg-surface-card border border-hairline p-4 rounded-lg flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono text-primary uppercase tracking-wider">Stomatal Pore & Gas Exchange</h3>
            <p className="text-[10px] font-mono text-muted mt-0.5">Dynamic pore dilation based on stomatal conductance ($g_s$).</p>
          </div>

          <div className="flex-1 flex items-center justify-center py-4 relative min-h-[160px]">
            {currentStats && (
              <svg viewBox="0 0 200 200" className="w-40 h-40">
                {/* Dark inner stomatal pore */}
                <ellipse
                  cx={100}
                  cy={100}
                  rx={Math.max(1, currentStats.gs * 36)}
                  ry={45}
                  fill="#000000"
                  stroke="rgba(34, 211, 238, 0.25)"
                  strokeWidth="1.5"
                />

                {/* Left Guard Cell */}
                <ellipse
                  cx={100 - 15 - currentStats.gs * 15}
                  cy={100}
                  rx={13 + currentStats.gs * 4}
                  ry={50 + currentStats.gs * 5}
                  fill="#10b981"
                  fillOpacity="0.85"
                  stroke="#047857"
                  strokeWidth="1.5"
                />

                {/* Right Guard Cell */}
                <ellipse
                  cx={100 + 15 + currentStats.gs * 15}
                  cy={100}
                  rx={13 + currentStats.gs * 4}
                  ry={50 + currentStats.gs * 5}
                  fill="#10b981"
                  fillOpacity="0.85"
                  stroke="#047857"
                  strokeWidth="1.5"
                />

                {/* Animated Gas arrows */}
                {currentStats.gs > 0.05 && (
                  <g className="animate-pulse">
                    {/* H2O leaving */}
                    <path d="M 90,80 Q 75,50 65,30" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 3" />
                    <circle cx="65" cy="30" r="2.5" fill="#60a5fa" />
                    <text x="55" y="25" fill="#60a5fa" className="text-[8px] font-mono select-none">H₂O</text>

                    {/* CO2 entering */}
                    <path d="M 125,30 Q 115,60 110,80" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 3" />
                    <circle cx="125" cy="30" r="2.5" fill="#ffffff" />
                    <text x="130" y="25" fill="#ffffff" className="text-[8px] font-mono select-none">CO₂</text>
                  </g>
                )}
              </svg>
            )}
            
            <div className="absolute bottom-1 right-1 bg-canvas/60 border border-hairline px-2 py-0.5 rounded text-[8px] font-mono text-muted uppercase">
              Stomatal State: {currentStats && currentStats.gs > 0.1 ? "OPEN" : "CLOSED / SECURED"}
            </div>
          </div>

          <div className="border-t border-hairline pt-3 flex gap-2 items-center text-[10px] font-mono text-muted">
            <Droplets className="size-3.5 text-blue-400 shrink-0" />
            <span>Soil moisture stress factor: <strong>{currentStats?.f_water.toFixed(2)}x</strong> multiplier.</span>
          </div>
        </div>

        {/* FvCB Photosynthesis Curves Card */}
        <div className="bg-surface-card border border-hairline p-4 rounded-lg flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono text-primary uppercase tracking-wider mb-2">Farquhar-von Caemmerer-Berry Curves</h3>
            <p className="text-[10px] font-mono text-muted">Plotted limits showing Rubisco activity ($A_c$, blue) and light/RuBP activity ($A_j$, yellow).</p>
          </div>

          <Tabs defaultValue="light" className="w-full flex-1 flex flex-col justify-between mt-2">
            <TabsList className="mb-2 w-fit">
              <TabsTrigger value="light" className="text-[9px] uppercase font-mono px-2 py-1">A vs Light (PAR)</TabsTrigger>
              <TabsTrigger value="co2" className="text-[9px] uppercase font-mono px-2 py-1">A vs CO₂ (Ca)</TabsTrigger>
            </TabsList>

            <TabsContent value="light" className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={parCurveData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
                  <XAxis dataKey="par" stroke="#5a5a5a" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontFamily: "monospace" }} />
                  <YAxis stroke="#5a5a5a" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontFamily: "monospace" }} />
                  <Tooltip content={<CustomTooltip labelPrefix="PAR" />} />
                  <Legend wrapperStyle={{ fontSize: 8, fontFamily: "monospace" }} verticalAlign="top" height={20} />
                  
                  <Line type="monotone" dataKey="Ac" name="Rubisco Limit (Ac)" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="3 3" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="Aj" name="Light Limit (Aj)" stroke="#eab308" strokeWidth={1.5} strokeDasharray="3 3" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="A_net" name="Net Photosynthesis (A)" stroke="#faff69" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <ReferenceLine x={controls.light_intensity ?? 800.0} stroke="#ef4444" strokeDasharray="2 2" />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="co2" className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={co2CurveData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
                  <XAxis dataKey="co2" stroke="#5a5a5a" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontFamily: "monospace" }} />
                  <YAxis stroke="#5a5a5a" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontFamily: "monospace" }} />
                  <Tooltip content={<CustomTooltip labelPrefix="CO₂" />} />
                  <Legend wrapperStyle={{ fontSize: 8, fontFamily: "monospace" }} verticalAlign="top" height={20} />
                  
                  <Line type="monotone" dataKey="Ac" name="Rubisco Limit (Ac)" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="3 3" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="Aj" name="Light Limit (Aj)" stroke="#eab308" strokeWidth={1.5} strokeDasharray="3 3" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="A_net" name="Net Photosynthesis (A)" stroke="#faff69" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <ReferenceLine x={controls.co2 ?? 420.0} stroke="#ef4444" strokeDasharray="2 2" />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Leaf Anatomy Biochemical Pathway Schematics */}
      <div className="bg-surface-card border border-hairline p-4 rounded-lg">
        <h4 className="text-xs font-mono text-primary uppercase mb-3">Biochemical Pathway Schematic: {pathway}</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Pathway SVG Diagram */}
          <div className="md:col-span-5 flex justify-center bg-surface-soft border border-hairline rounded p-3 min-h-[180px]">
            {pathway === "C3" && (
              <svg viewBox="0 0 160 160" className="w-full max-w-[150px]">
                {/* Mesophyll Cell */}
                <rect x="10" y="10" width="140" height="140" rx="10" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 2" />
                <text x="20" y="25" fill="#22c55e" className="text-[7px] font-mono font-bold select-none uppercase">Mesophyll Cell</text>

                {/* Pathway flows */}
                <g className="font-mono text-[8px]">
                  {/* CO2 Entry */}
                  <path d="M 80,10 L 80,45" fill="none" stroke="#e6e6e6" strokeWidth="1.2" markerEnd="url(#arrow)" />
                  <text x="85" y="22" fill="#e6e6e6">CO₂</text>

                  {/* Rubisco block */}
                  <rect x="40" y="45" width="80" height="24" rx="4" fill="#06b6d4" stroke="#0891b2" strokeWidth="1" />
                  <text x="80" y="59" fill="#0a0a0a" textAnchor="middle" className="font-bold">RuBisCO</text>

                  {/* Normal pathway */}
                  <path d="M 80,69 L 80,105" fill="none" stroke="#10b981" strokeWidth="1.2" />
                  <text x="85" y="90" fill="#10b981">Calvin (3-PGA)</text>
                  <circle cx="80" cy="110" r="8" fill="#10b981" />
                  <text x="80" y="113" fill="#0a0a0a" textAnchor="middle" className="font-bold">Sugar</text>

                  {/* Photorespiration */}
                  {controls.temperature > 25 ? (
                    <g className="animate-pulse">
                      <path d="M 120,57 Q 145,57 145,85" fill="none" stroke="#ef4444" strokeWidth="1.2" />
                      <text x="145" y="100" fill="#ef4444" textAnchor="middle" className="text-[7px]">Photorespiration</text>
                      <text x="145" y="110" fill="#ef4444" textAnchor="middle" className="text-[6px]">(T &gt; 25°C Stress)</text>
                    </g>
                  ) : (
                    <g opacity="0.3">
                      <path d="M 120,57 Q 145,57 145,85" fill="none" stroke="#888888" strokeWidth="1.2" />
                      <text x="145" y="100" fill="#888888" textAnchor="middle" className="text-[7px]">Low Photoresp.</text>
                    </g>
                  )}
                </g>
              </svg>
            )}

            {pathway === "C4" && (
              <svg viewBox="0 0 160 160" className="w-full max-w-[150px]">
                {/* Mesophyll Cell */}
                <rect x="5" y="5" width="70" height="150" rx="6" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" />
                <text x="10" y="16" fill="#22c55e" className="text-[6px] font-mono font-bold uppercase">Mesophyll</text>

                {/* Bundle Sheath Cell */}
                <rect x="85" y="5" width="70" height="150" rx="6" fill="none" stroke="#a78bfa" strokeWidth="1" />
                <text x="90" y="16" fill="#a78bfa" className="text-[6px] font-mono font-bold uppercase">Bundle Sheath</text>

                <g className="font-mono text-[7px] text-white">
                  {/* CO2 Entry to Mesophyll */}
                  <path d="M 40,5 L 40,30" fill="none" stroke="#e6e6e6" strokeWidth="1" />
                  <text x="44" y="14" fill="#e6e6e6">CO₂</text>

                  {/* PEPC enzyme */}
                  <rect x="15" y="30" width="50" height="18" rx="3" fill="#3b82f6" />
                  <text x="40" y="41" fill="#0a0a0a" textAnchor="middle" className="font-bold">PEP-C</text>

                  {/* C4 Malate conversion */}
                  <path d="M 40,48 L 40,75" fill="none" stroke="#60a5fa" strokeWidth="1" />
                  <text x="18" y="62" fill="#60a5fa">Malate (4C)</text>

                  {/* Plasmodesmata transfer */}
                  <path d="M 40,75 L 120,75" fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3 1" />
                  
                  {/* Decarboxylation in Bundle Sheath */}
                  <rect x="95" y="65" width="50" height="18" rx="3" fill="#a78bfa" />
                  <text x="120" y="76" fill="#0a0a0a" textAnchor="middle" className="font-bold">CO₂ conc.</text>
                  
                  {/* Rubisco Calvin Cycle */}
                  <path d="M 120,83 L 120,110" fill="none" stroke="#10b981" strokeWidth="1" />
                  <rect x="95" y="110" width="50" height="18" rx="3" fill="#06b6d4" />
                  <text x="120" y="121" fill="#0a0a0a" textAnchor="middle" className="font-bold">RuBisCO</text>

                  <path d="M 120,128 L 120,145" fill="none" stroke="#10b981" strokeWidth="1" />
                  <circle cx="120" cy="147" r="5" fill="#10b981" />
                </g>
              </svg>
            )}

            {pathway === "CAM" && (
              <svg viewBox="0 0 160 160" className="w-full max-w-[150px]">
                {/* Night-time panel */}
                <rect x="5" y="5" width="72" height="150" rx="6" fill="none" stroke="#3b82f6" strokeWidth="1" />
                <text x="10" y="16" fill="#3b82f6" className="text-[6px] font-mono font-bold uppercase">NOCTURNAL (FIX)</text>

                {/* Day-time panel */}
                <rect x="83" y="5" width="72" height="150" rx="6" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" />
                <text x="88" y="16" fill="#f59e0b" className="text-[6px] font-mono font-bold uppercase">DIURNAL (CALVIN)</text>

                <g className="font-mono text-[6px] text-white">
                  {/* Night: Stoma open, CO2 enters */}
                  <path d="M 41,5 L 41,25" fill="none" stroke="#60a5fa" strokeWidth="0.8" />
                  <text x="44" y="12" fill="#60a5fa">CO₂ In</text>

                  {/* PEP-C fixes to Malate */}
                  <rect x="15" y="25" width="52" height="14" rx="2" fill="#3b82f6" />
                  <text x="41" y="34" fill="#0a0a0a" textAnchor="middle" className="font-bold">PEP-C</text>

                  {/* Storage in Vacuole */}
                  <path d="M 41,39 L 41,55" fill="none" stroke="#60a5fa" strokeWidth="0.8" />
                  <rect x="12" y="55" width="58" height="30" rx="4" fill="none" stroke="#a78bfa" strokeWidth="1" />
                  <text x="41" y="67" fill="#a78bfa" textAnchor="middle" className="font-bold">VACUOLE</text>
                  <text x="41" y="77" fill="#a78bfa" textAnchor="middle">Malic Acid</text>

                  {/* Day: Release Malic Acid */}
                  <path d="M 41,85 Q 41,110 90,110" fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2 2" />
                  <text x="60" y="105" fill="#f59e0b">Decarb.</text>

                  {/* Day: Stoma closed, CO2 released internally */}
                  <text x="120" y="105" fill="#f59e0b" textAnchor="middle">CO₂ pool</text>
                  <path d="M 120,110 L 120,125" fill="none" stroke="#10b981" strokeWidth="0.8" />

                  {/* RuBisCO Chloroplast */}
                  <rect x="94" y="125" width="50" height="14" rx="2" fill="#06b6d4" />
                  <text x="119" y="134" fill="#0a0a0a" textAnchor="middle" className="font-bold font-mono">RuBisCO</text>
                </g>
              </svg>
            )}
          </div>

          {/* Description Text */}
          <div className="md:col-span-7 space-y-2 text-xs font-mono text-muted">
            {pathway === "C3" && (
              <>
                <h5 className="text-emerald-400 font-bold uppercase">C3 Photosynthesis (Ancestral Standard)</h5>
                <p>CO₂ is captured directly by RuBisCO in the mesophyll cells to form a 3-carbon compound (3-PGA). This is highly efficient under cool, moist environments with moderate light.</p>
                <div className="bg-red-950/20 border border-red-900/40 p-2.5 rounded text-[11px] flex gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-red-500" />
                  <div>
                    <strong>Photorespiration vulnerability:</strong> When temperatures exceed 25°C, RuBisCO increasingly binds O₂ instead of CO₂, wasting up to 25% of fixed carbon.
                  </div>
                </div>
              </>
            )}

            {pathway === "C4" && (
              <>
                <h5 className="text-primary font-bold uppercase">C4 Photosynthesis (Spatial Concentration)</h5>
                <p>Carbon fixation is divided between Mesophyll cells (PEPC fixes CO₂ to a 4-carbon malate compound) and Bundle Sheath cells (where malate is decarboxylated to release CO₂ directly onto RuBisCO).</p>
                <div className="bg-surface-soft border border-hairline p-2.5 rounded text-[11px] flex gap-2">
                  <Wind className="size-4 shrink-0 text-success" />
                  <div>
                    <strong>Photorespiration bypass:</strong> Concentrating CO₂ inside the bundle sheath suppresses oxygen binding. Highly efficient under high light, heat, and drought.
                  </div>
                </div>
              </>
            )}

            {pathway === "CAM" && (
              <>
                <h5 className="text-amber-400 font-bold uppercase">CAM Photosynthesis (Temporal Separation)</h5>
                <p>CO₂ capture and Calvin Cycle are separated in time. Stomata open strictly at night to fix CO₂ into malic acid stored in the large vacuoles. During the day, stomata lock closed to prevent transpiration, while malate releases CO₂ internally for chloroplast photosynthesis.</p>
                <div className="bg-surface-soft border border-hairline p-2.5 rounded text-[11px] flex gap-2">
                  <Wind className="size-4 shrink-0 text-primary" />
                  <div>
                    <strong>Water Conservation:</strong> Transpiration drops to near zero during hot daylight hours, creating extreme drought and desert resilience.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
