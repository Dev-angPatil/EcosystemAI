from __future__ import annotations

import numpy as np
import random
from .schemas import (
    SimulationRequest,
    SpeciesConfig,
    ComplexNumber,
    StabilityAnalysis,
    GridCell,
    GridTimelinePoint,
    InitialPopulations,
    AbioticFactors,
    BiodiversityLabRequest,
    BiodiversityLabPoint,
    HysteresisPoint,
    HysteresisRequest,
    LeslieMatrixRequest,
    LeslieMatrixPoint,
    LeslieMatrixResponse,
)


def compute_photosynthesis(pathway: str, Ca: float, Temp: float, RH: float, I: float, soil_moisture: float, growth_rate: float) -> tuple[float, float]:
    f_water = np.clip((soil_moisture - 0.08) / (0.30 - 0.08), 0.05, 1.0)
    hs = RH / 100.0
    
    # Q10 respiration scaling
    Q10 = 2.0
    Rd = 0.015 * growth_rate * (Q10 ** ((Temp - 20.0) / 10.0))
    
    if pathway == "C3":
        # CO2 compensation point
        gamma_star = 40.0 + 1.8 * (Temp - 20.0)
        # RuBisCO limited
        Vc_max = growth_rate * 2.5
        Vc = Vc_max * max(0.0, Ca - gamma_star) / (Ca + 736.0)
        # Light limited
        J_max = Vc_max * 1.8
        J = J_max * I / (I + 500.0)
        W_j = (J / 4.0) * max(0.0, Ca - gamma_star) / (Ca + 2.0 * gamma_star)
        A_net = max(0.0, min(Vc, W_j) - Rd)
        a_slope = 9.0
    elif pathway == "C4":
        gamma_star = 5.0
        Vc_max = growth_rate * 2.5
        Vc = Vc_max * Ca / (Ca + 50.0)
        J_max = Vc_max * 1.8
        W_j = J_max * I / (I + 400.0) * 0.2
        A_net = max(0.0, min(Vc, W_j) - Rd)
        a_slope = 4.0
    else:  # CAM
        Vc_max = growth_rate * 2.2
        A_net = Vc_max * Ca / (Ca + 100.0) * (0.3 + 0.7 * f_water)
        A_net = max(0.0, A_net - Rd)
        a_slope = 1.5

    # Ball-Berry stomatal conductance
    g0 = 0.02
    gs = g0 + a_slope * (A_net * hs / max(100.0, Ca)) * f_water
    gs = np.clip(gs, g0, 0.6)
    
    return float(A_net), float(gs)


def compute_evapotranspiration(Temp: float, RH: float, I: float, gs_sum: float, soil_moisture: float) -> tuple[float, float, float]:
    # Net Radiation Rn (W/m2)
    Rn = 340.0 * (I / 800.0)
    G = 0.1 * Rn
    
    # Saturation vapor pressure slope delta (kPa / C)
    es = 0.6108 * np.exp(17.27 * Temp / (Temp + 237.3))
    delta = 4098.0 * es / ((Temp + 237.3) ** 2)
    
    gamma = 0.066  # kPa / C
    VPD = es * (1.0 - RH / 100.0)
    
    r_a = 50.0  # s/m
    # Canopy resistance
    r_s = 1.0 / max(0.001, gs_sum * 0.05)
    r_s = np.clip(r_s, 5.0, 1000.0)
    
    rho_a = 1.2
    cp = 1005.0
    
    numerator = delta * (Rn - G) + rho_a * cp * (VPD / r_a)
    denominator = delta + gamma * (1.0 + r_s / r_a)
    lambda_ET = numerator / denominator
    
    # Scale and convert to mm/day proxy
    ET = max(0.0, lambda_ET * 0.0005)
    H = Rn - G - lambda_ET
    
    return float(ET), float(H), float(lambda_ET)


def hydrate_species(request: SimulationRequest) -> list[SpeciesConfig]:
    if request.species:
        return request.species
    
    from .biomes import BIOMES
    biome_key = request.biome if request.biome in BIOMES else "forest"
    preset = BIOMES[biome_key]
    
    hydrated = []
    initial = request.initial_populations or InitialPopulations(plants=540, rabbits=95, wolves=18)
    for sp in preset.species:
        init_pop = 0.0
        active = sp.active
        # Backward compatibility overrides
        if sp.id in ("grass", "plants", "phytoplankton", "cactus"):
            init_pop = initial.plants
            active = True
        elif sp.id in ("rabbits", "zooplankton", "rats"):
            init_pop = initial.rabbits
            active = True
        elif sp.id in ("wolves", "small_fish", "lizards"):
            init_pop = initial.wolves
            active = True
        else:
            # For the other newly defined species, default initial pop is their preset pop
            init_pop = sp.initial_pop if sp.active else 0.0
        
        hydrated.append(SpeciesConfig(
            id=sp.id,
            name=sp.name,
            trophic_level=sp.trophic_level,
            growth_rate=sp.growth_rate,
            initial_pop=init_pop,
            active=active,
            thermal_optimum=sp.thermal_optimum,
            niche_width=sp.niche_width,
            toxin_level=0.0
        ))
    return hydrated


