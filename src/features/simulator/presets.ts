import type { SimulatorControls, SpeciesConfig } from "./types";

export type Preset = {
  id: string;
  label: string;
  signal: string;
  description: string;
  controls: SimulatorControls;
  biome: string;
  linkStrength: number;
};

export const defaultControls: SimulatorControls = {
  rainfall: 720,
  temperature: 19,
  nitrogen: 54,
};

export const defaultSpecies: Record<string, SpeciesConfig[]> = {
  forest: [
    { id: "grass", name: "Wild Grass", trophic_level: "Producer", growth_rate: 0.45, initial_pop: 200, active: true, thermal_optimum: 20, niche_width: 8 },
    { id: "ferns", name: "Forest Ferns", trophic_level: "Producer", growth_rate: 0.35, initial_pop: 150, active: true, thermal_optimum: 16, niche_width: 6 },
    { id: "oak", name: "Oak Canopy", trophic_level: "Producer", growth_rate: 0.30, initial_pop: 100, active: false, thermal_optimum: 18, niche_width: 10 },
    { id: "pine", name: "Scotch Pine", trophic_level: "Producer", growth_rate: 0.25, initial_pop: 80, active: false, thermal_optimum: 12, niche_width: 8 },
    { id: "berries", name: "Wild Berries", trophic_level: "Producer", growth_rate: 0.40, initial_pop: 100, active: false, thermal_optimum: 22, niche_width: 7 },
    { id: "moss", name: "Carpet Moss", trophic_level: "Producer", growth_rate: 0.20, initial_pop: 150, active: false, thermal_optimum: 10, niche_width: 5 },
    { id: "dandelions", name: "Dandelions", trophic_level: "Producer", growth_rate: 0.48, initial_pop: 80, active: false, thermal_optimum: 24, niche_width: 9 },
    { id: "mushrooms", name: "Wild Mushrooms", trophic_level: "Producer", growth_rate: 0.22, initial_pop: 70, active: false, thermal_optimum: 14, niche_width: 5 },
    { id: "clover", name: "Red Clover", trophic_level: "Producer", growth_rate: 0.42, initial_pop: 90, active: false, thermal_optimum: 15, niche_width: 6 },
    { id: "ivy", name: "English Ivy", trophic_level: "Producer", growth_rate: 0.32, initial_pop: 60, active: false, thermal_optimum: 26, niche_width: 8 },
    { id: "birch", name: "Silver Birch", trophic_level: "Producer", growth_rate: 0.28, initial_pop: 50, active: false, thermal_optimum: 13, niche_width: 7 },
    { id: "orchids", name: "Forest Orchids", trophic_level: "Producer", growth_rate: 0.36, initial_pop: 40, active: false, thermal_optimum: 28, niche_width: 5 },
    
    { id: "rabbits", name: "Woodland Rabbits", trophic_level: "Herbivore", growth_rate: -0.12, initial_pop: 90, active: true, thermal_optimum: 20, niche_width: 8 },
    { id: "deer", name: "White-Tailed Deer", trophic_level: "Herbivore", growth_rate: -0.06, initial_pop: 25, active: true, thermal_optimum: 19, niche_width: 9 },
    { id: "insects", name: "Forest Insects", trophic_level: "Herbivore", growth_rate: -0.16, initial_pop: 120, active: true, thermal_optimum: 21, niche_width: 8 },
    { id: "frogs", name: "Tree Frogs", trophic_level: "Carnivore", growth_rate: -0.22, initial_pop: 30, active: true, thermal_optimum: 18, niche_width: 7 },
    { id: "owls", name: "Barred Owls", trophic_level: "Carnivore", growth_rate: -0.18, initial_pop: 15, active: true, thermal_optimum: 20, niche_width: 8 },
    { id: "wolves", name: "Gray Wolves", trophic_level: "Apex", growth_rate: -0.14, initial_pop: 8, active: true, thermal_optimum: 20, niche_width: 10 },
  ],
  marine: [
    { id: "phytoplankton", name: "Phytoplankton", trophic_level: "Producer", growth_rate: 0.55, initial_pop: 250, active: true, thermal_optimum: 18, niche_width: 8 },
    { id: "seaweed", name: "Giant Kelp", trophic_level: "Producer", growth_rate: 0.38, initial_pop: 180, active: true, thermal_optimum: 14, niche_width: 6 },
    { id: "eelgrass", name: "Eelgrass Meadows", trophic_level: "Producer", growth_rate: 0.34, initial_pop: 100, active: false, thermal_optimum: 16, niche_width: 8 },
    { id: "red_algae", name: "Red Algae", trophic_level: "Producer", growth_rate: 0.28, initial_pop: 90, active: false, thermal_optimum: 12, niche_width: 7 },
    { id: "green_algae", name: "Green Sea Lettuce", trophic_level: "Producer", growth_rate: 0.45, initial_pop: 110, active: false, thermal_optimum: 22, niche_width: 7 },
    { id: "diatoms", name: "Benthic Diatoms", trophic_level: "Producer", growth_rate: 0.50, initial_pop: 130, active: false, thermal_optimum: 10, niche_width: 5 },
    { id: "cyanobacteria", name: "Blue-Green Algae", trophic_level: "Producer", growth_rate: 0.48, initial_pop: 80, active: false, thermal_optimum: 26, niche_width: 9 },
    { id: "dinoflagellates", name: "Dinoflagellates", trophic_level: "Producer", growth_rate: 0.52, initial_pop: 70, active: false, thermal_optimum: 20, niche_width: 6 },
    { id: "sargassum", name: "Sargassum Weed", trophic_level: "Producer", growth_rate: 0.40, initial_pop: 100, active: false, thermal_optimum: 24, niche_width: 8 },
    { id: "sea_grapes", name: "Sea Grapes", trophic_level: "Producer", growth_rate: 0.30, initial_pop: 60, active: false, thermal_optimum: 25, niche_width: 7 },
    { id: "coralline", name: "Coralline Algae", trophic_level: "Producer", growth_rate: 0.20, initial_pop: 80, active: false, thermal_optimum: 13, niche_width: 5 },
    { id: "marine_lichens", name: "Intertidal Lichens", trophic_level: "Producer", growth_rate: 0.18, initial_pop: 40, active: false, thermal_optimum: 8, niche_width: 6 },
    
    { id: "zooplankton", name: "Zooplankton", trophic_level: "Herbivore", growth_rate: -0.14, initial_pop: 100, active: true, thermal_optimum: 18, niche_width: 8 },
    { id: "krill", name: "Euphausiid Krill", trophic_level: "Herbivore", growth_rate: -0.16, initial_pop: 140, active: true, thermal_optimum: 16, niche_width: 7 },
    { id: "small_fish", name: "Forage Fish", trophic_level: "Carnivore", growth_rate: -0.20, initial_pop: 60, active: true, thermal_optimum: 18, niche_width: 8 },
    { id: "crabs", name: "Rock Crabs", trophic_level: "Carnivore", growth_rate: -0.12, initial_pop: 35, active: true, thermal_optimum: 15, niche_width: 7 },
    { id: "tuna", name: "Bluefin Tuna", trophic_level: "Carnivore", growth_rate: -0.15, initial_pop: 12, active: true, thermal_optimum: 20, niche_width: 9 },
    { id: "sharks", name: "Reef Sharks", trophic_level: "Apex", growth_rate: -0.11, initial_pop: 5, active: true, thermal_optimum: 21, niche_width: 10 },
  ],
  desert: [
    { id: "cactus", name: "Saguaro Cactus", trophic_level: "Producer", growth_rate: 0.22, initial_pop: 180, active: true, thermal_optimum: 28, niche_width: 10 },
    { id: "shrubs", name: "Creosote Bush", trophic_level: "Producer", growth_rate: 0.28, initial_pop: 200, active: true, thermal_optimum: 24, niche_width: 8 },
    { id: "prickly_pear", name: "Prickly Pear", trophic_level: "Producer", growth_rate: 0.32, initial_pop: 120, active: false, thermal_optimum: 30, niche_width: 9 },
    { id: "mesquite", name: "Mesquite Tree", trophic_level: "Producer", growth_rate: 0.25, initial_pop: 100, active: false, thermal_optimum: 26, niche_width: 8 },
    { id: "marigold", name: "Desert Marigold", trophic_level: "Producer", growth_rate: 0.36, initial_pop: 80, active: false, thermal_optimum: 22, niche_width: 6 },
    { id: "agave", name: "Desert Agave", trophic_level: "Producer", growth_rate: 0.26, initial_pop: 90, active: false, thermal_optimum: 25, niche_width: 8 },
    { id: "joshua_tree", name: "Joshua Tree", trophic_level: "Producer", growth_rate: 0.18, initial_pop: 70, active: false, thermal_optimum: 18, niche_width: 7 },
    { id: "verbena", name: "Sand Verbena", trophic_level: "Producer", growth_rate: 0.38, initial_pop: 80, active: false, thermal_optimum: 20, niche_width: 5 },
    { id: "yucca", name: "Mojave Yucca", trophic_level: "Producer", growth_rate: 0.24, initial_pop: 80, active: false, thermal_optimum: 23, niche_width: 7 },
    { id: "brittlebush", name: "Brittlebush", trophic_level: "Producer", growth_rate: 0.30, initial_pop: 100, active: false, thermal_optimum: 27, niche_width: 8 },
    { id: "sage", name: "Desert Sage", trophic_level: "Producer", growth_rate: 0.28, initial_pop: 60, active: false, thermal_optimum: 16, niche_width: 6 },
    { id: "barrel_cactus", name: "Barrel Cactus", trophic_level: "Producer", growth_rate: 0.20, initial_pop: 70, active: false, thermal_optimum: 32, niche_width: 8 },
    
    { id: "rats", name: "Kangaroo Rats", trophic_level: "Herbivore", growth_rate: -0.08, initial_pop: 80, active: true, thermal_optimum: 23, niche_width: 8 },
    { id: "insects", name: "Desert Locusts", trophic_level: "Herbivore", growth_rate: -0.15, initial_pop: 110, active: true, thermal_optimum: 26, niche_width: 8 },
    { id: "lizards", name: "Whiptail Lizards", trophic_level: "Carnivore", growth_rate: -0.18, initial_pop: 40, active: true, thermal_optimum: 24, niche_width: 7 },
    { id: "scorpions", name: "Bark Scorpions", trophic_level: "Carnivore", growth_rate: -0.14, initial_pop: 30, active: true, thermal_optimum: 25, niche_width: 7 },
    { id: "roadrunners", name: "Roadrunners", trophic_level: "Carnivore", growth_rate: -0.16, initial_pop: 18, active: true, thermal_optimum: 22, niche_width: 8 },
    { id: "coyotes", name: "Desert Coyotes", trophic_level: "Apex", growth_rate: -0.12, initial_pop: 7, active: true, thermal_optimum: 24, niche_width: 10 },
  ],
  // ─────────── TROPICAL RAINFOREST ───────────
  tropical: [
    { id: "canopy_trees", name: "Emergent Canopy Trees", trophic_level: "Producer", growth_rate: 0.32, initial_pop: 220, active: true, thermal_optimum: 27, niche_width: 6 },
    { id: "lianas", name: "Climbing Lianas", trophic_level: "Producer", growth_rate: 0.44, initial_pop: 160, active: true, thermal_optimum: 26, niche_width: 7 },
    { id: "epiphytes", name: "Bromeliad Epiphytes", trophic_level: "Producer", growth_rate: 0.36, initial_pop: 140, active: true, thermal_optimum: 25, niche_width: 5 },
    { id: "palms", name: "Understory Palms", trophic_level: "Producer", growth_rate: 0.28, initial_pop: 110, active: false, thermal_optimum: 28, niche_width: 6 },
    { id: "heliconias", name: "Heliconia Shrubs", trophic_level: "Producer", growth_rate: 0.42, initial_pop: 100, active: false, thermal_optimum: 26, niche_width: 5 },
    { id: "ficus", name: "Strangler Fig", trophic_level: "Producer", growth_rate: 0.38, initial_pop: 80, active: false, thermal_optimum: 27, niche_width: 7 },
    { id: "bamboo", name: "Tropical Bamboo", trophic_level: "Producer", growth_rate: 0.50, initial_pop: 90, active: false, thermal_optimum: 24, niche_width: 8 },
    { id: "orchids_tr", name: "Canopy Orchids", trophic_level: "Producer", growth_rate: 0.30, initial_pop: 60, active: false, thermal_optimum: 25, niche_width: 4 },
    { id: "ferns_tr", name: "Tree Ferns", trophic_level: "Producer", growth_rate: 0.34, initial_pop: 90, active: false, thermal_optimum: 22, niche_width: 6 },
    { id: "mosses_tr", name: "Tropical Mosses", trophic_level: "Producer", growth_rate: 0.22, initial_pop: 120, active: false, thermal_optimum: 22, niche_width: 5 },
    { id: "gingers", name: "Wild Gingers", trophic_level: "Producer", growth_rate: 0.40, initial_pop: 75, active: false, thermal_optimum: 26, niche_width: 5 },
    { id: "cacao", name: "Wild Cacao", trophic_level: "Producer", growth_rate: 0.26, initial_pop: 50, active: false, thermal_optimum: 27, niche_width: 4 },
    { id: "howler_monkey", name: "Howler Monkeys", trophic_level: "Herbivore", growth_rate: -0.08, initial_pop: 60, active: true, thermal_optimum: 26, niche_width: 8 },
    { id: "insects_tr", name: "Canopy Insects", trophic_level: "Herbivore", growth_rate: -0.18, initial_pop: 130, active: true, thermal_optimum: 27, niche_width: 9 },
    { id: "poison_dart_frog", name: "Poison Dart Frogs", trophic_level: "Carnivore", growth_rate: -0.20, initial_pop: 35, active: true, thermal_optimum: 25, niche_width: 5 },
    { id: "harpy_eagle", name: "Harpy Eagles", trophic_level: "Carnivore", growth_rate: -0.14, initial_pop: 10, active: true, thermal_optimum: 26, niche_width: 8 },
    { id: "boa", name: "Boa Constrictors", trophic_level: "Carnivore", growth_rate: -0.16, initial_pop: 18, active: true, thermal_optimum: 28, niche_width: 7 },
    { id: "jaguar", name: "Jaguars", trophic_level: "Apex", growth_rate: -0.10, initial_pop: 5, active: true, thermal_optimum: 26, niche_width: 10 },
  ],
  // ─────────── FRESHWATER LAKE ───────────
  freshwater: [
    { id: "phytoplankton_fw", name: "Phytoplankton", trophic_level: "Producer", growth_rate: 0.58, initial_pop: 240, active: true, thermal_optimum: 20, niche_width: 7 },
    { id: "macrophytes", name: "Aquatic Macrophytes", trophic_level: "Producer", growth_rate: 0.30, initial_pop: 160, active: true, thermal_optimum: 22, niche_width: 8 },
    { id: "periphyton", name: "Periphyton (Algal Mat)", trophic_level: "Producer", growth_rate: 0.48, initial_pop: 120, active: true, thermal_optimum: 18, niche_width: 6 },
    { id: "cyanobacteria_fw", name: "Cyanobacteria Blooms", trophic_level: "Producer", growth_rate: 0.52, initial_pop: 90, active: false, thermal_optimum: 28, niche_width: 9 },
    { id: "duckweed", name: "Duckweed (Lemna)", trophic_level: "Producer", growth_rate: 0.60, initial_pop: 80, active: false, thermal_optimum: 24, niche_width: 8 },
    { id: "waterlily", name: "Water Lilies", trophic_level: "Producer", growth_rate: 0.25, initial_pop: 70, active: false, thermal_optimum: 22, niche_width: 7 },
    { id: "cattails", name: "Cattails (Typha)", trophic_level: "Producer", growth_rate: 0.38, initial_pop: 100, active: false, thermal_optimum: 20, niche_width: 8 },
    { id: "charophytes", name: "Charophyte Algae", trophic_level: "Producer", growth_rate: 0.32, initial_pop: 80, active: false, thermal_optimum: 16, niche_width: 5 },
    { id: "riparian_plants", name: "Riparian Sedges", trophic_level: "Producer", growth_rate: 0.35, initial_pop: 90, active: false, thermal_optimum: 18, niche_width: 6 },
    { id: "submerged_plants", name: "Submerged Pondweeds", trophic_level: "Producer", growth_rate: 0.28, initial_pop: 75, active: false, thermal_optimum: 19, niche_width: 6 },
    { id: "algae_epi", name: "Epilithic Algae", trophic_level: "Producer", growth_rate: 0.45, initial_pop: 65, active: false, thermal_optimum: 15, niche_width: 5 },
    { id: "flagellates", name: "Chrysophyte Flagellates", trophic_level: "Producer", growth_rate: 0.42, initial_pop: 55, active: false, thermal_optimum: 12, niche_width: 4 },
    { id: "zooplankton_fw", name: "Daphnia Zooplankton", trophic_level: "Herbivore", growth_rate: -0.15, initial_pop: 110, active: true, thermal_optimum: 18, niche_width: 7 },
    { id: "invertebrates", name: "Benthic Invertebrates", trophic_level: "Herbivore", growth_rate: -0.12, initial_pop: 80, active: true, thermal_optimum: 16, niche_width: 6 },
    { id: "roach", name: "Roach / Bream", trophic_level: "Carnivore", growth_rate: -0.18, initial_pop: 50, active: true, thermal_optimum: 20, niche_width: 8 },
    { id: "perch", name: "Perch", trophic_level: "Carnivore", growth_rate: -0.15, initial_pop: 35, active: true, thermal_optimum: 18, niche_width: 7 },
    { id: "heron", name: "Grey Herons", trophic_level: "Carnivore", growth_rate: -0.14, initial_pop: 12, active: true, thermal_optimum: 20, niche_width: 9 },
    { id: "pike", name: "Northern Pike", trophic_level: "Apex", growth_rate: -0.10, initial_pop: 6, active: true, thermal_optimum: 18, niche_width: 10 },
  ],
};

