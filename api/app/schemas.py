from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


EcologicalStatus = Literal["Stable", "Unstable", "Collapse"]
AnomalyName = Literal["Trophic Cascade", "Competitive Exclusion", "Eutrophication", "None"]


class InitialPopulations(BaseModel):
    plants: float = Field(ge=0, le=2000)
    rabbits: float = Field(ge=0, le=1000)
    wolves: float = Field(ge=0, le=500)


class AbioticFactors(BaseModel):
    rainfall: float = Field(ge=0, le=5000)  # Extended for tropical biomes (Amazon ~2400mm/yr)
    temperature: float = Field(ge=-20, le=60)
    nitrogen: float = Field(ge=0, le=150)
    co2: float = Field(default=420.0, ge=150, le=2000)
    relative_humidity: float = Field(default=65.0, ge=0, le=100)
    light_intensity: float = Field(default=800.0, ge=0, le=2000)  # PAR in umol/m2/s


class SpeciesConfig(BaseModel):
    id: str
    name: str
    trophic_level: Literal["Producer", "Herbivore", "Carnivore", "Apex"]
    growth_rate: float
    initial_pop: float
    active: bool
    thermal_optimum: float = 20.0
    niche_width: float = 8.0
    toxin_level: float = 0.0
    photosynthetic_pathway: Literal["C3", "C4", "CAM"] = "C3"
    allee_threshold: float = 0.0  # Population below this suffers Allee effect (depensation)


class ComplexNumber(BaseModel):
    real: float
    imag: float


class StabilityAnalysis(BaseModel):
    jacobian: list[list[float]]
    eigenvalues: list[ComplexNumber]
    stable: bool
    equilibrium: list[float]


class SimulationRequest(BaseModel):
    biome: str = "forest"  # "forest" | "marine" | "desert"
    species: list[SpeciesConfig] = []
    abiotic_factors: AbioticFactors
    link_strength: float = 1.0
    corridor_y: int | None = None
    preset_id: str | None = None
    # Stressors
    eutrophication_pulse: bool = False
    climate_warming_rate: float = 0.0
    toxin_influx_rate: float = 0.0
    # Disturbances
    disturbance_type: Literal["fire", "logging", "grazing", "None"] = "None"
    disturbance_cells: list[list[int]] = []  # List of [x, y] coordinates
    # Backward compatibility
    initial_populations: InitialPopulations | None = None


class GridCell(BaseModel):
    x: int
    y: int
    populations: dict[str, float] = {}
    nutrients: dict[str, float] = {}
    toxin_concentration: float = 0.0
    hypoxic: bool = False
    # Advanced hydrology & energy
    soil_moisture: float = 0.25
    evapotranspiration: float = 0.0
    sensible_heat: float = 0.0
    latent_heat: float = 0.0
    # Advanced soil C/N pools
    som_active_c: float = 100.0
    som_slow_c: float = 500.0
    som_passive_c: float = 1000.0
    soil_ammonium: float = 5.0
    soil_nitrate: float = 2.0
    # Backward compatibility
    plants: float = 0.0
    rabbits: float = 0.0
    wolves: float = 0.0


class GridTimelinePoint(BaseModel):
    year: int
    cells: list[GridCell]
    populations: dict[str, float] = {}
    nutrients: dict[str, float] = {}
    # Backward compatibility
    plants: float = 0.0
    rabbits: float = 0.0
    wolves: float = 0.0


class DetectedAnomaly(BaseModel):
    name: AnomalyName
    year_of_onset: int
    description: str


class CoachAnalysis(BaseModel):
    ecological_status: EcologicalStatus
    detected_anomalies: list[DetectedAnomaly]
    socratic_questions: list[str]
    provider: Literal["featherless", "fallback"] = "fallback"


class SimulationResponse(BaseModel):
    timeline: list[GridTimelinePoint]
    analysis: CoachAnalysis
    parameters: dict[str, float]
    stability: StabilityAnalysis


# Biodiversity Lab Batch Experiment Schemas
class BiodiversityLabRequest(BaseModel):
    biome: str = "forest"
    species_ids: list[str] = []


class BiodiversityLabPoint(BaseModel):
    richness: int
    yield_: float = Field(alias="yield")
    stability: float

    model_config = ConfigDict(populate_by_name=True)


class BiodiversityLabResponse(BaseModel):
    data: list[BiodiversityLabPoint]


# Hysteresis Alternative Stable States Schemas
class HysteresisRequest(BaseModel):
    biome: str = "forest"
    inflow_range: list[float] = []


class HysteresisPoint(BaseModel):
    inflow: float
    phosphorus: float
    state: Literal["Macrophyte (Clear)", "Phytoplankton (Turbid)"]


class HysteresisResponse(BaseModel):
    data: list[HysteresisPoint]


# Leslie Matrix / Age-Structured Population Schemas
class LeslieMatrixRequest(BaseModel):
    species_name: str = "Generic Population"
    # fecundity row (m_x): births per female in each age class
    fecundity: list[float] = [0.0, 0.0, 2.5, 2.0, 1.0]
    # survival probabilities (s_x): fraction surviving to next age class
    survival: list[float] = [0.6, 0.75, 0.80, 0.70]
    # initial age distribution
    initial_distribution: list[float] = [100.0, 60.0, 40.0, 25.0, 10.0]
    # number of years to project
    years: int = 30


class LeslieMatrixPoint(BaseModel):
    year: int
    total: float
    age_classes: list[float]
    growth_rate: float  # instantaneous lambda = N(t+1)/N(t)


class LeslieMatrixResponse(BaseModel):
    data: list[LeslieMatrixPoint]
    lambda_dominant: float  # dominant eigenvalue (long-run growth rate)
    stable_age_distribution: list[float]
    reproductive_value: list[float]