def run_simulation(
    request_or_initial: SimulationRequest | InitialPopulations,
    abiotic: AbioticFactors | None = None,
) -> tuple[list[GridTimelinePoint], dict[str, float], StabilityAnalysis]:
    if isinstance(request_or_initial, InitialPopulations):
        request = SimulationRequest(
            initial_populations=request_or_initial,
            abiotic_factors=abiotic or AbioticFactors(rainfall=700.0, temperature=20.0, nitrogen=50.0),
        )
    else:
        request = request_or_initial

    species = hydrate_species(request)
    abiotic = request.abiotic_factors
    link_strength = request.link_strength
    corridor_y = request.corridor_y
    
    # 1. Abiotic modifiers for Producers
    temp_distance = abs(abiotic.temperature - 20.0)
    temp_factor = np.clip(1.0 - (temp_distance / 32.0), 0.28, 1.12)
    rainfall_factor = np.clip(abiotic.rainfall / 700.0, 0.32, 1.55)
    nitrogen_factor = np.clip(abiotic.nitrogen / 55.0, 0.35, 1.75)
    
    prod_r_modifier = temp_factor * (0.88 + 0.12 * rainfall_factor)
    prod_K_modifier = rainfall_factor * (0.72 + 0.28 * nitrogen_factor)

    # 2. Build Interspecific Matrix & Growth vector for active species
    from .biomes import BIOMES
    biome_preset = BIOMES.get(request.biome, BIOMES["forest"])
    base_interactions = biome_preset.interactions
    
    active_sp = [sp for sp in species if sp.active]
    M = len(active_sp)
    idx_map = {sp.id: idx for idx, sp in enumerate(active_sp)}
    
    r_vec = np.zeros(M)
    A_mat = np.zeros((M, M))
    
    for idx, sp in enumerate(active_sp):
        if sp.trophic_level == "Producer":
            r_vec[idx] = sp.growth_rate * prod_r_modifier
        else:
            r_vec[idx] = sp.growth_rate
        
        # Diagonal term
        base_self = base_interactions.get(sp.id, {}).get(sp.id, -0.01)
        if sp.trophic_level == "Producer":
            A_mat[idx, idx] = base_self * prod_r_modifier / prod_K_modifier
        else:
            A_mat[idx, idx] = base_self
            
        # Off-diagonals
        for jdx, sp_j in enumerate(active_sp):
            if idx == jdx:
                continue
            coef = base_interactions.get(sp.id, {}).get(sp_j.id, 0.0)
            A_mat[idx, jdx] = coef * link_strength

    # 3. Solve Stability at Coexistence Equilibrium
    try:
        if M > 0:
            X_star = np.linalg.solve(A_mat, -r_vec)
            X_star_feasible = np.maximum(0, X_star)
        else:
            X_star = np.array([])
            X_star_feasible = np.array([])
    except np.linalg.LinAlgError:
        X_star = np.zeros(M)
        X_star_feasible = np.zeros(M)

    # Compute Jacobian J_ij = X_i* * A_ij
    J = np.zeros((M, M))
    for i in range(M):
        for j in range(M):
            J[i, j] = X_star_feasible[i] * A_mat[i, j]

    if M > 0:
        eigenvals = np.linalg.eigvals(J)
        is_stable = all(np.real(ev) < 0 for ev in eigenvals)
    else:
        eigenvals = np.array([])
        is_stable = True

    stability = StabilityAnalysis(
        jacobian=A_mat.tolist(),
        eigenvalues=[ComplexNumber(real=float(np.real(ev)), imag=float(np.imag(ev))) for ev in eigenvals],
        stable=bool(is_stable),
        equilibrium=X_star.tolist()
    )

    # 4. Initialize 10x10 Spatial Grid
    grid = {}
    nutrients_grid = {}
    toxin_grid = {}  # Cell soil/water toxin pools
    species_toxin_grid = {}  # (x, y) -> sp_id -> toxin mass float
    cell_hypoxic_grid = {}
    
    # Advanced hydrology & soil pools
    soil_moisture_grid = {}
    som_active_c_grid = {}
    som_slow_c_grid = {}
    som_passive_c_grid = {}
    som_active_n_grid = {}
    som_slow_n_grid = {}
    som_passive_n_grid = {}
    soil_ammonium_grid = {}
    soil_nitrate_grid = {}
    
    # Track diagnostic evapotranspiration/heat fields
    evapotranspiration_grid = {}
    sensible_heat_grid = {}
    latent_heat_grid = {}

    for x in range(10):
        for y in range(10):
            cell_pops = {}
            for sp in active_sp:
                p_coef = max(0.1, 1.0 + 0.3 * np.cos(x * 0.8) * np.sin(y * 0.8))
                cell_pops[sp.id] = sp.initial_pop / 100.0 * p_coef
            grid[(x, y)] = cell_pops
            
            init_c = 500.0
            init_n = 100.0 * (abiotic.nitrogen / 54.0)
            init_p = 50.0 * (abiotic.rainfall / 720.0)
            nutrients_grid[(x, y)] = {"C": init_c, "N": init_n, "P": init_p}
            toxin_grid[(x, y)] = 0.0
            species_toxin_grid[(x, y)] = {sp.id: 0.0 for sp in active_sp}
            cell_hypoxic_grid[(x, y)] = False
            
            soil_moisture_grid[(x, y)] = 0.25
            som_active_c_grid[(x, y)] = 100.0
            som_slow_c_grid[(x, y)] = 500.0
            som_passive_c_grid[(x, y)] = 1000.0
            som_active_n_grid[(x, y)] = 10.0
            som_slow_n_grid[(x, y)] = 33.3
            som_passive_n_grid[(x, y)] = 50.0
            soil_ammonium_grid[(x, y)] = 5.0
            soil_nitrate_grid[(x, y)] = 2.0
            
            evapotranspiration_grid[(x, y)] = 0.0
            sensible_heat_grid[(x, y)] = 0.0
            latent_heat_grid[(x, y)] = 0.0

    # Normalize grid totals to initial population totals
    for sp in active_sp:
        sum_sp = sum(grid[k][sp.id] for k in grid)
        scale_sp = sp.initial_pop / max(1e-5, sum_sp)
        for k in grid:
            grid[k][sp.id] *= scale_sp

    timeline = []

    def get_neighbors_with_barrier(x: int, y: int) -> list[tuple[int, int]]:
        candidates = [(x-1, y), (x+1, y), (x, y-1), (x, y+1)]
        neighbors = []
        for nx, ny in candidates:
            if 0 <= nx < 10 and 0 <= ny < 10:
                is_crossing = (x == 4 and nx == 5) or (x == 5 and nx == 4)
                if is_crossing:
                    if corridor_y is not None and y == corridor_y:
                        neighbors.append((nx, ny))
                else:
                    neighbors.append((nx, ny))
        return neighbors

    # Add Year 0 to timeline
    year_cells = []
    for x in range(10):
        for y in range(10):
            rounded_pops = {sp_id: round(max(0.0, val), 2) for sp_id, val in grid[(x, y)].items()}
            rounded_nuts = {nut: round(max(0.0, val), 2) for nut, val in nutrients_grid[(x, y)].items()}
            c_plants = sum(rounded_pops[sp.id] for sp in active_sp if sp.trophic_level == "Producer")
            c_rabbits = sum(rounded_pops[sp.id] for sp in active_sp if sp.trophic_level == "Herbivore")
            c_wolves = sum(rounded_pops[sp.id] for sp in active_sp if sp.trophic_level in ("Carnivore", "Apex"))
            
            # Species concentrations of toxin (mass / pop)
            cell_tox_conc = 0.0
            total_bio = sum(grid[(x, y)][sp.id] for sp in active_sp)
            if total_bio > 0:
                cell_tox_conc = sum(species_toxin_grid[(x, y)][sp.id] for sp in active_sp) / total_bio

            year_cells.append(GridCell(
                x=x, y=y, populations=rounded_pops, nutrients=rounded_nuts,
                plants=round(c_plants, 2), rabbits=round(c_rabbits, 2), wolves=round(c_wolves, 2),
                toxin_concentration=round(cell_tox_conc, 4), hypoxic=cell_hypoxic_grid[(x, y)],
                soil_moisture=round(soil_moisture_grid[(x, y)], 4),
                evapotranspiration=round(evapotranspiration_grid[(x, y)], 4),
                sensible_heat=round(sensible_heat_grid[(x, y)], 4),
                latent_heat=round(latent_heat_grid[(x, y)], 4),
                som_active_c=round(som_active_c_grid[(x, y)], 2),
                som_slow_c=round(som_slow_c_grid[(x, y)], 2),
                som_passive_c=round(som_passive_c_grid[(x, y)], 2),
                soil_ammonium=round(soil_ammonium_grid[(x, y)], 2),
                soil_nitrate=round(soil_nitrate_grid[(x, y)], 2)
            ))

    global_pops_t0 = {sp.id: round(sp.initial_pop, 2) for sp in active_sp}
    global_nuts_t0 = {"C": 500.0, "N": round(100.0 * (abiotic.nitrogen / 54.0), 2), "P": round(50.0 * (abiotic.rainfall / 720.0), 2)}
    t0_plants = sum(global_pops_t0[sp.id] for sp in active_sp if sp.trophic_level == "Producer")
    t0_rabbits = sum(global_pops_t0[sp.id] for sp in active_sp if sp.trophic_level == "Herbivore")
    t0_wolves = sum(global_pops_t0[sp.id] for sp in active_sp if sp.trophic_level in ("Carnivore", "Apex"))

    timeline.append(GridTimelinePoint(
        year=0,
        cells=year_cells,
        populations=global_pops_t0,
        nutrients=global_nuts_t0,
        plants=round(t0_plants, 2),
        rabbits=round(t0_rabbits, 2),
        wolves=round(t0_wolves, 2),
    ))

    # Solve for 29 years
    dt = 0.1
    substeps = 10

    # Retrieve parameters from request if available, otherwise use defaults
    co2 = getattr(abiotic, "co2", 420.0)
    relative_humidity = getattr(abiotic, "relative_humidity", 65.0)
    light_intensity = getattr(abiotic, "light_intensity", 800.0)
    disturbance_type = getattr(request, "disturbance_type", "None")
    disturbance_cells = getattr(request, "disturbance_cells", [])
    dist_set = {tuple(cell) for cell in disturbance_cells}

    for year in range(1, 30):
        # Stressor Eutrophication Pulse in Year 1
        if request.eutrophication_pulse and year == 1:
            for (x, y) in nutrients_grid:
                nutrients_grid[(x, y)]["N"] += 200.0
                nutrients_grid[(x, y)]["P"] += 50.0
                soil_ammonium_grid[(x, y)] += 100.0
                soil_nitrate_grid[(x, y)] += 100.0

        for substep_idx in range(substeps):
            # Compute current temperature under Climate Warming
            t_current = abiotic.temperature + request.climate_warming_rate * (year - 1 + substep_idx * dt)
            
            # Step 1: Local equations (Euler)
            new_grid = {}
            new_nutrients_grid = {}
            new_toxin_grid = {}
            new_species_toxin_grid = {}
            new_cell_hypoxic_grid = {}

            # Process spatial disturbances painted by the student in Year 1 Substep 0
            if year == 1 and substep_idx == 0 and disturbance_type != "None" and dist_set:
                for (x, y) in dist_set:
                    if (x, y) in grid:
                        if disturbance_type == "fire":
                            # Burn 90% of all populations
                            for sp in active_sp:
                                cleared_mass = grid[(x, y)][sp.id] * 0.9
                                grid[(x, y)][sp.id] -= cleared_mass
                                # Ash nutrient return
                                som_active_c_grid[(x, y)] += cleared_mass * 0.8
                                soil_ammonium_grid[(x, y)] += cleared_mass * 0.12
                            toxin_grid[(x, y)] *= 0.5  # volatilize some toxin
                        elif disturbance_type == "logging":
                            # Deforest 95% of wood producers
                            for sp in active_sp:
                                if sp.id in ("oak", "pine", "birch"):
                                    grid[(x, y)][sp.id] *= 0.05
                        elif disturbance_type == "grazing":
                            # Graze 50% of producers, add manure
                            for sp in active_sp:
                                if sp.trophic_level == "Producer":
                                    cleared_mass = grid[(x, y)][sp.id] * 0.5
                                    grid[(x, y)][sp.id] -= cleared_mass
                                    soil_ammonium_grid[(x, y)] += cleared_mass * 0.12
                                    nutrients_grid[(x, y)]["P"] += cleared_mass * 0.02

            for (x, y), state in grid.items():
                cell_pops = {}
                cell_nuts = nutrients_grid[(x, y)].copy()
                cell_toxin = toxin_grid[(x, y)]
                sp_toxin = species_toxin_grid[(x, y)].copy()
                
                # Heavy Metal Toxin Influx
                if request.toxin_influx_rate > 0:
                    cell_toxin += request.toxin_influx_rate * dt
                
                # Check for hypoxia
                total_producer_biomass = sum(state[sp.id] for sp in active_sp if sp.trophic_level == "Producer")
                is_hypoxic = total_producer_biomass > 800.0
                new_cell_hypoxic_grid[(x, y)] = is_hypoxic
                
                # Solve photosynthesis and stomatal conductance for this cell
                gs_sum = 0.0
                for sp in active_sp:
                    if sp.trophic_level == "Producer":
                        pathway = getattr(sp, "photosynthetic_pathway", "C3")
                        _, gs_sp = compute_photosynthesis(
                            pathway, co2, t_current, relative_humidity,
                            light_intensity, soil_moisture_grid[(x, y)], sp.growth_rate
                        )
                        gs_sum += gs_sp * state[sp.id]

                # Hydrology Penman-Monteith Evapotranspiration
                ET_scaled, H_sensible, LE_latent = compute_evapotranspiration(
                    t_current, relative_humidity, light_intensity, gs_sum, soil_moisture_grid[(x, y)]
                )
                evapotranspiration_grid[(x, y)] = ET_scaled
                sensible_heat_grid[(x, y)] = H_sensible
                latent_heat_grid[(x, y)] = LE_latent

                # Water balance update
                precip_rate = (abiotic.rainfall / 365.0) * dt
                theta_new = soil_moisture_grid[(x, y)] + (precip_rate - ET_scaled)
                if theta_new > 0.40:
                    runoff_val = theta_new - 0.40
                    theta_new = 0.40
                else:
                    runoff_val = 0.0
                    if theta_new < 0.05:
                        theta_new = 0.05
                soil_moisture_grid[(x, y)] = theta_new

                # Species-level thermal scaling & toxin health modifiers
                pop_changes = {}
                fluxes = {}  # Track predator feeding for biomagnification: (pred, prey) -> mass rate
                
                for idx, sp in enumerate(active_sp):
                    X_i = state[sp.id]
                    if X_i <= 0:
                        cell_pops[sp.id] = 0.0
                        pop_changes[sp.id] = 0.0
                        continue
                    
                    # Thermal niche scaling
                    T_scale = np.exp(-((t_current - sp.thermal_optimum) ** 2) / (2.0 * (sp.niche_width ** 2)))
                    
                    if sp.trophic_level == "Producer":
                        # Autotrophic growth rate scaled by explicit carbon assimilation
                        pathway = getattr(sp, "photosynthetic_pathway", "C3")
                        A_sp, _ = compute_photosynthesis(
                            pathway, co2, t_current, relative_humidity,
                            light_intensity, soil_moisture_grid[(x, y)], sp.growth_rate
                        )
                        r_i = A_sp * T_scale
                    else:
                        # Consumers die faster if temperature departs from optimum
                        r_i = r_vec[idx] / max(0.1, T_scale)
                        
                        # Hypoxic mortality multiplier for consumers (3x death rate)
                        if is_hypoxic:
                            r_i = r_i * 3.0

                    # Toxin toxicity effect: if concentration > 2.0 Hg units/biomass, increase mortality rate
                    tox_conc = sp_toxin[sp.id] / X_i
                    if tox_conc > 2.0:
                        r_i = r_i - 0.1 * (tox_conc - 2.0)
                    
                    # Compute interactions
                    interaction_sum = 0.0
                    for jdx, sp_j in enumerate(active_sp):
                        X_j = state[sp_j.id]
                        A_ij_cell = A_mat[idx, jdx] * 100.0
                        interaction_sum += A_ij_cell * X_j
                        
                        # Track feeding flux (only when j is predator eating i, meaning A_ji > 0)
                        if sp_j.trophic_level != "Producer" and A_mat[jdx, idx] > 0 and X_i > 0 and X_j > 0:
                            # flux = consumption rate of prey i by predator j
                            flux = A_mat[jdx, idx] * 100.0 * X_i * X_j
                            fluxes[(sp_j.id, sp.id)] = flux
                    
                    # Allee effect (depensation): if population below Allee threshold,
                    # effective growth rate is penalized proportionally.
                    allee_t = getattr(sp, "allee_threshold", 0.0)
                    if allee_t > 0 and X_i < allee_t:
                        allee_factor = X_i / allee_t  # 0..1, reduces r at low density
                        r_i = r_i * allee_factor

                    d_pop = X_i * (r_i + interaction_sum)
                    cell_pops[sp.id] = max(0.0, X_i + d_pop * dt)
                    pop_changes[sp.id] = cell_pops[sp.id] - X_i

                # Century Soil Carbon and Nitrogen decomposition kinetics
                T_soil = np.exp(0.07 * (t_current - 20.0))
                W_soil = soil_moisture_grid[(x, y)] / 0.30
                
                k_active = 0.05 * dt * T_soil * W_soil
                k_slow = 0.005 * dt * T_soil * W_soil
                k_passive = 0.0002 * dt * T_soil * W_soil
                
                dec_active_c = k_active * som_active_c_grid[(x, y)]
                dec_slow_c = k_slow * som_slow_c_grid[(x, y)]
                dec_passive_c = k_passive * som_passive_c_grid[(x, y)]
                
                som_active_c_grid[(x, y)] = max(0.0, som_active_c_grid[(x, y)] - dec_active_c)
                som_slow_c_grid[(x, y)] = max(0.0, som_slow_c_grid[(x, y)] - dec_slow_c + dec_active_c * 0.4)
                som_passive_c_grid[(x, y)] = max(0.0, som_passive_c_grid[(x, y)] - dec_passive_c + dec_slow_c * 0.5)

                dec_active_n = k_active * som_active_n_grid[(x, y)]
                dec_slow_n = k_slow * som_slow_n_grid[(x, y)]
                dec_passive_n = k_passive * som_passive_n_grid[(x, y)]

                som_active_n_grid[(x, y)] = max(0.0, som_active_n_grid[(x, y)] - dec_active_n)
                som_slow_n_grid[(x, y)] = max(0.0, som_slow_n_grid[(x, y)] - dec_slow_n + dec_active_n * 0.4)
                som_passive_n_grid[(x, y)] = max(0.0, som_passive_n_grid[(x, y)] - dec_passive_n + dec_slow_n * 0.5)

                # Net mineralized nitrogen enters soil ammonium pool
                mineralized_n = dec_active_n + dec_slow_n + dec_passive_n
                soil_ammonium_grid[(x, y)] += mineralized_n

                # Element recycling from dead biomass
                for sp in active_sp:
                    death_biomass = max(0.0, -pop_changes[sp.id])
                    if death_biomass > 0:
                        som_active_c_grid[(x, y)] += death_biomass * 0.70
                        som_slow_c_grid[(x, y)] += death_biomass * 0.30
                        
                        cn_ratio = 40.0 if sp.trophic_level == "Producer" else 10.0
                        death_n = death_biomass / cn_ratio
                        som_active_n_grid[(x, y)] += death_n * 0.70
                        som_slow_n_grid[(x, y)] += death_n * 0.30
                        
                        p_ratio = 400.0 if sp.trophic_level == "Producer" else 100.0
                        cell_nuts["P"] += death_biomass / p_ratio

                # Nitrogen transformations: Nitrification, Denitrification, BNF
                saturation = soil_moisture_grid[(x, y)] / 0.40
                nitrif_rate = 0.1 * soil_ammonium_grid[(x, y)] * dt * T_soil * max(0.0, 1.0 - saturation)
                soil_ammonium_grid[(x, y)] = max(0.0, soil_ammonium_grid[(x, y)] - nitrif_rate)
                soil_nitrate_grid[(x, y)] += nitrif_rate

                denitrif_rate = 0.2 * soil_nitrate_grid[(x, y)] * dt * T_soil * max(0.0, saturation - 0.7) ** 2
                soil_nitrate_grid[(x, y)] = max(0.0, soil_nitrate_grid[(x, y)] - denitrif_rate)

                bnf_rate = 0.05 * total_producer_biomass * max(0.0, 15.0 - (soil_ammonium_grid[(x, y)] + soil_nitrate_grid[(x, y)])) * dt
                soil_ammonium_grid[(x, y)] += bnf_rate

                # Store total carbon and nitrogen for Liebig Law solver compatibility
                cell_nuts["N"] = float(soil_ammonium_grid[(x, y)] + soil_nitrate_grid[(x, y)])
                cell_nuts["C"] = float(som_active_c_grid[(x, y)] + som_slow_c_grid[(x, y)] + som_passive_c_grid[(x, y)])
                
                # Toxin bioaccumulation and biomagnification steps
                new_sp_toxin = {sp.id: sp_toxin[sp.id] for sp in active_sp}
                
                if request.toxin_influx_rate > 0:
                    # 1. Producer Bioaccumulation from soil pool
                    for sp in active_sp:
                        if sp.trophic_level == "Producer" and cell_pops[sp.id] > 0:
                            # Absorption rate proportional to soil toxin and producer biomass
                            absorption = 0.1 * cell_toxin * state[sp.id] * dt
                            cell_toxin = max(0.0, cell_toxin - absorption)
                            new_sp_toxin[sp.id] += absorption
                            
                            # Depuration (excretion)
                            depur = 0.05 * new_sp_toxin[sp.id] * dt
                            new_sp_toxin[sp.id] = max(0.0, new_sp_toxin[sp.id] - depur)
                            cell_toxin += depur
                    
                    # 2. Consumer Biomagnification (Trophodynamics transfer)
                    for (pred_id, prey_id), flux in fluxes.items():
                        prey_pop = state[prey_id]
                        if prey_pop > 0:
                            # Calculate toxin concentration in prey
                            prey_conc = new_sp_toxin[prey_id] / prey_pop
                            # Mass of toxin eaten
                            toxin_ingested = flux * prey_conc * dt
                            # Transfer with biomagnification multiplier of 1.5
                            transfer_mass = toxin_ingested * 1.5
                            
                            new_sp_toxin[prey_id] = max(0.0, new_sp_toxin[prey_id] - toxin_ingested)
                            new_sp_toxin[pred_id] += transfer_mass
                    
                    # 3. Consumer depuration
                    for sp in active_sp:
                        if sp.trophic_level != "Producer" and cell_pops[sp.id] > 0:
                            depur = 0.02 * new_sp_toxin[sp.id] * dt
                            new_sp_toxin[sp.id] = max(0.0, new_sp_toxin[sp.id] - depur)
                            cell_toxin += depur

                # Ensure species toxin mass falls to zero if population is extinct
                for sp in active_sp:
                    if cell_pops[sp.id] <= 0:
                        cell_toxin += new_sp_toxin[sp.id]
                        new_sp_toxin[sp.id] = 0.0

                new_grid[(x, y)] = cell_pops
                new_nutrients_grid[(x, y)] = cell_nuts
                new_toxin_grid[(x, y)] = cell_toxin
                new_species_toxin_grid[(x, y)] = new_sp_toxin

            grid = new_grid
            nutrients_grid = new_nutrients_grid
            toxin_grid = new_toxin_grid
            species_toxin_grid = new_species_toxin_grid
            cell_hypoxic_grid = new_cell_hypoxic_grid

            # Step 2: Spatial migration Suitability
            suitability = {sp.id: {} for sp in active_sp if sp.trophic_level != "Producer"}
            for (x, y), state in grid.items():
                for idx, sp in enumerate(active_sp):
                    if sp.trophic_level == "Producer":
                        continue
                    
                    # Crowding penalty
                    suit = A_mat[idx, idx] * state[sp.id]
                    
                    for jdx, sp_j in enumerate(active_sp):
                        if idx == jdx:
                            continue
                        coef_i_j = A_mat[idx, jdx]
                        coef_j_i = A_mat[jdx, idx]
                        
                        if coef_i_j > 0: # Food attraction
                            suit += 0.08 * state[sp_j.id]
                        if coef_j_i < 0: # Predator repulsion
                            suit += -0.5 * state[sp_j.id]
                    suitability[sp.id][(x, y)] = suit

            # Compute outflows
            outflows = {sp.id: {(x, y): [] for x in range(10) for y in range(10)} for sp in active_sp if sp.trophic_level != "Producer"}
            for sp in active_sp:
                if sp.trophic_level == "Producer":
                    continue
                sp_id = sp.id
                for (x, y), state in grid.items():
                    pop = state[sp_id]
                    if pop <= 0:
                        continue
                    
                    neighbors = get_neighbors_with_barrier(x, y)
                    total_out = 0.0
                    outs = []
                    for nx, ny in neighbors:
                        diff = suitability[sp_id][(nx, ny)] - suitability[sp_id][(x, y)]
                        if diff > 0:
                            flux = 0.2 * diff * pop * dt
                            outs.append(((nx, ny), flux))
                            total_out += flux
                    
                    if total_out > 0.8 * pop:
                        scale = (0.8 * pop) / total_out
                        outs = [(n, f * scale) for n, f in outs]
                    outflows[sp_id][(x, y)] = outs

            # Apply migration to populations and their toxins
            migration_grid = {k: {**v} for k, v in grid.items()}
            migration_toxin = {k: {**v} for k, v in species_toxin_grid.items()}
            for sp in active_sp:
                if sp.trophic_level == "Producer":
                    continue
                sp_id = sp.id
                for (x, y) in grid:
                    out_list = outflows[sp_id][(x, y)]
                    total_out_flux = sum(f for _, f in out_list)
                    
                    # Calculate toxin fraction to move with migrating pop
                    tox_mass = species_toxin_grid[(x, y)][sp_id]
                    fraction_migrated = total_out_flux / max(1e-5, grid[(x, y)][sp_id])
                    migrated_tox_mass = tox_mass * fraction_migrated
                    
                    migration_grid[(x, y)][sp_id] -= total_out_flux
                    migration_toxin[(x, y)][sp_id] -= migrated_tox_mass
                    
                    for dest, flux in out_list:
                        migration_grid[dest][sp_id] += flux
                        # Move proportional toxin mass to destination
                        fraction_dest = flux / max(1e-5, total_out_flux)
                        migration_toxin[dest][sp_id] += migrated_tox_mass * fraction_dest
            grid = migration_grid
            species_toxin_grid = migration_toxin

        # Record Year
        year_cells = []
        for x in range(10):
            for y in range(10):
                rounded_pops = {sp_id: round(max(0.0, val), 2) for sp_id, val in grid[(x, y)].items()}
                rounded_nuts = {nut: round(max(0.0, val), 2) for nut, val in nutrients_grid[(x, y)].items()}
                c_plants = sum(rounded_pops[sp.id] for sp in active_sp if sp.trophic_level == "Producer")
                c_rabbits = sum(rounded_pops[sp.id] for sp in active_sp if sp.trophic_level == "Herbivore")
                c_wolves = sum(rounded_pops[sp.id] for sp in active_sp if sp.trophic_level in ("Carnivore", "Apex"))
                
                # Toxin concentration in cell
                tot_bio = sum(grid[(x, y)][sp.id] for sp in active_sp)
                tot_tox = sum(species_toxin_grid[(x, y)][sp.id] for sp in active_sp) + toxin_grid[(x, y)]
                cell_tox_conc = tot_tox / max(1e-5, tot_bio) if tot_bio > 0 else 0.0

                year_cells.append(GridCell(
                    x=x, y=y, populations=rounded_pops, nutrients=rounded_nuts,
                    plants=round(c_plants, 2), rabbits=round(c_rabbits, 2), wolves=round(c_wolves, 2),
                    toxin_concentration=round(cell_tox_conc, 4), hypoxic=cell_hypoxic_grid[(x, y)],
                    soil_moisture=round(soil_moisture_grid[(x, y)], 4),
                    evapotranspiration=round(evapotranspiration_grid[(x, y)], 4),
                    sensible_heat=round(sensible_heat_grid[(x, y)], 4),
                    latent_heat=round(latent_heat_grid[(x, y)], 4),
                    som_active_c=round(som_active_c_grid[(x, y)], 2),
                    som_slow_c=round(som_slow_c_grid[(x, y)], 2),
                    som_passive_c=round(som_passive_c_grid[(x, y)], 2),
                    soil_ammonium=round(soil_ammonium_grid[(x, y)], 2),
                    soil_nitrate=round(soil_nitrate_grid[(x, y)], 2)
                ))

        global_pops = {sp.id: 0.0 for sp in active_sp}
        global_nuts = {"C": 0.0, "N": 0.0, "P": 0.0}
        for c in year_cells:
            for sp_id, val in c.populations.items():
                global_pops[sp_id] += val
            for nut, val in c.nutrients.items():
                global_nuts[nut] += val
        global_pops = {sp_id: round(val, 2) for sp_id, val in global_pops.items()}
        global_nuts = {nut: round(val / 100.0, 2) for nut, val in global_nuts.items()}

        g_plants = sum(c.plants for c in year_cells)
        g_rabbits = sum(c.rabbits for c in year_cells)
        g_wolves = sum(c.wolves for c in year_cells)

        timeline.append(GridTimelinePoint(
            year=year,
            cells=year_cells,
            populations=global_pops,
            nutrients=global_nuts,
            plants=round(g_plants, 2),
            rabbits=round(g_rabbits, 2),
            wolves=round(g_wolves, 2),
        ))

    params_dict = {
        "r": float(0.45 * prod_r_modifier),
        "K": float(860.0 * prod_K_modifier),
        "link_strength": link_strength,
    }

    if isinstance(request_or_initial, InitialPopulations):
        return timeline, params_dict  # type: ignore
    return timeline, params_dict, stability


