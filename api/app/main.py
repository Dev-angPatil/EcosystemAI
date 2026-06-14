from fastapi import FastAPI, Depends, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import httpx
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .config import get_settings
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

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="EcoChain-AI API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

settings = get_settings()
origins = [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials="*" not in origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def verify_api_key(x_api_key: str | None = Header(None, alias="X-API-Key")):
    settings = get_settings()
    if settings.api_key:
        if not x_api_key or x_api_key != settings.api_key:
            raise HTTPException(status_code=401, detail="Invalid or missing API Key")



async def search_literature(query: str, limit: int = 5) -> list[dict]:
    url = "https://api.openalex.org/works"
    params = {
        "search": query,
        "per_page": limit,
        "select": "id,display_name,doi,publication_year,abstract_inverted_index"
    }
    headers = {
        "User-Agent": "EcoChain-AI/0.1.0 (mailto:admin@ecochain.ai)"
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()
            
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


@app.get("/literature/search", dependencies=[Depends(verify_api_key)])
@limiter.limit("120/minute")
async def lit_search(request: Request, query: str, limit: int = 5) -> list[dict]:
    return await search_literature(query, limit)


@app.post("/simulate", response_model=SimulationResponse, dependencies=[Depends(verify_api_key)])
@limiter.limit("120/minute")
async def simulate(request: Request, simulation_request: SimulationRequest) -> SimulationResponse:
    timeline, params, stability = run_simulation(simulation_request)
    analysis = await get_ai_analysis(
        timeline,
        simulation_request.abiotic_factors,
        parameters=params,
        preset_id=simulation_request.preset_id,
    )
    return SimulationResponse(
        timeline=timeline,
        analysis=analysis,
        parameters=params,
        stability=stability,
    )


@app.post("/simulate/biodiversity", response_model=BiodiversityLabResponse, dependencies=[Depends(verify_api_key)])
@limiter.limit("120/minute")
async def simulate_biodiversity(request: Request, simulation_request: BiodiversityLabRequest) -> BiodiversityLabResponse:
    data = run_biodiversity_experiment(simulation_request)
    return BiodiversityLabResponse(data=data)


@app.post("/simulate/hysteresis", response_model=HysteresisResponse, dependencies=[Depends(verify_api_key)])
@limiter.limit("120/minute")
async def simulate_hysteresis(request: Request, simulation_request: HysteresisRequest) -> HysteresisResponse:
    data = run_hysteresis_experiment(simulation_request)
    return HysteresisResponse(data=data)


@app.post("/simulate/leslie", response_model=LeslieMatrixResponse, dependencies=[Depends(verify_api_key)])
@limiter.limit("120/minute")
async def simulate_leslie(request: Request, simulation_request: LeslieMatrixRequest) -> LeslieMatrixResponse:
    """Age-structured Leslie matrix population projection."""
    return run_leslie_matrix_projection(simulation_request)


