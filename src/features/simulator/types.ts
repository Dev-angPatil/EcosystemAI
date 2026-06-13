export type TrophicLevel = "Producer" | "Herbivore" | "Carnivore" | "Apex";

export type SpeciesConfig = {
  id: string;
  name: string;
  trophic_level: TrophicLevel;
  growth_rate: number;
  initial_pop: number;
  active: boolean;
  thermal_optimum?: number;
  niche_width?: number;
  toxin_level?: number;
  photosynthetic_pathway?: "C3" | "C4" | "CAM";
  allee_threshold?: number; // Allee effect depensation threshold
};

export type ComplexNumber = {
  real: number;
  imag: number;
};

export type StabilityAnalysis = {
  jacobian: number[][];
  eigenvalues: ComplexNumber[];
  stable: boolean;
  equilibrium: number[];
};

export type SpeciesKey = "plants" | "rabbits" | "wolves";
export type EcologicalStatus = "Stable" | "Unstable" | "Collapse";

export type SimulatorControls = {
  plants?: number;
  rabbits?: number;
  wolves?: number;
  rainfall: number;
  temperature: number;
  nitrogen: number;
  co2?: number;
  relative_humidity?: number;
  light_intensity?: number;
};

export type GridCell = {
  x: number;
  y: number;
  populations: Record<string, number>;
  nutrients: Record<string, number>;
  toxin_concentration: number;
  hypoxic: boolean;
  // Advanced hydrology & energy
  soil_moisture: number;
  evapotranspiration: number;
  sensible_heat: number;
  latent_heat: number;
  // Advanced soil SOM pools
  som_active_c: number;
  som_slow_c: number;
  som_passive_c: number;
  soil_ammonium: number;
  soil_nitrate: number;
  // Backward compatibility
  plants: number;
  rabbits: number;
  wolves: number;
};

export type DataPoint = {
  year: number;
  cells: GridCell[];
  populations: Record<string, number>;
  nutrients: Record<string, number>;
  // Backward compatibility
  plants: number;
  rabbits: number;
  wolves: number;
};

export type AnomalyName = "Trophic Cascade" | "Competitive Exclusion" | "Eutrophication" | "None";

export type DetectedAnomaly = {
  name: AnomalyName;
  year_of_onset: number;
  description: string;
};

export type CoachAnalysis = {
  ecological_status: EcologicalStatus;
  detected_anomalies: DetectedAnomaly[];
  socratic_questions: string[];
  provider?: "featherless" | "fallback";
};

export type SimulationResponse = {
  timeline: DataPoint[];
  analysis: CoachAnalysis;
  parameters: Record<string, number>;
  stability: StabilityAnalysis;
};

export type BiodiversityLabPoint = {
  richness: number;
  yield: number;
  stability: number;
};

export type HysteresisPoint = {
  inflow: number;
  phosphorus: number;
  state: "Macrophyte (Clear)" | "Phytoplankton (Turbid)";
};

// Leslie Matrix Age-Structured Population Types
export type LeslieMatrixPoint = {
  year: number;
  total: number;
  age_classes: number[];
  growth_rate: number; // lambda = N(t+1)/N(t)
};

export type LeslieMatrixResponse = {
  data: LeslieMatrixPoint[];
  lambda_dominant: number; // asymptotic growth rate (dominant eigenvalue)
  stable_age_distribution: number[];
  reproductive_value: number[];
};
