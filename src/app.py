"""Main application entrypoint with integrated user storage.

This module hosts the FastAPI application and exposes all API endpoints.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime
import time

from old.learning_engine import (
    UserState,
    feedback_intent,
    learning_step,
    update_after_attempt,
)
from tutorial import router as tutorial_router
from tutorial import BRAILLE_MAP
from database import router as user_router, get_db, init_database, close_database
from constants import LEARNING_CONSTANTS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Braille Learning API",
    description="Adaptive learning system for Braille education",
    version="1.0.0"
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database and perform startup tasks."""
    await init_database()
    print("Database initialized successfully")

# Close database on shutdown
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up database connection."""
    await close_database()
    print("Database connection closed")

# Configure CORS
# Get allowed origins from environment variable
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tutorial_router)  # /api/tutorial/*
app.include_router(user_router)      # /api/users/*


async def get_or_create_user_state(user_id: str) -> UserState:
    """Load user state from database (single source of truth)."""
    db = get_db()
    
    # Load user progress
    progress = await db.user_progress.find_one({"user_id": user_id})
    if not progress:
        # User doesn't exist - create default progress
        progress_doc = {
            "user_id": user_id,
            "current_level": "letters_basic",
            "total_sessions": 0,
            "total_attempts": 0,
            "total_correct": 0,
            "total_time_spent": 0.0,
            "achievements": [],
            "last_updated": datetime.utcnow()
        }
        await db.user_progress.insert_one(progress_doc)
        progress = progress_doc
    
    # Create UserState object
    user = UserState(
        user_id=user_id,
        level=progress.get("current_level", "letters_basic"),
        session_count=progress.get("total_sessions", 0),
        total_time_spent=progress.get("total_time_spent", 0.0),
        achievements=progress.get("achievements", [])
    )
    
    # Load per-letter statistics from database
    letter_stats = await db.letter_stats.find({"user_id": user_id}).to_list(length=100)
    for stat_doc in letter_stats:
        from old.learning_engine import LetterStats
        user.letters[stat_doc["letter"]] = LetterStats(
            letter=stat_doc["letter"],
            attempts=stat_doc.get("attempts", 0),
            correct=stat_doc.get("correct", 0),
            avg_response_time=stat_doc.get("avg_response_time", 0.0),
            last_seen=stat_doc.get("last_seen", time.time()),
            confused_with=stat_doc.get("confused_with", {}),
            streak=stat_doc.get("streak", 0),
            best_streak=stat_doc.get("best_streak", 0)
        )
    
    return user


async def save_user_state(user: UserState):
    """Save complete user state to database."""
    db = get_db()
    
    # Update user progress
    await db.user_progress.update_one(
        {"user_id": user.user_id},
        {
            "$set": {
                "current_level": user.level,
                "total_sessions": user.session_count,
                "total_time_spent": user.total_time_spent,
                "achievements": user.achievements,
                "last_updated": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    # Save each letter's statistics
    for letter, stats in user.letters.items():
        await db.letter_stats.update_one(
            {"user_id": user.user_id, "letter": letter},
            {
                "$set": {
                    "attempts": stats.attempts,
                    "correct": stats.correct,
                    "avg_response_time": stats.avg_response_time,
                    "last_seen": stats.last_seen,
                    "confused_with": stats.confused_with,
                    "streak": stats.streak,
                    "best_streak": stats.best_streak,
                    "last_updated": datetime.utcnow()
                }
            },
            upsert=True
        )


async def get_esp32_current_letter(user_id: str) -> str:
    """Get current learning letter for ESP32 from database."""
    db = get_db()
    esp32_state = await db.esp32_state.find_one({"user_id": user_id})
    if esp32_state:
        return esp32_state.get("current_letter", "")
    return ""


async def set_esp32_current_letter(user_id: str, letter: str):
    """Save current learning letter for ESP32 to database."""
    db = get_db()
    await db.esp32_state.update_one(
        {"user_id": user_id},
        {"$set": {"current_letter": letter, "updated_at": datetime.utcnow()}},
        upsert=True
    )


# --- Request/Response Models for Learning Engine ---

class LearningStepRequest(BaseModel):
    user_id: str
    available_letters: List[str]


class AttemptRequest(BaseModel):
    user_id: str
    target_letter: str
    spoken_letter: str
    response_time: float
    session_id: str = None  # Optional link to database session (MongoDB ObjectId)


class UserStatsRequest(BaseModel):
    user_id: str


# --- Root Endpoint ---

@app.get("/")
def read_root():
    """API health check and info."""
    return {
        "status": "online",
        "service": "Braille Learning API",
        "version": "1.0.0",
        "endpoints": {
            "tutorial": "/api/tutorial",
            "users": "/api/users",
            "learning": "/api/learning",
            "esp32": "/api/esp32",
            "constants": "/api/constants",
            "docs": "/docs"
        }
    }


@app.get("/api/constants")
def get_constants():
    """Get learning engine constants for frontend calculations."""
    return LEARNING_CONSTANTS


# --- ESP32 Output API (Braille dots only) ---

@app.get("/api/esp32/letter/{letter}")
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


# --- Learning Engine API Endpoints ---

@app.post("/api/learning/step")
async def get_learning_step(req: LearningStepRequest):
    """Get the next letter to teach based on adaptive learning algorithm."""
    # Validate inputs
    if not req.user_id or not req.user_id.strip():
        raise HTTPException(status_code=400, detail="user_id cannot be empty")
    if not req.available_letters or len(req.available_letters) == 0:
        raise HTTPException(status_code=400, detail="available_letters cannot be empty")
    
    user = await get_or_create_user_state(req.user_id)
    step = learning_step(user, req.available_letters)

    # Update what the ESP32 should show for this user (save to DB)
    next_letter = step.get("next_letter")
    if isinstance(next_letter, str) and next_letter.strip():
        await set_esp32_current_letter(req.user_id, next_letter.strip().lower())
    
    # Save updated user state
    await save_user_state(user)
    
    return step


@app.get("/api/esp32/learning/dots")
async def esp32_get_learning_dots(user_id: str):
    """ESP32 polling endpoint for Learning Mode: return only the latest dots.

    This updates whenever the frontend calls /api/learning/step for the same user.
    """
    key = (user_id or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="user_id is required")

    letter = await get_esp32_current_letter(key)
    if not letter:
        raise HTTPException(status_code=404, detail="No current learning letter for this user")

    if letter not in BRAILLE_MAP:
        raise HTTPException(status_code=500, detail="Server has an invalid learning letter")

    return {"dots": BRAILLE_MAP[letter]}


@app.post("/api/learning/attempt")
async def record_attempt(req: AttemptRequest):
    """Record a learning attempt and get feedback."""
    # Validate inputs
    if not req.user_id or not req.user_id.strip():
        raise HTTPException(status_code=400, detail="user_id cannot be empty")
    if not req.target_letter or not req.target_letter.strip():
        raise HTTPException(status_code=400, detail="target_letter cannot be empty")
    if not req.spoken_letter or not req.spoken_letter.strip():
        raise HTTPException(status_code=400, detail="spoken_letter cannot be empty")
    if req.response_time < 0:
        raise HTTPException(status_code=400, detail="response_time cannot be negative")
    if req.response_time > 300:  # 5 minutes is unreasonably long
        raise HTTPException(status_code=400, detail="response_time exceeds maximum allowed (300s)")
    
    user = await get_or_create_user_state(req.user_id)
    
    result = update_after_attempt(
        user=user,
        target_letter=req.target_letter,
        spoken_letter=req.spoken_letter,
        response_time=req.response_time,
    )
    
    feedback = feedback_intent(result, req.target_letter)
    
    # ALWAYS save complete state to database
    await save_user_state(user)
    
    # Also store individual attempt record
    try:
        from bson import ObjectId
        
        db = get_db()
        is_correct = req.spoken_letter.lower() == req.target_letter.lower()
        
        # Insert attempt record
        attempt_doc = {
            "user_id": req.user_id,
            "session_id": ObjectId(req.session_id) if req.session_id else None,
            "letter": req.target_letter,
            "spoken_letter": req.spoken_letter,
            "is_correct": is_correct,
            "response_time": req.response_time,
            "timestamp": datetime.utcnow()
        }
        await db.letter_attempts.insert_one(attempt_doc)
        
        # Update aggregate counters
        await db.user_progress.update_one(
            {"user_id": req.user_id},
            {
                "$inc": {
                    "total_attempts": 1,
                    "total_correct": 1 if is_correct else 0
                },
                "$set": {"last_updated": datetime.utcnow()}
            }
        )
    except Exception as e:
        print(f"Error recording attempt to database: {e}")
        raise HTTPException(status_code=500, detail="Failed to save attempt")
    
    return {
        "result": result,
        "feedback": feedback,
    }


@app.get("/api/learning/stats/{user_id}")
async def get_user_stats(user_id: str):
    """Get comprehensive learning statistics for a user."""
    user = await get_or_create_user_state(user_id)
    
    stats_summary = []
    for letter, stats in user.letters.items():
        stats_summary.append({
            "letter": letter,
            "attempts": stats.attempts,
            "correct": stats.correct,
            "avg_response_time": round(stats.avg_response_time, 2),
            "confused_with": stats.confused_with,
            "streak": stats.streak,
            "best_streak": stats.best_streak,
            # Frontend calculates: accuracy, skill_score, mastery_level
        })
    
    return {
        "user_id": user.user_id,
        "level": user.level,
        "session_count": user.session_count,
        "total_time_spent": user.total_time_spent,
        "letters": stats_summary,
    }


@app.post("/api/learning/reset/{user_id}")
async def reset_user_progress(user_id: str):
    """Reset a user's learning progress in database."""
    db = get_db()
    
    # Delete all letter stats
    await db.letter_stats.delete_many({"user_id": user_id})
    
    # Reset user progress
    await db.user_progress.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "current_level": "letters_basic",
                "total_sessions": 0,
                "total_attempts": 0,
                "total_correct": 0,
                "total_time_spent": 0.0,
                "achievements": [],
                "last_updated": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    # Clear ESP32 state
    await db.esp32_state.delete_one({"user_id": user_id})
    
    return {"status": "reset", "user_id": user_id}


