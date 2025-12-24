"""Learning service - business logic for adaptive learning."""

from typing import List, Dict
import random
import logging

from src.models.learning import UserState, LetterStats
from src.repositories.learning_repository import LearningRepository
from src.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Learning configuration
MAX_RESPONSE_TIME = settings.max_response_time
MASTERY_HIGH = settings.mastery_high
MASTERY_MID = settings.mastery_mid
MIN_ATTEMPTS_FOR_MASTERY = settings.min_attempts_for_mastery

SPACED_REPETITION = {
    "weak": 60,        # 1 minute
    "learning": 300,   # 5 minutes
    "mastered": 1800,  # 30 minutes
}


class LearningService:
    """Service for learning engine business logic."""
    
    def __init__(self, repository: LearningRepository):
        self.repository = repository
    
    # =========================================================================
    # Skill Evaluation Helper Methods
    # =========================================================================
    
    def _calculate_skill_score(self, stats: LetterStats) -> float:
        """Calculate skill score for a letter."""
        if stats.attempts == 0:
            return 0.0
        
        accuracy = stats.correct / stats.attempts
        speed_score = max(0.0, 1.0 - (stats.avg_response_time / MAX_RESPONSE_TIME))
        streak_bonus = min(0.1, stats.streak * 0.02)
        
        return min(1.0, (0.7 * accuracy) + (0.3 * speed_score) + streak_bonus)
    
    def _get_mastery_level(self, stats: LetterStats) -> str:
        """Determine mastery level for a letter."""
        if stats.attempts < MIN_ATTEMPTS_FOR_MASTERY:
            return "learning"
        
        score = self._calculate_skill_score(stats)
        
        if score >= MASTERY_HIGH:
            return "mastered"
        elif score >= MASTERY_MID:
            return "learning"
        else:
            return "weak"
    
    # =========================================================================
    # Confusion Tracking
    # =========================================================================
    
    def update_confusion(self, stats: LetterStats, wrong_letter: str) -> None:
        """Track which letters are confused with the target."""
        stats.confused_with[wrong_letter] = stats.confused_with.get(wrong_letter, 0) + 1
    
    def get_most_confused_pairs(self, user: UserState, top_n: int = 5) -> List[tuple]:
        """Get the most commonly confused letter pairs."""
        confusion_pairs = []
        
        for letter, stats in user.letters.items():
            for confused, count in stats.confused_with.items():
                confusion_pairs.append((letter, confused, count))
        
        confusion_pairs.sort(key=lambda x: x[2], reverse=True)
        return confusion_pairs[:top_n]
    
    # =========================================================================
    # Mode Selection
    # =========================================================================
    
    def choose_mode(self, user: UserState) -> str:
        """Select learning mode based on user progress."""
        weak_count = sum(
            1 for s in user.letters.values()
            if s.attempts >= MIN_ATTEMPTS_FOR_MASTERY and self._calculate_skill_score(s) < MASTERY_MID
        )
        
        # First 3 sessions are guided
        if user.session_count < 3:
            return "guided"
        
        # If struggling with multiple letters, focus on revision
        if weak_count >= 3:
            return "revision"
        
        # Check if any mastered letters need review
        needs_review = any(
            s.attempts >= MIN_ATTEMPTS_FOR_MASTERY 
            and self._calculate_skill_score(s) >= MASTERY_HIGH 
            and s.needs_review("mastered", SPACED_REPETITION)
            for s in user.letters.values()
        )
        
        if needs_review:
            return "review"
        
        return "challenge"
    
    # =========================================================================
    # Letter Selection
    # =========================================================================
    
    def introduce_new_letter(self, user: UserState, all_letters: List[str]) -> str:
        """Introduce a new letter to the user."""
        for letter in all_letters:
            if letter not in user.letters:
                user.letters[letter] = LetterStats(letter=letter)
                return letter
        
        # All letters introduced, pick least practiced
        return min(user.letters.items(), key=lambda x: x[1].attempts)[0]
    
    def choose_next_letter(self, user: UserState, all_letters: List[str]) -> str:
        """Choose next letter using adaptive algorithm."""
        mode = self.choose_mode(user)
        
        # Categorize letters by mastery level
        buckets = {"weak": [], "learning": [], "mastered": []}
        
        for letter in all_letters:
            stats = user.letters.get(letter)
            if not stats:
                continue
            
            level = self._get_mastery_level(stats)
            buckets[level].append(stats)
        
        # Select pool based on mode
        if mode == "revision" and buckets["weak"]:
            pool = buckets["weak"]
        elif mode == "review" and buckets["mastered"]:
            pool = [s for s in buckets["mastered"] if s.needs_review("mastered", SPACED_REPETITION)]
            if not pool:
                pool = buckets["learning"] if buckets["learning"] else buckets["weak"]
        elif buckets["learning"]:
            pool = buckets["learning"]
        elif buckets["weak"]:
            pool = buckets["weak"]
        else:
            return self.introduce_new_letter(user, all_letters)
        
        if not pool:
            return self.introduce_new_letter(user, all_letters)
        
        # Weight selection by inverse skill score and time since last seen
        weights = []
        for stats in pool:
            score = self._calculate_skill_score(stats)
            skill_weight = 1.0 - score
            time_weight = min(2.0, stats.time_since_last_seen() / 300)
            combined_weight = (skill_weight * 0.7) + (time_weight * 0.3)
            weights.append(max(0.1, combined_weight))
        
        chosen = random.choices(pool, weights=weights, k=1)[0]
        return chosen.letter
    
    # =========================================================================
    # Learning Step
    # =========================================================================
    
    async def get_learning_step(self, user_id: str, available_letters: List[str]) -> Dict:
        """Get next learning step for user."""
        user = await self.repository.get_user_state(user_id)
        
        mode = self.choose_mode(user)
        next_letter = self.choose_next_letter(user, available_letters)
        
        stats = user.letters.get(next_letter)
        
        response = {
            "mode": mode,
            "next_letter": next_letter,
        }
        
        if stats:
            response["context"] = {
                "attempts": stats.attempts,
                "correct": stats.correct,
                "avg_response_time": stats.avg_response_time,
                "last_seen_ago": round(stats.time_since_last_seen(), 1),
                "streak": stats.streak,
            }
        
        # Save updated state
        await self.repository.save_user_state(user)
        
        # Update ESP32 state
        await self.repository.set_esp32_current_letter(user_id, next_letter.lower())
        
        return response
    
    # =========================================================================
    # Attempt Processing
    # =========================================================================
    
    async def process_attempt(
        self,
        user_id: str,
        target_letter: str,
        spoken_letter: str,
        response_time: float,
        session_id: str = None
    ) -> Dict:
        """Process a learning attempt and return results."""
        user = await self.repository.get_user_state(user_id)
        
        # Get or create letter stats
        if target_letter not in user.letters:
            user.letters[target_letter] = LetterStats(letter=target_letter)
        
        stats = user.letters[target_letter]
        
        # Update statistics
        stats.attempts += 1
        stats.last_seen = __import__('time').time()
        
        # Update moving average response time
        if stats.attempts > 0:
            stats.avg_response_time = (
                ((stats.avg_response_time * (stats.attempts - 1)) + response_time) / stats.attempts
            )
        
        is_correct = spoken_letter.lower() == target_letter.lower()
        
        if is_correct:
            stats.correct += 1
            stats.streak += 1
            stats.best_streak = max(stats.best_streak, stats.streak)
            
            result = {
                "success": True,
                "accuracy": stats.accuracy(),
                "streak": stats.streak,
                "mastery_level": self._get_mastery_level(stats)
            }
        else:
            stats.streak = 0
            self.update_confusion(stats, spoken_letter.lower())
            
            result = {
                "success": False,
                "accuracy": stats.accuracy(),
                "streak": 0,
                "mastery_level": self._get_mastery_level(stats),
                "confused_with": spoken_letter.lower()
            }
        
        # Save state to database
        await self.repository.save_user_state(user)
        
        # Record individual attempt
        await self.repository.record_attempt(
            user_id=user_id,
            letter=target_letter,
            spoken_letter=spoken_letter,
            is_correct=is_correct,
            response_time=response_time,
            session_id=session_id
        )
        
        # Increment progress counters
        await self.repository.increment_progress_counters(
            user_id, attempts=1, correct=1 if is_correct else 0
        )
        
        # Generate feedback
        feedback = self._generate_feedback(result, target_letter)
        
        return {
            "result": result,
            "feedback": feedback
        }
    
    def _generate_feedback(self, result: Dict, target_letter: str) -> Dict:
        """Generate feedback message intent."""
        if result["success"]:
            if result.get("streak", 0) == 5:
                return {
                    "type": "achievement",
                    "message_key": "streak_milestone",
                    "letter": target_letter,
                    "streak": 5,
                }
            
            return {
                "type": "positive",
                "message_key": "correct_letter",
                "letter": target_letter,
                "streak": result.get("streak", 0),
            }
        
        return {
            "type": "corrective",
            "message_key": "confusion_help",
            "letter": target_letter,
            "confused_with": result.get("confused_with"),
        }
    
    # =========================================================================
    # User Statistics
    # =========================================================================
    
    async def get_user_stats(self, user_id: str) -> Dict:
        """Get comprehensive learning statistics for a user."""
        user = await self.repository.get_user_state(user_id)
        
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
            })
        
        return {
            "user_id": user.user_id,
            "level": user.level,
            "session_count": user.session_count,
            "total_time_spent": user.total_time_spent,
            "letters": stats_summary,
        }
    
    # =========================================================================
    # Reset Progress
    # =========================================================================
    
    async def reset_progress(self, user_id: str) -> None:
        """Reset all learning progress for a user."""
        await self.repository.reset_user_progress(user_id)
