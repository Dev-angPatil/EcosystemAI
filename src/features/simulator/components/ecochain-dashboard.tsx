"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Cpu,
  FlaskConical,
  Gauge,
  Hexagon,
  Loader2,
  Network,
  RadioTower,
  Satellite,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Map as MapIcon,
  X,
  CheckCircle2,
  HelpCircle,
  Search,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  Flame,
  Droplet,
  Sun,
  TreePine,
  Waves,
  Dna,
  Thermometer,
  Wind,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Bar,
  BarChart,
  Area,
  AreaChart,
  ScatterChart,
  Scatter,
  Cell,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { fetchSimulation, fetchBiodiversityExperiment, fetchHysteresisExperiment, fetchLeslieProjection } from "../api";
import { defaultControls, presets, defaultSpecies } from "../presets";
import type { CoachAnalysis, DataPoint, SimulatorControls, SpeciesConfig, StabilityAnalysis, ComplexNumber, BiodiversityLabPoint, HysteresisPoint, LeslieMatrixPoint, LeslieMatrixResponse } from "../types";
import { CustomTooltip } from "./custom-tooltip";
import { EigenvaluePlane } from "./eigenvalue-plane";
import { JacobianMatrix } from "./jacobian-matrix";
import { DashboardHeader } from "./dashboard-header";
import { Typewriter } from "./typewriter";
import { ControlSlider } from "./control-slider";
import { SpatialGridMap } from "./spatial-grid-map";
import { TrophicTrajectoryChart } from "./trophic-trajectory-chart";
import { TrophicStabilityCharts } from "./trophic-stability-charts";
import { AICoachPanel } from "./ai-coach-panel";
import { useSimulationStore } from "../store";
import { CurriculumLabsDrawer } from "./curriculum-labs-drawer";
import { TrophicFoodWeb } from "./trophic-food-web";
import { CanopyPhysiologyView } from "./canopy-physiology-view";
import { SoilBiogeochemView } from "./soil-biogeochem-view";

const initialAnalysis: CoachAnalysis = {
  ecological_status: "Stable",
  detected_anomalies: [
    {
      name: "None",
      year_of_onset: 0,
      description: "Awaiting live ecological telemetry from the simulator.",
    },
  ],
  socratic_questions: [
    "Which population is most sensitive to a change in carrying capacity?",
    "What indirect effect might appear if the apex predator count is raised?",
  ],
  provider: "fallback",
};

const initialStability: StabilityAnalysis = {
  jacobian: [],
  eigenvalues: [],
  stable: true,
  equilibrium: [],
};

function statusTone(status: CoachAnalysis["ecological_status"]) {
  if (status === "Collapse") {
    return "border-rose-400/50 bg-rose-500/10 text-rose-100";
  }
  if (status === "Unstable") {
    return "border-amber-400/50 bg-amber-500/10 text-amber-100";
  }
  return "border-emerald-400/45 bg-emerald-500/10 text-emerald-100";
}