@app.get("/api/health")
async def health_check():
    """Detailed health check."""
    # Check database connection
    try:
        db = get_db()
        user_count = await db.users.count_documents({})
        progress_count = await db.user_progress.count_documents({})
        db_status = "connected"
    except Exception as e:
        user_count = 0
        progress_count = 0
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "total_users": user_count,
        "users_with_progress": progress_count,
        "stateless": True,
        "scalable": True
    }


# --- Demo Function (for testing) ---

def run_learning_engine_demo() -> dict:
    """Demo function showing learning engine flow."""
    user = UserState(user_id="child_01")
    letters = ["a", "b", "c", "d", "e", "f"]

    # Ask engine what to show
    step = learning_step(user, letters)
    letter_to_show = step["next_letter"]

    # After user speaks
    result = update_after_attempt(
        user=user,
        target_letter=letter_to_show,
        spoken_letter="b",
        response_time=4.2,
    )

    feedback = feedback_intent(result, letter_to_show)
    return {
        "step": step,
        "letter_to_show": letter_to_show,
        "result": result,
        "feedback": feedback,
    }


if __name__ == "__main__":
    import uvicorn
    
    print("Starting Braille Learning API...")
    print("Running demo...")
    print(run_learning_engine_demo())
    print("\nStarting server on http://localhost:8000")
    print("API docs available at http://localhost:8000/docs")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)