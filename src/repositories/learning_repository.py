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
            achievements=progress.get("achievements", [])
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
                best_streak=stat_doc.get("best_streak", 0)
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
        attempt_doc = {
            "user_id": user_id,
            "session_id": ObjectId(session_id) if session_id else None,
            "letter": letter,
            "spoken_letter": spoken_letter,
            "is_correct": is_correct,
            "response_time": response_time,
            "timestamp": datetime.utcnow()
        }
        result = await self.db.letter_attempts.insert_one(attempt_doc)
        return str(result.inserted_id)
    
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
