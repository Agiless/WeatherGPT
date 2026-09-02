"""
Multi-model Consensus Scoring.
Computes variance across models (OpenWeather, IMD, ERA5 Climatology) to determine model agreement.
Higher score = stronger agreement among models.
"""

import math
from typing import Mapping


def compute_consensus(model_scores: Mapping[str, int]) -> float:
    """
    Given a mapping of model names to scores (0-100), compute consensus score:
      consensus_score = 100 - (std_dev(model_scores) / max_possible_std_dev) * 100
    Theoretical max standard deviation for 0-100 range with 2 extremes is ~50.
    """
    scores = [float(v) for v in model_scores.values() if v is not None]
    if len(scores) <= 1:
        return 95.0  # High confidence by default when single primary source is active

    mean = sum(scores) / len(scores)
    variance = sum((s - mean) ** 2 for s in scores) / len(scores)
    stdev = math.sqrt(variance)

    max_possible_std_dev = 50.0
    consensus = 100.0 - (stdev / max_possible_std_dev) * 100.0
    return round(max(0.0, min(100.0, consensus)), 1)


def consensus_to_label(consensus_score: float) -> str:
    """Bucket numeric consensus into user-facing confidence labels."""
    if consensus_score >= 85.0:
        return "High confidence"
    if consensus_score >= 60.0:
        return "Moderate confidence"
    return "Low confidence — models disagree"
