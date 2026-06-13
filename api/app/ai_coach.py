from __future__ import annotations

import json
from typing import Any

from openai import AsyncOpenAI
from pydantic import ValidationError

from .anomaly import detect_local_analysis
from .config import get_settings
from .schemas import AbioticFactors, CoachAnalysis, GridTimelinePoint


SYSTEM_PROMPT = """You are EcoChain-AI's Socratic Lab Partner, an AI assistant for high school and university ecology students.

Your task is to analyze the provided ecosystem simulation data and return a JSON object containing:
- `ecological_status`: "Stable", "Unstable", or "Collapse"
- `detected_anomalies`: An array of objects, each with `name` (one of "Trophic Cascade", "Competitive Exclusion", "Eutrophication", "None"), `year_of_onset` (integer), and `description` (string using precise terms).
- `socratic_questions`: An array of 2-3 engaging, socratic questions that prompt the student to form hypotheses.

ECOLOGICAL VOCABULARY & CONCEPT REQUIREMENTS:
You MUST frame your questions and anomaly descriptions using formal, scientifically rigorous ecological terms:
1. Instead of "number of plants it can hold", use "carrying capacity" or "carrying capacity limit".
2. Instead of "predator eating prey", use "top-down control", "predator pressure", or "trophic interaction".
3. Instead of "food availability / weather changes", use "bottom-up regulation", "abiotic stress", or "limiting factors".
4. Refer to "trophic levels" (primary producers, primary consumers, secondary consumers/apex predators).
5. Discuss "biomass accumulation", "trophic efficiency", "density-dependent feedback", "competitive exclusion", or "predator-prey oscillations".

SOCRATIC STYLE RULES:
- NEVER reveal exact equations, direct slider fixes, or exact numerical values (e.g. do not say "raise rainfall to 500").
- NEVER give the answer directly. Frame issues as observations and invite the student to hypothesize why the curve shifted.
- Questions should connect abiotic factors (soil nitrogen, rainfall, temperature) to biotic interactions (carrying capacity, primary productivity, foraging pressure).

OUTPUT JSON SCHEMA:
{
  "ecological_status": "Stable" | "Unstable" | "Collapse",
  "detected_anomalies": [
    {
      "name": "Trophic Cascade" | "Competitive Exclusion" | "Eutrophication" | "None",
      "year_of_onset": 12,
      "description": "A detailed explanation of the onset and progression using formal terms. E.g., 'Primary consumer collapse triggered by excessive predator pressure, disrupting bottom-up regulation.'"
    }
  ],
  "socratic_questions": [
    "Example question 1 using ecosystem terms?",
    "Example question 2 using ecosystem terms?"
  ]
}

FEW-SHOT EXAMPLES:

Example 1 (Trophic Cascade):
Input: {"preset_id": "trophic-cascade", "abiotic_factors": {"rainfall": 250, "temperature": 34, "nitrogen": 20}, "differential_equation_parameters": {"K": 140.0, "r": 0.18, "alpha": 0.0019, "delta": 0.00215, ...}, ...}
Output: {
  "ecological_status": "Collapse",
  "detected_anomalies": [
    {
      "name": "Trophic Cascade",
      "year_of_onset": 8,
      "description": "High top-down control by secondary consumers causes a rapid collapse of primary consumers at Year 8, releasing primary producers from herbivory before the entire trophic web collapses due to resource exhaustion."
    }
  ],
  "socratic_questions": [
    "How does the ratio of apex predators to herbivores at Year 5 impact the bottom-up stability of the primary producers?",
    "Given that the abiotic factors constrained the carrying capacity, how did this alter the resilience of the ecosystem to high predator pressure?"
  ]
}

Example 2 (Eutrophication):
Input: {"preset_id": "runoff-disaster", "abiotic_factors": {"rainfall": 890, "temperature": 22, "nitrogen": 96}, "differential_equation_parameters": {"K": 1200.0, "r": 0.38, ...}, ...}
Output: {
  "ecological_status": "Unstable",
  "detected_anomalies": [
    {
      "name": "Eutrophication",
      "year_of_onset": 10,
      "description": "Elevated soil nitrogen increases the primary productivity and carrying capacity, inducing a rapid boom in producer biomass. This density-dependent surge triggers a delayed consumer spike, leading to overgrazing and a subsequent bust."
    }
  ],
  "socratic_questions": [
    "What role did the soil nitrogen level play in temporarily inflating the system's carrying capacity?",
    "Why did the delay in consumer population response create an unstable predator-prey oscillation following the nutrient spike?"
  ]
}

Return ONLY valid JSON. No pre-amble, no markdown formatting blocks, just the JSON string."""


