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
  const [controls, setControls] = useState<SimulatorControls>({
    ...defaultControls,
    co2: 420.0,
    relative_humidity: 65.0,
    light_intensity: 800.0,
  });
  const [biome, setBiome] = useState<string>("forest");
  const [species, setSpecies] = useState<SpeciesConfig[]>(JSON.parse(JSON.stringify(defaultSpecies.forest)));
  const [linkStrength, setLinkStrength] = useState<number>(1.0);
  const [corridorY, setCorridorY] = useState<number | null>(null);
  
  const [activePreset, setActivePreset] = useState<string>("baseline");
  const [timeline, setTimeline] = useState<DataPoint[]>([]);
  const [analysis, setAnalysis] = useState<CoachAnalysis>(initialAnalysis);
  const [stability, setStability] = useState<StabilityAnalysis>(initialStability);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback & Spatial states
  const [currentYear, setCurrentYear] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ 
    x: number; 
    y: number; 
    populations: Record<string, number>; 
    nutrients?: Record<string, number>; 
    toxin_concentration?: number; 
    hypoxic?: boolean;
    soil_moisture?: number;
    evapotranspiration?: number;
    sensible_heat?: number;
    latent_heat?: number;
    som_active_c?: number;
    som_slow_c?: number;
    som_passive_c?: number;
    soil_ammonium?: number;
    soil_nitrate?: number;
  } | null>(null);
  
  // Curriculum Tabs: "trophic" | "physiology" | "hydrology" | "biogeochem" | "biodiversity" | "human" | "hysteresis" | "literature"
  const [curriculumTab, setCurriculumTab] = useState<string>("trophic");
  const [activeNutrientMap, setActiveNutrientMap] = useState<string>("C");
  const [hysteresisData, setHysteresisData] = useState<HysteresisPoint[]>([]);
  const [isHysteresisLoading, setIsHysteresisLoading] = useState<boolean>(false);

  // Anthropogenic stressors state
  const [eutrophicationPulse, setEutrophicationPulse] = useState<boolean>(false);
  const [climateWarmingRate, setClimateWarmingRate] = useState<number>(0.0);
  const [toxinInfluxRate, setToxinInfluxRate] = useState<number>(0.0);

  // Spatial Disturbance Paintbrush states
  const [disturbanceType, setDisturbanceType] = useState<"fire" | "logging" | "grazing" | "None">("None");
  const [disturbanceCells, setDisturbanceCells] = useState<number[][]>([]);
  const [selectedTool, setSelectedTool] = useState<"None" | "fire" | "logging" | "grazing">("None");
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  // Paint cell helper
  const paintCell = (x: number, y: number) => {
    if (selectedTool === "None") return;
    setDisturbanceCells((prev) => {
      const exists = prev.some(([cx, cy]) => cx === x && cy === y);
      if (exists) return prev;
      return [...prev, [x, y]];
    });
  };

  // Local JS compute_photosynthesis for interactive curves
  const computePhotosynthesisJS = (
    pathway: "C3" | "C4" | "CAM",
    Ca: number,
    Temp: number,
    RH: number,
    I: number,
    soil_moisture: number,
    growth_rate: number
  ) => {
    const f_water = Math.min(1.0, Math.max(0.05, (soil_moisture - 0.08) / (0.30 - 0.08)));
    const hs = RH / 100.0;
    const Q10 = 2.0;
    const Rd = 0.015 * growth_rate * Math.pow(Q10, (Temp - 20.0) / 10.0);
    
    let A_net = 0;
    let a_slope = 9.0;
    
    if (pathway === "C3") {
      const gamma_star = 40.0 + 1.8 * (Temp - 20.0);
      const Vc_max = growth_rate * 2.5;
      const Vc = Vc_max * Math.max(0.0, Ca - gamma_star) / (Ca + 736.0);
      const J_max = Vc_max * 1.8;
      const J = J_max * I / (I + 500.0);
      const W_j = (J / 4.0) * Math.max(0.0, Ca - gamma_star) / (Ca + 2.0 * gamma_star);
      A_net = Math.max(0.0, Math.min(Vc, W_j) - Rd);
      a_slope = 9.0;
    } else if (pathway === "C4") {
      const Vc_max = growth_rate * 2.5;
      const Vc = Vc_max * Ca / (Ca + 50.0);
      const J_max = Vc_max * 1.8;
      const W_j = (J_max * I / (I + 400.0)) * 0.2;
      A_net = Math.max(0.0, Math.min(Vc, W_j) - Rd);
      a_slope = 4.0;
    } else { // CAM
      const Vc_max = growth_rate * 2.2;
      const A_raw = (Vc_max * Ca / (Ca + 100.0)) * (0.3 + 0.7 * f_water);
      A_net = Math.max(0.0, A_raw - Rd);
      a_slope = 1.5;
    }
    
    const g0 = 0.02;
    let gs = g0 + a_slope * (A_net * hs / Math.max(100.0, Ca)) * f_water;
    gs = Math.min(0.6, Math.max(g0, gs));
    return { A_net, gs };
  };

  const somData = useMemo(() => {
    return timeline.map(pt => {
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

  // Canopy Physiology & Hysteresis states
  const [selectedProducerId, setSelectedProducerId] = useState<string>("grass");

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
      setCurrentYear((current) => {
        if (current >= timeline.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 850);
    return () => window.clearInterval(interval);
  }, [isPlaying, timeline.length]);

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
    setControls((current) => ({ ...current, [key]: value }));
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
    
    setSpecies(prev => {
      const idx = prev.findIndex(s => s.active && s.trophic_level === "Producer");
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], growth_rate: parseFloat(newRate.toFixed(3)) };
        setInjectFeedback(`Injected growth rate of ${newRate.toFixed(3)} into ${updated[idx].name} from "${paper.title.slice(0, 35)}..."!`);
        setTimeout(() => setInjectFeedback(null), 5000);
        return updated;
      }
      return prev;
    });
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

  // Lab Success evaluations
  const labEvaluations = useMemo(() => {
    const finalPoint = timeline[timeline.length - 1];
    
    // Lab 1: May's Complexity Limit
    const activeCount = species.filter(s => s.active).length;
    const mayCond1 = activeCount >= 6;
    const mayCond2 = stability.stable === true;
    const mayCond3 = linkStrength <= 0.6;
    const maySuccess = mayCond1 && mayCond2 && mayCond3;

    // Lab 2: Competitive Exclusion
    const rabbitActive = species.find(s => s.id === "rabbits")?.active ?? false;
    const deerActive = species.find(s => s.id === "deer")?.active ?? false;
    const finalRabbits = finalPoint?.populations?.["rabbits"] ?? 0;
    const finalDeer = finalPoint?.populations?.["deer"] ?? 0;
    const compCond1 = biome === "forest" && rabbitActive && deerActive;
    const compCond2 = finalRabbits < 5.0 || finalDeer < 5.0;
    const compSuccess = compCond1 && compCond2;

    // Lab 3: Metapopulation Rescue
    let rightConsumers = 0;
    if (finalPoint && finalPoint.cells) {
      finalPoint.cells.forEach(c => {
        if (c.x >= 5) {
          rightConsumers += ((c.populations?.["rabbits"] ?? 0) + (c.populations?.["wolves"] ?? 0));
        }
      });
    }
    const rescueCond1 = corridorY !== null;
    const rescueCond2 = rightConsumers > 10.0;
    const rescueSuccess = rescueCond1 && rescueCond2;

    // Lab 4: Eutrophication Dead Zones
    const eutrophPulse = eutrophicationPulse === true;
    let hadBloom = false;
    let hadHypoxia = false;
    timeline.forEach(pt => {
      pt.cells.forEach(c => {
        if (c.hypoxic) hadHypoxia = true;
        const prodSum = Object.entries(c.populations).filter(([spId]) => 
          species.find(s => s.id === spId)?.trophic_level === "Producer"
        ).reduce((sum, [_, v]) => sum + v, 0);
        if (prodSum > 400.0) hadBloom = true;
      });
    });
    const eutrophSuccess = eutrophPulse && hadBloom && hadHypoxia;

    // Lab 5: Climate Shifts & Biomagnification
    const isWarming = climateWarmingRate >= 0.15;
    const isToxic = toxinInfluxRate >= 0.08;
    let hadHighToxin = false;
    timeline.forEach(pt => {
      pt.cells.forEach(c => {
        if (c.toxin_concentration > 0.5) hadHighToxin = true;
      });
    });
    const climateSuccess = isWarming && isToxic && hadHighToxin;

    // Lab 6: Canopy Physiology & WUE
    const selectedPath = species.find(s => s.id === "grass")?.photosynthetic_pathway || "C3";
    const physCond1 = selectedPath === "C4" || selectedPath === "CAM";
    const physCond2 = controls.temperature >= 30.0;
    const physSuccess = physCond1 && physCond2;

    // Lab 7: Lake Hysteresis
    const hystCond1 = hysteresisData.length > 0;
    const hystSuccess = hystCond1;

    // Lab 8: Soil Carbon Kinetics
    const activeC = finalPoint?.cells?.length ? finalPoint.cells.reduce((sum, c) => sum + (c.som_active_c ?? 0), 0) / finalPoint.cells.length : 0;
    const slowC = finalPoint?.cells?.length ? finalPoint.cells.reduce((sum, c) => sum + (c.som_slow_c ?? 0), 0) / finalPoint.cells.length : 0;
    const soilCond1 = activeC > 5.0 || slowC > 15.0;
    const soilSuccess = soilCond1;

    return {
      may: { activeCount, cond1: mayCond1, cond2: mayCond2, cond3: mayCond3, success: maySuccess },
      comp: { cond1: compCond1, cond2: compCond2, success: compSuccess, finalRabbits, finalDeer },
      rescue: { cond1: rescueCond1, cond2: rescueCond2, success: rescueSuccess, rightConsumers },
      eutroph: { success: eutrophSuccess, pulse: eutrophPulse, bloom: hadBloom, hypoxia: hadHypoxia },
      climate: { success: climateSuccess, warming: isWarming, toxic: isToxic, bioconc: hadHighToxin },
      phys: { success: physSuccess, cond1: physCond1, cond2: physCond2, path: selectedPath },
      hyst: { success: hystSuccess, cond1: hystCond1 },
      soil: { success: soilSuccess, cond1: soilCond1, activeC, slowC }
    };
  }, [timeline, species, stability, linkStrength, biome, corridorY, eutrophicationPulse, climateWarmingRate, toxinInfluxRate, controls, hysteresisData]);

  // Load starting states for labs
  const startLab = (labId: string) => {
    let nextBiome = biome;
    let nextSpecies = species;
    let nextLinkStrength = linkStrength;
    let nextCorridorY = corridorY;
    let nextControls = { ...controls };
    let nextEutroph = eutrophicationPulse;
    let nextWarming = climateWarmingRate;
    let nextToxin = toxinInfluxRate;

    if (labId === "may-stability") {
      nextBiome = "forest";
      nextSpecies = defaultSpecies.forest.map(s => ({ ...s, active: true, initial_pop: s.initial_pop }));
      nextLinkStrength = 1.2; // Force unstable
      nextCorridorY = null;
      nextControls = defaultControls;
      nextEutroph = false;
      nextWarming = 0.0;
      nextToxin = 0.0;
    } else if (labId === "competitive") {
      nextBiome = "forest";
      nextSpecies = defaultSpecies.forest.map(s => {
        if (s.id === "grass" || s.id === "rabbits" || s.id === "deer") {
          return { ...s, active: true, initial_pop: s.id === "grass" ? 180 : s.id === "rabbits" ? 120 : 100 };
        }
        return { ...s, active: false };
      });
      nextLinkStrength = 1.0;
      nextCorridorY = null;
      nextControls = defaultControls;
      nextEutroph = false;
      nextWarming = 0.0;
      nextToxin = 0.0;
    } else if (labId === "rescue") {
      nextBiome = "forest";
      nextSpecies = defaultSpecies.forest.map(s => {
        if (s.id === "grass" || s.id === "rabbits" || s.id === "wolves") {
          return { ...s, active: true, initial_pop: s.initial_pop };
        }
        return { ...s, active: false };
      });
      nextLinkStrength = 1.0;
      nextCorridorY = null;
      nextControls = {
        rainfall: 250,
        temperature: 34,
        nitrogen: 20,
        co2: 420.0,
        relative_humidity: 65.0,
        light_intensity: 800.0,
      };
      nextEutroph = false;
      nextWarming = 0.0;
      nextToxin = 0.0;
    } else if (labId === "eutrophication") {
      nextBiome = "forest";
      nextSpecies = defaultSpecies.forest.map(s => {
        if (s.id === "grass" || s.id === "ferns" || s.id === "rabbits" || s.id === "deer") {
          return { ...s, active: true, initial_pop: s.id === "grass" ? 150 : s.id === "ferns" ? 100 : s.initial_pop };
        }
        return { ...s, active: false };
      });
      nextLinkStrength = 1.0;
      nextCorridorY = null;
      nextControls = defaultControls;
      nextEutroph = true;
      nextWarming = 0.0;
      nextToxin = 0.0;
    } else if (labId === "climate-toxins") {
      nextBiome = "forest";
      nextSpecies = defaultSpecies.forest.map(s => {
        if (s.id === "grass" || s.id === "rabbits" || s.id === "wolves") {
          return { ...s, active: true, initial_pop: s.initial_pop };
        }
        return { ...s, active: false };
      });
      nextLinkStrength = 1.0;
      nextCorridorY = null;
      nextControls = defaultControls;
      nextEutroph = false;
      nextWarming = 0.2; // Warming active
      nextToxin = 0.1;    // Mercury Active
    } else if (labId === "physiology-wue") {
      nextBiome = "forest";
      nextSpecies = defaultSpecies.forest.map(s => {
        if (s.id === "grass") {
          return { ...s, active: true, photosynthetic_pathway: "C3" };
        }
        return { ...s, active: s.trophic_level === "Producer" };
      });
      setCurriculumTab("physiology");
      nextControls = {
        temperature: 34.0, // High temperature stress
        co2: 420.0,
        relative_humidity: 40.0, // Dry
        light_intensity: 1200.0, // High sunlight
        rainfall: controls.rainfall,
        nitrogen: controls.nitrogen,
      };
      nextEutroph = false;
      nextWarming = 0.0;
      nextToxin = 0.0;
    } else if (labId === "lake-hysteresis") {
      nextBiome = "forest";
      setCurriculumTab("hysteresis");
      setHysteresisData([]);
    } else if (labId === "som-kinetics") {
      nextBiome = "forest";
      setCurriculumTab("biogeochem");
      nextControls = {
        rainfall: 800, // Wet conditions
        temperature: 24,
        nitrogen: controls.nitrogen,
        co2: controls.co2,
        relative_humidity: controls.relative_humidity,
        light_intensity: controls.light_intensity,
      };
    }

    setBiome(nextBiome);
    setSpecies(nextSpecies);
    setLinkStrength(nextLinkStrength);
    setCorridorY(nextCorridorY);
    setControls(nextControls);
    setEutrophicationPulse(nextEutroph);
    setClimateWarmingRate(nextWarming);
    setToxinInfluxRate(nextToxin);
    setActivePreset("custom");

    if (labId !== "lake-hysteresis") {
      triggerSimulation(
        nextControls,
        nextBiome,
        nextSpecies,
        nextLinkStrength,
        nextCorridorY,
        "custom",
        nextEutroph,
        nextWarming,
        nextToxin
      );
    }
  };

  const passedCount = Object.keys(quizPassed).filter(k => quizPassed[k] === true).length;
  const totalLabs = 8;

  const renderQuiz = (labId: string, questions: Array<{ q: string; opts: string[]; ans: number }>) => {
    const isSubmitted = quizSubmitted[labId] === true;
    const isPassed = quizPassed[labId] === true;
    const answers = quizAnswers[labId] || {};

    const handleSelect = (qIdx: number, oIdx: number) => {
      if (isSubmitted) return;
      setQuizAnswers(prev => ({
        ...prev,
        [labId]: {
          ...(prev[labId] || {}),
          [qIdx]: oIdx
        }
      }));
    };

    const handleSubmitQuiz = () => {
      let correctCount = 0;
      questions.forEach((q, qIdx) => {
        if (answers[qIdx] === q.ans) correctCount++;
      });
      const passed = correctCount === questions.length;
      setQuizSubmitted(prev => ({ ...prev, [labId]: true }));
      setQuizPassed(prev => ({ ...prev, [labId]: passed }));
    };

    const handleResetQuiz = () => {
      setQuizAnswers(prev => ({ ...prev, [labId]: {} }));
      setQuizSubmitted(prev => ({ ...prev, [labId]: false }));
      setQuizPassed(prev => ({ ...prev, [labId]: false }));
    };

    return (
      <div className="space-y-4 bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg mt-3">
        <div className="font-mono text-[9px] text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-1.5">
          <Activity className="size-3" /> Lab Assessment Quiz
        </div>
        {questions.map((q, qIdx) => {
          const selectedOption = answers[qIdx];
          return (
            <div key={qIdx} className="space-y-1.5">
              <div className="text-slate-300 font-semibold text-xs leading-4">{qIdx + 1}. {q.q}</div>
              <div className="space-y-1">
                {q.opts.map((opt, oIdx) => {
                  const isCurrent = selectedOption === oIdx;
                  return (
                    <button
                      key={oIdx}
                      disabled={isSubmitted}
                      onClick={() => handleSelect(qIdx, oIdx)}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded border transition-all ${
                        isCurrent
                          ? isSubmitted
                            ? oIdx === q.ans
                              ? "bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald"
                              : "bg-accent-rose/10 border-accent-rose/30 text-accent-rose"
                            : "bg-primary/10 border-primary/30 text-primary"
                          : "bg-surface-soft border-hairline text-muted hover:border-hairline-strong hover:text-ink"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!isSubmitted ? (
          <button
            onClick={handleSubmitQuiz}
            disabled={Object.keys(answers).length < questions.length}
            className={`w-full py-1.5 rounded font-mono text-xs uppercase tracking-wider transition-all border ${
              Object.keys(answers).length < questions.length
                ? "bg-primary-disabled text-muted border-hairline cursor-not-allowed opacity-50"
                : "bg-primary hover:bg-primary-active border-primary text-on-primary font-semibold"
            }`}
          >
            Submit Quiz
          </button>
        ) : (
          <div className="space-y-2">
            {isPassed ? (
              <div className="bg-accent-emerald/10 border border-accent-emerald/30 p-2.5 rounded text-accent-emerald text-xs font-mono text-center uppercase tracking-wider flex items-center justify-center gap-1.5 animate-pulse">
                <CheckCircle2 className="size-4 text-accent-emerald" /> Passed! Quiz Certified.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-accent-rose/10 border border-accent-rose/30 p-2.5 rounded text-accent-rose text-xs font-mono text-center uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <ShieldAlert className="size-4 text-accent-rose" /> Failed. Review and retry.
                </div>
                <button
                  onClick={handleResetQuiz}
                  className="w-full py-1.5 rounded bg-surface-card border border-hairline text-ink font-mono text-xs uppercase tracking-wider hover:bg-surface-elevated transition"
                >
                  Retry Quiz
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  return (
    <main className="min-h-screen bg-canvas p-3 text-body sm:p-4 lg:p-5">
      <div className="scanline relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-lg border border-hairline bg-canvas">
        <div className="relative z-10 flex min-h-[calc(100vh-2rem)] flex-col">
          <DashboardHeader />

          <section className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 md:p-5 min-h-0">
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
                              setSpecies(prev => prev.map((s, i) => i === idx ? { ...s, active: checked } : s));
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
                              setSpecies(prev => prev.map((s, i) => i === idx ? { ...s, initial_pop: val } : s));
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
                    <div className="flex-1 flex flex-col md:flex-row gap-4 h-full min-h-0">
                      <div className="flex-1 flex items-center justify-center p-3 bg-canvas border border-hairline rounded-lg relative min-h-[340px]">
                        <AnimatePresence>
                          {isLoading && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 z-20 grid place-items-center bg-canvas/70 backdrop-blur-sm"
                            >
                              <div className="flex items-center gap-3 rounded border border-hairline bg-surface-card px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-primary">
                                <Loader2 className="size-4 animate-spin text-primary" />
                                Solving ecosystem matrix
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        <svg 
                          viewBox="0 0 100 100" 
                          className="w-full max-w-[420px] aspect-square rounded select-none animate-fade-in"
                          onMouseDown={() => setIsMouseDown(true)}
                          onMouseUp={() => setIsMouseDown(false)}
                          onMouseLeave={() => setIsMouseDown(false)}
                        >
                          {Array.from({ length: 10 }).map((_, y) => 
                            Array.from({ length: 10 }).map((_, x) => {
                              const cells = activePoint?.cells || [];
                              const cell = cells.find(c => c.x === x && c.y === y) || { plants: 0, rabbits: 0, wolves: 0, populations: {} as Record<string, number>, nutrients: {} as Record<string, number>, x, y, toxin_concentration: 0, hypoxic: false };
                              const plantVal = cell.plants;
                              const rabbitVal = cell.rabbits;
                              const wolfVal = cell.wolves;

                              // Color Mix Formula
                              const r = Math.min(220, Math.floor(wolfVal * 160 + rabbitVal * 25));
                              const g = Math.min(220, Math.floor(plantVal * 16 + rabbitVal * 15));
                              const b = Math.min(240, Math.floor(rabbitVal * 70));
                              
                              const totalMass = plantVal + rabbitVal + wolfVal;
                              const opacity = Math.min(0.95, Math.max(0.12, totalMass / 25.0));
                              
                              const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                              const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
                              const isDisturbed = disturbanceCells.some(([cx, cy]) => cx === x && cy === y);
                              
                              return (
                                <g key={`${x}-${y}`}>
                                  <rect
                                    x={x * 10}
                                    y={y * 10}
                                    width={9.2}
                                    height={9.2}
                                    rx={1}
                                    fill={`rgb(${r}, ${g}, ${b})`}
                                    fillOpacity={opacity}
                                    stroke={isSelected ? "#22d3ee" : isHovered ? "rgba(34, 211, 238, 0.4)" : "rgba(34, 211, 238, 0.08)"}
                                    strokeWidth={isSelected ? 0.8 : isHovered ? 0.6 : 0.2}
                                    className="cursor-pointer transition-all duration-300 hover:fill-opacity-90"
                                    onMouseEnter={() => {
                                      setHoveredCell({ 
                                        x, 
                                        y, 
                                        populations: cell.populations || {}, 
                                        nutrients: cell.nutrients || {},
                                        toxin_concentration: cell.toxin_concentration,
                                        hypoxic: cell.hypoxic 
                                      });
                                      if (selectedTool !== "None" && isMouseDown) {
                                        paintCell(x, y);
                                      }
                                    }}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    onMouseDown={(e) => {
                                      if (selectedTool !== "None") {
                                        e.stopPropagation();
                                        setIsMouseDown(true);
                                        paintCell(x, y);
                                      }
                                    }}
                                    onClick={() => {
                                      if (selectedTool !== "None") {
                                        paintCell(x, y);
                                      } else {
                                        setSelectedCell({ x, y });
                                        setIsPlaying(false);
                                        if (x === 4 || x === 5) {
                                          setCorridorY(y);
                                        }
                                      }
                                    }}
                                  />
                                  {isDisturbed && (
                                    <rect
                                      x={x * 10 + 0.5}
                                      y={y * 10 + 0.5}
                                      width={8.2}
                                      height={8.2}
                                      rx={0.5}
                                      fill="none"
                                      stroke={
                                        selectedTool === "fire" || disturbanceType === "fire" ? "#f97316" :
                                        selectedTool === "logging" || disturbanceType === "logging" ? "#b45309" :
                                        "#22c55e"
                                      }
                                      strokeWidth={0.8}
                                      strokeDasharray={selectedTool !== "None" ? "1 0.5" : "none"}
                                      className="pointer-events-none"
                                    />
                                  )}
                                  {cell.hypoxic && (
                                    <rect
                                      x={x * 10}
                                      y={y * 10}
                                      width={9.2}
                                      height={9.2}
                                      rx={1}
                                      fill="rgba(100, 116, 139, 0.65)"
                                      className="pointer-events-none animate-pulse"
                                    />
                                  )}
                                  {cell.toxin_concentration > 1.0 && (
                                    <rect
                                      x={x * 10}
                                      y={y * 10}
                                      width={9.2}
                                      height={9.2}
                                      rx={1}
                                      fill="none"
                                      stroke="#84cc16"
                                      strokeWidth="0.8"
                                      className="pointer-events-none"
                                    />
                                  )}
                                  {rabbitVal > 0.5 && !cell.hypoxic && (
                                    <circle cx={x * 10 + 2.5} cy={y * 10 + 2.5} r={0.7} fill="#22d3ee" className="pointer-events-none animate-pulse" />
                                  )}
                                  {wolfVal > 0.2 && !cell.hypoxic && (
                                    <circle cx={x * 10 + 7.5} cy={y * 10 + 2.5} r={0.7} fill="#f59e0b" className="pointer-events-none" />
                                  )}
                                </g>
                              );
                            })
                          )}

                          {/* Metapopulation Rescue: highway column at X=5 */}
                          <line x1="49.6" y1="0" x2="49.6" y2="100" stroke="#f43f5e" strokeWidth="0.8" strokeDasharray="3 3" opacity={0.6} />
                          
                          {/* Corridor placement */}
                          {corridorY !== null && (
                            <rect
                              x="48.5"
                              y={corridorY * 10 + 2}
                              width="2.2"
                              height="5.2"
                              fill="#10b981"
                              rx="0.5"
                              className="animate-pulse"
                              style={{ filter: "drop-shadow(0 0 3px #10b981)" }}
                            />
                          )}
                        </svg>
                      </div>
                      
                      <div className="w-full md:w-[200px] flex flex-col justify-between border-t md:border-t-0 md:border-l border-hairline p-4 bg-surface-soft rounded-r-lg">
                        <div className="overflow-y-auto max-h-[360px]">
                          <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-primary mb-3">
                            <Satellite className="size-3.5 text-primary animate-pulse" />
                            Spatial Telemetry
                          </div>
                          {hoveredCell || selectedCell ? (
                            <div className="space-y-4">
                              <div>
                                <div className="font-semibold text-sm text-body">
                                  Coordinate: <span className="font-mono text-primary">[{hoveredCell?.x ?? selectedCell?.x}, {hoveredCell?.y ?? selectedCell?.y}]</span>
                                </div>
                                <div className="text-[10px] text-muted font-mono mt-0.5 uppercase tracking-wider">
                                  {hoveredCell ? "Hover Focus" : "Selected Target"}
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                {activeSpecies.map((sp) => {
                                  const val = (hoveredCell?.populations?.[sp.id] ?? selectedCellData?.populations?.[sp.id]);
                                  return (
                                    <div key={sp.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-900">
                                      <span className="capitalize text-slate-400">{sp.name.slice(0, 12)}:</span>
                                      <span className="font-mono text-slate-100 font-bold">{val !== undefined ? val.toFixed(2) : "0.0"}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-900 space-y-1.5 text-[11px] font-mono">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Hypoxic Zone:</span>
                                  <span className={(hoveredCell?.hypoxic ?? selectedCellData?.hypoxic) ? "text-rose-400 font-bold animate-pulse" : "text-slate-400"}>
                                    {(hoveredCell?.hypoxic ?? selectedCellData?.hypoxic) ? "YES (DEAD)" : "NO"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Mercury (Hg):</span>
                                  <span className={(hoveredCell?.toxin_concentration ?? selectedCellData?.toxin_concentration ?? 0) > 1.5 ? "text-lime-400 font-bold" : "text-slate-400"}>
                                    {(hoveredCell?.toxin_concentration ?? selectedCellData?.toxin_concentration ?? 0).toFixed(3)} units
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 italic py-6 leading-5">
                              Hover or click cells to analyze localized population metrics. Click column 4 or 5 to build a wildlife bridge.
                            </div>
                          )}
                        </div>
                        
                        {selectedCell && (
                          <button 
                            onClick={() => setSelectedCell(null)}
                            className="w-full text-center text-[10px] font-mono uppercase tracking-[0.16em] border border-slate-700 hover:border-slate-500 rounded p-2 text-slate-400 hover:text-slate-200 transition mt-4"
                          >
                            Reset Selection
                          </button>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="chart" className="flex-1 min-h-0 focus:outline-none mt-0 relative">
                    <div className="w-full h-full min-h-[340px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeline}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="year" stroke="#64748b" tickLine={false} tick={{ fontSize: 11 }} />
                          <YAxis stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          
                          {activeSpecies.map((sp, sIdx) => (
                            <Line
                              key={sp.id}
                              type="monotone"
                              dataKey={`populations.${sp.id}`}
                              name={sp.name}
                              stroke={`hsl(${sIdx * 45}, 70%, 55%)`}
                              strokeWidth={2.5}
                              dot={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>

                  <TabsContent value="stability" className="flex-1 min-h-0 mt-0 focus:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                      <div className="flex items-center justify-center">
                        <EigenvaluePlane eigenvalues={stability.eigenvalues} />
                      </div>
                      <div className="flex items-center justify-center">
                        <JacobianMatrix matrix={stability.jacobian} activeSpecies={activeSpecies} />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              {/* Canopy Physiology Tab */}
              {curriculumTab === "physiology" && (
                <div className="space-y-4 h-full overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Control Card */}
                    <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl space-y-4">
                      <h3 className="text-sm font-mono text-cyan-200 uppercase tracking-wider">Physiology Controls</h3>
                      
                      <div className="space-y-2">
                        <label className="text-[11px] font-mono text-slate-400 block uppercase">Selected Autotroph:</label>
                        <select
                          value={selectedProducerId}
                          onChange={(e) => setSelectedProducerId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                        >
                          {species
                            .filter(s => s.trophic_level === "Producer" && s.active)
                            .map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-mono text-slate-400 block uppercase">Photosynthetic Pathway:</label>
                        <select
                          value={species.find(s => s.id === selectedProducerId)?.photosynthetic_pathway || "C3"}
                          onChange={(e) => {
                            const path = e.target.value as "C3" | "C4" | "CAM";
                            setSpecies(prev => prev.map(s => s.id === selectedProducerId ? { ...s, photosynthetic_pathway: path } : s));
                          }}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                        >
                          <option value="C3">C3 Pathway (RuBisCO Standard)</option>
                          <option value="C4">C4 Pathway (PEPC Spatial Concentration)</option>
                          <option value="CAM">CAM Pathway (Temporal/Nocturnal Malic)</option>
                        </select>
                      </div>

                      {/* Readout stats */}
                      <div className="border-t border-slate-850 pt-4 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-mono">Net Photosynthesis (A):</span>
                          <span className="text-emerald-400 font-mono font-bold">
                            {(() => {
                              const sel = species.find(s => s.id === selectedProducerId);
                              const { A_net } = computePhotosynthesisJS(
                                sel?.photosynthetic_pathway || "C3",
                                controls.co2 ?? 420.0,
                                controls.temperature,
                                controls.relative_humidity ?? 65.0,
                                controls.light_intensity ?? 800.0,
                                activePoint?.cells?.length ? activePoint.cells.reduce((sum, c) => sum + (c.soil_moisture ?? 0.15), 0) / activePoint.cells.length : 0.15,
                                sel?.growth_rate || 0.45
                              );
                              return A_net.toFixed(4);
                            })()} mol C/m²/yr
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-mono">Stomatal Conductance (gs):</span>
                          <span className="text-cyan-400 font-mono font-bold">
                            {(() => {
                              const sel = species.find(s => s.id === selectedProducerId);
                              const { gs } = computePhotosynthesisJS(
                                sel?.photosynthetic_pathway || "C3",
                                controls.co2 ?? 420.0,
                                controls.temperature,
                                controls.relative_humidity ?? 65.0,
                                controls.light_intensity ?? 800.0,
                                activePoint?.cells?.length ? activePoint.cells.reduce((sum, c) => sum + (c.soil_moisture ?? 0.15), 0) / activePoint.cells.length : 0.15,
                                sel?.growth_rate || 0.45
                              );
                              return gs.toFixed(4);
                            })()} mol H₂O/m²/s
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-mono">Water Use Efficiency (WUE):</span>
                          <span className="text-amber-400 font-mono font-bold">
                            {(() => {
                              const sel = species.find(s => s.id === selectedProducerId);
                              const temp = controls.temperature;
                              const rh = controls.relative_humidity ?? 65.0;
                              const es = 0.6108 * Math.exp(17.27 * temp / (temp + 237.3));
                              const vpd = es * (1.0 - rh / 100.0);
                              const { A_net, gs } = computePhotosynthesisJS(
                                sel?.photosynthetic_pathway || "C3",
                                controls.co2 ?? 420.0,
                                temp,
                                rh,
                                controls.light_intensity ?? 800.0,
                                activePoint?.cells?.length ? activePoint.cells.reduce((sum, c) => sum + (c.soil_moisture ?? 0.15), 0) / activePoint.cells.length : 0.15,
                                sel?.growth_rate || 0.45
                              );
                              return vpd > 0.01 ? (A_net / (gs * vpd)).toFixed(2) : "∞";
                            })()} μmol/mmol
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Light Curve Chart */}
                    <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl md:col-span-2">
                      <h3 className="text-sm font-mono text-cyan-200 uppercase tracking-wider mb-2">Photosynthesis Curves</h3>
                      <Tabs defaultValue="light" className="w-full">
                        <TabsList className="mb-2">
                          <TabsTrigger value="light" className="text-[10px] uppercase font-mono">A vs Light (PAR)</TabsTrigger>
                          <TabsTrigger value="co2" className="text-[10px] uppercase font-mono">A vs CO₂ (Cₐ)</TabsTrigger>
                        </TabsList>

                        <TabsContent value="light" className="h-[220px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={(() => {
                                const sel = species.find(s => s.id === selectedProducerId);
                                const gr = sel?.growth_rate || 0.45;
                                const sm = activePoint?.cells?.length ? activePoint.cells.reduce((sum, c) => sum + (c.soil_moisture ?? 0.15), 0) / activePoint.cells.length : 0.15;
                                return Array.from({ length: 21 }).map((_, i) => {
                                  const par = i * 100;
                                  const { A_net } = computePhotosynthesisJS(
                                    sel?.photosynthetic_pathway || "C3",
                                    controls.co2 ?? 420.0,
                                    controls.temperature,
                                    controls.relative_humidity ?? 65.0,
                                    par,
                                    sm,
                                    gr
                                  );
                                  return { par, A: parseFloat(A_net.toFixed(4)) };
                                });
                              })()}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="par" stroke="#64748b" style={{ fontSize: 9 }} label={{ value: "PAR (W/m²)", position: "insideBottom", offset: -2, fill: "#64748b", fontSize: 9 }} />
                              <YAxis stroke="#64748b" style={{ fontSize: 9 }} label={{ value: "A (mol/m²/yr)", angle: -90, position: "insideLeft", offset: 5, fill: "#64748b", fontSize: 9 }} />
                              <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#1e293b", fontSize: 10 }} />
                              <Line type="monotone" dataKey="A" stroke="#10b981" strokeWidth={2} dot={false} />
                              <ReferenceLine x={controls.light_intensity ?? 800.0} stroke="#eab308" strokeDasharray="3 3" label={{ value: "Current PAR", fill: "#eab308", fontSize: 8, position: "top" }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </TabsContent>

                        <TabsContent value="co2" className="h-[220px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={(() => {
                                const sel = species.find(s => s.id === selectedProducerId);
                                const gr = sel?.growth_rate || 0.45;
                                const sm = activePoint?.cells?.length ? activePoint.cells.reduce((sum, c) => sum + (c.soil_moisture ?? 0.15), 0) / activePoint.cells.length : 0.15;
                                return Array.from({ length: 25 }).map((_, i) => {
                                  const co2Val = i * 50;
                                  const { A_net } = computePhotosynthesisJS(
                                    sel?.photosynthetic_pathway || "C3",
                                    co2Val,
                                    controls.temperature,
                                    controls.relative_humidity ?? 65.0,
                                    controls.light_intensity ?? 800.0,
                                    sm,
                                    gr
                                  );
                                  return { co2: co2Val, A: parseFloat(A_net.toFixed(4)) };
                                });
                              })()}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="co2" stroke="#64748b" style={{ fontSize: 9 }} label={{ value: "Atmospheric CO₂ (ppm)", position: "insideBottom", offset: -2, fill: "#64748b", fontSize: 9 }} />
                              <YAxis stroke="#64748b" style={{ fontSize: 9 }} label={{ value: "A (mol/m²/yr)", angle: -90, position: "insideLeft", offset: 5, fill: "#64748b", fontSize: 9 }} />
                              <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#1e293b", fontSize: 10 }} />
                              <Line type="monotone" dataKey="A" stroke="#06b6d4" strokeWidth={2} dot={false} />
                              <ReferenceLine x={controls.co2 ?? 420.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Current CO₂", fill: "#ef4444", fontSize: 8, position: "top" }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>

                  {/* Pathway comparison notes */}
                  <div className="bg-slate-900/30 border border-slate-800/40 p-4 rounded-xl">
                    <h4 className="text-xs font-mono text-slate-300 uppercase mb-2">Pathways Comparison:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-slate-400">
                      <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                        <span className="text-emerald-400 block font-bold mb-1">C3 (Standard)</span>
                        Most land plants. Suffers from photorespiration under low CO₂ or high heat. High optimal water and moderate light saturation.
                      </div>
                      <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                        <span className="text-cyan-400 block font-bold mb-1">C4 (Warm/Sunny)</span>
                        Grasses, corn, sugarcane. Concentrates CO₂ in bundle sheath cells. Resilient to drought and high temps; does not photorespire.
                      </div>
                      <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                        <span className="text-amber-400 block font-bold mb-1">CAM (Xeric/Desert)</span>
                        Succulents, pineapples, cacti. Opens stomata only at night to fix CO₂ as malate, minimizing daytime evapotranspiration.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hydrology & Energy Tab */}
              {curriculumTab === "hydrology" && (
                <Tabs defaultValue="moisture-map" className="flex flex-col h-full min-h-0">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-3">
                    <TabsList>
                      <TabsTrigger value="moisture-map" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-200">
                        <MapIcon className="size-3" /> Soil Moisture Map
                      </TabsTrigger>
                      <TabsTrigger value="energy-chart" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-200">
                        <Activity className="size-3" /> Energy Partition & Bowen Ratio
                      </TabsTrigger>
                    </TabsList>

                    <div className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-2">
                      <span>Average ET:</span>
                      <span className="text-cyan-300 font-bold">
                        {(activePoint?.cells?.reduce((sum, c) => sum + (c.evapotranspiration ?? 0.05), 0) / (activePoint?.cells?.length || 1)).toFixed(3)} mm/day
                      </span>
                    </div>
                  </div>

                  <TabsContent value="moisture-map" className="flex-1 flex flex-col min-h-0 focus:outline-none mt-0">
                    <div className="flex-1 flex flex-col md:flex-row gap-4 h-full min-h-0">
                      <div className="flex-1 flex items-center justify-center p-3 bg-slate-950/40 border border-slate-800/40 rounded-lg relative min-h-[340px]">
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
                                  stroke={isSelected ? "#22d3ee" : isHovered ? "rgba(34, 211, 238, 0.4)" : "rgba(34, 211, 238, 0.08)"}
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
                      <div className="w-full md:w-[240px] bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                        <div className="space-y-4">
                          <h3 className="text-xs font-mono text-cyan-200 uppercase tracking-wider">Hydrological Profile</h3>
                          {selectedCell ? (
                            (() => {
                              const cell = activePoint?.cells?.find(c => c.x === selectedCell.x && c.y === selectedCell.y);
                              if (!cell) return <p className="text-xs text-slate-500 font-mono">Cell telemetry unavailable.</p>;
                              return (
                                <div className="space-y-3 font-mono text-[11px]">
                                  <div className="flex justify-between border-b border-slate-800 pb-1">
                                    <span className="text-slate-400">Coordinates:</span>
                                    <span className="text-cyan-300">[{selectedCell.x}, {selectedCell.y}]</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-800 pb-1">
                                    <span className="text-slate-400">Soil Moisture (θ):</span>
                                    <span className="text-cyan-300 font-bold">{(cell.soil_moisture ?? 0.15).toFixed(4)} m³/m³</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-800 pb-1">
                                    <span className="text-slate-400">Evapotranspiration (ET):</span>
                                    <span className="text-cyan-300">{(cell.evapotranspiration ?? 0.05).toFixed(4)} mm/d</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-800 pb-1">
                                    <span className="text-slate-400">Sensible Heat (H):</span>
                                    <span className="text-amber-400">{(cell.sensible_heat ?? 30.0).toFixed(1)} W/m²</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-800 pb-1">
                                    <span className="text-slate-400">Latent Heat (LE):</span>
                                    <span className="text-blue-400">{(cell.latent_heat ?? 100.0).toFixed(1)} W/m²</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-800 pb-1">
                                    <span className="text-slate-400">Bowen Ratio (H/LE):</span>
                                    <span className="text-yellow-400">
                                      {cell.latent_heat && cell.latent_heat > 0.1 ? (cell.sensible_heat / cell.latent_heat).toFixed(3) : "∞"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <p className="text-xs text-slate-500 font-mono">Select a cell on the map to view detailed hydrology and energy parameters.</p>
                          )}
                        </div>
                        
                        <div className="text-[10px] font-mono text-slate-500 bg-slate-950/50 p-2.5 rounded border border-slate-850 mt-4">
                          <span className="text-cyan-300 font-bold block mb-1">Penman-Monteith Model</span>
                          Solves cell-level water & heat balances. Bowen ratio shifts higher when soil moisture limits transpiration ($LE \to 0$, causing land surface warming).
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="energy-chart" className="flex-1 min-h-[300px] mt-0 focus:outline-none">
                    <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl h-full">
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
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="year" stroke="#64748b" style={{ fontSize: 9 }} />
                          <YAxis stroke="#64748b" style={{ fontSize: 9 }} />
                          <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#1e293b", fontSize: 10 }} />
                          <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                          <Line type="monotone" dataKey="Sensible Heat (H)" stroke="#f59e0b" strokeWidth={2} dot={false} />
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
                <Tabs defaultValue="nutrients-map" className="flex flex-col h-full min-h-0">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-3">
                    <TabsList>
                      <TabsTrigger value="nutrients-map" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-200">
                        <MapIcon className="size-3" /> Nutrient Heatmap
                      </TabsTrigger>
                      <TabsTrigger value="nutrients-chart" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-200">
                        <Activity className="size-3" /> Stoichiometry Timeline
                      </TabsTrigger>
                      <TabsTrigger value="som-pools" className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-200">
                        <Cpu className="size-3" /> Century Soil Pools
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">Soil Pool:</span>
                      <select 
                        value={activeNutrientMap}
                        onChange={(e) => setActiveNutrientMap(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded text-xs text-cyan-300 font-mono px-2 py-1 focus:outline-none"
                      >
                        <option value="C">Carbon (C)</option>
                        <option value="N">Nitrogen (N)</option>
                        <option value="P">Phosphorus (P)</option>
                      </select>
                    </div>
                  </div>

                  <TabsContent value="nutrients-map" className="flex-1 flex flex-col min-h-0 focus:outline-none mt-0">
                    <div className="flex-1 flex flex-col md:flex-row gap-4 h-full min-h-0">
                      <div className="flex-1 flex items-center justify-center p-3 bg-slate-950/40 border border-slate-800/40 rounded-lg relative min-h-[340px]">
                        <svg viewBox="0 0 100 100" className="w-full max-w-[420px] aspect-square rounded select-none animate-fade-in">
                          {Array.from({ length: 10 }).map((_, y) => 
                            Array.from({ length: 10 }).map((_, x) => {
                              const cells = activePoint?.cells || [];
                              const cell = cells.find(c => c.x === x && c.y === y) || { plants: 0, rabbits: 0, wolves: 0, populations: {} as Record<string, number>, nutrients: {} as Record<string, number>, x, y, toxin_concentration: 0, hypoxic: false };
                              const val = cell.nutrients[activeNutrientMap] ?? 0.0;
                              
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
                                  stroke={isSelected ? "#22d3ee" : isHovered ? "rgba(34, 211, 238, 0.4)" : "rgba(34, 211, 238, 0.08)"}
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

                      <div className="w-full md:w-[200px] border-t md:border-t-0 md:border-l border-cyan-300/10 p-4 bg-slate-900/20 rounded-r-lg">
                        <div className="overflow-y-auto max-h-[360px]">
                          <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300 mb-3">
                            <Activity className="size-3.5 text-cyan-300" />
                            Soil Stoichiometry
                          </div>
                          {hoveredCell || selectedCell ? (
                            <div className="space-y-4">
                              <div>
                                <div className="font-semibold text-sm text-slate-200">
                                  Coordinate: <span className="font-mono text-cyan-300">[{hoveredCell?.x ?? selectedCell?.x}, {hoveredCell?.y ?? selectedCell?.y}]</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">
                                  Local Stocks
                                </div>
                              </div>
                              
                              <div className="space-y-2.5 font-mono text-xs">
                                <div className="flex justify-between py-1 border-b border-slate-900">
                                  <span className="text-amber-500">Carbon (C):</span>
                                  <span className="text-slate-100 font-bold">{(hoveredCell?.nutrients?.["C"] ?? selectedCellData?.nutrients?.["C"] ?? 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-900">
                                  <span className="text-violet-500">Nitrogen (N):</span>
                                  <span className="text-slate-100 font-bold">{(hoveredCell?.nutrients?.["N"] ?? selectedCellData?.nutrients?.["N"] ?? 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-900">
                                  <span className="text-cyan-500">Phosphorus (P):</span>
                                  <span className="text-slate-100 font-bold">{(hoveredCell?.nutrients?.["P"] ?? selectedCellData?.nutrients?.["P"] ?? 0).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 italic py-6 leading-5">
                              Hover or click cells to monitor stoichiometric distributions. Liebig&apos;s Law dictates producer growth based on the scarcest of these three pools.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="nutrients-chart" className="flex-1 min-h-0 focus:outline-none mt-0 relative">
                    <div className="w-full h-full min-h-[340px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeline}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="year" stroke="#64748b" tickLine={false} tick={{ fontSize: 11 }} />
                          <YAxis stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          
                          <Line type="monotone" dataKey="nutrients.C" name="Carbon (C)" stroke="#d97706" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="nutrients.N" name="Nitrogen (N)" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="nutrients.P" name="Phosphorus (P)" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>

                  <TabsContent value="som-pools" className="flex-1 min-h-[340px] focus:outline-none mt-0 relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                      {/* Stacked Carbon Pools */}
                      <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs font-mono text-cyan-200 uppercase tracking-wider mb-2">Soil Organic Carbon Pools (Century Model)</h3>
                          <p className="text-[10px] font-mono text-slate-500 mb-3">Decomposition cycles carbon through active (labile), slow (humic), and passive (humus) pools.</p>
                        </div>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={somData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="year" stroke="#64748b" style={{ fontSize: 9 }} />
                              <YAxis stroke="#64748b" style={{ fontSize: 9 }} />
                              <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#1e293b", fontSize: 10 }} />
                              <Legend wrapperStyle={{ fontSize: 9, fontFamily: "monospace" }} />
                              <Area type="monotone" dataKey="Active" name="Active (Labile)" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
                              <Area type="monotone" dataKey="Slow" name="Slow (Cellular)" stackId="1" stroke="#a16207" fill="#a16207" fillOpacity={0.25} />
                              <Area type="monotone" dataKey="Passive" name="Passive (Humified)" stackId="1" stroke="#78350f" fill="#78350f" fillOpacity={0.25} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Nitrogen Stocks */}
                      <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs font-mono text-cyan-200 uppercase tracking-wider mb-2">Soil Inorganic Nitrogen Stocks</h3>
                          <p className="text-[10px] font-mono text-slate-500 mb-3">Ammonium (NH₄⁺) is mineralized, nitrified to Nitrate (NO₃⁻), or denitrified under hypoxia.</p>
                        </div>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={somData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="year" stroke="#64748b" style={{ fontSize: 9 }} />
                              <YAxis stroke="#64748b" style={{ fontSize: 9 }} />
                              <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#1e293b", fontSize: 10 }} />
                              <Legend wrapperStyle={{ fontSize: 9, fontFamily: "monospace" }} />
                              <Line type="monotone" dataKey="Ammonium" name="Ammonium (NH₄⁺)" stroke="#a78bfa" strokeWidth={2} dot={false} />
                              <Line type="monotone" dataKey="Nitrate" name="Nitrate (NO₃⁻)" stroke="#818cf8" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              {/* Biodiversity Lab Tab */}
              {curriculumTab === "biodiversity" && (
                <div className="flex-1 flex flex-col min-h-0 space-y-4">
                  <div className="mb-2 pb-2 border-b border-cyan-300/15 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-mono font-semibold text-cyan-200 uppercase tracking-wider">Biodiversity & Ecosystem Functioning (BEF) Lab</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Explore Niche Complementarity and the Insurance Effect across 12 manual species.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-y-auto min-h-0">
                    {/* Left: Species Setup & Setup Controls */}
                    <div className="lg:col-span-4 bg-slate-950/40 border border-slate-900 rounded-lg p-4 flex flex-col justify-between space-y-4">
                      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
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
                                  className={`flex items-center gap-2 p-2 border rounded text-xs cursor-pointer hover:bg-slate-900/40 transition ${
                                    isChecked
                                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                                      : "border-slate-800 bg-slate-950/20 text-slate-400"
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
                                    className="accent-emerald-500 rounded"
                                  />
                                  <span className="capitalize">{sp.name}</span>
                                  <span className="ml-auto font-mono text-[9px] text-slate-500">
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
                      <div className="border border-slate-900 bg-slate-950/20 rounded-lg p-3">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                          Gaussian Thermal Niches (Producers)
                        </div>
                        <div className="h-[120px] w-full flex items-end relative overflow-hidden bg-slate-950/80 border border-slate-900/60 rounded px-1">
                          <div className="absolute inset-y-0 left-0 border-r border-slate-900/40 w-full flex justify-between pointer-events-none text-[8px] font-mono text-slate-600 p-1">
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
                        <div className="border border-slate-900 bg-slate-950/20 rounded-lg p-3 flex flex-col">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                            Richness vs. Primary Yield (Biomass)
                          </div>
                          <div className="flex-1 min-h-[160px]">
                            {biodiversityData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={biodiversityData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                  <XAxis dataKey="richness" stroke="#64748b" tick={{ fontSize: 9 }} />
                                  <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                                  <Tooltip contentStyle={{ background: "#020617", borderColor: "#334155", fontSize: 10 }} />
                                  <Line type="monotone" dataKey="yield" name="Yield" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="grid h-full place-items-center text-xs text-slate-600 italic">
                                Run experiment to generate data.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border border-slate-900 bg-slate-950/20 rounded-lg p-3 flex flex-col">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                            Richness vs. Ecosystem Stability (1/CV)
                          </div>
                          <div className="flex-1 min-h-[160px]">
                            {biodiversityData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={biodiversityData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                  <XAxis dataKey="richness" stroke="#64748b" tick={{ fontSize: 9 }} />
                                  <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                                  <Tooltip contentStyle={{ background: "#020617", borderColor: "#334155", fontSize: 10 }} />
                                  <Line type="monotone" dataKey="stability" name="Stability" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="grid h-full place-items-center text-xs text-slate-600 italic">
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
                  <div className="mb-2 pb-2 border-b border-cyan-300/15">
                    <h3 className="text-sm font-mono font-semibold text-cyan-200 uppercase tracking-wider flex items-center gap-2">
                      <Flame className="size-4 text-amber-400" /> Energy Flow & Lindeman&apos;s Efficiency
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Visualize gross primary production, respiratory losses, and 10% trophic transfer efficiency across the food chain. Based on Lindeman (1942).
                    </p>
                  </div>

                  {/* Sankey-style Energy Flow Diagram */}
                  {(() => {
                    const finalPt = timeline[timeline.length - 1];
                    if (!finalPt) return <div className="text-slate-500 text-xs font-mono text-center mt-8">Run a simulation to see energy flows.</div>;
                    
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
                        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-5">
                          <div className="text-xs font-mono text-cyan-300 uppercase tracking-wider mb-4">Energy Pyramid — Year {timeline.length - 1}</div>
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
                          <div className="mt-3 text-[10px] text-slate-500 font-mono text-center">
                            Trophic efficiency T2/T1 = <span className="text-amber-400">{prodBio > 0 ? ((herbBio / prodBio) * 100).toFixed(1) : "N/A"}%</span> · T3/T2 = <span className="text-amber-400">{herbBio > 0 ? ((carnBio / herbBio) * 100).toFixed(1) : "N/A"}%</span>
                          </div>
                        </div>

                        {/* Energy Budget per trophic level */}
                        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-5">
                          <div className="text-xs font-mono text-cyan-300 uppercase tracking-wider mb-4">Energy Budget (Approximate) — Biomass Proxy Units</div>
                          <div className="space-y-3">
                            {rows.map(row => (
                              <div key={row.label} className="space-y-1">
                                <div className="text-[11px] font-mono font-semibold" style={{ color: row.color }}>{row.label}</div>
                                {row.gpp !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className="w-28 text-[9px] font-mono text-slate-500">GPP</span>
                                    <div className="flex-1 bg-slate-900 rounded h-3 overflow-hidden">
                                      <div className="h-full rounded bg-emerald-500/70" style={{ width: barPct(row.gpp) }} />
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-300 w-16 text-right">{row.gpp.toFixed(0)}</span>
                                  </div>
                                )}
                                {row.npp !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className="w-28 text-[9px] font-mono text-slate-500">NPP (net)</span>
                                    <div className="flex-1 bg-slate-900 rounded h-3 overflow-hidden">
                                      <div className="h-full rounded bg-emerald-400/50" style={{ width: barPct(row.npp) }} />
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-300 w-16 text-right">{row.npp.toFixed(0)}</span>
                                  </div>
                                )}
                                {row.resp !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className="w-28 text-[9px] font-mono text-slate-500">Respiration</span>
                                    <div className="flex-1 bg-slate-900 rounded h-3 overflow-hidden">
                                      <div className="h-full rounded bg-rose-500/50" style={{ width: barPct(row.resp) }} />
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-300 w-16 text-right">{row.resp.toFixed(0)}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className="w-28 text-[9px] font-mono text-slate-500">Biomass</span>
                                  <div className="flex-1 bg-slate-900 rounded h-3 overflow-hidden">
                                    <div className="h-full rounded" style={{ width: barPct(row.bio), backgroundColor: row.color + "80" }} />
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-300 w-16 text-right">{row.bio.toFixed(0)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Key Concepts */}
                        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 text-xs font-mono text-slate-400 space-y-2">
                          <div className="text-cyan-300 text-[10px] uppercase tracking-wider mb-2">Key Ecological Principles</div>
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
                <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto">
                  <div className="mb-2 pb-2 border-b border-cyan-300/15">
                    <h3 className="text-sm font-mono font-semibold text-cyan-200 uppercase tracking-wider flex items-center gap-2">
                      <Dna className="size-4 text-violet-400" /> Age-Structured Population Dynamics
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Explore Leslie matrix projections: r/K selection, age-structured demography, reproductive values, and stable age distributions. Used for wildlife management and conservation biology.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Controls */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-4">
                      <div className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider">Life Table Parameters</div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Species Name</label>
                        <input
                          value={leslieSpeciesName}
                          onChange={e => setLeslieSpeciesName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400/50"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Fecundity (m_x) per Age Class</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {leslieFecundity.map((val, i) => (
                            <div key={i} className="flex flex-col items-center gap-0.5">
                              <span className="text-[9px] font-mono text-slate-500">Age {i}</span>
                              <input
                                type="number" step="0.1" min="0" max="10"
                                value={val}
                                onChange={e => {
                                  const newF = [...leslieFecundity];
                                  newF[i] = parseFloat(e.target.value) || 0;
                                  setLeslieFecundity(newF);
                                }}
                                className="w-14 bg-slate-900 border border-emerald-500/20 rounded px-1 py-0.5 text-xs text-emerald-300 font-mono text-center focus:outline-none focus:border-emerald-400"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Survival (s_x) per Age Transition</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {leslieSurvival.map((val, i) => (
                            <div key={i} className="flex flex-col items-center gap-0.5">
                              <span className="text-[9px] font-mono text-slate-500">{i}→{i+1}</span>
                              <input
                                type="number" step="0.05" min="0" max="1"
                                value={val}
                                onChange={e => {
                                  const newS = [...leslieSurvival];
                                  newS[i] = parseFloat(e.target.value) || 0;
                                  setLeslieSurvival(newS);
                                }}
                                className="w-14 bg-slate-900 border border-cyan-500/20 rounded px-1 py-0.5 text-xs text-cyan-300 font-mono text-center focus:outline-none focus:border-cyan-400"
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
                        className="w-full py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 font-mono text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-2"
                      >
                        {isLeslieLoading ? <Loader2 className="size-3 animate-spin" /> : <Dna className="size-3" />}
                        {isLeslieLoading ? "Projecting..." : "Run Leslie Projection"}
                      </button>
                      
                      {/* Preset life tables */}
                      <div className="pt-2 border-t border-slate-900">
                        <div className="text-[10px] font-mono text-slate-500 mb-2 uppercase tracking-wider">Preset Life Tables</div>
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
                              className="text-[10px] font-mono text-slate-400 hover:text-slate-200 px-2 py-1 border border-slate-800 hover:border-slate-700 rounded text-left transition"
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
                        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
                          <div className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider mb-3">Asymptotic Analysis</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className={`p-3 rounded border ${leslieResponse.lambda_dominant > 1 ? "border-emerald-500/30 bg-emerald-500/10" : leslieResponse.lambda_dominant < 1 ? "border-rose-500/30 bg-rose-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                              <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">λ (dominant eigenvalue)</div>
                              <div className={`text-xl font-bold font-mono mt-0.5 ${leslieResponse.lambda_dominant > 1 ? "text-emerald-400" : leslieResponse.lambda_dominant < 1 ? "text-rose-400" : "text-amber-400"}`}>
                                {leslieResponse.lambda_dominant.toFixed(3)}
                              </div>
                              <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                                {leslieResponse.lambda_dominant > 1 ? "Growing (r-selected)" : leslieResponse.lambda_dominant < 1 ? "Declining → Extinction Risk" : "Stable (K boundary)"}
                              </div>
                            </div>
                            <div className="p-3 rounded border border-slate-800 bg-slate-900/40">
                              <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Intrinsic Rate r</div>
                              <div className="text-xl font-bold font-mono mt-0.5 text-violet-400">
                                {Math.log(leslieResponse.lambda_dominant).toFixed(4)}
                              </div>
                              <div className="text-[9px] font-mono text-slate-500 mt-0.5">r = ln(λ)</div>
                            </div>
                          </div>
                          
                          {/* Stable Age Distribution */}
                          <div className="mt-4">
                            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Stable Age Distribution</div>
                            <div className="flex gap-1">
                              {leslieResponse.stable_age_distribution.map((v, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                  <div className="w-full bg-violet-500/20 rounded-sm" style={{ height: `${Math.max(4, v * 100)}px` }} />
                                  <span className="text-[8px] font-mono text-slate-500">{i}</span>
                                  <span className="text-[8px] font-mono text-violet-300">{(v * 100).toFixed(0)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Population Trajectory Chart */}
                        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 h-52">
                          <div className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider mb-2">Population Trajectory — {leslieSpeciesName}</div>
                          <ResponsiveContainer width="100%" height="85%">
                            <LineChart data={leslieResponse.data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                              <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#64748b" }} />
                              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
                              <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 6, fontSize: 11 }} />
                              <Line type="monotone" dataKey="total" stroke="#a78bfa" strokeWidth={2} dot={false} name="Total N" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* Lambda Trajectory */}
                        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 h-40">
                          <div className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider mb-2">Per-Year Growth Rate (λ convergence)</div>
                          <ResponsiveContainer width="100%" height="80%">
                            <LineChart data={leslieResponse.data.slice(1)} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                              <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#64748b" }} />
                              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} domain={["auto", "auto"]} />
                              <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 6, fontSize: 11 }} />
                              <ReferenceLine y={1.0} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1} label={{ value: "λ=1", fill: "#f43f5e", fontSize: 9 }} />
                              <Line type="monotone" dataKey="growth_rate" stroke="#06b6d4" strokeWidth={1.5} dot={false} name="λ(t)" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-8 flex flex-col items-center justify-center gap-3 text-slate-500">
                        <Dna className="size-10 text-slate-700" />
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
                      <div key={card.title} className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                        <div className="font-mono text-[11px] text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                          <span>{card.icon}</span> {card.title}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{card.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Climate Futures Tab */}
              {curriculumTab === "climate" && (
                <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto">
                  <div className="mb-2 pb-2 border-b border-cyan-300/15">
                    <h3 className="text-sm font-mono font-semibold text-cyan-200 uppercase tracking-wider flex items-center gap-2">
                      <Thermometer className="size-4 text-rose-400" /> Climate Change Ecology — RCP Scenarios
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
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
                            : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
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
                        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
                          <div className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider mb-2">Global Mean Temperature Anomaly (°C above 1986–2005 baseline)</div>
                          <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#64748b" }} />
                                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} domain={[0, 5]} />
                                <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11 }} />
                                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
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
                        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
                          <div className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider mb-3">Ecological Tipping Points under {rcpScenario.toUpperCase().replace("RCP","RCP ")}</div>
                          <div className="space-y-2">
                            {impacts.map(impact => (
                              <div
                                key={impact.threshold}
                                className={`flex items-center gap-3 p-2 rounded border transition-all ${
                                  finalDelta >= impact.threshold
                                    ? "border-rose-500/40 bg-rose-500/10"
                                    : "border-slate-800 bg-slate-900/20 opacity-50"
                                }`}
                              >
                                <span className="text-lg">{impact.icon}</span>
                                <div className="flex-1">
                                  <span className="text-[10px] font-mono text-slate-300">{impact.label}</span>
                                </div>
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${finalDelta >= impact.threshold ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-500"}`}>
                                  +{impact.threshold}°C
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Simulate warming */}
                        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
                          <div className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider mb-3">Apply to Current Simulation</div>
                          <p className="text-[10px] text-slate-400 mb-3">
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
                  <div className="mb-2 pb-2 border-b border-cyan-300/15">
                    <h3 className="text-sm font-mono font-semibold text-cyan-200 uppercase tracking-wider">Anthropogenic Stressors & Global Change</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Model heavy metal bioaccumulation, eutrophication hypoxic dead zones, and global temperature shifts.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Eutrophication Trigger */}
                    <div className={`p-4 border rounded-lg transition-all ${
                      eutrophicationPulse 
                        ? "border-amber-500/25 bg-amber-500/5" 
                        : "border-slate-800 bg-slate-950/20"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-mono font-bold text-slate-200">Eutrophication Pulse</h4>
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
                      <p className="text-[10px] text-slate-400 leading-4">
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
                        : "border-slate-800 bg-slate-950/20"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-mono font-bold text-slate-200">Climate Warming Rate</h4>
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
                        className="w-full accent-rose-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer mb-2"
                      />
                      <p className="text-[10px] text-slate-400 leading-4">
                        Drifts ambient temperature upward over the 30-year simulation. Pushes species away from their Gaussian thermal fitness optima, causing metabolic stress.
                      </p>
                    </div>

                    {/* Heavy Metal Mercury Influx */}
                    <div className={`p-4 border rounded-lg transition-all ${
                      toxinInfluxRate > 0 
                        ? "border-lime-500/25 bg-lime-500/5" 
                        : "border-slate-800 bg-slate-950/20"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-mono font-bold text-slate-200">Mercury Influx (Hg)</h4>
                        <span className="text-xs font-mono text-lime-400">+{toxinInfluxRate.toFixed(2)} units/yr</span>
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
                        className="w-full accent-lime-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer mb-2"
                      />
                      <p className="text-[10px] text-slate-400 leading-4">
                        Introduces a persistent neurotoxin (Methylmercury). Absorbed by producers and biomagnified by a factor of 1.5x up the food chain, driving top-down predator crash.
                      </p>
                    </div>
                  </div>

                  {/* Telemetry charts for stressors */}
                  <div className="border border-slate-900 bg-slate-950/40 rounded-lg p-4 flex flex-col min-h-0 flex-1 justify-center items-center py-6 text-center text-slate-500 text-xs italic">
                    <Satellite className="size-8 text-slate-700 mb-2 animate-bounce" />
                    Configure stressor settings above, then go back to the Trophic Dynamics Map or Chart tabs to monitor spatial dead zones and population trajectories!
                  </div>
                </div>
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

            <aside className="rounded-md border border-cyan-300/15 bg-slate-950/72 p-4 backdrop-blur flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                      Socratic Lab Partner
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[9px] font-mono text-cyan-300">
                      <Cpu className="size-3" /> API Core Hydrated
                    </div>
                  </div>
                  <BrainCircuit className="size-5 text-cyan-400" />
                </div>

                <div className="relative border border-slate-800 bg-slate-950/40 rounded p-3 text-[11px] leading-5 font-mono text-slate-300 min-h-[90px]">
                  <Typewriter text={diagnosticText} speed={30} />
                </div>

                <div className="mt-5 space-y-4">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                    Socratic Diagnostics
                  </div>
                  <div className="space-y-3">
                    {analysis.socratic_questions.slice(0, 2).map((q, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-400 hover:text-slate-300 transition">
                        <HelpCircle className="size-4 text-cyan-500/80 shrink-0 mt-0.5" />
                        <span className="leading-5">{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-900 pt-4 mt-6">
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                  <span className="text-slate-500">Academic Status:</span>
                  <span className="text-cyan-300 font-bold">{passedCount} / {totalLabs} Certified</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-cyan-400 h-full transition-all duration-500" 
                    style={{ width: `${(passedCount / totalLabs) * 100}%` }}
                  />
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>

      {/* Lab Challenges Drawer */}
      <AnimatePresence>
        {selectedLab && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLab(null)}
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.35 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-cyan-300/15 bg-slate-950/95 p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between"
            >
              <div className="flex flex-col gap-6 overflow-y-auto flex-1 pr-1">
                <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="size-5 text-emerald-400" />
                    <span className="font-mono text-sm font-semibold text-slate-200">Lab Missions Drawer</span>
                  </div>
                  <button onClick={() => setSelectedLab(null)} className="p-1.5 rounded hover:bg-white/5 text-slate-400 hover:text-slate-200 transition">
                    <X className="size-4" />
                  </button>
                </div>

                {/* Lab Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Active Challenge</label>
                  <select
                    value={selectedLab}
                    onChange={(e) => {
                      const lab = e.target.value;
                      setSelectedLab(lab);
                      startLab(lab);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-sm text-cyan-200 font-mono focus:outline-none"
                  >
                    <option value="may-stability">1. May&apos;s Complexity Paradox</option>
                    <option value="competitive">2. Competitive Exclusion</option>
                    <option value="rescue">3. Metapopulation Rescue</option>
                    <option value="eutrophication">4. Eutrophication Dead Zones</option>
                    <option value="climate-toxins">5. Climate shifts & Biomagnification</option>
                    <option value="physiology-wue">6. Canopy Physiology & WUE</option>
                    <option value="lake-hysteresis">7. Shallow Lake Hysteresis</option>
                    <option value="som-kinetics">8. Soil Carbon Multi-Pool Kinetics</option>
                  </select>
                </div>

                {/* Lab Details */}
                {selectedLab === "may-stability" && (
                  <div className="space-y-4 text-slate-300 text-xs leading-5">
                    <div>
                      <h4 className="font-semibold text-sm text-cyan-200 mb-1">Robert May&apos;s Complexity Limit</h4>
                      <p className="opacity-90">
                        In 1972, Robert May mathematically proved that complex food webs (high species count S and connectance C) become unstable if interaction strength exceeds a threshold.
                      </p>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 p-3 rounded space-y-2">
                      <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                      <p className="opacity-90">
                        Activate 6 or more species in the Temperate Forest, observe the instability, and reduce the link strength modifier to restore system stability.
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-850 pt-3">
                      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-2">Progress Checklist</div>
                      {[
                        [`Activate at least 6 species (${labEvaluations.may.activeCount}/6)`, labEvaluations.may.cond1],
                        ["Set Interspecific Link Strength <= 0.6", labEvaluations.may.cond3],
                        ["Coexistence stable (All Eigenvalues Re < 0)", labEvaluations.may.cond2],
                      ].map(([lbl, active], i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className={`size-4 ${active ? "text-emerald-400" : "text-slate-700"}`} />
                          <span className={active ? "text-slate-200" : "text-slate-500"}>{lbl as string}</span>
                        </div>
                      ))}
                    </div>

                    {labEvaluations.may.success && (
                      <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                        🎉 Checklist completed! You can now take the assessment quiz below to earn your certification.
                      </div>
                    )}

                    {labEvaluations.may.success && renderQuiz("may-stability", [
                      {
                        q: "What happens to a complex food web as interspecific link strength increases?",
                        opts: [
                          "It stabilizes and reaches a higher equilibrium.",
                          "It destabilizes and causes population oscillations or extinctions.",
                          "Carrying capacity rises due to mutual assistance."
                        ],
                        ans: 1
                      },
                      {
                        q: "According to Robert May's stability theorem, what is the correct boundary condition?",
                        opts: [
                          "sigma * sqrt(S * C) < 1",
                          "S * C > 10",
                          "sigma * r_i > 1"
                        ],
                        ans: 0
                      },
                      {
                        q: "What type of interaction strengths are crucial for maintaining stability in highly connected webs?",
                        opts: [
                          "Extremely strong and dominant predator-prey couplings.",
                          "Weak interspecific links that cushion fluctuations.",
                          "Purely mutualistic interactions."
                        ],
                        ans: 1
                      }
                    ])}
                  </div>
                )}

                {selectedLab === "competitive" && (
                  <div className="space-y-4 text-slate-300 text-xs leading-5">
                    <div>
                      <h4 className="font-semibold text-sm text-cyan-200 mb-1">Competitive Exclusion Principle</h4>
                      <p className="opacity-90">
                        Gause&apos;s Law states that two species competing for the exact same limiting resource cannot coexist. One will eventually dominate, forcing the other to extinction.
                      </p>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 p-3 rounded space-y-2">
                      <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                      <p className="opacity-90">
                        Observe Gause&apos;s Law. With both Rabbits and Deer active in the Temperate Forest, simulate their competition for grass until one species is driven to extinction.
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-850 pt-3">
                      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-2">Progress Checklist</div>
                      {[
                        ["Select Temperate Forest biome", biome === "forest"],
                        ["Activate both Rabbits and Deer", labEvaluations.comp.cond1],
                        ["Simulate competitive exclusion (Rabbits or Deer density < 5.0)", labEvaluations.comp.cond2],
                      ].map(([lbl, active], i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className={`size-4 ${active ? "text-emerald-400" : "text-slate-700"}`} />
                          <span className={active ? "text-slate-200" : "text-slate-500"}>{lbl as string}</span>
                        </div>
                      ))}
                    </div>

                    {labEvaluations.comp.success && (
                      <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                        🎉 Checklist completed! You can now take the assessment quiz below to earn your certification.
                      </div>
                    )}

                    {labEvaluations.comp.success && renderQuiz("competitive", [
                      {
                        q: "What does Gause's Competitive Exclusion Principle state?",
                        opts: [
                          "Competitors always coexist in stable numbers.",
                          "Two species competing for the exact same limiting resource cannot coexist.",
                          "Predators always eliminate resource competition."
                        ],
                        ans: 1
                      },
                      {
                        q: "Under Liebig's Law of the Minimum, how is growth rate scaled?",
                        opts: [
                          "By the sum of all nutrients in the environment.",
                          "By the concentration of the scarcest limiting resource.",
                          "By the ambient temperature alone."
                        ],
                        ans: 1
                      },
                      {
                        q: "How can two competing species avoid exclusion in a natural setting?",
                        opts: [
                          "Niche differentiation or resource partitioning.",
                          "Sharing the exact same thermal optimum.",
                          "Increasing their intraspecific competition."
                        ],
                        ans: 0
                      }
                    ])}
                  </div>
                )}

                {selectedLab === "rescue" && (
                  <div className="space-y-4 text-slate-300 text-xs leading-5">
                    <div>
                      <h4 className="font-semibold text-sm text-cyan-200 mb-1">Source-Sink Metapopulations</h4>
                      <p className="opacity-90">
                        Metapopulations exist across fragmented patches. High-quality habitat &ldquo;sources&rdquo; supply excess individuals that disperse and rescue populations in low-quality &ldquo;sinks&rdquo; which would otherwise go extinct.
                      </p>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 p-3 rounded space-y-2">
                      <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                      <p className="opacity-90">
                        The right-side sink of the grid (X &ge; 5) is separated by a highway barrier. Build a wildlife overpass (corridor) to rescue the sink from complete extinction.
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-850 pt-3">
                      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-2">Progress Checklist</div>
                      {[
                        ["Simulate dry/fragmented habitat", controls.rainfall < 400],
                        ["Place Wildlife Corridor (Click column 4 or 5 at any row)", labEvaluations.rescue.cond1],
                        ["Rescue sink consumers (Right-side consumers > 10.0)", labEvaluations.rescue.cond2],
                      ].map(([lbl, active], i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className={`size-4 ${active ? "text-emerald-400" : "text-slate-700"}`} />
                          <span className={active ? "text-slate-200" : "text-slate-500"}>{lbl as string}</span>
                        </div>
                      ))}
                    </div>

                    {labEvaluations.rescue.success && (
                      <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                        🎉 Checklist completed! You can now take the assessment quiz below to earn your certification.
                      </div>
                    )}

                    {labEvaluations.rescue.success && renderQuiz("rescue", [
                      {
                        q: "In source-sink dynamics, how is a sink patch defined?",
                        opts: [
                          "A high-quality habitat with positive net reproduction.",
                          "A low-quality habitat where local mortality exceeds reproduction.",
                          "An isolated patch with zero migration."
                        ],
                        ans: 1
                      },
                      {
                        q: "What is the 'Rescue Effect' in metapopulation theory?",
                        opts: [
                          "Predators rescuing prey from starvation.",
                          "Immigration from a source patch preventing local extinction in a sink patch.",
                          "Human conservationists artificial feeding."
                        ],
                        ans: 1
                      },
                      {
                        q: "How do wildlife corridors influence metapopulation survival?",
                        opts: [
                          "By increasing fragmentation.",
                          "By restoring connectivity and enabling the rescue effect.",
                          "By raising predator efficiency."
                        ],
                        ans: 1
                      }
                    ])}
                  </div>
                )}

                {selectedLab === "eutrophication" && (
                  <div className="space-y-4 text-slate-300 text-xs leading-5">
                    <div>
                      <h4 className="font-semibold text-sm text-cyan-200 mb-1">4. Eutrophication & Hypoxic Dead Zones</h4>
                      <p className="opacity-90">
                        Agricultural nutrient runoff (N & P) causes explosions in primary producers (algal blooms). As this biomass dies, decomposers consume oxygen, creating hypoxic dead zones.
                      </p>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 p-3 rounded space-y-2">
                      <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                      <p className="opacity-90">
                        Enable Eutrophication runoff. Run the simulation and observe the algal bloom in Year 1 followed by hypoxic dead zones (shaded cell overlays) and consumer suffocation.
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-850 pt-3">
                      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-2">Progress Checklist</div>
                      {[
                        ["Enable Eutrophication Pulse setting", labEvaluations.eutroph.pulse],
                        ["Observe primary producer bloom (>400 units in a cell)", labEvaluations.eutroph.bloom],
                        ["Detect hypoxic dead zones (flashing gray cells)", labEvaluations.eutroph.hypoxia],
                      ].map(([lbl, active], i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className={`size-4 ${active ? "text-emerald-400" : "text-slate-700"}`} />
                          <span className={active ? "text-slate-200" : "text-slate-500"}>{lbl as string}</span>
                        </div>
                      ))}
                    </div>

                    {labEvaluations.eutroph.success && (
                      <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                        🎉 Checklist completed! You can now take the assessment quiz below to earn your certification.
                      </div>
                    )}

                    {labEvaluations.eutroph.success && renderQuiz("eutrophication", [
                      {
                        q: "What primary trigger initiates eutrophication in aquatic ecosystems?",
                        opts: [
                          "Heavy metal toxicity.",
                          "High Nitrogen and Phosphorus nutrient pulses from agricultural runoff.",
                          "Depletion of carbon dioxide."
                        ],
                        ans: 1
                      },
                      {
                        q: "What causes the hypoxia (oxygen depletion) in eutrophication dead zones?",
                        opts: [
                          "Algae breathing too much oxygen.",
                          "Microbial decomposers consuming oxygen as they break down dead algal blooms.",
                          "Direct evaporation of oxygen by heat."
                        ],
                        ans: 1
                      },
                      {
                        q: "What is the biological impact of hypoxic conditions on consumer species?",
                        opts: [
                          "They grow larger and reproduce faster.",
                          "They experience catastrophic mortality due to suffocation.",
                          "They switch to feeding on Nitrogen."
                        ],
                        ans: 1
                      }
                    ])}
                  </div>
                )}

                {selectedLab === "climate-toxins" && (
                  <div className="space-y-4 text-slate-300 text-xs leading-5">
                    <div>
                      <h4 className="font-semibold text-sm text-cyan-200 mb-1">5. Climate warming & Biomagnification</h4>
                      <p className="opacity-90">
                        Methylmercury (Hg) bioaccumulates in producers and biomagnifies up trophic levels. Climate warming drifts push species out of their thermal niche bounds.
                      </p>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 p-3 rounded space-y-2">
                      <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                      <p className="opacity-90">
                        Trigger climate warming rate &ge; 0.2°C/yr and toxin influx &ge; 0.1 units/yr. Monitor bioaccumulation and observe the apex predator crash in later years.
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-850 pt-3">
                      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-2">Progress Checklist</div>
                      {[
                        ["Enable Climate Warming rate >= 0.2°C/yr", labEvaluations.climate.warming],
                        ["Set Toxin Influx rate >= 0.1 units/yr", labEvaluations.climate.toxic],
                        ["Accumulate toxin in cells (>0.5 units concentration)", labEvaluations.climate.bioconc],
                      ].map(([lbl, active], i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className={`size-4 ${active ? "text-emerald-400" : "text-slate-700"}`} />
                          <span className={active ? "text-slate-200" : "text-slate-500"}>{lbl as string}</span>
                        </div>
                      ))}
                    </div>

                    {labEvaluations.climate.success && (
                      <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                        🎉 Checklist completed! You can now take the assessment quiz below to earn your certification.
                      </div>
                    )}

                    {labEvaluations.climate.success && renderQuiz("climate-toxins", [
                      {
                        q: "How does Methylmercury (Hg) accumulate and concentrate up a trophic food chain?",
                        opts: [
                          "It dissipates at each trophic step due to metabolic waste.",
                          "It bioaccumulates in producers and biomagnifies up trophic levels because consumers cannot excrete it.",
                          "It only affects plant roots."
                        ],
                        ans: 1
                      },
                      {
                        q: "Which trophic level experiences the highest concentration of toxic heavy metals?",
                        opts: [
                          "Primary producers.",
                          "Herbivores.",
                          "Apex predators."
                        ],
                        ans: 2
                      },
                      {
                        q: "How does climate warming affect species growth under Gaussian thermal niche models?",
                        opts: [
                          "It increases growth rates of all species uniformly.",
                          "It shifts temperature away from species optima, reducing fitness and survival.",
                          "It has no impact on growth."
                        ],
                        ans: 1
                      }
                    ])}
                  </div>
                )}

                {selectedLab === "physiology-wue" && (
                  <div className="space-y-4 text-slate-300 text-xs leading-5">
                    <div>
                      <h4 className="font-semibold text-sm text-cyan-200 mb-1">Canopy Physiology & WUE</h4>
                      <p className="opacity-90">
                        Plants adapt to drought/heat by choosing C4 or CAM pathways. This optimizes stomatal conductance and water-use efficiency (WUE).
                      </p>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 p-3 rounded space-y-2">
                      <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                      <p className="opacity-90">
                        Set Wild Grass photosynthetic pathway to C4 or CAM under temperature &gt;= 30°C to restrict stomatal conductance water loss.
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-850 pt-3">
                      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-2">Progress Checklist</div>
                      {[
                        [`Grass photosynthetic pathway is C4 or CAM (${labEvaluations.phys.path})`, labEvaluations.phys.cond1],
                        [`Maintain high temperature stress >= 30°C (${controls.temperature}°C)`, labEvaluations.phys.cond2],
                      ].map(([lbl, active], i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className={`size-4 ${active ? "text-emerald-400" : "text-slate-700"}`} />
                          <span className={active ? "text-slate-200" : "text-slate-500"}>{lbl as string}</span>
                        </div>
                      ))}
                    </div>

                    {labEvaluations.phys.success && (
                      <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                        🎉 Checklist completed! Take the quiz below to pass the physiology course.
                      </div>
                    )}

                    {labEvaluations.phys.success && renderQuiz("physiology-wue", [
                      {
                        q: "Which enzyme captures CO₂ in C4 plants mesophyll cells?",
                        opts: [
                          "RuBisCO",
                          "PEP Carboxylase",
                          "Carbonic Anhydrase"
                        ],
                        ans: 1
                      },
                      {
                        q: "How does CAM photosynthesis conserve water?",
                        opts: [
                          "By storing water directly inside the stomata.",
                          "By fixing CO₂ temporally at night to minimize daytime transpiration.",
                          "By performing respiration without stomatal conductance."
                        ],
                        ans: 1
                      }
                    ])}
                  </div>
                )}

                {selectedLab === "lake-hysteresis" && (
                  <div className="space-y-4 text-slate-300 text-xs leading-5">
                    <div>
                      <h4 className="font-semibold text-sm text-cyan-200 mb-1">Shallow Lake Phosphorus Hysteresis</h4>
                      <p className="opacity-90">
                        Alternative stable states demonstrate that an ecosystem can have multiple stable equilibria under identical nutrient conditions.
                      </p>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 p-3 rounded space-y-2">
                      <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                      <p className="opacity-90">
                        Initiate the phosphorus loading loop and calculate the forward and backward lake equilibria.
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-850 pt-3">
                      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-2">Progress Checklist</div>
                      {[
                        ["Trigger the lake loading loop experiment", labEvaluations.hyst.cond1],
                      ].map(([lbl, active], i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className={`size-4 ${active ? "text-emerald-400" : "text-slate-700"}`} />
                          <span className={active ? "text-slate-200" : "text-slate-500"}>{lbl as string}</span>
                        </div>
                      ))}
                    </div>

                    {labEvaluations.hyst.success && (
                      <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                        🎉 Checklist completed! Take the quiz below to pass the bifurcation course.
                      </div>
                    )}

                    {labEvaluations.hyst.success && renderQuiz("lake-hysteresis", [
                      {
                        q: "What is hysteresis in alternative stable states?",
                        opts: [
                          "The rate of nutrient inflow.",
                          "History-dependent behavior where transition thresholds differ during loading vs recovery.",
                          "The sedimentation rate of phosphorus."
                        ],
                        ans: 1
                      },
                      {
                        q: "What state is a shallow lake in when phosphorus concentration is very high?",
                        opts: [
                          "Macrophyte-dominated (Clear)",
                          "Phytoplankton-dominated (Turbid)",
                          "Benthic-dominated (Anoxic)"
                        ],
                        ans: 1
                      }
                    ])}
                  </div>
                )}

                {selectedLab === "som-kinetics" && (
                  <div className="space-y-4 text-slate-300 text-xs leading-5">
                    <div>
                      <h4 className="font-semibold text-sm text-cyan-200 mb-1">Soil Carbon Multi-Pool Kinetics</h4>
                      <p className="opacity-90">
                        Decomposition cycles organic carbon through labile (active), slow, and passive pools under microbial stoichiometry.
                      </p>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 p-3 rounded space-y-2">
                      <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                      <p className="opacity-90">
                        Simulate the decomposition loop and accumulate active or slow soil organic carbon in cells.
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-850 pt-3">
                      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-2">Progress Checklist</div>
                      {[
                        [`Accumulate Active/Slow soil carbon pools (>15 total units avg)`, labEvaluations.soil.cond1],
                      ].map(([lbl, active], i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className={`size-4 ${active ? "text-emerald-400" : "text-slate-700"}`} />
                          <span className={active ? "text-slate-200" : "text-slate-500"}>{lbl as string}</span>
                        </div>
                      ))}
                    </div>

                    {labEvaluations.soil.success && (
                      <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                        🎉 Checklist completed! Take the quiz below to pass the soil biogeochemistry course.
                      </div>
                    )}

                    {labEvaluations.soil.success && renderQuiz("som-kinetics", [
                      {
                        q: "In Century-style models, which pool has the fastest decay rate?",
                        opts: [
                          "Active/Labile Pool",
                          "Slow/Cellular Pool",
                          "Passive/Recalcitrant Pool"
                        ],
                        ans: 0
                      },
                      {
                        q: "Under what condition is Denitrification enhanced?",
                        opts: [
                          "High oxygen concentrations.",
                          "Saturated, anoxic/hypoxic soils.",
                          "Very low temperature."
                        ],
                        ans: 1
                      }
                    ])}
                  </div>
                )}

                {passedCount === totalLabs && (
                  <div className="bg-emerald-500/15 border border-emerald-400/40 p-3.5 rounded-lg text-emerald-300 font-mono text-[10px] uppercase tracking-wider text-center flex flex-col gap-2 mt-4">
                    <span>🎓 All labs certified! Curriculum Complete!</span>
                    <button 
                      onClick={() => {
                        alert("🎓 ECOCHAIN-AI LMS CERTIFICATE OF COMPLETION\n\nStudent has successfully passed all 8 university-level ecology laboratory examinations:\n1. Robert May's Complexity Limit (Certified)\n2. Gause's Competitive Exclusion (Certified)\n3. Metapopulation Source-Sink Connectivity (Certified)\n4. Eutrophication Algal Blooms & Hypoxia (Certified)\n5. Climate Warming & Methylmercury Biomagnification (Certified)\n6. Canopy Physiology & Water Use Efficiency (Certified)\n7. Shallow Lake Phosphorus Hysteresis (Certified)\n8. Soil Organic Carbon & Century Kinetics (Certified)\n\nGPA: 4.0 / 4.0\nEcosystemAI Registrar.");
                      }}
                      className="px-2 py-1 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 rounded transition"
                    >
                      Download Transcript
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-850 pt-4 flex gap-2">
                <button
                  onClick={() => startLab(selectedLab)}
                  className="flex-1 text-center font-mono text-xs uppercase tracking-wider border border-slate-700 hover:border-cyan-300/45 rounded py-2 hover:bg-white/5 text-slate-300 transition"
                >
                  Restart Mission
                </button>
                <button
                  onClick={() => setSelectedLab(null)}
                  className="flex-1 text-center font-mono text-xs uppercase tracking-wider bg-slate-900 border border-slate-850 rounded py-2 text-slate-400 hover:text-slate-200 transition"
                >
                  Close Drawer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
