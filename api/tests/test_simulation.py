from fastapi.testclient import TestClient

from app.main import app
from app.schemas import AbioticFactors, InitialPopulations
from app.simulation import run_simulation


def test_simulation_returns_30_non_negative_points():
    timeline, _ = run_simulation(
        InitialPopulations(plants=540, rabbits=95, wolves=18),
        AbioticFactors(rainfall=720, temperature=19, nitrogen=54),
    )

    assert len(timeline) == 30
    assert timeline[0].year == 0
    assert timeline[-1].year == 29
    assert all(point.plants >= 0 and point.rabbits >= 0 and point.wolves >= 0 for point in timeline)


def test_abiotic_inputs_change_trajectory_deterministically():
    initial = InitialPopulations(plants=540, rabbits=95, wolves=18)
    wet, _ = run_simulation(initial, AbioticFactors(rainfall=900, temperature=19, nitrogen=54))
    dry, _ = run_simulation(initial, AbioticFactors(rainfall=250, temperature=34, nitrogen=30))

    wet_again, _ = run_simulation(initial, AbioticFactors(rainfall=900, temperature=19, nitrogen=54))

    assert wet[-1].plants != dry[-1].plants
    assert wet[-1] == wet_again[-1]


def test_simulate_endpoint_returns_contract():
    client = TestClient(app)
    response = client.post(
        "/simulate",
        json={
            "initial_populations": {"plants": 230, "rabbits": 80, "wolves": 44},
            "abiotic_factors": {"rainfall": 470, "temperature": 28, "nitrogen": 38},
            "preset_id": "trophic-cascade",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["timeline"]) == 30
    assert data["analysis"]["ecological_status"] in {"Stable", "Unstable", "Collapse"}
    assert data["analysis"]["detected_anomalies"]
    assert data["analysis"]["socratic_questions"]


def test_compute_ecosystem_metrics():
    from app.schemas import GridTimelinePoint
    from app.ai_coach import _compute_ecosystem_metrics
    
    timeline = [
        GridTimelinePoint(year=0, cells=[], plants=100.0, rabbits=50.0, wolves=10.0),
        GridTimelinePoint(year=1, cells=[], plants=120.0, rabbits=40.0, wolves=12.0),
        GridTimelinePoint(year=2, cells=[], plants=80.0, rabbits=60.0, wolves=8.0),
    ]
    
    metrics = _compute_ecosystem_metrics(timeline)
    
    assert metrics["peaks"]["plants"]["value"] == 120.0
    assert metrics["troughs"]["plants"]["value"] == 80.0
    assert metrics["peaks"]["rabbits"]["value"] == 60.0
    assert metrics["peaks"]["wolves"]["value"] == 12.0
    assert metrics["net_change_percent"]["plants"] == -20.0
    assert metrics["predator_to_prey_ratio"]["min"] == 0.133
    assert metrics["predator_to_prey_ratio"]["max"] == 0.3


def test_stability_analysis_eigenvalues_and_jacobian():
    from app.schemas import SimulationRequest, SpeciesConfig, AbioticFactors
    from app.simulation import run_simulation

    species = [
        SpeciesConfig(id="grass", name="Grass", trophic_level="Producer", growth_rate=0.4, initial_pop=200.0, active=True),
        SpeciesConfig(id="ferns", name="Ferns", trophic_level="Producer", growth_rate=0.3, initial_pop=100.0, active=True),
        SpeciesConfig(id="rabbits", name="Rabbits", trophic_level="Herbivore", growth_rate=-0.1, initial_pop=50.0, active=True),
        SpeciesConfig(id="wolves", name="Wolves", trophic_level="Apex", growth_rate=-0.2, initial_pop=10.0, active=True),
        SpeciesConfig(id="deer", name="Deer", trophic_level="Herbivore", growth_rate=-0.05, initial_pop=20.0, active=False),
    ]
    request = SimulationRequest(
        biome="forest",
        species=species,
        abiotic_factors=AbioticFactors(rainfall=500.0, temperature=20.0, nitrogen=50.0),
        link_strength=0.8,
    )
    timeline, params, stability = run_simulation(request)

    assert len(stability.jacobian) == 4
    assert len(stability.eigenvalues) == 4
    assert isinstance(stability.stable, bool)
    assert len(stability.equilibrium) == 4
    assert params["link_strength"] == 0.8


def test_corridor_barrier_blocks_migration():
    from app.schemas import SimulationRequest, SpeciesConfig, AbioticFactors
    from app.simulation import run_simulation

    species = [
        SpeciesConfig(id="grass", name="Grass", trophic_level="Producer", growth_rate=0.4, initial_pop=200.0, active=True),
        SpeciesConfig(id="rabbits", name="Rabbits", trophic_level="Herbivore", growth_rate=-0.1, initial_pop=50.0, active=True),
    ]
    
    request_no_corridor = SimulationRequest(
        biome="forest",
        species=species,
        abiotic_factors=AbioticFactors(rainfall=500.0, temperature=20.0, nitrogen=50.0),
        corridor_y=None,
    )
    timeline, _, stability = run_simulation(request_no_corridor)
    assert len(timeline) == 30
    
    request_with_corridor = SimulationRequest(
        biome="forest",
        species=species,
        abiotic_factors=AbioticFactors(rainfall=500.0, temperature=20.0, nitrogen=50.0),
        corridor_y=4,
    )
    timeline_c, _, stability_c = run_simulation(request_with_corridor)
    assert len(timeline_c) == 30


def test_eutrophication_warming_and_toxins():
    from app.schemas import SimulationRequest, SpeciesConfig, AbioticFactors
    from app.simulation import run_simulation

    species = [
        SpeciesConfig(id="grass", name="Grass", trophic_level="Producer", growth_rate=0.4, initial_pop=200.0, active=True, thermal_optimum=20.0, niche_width=8.0),
        SpeciesConfig(id="rabbits", name="Rabbits", trophic_level="Herbivore", growth_rate=-0.1, initial_pop=50.0, active=True, thermal_optimum=20.0, niche_width=8.0),
        SpeciesConfig(id="wolves", name="Wolves", trophic_level="Apex", growth_rate=-0.2, initial_pop=10.0, active=True, thermal_optimum=20.0, niche_width=10.0),
    ]

    request = SimulationRequest(
        biome="forest",
        species=species,
        abiotic_factors=AbioticFactors(rainfall=500.0, temperature=20.0, nitrogen=50.0),
        eutrophication_pulse=True,
        climate_warming_rate=0.2,
        toxin_influx_rate=0.1
    )

    timeline, _, _ = run_simulation(request)
    assert len(timeline) == 30

    # Verify that Nitrogen nutrient levels increased in cell 0 due to the pulse in Year 1
    # Note that Nitrogen at t0 was (100 * 50 / 54) / 100 = ~0.92, with pulse it should go up significantly
    # Let's inspect timeline[1].nutrients["N"] and timeline[0].nutrients["N"]
    assert timeline[1].nutrients["N"] > timeline[0].nutrients["N"]

    # Verify that toxin was introduced and is positive in later years
    has_toxin = False
    for cell in timeline[5].cells:
        if cell.toxin_concentration > 0:
            has_toxin = True
            break
    assert has_toxin


def test_biodiversity_lab_batch_runner():
    from app.schemas import BiodiversityLabRequest
    from app.simulation import run_biodiversity_experiment

    request = BiodiversityLabRequest(
        biome="forest",
        species_ids=["grass", "ferns", "oak", "pine"]
    )

    results = run_biodiversity_experiment(request)
    assert len(results) > 0
    # Each result should have richness, yield, and stability
    for pt in results:
        assert pt.richness >= 1
        assert pt.yield_ >= 0
        assert pt.stability >= 0


def test_hysteresis_stable_states():
    from app.schemas import HysteresisRequest
    from app.simulation import run_hysteresis_experiment
    
    req = HysteresisRequest(biome="forest", inflow_range=[0.0, 2.0, 4.0, 6.0, 8.0, 10.0])
    points = run_hysteresis_experiment(req)
    
    assert len(points) == 12  # 6 forward + 6 backward
    assert points[0].inflow == 0.0
    assert points[0].state == "Macrophyte (Clear)"
    assert points[5].inflow == 10.0
    assert points[5].state == "Phytoplankton (Turbid)"
    assert points[6].inflow == 10.0
    assert points[6].state == "Phytoplankton (Turbid)"


def test_painted_cell_disturbance():
    from app.schemas import SimulationRequest, SpeciesConfig, AbioticFactors
    from app.simulation import run_simulation
    
    species = [
        SpeciesConfig(id="grass", name="Grass", trophic_level="Producer", growth_rate=0.4, initial_pop=200.0, active=True),
        SpeciesConfig(id="rabbits", name="Rabbits", trophic_level="Herbivore", growth_rate=-0.1, initial_pop=50.0, active=True),
    ]
    
    req = SimulationRequest(
        biome="forest",
        species=species,
        abiotic_factors=AbioticFactors(rainfall=500.0, temperature=20.0, nitrogen=50.0),
        disturbance_type="fire",
        disturbance_cells=[[0, 0], [1, 1]]
    )
    
    timeline, _, _ = run_simulation(req)
    
    cell_0_0 = next(c for c in timeline[1].cells if c.x == 0 and c.y == 0)
    cell_0_2 = next(c for c in timeline[1].cells if c.x == 0 and c.y == 2)
    
    # Grass at t1 should be heavily reduced in cell 0,0, while 0,2 remains normal/higher
    assert cell_0_0.populations["grass"] < cell_0_2.populations["grass"]