def run_biodiversity_experiment(request: BiodiversityLabRequest) -> list[BiodiversityLabPoint]:
    """
    Runs 10 separate batch simulations of 30 years with species richness varying from 1 to 10 (or up to 12).
    In each batch, we select K producer species from the request.species_ids pool.
    Returns richness, yield (total producer biomass at year 30), and stability (1/CV of biomass over years 10-30).
    """
    from .biomes import BIOMES
    biome_preset = BIOMES.get(request.biome, BIOMES["forest"])
    
    # Extract producer species matching the requested list
    requested_ids = set(request.species_ids)
    all_producers = [sp for sp in biome_preset.species if sp.trophic_level == "Producer" and sp.id in requested_ids]
    
    if not all_producers:
        # Fallback if no specific species list sent: take all biome producers
        all_producers = [sp for sp in biome_preset.species if sp.trophic_level == "Producer"]
        
    results = []
    max_richness = min(12, len(all_producers))
    if max_richness == 0:
        return []

    # Run batches from richness = 1 up to max_richness
    for richness in range(1, max_richness + 1):
        # Sample 'richness' number of producers
        selected_producers = random.sample(all_producers, richness)
        selected_ids = {sp.id for sp in selected_producers}
        
        # Build dynamic SpeciesConfig list for this simulation
        species_configs = []
        for sp in biome_preset.species:
            active = False
            init_pop = 0.0
            if sp.trophic_level == "Producer":
                if sp.id in selected_ids:
                    active = True
                    init_pop = 400.0 / richness  # Distribute initial biomass evenly
            else:
                # Keep standard consumers active for dynamic checks
                active = sp.active
                init_pop = sp.initial_pop if sp.active else 0.0
            
            species_configs.append(SpeciesConfig(
                id=sp.id,
                name=sp.name,
                trophic_level=sp.trophic_level,
                growth_rate=sp.growth_rate,
                initial_pop=init_pop,
                active=active,
                thermal_optimum=sp.thermal_optimum,
                niche_width=sp.niche_width,
                toxin_level=0.0
            ))
            
        # Run simulation with standard abiotic factors (temp=20, rainfall=700, nitrogen=50)
        sim_req = SimulationRequest(
            biome=request.biome,
            species=species_configs,
            abiotic_factors=AbioticFactors(rainfall=700.0, temperature=20.0, nitrogen=50.0),
            link_strength=1.0,
            corridor_y=None,
            eutrophication_pulse=False,
            climate_warming_rate=0.0,
            toxin_influx_rate=0.0
        )
        
        # Run 30-year simulation
        timeline, _, _ = run_simulation(sim_req)
        
        # Calculate yield at year 30
        last_point = timeline[-1]
        tot_yield = sum(last_point.populations.get(sp.id, 0.0) for sp in selected_producers)
        
        # Calculate stability (1 / CV) of total producer biomass over years 10-29
        producer_biomass_history = []
        for point in timeline[10:]: # Years 10 to 29
            yr_bio = sum(point.populations.get(sp.id, 0.0) for sp in selected_producers)
            producer_biomass_history.append(yr_bio)
            
        mean_bio = np.mean(producer_biomass_history) if producer_biomass_history else 0.0
        std_bio = np.std(producer_biomass_history) if producer_biomass_history else 0.0
        
        # Stability is mean/std (or 1/CV). Cap at 50 to avoid division by zero or infinite values
        stability = (mean_bio / std_bio) if std_bio > 1e-4 else 50.0
        stability = min(50.0, max(0.0, stability))
        
        results.append(BiodiversityLabPoint(
            richness=richness,
            yield_=round(float(tot_yield), 2),
            stability=round(float(stability), 2)
        ))
        
    return results


