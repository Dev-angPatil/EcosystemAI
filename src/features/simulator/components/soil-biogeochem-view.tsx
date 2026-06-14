"use client";

import React, { useState, useMemo } from "react";
import { useSimulationStore } from "../store";
import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  Area,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Map as MapIcon, Activity, Cpu, Info, CheckCircle2, AlertCircle } from "lucide-react";

export function SoilBiogeochemView() {
  const {
    timeline,
    currentYear,
    selectedCell,
    setSelectedCell,
    hoveredCell,
    setHoveredCell,
    setIsPlaying,
    controls,
  } = useSimulationStore();

  const [activeNutrientMap, setActiveNutrientMap] = useState<string>("C");

  // Retrieve current active data point
  const currentPt = useMemo(() => {
    return timeline[currentYear] ?? timeline[timeline.length - 1] ?? null;
  }, [timeline, currentYear]);

  // Selected cell data
  const selectedCellData = useMemo(() => {
    if (!selectedCell || !currentPt) return null;
    return currentPt.cells?.find((c) => c.x === selectedCell.x && c.y === selectedCell.y) || null;
  }, [selectedCell, currentPt]);

  // Default cell data if none is hovered or selected
  const displayCell = useMemo(() => {
    if (hoveredCell) {
      const match = currentPt?.cells?.find(c => c.x === hoveredCell.x && c.y === hoveredCell.y);
      if (match) return match;
    }
    if (selectedCellData) return selectedCellData;
    // Fallback to average or center cell
    return currentPt?.cells?.find((c) => c.x === 5 && c.y === 5) || null;
  }, [hoveredCell, selectedCellData, currentPt]);

  // Timeline-wide average Century SOM and N data
  const somTimelineData = useMemo(() => {
    return timeline.map((pt) => {
      const cells = pt.cells || [];
      const count = cells.length || 1;
      const active = cells.reduce((sum, c) => sum + (c.som_active_c ?? 0), 0) / count;
      const slow = cells.reduce((sum, c) => sum + (c.som_slow_c ?? 0), 0) / count;
      const passive = cells.reduce((sum, c) => sum + (c.som_passive_c ?? 0), 0) / count;
      const ammonium = cells.reduce((sum, c) => sum + (c.soil_ammonium ?? 0), 0) / count;
      const nitrate = cells.reduce((sum, c) => sum + (c.soil_nitrate ?? 0), 0) / count;
      return {
        year: pt.year,
        Active: parseFloat(active.toFixed(2)),
        Slow: parseFloat(slow.toFixed(2)),
        Passive: parseFloat(passive.toFixed(2)),
        Ammonium: parseFloat(ammonium.toFixed(3)),
        Nitrate: parseFloat(nitrate.toFixed(3)),
      };
    });
  }, [timeline]);

  // Compute decomposition rates based on current soil parameters
  const decompRates = useMemo(() => {
    const temp = controls.temperature;
    const sm = displayCell?.soil_moisture ?? 0.15;
    
    const T_soil = Math.exp(0.07 * (temp - 20.0));
    const W_soil = sm / 0.30;
    
    // Rates per year (approximate dt scaling removed for display clarity)
    const k_active = 0.05 * T_soil * W_soil;
    const k_slow = 0.005 * T_soil * W_soil;
    const k_passive = 0.0002 * T_soil * W_soil;

    return { k_active, k_slow, k_passive, T_soil, W_soil };
  }, [controls.temperature, displayCell]);

  // Liebig's Law Limitation Ratios
  const liebigIndexes = useMemo(() => {
    if (!displayCell) return null;
    
    const active = displayCell.som_active_c ?? 100.0;
    const slow = displayCell.som_slow_c ?? 500.0;
    const passive = displayCell.som_passive_c ?? 1000.0;
    
    const totalC = active + slow + passive;
    const ammonium = displayCell.soil_ammonium ?? 2.0;
    const nitrate = displayCell.soil_nitrate ?? 1.5;
    const totalN = ammonium + nitrate;
    
    const totalP = displayCell.nutrients?.["P"] ?? 30.0;

    // Stoichiometric requirement ratios (Producers: C:N=40, C:P=400)
    const neededN = totalC / 40.0;
    const neededP = totalC / 400.0;

    const nLimIndex = neededN > 0 ? totalN / neededN : 1;
    const pLimIndex = neededP > 0 ? totalP / neededP : 1;

    let minimum = "Carbon / Light";
    let minVal = 1.0;

    if (nLimIndex < pLimIndex && nLimIndex < 1.0) {
      minimum = "Nitrogen (N)";
      minVal = nLimIndex;
    } else if (pLimIndex < nLimIndex && pLimIndex < 1.0) {
      minimum = "Phosphorus (P)";
      minVal = pLimIndex;
    }

    return {
      nIndex: Math.min(2.0, nLimIndex),
      pIndex: Math.min(2.0, pLimIndex),
      cIndex: 1.0, // base standard
      minimum,
      minVal,
      totalC,
      totalN,
      totalP,
    };
  }, [displayCell]);

  return (
    <Tabs defaultValue="nutrients-map" className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between border-b border-hairline pb-2 mb-3">
        <TabsList>
          <TabsTrigger value="nutrients-map" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <MapIcon className="size-3" /> Nutrient Heatmap
          </TabsTrigger>
          <TabsTrigger value="nutrients-chart" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="size-3" /> Stoichiometry Timeline
          </TabsTrigger>
          <TabsTrigger value="som-pools" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="size-3" /> Century Soil Pools
          </TabsTrigger>
          <TabsTrigger value="som-diagram" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Cpu className="size-3" /> Decomposition Flow
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted uppercase">Soil Pool:</span>
          <select 
            value={activeNutrientMap}
            onChange={(e) => setActiveNutrientMap(e.target.value)}
            className="bg-surface-card border border-hairline rounded text-xs text-primary font-mono px-2 py-1 focus:outline-none"
          >
            <option value="C">Carbon (C)</option>
            <option value="N">Nitrogen (N)</option>
            <option value="P">Phosphorus (P)</option>
          </select>
        </div>
      </div>

      {/* 1. Heatmap Tab */}
      <TabsContent value="nutrients-map" className="flex-1 flex flex-col min-h-0 focus:outline-none mt-0">
        <div className="flex-1 flex flex-col md:flex-row gap-4 h-full min-h-[340px]">
          <div className="flex-1 flex items-center justify-center p-3 bg-surface-soft border border-hairline rounded-lg relative">
            <svg viewBox="0 0 100 100" className="w-full max-w-[400px] aspect-square rounded select-none">
              {Array.from({ length: 10 }).map((_, y) => 
                Array.from({ length: 10 }).map((_, x) => {
                  const cells = currentPt?.cells || [];
                  const cell = cells.find(c => c.x === x && c.y === y) || { populations: {}, nutrients: {}, x, y, toxin_concentration: 0, hypoxic: false };
                  const val = (cell.nutrients as Record<string, number>)[activeNutrientMap] ?? 0.0;
                  
                  let r = 0, g = 0, b = 0;
                  if (activeNutrientMap === "C") {
                    r = Math.min(220, Math.floor(val * 0.45));
                    g = Math.min(160, Math.floor(val * 0.28));
                    b = 40;
                  } else if (activeNutrientMap === "N") {
                    r = Math.min(150, Math.floor(val * 0.8));
                    g = 40;
                    b = Math.min(240, Math.floor(val * 1.5));
                  } else {
                    r = 30;
                    g = Math.min(200, Math.floor(val * 1.8));
                    b = Math.min(220, Math.floor(val * 2.2));
                  }
                  
                  const opacity = Math.min(0.95, Math.max(0.1, val / 400.0));
                  const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                  const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;

                  return (
                    <rect
                      key={`${x}-${y}`}
                      x={x * 10}
                      y={y * 10}
                      width={9.2}
                      height={9.2}
                      rx={1}
                      fill={`rgb(${r}, ${g}, ${b})`}
                      fillOpacity={opacity}
                      stroke={isSelected ? "#faff69" : isHovered ? "rgba(250, 255, 105, 0.4)" : "rgba(250, 255, 105, 0.05)"}
                      strokeWidth={isSelected ? 0.8 : isHovered ? 0.6 : 0.2}
                      className="cursor-pointer transition-all duration-300 hover:fill-opacity-90"
                      onMouseEnter={() => setHoveredCell({ 
                        x, 
                        y, 
                        populations: cell.populations || {}, 
                        nutrients: cell.nutrients || {},
                        toxin_concentration: cell.toxin_concentration,
                        hypoxic: cell.hypoxic 
                      })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => {
                        setSelectedCell({ x, y });
                        setIsPlaying(false);
                      }}
                    />
                  );
                })
              )}
            </svg>
          </div>

          <div className="w-full md:w-[220px] border-t md:border-t-0 md:border-l border-hairline p-4 bg-surface-card rounded-lg flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
                <Activity className="size-3.5" />
                Soil Stoichiometry
              </div>
              
              <div className="space-y-1 font-mono">
                <div className="font-semibold text-xs text-body-strong">
                  Coordinate: <span className="text-primary">[{displayCell?.x ?? 0}, {displayCell?.y ?? 0}]</span>
                </div>
                <div className="text-[9px] text-muted uppercase tracking-wider">
                  {hoveredCell ? "Hovered Cell Stocks" : "Selected Cell Stocks"}
                </div>
              </div>
              
              {displayCell && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-hairline">
                    <span className="text-amber-500">Carbon (C):</span>
                    <span className="text-white font-bold">{(displayCell.nutrients?.["C"] ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hairline">
                    <span className="text-violet-500">Nitrogen (N):</span>
                    <span className="text-white font-bold">{(displayCell.nutrients?.["N"] ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hairline">
                    <span className="text-cyan-500">Phosphorus (P):</span>
                    <span className="text-white font-bold">{(displayCell.nutrients?.["P"] ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hairline text-[10px]">
                    <span className="text-muted">Soil Moisture (θ):</span>
                    <span className="text-blue-400 font-bold">{(displayCell.soil_moisture ?? 0.15).toFixed(4)} m³/m³</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-[10px] text-muted italic leading-4 pt-4 border-t border-hairline">
              Liebig&apos;s Law of the Minimum dictates producer growth based on the scarcest of these three pools relative to stoichiometry.
            </div>
          </div>
        </div>
      </TabsContent>

      {/* 2. Stoichiometry Timeline Tab */}
      <TabsContent value="nutrients-chart" className="flex-1 min-h-[340px] focus:outline-none mt-0 relative">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
              <XAxis dataKey="year" stroke="#5a5a5a" tickLine={false} tick={{ fontSize: 9, fontFamily: "monospace" }} />
              <YAxis stroke="#5a5a5a" tickLine={false} axisLine={false} tick={{ fontSize: 9, fontFamily: "monospace" }} />
              <Tooltip contentStyle={{ background: "#121212", borderColor: "#222222", fontSize: 10, fontFamily: "monospace", color: "#ffffff", borderRadius: 4 }} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
              
              <Line type="monotone" dataKey="nutrients.C" name="Carbon (C)" stroke="#d97706" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="nutrients.N" name="Nitrogen (N)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="nutrients.P" name="Phosphorus (P)" stroke="#faff69" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </TabsContent>

      {/* 3. SOM Pools Area Charts */}
      <TabsContent value="som-pools" className="flex-1 min-h-[340px] focus:outline-none mt-0 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
          {/* Carbon pools */}
          <div className="bg-surface-card border border-hairline p-4 rounded-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-mono text-primary uppercase tracking-wider mb-1">Soil Organic Carbon Pools (Century Model)</h3>
              <p className="text-[9px] font-mono text-muted mb-3">Decomposition cycles carbon through active (labile), slow (cellular), and passive (humus) pools.</p>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={somTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                  <XAxis dataKey="year" stroke="#5a5a5a" tick={{ fontSize: 8, fontFamily: "monospace" }} />
                  <YAxis stroke="#5a5a5a" tick={{ fontSize: 8, fontFamily: "monospace" }} />
                  <Tooltip contentStyle={{ background: "#121212", borderColor: "#222222", fontSize: 9, fontFamily: "monospace", color: "#ffffff", borderRadius: 4 }} />
                  <Legend wrapperStyle={{ fontSize: 8, fontFamily: "monospace" }} />
                  <Area type="monotone" dataKey="Active" name="Active (Labile)" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="Slow" name="Slow (Cellular)" stackId="1" stroke="#a16207" fill="#a16207" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="Passive" name="Passive (Humified)" stackId="1" stroke="#78350f" fill="#78350f" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Nitrogen stocks */}
          <div className="bg-surface-card border border-hairline p-4 rounded-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-mono text-primary uppercase tracking-wider mb-1">Soil Inorganic Nitrogen Stocks</h3>
              <p className="text-[9px] font-mono text-muted mb-3">Ammonium (NH₄⁺) is mineralized, nitrified to Nitrate (NO₃⁻), or denitrified under hypoxia.</p>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={somTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                  <XAxis dataKey="year" stroke="#5a5a5a" tick={{ fontSize: 8, fontFamily: "monospace" }} />
                  <YAxis stroke="#5a5a5a" tick={{ fontSize: 8, fontFamily: "monospace" }} />
                  <Tooltip contentStyle={{ background: "#121212", borderColor: "#222222", fontSize: 9, fontFamily: "monospace", color: "#ffffff", borderRadius: 4 }} />
                  <Legend wrapperStyle={{ fontSize: 8, fontFamily: "monospace" }} />
                  <Line type="monotone" dataKey="Ammonium" name="Ammonium (NH₄⁺)" stroke="#a78bfa" strokeWidth={1.8} dot={false} />
                  <Line type="monotone" dataKey="Nitrate" name="Nitrate (NO₃⁻)" stroke="#818cf8" strokeWidth={1.8} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* 4. Century Decomposition & N-Mineralization SVG Flow Diagram & Liebig Gauges */}
      <TabsContent value="som-diagram" className="flex-1 min-h-[340px] focus:outline-none mt-0 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          
          {/* SVG Diagram Card */}
          <div className="lg:col-span-8 bg-surface-card border border-hairline p-4 rounded-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-mono text-primary uppercase tracking-wider">Century Kinetic Flow Model</h3>
              <p className="text-[9px] font-mono text-muted mt-0.5">Carbon/Nitrogen transfer velocities scale dynamically with temperature and soil moisture.</p>
            </div>

            <div className="flex-1 flex items-center justify-center py-2 relative min-h-[220px]">
              {displayCell && (
                <svg viewBox="0 0 460 250" className="w-full max-w-[460px] h-auto">
                  <defs>
                    <marker id="som-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#3a3a3a" />
                    </marker>
                    <marker id="som-arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#faff69" />
                    </marker>
                  </defs>

                  {/* Flow lines (animated particle dots) */}
                  {/* Active -> Slow C */}
                  <path d="M 120,40 L 150,40" fill="none" stroke="#2a2a2a" strokeWidth="1.5" markerEnd="url(#som-arrow)" />
                  <path d="M 120,40 L 150,40" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3"
                    className="animate-flow-particles"
                    style={{ animationDuration: `${Math.max(1, 4 / (decompRates.k_active + 0.01))}s`, animationTimingFunction: "linear", animationIterationCount: "infinite" }}
                  />

                  {/* Slow -> Passive C */}
                  <path d="M 230,40 L 260,40" fill="none" stroke="#2a2a2a" strokeWidth="1.5" markerEnd="url(#som-arrow)" />
                  <path d="M 230,40 L 260,40" fill="none" stroke="#a16207" strokeWidth="1.5" strokeDasharray="3 3"
                    className="animate-flow-particles"
                    style={{ animationDuration: `${Math.max(1.5, 8 / (decompRates.k_slow + 0.001))}s`, animationTimingFunction: "linear", animationIterationCount: "infinite" }}
                  />

                  {/* Carbon Pools Boxes */}
                  {/* Active C */}
                  <g>
                    <rect x="40" y="20" width="80" height="40" rx="4" fill="#121212" stroke="#f59e0b" strokeWidth="1.2" />
                    <text x="80" y="35" textAnchor="middle" fill="#f59e0b" className="text-[8px] font-mono font-bold uppercase">Active SOM</text>
                    <text x="80" y="49" textAnchor="middle" fill="#e6e6e6" className="text-[9px] font-mono">{(displayCell.som_active_c ?? 100.0).toFixed(1)}</text>
                  </g>

                  {/* Slow C */}
                  <g>
                    <rect x="150" y="20" width="80" height="40" rx="4" fill="#121212" stroke="#a16207" strokeWidth="1.2" />
                    <text x="190" y="35" textAnchor="middle" fill="#a16207" className="text-[8px] font-mono font-bold uppercase">Slow SOM</text>
                    <text x="190" y="49" textAnchor="middle" fill="#e6e6e6" className="text-[9px] font-mono">{(displayCell.som_slow_c ?? 500.0).toFixed(1)}</text>
                  </g>

                  {/* Passive C */}
                  <g>
                    <rect x="260" y="20" width="80" height="40" rx="4" fill="#121212" stroke="#78350f" strokeWidth="1.2" />
                    <text x="300" y="35" textAnchor="middle" fill="#78350f" className="text-[8px] font-mono font-bold uppercase">Passive SOM</text>
                    <text x="300" y="49" textAnchor="middle" fill="#e6e6e6" className="text-[9px] font-mono">{(displayCell.som_passive_c ?? 1000.0).toFixed(1)}</text>
                  </g>

                  {/* Mineralization arrows to Ammonium */}
                  <path d="M 80,60 L 80,120 L 110,120" fill="none" stroke="#2a2a2a" strokeWidth="1" markerEnd="url(#som-arrow)" />
                  <path d="M 190,60 L 190,100 L 140,100 L 140,120" fill="none" stroke="#2a2a2a" strokeWidth="1" markerEnd="url(#som-arrow)" />
                  <text x="155" y="94" fill="#a78bfa" className="text-[6px] font-mono">mineralization</text>

                  {/* Inorganic Nitrogen Pools */}
                  {/* Ammonium Box */}
                  <g>
                    <rect x="90" y="120" width="80" height="36" rx="4" fill="#121212" stroke="#a78bfa" strokeWidth="1.2" />
                    <text x="130" y="132" textAnchor="middle" fill="#a78bfa" className="text-[7px] font-mono font-bold">AMMONIUM (NH₄⁺)</text>
                    <text x="130" y="145" textAnchor="middle" fill="#e6e6e6" className="text-[9px] font-mono">{(displayCell.soil_ammonium ?? 2.0).toFixed(3)}</text>
                  </g>

                  {/* Nitrification Arrow */}
                  <path d="M 170,138 L 220,138" fill="none" stroke="#2a2a2a" strokeWidth="1.5" markerEnd="url(#som-arrow)" />
                  <path d="M 170,138 L 220,138" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3 3"
                    className="animate-flow-particles"
                    style={{ animationDuration: `${Math.max(1, 3 / (decompRates.T_soil * 0.1 + 0.01))}s`, animationTimingFunction: "linear", animationIterationCount: "infinite" }}
                  />
                  <text x="195" y="132" fill="#818cf8" textAnchor="middle" className="text-[6px] font-mono">nitrification</text>

                  {/* Nitrate Box */}
                  <g>
                    <rect x="220" y="120" width="80" height="36" rx="4" fill="#121212" stroke="#818cf8" strokeWidth="1.2" />
                    <text x="260" y="132" textAnchor="middle" fill="#818cf8" className="text-[7px] font-mono font-bold">NITRATE (NO₃⁻)</text>
                    <text x="260" y="145" textAnchor="middle" fill="#e6e6e6" className="text-[9px] font-mono">{(displayCell.soil_nitrate ?? 1.5).toFixed(3)}</text>
                  </g>

                  {/* Denitrification Arrow (Gas loss) */}
                  <path d="M 300,138 L 330,138 L 330,180" fill="none" stroke="#2a2a2a" strokeWidth="1" markerEnd="url(#som-arrow)" />
                  <text x="335" y="160" fill="#ef4444" className="text-[6px] font-mono">denitrification</text>

                  {/* N2 Loss Box */}
                  <g>
                    <rect x="300" y="180" width="60" height="24" rx="2" fill="#121212" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
                    <text x="330" y="194" textAnchor="middle" fill="#ef4444" className="text-[7px] font-mono">N₂ Gas Loss</text>
                  </g>

                  {/* Plants recycling loop */}
                  <path d="M 380,80 L 380,20 L 120,20" fill="none" stroke="#2a2a2a" strokeWidth="1" strokeDasharray="2 2" markerEnd="url(#som-arrow)" />
                  <text x="340" y="15" fill="#888888" className="text-[6px] font-mono">litter recycling</text>

                  {/* Plant uptake arrow */}
                  <path d="M 260,120 L 260,95 L 360,95" fill="none" stroke="#10b981" strokeWidth="1.2" markerEnd="url(#som-arrow)" />
                  <path d="M 130,120 L 130,95 L 360,95" fill="none" stroke="#10b981" strokeWidth="1.2" />
                  <text x="290" y="90" fill="#10b981" className="text-[6px] font-mono">plant assimilation</text>

                  {/* Plant biomass node */}
                  <g>
                    <rect x="360" y="75" width="60" height="30" rx="3" fill="#121212" stroke="#10b981" strokeWidth="1.2" />
                    <text x="390" y="87" textAnchor="middle" fill="#10b981" className="text-[7px] font-mono font-bold">PLANTS</text>
                    <text x="390" y="98" textAnchor="middle" fill="#e6e6e6" className="text-[8px] font-mono">Biomass</text>
                  </g>
                </svg>
              )}
            </div>

            <div className="border-t border-hairline pt-2 flex justify-between items-center text-[9px] font-mono text-muted">
              <span>Kinetic temperature factor (T_soil): <strong>{decompRates.T_soil.toFixed(3)}x</strong></span>
              <span>Moisture scaling (W_soil): <strong>{decompRates.W_soil.toFixed(3)}x</strong></span>
            </div>
          </div>

          {/* Liebig's Law Card */}
          <div className="lg:col-span-4 bg-surface-card border border-hairline p-4 rounded-lg flex flex-col justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-mono text-primary uppercase tracking-wider">Liebig Limitation Gauges</h3>
              <p className="text-[9px] font-mono text-muted">Plant growth is restricted by the scarcest stoichiometric resource index.</p>
            </div>

            {liebigIndexes ? (
              <div className="flex-1 flex flex-col justify-center space-y-4 py-3">
                <div className="space-y-3 font-mono">
                  {/* Carbon / Light */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-amber-500">C / LIGHT INDEX:</span>
                      <span className="text-white font-bold">1.00</span>
                    </div>
                    <div className="w-full bg-surface-soft h-3 border border-hairline rounded overflow-hidden">
                      <div className="h-full bg-amber-500 opacity-60" style={{ width: "50%" }} />
                    </div>
                  </div>

                  {/* Nitrogen Gauge */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-violet-500">NITROGEN INDEX:</span>
                      <span className="text-white font-bold">{liebigIndexes.nIndex.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-surface-soft h-3 border border-hairline rounded overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (liebigIndexes.nIndex / 2.0) * 100)}%`,
                          backgroundColor: liebigIndexes.nIndex < 1.0 ? "#ef4444" : "#8b5cf6",
                          opacity: 0.7
                        }}
                      />
                    </div>
                  </div>

                  {/* Phosphorus Gauge */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-cyan-500">PHOSPHORUS INDEX:</span>
                      <span className="text-white font-bold">{liebigIndexes.pIndex.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-surface-soft h-3 border border-hairline rounded overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (liebigIndexes.pIndex / 2.0) * 100)}%`,
                          backgroundColor: liebigIndexes.pIndex < 1.0 ? "#ef4444" : "#06b6d4",
                          opacity: 0.7
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Liebig Result Display */}
                {liebigIndexes.minVal < 1.0 ? (
                  <div className="bg-red-950/20 border border-red-900/40 p-2.5 rounded flex gap-2 text-[10px] font-mono text-red-400">
                    <AlertCircle className="size-4 shrink-0 text-red-500" />
                    <div>
                      <strong>Limiting Factor: {liebigIndexes.minimum}</strong>
                      <div className="text-[9px] text-muted mt-0.5">Availability is below stoichiometric requirement ({liebigIndexes.minVal.toFixed(2)}x). Growth rate capped.</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded flex gap-2 text-[10px] font-mono text-emerald-400">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    <div>
                      <strong>Limiting Factor: Carbon/Light</strong>
                      <div className="text-[9px] text-muted mt-0.5">Soil nutrients are saturated. Primary productivity is limited by solar radiation/temperature.</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted font-mono text-xs py-6">
                Calculating limitation indexes...
              </div>
            )}
          </div>

        </div>
      </TabsContent>
    </Tabs>
  );
}
