from __future__ import annotations

from .schemas import CoachAnalysis, DetectedAnomaly, GridTimelinePoint


def _first_year_below(timeline: list[GridTimelinePoint], key: str, threshold: float) -> int | None:
    for point in timeline:
        if getattr(point, key) <= threshold:
            return point.year
    return None


def detect_local_analysis(timeline: list[GridTimelinePoint]) -> CoachAnalysis:
    final = timeline[-1]
    initial = timeline[0]
    min_plants_year = _first_year_below(timeline, "plants", max(12.0, initial.plants * 0.18))
    min_rabbits_year = _first_year_below(timeline, "rabbits", max(5.0, initial.rabbits * 0.45))
    max_plants = max(point.plants for point in timeline)
    final_total = final.plants + final.rabbits + final.wolves
    initial_total = initial.plants + initial.rabbits + initial.wolves

    if min_rabbits_year is not None and initial.wolves >= 35 and final.wolves < initial.wolves * 0.55:
        anomaly = DetectedAnomaly(
            name="Trophic Cascade",
            year_of_onset=min_rabbits_year,
            description=(
                "Consumer collapse appears after predator pressure and limited resource recovery "
                "change the energy transfer between trophic levels."
            ),
        )
    elif max_plants > initial.plants * 1.8 and final.plants < max_plants * 0.55:
        peak_year = max(timeline, key=lambda point: point.plants).year
        anomaly = DetectedAnomaly(
            name="Eutrophication",
            year_of_onset=peak_year,
            description=(
                "Producer biomass surges before falling, a boom-bust signature consistent with "
                "excess nutrient loading and unstable carrying capacity."
            ),
        )
    elif min_plants_year is not None:
        anomaly = DetectedAnomaly(
            name="Competitive Exclusion",
            year_of_onset=min_plants_year,
            description=(
                "Primary producers are pushed below a resilience threshold, reducing the resource "
                "base available to the rest of the food web."
            ),
        )
    else:
        anomaly = DetectedAnomaly(
            name="None",
            year_of_onset=0,
            description="The population curves retain enough energy transfer to avoid a major anomaly.",
        )

    if final_total < initial_total * 0.28 or final.plants < 15 or final.rabbits < 2:
        status = "Collapse"
    elif anomaly.name != "None" or final_total < initial_total * 0.68:
        status = "Unstable"
    else:
        status = "Stable"

    questions = [
        "Which slider changed the carrying capacity before the first visible population shift?",
        "What indirect effect would you expect if predator pressure changed while plant recovery stayed constrained?",
        "How could an abiotic stressor alter the timing of this anomaly without directly touching consumers?",
    ]

    return CoachAnalysis(
        ecological_status=status,
        detected_anomalies=[anomaly],
        socratic_questions=questions,
        provider="fallback",
    )
