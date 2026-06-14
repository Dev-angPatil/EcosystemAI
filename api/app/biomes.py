from __future__ import annotations

from typing import Literal
from pydantic import BaseModel


class SpeciesPreset(BaseModel):
    id: str
    name: str
    trophic_level: Literal["Producer", "Herbivore", "Carnivore", "Apex"]
    growth_rate: float
    initial_pop: float
    active: bool
    thermal_optimum: float = 20.0
    niche_width: float = 8.0


class BiomePreset(BaseModel):
    id: str
    name: str
    species: list[SpeciesPreset]
    # interaction_matrix[i][j] represents effect of species j on species i
    # Keys in dict will be (species_i_id, species_j_id) -> coefficient float
    interactions: dict[str, dict[str, float]]


BIOMES: dict[str, BiomePreset] = {
    "forest": BiomePreset(
        id="forest",
        name="Temperate Forest",
        species=[
            # 12 Manually Defined Producers for Biodiversity Lab
            SpeciesPreset(id="grass", name="Wild Grass", trophic_level="Producer", growth_rate=0.45, initial_pop=200.0, active=True, thermal_optimum=20.0, niche_width=8.0),
            SpeciesPreset(id="ferns", name="Forest Ferns", trophic_level="Producer", growth_rate=0.35, initial_pop=150.0, active=True, thermal_optimum=16.0, niche_width=6.0),
            SpeciesPreset(id="oak", name="Oak Canopy", trophic_level="Producer", growth_rate=0.30, initial_pop=100.0, active=False, thermal_optimum=18.0, niche_width=10.0),
            SpeciesPreset(id="pine", name="Scotch Pine", trophic_level="Producer", growth_rate=0.25, initial_pop=80.0, active=False, thermal_optimum=12.0, niche_width=8.0),
            SpeciesPreset(id="berries", name="Wild Berries", trophic_level="Producer", growth_rate=0.40, initial_pop=100.0, active=False, thermal_optimum=22.0, niche_width=7.0),
            SpeciesPreset(id="moss", name="Carpet Moss", trophic_level="Producer", growth_rate=0.20, initial_pop=150.0, active=False, thermal_optimum=10.0, niche_width=5.0),
            SpeciesPreset(id="dandelions", name="Dandelions", trophic_level="Producer", growth_rate=0.48, initial_pop=80.0, active=False, thermal_optimum=24.0, niche_width=9.0),
            SpeciesPreset(id="mushrooms", name="Wild Mushrooms", trophic_level="Producer", growth_rate=0.22, initial_pop=70.0, active=False, thermal_optimum=14.0, niche_width=5.0),
            SpeciesPreset(id="clover", name="Red Clover", trophic_level="Producer", growth_rate=0.42, initial_pop=90.0, active=False, thermal_optimum=15.0, niche_width=6.0),
            SpeciesPreset(id="ivy", name="English Ivy", trophic_level="Producer", growth_rate=0.32, initial_pop=60.0, active=False, thermal_optimum=26.0, niche_width=8.0),
            SpeciesPreset(id="birch", name="Silver Birch", trophic_level="Producer", growth_rate=0.28, initial_pop=50.0, active=False, thermal_optimum=13.0, niche_width=7.0),
            SpeciesPreset(id="orchids", name="Forest Orchids", trophic_level="Producer", growth_rate=0.36, initial_pop=40.0, active=False, thermal_optimum=28.0, niche_width=5.0),
            
            # Consumers
            SpeciesPreset(id="rabbits", name="Woodland Rabbits", trophic_level="Herbivore", growth_rate=-0.12, initial_pop=90.0, active=True, thermal_optimum=20.0, niche_width=8.0),
            SpeciesPreset(id="deer", name="White-Tailed Deer", trophic_level="Herbivore", growth_rate=-0.06, initial_pop=25.0, active=True, thermal_optimum=19.0, niche_width=9.0),
            SpeciesPreset(id="insects", name="Forest Insects", trophic_level="Herbivore", growth_rate=-0.16, initial_pop=120.0, active=True, thermal_optimum=21.0, niche_width=8.0),
            SpeciesPreset(id="frogs", name="Tree Frogs", trophic_level="Carnivore", growth_rate=-0.22, initial_pop=30.0, active=True, thermal_optimum=18.0, niche_width=7.0),
            SpeciesPreset(id="owls", name="Barred Owls", trophic_level="Carnivore", growth_rate=-0.18, initial_pop=15.0, active=True, thermal_optimum=20.0, niche_width=8.0),
            SpeciesPreset(id="wolves", name="Gray Wolves", trophic_level="Apex", growth_rate=-0.14, initial_pop=8.0, active=True, thermal_optimum=20.0, niche_width=10.0),
        ],
        interactions={
            "grass": {"grass": -0.001, "ferns": -0.0004, "oak": -0.0002, "pine": -0.0001, "rabbits": -0.0025, "deer": -0.0010, "insects": -0.003},
            "ferns": {"ferns": -0.0015, "grass": -0.0003, "moss": -0.0002, "rabbits": -0.0022, "deer": -0.0015, "insects": -0.002},
            "oak": {"oak": -0.002, "pine": -0.0005, "birch": -0.0003, "deer": -0.0018, "insects": -0.0015},
            "pine": {"pine": -0.0018, "oak": -0.0004, "birch": -0.0002, "deer": -0.0008, "insects": -0.0008},
            "berries": {"berries": -0.0015, "grass": -0.0002, "rabbits": -0.0020, "deer": -0.0015, "insects": -0.0025},
            "moss": {"moss": -0.001, "ferns": -0.0001, "insects": -0.0018},
            "dandelions": {"dandelions": -0.002, "clover": -0.0005, "rabbits": -0.0022, "insects": -0.003},
            "mushrooms": {"mushrooms": -0.001, "moss": -0.0001, "insects": -0.0012},
            "clover": {"clover": -0.0015, "grass": -0.0003, "rabbits": -0.0024, "insects": -0.0028},
            "ivy": {"ivy": -0.002, "oak": -0.0004, "deer": -0.0012, "insects": -0.0018},
            "birch": {"birch": -0.002, "pine": -0.0003, "deer": -0.0018, "insects": -0.0015},
            "orchids": {"orchids": -0.001, "oak": -0.0001, "insects": -0.0022},
            "rabbits": {"rabbits": -0.01, "grass": 0.0008, "ferns": 0.0006, "berries": 0.0005, "clover": 0.0007, "dandelions": 0.0006, "owls": -0.0045, "wolves": -0.005},
            "deer": {"deer": -0.02, "grass": 0.0003, "ferns": 0.0004, "oak": 0.0005, "pine": 0.0002, "berries": 0.0004, "birch": 0.0005, "ivy": 0.0003, "wolves": -0.012},
            "insects": {"insects": -0.005, "grass": 0.0008, "ferns": 0.0006, "oak": 0.0004, "pine": 0.0002, "berries": 0.0007, "moss": 0.0005, "dandelions": 0.0009, "mushrooms": 0.0003, "clover": 0.0008, "ivy": 0.0005, "birch": 0.0004, "orchids": 0.0006, "frogs": -0.006},
            "frogs": {"frogs": -0.015, "insects": 0.0025, "owls": -0.008},
            "owls": {"owls": -0.02, "rabbits": 0.0015, "frogs": 0.003},
            "wolves": {"wolves": -0.03, "deer": 0.004, "rabbits": 0.002},
        }
    ),
    "marine": BiomePreset(
        id="marine",
        name="Coastal Marine",
        species=[
            # 12 Producers
            SpeciesPreset(id="phytoplankton", name="Phytoplankton", trophic_level="Producer", growth_rate=0.55, initial_pop=250.0, active=True, thermal_optimum=18.0, niche_width=8.0),
            SpeciesPreset(id="seaweed", name="Giant Kelp", trophic_level="Producer", growth_rate=0.38, initial_pop=180.0, active=True, thermal_optimum=14.0, niche_width=6.0),
            SpeciesPreset(id="eelgrass", name="Eelgrass Meadows", trophic_level="Producer", growth_rate=0.34, initial_pop=100.0, active=False, thermal_optimum=16.0, niche_width=8.0),
            SpeciesPreset(id="red_algae", name="Red Algae", trophic_level="Producer", growth_rate=0.28, initial_pop=90.0, active=False, thermal_optimum=12.0, niche_width=7.0),
            SpeciesPreset(id="green_algae", name="Green Sea Lettuce", trophic_level="Producer", growth_rate=0.45, initial_pop=110.0, active=False, thermal_optimum=22.0, niche_width=7.0),
            SpeciesPreset(id="diatoms", name="Benthic Diatoms", trophic_level="Producer", growth_rate=0.50, initial_pop=130.0, active=False, thermal_optimum=10.0, niche_width=5.0),
            SpeciesPreset(id="cyanobacteria", name="Blue-Green Algae", trophic_level="Producer", growth_rate=0.48, initial_pop=80.0, active=False, thermal_optimum=26.0, niche_width=9.0),
            SpeciesPreset(id="dinoflagellates", name="Dinoflagellates", trophic_level="Producer", growth_rate=0.52, initial_pop=70.0, active=False, thermal_optimum=20.0, niche_width=6.0),
            SpeciesPreset(id="sargassum", name="Sargassum Weed", trophic_level="Producer", growth_rate=0.40, initial_pop=100.0, active=False, thermal_optimum=24.0, niche_width=8.0),
            SpeciesPreset(id="sea_grapes", name="Sea Grapes", trophic_level="Producer", growth_rate=0.30, initial_pop=60.0, active=False, thermal_optimum=25.0, niche_width=7.0),
            SpeciesPreset(id="coralline", name="Coralline Algae", trophic_level="Producer", growth_rate=0.20, initial_pop=80.0, active=False, thermal_optimum=13.0, niche_width=5.0),
            SpeciesPreset(id="marine_lichens", name="Intertidal Lichens", trophic_level="Producer", growth_rate=0.18, initial_pop=40.0, active=False, thermal_optimum=8.0, niche_width=6.0),
            
            # Consumers
            SpeciesPreset(id="zooplankton", name="Zooplankton", trophic_level="Herbivore", growth_rate=-0.14, initial_pop=100.0, active=True, thermal_optimum=18.0, niche_width=8.0),
            SpeciesPreset(id="krill", name="Euphausiid Krill", trophic_level="Herbivore", growth_rate=-0.16, initial_pop=140.0, active=True, thermal_optimum=16.0, niche_width=7.0),
            SpeciesPreset(id="small_fish", name="Forage Fish", trophic_level="Carnivore", growth_rate=-0.20, initial_pop=60.0, active=True, thermal_optimum=18.0, niche_width=8.0),
            SpeciesPreset(id="crabs", name="Rock Crabs", trophic_level="Carnivore", growth_rate=-0.12, initial_pop=35.0, active=True, thermal_optimum=15.0, niche_width=7.0),
            SpeciesPreset(id="tuna", name="Bluefin Tuna", trophic_level="Carnivore", growth_rate=-0.15, initial_pop=12.0, active=True, thermal_optimum=20.0, niche_width=9.0),
            SpeciesPreset(id="sharks", name="Reef Sharks", trophic_level="Apex", growth_rate=-0.11, initial_pop=5.0, active=True, thermal_optimum=21.0, niche_width=10.0),
        ],
        interactions={
            # Self-limitations
            "phytoplankton": {"phytoplankton": -0.0008, "seaweed": -0.0002, "diatoms": -0.0001},
            "seaweed": {"seaweed": -0.0012, "phytoplankton": -0.0001, "eelgrass": -0.0003},
            "eelgrass": {"eelgrass": -0.0015, "seaweed": -0.0002},
            "red_algae": {"red_algae": -0.001},
            "green_algae": {"green_algae": -0.0015, "phytoplankton": -0.0002},
            "diatoms": {"diatoms": -0.0008, "phytoplankton": -0.0001},
            "cyanobacteria": {"cyanobacteria": -0.0012},
            "dinoflagellates": {"dinoflagellates": -0.001},
            "sargassum": {"sargassum": -0.0015},
            "sea_grapes": {"sea_grapes": -0.0018},
            "coralline": {"coralline": -0.0008},
            "marine_lichens": {"marine_lichens": -0.0005},
            
            "zooplankton": {"zooplankton": -0.008},
            "krill": {"krill": -0.006},
            "small_fish": {"small_fish": -0.012},
            "crabs": {"crabs": -0.015},
            "tuna": {"tuna": -0.025},
            "sharks": {"sharks": -0.04},
            
            # Zooplankton & Krill eat phytoplankton, diatoms, dinoflagellates, cyanobacteria
            "zooplankton": {"phytoplankton": 0.001, "diatoms": 0.0009, "dinoflagellates": 0.0008, "cyanobacteria": 0.0005},
            "phytoplankton": {"zooplankton": -0.003},
            "diatoms": {"zooplankton": -0.0028},
            "dinoflagellates": {"zooplankton": -0.0025},
            "cyanobacteria": {"zooplankton": -0.0015},
            
            "krill": {"phytoplankton": 0.0008, "diatoms": 0.0009, "dinoflagellates": 0.0007, "green_algae": 0.0004},
            "phytoplankton": {"krill": -0.0028},
            "diatoms": {"krill": -0.003},
            "dinoflagellates": {"krill": -0.0024},
            "green_algae": {"krill": -0.0015},
            
            # Small Fish eat zooplankton & krill
            "small_fish": {"zooplankton": 0.002, "krill": 0.0018},
            "zooplankton": {"small_fish": -0.005},
            "krill": {"small_fish": -0.0048},
            
            # Crabs eat seaweed, eelgrass, small fish, coralline algae
            "crabs": {"seaweed": 0.0005, "eelgrass": 0.0004, "small_fish": 0.0015, "coralline": 0.0003},
            "seaweed": {"crabs": -0.0016},
            "eelgrass": {"crabs": -0.0012},
            "small_fish": {"crabs": -0.0045},
            "coralline": {"crabs": -0.0010},
            
            # Tuna eats small fish
            "tuna": {"small_fish": 0.003},
            "small_fish": {"tuna": -0.008},
            
            # Sharks eat tuna & small fish
            "sharks": {"tuna": 0.005, "small_fish": 0.0015},
            "tuna": {"sharks": -0.012},
            "small_fish": {"sharks": -0.005},
        }
    ),
    "desert": BiomePreset(
        id="desert",
        name="Arid Desert",
        species=[
            # 12 Producers
            SpeciesPreset(id="cactus", name="Saguaro Cactus", trophic_level="Producer", growth_rate=0.22, initial_pop=180.0, active=True, thermal_optimum=28.0, niche_width=10.0),
            SpeciesPreset(id="shrubs", name="Creosote Bush", trophic_level="Producer", growth_rate=0.28, initial_pop=200.0, active=True, thermal_optimum=24.0, niche_width=8.0),
            SpeciesPreset(id="prickly_pear", name="Prickly Pear", trophic_level="Producer", growth_rate=0.32, initial_pop=120.0, active=False, thermal_optimum=30.0, niche_width=9.0),
            SpeciesPreset(id="mesquite", name="Mesquite Tree", trophic_level="Producer", growth_rate=0.25, initial_pop=100.0, active=False, thermal_optimum=26.0, niche_width=8.0),
            SpeciesPreset(id="marigold", name="Desert Marigold", trophic_level="Producer", growth_rate=0.36, initial_pop=80.0, active=False, thermal_optimum=22.0, niche_width=6.0),
            SpeciesPreset(id="agave", name="Desert Agave", trophic_level="Producer", growth_rate=0.26, initial_pop=90.0, active=False, thermal_optimum=25.0, niche_width=8.0),
            SpeciesPreset(id="joshua_tree", name="Joshua Tree", trophic_level="Producer", growth_rate=0.18, initial_pop=70.0, active=False, thermal_optimum=18.0, niche_width=7.0),
            SpeciesPreset(id="verbena", name="Sand Verbena", trophic_level="Producer", growth_rate=0.38, initial_pop=80.0, active=False, thermal_optimum=20.0, niche_width=5.0),
            SpeciesPreset(id="yucca", name="Mojave Yucca", trophic_level="Producer", growth_rate=0.24, initial_pop=80.0, active=False, thermal_optimum=23.0, niche_width=7.0),
            SpeciesPreset(id="brittlebush", name="Brittlebush", trophic_level="Producer", growth_rate=0.30, initial_pop=100.0, active=False, thermal_optimum=27.0, niche_width=8.0),
            SpeciesPreset(id="sage", name="Desert Sage", trophic_level="Producer", growth_rate=0.28, initial_pop=60.0, active=False, thermal_optimum=16.0, niche_width=6.0),
            SpeciesPreset(id="barrel_cactus", name="Barrel Cactus", trophic_level="Producer", growth_rate=0.20, initial_pop=70.0, active=False, thermal_optimum=32.0, niche_width=8.0),
            
            # Consumers
            SpeciesPreset(id="rats", name="Kangaroo Rats", trophic_level="Herbivore", growth_rate=-0.08, initial_pop=80.0, active=True, thermal_optimum=23.0, niche_width=8.0),
            SpeciesPreset(id="insects", name="Desert Locusts", trophic_level="Herbivore", growth_rate=-0.15, initial_pop=110.0, active=True, thermal_optimum=26.0, niche_width=8.0),
            SpeciesPreset(id="lizards", name="Whiptail Lizards", trophic_level="Carnivore", growth_rate=-0.18, initial_pop=40.0, active=True, thermal_optimum=24.0, niche_width=7.0),
            SpeciesPreset(id="scorpions", name="Bark Scorpions", trophic_level="Carnivore", growth_rate=-0.14, initial_pop=30.0, active=True, thermal_optimum=25.0, niche_width=7.0),
            SpeciesPreset(id="roadrunners", name="Roadrunners", trophic_level="Carnivore", growth_rate=-0.16, initial_pop=18.0, active=True, thermal_optimum=22.0, niche_width=8.0),
            SpeciesPreset(id="coyotes", name="Desert Coyotes", trophic_level="Apex", growth_rate=-0.12, initial_pop=7.0, active=True, thermal_optimum=24.0, niche_width=10.0),
        ],
        interactions={
            # Self-limitations
            "cactus": {"cactus": -0.002, "shrubs": -0.0005},
            "shrubs": {"shrubs": -0.0018, "cactus": -0.0004},
            "prickly_pear": {"prickly_pear": -0.002},
            "mesquite": {"mesquite": -0.0015},
            "marigold": {"marigold": -0.002},
            "agave": {"agave": -0.0016},
            "joshua_tree": {"joshua_tree": -0.0015},
            "verbena": {"verbena": -0.0012},
            "yucca": {"yucca": -0.0014},
            "brittlebush": {"brittlebush": -0.0018},
            "sage": {"sage": -0.001},
            "barrel_cactus": {"barrel_cactus": -0.002},
            
            "rats": {"rats": -0.012},
            "insects": {"insects": -0.008},
            "lizards": {"lizards": -0.02},
            "scorpions": {"scorpions": -0.018},
            "roadrunners": {"roadrunners": -0.03},
            "coyotes": {"coyotes": -0.04},
            
            # Rats eat succulent and low producers
            "rats": {"cactus": 0.0008, "shrubs": 0.0006, "prickly_pear": 0.0009, "marigold": 0.0005, "agave": 0.0007, "barrel_cactus": 0.0007},
            "cactus": {"rats": -0.0026},
            "shrubs": {"rats": -0.0020},
            "prickly_pear": {"rats": -0.0028},
            "marigold": {"rats": -0.0018},
            "agave": {"rats": -0.0022},
            "barrel_cactus": {"rats": -0.0024},
            
            # Insects eat leaves of bushes, wild marigold, etc.
            "insects": {"shrubs": 0.0014, "mesquite": 0.0010, "marigold": 0.0012, "verbena": 0.0008, "sage": 0.0011, "brittlebush": 0.0013},
            "shrubs": {"insects": -0.0045},
            "mesquite": {"insects": -0.003},
            "marigold": {"insects": -0.0035},
            "verbena": {"insects": -0.0025},
            "sage": {"insects": -0.0032},
            "brittlebush": {"insects": -0.0038},
            
            # Predators eating herbivores/carnivores
            "lizards": {"insects": 0.0028},
            "insects": {"lizards": -0.007},
            "scorpions": {"insects": 0.0022},
            "insects": {"scorpions": -0.0055},
            "roadrunners": {"lizards": 0.0025, "scorpions": 0.0035},
            "lizards": {"roadrunners": -0.0075},
            "scorpions": {"roadrunners": -0.01},
            "coyotes": {"rats": 0.003, "roadrunners": 0.004},
            "rats": {"coyotes": -0.009},
            "roadrunners": {"coyotes": -0.012},
        }
    ),
    # ──────────────────────────────────────────────────────────────────────────
    # BIOME 4: Tropical Rainforest
    # High biodiversity, multi-stratum canopy, nutrient-poor soils (oligotrophic),
    # intense competition for light, high decomposition rates, wet & warm climate.
    # ──────────────────────────────────────────────────────────────────────────
    "tropical": BiomePreset(
        id="tropical",
        name="Tropical Rainforest",
        species=[
            # Canopy & Understory Producers (multi-strata)
            SpeciesPreset(id="canopy_trees", name="Emergent Canopy Trees", trophic_level="Producer", growth_rate=0.32, initial_pop=220.0, active=True, thermal_optimum=27.0, niche_width=6.0),
            SpeciesPreset(id="lianas", name="Climbing Lianas", trophic_level="Producer", growth_rate=0.44, initial_pop=160.0, active=True, thermal_optimum=26.0, niche_width=7.0),
            SpeciesPreset(id="epiphytes", name="Bromeliad Epiphytes", trophic_level="Producer", growth_rate=0.36, initial_pop=140.0, active=True, thermal_optimum=25.0, niche_width=5.0),
            SpeciesPreset(id="palms", name="Understory Palms", trophic_level="Producer", growth_rate=0.28, initial_pop=110.0, active=False, thermal_optimum=28.0, niche_width=6.0),
            SpeciesPreset(id="heliconias", name="Heliconia Shrubs", trophic_level="Producer", growth_rate=0.42, initial_pop=100.0, active=False, thermal_optimum=26.0, niche_width=5.0),
            SpeciesPreset(id="ficus", name="Strangler Fig", trophic_level="Producer", growth_rate=0.38, initial_pop=80.0, active=False, thermal_optimum=27.0, niche_width=7.0),
            SpeciesPreset(id="bamboo", name="Tropical Bamboo", trophic_level="Producer", growth_rate=0.50, initial_pop=90.0, active=False, thermal_optimum=24.0, niche_width=8.0),
            SpeciesPreset(id="orchids_tr", name="Canopy Orchids", trophic_level="Producer", growth_rate=0.30, initial_pop=60.0, active=False, thermal_optimum=25.0, niche_width=4.0),
            SpeciesPreset(id="ferns_tr", name="Tree Ferns", trophic_level="Producer", growth_rate=0.34, initial_pop=90.0, active=False, thermal_optimum=22.0, niche_width=6.0),
            SpeciesPreset(id="mosses_tr", name="Tropical Mosses", trophic_level="Producer", growth_rate=0.22, initial_pop=120.0, active=False, thermal_optimum=22.0, niche_width=5.0),
            SpeciesPreset(id="gingers", name="Wild Gingers", trophic_level="Producer", growth_rate=0.40, initial_pop=75.0, active=False, thermal_optimum=26.0, niche_width=5.0),
            SpeciesPreset(id="cacao", name="Wild Cacao", trophic_level="Producer", growth_rate=0.26, initial_pop=50.0, active=False, thermal_optimum=27.0, niche_width=4.0),
            
            # Consumers
            SpeciesPreset(id="howler_monkey", name="Howler Monkeys", trophic_level="Herbivore", growth_rate=-0.08, initial_pop=60.0, active=True, thermal_optimum=26.0, niche_width=8.0),
            SpeciesPreset(id="insects_tr", name="Canopy Insects", trophic_level="Herbivore", growth_rate=-0.18, initial_pop=130.0, active=True, thermal_optimum=27.0, niche_width=9.0),
            SpeciesPreset(id="poison_dart_frog", name="Poison Dart Frogs", trophic_level="Carnivore", growth_rate=-0.20, initial_pop=35.0, active=True, thermal_optimum=25.0, niche_width=5.0),
            SpeciesPreset(id="harpy_eagle", name="Harpy Eagles", trophic_level="Carnivore", growth_rate=-0.14, initial_pop=10.0, active=True, thermal_optimum=26.0, niche_width=8.0),
            SpeciesPreset(id="boa", name="Boa Constrictors", trophic_level="Carnivore", growth_rate=-0.16, initial_pop=18.0, active=True, thermal_optimum=28.0, niche_width=7.0),
            SpeciesPreset(id="jaguar", name="Jaguars", trophic_level="Apex", growth_rate=-0.10, initial_pop=5.0, active=True, thermal_optimum=26.0, niche_width=10.0),
        ],
        interactions={
            # Self-competition (canopy shading lowers carrying capacity of understory)
            "canopy_trees": {"canopy_trees": -0.0015, "lianas": -0.0008, "epiphytes": -0.0004, "palms": -0.0005},
            "lianas": {"lianas": -0.002, "canopy_trees": -0.0006, "ficus": -0.0003},
            "epiphytes": {"epiphytes": -0.0018, "mosses_tr": -0.0002},
            "palms": {"palms": -0.0015, "heliconias": -0.0004},
            "heliconias": {"heliconias": -0.002},
            "ficus": {"ficus": -0.0012, "canopy_trees": -0.0008},  # strangler fig parasitizes host
            "bamboo": {"bamboo": -0.0025, "palms": -0.0006},
            "orchids_tr": {"orchids_tr": -0.001},
            "ferns_tr": {"ferns_tr": -0.0014, "mosses_tr": -0.0003},
            "mosses_tr": {"mosses_tr": -0.001},
            "gingers": {"gingers": -0.0018},
            "cacao": {"cacao": -0.0012},

            "howler_monkey": {"howler_monkey": -0.012},
            "insects_tr": {"insects_tr": -0.006},
            "poison_dart_frog": {"poison_dart_frog": -0.018},
            "harpy_eagle": {"harpy_eagle": -0.025},
            "boa": {"boa": -0.02},
            "jaguar": {"jaguar": -0.04},

            # Howler monkeys eat canopy fruits, lianas, heliconias
            "howler_monkey": {"canopy_trees": 0.0006, "lianas": 0.0005, "heliconias": 0.0004, "ficus": 0.0007, "gingers": 0.0004},
            "canopy_trees": {"howler_monkey": -0.0018},
            "lianas": {"howler_monkey": -0.0015},
            "heliconias": {"howler_monkey": -0.0012},
            "ficus": {"howler_monkey": -0.0020},
            "gingers": {"howler_monkey": -0.0014},

            # Canopy insects eat all producers
            "insects_tr": {
                "canopy_trees": 0.0005, "lianas": 0.0007, "epiphytes": 0.0006,
                "palms": 0.0004, "heliconias": 0.0008, "bamboo": 0.0006,
                "orchids_tr": 0.0005, "ferns_tr": 0.0004, "cacao": 0.0005
            },
            "canopy_trees": {"insects_tr": -0.0015},
            "lianas": {"insects_tr": -0.0022},
            "epiphytes": {"insects_tr": -0.0018},
            "palms": {"insects_tr": -0.0013},
            "heliconias": {"insects_tr": -0.0024},
            "bamboo": {"insects_tr": -0.002},
            "orchids_tr": {"insects_tr": -0.0016},
            "ferns_tr": {"insects_tr": -0.0013},
            "cacao": {"insects_tr": -0.0015},

            # Poison dart frogs eat insects
            "poison_dart_frog": {"insects_tr": 0.003},
            "insects_tr": {"poison_dart_frog": -0.008},

            # Boa eats howler monkeys, frogs
            "boa": {"howler_monkey": 0.0015, "poison_dart_frog": 0.002},
            "howler_monkey": {"boa": -0.005},
            "poison_dart_frog": {"boa": -0.006},

            # Harpy eagle eats howler monkeys, snakes
            "harpy_eagle": {"howler_monkey": 0.002, "boa": 0.003},
            "howler_monkey": {"harpy_eagle": -0.006},
            "boa": {"harpy_eagle": -0.008},

            # Jaguar eats monkeys, harpy eagles (nest raids), boa
            "jaguar": {"howler_monkey": 0.003, "harpy_eagle": 0.002, "boa": 0.0015},
            "howler_monkey": {"jaguar": -0.008},
            "harpy_eagle": {"jaguar": -0.006},
            "boa": {"jaguar": -0.005},
        }
    ),
    # ──────────────────────────────────────────────────────────────────────────
    # BIOME 5: Freshwater Lake
    # Stratified water column (epilimnion/hypolimnion), phosphorus-limited,
    # macrophyte littoral zone, pelagic and benthic food webs.
    # Key concepts: eutrophication, thermal stratification, algal blooms, 
    # benthic-pelagic coupling, riparian-aquatic linkages.
    # ──────────────────────────────────────────────────────────────────────────
    "freshwater": BiomePreset(
        id="freshwater",
        name="Freshwater Lake",
        species=[
            # Producers - pelagic and littoral
            SpeciesPreset(id="phytoplankton_fw", name="Phytoplankton", trophic_level="Producer", growth_rate=0.58, initial_pop=240.0, active=True, thermal_optimum=20.0, niche_width=7.0),
            SpeciesPreset(id="macrophytes", name="Aquatic Macrophytes", trophic_level="Producer", growth_rate=0.30, initial_pop=160.0, active=True, thermal_optimum=22.0, niche_width=8.0),
            SpeciesPreset(id="periphyton", name="Periphyton (Algal Mat)", trophic_level="Producer", growth_rate=0.48, initial_pop=120.0, active=True, thermal_optimum=18.0, niche_width=6.0),
            SpeciesPreset(id="cyanobacteria_fw", name="Cyanobacteria Blooms", trophic_level="Producer", growth_rate=0.52, initial_pop=90.0, active=False, thermal_optimum=28.0, niche_width=9.0),
            SpeciesPreset(id="duckweed", name="Duckweed (Lemna)", trophic_level="Producer", growth_rate=0.60, initial_pop=80.0, active=False, thermal_optimum=24.0, niche_width=8.0),
            SpeciesPreset(id="waterlily", name="Water Lilies", trophic_level="Producer", growth_rate=0.25, initial_pop=70.0, active=False, thermal_optimum=22.0, niche_width=7.0),
            SpeciesPreset(id="cattails", name="Cattails (Typha)", trophic_level="Producer", growth_rate=0.38, initial_pop=100.0, active=False, thermal_optimum=20.0, niche_width=8.0),
            SpeciesPreset(id="charophytes", name="Charophyte Algae", trophic_level="Producer", growth_rate=0.32, initial_pop=80.0, active=False, thermal_optimum=16.0, niche_width=5.0),
            SpeciesPreset(id="riparian_plants", name="Riparian Sedges", trophic_level="Producer", growth_rate=0.35, initial_pop=90.0, active=False, thermal_optimum=18.0, niche_width=6.0),
            SpeciesPreset(id="submerged_plants", name="Submerged Pondweeds", trophic_level="Producer", growth_rate=0.28, initial_pop=75.0, active=False, thermal_optimum=19.0, niche_width=6.0),
            SpeciesPreset(id="algae_epi", name="Epilithic Algae", trophic_level="Producer", growth_rate=0.45, initial_pop=65.0, active=False, thermal_optimum=15.0, niche_width=5.0),
            SpeciesPreset(id="flagellates", name="Chrysophyte Flagellates", trophic_level="Producer", growth_rate=0.42, initial_pop=55.0, active=False, thermal_optimum=12.0, niche_width=4.0),

            # Consumers
            SpeciesPreset(id="zooplankton_fw", name="Daphnia Zooplankton", trophic_level="Herbivore", growth_rate=-0.15, initial_pop=110.0, active=True, thermal_optimum=18.0, niche_width=7.0),
            SpeciesPreset(id="invertebrates", name="Benthic Invertebrates", trophic_level="Herbivore", growth_rate=-0.12, initial_pop=80.0, active=True, thermal_optimum=16.0, niche_width=6.0),
            SpeciesPreset(id="roach", name="Roach / Bream", trophic_level="Carnivore", growth_rate=-0.18, initial_pop=50.0, active=True, thermal_optimum=20.0, niche_width=8.0),
            SpeciesPreset(id="perch", name="Perch", trophic_level="Carnivore", growth_rate=-0.15, initial_pop=35.0, active=True, thermal_optimum=18.0, niche_width=7.0),
            SpeciesPreset(id="heron", name="Grey Herons", trophic_level="Carnivore", growth_rate=-0.14, initial_pop=12.0, active=True, thermal_optimum=20.0, niche_width=9.0),
            SpeciesPreset(id="pike", name="Northern Pike", trophic_level="Apex", growth_rate=-0.10, initial_pop=6.0, active=True, thermal_optimum=18.0, niche_width=10.0),
        ],
        interactions={
            # Self-limitations (phosphorus / light limited in stratified lake)
            "phytoplankton_fw": {"phytoplankton_fw": -0.001, "periphyton": -0.0003, "cyanobacteria_fw": -0.0004},
            "macrophytes": {"macrophytes": -0.0015, "phytoplankton_fw": -0.0005, "duckweed": -0.0004},
            "periphyton": {"periphyton": -0.0012, "phytoplankton_fw": -0.0002},
            "cyanobacteria_fw": {"cyanobacteria_fw": -0.0018, "phytoplankton_fw": -0.0006},
            "duckweed": {"duckweed": -0.002, "macrophytes": -0.0004},
            "waterlily": {"waterlily": -0.0015, "macrophytes": -0.0003},
            "cattails": {"cattails": -0.002, "riparian_plants": -0.0004},
            "charophytes": {"charophytes": -0.001, "phytoplankton_fw": -0.0003},
            "riparian_plants": {"riparian_plants": -0.0015},
            "submerged_plants": {"submerged_plants": -0.0012, "macrophytes": -0.0003},
            "algae_epi": {"algae_epi": -0.0018},
            "flagellates": {"flagellates": -0.0010},

            "zooplankton_fw": {"zooplankton_fw": -0.009},
            "invertebrates": {"invertebrates": -0.010},
            "roach": {"roach": -0.014},
            "perch": {"perch": -0.018},
            "heron": {"heron": -0.025},
            "pike": {"pike": -0.04},

            # Daphnia zooplankton filter phytoplankton, flagellates
            "zooplankton_fw": {"phytoplankton_fw": 0.0012, "flagellates": 0.0009, "cyanobacteria_fw": 0.0004, "algae_epi": 0.0003},
            "phytoplankton_fw": {"zooplankton_fw": -0.0035},
            "flagellates": {"zooplankton_fw": -0.0028},
            "cyanobacteria_fw": {"zooplankton_fw": -0.0012},
            "algae_epi": {"zooplankton_fw": -0.001},

            # Benthic invertebrates graze periphyton, submerged plants, macrophyte detritus
            "invertebrates": {"periphyton": 0.0010, "submerged_plants": 0.0006, "macrophytes": 0.0004, "charophytes": 0.0005},
            "periphyton": {"invertebrates": -0.003},
            "submerged_plants": {"invertebrates": -0.002},
            "macrophytes": {"invertebrates": -0.0015},
            "charophytes": {"invertebrates": -0.0015},

            # Roach / Bream eats zooplankton and invertebrates (omnivorous)
            "roach": {"zooplankton_fw": 0.0018, "invertebrates": 0.0014, "macrophytes": 0.0004},
            "zooplankton_fw": {"roach": -0.005},
            "invertebrates": {"roach": -0.004},
            "macrophytes": {"roach": -0.0012},

            # Perch eats invertebrates, small roach
            "perch": {"invertebrates": 0.0016, "roach": 0.0015},
            "invertebrates": {"perch": -0.0045},
            "roach": {"perch": -0.0044},

            # Heron eats perch, roach, frogs (external)
            "heron": {"perch": 0.002, "roach": 0.0015},
            "perch": {"heron": -0.006},
            "roach": {"heron": -0.0045},

            # Pike eats everything — apex piscivore
            "pike": {"roach": 0.003, "perch": 0.0025, "heron": 0.0008},
            "roach": {"pike": -0.009},
            "perch": {"pike": -0.0075},
            "heron": {"pike": -0.002},
        }
    ),
}