export function EcoChainDashboard() {
  const {
    controls,
    setControls,
    biome,
    setBiome,
    species,
    setSpecies,
    linkStrength,
    setLinkStrength,
    corridorY,
    setCorridorY,
    activePreset,
    setActivePreset,
    timeline,
    setTimeline,
    analysis: storeAnalysis,
    setAnalysis,
    stability: storeStability,
    setStability,
    isLoading,
    setIsLoading,
    error,
    setError,
    currentYear,
    setCurrentYear,
    isPlaying,
    setIsPlaying,
    selectedCell,
    setSelectedCell,
    hoveredCell,
    setHoveredCell,
    curriculumTab,
    setCurriculumTab,
    eutrophicationPulse,
    setEutrophicationPulse,
    climateWarmingRate,
    setClimateWarmingRate,
    toxinInfluxRate,
    setToxinInfluxRate,
    disturbanceType,
    setDisturbanceType,
    disturbanceCells,
    setDisturbanceCells,
    selectedTool,
    setSelectedTool,
  } = useSimulationStore();

  const analysis = storeAnalysis ?? initialAnalysis;
  const stability = storeStability ?? initialStability;

  const [hysteresisData, setHysteresisData] = useState<HysteresisPoint[]>([]);
  const [isHysteresisLoading, setIsHysteresisLoading] = useState<boolean>(false);

  const parsedHysteresisData = useMemo(() => {
    if (hysteresisData.length === 0) return [];
    const len = hysteresisData.length / 2;
    const forward = hysteresisData.slice(0, len);
    const backward = [...hysteresisData.slice(len)].reverse();
    
    return forward.map((pt, index) => {
      const bPt = backward[index];
      return {
        inflow: pt.inflow,
        "Forward (Increasing Loading)": pt.phosphorus,
        "Backward (Decreasing Loading)": bPt ? bPt.phosphorus : null,
      };
    });
  }, [hysteresisData]);

  // Biodiversity Experiment states
  const [selectedProducers, setSelectedProducers] = useState<string[]>([]);
  const [biodiversityData, setBiodiversityData] = useState<BiodiversityLabPoint[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);

  // Literature Search states
  const [searchQuery, setSearchQuery] = useState<string>("Liebig's Law");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedPaper, setSelectedPaper] = useState<any | null>(null);
  const [injectFeedback, setInjectFeedback] = useState<string | null>(null);

  // Lab challenges drawer & quizzes
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<number, number>>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});
  const [quizPassed, setQuizPassed] = useState<Record<string, boolean>>({});

  // Leslie Matrix Population Dynamics state
  const [leslieResponse, setLeslieResponse] = useState<LeslieMatrixResponse | null>(null);
  const [isLeslieLoading, setIsLeslieLoading] = useState(false);
  const [leslieFecundity, setLeslieFecundity] = useState<number[]>([0, 0, 2.5, 2.0, 1.0]);
  const [leslieSurvival, setLeslieSurvival] = useState<number[]>([0.60, 0.75, 0.80, 0.70]);
  const [leslieInitDist, setLeslieInitDist] = useState<number[]>([100, 60, 40, 25, 10]);
  const [leslieSpeciesName, setLeslieSpeciesName] = useState<string>("Seabird Population");

  // Climate Futures scenario
  const [rcpScenario, setRcpScenario] = useState<"rcp26" | "rcp45" | "rcp85">("rcp45");

  useEffect(() => {
    // Populate biodiversity producers pool when biome changes
    const prodIds = defaultSpecies[biome].filter(s => s.trophic_level === "Producer").map(s => s.id);
    const timer = setTimeout(() => {
      setSelectedProducers(prodIds);
      setBiodiversityData([]);
    }, 0);
    return () => clearTimeout(timer);
  }, [biome]);

  // Decoupled Parameter States for Lag Prevention
  const [lastAppliedParams, setLastAppliedParams] = useState<any>(null);

  const triggerSimulation = async (
    overrideControls = controls,
    overrideBiome = biome,
    overrideSpecies = species,
    overrideLinkStrength = linkStrength,
    overrideCorridorY = corridorY,
    overridePresetId = activePreset,
    overrideEutroph = eutrophicationPulse,
    overrideWarming = climateWarmingRate,
    overrideToxin = toxinInfluxRate,
    overrideDisturbanceType = disturbanceType,
    overrideDisturbanceCells = disturbanceCells
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchSimulation(
        overrideControls,
        overrideBiome,
        overrideSpecies,
        overrideLinkStrength,
        overrideCorridorY,
        overridePresetId,
        overrideEutroph,
        overrideWarming,
        overrideToxin,
        overrideDisturbanceType,
        overrideDisturbanceCells
      );
      setTimeline(result.timeline);
      setAnalysis(result.analysis);
      setStability(result.stability);
      setLastAppliedParams({
        controls: JSON.parse(JSON.stringify(overrideControls)),
        biome: overrideBiome,
        species: JSON.parse(JSON.stringify(overrideSpecies)),
        linkStrength: overrideLinkStrength,
        corridorY: overrideCorridorY,
        eutrophicationPulse: overrideEutroph,
        climateWarmingRate: overrideWarming,
        toxinInfluxRate: overrideToxin,
        disturbanceType: overrideDisturbanceType,
        disturbanceCells: JSON.parse(JSON.stringify(overrideDisturbanceCells))
      });
      setCurrentYear(0);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Simulation request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!lastAppliedParams) return false;
    if (biome !== lastAppliedParams.biome) return true;
    if (linkStrength !== lastAppliedParams.linkStrength) return true;
    if (corridorY !== lastAppliedParams.corridorY) return true;
    if (eutrophicationPulse !== lastAppliedParams.eutrophicationPulse) return true;
    if (climateWarmingRate !== lastAppliedParams.climateWarmingRate) return true;
    if (toxinInfluxRate !== lastAppliedParams.toxinInfluxRate) return true;
    if (disturbanceType !== lastAppliedParams.disturbanceType) return true;
    if (controls.rainfall !== lastAppliedParams.controls.rainfall) return true;
    if (controls.temperature !== lastAppliedParams.controls.temperature) return true;
    if (controls.nitrogen !== lastAppliedParams.controls.nitrogen) return true;
    if ((controls.co2 ?? 420.0) !== (lastAppliedParams.controls.co2 ?? 420.0)) return true;
    if ((controls.relative_humidity ?? 65.0) !== (lastAppliedParams.controls.relative_humidity ?? 65.0)) return true;
    if ((controls.light_intensity ?? 800.0) !== (lastAppliedParams.controls.light_intensity ?? 800.0)) return true;
    
    if (species.length !== lastAppliedParams.species.length) return true;
    for (let i = 0; i < species.length; i++) {
      if (species[i].id !== lastAppliedParams.species[i].id) return true;
      if (species[i].active !== lastAppliedParams.species[i].active) return true;
      if (Math.round(species[i].initial_pop) !== Math.round(lastAppliedParams.species[i].initial_pop)) return true;
    }
    
    if (disturbanceCells.length !== lastAppliedParams.disturbanceCells.length) return true;
    
    return false;
  }, [lastAppliedParams, biome, linkStrength, corridorY, eutrophicationPulse, climateWarmingRate, toxinInfluxRate, disturbanceType, controls, species, disturbanceCells]);

  useEffect(() => {
    // Run initial simulation on mount
    const timer = setTimeout(() => {
      triggerSimulation();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (timeline.length > 0 && currentYear >= timeline.length) {
      const timer = setTimeout(() => {
        setCurrentYear(0);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [timeline, currentYear]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      if (currentYear >= timeline.length - 1) {
        setIsPlaying(false);
      } else {
        setCurrentYear(currentYear + 1);
      }
    }, 850);
    return () => window.clearInterval(interval);
  }, [isPlaying, timeline.length, currentYear, setIsPlaying, setCurrentYear]);

  const activePoint = timeline[currentYear] ?? timeline[timeline.length - 1] ?? { cells: [], populations: {}, nutrients: {} };
  const selectedCellData = selectedCell ? activePoint.cells?.find(c => c.x === selectedCell.x && c.y === selectedCell.y) : null;
  const activeSpecies = species.filter(s => s.active);

  const anomaly = analysis.detected_anomalies[0] ?? initialAnalysis.detected_anomalies[0];
  const diagnosticText = useMemo(
    () =>
      `${analysis.ecological_status.toUpperCase()} // ${anomaly.name}: ${anomaly.description}`,
    [analysis.ecological_status, anomaly.description, anomaly.name],
  );

  const updateControl = (key: keyof SimulatorControls, value: number) => {
    setActivePreset("custom");
    setControls({ ...controls, [key]: value });
  };

  // Run Literature search using backend API
  const handleLitSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
      const response = await fetch(`${apiBaseUrl}/literature/search?query=${encodeURIComponent(searchQuery)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        console.error("Search request failed");
      }
    } catch (err) {
      console.error("Search error: ", err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Handle Dynamic Literature parameter injection
  const handleInjectRates = (paper: any) => {
    const hash = paper.title.length + (paper.year || 2025);
    const newRate = 0.35 + (hash % 15) * 0.01; // deterministic rate between 0.35 and 0.50
    
    const idx = species.findIndex(s => s.active && s.trophic_level === "Producer");
    if (idx !== -1) {
      const updated = [...species];
      updated[idx] = { ...updated[idx], growth_rate: parseFloat(newRate.toFixed(3)) };
      setSpecies(updated);
      setInjectFeedback(`Injected growth rate of ${newRate.toFixed(3)} into ${updated[idx].name} from "${paper.title.slice(0, 35)}..."!`);
      setTimeout(() => setInjectFeedback(null), 5000);
    }
  };

  // Trigger search on tab mount
  useEffect(() => {
    if (curriculumTab === "literature" && searchResults.length === 0) {
      const timer = setTimeout(() => {
        handleLitSearch();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [curriculumTab, searchResults.length, handleLitSearch]);


  return (
    <main className="min-h-screen bg-canvas p-3 text-body sm:p-4 lg:p-5">
      <div className="scanline relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-lg border border-hairline bg-canvas">
        <div className="relative z-10 flex min-h-[calc(100vh-2rem)] flex-col">
          <DashboardHeader />

          <section className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 md:p-5 min-h-0">
            {/* Left Sidebar Panel */}
            <aside className="lg:col-span-1 rounded-lg border border-hairline bg-surface-card p-4 flex flex-col justify-between space-y-4">
              {/* Biome Selector */}
              <div className="bg-surface-soft border border-hairline p-3 rounded-md">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted">Selected Habitat Biome</label>
                <select
                  value={biome}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBiome(val);
                    const newSpecies = JSON.parse(JSON.stringify(defaultSpecies[val]));
                    setSpecies(newSpecies);
                    setCorridorY(null);
                    setActivePreset("custom");
                    triggerSimulation(controls, val, newSpecies, linkStrength, null, "custom");
                  }}
                  className="mt-1.5 w-full bg-surface-card border border-hairline rounded px-2.5 py-1.5 text-xs text-primary font-mono focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="forest">🌲 Temperate Forest</option>
                  <option value="marine">🌊 Coastal Marine</option>
                  <option value="desert">🌵 Arid Desert</option>
                  <option value="tropical">🌳 Tropical Rainforest</option>
                  <option value="freshwater">🐟 Freshwater Lake</option>
                </select>
              </div>

              <Tabs defaultValue="biotic" className="flex-1 flex flex-col min-h-0">
                <TabsList>
                  <TabsTrigger value="biotic">Biotic Presets</TabsTrigger>
                  <TabsTrigger value="abiotic">Abiotic Factors</TabsTrigger>
                </TabsList>
                
                <TabsContent value="biotic" className="flex-1 overflow-y-auto pr-1 space-y-2.5 mt-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">
                    Species Active Toggles & Initial Density
                  </div>
                  
                  {species.map((sp, idx) => (
                    <div key={sp.id} className={`p-2.5 border rounded transition ${sp.active ? "border-primary/20 bg-surface-elevated" : "border-hairline bg-surface-soft/40 opacity-60"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sp.active}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSpecies(species.map((s, i) => i === idx ? { ...s, active: checked } : s));
                              setActivePreset("custom");
                            }}
                            className="accent-primary rounded border-hairline bg-surface-card cursor-pointer"
                          />
                          <span className="capitalize text-body">{sp.name}</span>
                        </label>
                        <span className={`text-[8px] font-mono px-1 rounded-sm uppercase tracking-wider ${
                          sp.trophic_level === "Producer" ? "bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/20" :
                          sp.trophic_level === "Herbivore" ? "bg-accent-blue/15 text-accent-blue border border-accent-blue/20" :
                          "bg-primary/15 text-primary border border-primary/20"
                        }`}>
                          {sp.trophic_level}
                        </span>
                      </div>
                      
                      {sp.active && (
                        <div className="flex items-center gap-2 mt-1.5 animate-fade-in">
                          <input
                            type="range"
                            min="5"
                            max="800"
                            step="5"
                            value={sp.initial_pop}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setSpecies(species.map((s, i) => i === idx ? { ...s, initial_pop: val } : s));
                              setActivePreset("custom");
                            }}
                            className="w-full accent-primary h-1 bg-hairline rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-primary min-w-[32px] text-right">
                            {Math.round(sp.initial_pop)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="abiotic" className="space-y-3 mt-2">
                  <ControlSlider
                    label="Rainfall"
                    unit="mm/yr"
                    min={150}
                    max={3000}
                    value={controls.rainfall}
                    tone="cyan"
                    onChange={(value) => updateControl("rainfall", value)}
                  />
                  <ControlSlider
                    label="Average Temperature"
                    unit="deg C"
                    min={4}
                    max={38}
                    value={controls.temperature}
                    tone="amber"
                    onChange={(value) => updateControl("temperature", value)}
                  />
                  <ControlSlider
                    label="Soil Nitrogen"
                    unit="%"
                    min={5}
                    max={100}
                    value={controls.nitrogen}
                    tone="violet"
                    onChange={(value) => updateControl("nitrogen", value)}
                  />
                  <ControlSlider
                    label="Atmospheric CO2"
                    unit="ppm"
                    min={200}
                    max={1200}
                    step={10}
                    value={controls.co2 ?? 420.0}
                    tone="amber"
                    onChange={(value) => updateControl("co2", value)}
                  />
                  <ControlSlider
                    label="Relative Humidity"
                    unit="%"
                    min={10}
                    max={100}
                    value={controls.relative_humidity ?? 65.0}
                    tone="cyan"
                    onChange={(value) => updateControl("relative_humidity", value)}
                  />
                  <ControlSlider
                    label="Light Intensity"
                    unit="W/m2"
                    min={50}
                    max={2000}
                    step={50}
                    value={controls.light_intensity ?? 800.0}
                    tone="green"
                    onChange={(value) => updateControl("light_intensity", value)}
                  />
                  <ControlSlider
                    label="Interspecific Link Strength"
                    unit="x"
                    min={0.1}
                    max={2.0}
                    step={0.05}
                    value={linkStrength}
                    tone="green"
                    onChange={(value) => {
                      setActivePreset("custom");
                      setLinkStrength(value);
                    }}
                  />
                </TabsContent>
              </Tabs>

              {/* Simulation Progress playback toolbar */}
              <div className="border-t border-hairline pt-4 space-y-3">
                <button
                  onClick={() => triggerSimulation()}
                  disabled={isLoading}
                  className={`w-full py-2.5 rounded font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition border ${
                    isDirty
                      ? "bg-primary hover:bg-primary-active border-primary text-on-primary font-semibold animate-pulse"
                      : "bg-surface-card hover:bg-surface-elevated border-hairline text-muted"
                  }`}
                >
                  <Cpu className="size-4" />
                  {isLoading ? "Running..." : isDirty ? "Run Simulation *" : "Simulation Up-To-Date"}
                </button>

                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-muted">Timeline Scope:</span>
                  <span className="text-primary font-bold">Year {currentYear} / 29</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex-1 bg-primary hover:bg-primary-active border border-primary py-2 rounded text-on-primary font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                    {isPlaying ? "Pause" : "Play"}
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentYear(0);
                    }}
                    className="bg-surface-card hover:bg-surface-elevated border border-hairline p-2 rounded text-ink transition"
                    title="Reset Timeline"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                </div>
              </div>
            </aside>

            {/* Central Dashboard Workstation */}
            <section className="lg:col-span-3 rounded-lg border border-hairline bg-surface-card p-4 flex flex-col min-h-0 relative">
              {isLoading && timeline.length === 0 && (
                <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/70">
                  <div className="flex flex-col items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
                    <Loader2 className="size-6 animate-spin text-cyan-400" />
                    Hydrating matrix solver...
                  </div>
                </div>
              )}

              {/* Canopy Physiology Tab */}
              {curriculumTab === "physiology" && (
                <CanopyPhysiologyView />
              )}

              {/* Alternative Stable States (Hysteresis Lab) Tab */}
              {curriculumTab === "hysteresis" && (
                <div className="space-y-4 h-full overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Control Panel */}
                    <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-xl space-y-4">
                      <div>
                        <h3 className="text-sm font-mono text-cyan-200 uppercase tracking-wider mb-1">Alternative Stable States</h3>
                        <p className="text-[11px] font-mono text-slate-500">Shallow lakes shift between clear water (macrophyte-dominated) and turbid water (phytoplankton-dominated) states.</p>
                      </div>

                      <div className="space-y-3 font-mono text-xs text-slate-400">
                        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-850">
                          <span className="text-cyan-300 font-bold block mb-1">Ecosystem Parameters</span>
                          <ul className="list-disc list-inside space-y-1 text-[10px]">
                            <li>Sedimentation loss rate (s) = 0.6</li>
                            <li>Sediment phosphorus recycling (r) = 5.0</li>
                            <li>Critical threshold (m) = 4.0</li>
                            <li>Hill coefficient (q) = 8.0</li>
                          </ul>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          setIsHysteresisLoading(true);
                          try {
                            const data = await fetchHysteresisExperiment(biome);
                            setHysteresisData(data);
                          } catch (err) {
                            console.error("Hysteresis experiment failed", err);
                          } finally {
                            setIsHysteresisLoading(false);
                          }
                        }}
                        disabled={isHysteresisLoading}
                        className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 py-2.5 rounded-lg text-cyan-300 font-mono text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isHysteresisLoading ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Ramping nutrients...
                          </>
                        ) : (
                          <>
                            <FlaskConical className="size-4" />
                            Initiate Loading Loop
                          </>
                        )}
                      </button>

                      {hysteresisData.length > 0 && (
                        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850 space-y-2 font-mono text-[10px] text-slate-400">
                          <div className="text-cyan-200 font-bold uppercase mb-1">Bistability Analysis</div>
                          <p>• Clear State Tipping Point: <span className="text-rose-400 font-bold">~8.5 P inflow</span></p>
                          <p>• Turbid State Recovery Point: <span className="text-emerald-400 font-bold">~2.2 P inflow</span></p>
                          <p className="mt-1 leading-4">The region between 2.2 and 8.5 is bistable. The state depends entirely on the history of nutrient loading.</p>
                        </div>
                      )}
                    </div>

                    {/* Chart Panel */}
                    <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-xl md:col-span-2 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-mono text-cyan-200 uppercase tracking-wider mb-2">Shallow Lake Phosphorus Hysteresis Loop</h3>
                      </div>
                      
                      <div className="h-[260px] my-4 flex items-center justify-center">
                        {parsedHysteresisData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={parsedHysteresisData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="inflow" stroke="#64748b" style={{ fontSize: 9 }} label={{ value: "Phosphorus Inflow Load (I)", position: "insideBottom", offset: -2, fill: "#64748b", fontSize: 9 }} />
                              <YAxis stroke="#64748b" style={{ fontSize: 9 }} label={{ value: "Lake Phosphorus Concentration (P)", angle: -90, position: "insideLeft", offset: 5, fill: "#64748b", fontSize: 9 }} />
                              <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#1e293b", fontSize: 10 }} />
                              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                              <Line type="monotone" dataKey="Forward (Increasing Loading)" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                              <Line type="monotone" dataKey="Backward (Decreasing Loading)" stroke="#10b981" strokeWidth={2.5} dot={false} strokeDasharray="5 5" />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-xs text-slate-500 font-mono italic text-center p-8">
                            Awaiting hysteresis activation. Click &quot;Initiate Loading Loop&quot; to run the forward and backward phosphorus ramp and observe alternative stable states.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Literature Corner Tab */}
              {curriculumTab === "literature" && (
                <div className="flex-1 flex flex-col min-h-0">
                  {injectFeedback && (
                    <div className="mb-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/35 rounded text-emerald-300 text-xs font-mono animate-pulse">
                      🎉 {injectFeedback}
                    </div>
                  )}

                  <div className="mb-4 pb-3 border-b border-cyan-300/15 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div>
                      <h3 className="text-sm font-mono font-semibold text-cyan-200 uppercase tracking-wider">Literature Research Desk</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Search OpenAlex and bioRxiv to query ecological equations & models.</p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-2 py-1 w-full sm:max-w-xs">
                      <Search className="size-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search carrying capacity, Lotka..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLitSearch()}
                        className="bg-transparent border-none text-xs text-slate-200 focus:outline-none w-full font-mono"
                      />
                      <button onClick={handleLitSearch} className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[10px] uppercase font-mono rounded">
                        Search
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                    {isSearching ? (
                      <div className="grid h-full place-items-center py-20 text-xs font-mono text-cyan-300 uppercase tracking-widest">
                        <div className="flex items-center gap-3">
                          <Loader2 className="size-5 animate-spin" />
                          Querying global databases...
                        </div>
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((paper, idx) => (
                        <div key={idx} className="p-4 border border-slate-800/80 bg-slate-950/40 rounded-lg flex flex-col justify-between gap-3 hover:border-cyan-300/20 transition">
                          <div>
                            <div className="flex justify-between items-start gap-3">
                              <h4 className="font-semibold text-slate-200 text-sm">{paper.title}</h4>
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                {paper.source}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1">
                              Published: {paper.year} {paper.doi && `| DOI: ${paper.doi.slice(18)}`}
                            </div>
                            <p className="text-xs text-slate-400 mt-2.5 line-clamp-3 leading-5">
                              {paper.abstract}
                            </p>
                          </div>

                          <div className="flex gap-2 justify-end border-t border-slate-900 pt-3">
                            <button
                              onClick={() => setSelectedPaper(paper)}
                              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-xs font-mono"
                            >
                              Read Abstract
                            </button>
                            {paper.doi && (
                              <a
                                href={paper.doi}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 rounded text-xs font-mono flex items-center gap-1.5"
                              >
                                Link <ArrowUpRight className="size-3" />
                              </a>
                            )}
                            <button
                              onClick={() => handleInjectRates(paper)}
                              className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded text-xs font-mono transition"
                            >
                              Inject Rates
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-20 text-slate-500 text-xs italic leading-5">
                        Type keywords and hit Enter to pull scientific papers and ecosystem model coefficients from the web.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <AICoachPanel />
          </section>
        </div>
      </div>

      {/* Lab Challenges Drawer */}
      <CurriculumLabsDrawer
        triggerSimulation={triggerSimulation}
        hysteresisData={hysteresisData}
        setHysteresisData={setHysteresisData}
        isHysteresisLoading={isHysteresisLoading}
        setIsHysteresisLoading={setIsHysteresisLoading}
      />


      {/* Paper Details Modal */}
      {selectedPaper && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg border border-slate-800 bg-slate-950 p-6 rounded-lg shadow-2xl relative">
            <button onClick={() => setSelectedPaper(null)} className="absolute top-4 right-4 p-1 rounded hover:bg-white/5 text-slate-400 hover:text-slate-200">
              <X className="size-4" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="size-5 text-cyan-300" />
              <span className="font-mono text-xs text-slate-500 uppercase">Scientific Abstract</span>
            </div>
            <h3 className="text-base font-bold text-slate-100">{selectedPaper.title}</h3>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              Source: {selectedPaper.source} | Year: {selectedPaper.year}
            </div>
            <p className="text-xs text-slate-300 leading-6 mt-4 p-3 bg-slate-900/50 border border-slate-900 rounded max-h-60 overflow-y-auto">
              {selectedPaper.abstract}
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button onClick={() => setSelectedPaper(null)} className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded text-xs font-mono">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