def run_hysteresis_experiment(request: HysteresisRequest) -> list[HysteresisPoint]:
    inflows = request.inflow_range
    if not inflows:
        inflows = np.linspace(0.0, 15.0, 40).tolist()
        
    s = 0.6
    r = 5.0
    m = 4.0
    q = 8.0
    dt = 0.1
    steps = 150
    
    points = []
    
    # Forward pathway (ramping up)
    P = 1.0
    for inflow in inflows:
        for _ in range(steps):
            recycle = r * (P ** q) / ((P ** q) + (m ** q)) if P > 0 else 0.0
            dP = (inflow - s * P + recycle) * dt
            P = max(0.0, P + dP)
            
        state = "Macrophyte (Clear)" if P < 4.0 else "Phytoplankton (Turbid)"
        points.append(HysteresisPoint(inflow=round(inflow, 2), phosphorus=round(P, 3), state=state))
        
    # Backward pathway (ramping down)
    P = 15.0
    for inflow in reversed(inflows):
        for _ in range(steps):
            recycle = r * (P ** q) / ((P ** q) + (m ** q)) if P > 0 else 0.0
            dP = (inflow - s * P + recycle) * dt
            P = max(0.0, P + dP)
            
        state = "Macrophyte (Clear)" if P < 4.0 else "Phytoplankton (Turbid)"
        points.append(HysteresisPoint(inflow=round(inflow, 2), phosphorus=round(P, 3), state=state))
        
    return points