export const presets: Preset[] = [
  {
    id: "trophic-cascade",
    label: "Trophic Cascade Challenge",
    signal: "Top-down shock",
    description: "High predator pressure meets a stressed producer base.",
    biome: "forest",
    linkStrength: 1.0,
    controls: {
      rainfall: 250,
      temperature: 34,
      nitrogen: 20,
    },
  },
  {
    id: "yellowstone-effect",
    label: "Yellowstone Effect",
    signal: "Predator restoration",
    description: "A measured apex predator recovery rebalances herbivore pressure.",
    biome: "forest",
    linkStrength: 0.8,
    controls: {
      rainfall: 760,
      temperature: 17,
      nitrogen: 62,
    },
  },
  {
    id: "runoff-disaster",
    label: "Agricultural Runoff Disaster",
    signal: "Nutrient overload",
    description: "Excess nitrogen creates a boom-bust producer pulse.",
    biome: "forest",
    linkStrength: 1.2,
    controls: {
      rainfall: 890,
      temperature: 22,
      nitrogen: 96,
    },
  },
  {
    id: "drought-stress",
    label: "Drought Stress Test",
    signal: "Abiotic collapse",
    description: "Low rainfall and heat compress carrying capacity.",
    biome: "forest",
    linkStrength: 1.0,
    controls: {
      rainfall: 260,
      temperature: 34,
      nitrogen: 42,
    },
  },
  {
    id: "amazon-canopy",
    label: "Amazon Canopy Dynamics",
    signal: "Tropical stratification",
    description: "Multi-strata tropical forest with jaguar apex pressure and liana competition.",
    biome: "tropical",
    linkStrength: 0.9,
    controls: {
      rainfall: 2200,
      temperature: 27,
      nitrogen: 35,
    },
  },
  {
    id: "lake-eutrophication",
    label: "Lake Eutrophication Crisis",
    signal: "Phosphorus loading",
    description: "Freshwater nutrient enrichment triggers cyanobacteria blooms and macrophyte collapse.",
    biome: "freshwater",
    linkStrength: 1.1,
    controls: {
      rainfall: 850,
      temperature: 22,
      nitrogen: 90,
    },
  },
];
