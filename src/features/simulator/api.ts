import type { SimulationResponse, SimulatorControls, SpeciesConfig, BiodiversityLabPoint, HysteresisPoint, LeslieMatrixPoint, LeslieMatrixResponse } from "./types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  return headers;
}

export async function fetchSimulation(
  controls: SimulatorControls,
  biome: string,
  species: SpeciesConfig[],
  linkStrength: number,
  corridorY: number | null,
  presetId?: string,
  eutrophicationPulse: boolean = false,
  climateWarmingRate: number = 0.0,
  toxinInfluxRate: number = 0.0,
  disturbanceType: "fire" | "logging" | "grazing" | "None" = "None",
  disturbanceCells: number[][] = [],
): Promise<SimulationResponse> {
  const response = await fetch(`${apiBaseUrl}/simulate`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      biome,
      species,
      link_strength: linkStrength,
      corridor_y: corridorY,
      abiotic_factors: {
        rainfall: controls.rainfall,
        temperature: controls.temperature,
        nitrogen: controls.nitrogen,
        co2: controls.co2 ?? 420.0,
        relative_humidity: controls.relative_humidity ?? 65.0,
        light_intensity: controls.light_intensity ?? 800.0,
      },
      preset_id: presetId,
      eutrophication_pulse: eutrophicationPulse,
      climate_warming_rate: climateWarmingRate,
      toxin_influx_rate: toxinInfluxRate,
      disturbance_type: disturbanceType,
      disturbance_cells: disturbanceCells,
    }),
  });

  if (!response.ok) {
    throw new Error(`Simulation request failed with ${response.status}`);
  }

  return response.json() as Promise<SimulationResponse>;
}

export async function fetchBiodiversityExperiment(
  biome: string,
  speciesIds: string[]
): Promise<BiodiversityLabPoint[]> {
  const response = await fetch(`${apiBaseUrl}/simulate/biodiversity`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      biome,
      species_ids: speciesIds,
    }),
  });

  if (!response.ok) {
    throw new Error(`Biodiversity experiment request failed with ${response.status}`);
  }

  const data = await response.json();
  return data.data as BiodiversityLabPoint[];
}

export async function fetchHysteresisExperiment(
  biome: string,
  inflowRange: number[] = []
): Promise<HysteresisPoint[]> {
  const response = await fetch(`${apiBaseUrl}/simulate/hysteresis`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      biome,
      inflow_range: inflowRange,
    }),
  });

  if (!response.ok) {
    throw new Error(`Hysteresis experiment request failed with ${response.status}`);
  }

  const data = await response.json();
  return data.data as HysteresisPoint[];
}

export async function fetchLeslieProjection(
  speciesName: string,
  fecundity: number[],
  survival: number[],
  initialDistribution: number[],
  years: number = 30
): Promise<LeslieMatrixResponse> {
  const response = await fetch(`${apiBaseUrl}/simulate/leslie`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      species_name: speciesName,
      fecundity,
      survival,
      initial_distribution: initialDistribution,
      years,
    }),
  });

  if (!response.ok) {
    throw new Error(`Leslie matrix projection failed with ${response.status}`);
  }

  return response.json() as Promise<LeslieMatrixResponse>;
}

