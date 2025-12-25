"""Repository for learning-related database operations."""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
import logging
import time

from src.models.learning import UserState, LetterStats

logger = logging.getLogger(__name__)


class LearningRepository:
    """Handle all learning progress database operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    # =========================================================================
    # User Progress
    # =========================================================================
    
    async def get_user_progress(self, user_id: str) -> Optional[Dict]:
        """Get user's overall progress."""
        return await self.db.user_progress.find_one({"user_id": user_id})
    
    async def create_user_progress(self, user_id: str) -> Dict:
        """Create default progress for new user."""
        progress_doc = {
            "user_id": user_id,
            "current_level": "letters_basic",
            "total_sessions": 0,
            "total_attempts": 0,
            "total_correct": 0,
            "total_time_spent": 0.0,
            "achievements": [],
            "created_at": datetime.utcnow(),
            "last_updated": datetime.utcnow()
        }
        await self.db.user_progress.insert_one(progress_doc)
        return progress_doc
    
    async def update_user_progress(self, user_id: str, update_data: Dict[str, Any]) -> bool:
        """Update user progress."""
        result = await self.db.user_progress.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    **update_data,
                    "last_updated": datetime.utcnow()
                }
            },
            upsert=True
        )
        return result.modified_count > 0 or result.upserted_id is not None
    
    async def increment_progress_counters(self, user_id: str, attempts: int = 1, correct: int = 0) -> None:
        """Increment attempt and correct counters."""
        await self.db.user_progress.update_one(
            {"user_id": user_id},
            {
                "$inc": {
                    "total_attempts": attempts,
                    "total_correct": correct
                },
                "$set": {"last_updated": datetime.utcnow()}
            }
        )

    async def add_learning_time(self, user_id: str, seconds: float) -> None:
        """Add time to user's total learning time."""
        await self.db.user_progress.update_one(
            {"user_id": user_id},
            {
                "$inc": {"total_time_spent": seconds},
                "$set": {"last_updated": datetime.utcnow()}
            },
            upsert=True
        )

    
    # =========================================================================
    # Letter Statistics
    # =========================================================================
    
    async def get_letter_stats(self, user_id: str) -> List[Dict]:
        """Get all letter statistics for a user."""
        cursor = self.db.letter_stats.find({"user_id": user_id})
        return await cursor.to_list(length=100)
    
    async def get_letter_stat(self, user_id: str, letter: str) -> Optional[Dict]:
        """Get statistics for a specific letter."""
        return await self.db.letter_stats.find_one({
            "user_id": user_id,
            "letter": letter
        })
    
    async def save_letter_stat(self, user_id: str, letter: str, stats: LetterStats) -> None:
        """Save or update letter statistics."""
        await self.db.letter_stats.update_one(
            {"user_id": user_id, "letter": letter},
            {
                "$set": {
                    "attempts": stats.attempts,
                    "correct": stats.correct,
                    "avg_response_time": stats.avg_response_time,
                    "last_seen": stats.last_seen,
                    "confused_with": stats.confused_with,
                    "streak": stats.streak,
                    "best_streak": stats.best_streak,
                    # SM-2 fields
                    "easiness_factor": stats.easiness_factor,
                    "interval": stats.interval,
                    "repetition": stats.repetition,
                    "next_review": stats.next_review,
                    # Trend tracking
                    "recent_results": stats.recent_results[-20:] if stats.recent_results else [],
                    "response_times": stats.response_times[-20:] if stats.response_times else [],
                    # Difficulty estimation
                    "difficulty": stats.difficulty,
                    "discrimination": stats.discrimination,
                    # Session tracking
                    "session_attempts": stats.session_attempts,
                    "session_correct": stats.session_correct,
                    "first_seen": stats.first_seen,
                    "last_updated": datetime.utcnow()
                }
            },
            upsert=True
        )
    
    async def delete_letter_stats(self, user_id: str) -> int:
        """Delete all letter statistics for a user."""
        result = await self.db.letter_stats.delete_many({"user_id": user_id})
        return result.deleted_count
    
    # =========================================================================
    # User State (Combined)
    # =========================================================================
    
    async def get_user_state(self, user_id: str) -> UserState:
        """Load complete user state from database."""
        # Load user progress
        progress = await self.get_user_progress(user_id)
        if not progress:
            progress = await self.create_user_progress(user_id)
        
        # Create UserState object
        user = UserState(
            user_id=user_id,
            level=progress.get("current_level", "letters_basic"),
            session_count=progress.get("total_sessions", 0),
            total_time_spent=progress.get("total_time_spent", 0.0),
            achievements=progress.get("achievements", []),
            # Adaptive fields
            preferred_pace=progress.get("preferred_pace", "normal"),
            learning_style=progress.get("learning_style", "balanced"),
            optimal_session_length=progress.get("optimal_session_length", 15),
            daily_goal=progress.get("daily_goal", 20),
            weekly_streak=progress.get("weekly_streak", 0),
            longest_weekly_streak=progress.get("longest_weekly_streak", 0),
            last_active_date=progress.get("last_active_date", ""),
            current_difficulty=progress.get("current_difficulty", 0.5),
            difficulty_history=progress.get("difficulty_history", []),
        )
        
        # Load per-letter statistics
        letter_stats = await self.get_letter_stats(user_id)
        for stat_doc in letter_stats:
            user.letters[stat_doc["letter"]] = LetterStats(
                letter=stat_doc["letter"],
                attempts=stat_doc.get("attempts", 0),
                correct=stat_doc.get("correct", 0),
                avg_response_time=stat_doc.get("avg_response_time", 0.0),
                last_seen=stat_doc.get("last_seen", time.time()),
                confused_with=stat_doc.get("confused_with", {}),
                streak=stat_doc.get("streak", 0),
                best_streak=stat_doc.get("best_streak", 0),
                # SM-2 fields
                easiness_factor=stat_doc.get("easiness_factor", 2.5),
                interval=stat_doc.get("interval", 1),
                repetition=stat_doc.get("repetition", 0),
                next_review=stat_doc.get("next_review", time.time()),
                # Trend tracking
                recent_results=stat_doc.get("recent_results", []),
                response_times=stat_doc.get("response_times", []),
                # Difficulty estimation
                difficulty=stat_doc.get("difficulty", 0.5),
                discrimination=stat_doc.get("discrimination", 1.0),
                # Session tracking
                session_attempts=stat_doc.get("session_attempts", 0),
                session_correct=stat_doc.get("session_correct", 0),
                first_seen=stat_doc.get("first_seen", time.time()),
            )
        
        return user
    
    async def save_user_state(self, user: UserState) -> None:
        """Save complete user state to database."""
        # Update user progress
        await self.update_user_progress(
            user.user_id,
            {
                "current_level": user.level,
                "total_sessions": user.session_count,
                "total_time_spent": user.total_time_spent,
                "achievements": user.achievements,
                # Adaptive fields
                "preferred_pace": user.preferred_pace,
                "learning_style": user.learning_style,
                "optimal_session_length": user.optimal_session_length,
                "daily_goal": user.daily_goal,
                "weekly_streak": user.weekly_streak,
                "longest_weekly_streak": user.longest_weekly_streak,
                "last_active_date": user.last_active_date,
                "current_difficulty": user.current_difficulty,
                "difficulty_history": user.difficulty_history[-50:] if user.difficulty_history else [],
            }
        )
        
        # Save each letter's statistics
        for letter, stats in user.letters.items():
            await self.save_letter_stat(user.user_id, letter, stats)
    
    # =========================================================================
    # Learning Sessions
    # =========================================================================
    
    async def create_session(self, user_id: str, session_type: str = "practice") -> str:
        """Create a new learning session."""
        session_doc = {
            "user_id": user_id,
            "session_type": session_type,
            "start_time": datetime.utcnow(),
            "end_time": None,
            "total_attempts": 0,
            "correct_attempts": 0,
        }
        result = await self.db.learning_sessions.insert_one(session_doc)
        return str(result.inserted_id)
    
    async def end_session(self, session_id: str, total_attempts: int, correct_attempts: int) -> None:
        """End a learning session."""
        await self.db.learning_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$set": {
                    "end_time": datetime.utcnow(),
                    "total_attempts": total_attempts,
                    "correct_attempts": correct_attempts,
                }
            }
        )
    
    async def get_recent_sessions(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent learning sessions for a user."""
        cursor = self.db.learning_sessions.find(
            {"user_id": user_id}
        ).sort("start_time", -1).limit(limit)
        
        sessions = []
        async for session in cursor:
            # Calculate duration if session has ended
            duration_minutes = 0
            if session.get("end_time") and session.get("start_time"):
                duration = session["end_time"] - session["start_time"]
                duration_minutes = round(duration.total_seconds() / 60)
            
            # Calculate accuracy
            total = session.get("total_attempts", 0)
            correct = session.get("correct_attempts", 0)
            accuracy = round((correct / total * 100) if total > 0 else 0)
            
            # Get unique letters practiced in this session
            letters_practiced = await self._get_session_letters(str(session["_id"]))
            
            sessions.append({
                "id": str(session["_id"]),
                "session_type": session.get("session_type", "practice"),
                "start_time": session.get("start_time").isoformat() if session.get("start_time") else None,
                "end_time": session.get("end_time").isoformat() if session.get("end_time") else None,
                "duration_minutes": duration_minutes,
                "total_attempts": total,
                "correct_attempts": correct,
                "accuracy": accuracy,
                "letters_count": len(letters_practiced),
            })
        
        return sessions
    
    async def _get_session_letters(self, session_id: str) -> List[str]:
        """Get unique letters practiced in a session."""
        try:
            # Handle both ObjectId and string session IDs
            if len(session_id) == 24 and all(c in '0123456789abcdefABCDEF' for c in session_id):
                match_id = ObjectId(session_id)
            else:
                match_id = session_id
            
            pipeline = [
                {"$match": {"session_id": match_id}},
                {"$group": {"_id": "$letter"}}
            ]
            cursor = self.db.letter_attempts.aggregate(pipeline)
            letters = [doc["_id"] async for doc in cursor]
            return letters
        except Exception:
            return []
    
    # =========================================================================
    # Letter Attempts
    # =========================================================================
    
    async def record_attempt(
        self,
        user_id: str,
        letter: str,
        spoken_letter: str,
        is_correct: bool,
        response_time: float,
        session_id: Optional[str] = None
    ) -> str:
        """Record a single letter attempt."""
        # Handle session_id - only convert to ObjectId if it looks like a valid MongoDB ObjectId
        parsed_session_id = None
        if session_id:
            try:
                # Only convert if it's a valid 24-char hex string (MongoDB ObjectId format)
                if len(session_id) == 24 and all(c in '0123456789abcdefABCDEF' for c in session_id):
                    parsed_session_id = ObjectId(session_id)
                else:
                    # Store as string for custom session IDs (e.g., "SESSION-1735035729438")
                    parsed_session_id = session_id
            except Exception:
                parsed_session_id = session_id
        
        attempt_doc = {
            "user_id": user_id,
            "session_id": parsed_session_id,
            "letter": letter,
            "spoken_letter": spoken_letter,
            "is_correct": is_correct,
            "response_time": response_time,
            "timestamp": datetime.utcnow()
        }
        result = await self.db.letter_attempts.insert_one(attempt_doc)
        return str(result.inserted_id)
    
    async def get_recent_attempts(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get recent letter attempts for a user."""
        cursor = self.db.letter_attempts.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(limit)
        
        attempts = []
        async for attempt in cursor:
            attempts.append({
                "id": str(attempt["_id"]),
                "letter": attempt.get("letter", ""),
                "spoken_letter": attempt.get("spoken_letter", ""),
                "is_correct": attempt.get("is_correct", False),
                "response_time": attempt.get("response_time", 0),
                "timestamp": attempt.get("timestamp").isoformat() if attempt.get("timestamp") else None,
            })
        
        return attempts
    
    # =========================================================================
    # ESP32 State
    # =========================================================================
    
    async def get_esp32_current_letter(self, user_id: str) -> str:
        """Get current learning letter for ESP32."""
        esp32_state = await self.db.esp32_state.find_one({"user_id": user_id})
        if esp32_state:
            return esp32_state.get("current_letter", "")
        return ""
    
    async def set_esp32_current_letter(self, user_id: str, letter: str) -> None:
        """Save current learning letter for ESP32."""
        await self.db.esp32_state.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "current_letter": letter,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
    
    async def clear_esp32_state(self, user_id: str) -> None:
        """Clear ESP32 state for a user."""
        await self.db.esp32_state.delete_one({"user_id": user_id})
    
    # =========================================================================
    # Reset
    # =========================================================================
    
    async def reset_user_progress(self, user_id: str) -> None:
        """Reset all learning progress for a user."""
        # Delete all letter stats
        await self.delete_letter_stats(user_id)
        
        # Reset user progress
        await self.update_user_progress(
            user_id,
            {
                "current_level": "letters_basic",
                "total_sessions": 0,
                "total_attempts": 0,
                "total_correct": 0,
                "total_time_spent": 0.0,
                "achievements": [],
            }
        )
        
        # Clear ESP32 state
        await self.clear_esp32_state(user_id)