def run_leslie_matrix_projection(request: LeslieMatrixRequest) -> LeslieMatrixResponse:
    """
    Projects an age-structured population forward using a Leslie matrix.

    The Leslie matrix L is:
      - First row: fecundity (reproductive output per age class)
      - Sub-diagonal: survival probabilities (fraction surviving to next class)

    Returns per-year total N, age-class distribution, and lambda (growth rate).
    Also computes the dominant eigenvalue (long-run asymptotic growth rate),
    stable age distribution (right eigenvector), and reproductive values (left eigenvector).
    """
    fecundity = np.array(request.fecundity, dtype=float)
    survival = np.array(request.survival, dtype=float)
    n_classes = len(fecundity)
    n_surv = len(survival)

    # Validate dimensions
    if n_surv != n_classes - 1:
        # Truncate or pad survival to match
        if n_surv > n_classes - 1:
            survival = survival[:n_classes - 1]
        else:
            survival = np.pad(survival, (0, n_classes - 1 - n_surv), constant_values=0.5)

    # Build Leslie matrix
    L = np.zeros((n_classes, n_classes))
    L[0, :] = fecundity  # Fecundity row
    for i in range(n_classes - 1):
        L[i + 1, i] = survival[i]  # Sub-diagonal survival

    # Initial age distribution
    n_init = np.array(request.initial_distribution, dtype=float)
    if len(n_init) != n_classes:
        n_init = np.ones(n_classes) * (float(n_init[0]) if len(n_init) > 0 else 100.0)

    # Project forward
    data: list[LeslieMatrixPoint] = []
    n_t = n_init.copy()

    for year in range(request.years + 1):
        total_n = float(np.sum(n_t))

        if year > 0:
            prev_total = data[-1].total if data else total_n
            lam = float(total_n / max(1e-10, prev_total))
        else:
            lam = 1.0

        data.append(LeslieMatrixPoint(
            year=year,
            total=round(total_n, 2),
            age_classes=[round(float(x), 2) for x in n_t],
            growth_rate=round(lam, 4)
        ))

        # Advance one time step
        n_t = L @ n_t
        n_t = np.maximum(0.0, n_t)

    # Compute dominant eigenvalue and eigenvectors
    try:
        eigenvalues, eigenvectors = np.linalg.eig(L)
        idx = int(np.argmax(np.real(eigenvalues)))
        lambda_dom = float(np.real(eigenvalues[idx]))

        # Stable age distribution: right eigenvector normalized
        right_ev = np.real(eigenvectors[:, idx])
        right_ev = np.abs(right_ev)
        ev_sum = right_ev.sum()
        if ev_sum > 1e-10:
            right_ev = right_ev / ev_sum
        stable_age = [round(float(v), 4) for v in right_ev]

        # Reproductive values: left eigenvectors of L (= right eigenvectors of L^T)
        _, left_evecs = np.linalg.eig(L.T)
        left_ev = np.real(left_evecs[:, idx])
        left_ev = np.abs(left_ev)
        if left_ev[0] > 1e-10:
            left_ev = left_ev / left_ev[0]
        repro_val = [round(float(v), 4) for v in left_ev]

    except Exception:
        lambda_dom = 1.0
        stable_age = [round(1.0 / n_classes, 4)] * n_classes
        repro_val = [1.0] * n_classes

    return LeslieMatrixResponse(
        data=data,
        lambda_dominant=round(lambda_dom, 4),
        stable_age_distribution=stable_age,
        reproductive_value=repro_val,
    )
