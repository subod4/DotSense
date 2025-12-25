"""Constants for frontend calculation compatibility.

Export these constants to the frontend so it can perform the same
calculations that were removed from the backend.
"""

from src.config.settings import get_settings

settings = get_settings()

# Learning Engine Constants (export to frontend)
LEARNING_CONSTANTS = {
    "MAX_RESPONSE_TIME": settings.max_response_time,
    "MASTERY_HIGH": settings.mastery_high,
    "MASTERY_MID": settings.mastery_mid,
    "MIN_ATTEMPTS_FOR_MASTERY": settings.min_attempts_for_mastery,
    
    # Calculation formulas (for frontend reference)
    "SKILL_SCORE_FORMULA": "(0.7 * accuracy) + (0.3 * speed_score) + streak_bonus",
    "SPEED_SCORE_FORMULA": "max(0, 1.0 - (avg_response_time / MAX_RESPONSE_TIME))",
    "STREAK_BONUS_FORMULA": "min(0.1, streak * 0.02)",
    "PROBABILITY_CORRECT_FORMULA": "(correct + 1) / (attempts + 2)",
    
    # Confidence interval (95%)
    "CONFIDENCE_Z_SCORE": 1.96,
}

# Braille mapping for all letters (Grade 1 English)
BRAILLE_MAP = {
    "a": [1,0,0,0,0,0],
    "b": [1,1,0,0,0,0],
    "c": [1,0,0,1,0,0],
    "d": [1,0,0,1,1,0],
    "e": [1,0,0,0,1,0],
    "f": [1,1,0,1,0,0],
    "g": [1,1,0,1,1,0],
    "h": [1,1,0,0,1,0],
    "i": [0,1,0,1,0,0],
    "j": [0,1,0,1,1,0],
    "k": [1,0,1,0,0,0],
    "l": [1,1,1,0,0,0],
    "m": [1,0,1,1,0,0],
    "n": [1,0,1,1,1,0],
    "o": [1,0,1,0,1,0],
    "p": [1,1,1,1,0,0],
    "q": [1,1,1,1,1,0],
    "r": [1,1,1,0,1,0],
    "s": [0,1,1,1,0,0],
    "t": [0,1,1,1,1,0],
    "u": [1,0,1,0,0,1],
    "v": [1,1,1,0,0,1],
    "w": [0,1,0,1,1,1],
    "x": [1,0,1,1,0,1],
    "y": [1,0,1,1,1,1],
    "z": [1,0,1,0,1,1],
}

ALPHABET = list(BRAILLE_MAP.keys())