def _compute_ecosystem_metrics(timeline: list[TimelinePoint]) -> dict[str, Any]:
    if not timeline:
        return {}
    
    plants = [p.plants for p in timeline]
    rabbits = [p.rabbits for p in timeline]
    wolves = [p.wolves for p in timeline]
    
    max_p = max(timeline, key=lambda p: p.plants)
    min_p = min(timeline, key=lambda p: p.plants)
    max_r = max(timeline, key=lambda p: p.rabbits)
    min_r = min(timeline, key=lambda p: p.rabbits)
    max_w = max(timeline, key=lambda p: p.wolves)
    min_w = min(timeline, key=lambda p: p.wolves)

    ratios = []
    for p in timeline:
        if p.rabbits > 0:
            ratios.append(p.wolves / p.rabbits)
        else:
            ratios.append(float('inf') if p.wolves > 0 else 0.0)

    return {
        "peaks": {
            "plants": {"year": max_p.year, "value": max_p.plants},
            "rabbits": {"year": max_r.year, "value": max_r.rabbits},
            "wolves": {"year": max_w.year, "value": max_w.wolves},
        },
        "troughs": {
            "plants": {"year": min_p.year, "value": min_p.plants},
            "rabbits": {"year": min_r.year, "value": min_r.rabbits},
            "wolves": {"year": min_w.year, "value": min_w.wolves},
        },
        "net_change_percent": {
            "plants": round((timeline[-1].plants - timeline[0].plants) / max(1.0, timeline[0].plants) * 100, 1),
            "rabbits": round((timeline[-1].rabbits - timeline[0].rabbits) / max(1.0, timeline[0].rabbits) * 100, 1),
            "wolves": round((timeline[-1].wolves - timeline[0].wolves) / max(1.0, timeline[0].wolves) * 100, 1),
        },
        "predator_to_prey_ratio": {
            "min": round(min(ratios), 3) if ratios else 0.0,
            "max": round(max(ratios), 3) if ratios else 0.0,
            "final": round(ratios[-1], 3) if ratios else 0.0,
        }
    }


def _payload_for_model(
    timeline: list[GridTimelinePoint],
    abiotic: AbioticFactors,
    local_analysis: CoachAnalysis,
    parameters: dict[str, float] | None = None,
    preset_id: str | None = None,
) -> dict[str, Any]:
    metrics = _compute_ecosystem_metrics(timeline)
    return {
        "preset_id": preset_id,
        "abiotic_factors": abiotic.model_dump(),
        "differential_equation_parameters": parameters,
        "ecosystem_summary_metrics": metrics,
        "timeline": [point.model_dump() for point in timeline],
        "local_anomaly_hint": local_analysis.model_dump(exclude={"provider"}),
    }


async def get_ai_analysis(
    timeline: list[GridTimelinePoint],
    abiotic: AbioticFactors,
    parameters: dict[str, float] | None = None,
    preset_id: str | None = None,
) -> CoachAnalysis:
    local_analysis = detect_local_analysis(timeline)
    settings = get_settings()

    if not settings.featherless_api_key:
        return local_analysis

    client = AsyncOpenAI(
        api_key=settings.featherless_api_key,
        base_url=settings.featherless_base_url,
    )

    try:
        completion = await client.chat.completions.create(
            model=settings.featherless_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(_payload_for_model(
                        timeline, abiotic, local_analysis, parameters, preset_id
                    )),
                },
            ],
            temperature=0.35,
            max_tokens=700,
        )
        content = completion.choices[0].message.content or "{}"
        parsed = json.loads(content)
        analysis = CoachAnalysis.model_validate({**parsed, "provider": "featherless"})
        if not analysis.detected_anomalies or not analysis.socratic_questions:
            return local_analysis
        local_anomaly = local_analysis.detected_anomalies[0]
        model_anomaly = analysis.detected_anomalies[0]
        if local_anomaly.name != "None" and model_anomaly.name == "None":
            analysis.detected_anomalies = [local_anomaly]
            analysis.ecological_status = local_analysis.ecological_status
        return analysis
    except (json.JSONDecodeError, ValidationError, Exception):
        return local_analysis
