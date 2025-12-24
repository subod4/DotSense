# database.py
# User Data Storage Backend with MongoDB

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import hashlib
from urllib.parse import quote_plus, unquote_plus, urlsplit, urlunsplit
import ssl
import certifi

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/api/users", tags=["User Management"])

# -------------------------------------------------
# Database Configuration
# -------------------------------------------------

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DB_NAME")

if not MONGODB_URL or not DB_NAME:
    raise ValueError("MONGODB_URL and DB_NAME must be set in .env file")

# Global MongoDB client
mongodb_client: Optional[AsyncIOMotorClient] = None
database = None


def _sanitize_mongodb_url(url: str) -> str:
    """Ensure MongoDB credentials are URL-escaped per RFC 3986.

    PyMongo requires username/password in the URI to be percent-encoded. This helper
    normalizes any provided credentials by unquoting then quoting them.
    """
    if not url:
        return url

    try:
        parsed = urlsplit(url)
        if parsed.scheme not in {"mongodb", "mongodb+srv"}:
            return url

        netloc = parsed.netloc
        if "@" not in netloc:
            return url

        userinfo, hosts = netloc.rsplit("@", 1)
        had_colon = ":" in userinfo
        if had_colon:
            user, password = userinfo.split(":", 1)
        else:
            user, password = userinfo, ""

        user_escaped = quote_plus(unquote_plus(user))
        password_escaped = quote_plus(unquote_plus(password)) if password or had_colon else password

        new_userinfo = f"{user_escaped}:{password_escaped}" if had_colon else user_escaped
        new_netloc = f"{new_userinfo}@{hosts}"

        return urlunsplit((parsed.scheme, new_netloc, parsed.path, parsed.query, parsed.fragment))
    except Exception:
        return url


def _redact_mongodb_url(url: str) -> str:
    """Redact password in MongoDB URL for safe logging."""
    if not url:
        return url

    try:
        parsed = urlsplit(url)
        netloc = parsed.netloc
        if "@" not in netloc:
            return url

        userinfo, hosts = netloc.rsplit("@", 1)
        if ":" in userinfo:
            user, _password = userinfo.split(":", 1)
            redacted_userinfo = f"{user}:****"
        else:
            redacted_userinfo = userinfo

        redacted_netloc = f"{redacted_userinfo}@{hosts}"
        return urlunsplit((parsed.scheme, redacted_netloc, parsed.path, parsed.query, parsed.fragment))
    except Exception:
        return url


def get_db():
    """Get database instance."""
    global database
    if database is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    return database


async def init_database():
    """Initialize MongoDB connection and create indexes."""
    global mongodb_client, database
    
    try:
        mongodb_url = _sanitize_mongodb_url(MONGODB_URL)
        
        # Initialize MongoDB client with TLS settings
        mongodb_client = AsyncIOMotorClient(
            mongodb_url,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=20000,
            socketTimeoutMS=20000,
            maxPoolSize=10,
            minPoolSize=1,
            retryWrites=True,
            retryReads=True
        )
        database = mongodb_client[DB_NAME]
        
        # Test connection with a simple ping
        await database.command("ping")
        print(f"✅ Connected to MongoDB at {_redact_mongodb_url(mongodb_url)}")
        print(f"✅ Using database: {DB_NAME}")
        
        # Create indexes for better query performance (in background to avoid blocking)
        try:
            await database.users.create_index("username", unique=True, background=True)
            await database.users.create_index("email", unique=True, sparse=True, background=True)
            await database.learning_sessions.create_index([("user_id", 1), ("started_at", -1)], background=True)
            await database.letter_attempts.create_index([("user_id", 1), ("timestamp", -1)], background=True)
            await database.letter_attempts.create_index([("user_id", 1), ("letter", 1)], background=True)
            await database.achievements.create_index([("user_id", 1), ("earned_at", -1)], background=True)
            
            # New indexes for stateless architecture
            await database.letter_stats.create_index([("user_id", 1), ("letter", 1)], unique=True, background=True)
            await database.user_progress.create_index("user_id", unique=True, background=True)
            await database.esp32_state.create_index("user_id", unique=True, background=True)
            print("✅ Database indexes created successfully")
        except Exception as idx_error:
            print(f"⚠️ Warning: Some indexes may already exist or failed to create: {idx_error}")
        
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        raise


