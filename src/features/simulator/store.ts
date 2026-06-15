import { create } from "zustand";
import { DataPoint, CoachAnalysis, StabilityAnalysis, SpeciesConfig } from "./types";
import { defaultSpecies, defaultControls } from "./presets";

interface SimulationState {
  // Core simulation
  controls: any; // Using any for simplicity here, type properly later if needed
  biome: string;
  species: SpeciesConfig[];
  linkStrength: number;
  corridorY: number | null;
  activePreset: string;
  timeline: DataPoint[];
  analysis: CoachAnalysis | null;
  stability: StabilityAnalysis | null;
  isLoading: boolean;
  error: string | null;

  // Playback
  currentYear: number;
  isPlaying: boolean;

  // Spatial
  selectedCell: { x: number; y: number } | null;
  hoveredCell: any | null;

  // Anthropogenic Stressors
  eutrophicationPulse: boolean;
  climateWarmingRate: number;
  toxinInfluxRate: number;

  // Spatial Disturbance
  disturbanceType: "fire" | "logging" | "grazing" | "None";
  disturbanceCells: number[][];
  selectedTool: "fire" | "logging" | "grazing" | "None";

  // Curriculum
  curriculumTab: string;
  setCurriculumTab: (tab: string) => void;
  startLab: (labId: string) => void;

  // Lab challenges
  selectedLab: string | null;
  quizAnswers: Record<string, Record<number, number>>;
  quizSubmitted: Record<string, boolean>;
  quizPassed: Record<string, boolean>;

  // Actions
  setBiome: (biome: string) => void;
  setControls: (controls: any) => void;
  setSpecies: (species: SpeciesConfig[]) => void;
  setLinkStrength: (strength: number) => void;
  setCorridorY: (y: number | null) => void;
  setActivePreset: (preset: string) => void;
  setTimeline: (timeline: DataPoint[]) => void;
  setAnalysis: (analysis: CoachAnalysis | null) => void;
  setStability: (stability: StabilityAnalysis | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentYear: (year: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setSelectedCell: (cell: { x: number; y: number } | null) => void;
  setHoveredCell: (cell: any | null) => void;
  setEutrophicationPulse: (pulse: boolean) => void;
  setClimateWarmingRate: (rate: number) => void;
  setToxinInfluxRate: (rate: number) => void;
  setDisturbanceType: (type: "fire" | "logging" | "grazing" | "None") => void;
  setDisturbanceCells: (cells: number[][]) => void;
  setSelectedTool: (tool: "fire" | "logging" | "grazing" | "None") => void;
  setSelectedLab: (lab: string | null) => void;
  setQuizAnswers: (answers: Record<string, Record<number, number>>) => void;
  setQuizSubmitted: (submitted: Record<string, boolean>) => void;
  setQuizPassed: (passed: Record<string, boolean>) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  controls: {
    ...defaultControls,
    co2: 420.0,
    relative_humidity: 65.0,
    light_intensity: 800.0,
  },
  biome: "forest",
  species: JSON.parse(JSON.stringify(defaultSpecies.forest)),
  linkStrength: 1.0,
  corridorY: null,
  activePreset: "default",
  timeline: [],
  analysis: null,
  stability: null,
  isLoading: false,
  error: null,
  
  currentYear: 0,
  isPlaying: false,

  selectedCell: null,
  hoveredCell: null,

  eutrophicationPulse: false,
  climateWarmingRate: 0.0,
  toxinInfluxRate: 0.0,

  disturbanceType: "None",
  disturbanceCells: [],
  selectedTool: "None",

  curriculumTab: "trophic",

  selectedLab: null,
  quizAnswers: {},
  quizSubmitted: {},
  quizPassed: {},

  setBiome: (biome) => set({ biome }),
  setControls: (controls) => set({ controls }),
  setSpecies: (species) => set({ species }),
  setLinkStrength: (linkStrength) => set({ linkStrength }),
  setCorridorY: (corridorY) => set({ corridorY }),
  setActivePreset: (activePreset) => set({ activePreset }),
  setTimeline: (timeline) => set({ timeline }),
  setAnalysis: (analysis) => set({ analysis }),
  setStability: (stability) => set({ stability }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setCurrentYear: (currentYear) => set({ currentYear }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setSelectedCell: (selectedCell) => set({ selectedCell }),
  setHoveredCell: (hoveredCell) => set({ hoveredCell }),
  setEutrophicationPulse: (eutrophicationPulse) => set({ eutrophicationPulse }),
  setClimateWarmingRate: (climateWarmingRate) => set({ climateWarmingRate }),
  setToxinInfluxRate: (toxinInfluxRate) => set({ toxinInfluxRate }),
  setDisturbanceType: (disturbanceType) => set({ disturbanceType }),
  setDisturbanceCells: (disturbanceCells) => set({ disturbanceCells }),
  setSelectedTool: (selectedTool) => set({ selectedTool }),
  setCurriculumTab: (curriculumTab) => set({ curriculumTab }),
  setSelectedLab: (selectedLab) => set({ selectedLab }),
  startLab: (labId) => {
    // Basic placeholder implementation for startLab to compile
    set({ selectedLab: labId });
  },
  setQuizAnswers: (quizAnswers) => set({ quizAnswers }),
  setQuizSubmitted: (quizSubmitted) => set({ quizSubmitted }),
  setQuizPassed: (quizPassed) => set({ quizPassed }),
}));
