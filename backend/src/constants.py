"""Constants for frontend calculation compatibility.

Export these constants to the frontend so it can perform the same
calculations that were removed from the backend.
"""

# Learning Engine Constants (export to frontend)
LEARNING_CONSTANTS = {
    "MAX_RESPONSE_TIME": 6.0,  # seconds (child friendly)
    "MASTERY_HIGH": 0.85,
    "MASTERY_MID": 0.6,
    "MIN_ATTEMPTS_FOR_MASTERY": 5,
    
    # Calculation formulas (for frontend reference)
    "SKILL_SCORE_FORMULA": "(0.7 * accuracy) + (0.3 * speed_score) + streak_bonus",
    "SPEED_SCORE_FORMULA": "max(0, 1.0 - (avg_response_time / MAX_RESPONSE_TIME))",
    "STREAK_BONUS_FORMULA": "min(0.1, streak * 0.02)",
    "PROBABILITY_CORRECT_FORMULA": "(correct + 1) / (attempts + 2)",
    
    # Confidence interval (95%)
    "CONFIDENCE_Z_SCORE": 1.96,
}