async def close_database():
    """Close MongoDB connection."""
    global mongodb_client
    if mongodb_client:
        mongodb_client.close()
        print("✅ MongoDB connection closed")


# -------------------------------------------------
# Request / Response Models
# -------------------------------------------------

class UserCreateRequest(BaseModel):
    username: str
    email: Optional[str] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    age: Optional[int] = None


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    profile_data: Optional[dict] = None


class SessionStartRequest(BaseModel):
    user_id: str
    session_type: str  # "tutorial", "learning", "challenge"


class SessionEndRequest(BaseModel):
    session_id: str


class AttemptRecordRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    letter: str
    spoken_letter: str
    is_correct: bool
    response_time: float


class AchievementRequest(BaseModel):
    user_id: str
    achievement_type: str
    achievement_name: str
    metadata: Optional[dict] = None


# -------------------------------------------------
# Utility Functions
# -------------------------------------------------

def hash_password(password: str) -> str:
    """Hash password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()


async def user_exists(user_id: str) -> bool:
    """Check if user exists."""
    db = get_db()
    user = await db.users.find_one({"_id": user_id})
    return user is not None


# -------------------------------------------------
# User Management Endpoints
# -------------------------------------------------

@router.post("/create")
async def create_user(req: UserCreateRequest):
    """Create a new user."""
    # Validate username
    if not req.username or not req.username.strip():
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    if len(req.username) > 50:
        raise HTTPException(status_code=400, detail="Username cannot exceed 50 characters")
    
    db = get_db()
    
    try:
        # Generate user_id from username
        user_id = f"user_{req.username.lower().replace(' ', '_')}"
        
        # Check if username already exists
        existing = await db.users.find_one({"username": req.username})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Check if email already exists (if provided)
        if req.email:
            existing = await db.users.find_one({"email": req.email})
            if existing:
                raise HTTPException(status_code=400, detail="Email already exists")
        
        # Validate age if provided
        if req.age is not None:
            if req.age < 0:
                raise HTTPException(status_code=400, detail="Age cannot be negative")
            if req.age > 150:
                raise HTTPException(status_code=400, detail="Age exceeds valid range")
        
        # Hash password if provided
        password_hash = hash_password(req.password) if req.password else None
        
        # Create user document
        user_doc = {
            "_id": user_id,
            "username": req.username,
            "email": req.email,
            "password_hash": password_hash,
            "full_name": req.full_name,
            "age": req.age,
            "created_at": datetime.utcnow(),
            "last_login": None,
            "profile_data": {}
        }
        
        await db.users.insert_one(user_doc)
        
        # Initialize progress record
        progress_doc = {
            "_id": user_id,
            "user_id": user_id,
            "current_level": "letters_basic",
            "total_sessions": 0,
            "total_attempts": 0,
            "total_correct": 0,
            "mastered_letters": [],
            "learning_letters": [],
            "weak_letters": [],
            "last_updated": datetime.utcnow()
        }
        
        await db.user_progress.insert_one(progress_doc)
        
        return {
            "user_id": user_id,
            "username": req.username,
            "status": "created"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")


@router.get("/{user_id}")
async def get_user(user_id: str):
    """Get user profile."""
    db = get_db()
    
    user = await db.users.find_one({"_id": user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user["_id"],
        "username": user["username"],
        "email": user.get("email"),
        "full_name": user.get("full_name"),
        "age": user.get("age"),
        "created_at": user["created_at"].isoformat() if user.get("created_at") else None,
        "last_login": user["last_login"].isoformat() if user.get("last_login") else None,
        "profile_data": user.get("profile_data", {})
    }


@router.put("/{user_id}")
async def update_user(user_id: str, req: UserUpdateRequest):
    """Update user profile."""
    if not await user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    
    db = get_db()
    
    updates = {}
    
    if req.full_name is not None:
        updates["full_name"] = req.full_name
    
    if req.age is not None:
        updates["age"] = req.age
    
    if req.profile_data is not None:
        updates["profile_data"] = req.profile_data
    
    if updates:
        await db.users.update_one(
            {"_id": user_id},
            {"$set": updates}
        )
    
    return {"status": "updated", "user_id": user_id}


@router.delete("/{user_id}")
async def delete_user(user_id: str):
    """Delete a user and all associated data."""
    if not await user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    
    db = get_db()
    
    # Delete all related data
    await db.achievements.delete_many({"user_id": user_id})
    await db.letter_attempts.delete_many({"user_id": user_id})
    await db.learning_sessions.delete_many({"user_id": user_id})
    await db.user_progress.delete_one({"user_id": user_id})
    await db.users.delete_one({"_id": user_id})
    
    return {"status": "deleted", "user_id": user_id}


# -------------------------------------------------
# Session Management Endpoints
# -------------------------------------------------

@router.post("/sessions/start")
async def start_session(req: SessionStartRequest):
    """Start a new learning session."""
    if not await user_exists(req.user_id):
        raise HTTPException(status_code=404, detail="User not found")
    
    db = get_db()
    
    session_doc = {
        "user_id": req.user_id,
        "session_type": req.session_type,
        "started_at": datetime.utcnow(),
        "ended_at": None,
        "duration_seconds": None,
        "letters_practiced": []
    }
    
    result = await db.learning_sessions.insert_one(session_doc)
    session_id = str(result.inserted_id)
    
    return {
        "session_id": session_id,
        "user_id": req.user_id,
        "session_type": req.session_type,
        "started_at": session_doc["started_at"].isoformat()
    }


@router.post("/sessions/end")
async def end_session(req: SessionEndRequest):
    """End a learning session."""
    db = get_db()
    
    try:
        from bson import ObjectId
        
        session = await db.learning_sessions.find_one({"_id": ObjectId(req.session_id)})
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        started_at = session["started_at"]
        ended_at = datetime.utcnow()
        duration = int((ended_at - started_at).total_seconds())
        
        await db.learning_sessions.update_one(
            {"_id": ObjectId(req.session_id)},
            {"$set": {
                "ended_at": ended_at,
                "duration_seconds": duration
            }}
        )
        
        return {
            "session_id": req.session_id,
            "duration_seconds": duration,
            "status": "completed"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ending session: {str(e)}")


@router.get("/sessions/{user_id}")
async def get_user_sessions(user_id: str, limit: int = 10):
    """Get recent sessions for a user."""
    if not await user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    
    db = get_db()
    
    cursor = db.learning_sessions.find(
        {"user_id": user_id}
    ).sort("started_at", -1).limit(limit)
    
    sessions = []
    async for session in cursor:
        sessions.append({
            "session_id": str(session["_id"]),
            "session_type": session["session_type"],
            "started_at": session["started_at"].isoformat(),
            "ended_at": session["ended_at"].isoformat() if session.get("ended_at") else None,
            "duration_seconds": session.get("duration_seconds")
        })
    
    return {"sessions": sessions}


# -------------------------------------------------
# Attempt Tracking Endpoints
# -------------------------------------------------

@router.post("/attempts/record")
async def record_attempt(req: AttemptRecordRequest):
    """Record a letter attempt."""
    if not await user_exists(req.user_id):
        raise HTTPException(status_code=404, detail="User not found")
    
    db = get_db()
    
    from bson import ObjectId
    
    attempt_doc = {
        "user_id": req.user_id,
        "session_id": ObjectId(req.session_id) if req.session_id else None,
        "letter": req.letter,
        "spoken_letter": req.spoken_letter,
        "is_correct": req.is_correct,
        "response_time": req.response_time,
        "timestamp": datetime.utcnow()
    }
    
    result = await db.letter_attempts.insert_one(attempt_doc)
    
    # Update user progress
    await db.user_progress.update_one(
        {"user_id": req.user_id},
        {
            "$inc": {
                "total_attempts": 1,
                "total_correct": 1 if req.is_correct else 0
            },
            "$set": {
                "last_updated": datetime.utcnow()
            }
        }
    )
    
    return {
        "attempt_id": str(result.inserted_id),
        "status": "recorded"
    }


@router.get("/attempts/{user_id}")
async def get_user_attempts(user_id: str, letter: Optional[str] = None, limit: int = 50):
    """Get recent attempts for a user."""
    if not await user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    
    db = get_db()
    
    query = {"user_id": user_id}
    if letter:
        query["letter"] = letter
    
    cursor = db.letter_attempts.find(query).sort("timestamp", -1).limit(limit)
    
    attempts = []
    async for attempt in cursor:
        attempts.append({
            "attempt_id": str(attempt["_id"]),
            "letter": attempt["letter"],
            "spoken_letter": attempt["spoken_letter"],
            "is_correct": attempt["is_correct"],
            "response_time": attempt["response_time"],
            "timestamp": attempt["timestamp"].isoformat()
        })
    
    return {"attempts": attempts}


# -------------------------------------------------
# Progress Tracking Endpoints
# -------------------------------------------------

@router.get("/progress/{user_id}")
async def get_user_progress(user_id: str):
    """Get comprehensive user progress."""
    if not await user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    
    db = get_db()
    
    progress = await db.user_progress.find_one({"user_id": user_id})
    
    # Get letter-specific stats using aggregation
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$letter",
            "attempts": {"$sum": 1},
            "correct": {"$sum": {"$cond": ["$is_correct", 1, 0]}},
            "avg_response_time": {"$avg": "$response_time"}
        }}
    ]
    
    letter_stats = {}
    async for stat in db.letter_attempts.aggregate(pipeline):
        letter = stat["_id"]
        attempts = stat["attempts"]
        correct = stat["correct"]
        # Ensure correct doesn't exceed attempts
        if correct > attempts:
            correct = attempts
        letter_stats[letter] = {
            "attempts": attempts,
            "correct": correct,
            "accuracy": correct / attempts if attempts > 0 else 0,
            "avg_response_time": round(stat["avg_response_time"], 2) if stat.get("avg_response_time") and stat["avg_response_time"] is not None else 0
        }
    
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    
    total_attempts = progress.get("total_attempts", 0)
    total_correct = progress.get("total_correct", 0)
    
    # Ensure total_correct doesn't exceed total_attempts
    if total_correct > total_attempts:
        total_correct = total_attempts
    
    return {
        "user_id": user_id,
        "current_level": progress.get("current_level"),
        "total_sessions": progress.get("total_sessions", 0),
        "total_attempts": total_attempts,
        "total_correct": total_correct,
        "overall_accuracy": total_correct / total_attempts if total_attempts > 0 else 0,
        "mastered_letters": progress.get("mastered_letters", []),
        "learning_letters": progress.get("learning_letters", []),
        "weak_letters": progress.get("weak_letters", []),
        "letter_stats": letter_stats,
        "last_updated": progress["last_updated"].isoformat() if progress.get("last_updated") else None
    }


# -------------------------------------------------
# Achievement Endpoints
# -------------------------------------------------

@router.post("/achievements/award")
async def award_achievement(req: AchievementRequest):
    """Award an achievement to a user."""
    if not await user_exists(req.user_id):
        raise HTTPException(status_code=404, detail="User not found")
    
    db = get_db()
    
    achievement_doc = {
        "user_id": req.user_id,
        "achievement_type": req.achievement_type,
        "achievement_name": req.achievement_name,
        "earned_at": datetime.utcnow(),
        "metadata": req.metadata or {}
    }
    
    result = await db.achievements.insert_one(achievement_doc)
    
    return {
        "achievement_id": str(result.inserted_id),
        "status": "awarded"
    }


@router.get("/achievements/{user_id}")
async def get_user_achievements(user_id: str):
    """Get all achievements for a user."""
    if not await user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    
    db = get_db()
    
    cursor = db.achievements.find({"user_id": user_id}).sort("earned_at", -1)
    
    achievements = []
    async for achievement in cursor:
        achievements.append({
            "achievement_id": str(achievement["_id"]),
            "achievement_type": achievement["achievement_type"],
            "achievement_name": achievement["achievement_name"],
            "earned_at": achievement["earned_at"].isoformat(),
            "metadata": achievement.get("metadata", {})
        })
    
    return {"achievements": achievements}