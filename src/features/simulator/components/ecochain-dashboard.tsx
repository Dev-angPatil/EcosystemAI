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
import { DemoTour, DemoStep } from "./demo-tour";

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

  // ─── Demo Tour State ───────────────────────────────────────────────────────
  const [isDemoMode, setIsDemoMode] = useState(false);

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

  // ─── Demo Steps Definition ─────────────────────────────────────────────────
  const DEMO_STEPS: DemoStep[] = [
    {
      id: "biome-setup",
      title: "🌳 Biome & Species Setup",
      description:
        "Select an ecosystem biome and configure which species are active. Toggle producers, herbivores, and predators on or off and set their initial population density.",
      targetId: "control-panel",
      side: "right",
      onActivate: () => {
        // No biome change needed, just highlight the panel
      },
    },
    {
      id: "run-simulation",
      title: "⚡ Run the Simulation",
      description:
        "Hit Run Simulation to send parameters to the cloud API. The solver runs a 30-year Lotka-Volterra ODE system remotely — no heavy compute on your device.",
      targetId: "run-button",
      side: "top",
      onActivate: () => {
        // Trigger a fresh simulation so graphs update
        triggerSimulation();
      },
    },
    {
      id: "population-dynamics",
      title: "📈 Population Dynamics",
      description:
        "Observe species populations evolve over 30 years. Lotka-Volterra predator-prey cycles emerge naturally — watch oscillations build and stabilise.",
      targetId: "population-chart",
      side: "top",
      onActivate: () => setCurriculumTab("population"),
    },
    {
      id: "biodiversity-lab",
      title: "🧬 Biodiversity Lab",
      description:
        "Run batch simulations across species-richness levels to explore the Biodiversity-Ecosystem Functioning (BEF) relationship and insurance effects.",
      targetId: "central-panel",
      side: "top",
      onActivate: () => setCurriculumTab("biodiversity"),
    },
    {
      id: "climate-futures",
      title: "🌡️ Climate Futures",
      description:
        "Model RCP 2.6, 4.5 and 8.5 warming trajectories and observe tipping points where ecosystem resilience collapses irreversibly under thermal stress.",
      targetId: "central-panel",
      side: "top",
      onActivate: () => setCurriculumTab("climate"),
    },
    {
      id: "canopy-physiology",
      title: "🌿 Canopy Physiology",
      description:
        "Dive into leaf-level gas exchange with the FvCB biochemical model. Tune CO₂, temperature and light to see how photosynthesis and stomatal conductance respond.",
      targetId: "central-panel",
      side: "top",
      onActivate: () => setCurriculumTab("physiology"),
    },
    {
      id: "ai-coach",
      title: "🧠 AI Ecosystem Coach",
      description:
        "The Socratic Lab Partner analyses simulation output in real-time, detects ecological anomalies, and poses targeted Socratic questions to deepen understanding.",
      targetId: "ai-coach-panel",
      side: "left",
    },
    {
      id: "curriculum-labs",
      title: "🎓 Guided Curriculum Labs",
      description:
        "Open the Curriculum Labs drawer for 8 structured lab missions — each with hypothesis, methodology, quizzes, and a pass/fail certification system.",
      targetId: "labs-button",
      side: "top",
    },
  ];

  return (
    <main className="min-h-screen bg-canvas p-3 text-body sm:p-4 lg:p-5">
      <div className="scanline relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-lg border border-hairline bg-canvas">
        <div className="relative z-10 flex min-h-[calc(100vh-2rem)] flex-col">
          <DashboardHeader
            onStartDemo={() => setIsDemoMode(true)}
            isDemoMode={isDemoMode}
          />

          <section className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 md:p-5 min-h-0">
            {/* Left Sidebar Panel */}
            <aside data-demo-id="control-panel" className="lg:col-span-1 rounded-lg border border-hairline bg-surface-card p-4 flex flex-col justify-between space-y-4">
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

              <Tabs defaultValue="biotic" className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <TabsList className="shrink-0">
                  <TabsTrigger value="biotic">Biotic Presets</TabsTrigger>
                  <TabsTrigger value="abiotic">Abiotic Factors</TabsTrigger>
                </TabsList>
                
                <TabsContent value="biotic" className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 mt-2">


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
                  data-demo-id="run-button"
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
            <section data-demo-id="central-panel" className="lg:col-span-3 rounded-lg border border-hairline bg-surface-card p-4 flex flex-col min-h-0 relative">
              {isLoading && timeline.length === 0 && (
                <div className="absolute inset-0 z-30 grid place-items-center bg-canvas/70">
                  <div className="flex flex-col items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-primary">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    Hydrating matrix solver...
                  </div>
                </div>
              )}

              {/* Trophic Dynamics Tab */}
              {curriculumTab === "trophic" && (
                <Tabs defaultValue="map" className="flex flex-col h-full min-h-0">
                  <div className="flex items-center justify-between border-b border-hairline pb-2 mb-3">
                    <TabsList>
                      <TabsTrigger value="map" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <MapIcon className="size-3" /> Population Map
                      </TabsTrigger>
                      <TabsTrigger value="chart" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="size-3" /> Trajectory Chart
                      </TabsTrigger>
                      <TabsTrigger value="stability" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Network className="size-3" /> Stability & Eigenvalues
                      </TabsTrigger>
                      <TabsTrigger value="foodweb" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <Network className="size-3" /> Food Web & Biomass
                      </TabsTrigger>
                    </TabsList>
                    
                    {/* Disturbance Paintbrush Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted uppercase">Disturbance Brush:</span>
                      <select 
                        value={selectedTool}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setSelectedTool(val);
                          setDisturbanceType(val);
                          if (val === "None") {
                            setDisturbanceCells([]);
                          }
                        }}
                        className="bg-surface-card border border-hairline rounded text-xs text-primary font-mono px-2 py-1 focus:outline-none"
                      >
                        <option value="None">None (Inspect)</option>
                        <option value="fire">🔥 Wildfire Brush</option>
                        <option value="logging">🪓 Logging Brush</option>
                        <option value="grazing">🐄 Grazing Brush</option>
                      </select>
                      {disturbanceCells.length > 0 && (
                        <button
                          onClick={() => setDisturbanceCells([])}
                          className="px-2 py-1 bg-surface-soft border border-hairline hover:bg-surface-elevated rounded text-[10px] font-mono text-ink"
                        >
                          Clear ({disturbanceCells.length})
                        </button>
                      )}
                    </div>
                  </div>

                  <TabsContent value="map" className="flex-1 flex flex-col min-h-0 focus:outline-none mt-0">
                    <SpatialGridMap />
                  </TabsContent>

                  <TabsContent value="chart" className="flex-1 min-h-0 focus:outline-none mt-0 relative">
                    <TrophicTrajectoryChart />
                  </TabsContent>

                  <TabsContent value="stability" className="flex-1 min-h-0 mt-0 focus:outline-none">
                    <TrophicStabilityCharts />
                  </TabsContent>

                  <TabsContent value="foodweb" className="flex-1 min-h-0 focus:outline-none mt-0">
                    <TrophicFoodWeb />
                  </TabsContent>
                </Tabs>
              )}

              {/* Canopy Physiology Tab */}
              {curriculumTab === "physiology" && (
                <CanopyPhysiologyView />
              )}

              {/* Hydrology & Energy Tab */}
              {curriculumTab === "hydrology" && (
                <Tabs defaultValue="moisture-map" className="flex flex-col h-full min-h-0">
                  <div className="flex items-center justify-between border-b border-hairline pb-2 mb-3">
                    <TabsList>
                      <TabsTrigger value="moisture-map" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <MapIcon className="size-3" /> Soil Moisture Map
                      </TabsTrigger>
                      <TabsTrigger value="energy-chart" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <Activity className="size-3" /> Energy Partition & Bowen Ratio
                      </TabsTrigger>
                    </TabsList>

                    <div className="text-[10px] font-mono text-muted uppercase flex items-center gap-2">
                      <span>Average ET:</span>
                      <span className="text-primary font-bold">
                        {(activePoint?.cells?.reduce((sum, c) => sum + (c.evapotranspiration ?? 0.05), 0) / (activePoint?.cells?.length || 1)).toFixed(3)} mm/day
                      </span>
                    </div>
                  </div>

                  <TabsContent value="moisture-map" className="flex-1 flex flex-col min-h-0 focus:outline-none mt-0">
                    <div className="flex-1 flex flex-col md:flex-row gap-4 h-full min-h-0">
                      <div className="flex-1 flex items-center justify-center p-3 bg-canvas border border-hairline rounded-lg relative min-h-[340px]">
                        <svg viewBox="0 0 100 100" className="w-full max-w-[420px] aspect-square rounded select-none animate-fade-in">
                          {Array.from({ length: 10 }).map((_, y) => 
                            Array.from({ length: 10 }).map((_, x) => {
                              const cells = activePoint?.cells || [];
                              const cell = cells.find(c => c.x === x && c.y === y) || { soil_moisture: 0.15, x, y };
                              const sm = cell.soil_moisture ?? 0.15;
                              
                              const ratio = Math.min(1.0, Math.max(0.0, (sm - 0.08) / 0.22));
                              const r = Math.floor(217 * (1 - ratio) + 29 * ratio);
                              const g = Math.floor(119 * (1 - ratio) + 78 * ratio);
                              const b = Math.floor(6 * (1 - ratio) + 216 * ratio);
                              
                              const opacity = Math.min(0.95, Math.max(0.2, 0.3 + ratio * 0.65));
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
                                  stroke={isSelected ? "#faff69" : isHovered ? "rgba(250, 255, 105, 0.4)" : "rgba(250, 255, 105, 0.08)"}
                                  strokeWidth={isSelected ? 0.8 : isHovered ? 0.6 : 0.2}
                                  className="cursor-pointer transition-all duration-300 hover:fill-opacity-95"
                                  onClick={() => {
                                    setSelectedCell({ x, y });
                                    setIsPlaying(false);
                                  }}
                                  onMouseEnter={() => setHoveredCell({
                                    x,
                                    y,
                                    populations: (cell as any).populations || {},
                                    nutrients: (cell as any).nutrients || {},
                                    soil_moisture: sm,
                                    evapotranspiration: (cell as any).evapotranspiration,
                                    sensible_heat: (cell as any).sensible_heat,
                                    latent_heat: (cell as any).latent_heat
                                  })}
                                  onMouseLeave={() => setHoveredCell(null)}
                                />
                              );
                            })
                          )}
                        </svg>
                      </div>

                      {/* Info Panel */}
                      <div className="w-full md:w-[240px] bg-surface-card border border-hairline p-4 rounded-xl flex flex-col justify-between">
                        <div className="space-y-4">
                          <h3 className="text-xs font-mono text-primary uppercase tracking-wider">Hydrological Profile</h3>
                          {selectedCell ? (
                            (() => {
                               const cell = activePoint?.cells?.find(c => c.x === selectedCell.x && c.y === selectedCell.y);
                               if (!cell) return <p className="text-xs text-muted font-mono">Cell telemetry unavailable.</p>;
                               return (
                                 <div className="space-y-3 font-mono text-[11px]">
                                   <div className="flex justify-between border-b border-hairline pb-1">
                                     <span className="text-muted">Coordinates:</span>
                                     <span className="text-primary">[{selectedCell.x}, {selectedCell.y}]</span>
                                   </div>
                                   <div className="flex justify-between border-b border-hairline pb-1">
                                     <span className="text-muted">Soil Moisture (θ):</span>
                                     <span className="text-primary font-bold">{(cell.soil_moisture ?? 0.15).toFixed(4)} m³/m³</span>
                                   </div>
                                   <div className="flex justify-between border-b border-hairline pb-1">
                                     <span className="text-muted">Evapotranspiration (ET):</span>
                                     <span className="text-primary">{(cell.evapotranspiration ?? 0.05).toFixed(4)} mm/d</span>
                                   </div>
                                   <div className="flex justify-between border-b border-hairline pb-1">
                                     <span className="text-muted">Sensible Heat (H):</span>
                                     <span className="text-amber-400">{(cell.sensible_heat ?? 30.0).toFixed(1)} W/m²</span>
                                   </div>
                                   <div className="flex justify-between border-b border-hairline pb-1">
                                     <span className="text-muted">Latent Heat (LE):</span>
                                     <span className="text-blue-400">{(cell.latent_heat ?? 100.0).toFixed(1)} W/m²</span>
                                   </div>
                                   <div className="flex justify-between border-b border-hairline pb-1">
                                     <span className="text-muted">Bowen Ratio (H/LE):</span>
                                     <span className="text-yellow-400">
                                       {cell.latent_heat && cell.latent_heat > 0.1 ? (cell.sensible_heat / cell.latent_heat).toFixed(3) : "∞"}
                                     </span>
                                   </div>
                                 </div>
                               );
                            })()
                          ) : (
                            <p className="text-xs text-muted font-mono">Select a cell on the map to view detailed hydrology and energy parameters.</p>
                          )}
                        </div>
                        
                        <div className="text-[10px] font-mono text-muted bg-canvas p-2.5 rounded border border-hairline mt-4">
                          <span className="text-primary font-bold block mb-1">Penman-Monteith Model</span>
                          Solves cell-level water & heat balances. Bowen ratio shifts higher when soil moisture limits transpiration ($LE \to 0$, causing land surface warming).
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="energy-chart" className="flex-1 min-h-[300px] mt-0 focus:outline-none">
                    <div className="bg-surface-card border border-hairline p-4 rounded-xl h-full">
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart
                          data={timeline.map(pt => {
                            const cells = pt.cells || [];
                            const count = cells.length || 1;
                            const avgH = cells.reduce((sum, c) => sum + (c.sensible_heat ?? 0), 0) / count;
                            const avgLE = cells.reduce((sum, c) => sum + (c.latent_heat ?? 0), 0) / count;
                            const avgSM = cells.reduce((sum, c) => sum + (c.soil_moisture ?? 0.15), 0) / count;
                            return {
                              year: pt.year,
                              "Sensible Heat (H)": parseFloat(avgH.toFixed(1)),
                              "Latent Heat (LE)": parseFloat(avgLE.toFixed(1)),
                              "Soil Moisture (x1000)": parseFloat((avgSM * 1000).toFixed(0)),
                            };
                          })}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                          <XAxis dataKey="year" stroke="#5a5a5a" style={{ fontSize: 9, fontFamily: "monospace" }} />
                          <YAxis stroke="#5a5a5a" style={{ fontSize: 9, fontFamily: "monospace" }} />
                          <Tooltip contentStyle={{ background: "#121212", borderColor: "#222222", fontSize: 10, fontFamily: "monospace", color: "#ffffff", borderRadius: 4 }} />
                          <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                          <Line type="monotone" dataKey="Sensible Heat (H)" stroke="#eab308" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="Latent Heat (LE)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="Soil Moisture (x1000)" stroke="#10b981" strokeDasharray="3 3" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              {/* Biogeochemistry Tab */}
              {curriculumTab === "biogeochem" && (
                <SoilBiogeochemView />
              )}

              {/* Biodiversity Lab Tab */}
              {curriculumTab === "biodiversity" && (
                <div className="flex-1 flex flex-col min-h-0 space-y-4">
                  <div className="mb-2 pb-2 border-b border-hairline flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-mono font-semibold text-primary uppercase tracking-wider">Biodiversity & Ecosystem Functioning (BEF) Lab</h3>
                      <p className="text-[10px] text-muted mt-0.5">Explore Niche Complementarity and the Insurance Effect across 12 manual species.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-y-auto min-h-0">
                    {/* Left: Species Setup & Setup Controls */}
                    <div className="lg:col-span-4 bg-surface-card border border-hairline rounded-lg p-4 flex flex-col justify-between space-y-4">
                      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-body">
                          Biodiversity Pool Select (Producers)
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {species
                            .filter((s) => s.trophic_level === "Producer")
                            .map((sp) => {
                              const isChecked = selectedProducers.includes(sp.id);
                              return (
                                <label
                                  key={sp.id}
                                  className={`flex items-center gap-2 p-2 border rounded text-xs cursor-pointer hover:bg-surface-elevated transition ${
                                    isChecked
                                      ? "border-success/30 bg-success/5 text-success"
                                      : "border-hairline bg-canvas text-muted"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedProducers((prev) => [...prev, sp.id]);
                                      } else {
                                        setSelectedProducers((prev) => prev.filter((id) => id !== sp.id));
                                      }
                                    }}
                                    className="accent-success rounded"
                                  />
                                  <span className="capitalize">{sp.name}</span>
                                  <span className="ml-auto font-mono text-[9px] text-muted">
                                    T_opt: {sp.thermal_optimum}°C
                                  </span>
                                </label>
                              );
                            })}
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          if (selectedProducers.length === 0) return;
                          setIsBatchRunning(true);
                          try {
                            const data = await fetchBiodiversityExperiment(biome, selectedProducers);
                            setBiodiversityData(data);
                          } catch (err) {
                            console.error("Experiment failed", err);
                          } finally {
                            setIsBatchRunning(false);
                          }
                        }}
                        disabled={selectedProducers.length === 0 || isBatchRunning}
                        className={`w-full py-2.5 rounded font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition border ${
                          selectedProducers.length === 0 || isBatchRunning
                            ? "bg-primary-disabled text-muted border-hairline cursor-not-allowed opacity-50"
                            : "bg-primary hover:bg-primary-active border-primary text-on-primary font-semibold"
                        }`}
                      >
                        {isBatchRunning ? (
                          <>
                            <Loader2 className="size-4 animate-spin" /> Running 10 Sim Batches...
                          </>
                        ) : (
                          <>Run BEF Experiment</>
                        )}
                      </button>
                    </div>

                    {/* Right: Graphs and Thermal Niches */}
                    <div className="lg:col-span-8 flex flex-col space-y-4">
                      {/* Thermal Niche curves */}
                      <div className="border border-hairline bg-surface-card rounded-lg p-3">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-body mb-2">
                          Gaussian Thermal Niches (Producers)
                        </div>
                        <div className="h-[120px] w-full flex items-end relative overflow-hidden bg-canvas border border-hairline rounded px-1">
                          <div className="absolute inset-y-0 left-0 border-r border-hairline w-full flex justify-between pointer-events-none text-[8px] font-mono text-muted p-1">
                            <span>10°C</span>
                            <span>15°C</span>
                            <span>20°C</span>
                            <span>25°C</span>
                            <span>30°C</span>
                            <span>35°C</span>
                          </div>
                          <svg className="w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {species
                              .filter((s) => s.trophic_level === "Producer")
                              .map((sp, sIdx) => {
                                const opt = sp.thermal_optimum ?? 20;
                                const wid = sp.niche_width ?? 8;
                                const points = [];
                                for (let t = 5; t <= 35; t += 0.5) {
                                  const x = ((t - 5) / 30) * 100;
                                  const y = 100 - 90 * Math.exp(-Math.pow(t - opt, 2) / (2 * Math.pow(wid, 2)));
                                  points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
                                }
                                const d = `M 0,100 L ${points.join(" L ")} L 100,100 Z`;
                                const isSelected = selectedProducers.includes(sp.id);
                                return (
                                  <path
                                    key={sp.id}
                                    d={d}
                                    fill={isSelected ? `hsla(${sIdx * 30}, 75%, 45%, 0.15)` : "rgba(100,116,139,0.02)"}
                                    stroke={isSelected ? `hsl(${sIdx * 30}, 80%, 50%)` : "rgba(100,116,139,0.2)"}
                                    strokeWidth={isSelected ? 1.0 : 0.4}
                                  />
                                );
                              })}
                          </svg>
                        </div>
                      </div>

                      {/* Yield and Stability charts */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        <div className="border border-hairline bg-surface-card rounded-lg p-3 flex flex-col">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-2">
                            Richness vs. Primary Yield (Biomass)
                          </div>
                          <div className="flex-1 min-h-[160px]">
                            {biodiversityData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={biodiversityData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                                  <XAxis dataKey="richness" stroke="#5a5a5a" tick={{ fontSize: 9, fontFamily: "monospace" }} label={{ value: "Species Richness (S)", position: "insideBottom", offset: -2, fill: "#888888", fontSize: 8, fontFamily: "monospace" }} />
                                  <YAxis stroke="#5a5a5a" tick={{ fontSize: 9, fontFamily: "monospace" }} />
                                  <Tooltip contentStyle={{ background: "#121212", borderColor: "#222222", fontSize: 10, fontFamily: "monospace", color: "#ffffff", borderRadius: 4 }} />
                                  <Line type="monotone" dataKey="yield" name="Yield" stroke="#faff69" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 0, fill: "#faff69" }} activeDot={{ r: 5, strokeWidth: 0 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="grid h-full place-items-center text-xs text-muted font-mono italic">
                                Run experiment to generate data.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border border-hairline bg-surface-card rounded-lg p-3 flex flex-col">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-2">
                            Richness vs. Ecosystem Stability (1/CV)
                          </div>
                          <div className="flex-1 min-h-[160px]">
                            {biodiversityData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={biodiversityData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                                  <XAxis dataKey="richness" stroke="#5a5a5a" tick={{ fontSize: 9, fontFamily: "monospace" }} label={{ value: "Species Richness (S)", position: "insideBottom", offset: -2, fill: "#888888", fontSize: 8, fontFamily: "monospace" }} />
                                  <YAxis stroke="#5a5a5a" tick={{ fontSize: 9, fontFamily: "monospace" }} />
                                  <Tooltip contentStyle={{ background: "#121212", borderColor: "#222222", fontSize: 10, fontFamily: "monospace", color: "#ffffff", borderRadius: 4 }} />
                                  <Line type="monotone" dataKey="stability" name="Stability" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 0, fill: "#06b6d4" }} activeDot={{ r: 5, strokeWidth: 0 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="grid h-full place-items-center text-xs text-muted font-mono italic">
                                Run experiment to generate data.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Energy Flow Tab */}
              {curriculumTab === "energy" && (
                <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto">
                  <div className="mb-2 pb-2 border-b border-hairline">
                    <h3 className="text-sm font-mono font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                      <Flame className="size-4 text-amber-400" /> Energy Flow & Lindeman&apos;s Efficiency
                    </h3>
                    <p className="text-[10px] text-muted mt-0.5">
                      Visualize gross primary production, respiratory losses, and 10% trophic transfer efficiency across the food chain. Based on Lindeman (1942).
                    </p>
                  </div>

                  {/* Sankey-style Energy Flow Diagram */}
                  {(() => {
                    const finalPt = timeline[timeline.length - 1];
                    if (!finalPt) return <div className="text-muted text-xs font-mono text-center mt-8">Run a simulation to see energy flows.</div>;
                    
                    const producers = activeSpecies.filter(s => s.trophic_level === "Producer");
                    const herbivores = activeSpecies.filter(s => s.trophic_level === "Herbivore");
                    const carnivores = activeSpecies.filter(s => s.trophic_level === "Carnivore");
                    const apex = activeSpecies.filter(s => s.trophic_level === "Apex");
                    
                    const getBiomass = (sp: SpeciesConfig[]) =>
                      sp.reduce((sum, s) => sum + (finalPt.populations[s.id] ?? 0), 0);
                    
                    const prodBio = getBiomass(producers);
                    const herbBio = getBiomass(herbivores);
                    const carnBio = getBiomass(carnivores);
                    const apexBio = getBiomass(apex);
                    
                    // Approximate GPP (production), NPP (net), and trophic levels
                    const gpp = prodBio * 2.2; // rough proxy
                    const npp = gpp * 0.5;     // ~50% respired
                    const herbIngested = herbBio * 2.0;
                    const herbAssim = herbIngested * 0.6;
                    const carnIngested = carnBio * 2.0;
                    const carnAssim = carnIngested * 0.65;
                    
                    const maxVal = Math.max(gpp, 1);
                    const barPct = (v: number) => `${Math.max(3, Math.min(100, (v / maxVal) * 100)).toFixed(1)}%`;
                    
                    const rows: Array<{label: string; color: string; gpp?: number; npp?: number; resp?: number; assimil?: number; bio: number}> = [
                      { label: "Producers (T1)", color: "#10b981", gpp, npp, resp: gpp - npp, bio: prodBio },
                      { label: "Herbivores (T2)", color: "#06b6d4", assimil: herbAssim, resp: herbIngested - herbAssim, bio: herbBio },
                      { label: "Carnivores (T3)", color: "#f59e0b", assimil: carnAssim, resp: carnIngested - carnAssim, bio: carnBio },
                      { label: "Apex Predators (T4)", color: "#f43f5e", bio: apexBio },
                    ];
                    
                    return (
                      <div className="space-y-6">
                        {/* Energy Pyramid */}
                        <div className="bg-surface-card border border-hairline rounded-lg p-5">
                          <div className="text-xs font-mono text-primary uppercase tracking-wider mb-4">Energy Pyramid — Year {timeline.length - 1}</div>
                          <div className="flex flex-col items-center gap-1.5">
                            {[
                              { level: "T4 Apex", biomass: apexBio, color: "#f43f5e", w: "w-1/5" },
                              { level: "T3 Carnivore", biomass: carnBio, color: "#f59e0b", w: "w-2/5" },
                              { level: "T2 Herbivore", biomass: herbBio, color: "#06b6d4", w: "w-3/5" },
                              { level: "T1 Producer", biomass: prodBio, color: "#10b981", w: "w-full" },
                            ].map(tier => (
                              <div key={tier.level} className={`${tier.w} flex items-center justify-between px-3 py-2 rounded font-mono text-[11px] transition-all`}
                                style={{ backgroundColor: `${tier.color}20`, border: `1px solid ${tier.color}40`, color: tier.color }}>
                                <span>{tier.level}</span>
                                <span className="font-bold">{tier.biomass.toFixed(0)} units</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-[10px] text-muted font-mono text-center">
                            Trophic efficiency T2/T1 = <span className="text-primary font-bold">{prodBio > 0 ? ((herbBio / prodBio) * 100).toFixed(1) : "N/A"}%</span> · T3/T2 = <span className="text-primary font-bold">{herbBio > 0 ? ((carnBio / herbBio) * 100).toFixed(1) : "N/A"}%</span>
                          </div>
                        </div>

                        {/* Energy Budget per trophic level */}
                        <div className="bg-surface-card border border-hairline rounded-lg p-5">
                          <div className="text-xs font-mono text-primary uppercase tracking-wider mb-4">Energy Budget (Approximate) — Biomass Proxy Units</div>
                          <div className="space-y-3">
                            {rows.map(row => (
                              <div key={row.label} className="space-y-1">
                                <div className="text-[11px] font-mono font-semibold" style={{ color: row.color }}>{row.label}</div>
                                {row.gpp !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className="w-28 text-[9px] font-mono text-muted">GPP</span>
                                    <div className="flex-1 bg-canvas rounded h-3 overflow-hidden">
                                      <div className="h-full rounded bg-emerald-500/70" style={{ width: barPct(row.gpp) }} />
                                    </div>
                                    <span className="text-[10px] font-mono text-body w-16 text-right">{row.gpp.toFixed(0)}</span>
                                  </div>
                                )}
                                {row.npp !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className="w-28 text-[9px] font-mono text-muted">NPP (net)</span>
                                    <div className="flex-1 bg-canvas rounded h-3 overflow-hidden">
                                      <div className="h-full rounded bg-emerald-400/50" style={{ width: barPct(row.npp) }} />
                                    </div>
                                    <span className="text-[10px] font-mono text-body w-16 text-right">{row.npp.toFixed(0)}</span>
                                  </div>
                                )}
                                {row.resp !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className="w-28 text-[9px] font-mono text-muted">Respiration</span>
                                    <div className="flex-1 bg-canvas rounded h-3 overflow-hidden">
                                      <div className="h-full rounded bg-rose-500/50" style={{ width: barPct(row.resp) }} />
                                    </div>
                                    <span className="text-[10px] font-mono text-body w-16 text-right">{row.resp.toFixed(0)}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className="w-28 text-[9px] font-mono text-muted">Biomass</span>
                                  <div className="flex-1 bg-canvas rounded h-3 overflow-hidden">
                                    <div className="h-full rounded" style={{ width: barPct(row.bio), backgroundColor: row.color + "80" }} />
                                  </div>
                                  <span className="text-[10px] font-mono text-body w-16 text-right">{row.bio.toFixed(0)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Key Concepts */}
                        <div className="bg-surface-card border border-hairline rounded-lg p-4 text-xs font-mono text-body space-y-2">
                          <div className="text-primary text-[10px] uppercase tracking-wider mb-2">Key Ecological Principles</div>
                          <div>🌿 <strong>Lindeman Efficiency</strong>: ~10% of energy is transferred between trophic levels (range: 5–20%)</div>
                          <div>☀️ <strong>GPP = NPP + Ra</strong>: Gross primary production = net production + autotrophic respiration</div>
                          <div>🔥 <strong>Second Law</strong>: Energy degrades to heat at every transfer — food chains are short because of these losses</div>
                          <div>🏔️ <strong>Eltonian Pyramid</strong>: Biomass and productivity decrease with each trophic level</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}


              {/* Population Dynamics Tab — Leslie Matrix */}
              {curriculumTab === "population" && (
                <div data-demo-id="population-chart" className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto">
                  <div className="mb-2 pb-2 border-b border-hairline">
                    <h3 className="text-sm font-mono font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                      <Dna className="size-4 text-primary" /> Age-Structured Population Dynamics
                    </h3>
                    <p className="text-[10px] text-muted mt-0.5">
                      Explore Leslie matrix projections: r/K selection, age-structured demography, reproductive values, and stable age distributions. Used for wildlife management and conservation biology.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Controls */}
                    <div className="bg-surface-card border border-hairline rounded-lg p-4 space-y-4">
                      <div className="text-[10px] font-mono text-primary uppercase tracking-wider">Life Table Parameters</div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-muted uppercase tracking-wider">Species Name</label>
                        <input
                          value={leslieSpeciesName}
                          onChange={e => setLeslieSpeciesName(e.target.value)}
                          className="w-full bg-canvas border border-hairline rounded px-2 py-1 text-xs text-body-strong font-mono focus:outline-none focus:border-primary"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-muted uppercase tracking-wider">Fecundity (m_x) per Age Class</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {leslieFecundity.map((val, i) => (
                            <div key={i} className="flex flex-col items-center gap-0.5">
                              <span className="text-[9px] font-mono text-muted">Age {i}</span>
                              <input
                                type="number" step="0.1" min="0" max="10"
                                value={val}
                                onChange={e => {
                                  const newF = [...leslieFecundity];
                                  newF[i] = parseFloat(e.target.value) || 0;
                                  setLeslieFecundity(newF);
                                }}
                                className="w-14 bg-canvas border border-success/30 rounded px-1 py-0.5 text-xs text-success font-mono text-center focus:outline-none focus:border-success"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-muted uppercase tracking-wider">Survival (s_x) per Age Transition</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {leslieSurvival.map((val, i) => (
                            <div key={i} className="flex flex-col items-center gap-0.5">
                              <span className="text-[9px] font-mono text-muted">{i}→{i+1}</span>
                              <input
                                type="number" step="0.05" min="0" max="1"
                                value={val}
                                onChange={e => {
                                  const newS = [...leslieSurvival];
                                  newS[i] = parseFloat(e.target.value) || 0;
                                  setLeslieSurvival(newS);
                                }}
                                className="w-14 bg-canvas border border-primary/30 rounded px-1 py-0.5 text-xs text-primary font-mono text-center focus:outline-none focus:border-primary"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <button
                        onClick={async () => {
                          setIsLeslieLoading(true);
                          try {
                            const result = await fetchLeslieProjection(
                              leslieSpeciesName, leslieFecundity, leslieSurvival, leslieInitDist, 40
                            );
                            setLeslieResponse(result);
                          } catch(e) { console.error(e); }
                          finally { setIsLeslieLoading(false); }
                        }}
                        disabled={isLeslieLoading}
                        className="w-full py-2 bg-primary/10 hover:bg-primary/25 border border-primary/20 text-primary font-mono text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-2"
                      >
                        {isLeslieLoading ? <Loader2 className="size-3 animate-spin text-primary" /> : <Dna className="size-3" />}
                        {isLeslieLoading ? "Projecting..." : "Run Leslie Projection"}
                      </button>
                      
                      {/* Preset life tables */}
                      <div className="pt-2 border-t border-hairline">
                        <div className="text-[10px] font-mono text-muted mb-2 uppercase tracking-wider">Preset Life Tables</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { name: "Seabird (slow)", fec: [0,0,2.5,2.0,1.0], sur: [0.60,0.75,0.80,0.70], init: [100,60,40,25,10] },
                            { name: "Small Mammal (fast)", fec: [0,4.0,3.5,2.0], sur: [0.30,0.55,0.40], init: [150,80,30,10] },
                            { name: "Oak Tree (century)", fec: [0,0,0,5.0,8.0,6.0], sur: [0.50,0.70,0.80,0.85,0.88], init: [200,100,60,30,15,5] },
                            { name: "Salmon (semelparous)", fec: [0,0,0,250], sur: [0.05,0.10,0.20], init: [500,25,3,0.5] },
                          ].map(preset => (
                            <button
                              key={preset.name}
                              onClick={() => {
                                setLeslieSpeciesName(preset.name);
                                setLeslieFecundity(preset.fec);
                                setLeslieSurvival(preset.sur);
                                setLeslieInitDist(preset.init);
                                setLeslieResponse(null);
                              }}
                              className="text-[10px] font-mono text-muted hover:text-body-strong px-2 py-1 border border-hairline hover:border-hairline-strong rounded text-left transition"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Results Panel */}
                    {leslieResponse ? (
                      <div className="space-y-4">
                        {/* Key Metrics */}
                        <div className="bg-surface-card border border-hairline rounded-lg p-4">
                          <div className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">Asymptotic Analysis</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className={`p-3 rounded border ${leslieResponse.lambda_dominant > 1 ? "border-success/30 bg-success/10" : leslieResponse.lambda_dominant < 1 ? "border-error/30 bg-error/10" : "border-warning/30 bg-warning/10"}`}>
                              <div className="text-[9px] font-mono text-muted uppercase tracking-wider">λ (dominant eigenvalue)</div>
                              <div className={`text-xl font-bold font-mono mt-0.5 ${leslieResponse.lambda_dominant > 1 ? "text-success" : leslieResponse.lambda_dominant < 1 ? "text-error" : "text-warning"}`}>
                                {leslieResponse.lambda_dominant.toFixed(3)}
                              </div>
                              <div className="text-[9px] font-mono text-muted mt-0.5">
                                {leslieResponse.lambda_dominant > 1 ? "Growing (r-selected)" : leslieResponse.lambda_dominant < 1 ? "Declining → Extinction" : "Stable (K boundary)"}
                              </div>
                            </div>
                            <div className="p-3 rounded border border-hairline bg-canvas">
                              <div className="text-[9px] font-mono text-muted uppercase tracking-wider">Intrinsic Rate r</div>
                              <div className="text-xl font-bold font-mono mt-0.5 text-primary">
                                {Math.log(leslieResponse.lambda_dominant).toFixed(4)}
                              </div>
                              <div className="text-[9px] font-mono text-muted mt-0.5">r = ln(λ)</div>
                            </div>
                          </div>
                          
                          {/* Stable Age Distribution */}
                          <div className="mt-4">
                            <div className="text-[9px] font-mono text-muted uppercase tracking-wider mb-1.5">Stable Age Distribution</div>
                            <div className="flex gap-1">
                              {leslieResponse.stable_age_distribution.map((v, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                  <div className="w-full bg-primary/20 rounded-sm" style={{ height: `${Math.max(4, v * 100)}px` }} />
                                  <span className="text-[8px] font-mono text-muted">{i}</span>
                                  <span className="text-[8px] font-mono text-primary font-semibold">{(v * 100).toFixed(0)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Population Trajectory Chart */}
                        <div className="bg-surface-card border border-hairline rounded-lg p-4 h-52">
                          <div className="text-[10px] font-mono text-primary uppercase tracking-wider mb-2">Population Trajectory — {leslieSpeciesName}</div>
                          <ResponsiveContainer width="100%" height="85%">
                            <LineChart data={leslieResponse.data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                              <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#888888", fontFamily: "monospace" }} />
                              <YAxis tick={{ fontSize: 9, fill: "#888888", fontFamily: "monospace" }} />
                              <Tooltip contentStyle={{ background: "#121212", border: "1px solid #222222", borderRadius: 4, fontSize: 10, fontFamily: "monospace", color: "#ffffff" }} />
                              <Line type="monotone" dataKey="total" stroke="#faff69" strokeWidth={2} dot={false} name="Total N" activeDot={{ r: 4, strokeWidth: 0 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* Lambda Trajectory */}
                        <div className="bg-surface-card border border-hairline rounded-lg p-4 h-40">
                          <div className="text-[10px] font-mono text-primary uppercase tracking-wider mb-2">Per-Year Growth Rate (λ convergence)</div>
                          <ResponsiveContainer width="100%" height="80%">
                            <LineChart data={leslieResponse.data.slice(1)} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                              <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#888888", fontFamily: "monospace" }} />
                              <YAxis tick={{ fontSize: 9, fill: "#888888", fontFamily: "monospace" }} domain={["auto", "auto"]} />
                              <Tooltip contentStyle={{ background: "#121212", border: "1px solid #222222", borderRadius: 4, fontSize: 10, fontFamily: "monospace", color: "#ffffff" }} />
                              <ReferenceLine y={1.0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} label={{ value: "λ=1", fill: "#ef4444", fontSize: 9, fontFamily: "monospace" }} />
                              <Line type="monotone" dataKey="growth_rate" stroke="#06b6d4" strokeWidth={1.5} dot={false} name="λ(t)" activeDot={{ r: 4, strokeWidth: 0 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-surface-card border border-hairline rounded-lg p-8 flex flex-col items-center justify-center gap-3 text-muted">
                        <Dna className="size-10 text-muted-soft animate-pulse" />
                        <div className="text-xs font-mono text-center">Configure life table parameters and run a projection to see age-structured dynamics.</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Concept Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { title: "r-selection", icon: "🐀", desc: "High fecundity, low survival, fast generation time. Common in disturbed environments. λ >> 1 early, then collapses under density dependence." },
                      { title: "K-selection", icon: "🐘", desc: "Low fecundity, high survival, long generation time. Common in stable environments. Populations grow slowly toward carrying capacity (K)." },
                      { title: "Reproductive Value", icon: "🧬", desc: "Fisher's reproductive value v(x): expected future reproductive contribution of an individual aged x. Peaks at or before reproductive maturity." },
                    ].map(card => (
                      <div key={card.title} className="bg-surface-card border border-hairline rounded-lg p-3">
                        <div className="font-mono text-[11px] text-primary uppercase tracking-wider flex items-center gap-1.5 mb-1">
                          <span>{card.icon}</span> {card.title}
                        </div>
                        <p className="text-[10px] text-muted leading-relaxed">{card.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Climate Futures Tab */}
              {curriculumTab === "climate" && (
                <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto">
                  <div className="mb-2 pb-2 border-b border-hairline">
                    <h3 className="text-sm font-mono font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                      <Thermometer className="size-4 text-rose-400" /> Climate Change Ecology — RCP Scenarios
                    </h3>
                    <p className="text-[10px] text-muted mt-0.5">
                      Explore how IPCC RCP 2.6, 4.5, and 8.5 warming trajectories affect species ranges, phenology, and community structure over the 21st century.
                    </p>
                  </div>
                  
                  {/* RCP Selector */}
                  <div className="flex gap-3">
                    {([
                      { id: "rcp26", label: "RCP 2.6", color: "emerald", desc: "+1.0°C by 2100 — Strong mitigation", delta: 1.0 },
                      { id: "rcp45", label: "RCP 4.5", color: "amber", desc: "+2.4°C by 2100 — Moderate pathway", delta: 2.4 },
                      { id: "rcp85", label: "RCP 8.5", color: "rose", desc: "+4.8°C by 2100 — Business as usual", delta: 4.8 },
                    ] as const).map(rcp => (
                      <button
                        key={rcp.id}
                        onClick={() => setRcpScenario(rcp.id)}
                        className={`flex-1 p-3 rounded border transition text-left ${
                          rcpScenario === rcp.id
                            ? rcp.color === "emerald" ? "bg-emerald-500/15 border-emerald-400/50 text-emerald-200"
                              : rcp.color === "amber" ? "bg-amber-500/15 border-amber-400/50 text-amber-200"
                              : "bg-rose-500/15 border-rose-400/50 text-rose-200"
                            : "bg-canvas border-hairline text-muted hover:border-hairline-strong"
                        }`}
                      >
                        <div className="font-mono text-xs font-bold">{rcp.label}</div>
                        <div className="text-[9px] font-mono mt-0.5 opacity-80">{rcp.desc}</div>
                        <div className="text-lg font-mono font-bold mt-1">+{rcp.delta}°C</div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Temperature Trajectory Chart */}
                  {(() => {
                    const rcpData = {
                      rcp26: [0, 0.2, 0.4, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0],
                      rcp45: [0, 0.3, 0.6, 0.9, 1.2, 1.6, 1.9, 2.1, 2.3, 2.4],
                      rcp85: [0, 0.4, 0.8, 1.4, 2.0, 2.8, 3.4, 4.0, 4.5, 4.8],
                    };
                    const decades = [2020, 2030, 2040, 2050, 2060, 2070, 2080, 2090, 2095, 2100];
                    const chartData = decades.map((yr, i) => ({
                      year: yr,
                      "RCP 2.6": rcpData.rcp26[i],
                      "RCP 4.5": rcpData.rcp45[i],
                      "RCP 8.5": rcpData.rcp85[i],
                    }));
                    
                    const selected = rcpScenario === "rcp26" ? rcpData.rcp26 : rcpScenario === "rcp45" ? rcpData.rcp45 : rcpData.rcp85;
                    const finalDelta = selected[selected.length - 1];
                    
                    // Ecological impacts per degree
                    const impacts = [
                      { threshold: 1.5, label: "Coral reef bleaching risk >70%", icon: "🐠" },
                      { threshold: 2.0, label: "Arctic summer sea ice loss", icon: "🧊" },
                      { threshold: 2.5, label: "Boreal/temperate tree mortality spikes", icon: "🌲" },
                      { threshold: 3.0, label: "Permafrost thaw releases stored CH₄/CO₂", icon: "🌡️" },
                      { threshold: 4.0, label: "Mass extinction risk for 16–30% of species", icon: "💀" },
                      { threshold: 4.8, label: "Amazon rainforest potential dieback", icon: "🌿" },
                    ];
                    
                    return (
                      <div className="space-y-4">
                        <div className="bg-surface-card border border-hairline rounded-lg p-4">
                          <div className="text-[10px] font-mono text-primary uppercase tracking-wider mb-2">Global Mean Temperature Anomaly (°C above 1986–2005 baseline)</div>
                          <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                                <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#5a5a5a", fontFamily: "monospace" }} />
                                <YAxis tick={{ fontSize: 9, fill: "#5a5a5a", fontFamily: "monospace" }} domain={[0, 5]} />
                                <Tooltip contentStyle={{ background: "#121212", border: "1px solid #222222", borderRadius: 4, fontSize: 10, fontFamily: "monospace", color: "#ffffff" }} />
                                <Legend iconSize={8} wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                                <ReferenceLine y={1.5} stroke="#06b6d4" strokeDasharray="3 3" strokeWidth={1} />
                                <ReferenceLine y={2.0} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
                                <Line type="monotone" dataKey="RCP 2.6" stroke="#10b981" strokeWidth={rcpScenario === "rcp26" ? 3 : 1} dot={false} opacity={rcpScenario === "rcp26" ? 1 : 0.4} />
                                <Line type="monotone" dataKey="RCP 4.5" stroke="#f59e0b" strokeWidth={rcpScenario === "rcp45" ? 3 : 1} dot={false} opacity={rcpScenario === "rcp45" ? 1 : 0.4} />
                                <Line type="monotone" dataKey="RCP 8.5" stroke="#f43f5e" strokeWidth={rcpScenario === "rcp85" ? 3 : 1} dot={false} opacity={rcpScenario === "rcp85" ? 1 : 0.4} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        
                        {/* Ecological Impact Thresholds */}
                        <div className="bg-surface-card border border-hairline rounded-lg p-4">
                          <div className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">Ecological Tipping Points under {rcpScenario.toUpperCase().replace("RCP","RCP ")}</div>
                          <div className="space-y-2">
                            {impacts.map(impact => (
                              <div
                                key={impact.threshold}
                                className={`flex items-center gap-3 p-2 rounded border transition-all ${
                                  finalDelta >= impact.threshold
                                    ? "border-rose-500/40 bg-rose-500/10"
                                    : "border-hairline bg-surface-card opacity-50"
                                }`}
                              >
                                <span className="text-lg">{impact.icon}</span>
                                <div className="flex-1">
                                  <span className="text-[10px] font-mono text-body">{impact.label}</span>
                                </div>
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${finalDelta >= impact.threshold ? "bg-rose-500/20 text-rose-300" : "bg-canvas text-muted"}`}>
                                  +{impact.threshold}°C
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Simulate warming */}
                        <div className="bg-surface-card border border-hairline rounded-lg p-4">
                          <div className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">Apply to Current Simulation</div>
                          <p className="text-[10px] text-muted mb-3">
                            The selected scenario translates to a ~{(finalDelta / 80 * 1000).toFixed(2)} °C/year warming rate over 80 years.
                            Use the abiotic sliders or set the Climate Warming Rate in the Human Impact tab to study ecosystem responses.
                          </p>
                          <button
                            onClick={() => {
                              const ratePerYear = finalDelta / 80;
                              setClimateWarmingRate(parseFloat(ratePerYear.toFixed(3)));
                              setCurriculumTab("human");
                            }}
                            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-mono text-xs uppercase tracking-wider rounded transition"
                          >
                            Apply {rcpScenario.toUpperCase().replace("RCP","RCP ")} Warming Rate → Simulation
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Human Impact Tab */}
              {curriculumTab === "human" && (
                <div className="flex-1 flex flex-col min-h-0 space-y-4">
                  <div className="mb-2 pb-2 border-b border-hairline">
                    <h3 className="text-sm font-mono font-semibold text-primary uppercase tracking-wider">Anthropogenic Stressors & Global Change</h3>
                    <p className="text-[10px] text-muted mt-0.5">Model heavy metal bioaccumulation, eutrophication hypoxic dead zones, and global temperature shifts.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Eutrophication Trigger */}
                    <div className={`p-4 border rounded-lg transition-all ${
                      eutrophicationPulse 
                        ? "border-amber-500/25 bg-amber-500/5" 
                        : "border-hairline bg-surface-card"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-mono font-bold text-body-strong">Eutrophication Pulse</h4>
                        <input
                          type="checkbox"
                          checked={eutrophicationPulse}
                          onChange={(e) => {
                            setEutrophicationPulse(e.target.checked);
                            setActivePreset("custom");
                          }}
                          className="accent-amber-500 rounded cursor-pointer size-4"
                        />
                      </div>
                      <p className="text-[10px] text-muted leading-4">
                        Applies a massive fertilizer run-off pulse (+200 Nitrogen, +50 Phosphorus) in Year 1. Causes algal blooms that block resources and lead to oxygen depletion (dead zones).
                      </p>
                      {eutrophicationPulse && (
                        <div className="mt-2 text-[9px] font-mono text-amber-400 uppercase tracking-wider animate-pulse flex items-center gap-1">
                          <AlertTriangle className="size-3" /> Warning: Runoff Active
                        </div>
                      )}
                    </div>

                    {/* Climate Warming Rate */}
                    <div className={`p-4 border rounded-lg transition-all ${
                      climateWarmingRate > 0 
                        ? "border-rose-500/25 bg-rose-500/5" 
                        : "border-hairline bg-surface-card"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-mono font-bold text-body-strong">Climate Warming Rate</h4>
                        <span className="text-xs font-mono text-rose-400">+{climateWarmingRate.toFixed(2)}°C/yr</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.4"
                        step="0.1"
                        value={climateWarmingRate}
                        onChange={(e) => {
                          setClimateWarmingRate(parseFloat(e.target.value));
                          setActivePreset("custom");
                        }}
                        className="w-full accent-rose-500 h-1 bg-surface-soft rounded-lg appearance-none cursor-pointer mb-2"
                      />
                      <p className="text-[10px] text-muted leading-4">
                        Drifts ambient temperature upward over the 30-year simulation. Pushes species away from their Gaussian thermal fitness optima, causing metabolic stress.
                      </p>
                    </div>

                    {/* Heavy Metal Mercury Influx */}
                    <div className={`p-4 border rounded-lg transition-all ${
                      toxinInfluxRate > 0 
                        ? "border-success/25 bg-success/5" 
                        : "border-hairline bg-surface-card"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-mono font-bold text-body-strong">Mercury Influx (Hg)</h4>
                        <span className="text-xs font-mono text-success font-bold">+{toxinInfluxRate.toFixed(2)} units/yr</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.2"
                        step="0.05"
                        value={toxinInfluxRate}
                        onChange={(e) => {
                          setToxinInfluxRate(parseFloat(e.target.value));
                          setActivePreset("custom");
                        }}
                        className="w-full accent-success h-1 bg-surface-soft rounded-lg appearance-none cursor-pointer mb-2"
                      />
                      <p className="text-[10px] text-muted leading-4">
                        Introduces a persistent neurotoxin (Methylmercury). Absorbed by producers and biomagnified by a factor of 1.5x up the food chain, driving top-down predator crash.
                      </p>
                    </div>
                  </div>

                  {/* Telemetry charts for stressors */}
                  <div className="border border-hairline bg-surface-card rounded-lg p-4 flex flex-col min-h-0 flex-1 justify-center items-center py-6 text-center text-muted text-xs italic">
                    <Satellite className="size-8 text-muted-soft mb-2 animate-bounce" />
                    Configure stressor settings above, then go back to the Trophic Dynamics Map or Chart tabs to monitor spatial dead zones and population trajectories!
                  </div>
                </div>
              )}

              {/* Alternative Stable States (Hysteresis Lab) Tab */}
              {curriculumTab === "hysteresis" && (
                <div className="space-y-4 h-full overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Control Panel */}
                    <div className="bg-surface-card border border-hairline p-5 rounded-lg space-y-4">
                      <div>
                        <h3 className="text-sm font-mono text-primary uppercase tracking-wider mb-1">Alternative Stable States</h3>
                        <p className="text-[11px] font-mono text-muted">Shallow lakes shift between clear water (macrophyte-dominated) and turbid water (phytoplankton-dominated) states.</p>
                      </div>

                      <div className="space-y-3 font-mono text-xs text-body">
                        <div className="bg-canvas p-3 rounded-md border border-hairline">
                          <span className="text-primary font-bold block mb-1">Ecosystem Parameters</span>
                          <ul className="list-disc list-inside space-y-1 text-[10px] text-muted">
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
                        className="w-full bg-primary/10 hover:bg-primary/25 border border-primary/30 py-2.5 rounded-md text-primary font-mono text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isHysteresisLoading ? (
                          <>
                            <Loader2 className="size-4 animate-spin text-primary" />
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
                        <div className="bg-canvas p-3 rounded-md border border-hairline space-y-2 font-mono text-[10px] text-muted">
                          <div className="text-primary font-bold uppercase mb-1">Bistability Analysis</div>
                          <p>• Clear State Tipping Point: <span className="text-rose-400 font-bold">~8.5 P inflow</span></p>
                          <p>• Turbid State Recovery Point: <span className="text-emerald-400 font-bold">~2.2 P inflow</span></p>
                          <p className="mt-1 leading-4">The region between 2.2 and 8.5 is bistable. The state depends entirely on the history of nutrient loading.</p>
                        </div>
                      )}
                    </div>

                    {/* Chart Panel */}
                    <div className="bg-surface-card border border-hairline p-5 rounded-lg md:col-span-2 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-mono text-primary uppercase tracking-wider mb-2">Shallow Lake Phosphorus Hysteresis Loop</h3>
                      </div>
                      
                      <div className="h-[260px] my-4 flex items-center justify-center">
                        {parsedHysteresisData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={parsedHysteresisData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                              <XAxis dataKey="inflow" stroke="#5a5a5a" tick={{ fontSize: 9, fontFamily: "monospace" }} label={{ value: "Phosphorus Inflow Load (I)", position: "insideBottom", offset: -2, fill: "#888888", fontSize: 9, fontFamily: "monospace" }} />
                              <YAxis stroke="#5a5a5a" tick={{ fontSize: 9, fontFamily: "monospace" }} label={{ value: "Lake Phosphorus Concentration (P)", angle: -90, position: "insideLeft", offset: 5, fill: "#888888", fontSize: 9, fontFamily: "monospace" }} />
                              <Tooltip contentStyle={{ background: "#121212", borderColor: "#222222", fontSize: 10, fontFamily: "monospace", color: "#ffffff", borderRadius: 4 }} />
                              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                              <Line type="monotone" dataKey="Forward (Increasing Loading)" stroke="#f43f5e" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                              <Line type="monotone" dataKey="Backward (Decreasing Loading)" stroke="#10b981" strokeWidth={2.5} dot={false} strokeDasharray="5 5" activeDot={{ r: 4, strokeWidth: 0 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-xs text-muted font-mono italic text-center p-8">
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
                      <h3 className="text-sm font-mono font-semibold text-primary uppercase tracking-wider">Literature Research Desk</h3>
                      <p className="text-[10px] text-muted mt-0.5">Search OpenAlex and bioRxiv to query ecological equations & models.</p>
                    </div>

                    <div className="flex items-center gap-2 bg-canvas border border-hairline rounded px-2 py-1 w-full sm:max-w-xs">
                      <Search className="size-4 text-muted" />
                      <input
                        type="text"
                        placeholder="Search carrying capacity, Lotka..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLitSearch()}
                        className="bg-transparent border-none text-xs text-body focus:outline-none w-full font-mono"
                      />
                      <button onClick={handleLitSearch} className="px-2 py-1 bg-primary/10 hover:bg-primary/25 text-primary text-[10px] uppercase font-mono rounded">
                        Search
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                    {isSearching ? (
                      <div className="grid h-full place-items-center py-20 text-xs font-mono text-primary uppercase tracking-widest">
                        <div className="flex items-center gap-3">
                          <Loader2 className="size-5 animate-spin text-primary" />
                          Querying global databases...
                        </div>
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((paper, idx) => (
                        <div key={idx} className="p-4 border border-hairline bg-surface-card rounded-lg flex flex-col justify-between gap-3 hover:border-primary/20 transition">
                          <div>
                            <div className="flex justify-between items-start gap-3">
                              <h4 className="font-semibold text-body-strong text-sm">{paper.title}</h4>
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-canvas text-muted border border-hairline">
                                {paper.source}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted font-mono mt-1">
                              Published: {paper.year} {paper.doi && `| DOI: ${paper.doi.slice(18)}`}
                            </div>
                            <p className="text-xs text-body mt-2.5 line-clamp-3 leading-5">
                              {paper.abstract}
                            </p>
                          </div>

                          <div className="flex gap-2 justify-end border-t border-hairline pt-3">
                            <button
                              onClick={() => setSelectedPaper(paper)}
                              className="px-3 py-1 bg-canvas hover:bg-surface-elevated border border-hairline text-body rounded text-xs font-mono"
                            >
                              Read Abstract
                            </button>
                            {paper.doi && (
                              <a
                                href={paper.doi}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1 bg-primary/10 hover:bg-primary/25 text-primary border border-primary/20 rounded text-xs font-mono flex items-center gap-1.5"
                              >
                                Link <ArrowUpRight className="size-3" />
                              </a>
                            )}
                            <button
                              onClick={() => handleInjectRates(paper)}
                              className="px-3 py-1 bg-success/10 hover:bg-success/20 border border-success/30 text-success rounded text-xs font-mono transition"
                            >
                              Inject Rates
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-20 text-muted text-xs italic leading-5">
                        Type keywords and hit Enter to pull scientific papers and ecosystem model coefficients from the web.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <aside data-demo-id="ai-coach-panel" className="contents">
              <AICoachPanel />
            </aside>
          </section>
        </div>
      </div>

      {/* Lab Challenges Drawer */}
      <div data-demo-id="labs-button" className="contents">
        <CurriculumLabsDrawer
          triggerSimulation={triggerSimulation}
          hysteresisData={hysteresisData}
          setHysteresisData={setHysteresisData}
          isHysteresisLoading={isHysteresisLoading}
          setIsHysteresisLoading={setIsHysteresisLoading}
        />
      </div>


      {/* Paper Details Modal */}
      {selectedPaper && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg border border-hairline bg-surface-card p-6 rounded-lg shadow-2xl relative">
            <button onClick={() => setSelectedPaper(null)} className="absolute top-4 right-4 p-1 rounded hover:bg-white/5 text-muted hover:text-body-strong">
              <X className="size-4" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="size-5 text-primary" />
              <span className="font-mono text-xs text-muted uppercase">Scientific Abstract</span>
            </div>
            <h3 className="text-base font-bold text-body-strong">{selectedPaper.title}</h3>
            <div className="text-[10px] text-muted font-mono mt-1">
              Source: {selectedPaper.source} | Year: {selectedPaper.year}
            </div>
            <p className="text-xs text-body leading-6 mt-4 p-3 bg-canvas border border-hairline rounded max-h-60 overflow-y-auto">
              {selectedPaper.abstract}
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button onClick={() => setSelectedPaper(null)} className="px-3 py-1.5 bg-canvas border border-hairline text-body rounded text-xs font-mono">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Tour Overlay */}
      {isDemoMode && (
        <DemoTour
          steps={DEMO_STEPS}
          onClose={() => setIsDemoMode(false)}
        />
      )}
    </main>
  );
}
