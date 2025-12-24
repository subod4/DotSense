"""ESP32 router - hardware device endpoints."""

from fastapi import APIRouter, HTTPException
import logging

from src.repositories.learning_repository import LearningRepository
from src.config.database import get_database
from src.utils.constants import BRAILLE_MAP

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/esp32", tags=["ESP32"])


@router.get("/letter/{letter}")
def esp32_get_letter(letter: str):
    """Return a 6-dot Braille pattern for the ESP32 (output-only).

    Response is intentionally minimal: the ESP32 only needs the dot array.
    """
    if not letter:
        raise HTTPException(status_code=400, detail="Letter parameter is required")
    
    key = (letter or "").strip().lower()
    if not key:
        raise HTTPException(status_code=400, detail="Letter cannot be empty or whitespace")
    if key not in BRAILLE_MAP:
        raise HTTPException(status_code=400, detail=f"Unsupported letter: '{key}'. Must be a-z")

    return {
        "dots": BRAILLE_MAP[key],
    }


@router.get("/learning/dots")
async def esp32_get_learning_dots(user_id: str):
    """ESP32 polling endpoint for Learning Mode: return only the latest dots.

    This updates whenever the frontend calls /api/learning/step for the same user.
    """
    key = (user_id or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="user_id is required")

    db = get_database()
    repository = LearningRepository(db)
    letter = await repository.get_esp32_current_letter(key)
    
    if not letter:
        raise HTTPException(status_code=404, detail="No current learning letter for this user")

    if letter not in BRAILLE_MAP:
        raise HTTPException(status_code=500, detail="Server has an invalid learning letter")

    return {"dots": BRAILLE_MAP[letter]}
