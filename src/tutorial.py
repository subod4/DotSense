# tutorial.py
# Tutorial Mode Backend for Braille Learning System

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/api/tutorial", tags=["Tutorial Mode"])

# -------------------------------------------------
# Complete Braille Map (Grade 1 – English)
# -------------------------------------------------

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

# -------------------------------------------------
# In-memory tutorial state (replace with DB later)
# -------------------------------------------------

tutorial_sessions = {}

# Session cleanup - remove inactive sessions older than 1 hour
import time
from threading import Lock

session_lock = Lock()
last_cleanup_time = time.time()
SESSION_TIMEOUT = 3600  # 1 hour in seconds

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
                if current_time - session["last_activity"] > SESSION_TIMEOUT:
                    to_delete.append(tutorial_id)
        
        for tutorial_id in to_delete:
            del tutorial_sessions[tutorial_id]
        
        last_cleanup_time = current_time
        if to_delete:
            print(f"Cleaned up {len(to_delete)} inactive tutorial sessions")

# -------------------------------------------------
# Request / Response Models
# -------------------------------------------------

class TutorialStartRequest(BaseModel):
    user_id: str


class TutorialControlRequest(BaseModel):
    tutorial_id: str


# -------------------------------------------------
# Utility
# -------------------------------------------------

def explain_letter(letter: str) -> str:
    """Generate spoken explanation for a letter."""
    dots = BRAILLE_MAP[letter]
    dot_numbers = [str(i + 1) for i, d in enumerate(dots) if d == 1]
    
    if len(dot_numbers) == 1:
        dots_text = dot_numbers[0]
    elif len(dot_numbers) == 2:
        dots_text = " and ".join(dot_numbers)
    else:
        dots_text = ", ".join(dot_numbers[:-1]) + ", and " + dot_numbers[-1]
    
    return f"This is letter {letter.upper()}. It has dots {dots_text}."


def _start_session(user_id: str) -> dict:
    """Initialize a new tutorial session."""
    cleanup_old_sessions()  # Cleanup before creating new session
    
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
        "spoken_text": explain_letter(letter),
    }


# -------------------------------------------------
# API ENDPOINTS
# -------------------------------------------------

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
        "spoken_text": explain_letter(letter),
        "progress": {
            "current": session["index"] + 1,
            "total": len(ALPHABET)
        }
    }


@router.get("/esp32/dots")
def esp32_get_current_dots(tutorial_id: str):
    """ESP32 polling endpoint: return only the current 6-dot pattern.

    The ESP32 can continuously GET this endpoint; when the web UI advances
    the tutorial (next/previous/jump), the returned pattern changes.
    """
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
        "spoken_text": explain_letter(letter),
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
        "spoken_text": explain_letter(letter),
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
        "spoken_text": explain_letter(letter),
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
        "spoken_text": explain_letter(letter),
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