"""Tutorial router - tutorial mode endpoints."""

from fastapi import APIRouter, HTTPException
import uuid
import time
from threading import Lock
import logging

from src.models.schemas import TutorialStartRequest, TutorialControlRequest
from src.utils.constants import BRAILLE_MAP, ALPHABET
from src.utils.helpers import explain_letter
from src.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/tutorial", tags=["Tutorial Mode"])

# In-memory tutorial state
tutorial_sessions = {}
session_lock = Lock()
last_cleanup_time = time.time()


def cleanup_old_sessions():
    """Remove tutorial sessions older than SESSION_TIMEOUT."""
    global last_cleanup_time
    current_time = time.time()
    
    # Only cleanup every 10 minutes
    if current_time - last_cleanup_time < 600:
        return
    
    with session_lock:
        to_delete = []
        for tutorial_id, session in tutorial_sessions.items():
            if "last_activity" in session:
                if current_time - session["last_activity"] > settings.session_timeout:
                    to_delete.append(tutorial_id)
        
        for tutorial_id in to_delete:
            del tutorial_sessions[tutorial_id]
        
        last_cleanup_time = current_time
        if to_delete:
            logger.info(f"Cleaned up {len(to_delete)} inactive tutorial sessions")


def _start_session(user_id: str) -> dict:
    """Initialize a new tutorial session."""
    cleanup_old_sessions()
    
    tutorial_id = str(uuid.uuid4())

    with session_lock:
        tutorial_sessions[tutorial_id] = {
            "user_id": user_id,
            "index": 0,
            "last_activity": time.time(),
        }

    letter = ALPHABET[0]
    return {
        "tutorial_id": tutorial_id,
        "letter": letter,
        "dots": BRAILLE_MAP[letter],
        "spoken_text": explain_letter(letter, BRAILLE_MAP[letter]),
    }


@router.post("/start")
def start_tutorial(req: TutorialStartRequest):
    """Start a new tutorial session."""
    return _start_session(req.user_id)


@router.get("/step")
def get_current_step(tutorial_id: str):
    """Get the current tutorial step."""
    session = tutorial_sessions.get(tutorial_id)
    if not session:
        raise HTTPException(status_code=404, detail="Tutorial not found")

    with session_lock:
        session["last_activity"] = time.time()
    
    letter = ALPHABET[session["index"]]

    return {
        "letter": letter,
        "dots": BRAILLE_MAP[letter],
        "spoken_text": explain_letter(letter, BRAILLE_MAP[letter]),
        "progress": {
            "current": session["index"] + 1,
            "total": len(ALPHABET)
        }
    }


@router.get("/esp32/dots")
def esp32_get_current_dots(tutorial_id: str):
    """ESP32 polling endpoint: return only the current 6-dot pattern."""
    session = tutorial_sessions.get(tutorial_id)
    if not session:
        raise HTTPException(status_code=404, detail="Tutorial not found")

    with session_lock:
        session["last_activity"] = time.time()
        letter = ALPHABET[session["index"]]

    return {"dots": BRAILLE_MAP[letter]}


@router.post("/next")
def next_letter(req: TutorialControlRequest):
    """Move to the next letter in the tutorial."""
    session = tutorial_sessions.get(req.tutorial_id)
    if not session:
        raise HTTPException(status_code=404, detail="Tutorial not found")

    with session_lock:
        session["index"] += 1
        if session["index"] >= len(ALPHABET):
            session["index"] = 0  # loop for kids
        session["last_activity"] = time.time()

    letter = ALPHABET[session["index"]]

    return {
        "letter": letter,
        "dots": BRAILLE_MAP[letter],
        "spoken_text": explain_letter(letter, BRAILLE_MAP[letter]),
        "progress": {
            "current": session["index"] + 1,
            "total": len(ALPHABET)
        }
    }


@router.post("/previous")
def previous_letter(req: TutorialControlRequest):
    """Move to the previous letter in the tutorial."""
    session = tutorial_sessions.get(req.tutorial_id)
    if not session:
        raise HTTPException(status_code=404, detail="Tutorial not found")

    with session_lock:
        session["index"] -= 1
        if session["index"] < 0:
            session["index"] = len(ALPHABET) - 1  # wrap around
        session["last_activity"] = time.time()

    letter = ALPHABET[session["index"]]

    return {
        "letter": letter,
        "dots": BRAILLE_MAP[letter],
        "spoken_text": explain_letter(letter, BRAILLE_MAP[letter]),
        "progress": {
            "current": session["index"] + 1,
            "total": len(ALPHABET)
        }
    }


@router.post("/repeat")
def repeat_letter(req: TutorialControlRequest):
    """Repeat the current letter."""
    session = tutorial_sessions.get(req.tutorial_id)
    if not session:
        raise HTTPException(status_code=404, detail="Tutorial not found")

    with session_lock:
        session["last_activity"] = time.time()
    
    letter = ALPHABET[session["index"]]

    return {
        "letter": letter,
        "dots": BRAILLE_MAP[letter],
        "spoken_text": explain_letter(letter, BRAILLE_MAP[letter]),
        "progress": {
            "current": session["index"] + 1,
            "total": len(ALPHABET)
        }
    }


@router.post("/jump")
def jump_to_letter(tutorial_id: str, letter: str):
    """Jump to a specific letter in the tutorial."""
    session = tutorial_sessions.get(tutorial_id)
    if not session:
        raise HTTPException(status_code=404, detail="Tutorial not found")
    
    if not letter or not letter.strip():
        raise HTTPException(status_code=400, detail="Letter parameter cannot be empty")
    
    letter = letter.lower()
    if letter not in BRAILLE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid letter: '{letter}'. Must be a-z")
    
    with session_lock:
        session["index"] = ALPHABET.index(letter)
        session["last_activity"] = time.time()
    
    return {
        "letter": letter,
        "dots": BRAILLE_MAP[letter],
        "spoken_text": explain_letter(letter, BRAILLE_MAP[letter]),
        "progress": {
            "current": session["index"] + 1,
            "total": len(ALPHABET)
        }
    }


@router.post("/end")
def end_tutorial(req: TutorialControlRequest):
    """End the tutorial session."""
    with session_lock:
        if req.tutorial_id in tutorial_sessions:
            del tutorial_sessions[req.tutorial_id]

    return {
        "status": "ended"
    }


@router.get("/alphabet")
def get_full_alphabet():
    """Get the complete Braille alphabet."""
    return {
        "letters": [
            {
                "letter": letter,
                "dots": BRAILLE_MAP[letter]
            }
            for letter in ALPHABET
        ]
    }
