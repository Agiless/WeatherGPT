"""
Hazard score computation for weather metrics.
Normalizes raw values to a 0-100 hazard score scale.
"""

from app.risk_engine.thresholds import THRESHOLDS


def compute_hazard_score(value: float, hazard_type: str) -> int:
    """
    Given a physical value and hazard type, compute normalized risk score (0-100).
    Scale:
      0-30: Low
      31-60: Moderate
      61-85: High
      86-100: Severe
    """
    thresholds = THRESHOLDS.get(hazard_type, THRESHOLDS["rainfall"])
    val = max(0.0, float(value))

    if val < thresholds["low"]:
        return int((val / thresholds["low"]) * 30)
    if val < thresholds["moderate"]:
        return 31 + int(((val - thresholds["low"]) / (thresholds["moderate"] - thresholds["low"])) * 29)
    if val < thresholds["high"]:
        return 61 + int(((val - thresholds["moderate"]) / (thresholds["high"] - thresholds["moderate"])) * 24)
    return min(100, 86 + int(((val - thresholds["high"]) / max(1.0, thresholds["severe"] - thresholds["high"])) * 14))


def score_to_risk_level(score: float) -> str:
    """Map numeric score (0-100) to risk level string."""
    if score >= 86:
        return "severe"
    if score >= 61:
        return "high"
    if score >= 31:
        return "moderate"
    return "low"
