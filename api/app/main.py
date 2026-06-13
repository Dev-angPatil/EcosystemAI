from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import json

from .ai_coach import get_ai_analysis
from .schemas import (
    SimulationRequest,
    SimulationResponse,
    BiodiversityLabRequest,
    BiodiversityLabResponse,
    HysteresisRequest,
    HysteresisResponse,
    LeslieMatrixRequest,
    LeslieMatrixResponse,
)
from .simulation import run_simulation, run_biodiversity_experiment, run_hysteresis_experiment, run_leslie_matrix_projection

app = FastAPI(title="EcoChain-AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def search_literature(query: str, limit: int = 5) -> list[dict]:
    cli_path = "/home/deu/.gemini/config/plugins/science/skills/literature_search_openalex/scripts/openalex_cli.py"
    cmd = [
        "python", cli_path,
        "filter", "works",
        "--search", query,
        "--per-page", str(limit),
        "--select", "id,display_name,doi,publication_year,abstract_inverted_index"
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        results = []
        for work in data.get("results", []):
            abstract = ""
            inv_index = work.get("abstract_inverted_index")
            if inv_index:
                words = {}
                for word, positions in inv_index.items():
                    for pos in positions:
                        words[pos] = word
                abstract = " ".join([words[p] for p in sorted(words.keys())])
            
            if len(abstract) > 300:
                abstract = abstract[:297] + "..."
                
            results.append({
                "id": work.get("id"),
                "title": work.get("display_name"),
                "doi": work.get("doi") or "",
                "year": work.get("publication_year"),
                "abstract": abstract or "Abstract not available.",
                "source": "OpenAlex"
            })
        return results
    except Exception as e:
        print(f"Literature search error: {e}")
        return []


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/literature/search")
async def lit_search(query: str, limit: int = 5) -> list[dict]:
    return search_literature(query, limit)



@app.post("/simulate", response_model=SimulationResponse)
async def simulate(request: SimulationRequest) -> SimulationResponse:
    timeline, params, stability = run_simulation(request)
    analysis = await get_ai_analysis(
        timeline,
        request.abiotic_factors,
        parameters=params,
        preset_id=request.preset_id,
    )
    return SimulationResponse(
        timeline=timeline,
        analysis=analysis,
        parameters=params,
        stability=stability,
    )


@app.post("/simulate/biodiversity", response_model=BiodiversityLabResponse)
async def simulate_biodiversity(request: BiodiversityLabRequest) -> BiodiversityLabResponse:
    data = run_biodiversity_experiment(request)
    return BiodiversityLabResponse(data=data)


@app.post("/simulate/hysteresis", response_model=HysteresisResponse)
async def simulate_hysteresis(request: HysteresisRequest) -> HysteresisResponse:
    data = run_hysteresis_experiment(request)
    return HysteresisResponse(data=data)


@app.post("/simulate/leslie", response_model=LeslieMatrixResponse)
async def simulate_leslie(request: LeslieMatrixRequest) -> LeslieMatrixResponse:
    """Age-structured Leslie matrix population projection."""
    return run_leslie_matrix_projection(request)

