"""Learning service - business logic for adaptive learning."""

from typing import List, Dict, Optional, Tuple
import random
import logging
import math
import time
from datetime import datetime, timedelta

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

# SM-2 Algorithm Constants
SM2_MIN_EASINESS = 1.3
SM2_MAX_INTERVAL = 365  # days

# Adaptive Difficulty Constants
DIFFICULTY_ADJUSTMENT_RATE = 0.1
ZONE_OF_PROXIMAL_DEVELOPMENT = (0.6, 0.85)  # Target success rate range

# Performance Analysis
TREND_WINDOW = 10  # Number of recent attempts to analyze
FATIGUE_THRESHOLD = 0.7  # Performance drop indicating fatigue


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
        
        # Add consistency bonus based on recent results variance
        consistency_bonus = self._calculate_consistency_bonus(stats)
        
        base_score = (0.6 * accuracy) + (0.25 * speed_score) + streak_bonus + consistency_bonus
        return min(1.0, base_score)
    
    def _calculate_consistency_bonus(self, stats: LetterStats) -> float:
        """Calculate bonus for consistent performance."""
        if len(stats.recent_results) < 5:
            return 0.0
        
        # Low variance = more consistent = bonus
        recent = stats.recent_results[-10:]
        mean = sum(recent) / len(recent)
        variance = sum((x - mean) ** 2 for x in recent) / len(recent)
        
        # Convert variance to bonus (low variance = high bonus)
        consistency = max(0, 1 - variance * 4)  # variance of 0.25 = 0 bonus
        return consistency * 0.05  # Max 5% bonus
    
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
    # SM-2 Spaced Repetition Algorithm
    # =========================================================================
    
    def _update_sm2(self, stats: LetterStats, quality: int) -> None:
        """
        Update SM-2 algorithm parameters.
        Quality: 0-5 (0=complete failure, 5=perfect response)
        """
        # Calculate new easiness factor
        new_ef = stats.easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        stats.easiness_factor = max(SM2_MIN_EASINESS, new_ef)
        
        if quality >= 3:  # Successful recall
            if stats.repetition == 0:
                stats.interval = 1
            elif stats.repetition == 1:
                stats.interval = 6
            else:
                stats.interval = round(stats.interval * stats.easiness_factor)
            stats.repetition += 1
        else:  # Failed recall
            stats.repetition = 0
            stats.interval = 1
        
        # Cap interval
        stats.interval = min(stats.interval, SM2_MAX_INTERVAL)
        
        # Set next review time
        stats.next_review = time.time() + (stats.interval * 86400)  # Convert days to seconds
    
    def _quality_from_response(self, is_correct: bool, response_time: float, avg_time: float) -> int:
        """
        Convert response to SM-2 quality score (0-5).
        """
        if not is_correct:
            return 1  # Wrong answer with hesitation
        
        # Correct answer - grade based on speed
        if response_time <= avg_time * 0.5:
            return 5  # Perfect, very fast
        elif response_time <= avg_time * 0.75:
            return 4  # Correct with hesitation
        elif response_time <= avg_time * 1.25:
            return 3  # Correct after thinking
        else:
            return 3  # Correct but slow
    
    # =========================================================================
    # Adaptive Difficulty System
    # =========================================================================
    
    def _adjust_difficulty(self, user: UserState, recent_performance: float) -> None:
        """Adjust difficulty based on recent performance."""
        target_min, target_max = ZONE_OF_PROXIMAL_DEVELOPMENT
        
        if recent_performance > target_max:
            # Too easy - increase difficulty
            user.current_difficulty = min(1.0, user.current_difficulty + DIFFICULTY_ADJUSTMENT_RATE)
        elif recent_performance < target_min:
            # Too hard - decrease difficulty
            user.current_difficulty = max(0.0, user.current_difficulty - DIFFICULTY_ADJUSTMENT_RATE)
        
        # Track difficulty history
        user.difficulty_history.append(user.current_difficulty)
        if len(user.difficulty_history) > 100:
            user.difficulty_history = user.difficulty_history[-100:]
    
    def _estimate_letter_difficulty(self, stats: LetterStats, all_user_stats: Dict[str, LetterStats]) -> float:
        """Estimate difficulty of a letter based on global and user performance."""
        if stats.attempts < 3:
            return 0.5  # Default medium difficulty
        
        # User's performance on this letter
        user_accuracy = stats.accuracy()
        
        # Confusion complexity (more confusions = harder)
        confusion_factor = min(1.0, len(stats.confused_with) * 0.15)
        
        # Response time relative to user's average
        all_times = [s.avg_response_time for s in all_user_stats.values() if s.attempts > 0]
        avg_user_time = sum(all_times) / len(all_times) if all_times else MAX_RESPONSE_TIME / 2
        time_factor = min(1.0, stats.avg_response_time / avg_user_time) if avg_user_time > 0 else 0.5
        
        # Combine factors (lower accuracy = higher difficulty)
        difficulty = (1 - user_accuracy) * 0.5 + confusion_factor * 0.3 + time_factor * 0.2
        
        stats.difficulty = min(1.0, max(0.0, difficulty))
        return stats.difficulty
    
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
    
    def get_confusion_clusters(self, user: UserState) -> Dict[str, List[str]]:
        """Group letters that are commonly confused with each other."""
        clusters = {}
        
        for letter, stats in user.letters.items():
            if stats.confused_with:
                top_confusion = max(stats.confused_with, key=stats.confused_with.get)
                if stats.confused_with[top_confusion] >= 2:
                    # Create bidirectional cluster
                    cluster_key = tuple(sorted([letter, top_confusion]))
                    if cluster_key not in clusters:
                        clusters[cluster_key] = {"letters": list(cluster_key), "count": 0}
                    clusters[cluster_key]["count"] += stats.confused_with[top_confusion]
        
        return clusters
    
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
        
        # Check for letters needing SM-2 review
        sm2_review_needed = any(
            s.needs_sm2_review() and s.attempts >= MIN_ATTEMPTS_FOR_MASTERY
            for s in user.letters.values()
        )
        
        if sm2_review_needed:
            return "spaced_review"
        
        # Check if any mastered letters need review
        needs_review = any(
            s.attempts >= MIN_ATTEMPTS_FOR_MASTERY 
            and self._calculate_skill_score(s) >= MASTERY_HIGH 
            and s.needs_review("mastered", SPACED_REPETITION)
            for s in user.letters.values()
        )
        
        if needs_review:
            return "review"
        
        # Check for confusion pairs that need focused practice
        confusion_clusters = self.get_confusion_clusters(user)
        if confusion_clusters:
            return "confusion_drill"
        
        return "challenge"
    
    # =========================================================================
    # Intelligent Letter Selection
    # =========================================================================
    
    def _calculate_selection_priority(self, stats: LetterStats, user: UserState) -> float:
        """Calculate priority score for letter selection using multiple factors."""
        priority = 0.0
        
        # 1. SM-2 Review urgency (0-30 points)
        if stats.needs_sm2_review():
            time_overdue = time.time() - stats.next_review
            overdue_days = time_overdue / 86400
            priority += min(30, 15 + overdue_days * 5)
        
        # 2. Retention probability (0-25 points) - prioritize at-risk items
        retention = stats.get_retention_probability()
        if retention < 0.9:
            priority += (1 - retention) * 25
        
        # 3. Performance trend (0-15 points)
        trend = stats.get_recent_trend()
        if trend == "declining":
            priority += 15
        elif trend == "stable" and stats.accuracy() < MASTERY_MID:
            priority += 8
        
        # 4. Difficulty matching (0-20 points) - prefer letters at user's level
        difficulty_match = 1 - abs(stats.difficulty - user.current_difficulty)
        priority += difficulty_match * 20
        
        # 5. Time since last seen (0-10 points)
        hours_since = stats.time_since_last_seen() / 3600
        priority += min(10, hours_since * 0.5)
        
        return priority
    
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
        introduced_letters = []
        
        for letter in all_letters:
            stats = user.letters.get(letter)
            if not stats:
                continue
            
            introduced_letters.append(letter)
            level = self._get_mastery_level(stats)
            buckets[level].append(stats)
            
            # Update difficulty estimate
            self._estimate_letter_difficulty(stats, user.letters)
        
        # Check if we should introduce a new letter
        should_introduce_new = self._should_introduce_new_letter(
            user, introduced_letters, all_letters, buckets
        )
        
        if should_introduce_new and len(introduced_letters) < len(all_letters):
            return self.introduce_new_letter(user, all_letters)
        
        # Select pool based on mode
        pool = self._select_pool_for_mode(mode, buckets)
        
        if not pool:
            return self.introduce_new_letter(user, all_letters)
        
        # Priority-based selection with some randomness
        priorities = [(stats, self._calculate_selection_priority(stats, user)) for stats in pool]
        priorities.sort(key=lambda x: x[1], reverse=True)
        
        # Weighted selection from top candidates (exploration vs exploitation)
        top_candidates = priorities[:min(5, len(priorities))]
        weights = [p[1] + 1 for _, p in enumerate(top_candidates)]  # +1 to avoid zero weights
        
        chosen = random.choices([c[0] for c in top_candidates], weights=weights, k=1)[0]
        return chosen.letter
    
    def _should_introduce_new_letter(
        self, 
        user: UserState, 
        introduced: List[str], 
        all_letters: List[str],
        buckets: Dict[str, List[LetterStats]]
    ) -> bool:
        """Determine if a new letter should be introduced."""
        if not introduced:
            return True
        
        if len(introduced) >= len(all_letters):
            return False
        
        # Find latest practiced letter
        latest_stats = None
        latest_time = 0
        for letter in introduced:
            stats = user.letters.get(letter)
            if stats and stats.last_seen > latest_time:
                latest_time = stats.last_seen
                latest_stats = stats
        
        if latest_stats:
            # Good streak and accuracy -> ready for new letter
            if latest_stats.streak >= 5 and latest_stats.accuracy() >= 0.7:
                return True
            # Or if it's mastered
            if self._get_mastery_level(latest_stats) == "mastered":
                return True
        
        # Also introduce if all current letters are mastered
        if buckets["mastered"] and not buckets["weak"] and not buckets["learning"]:
            return True
        
        # Introduce based on overall progress (every N mastered letters)
        mastered_count = len(buckets["mastered"])
        if mastered_count > 0 and mastered_count % 2 == 0:
            return True
        
        return False
    
    def _select_pool_for_mode(
        self, 
        mode: str, 
        buckets: Dict[str, List[LetterStats]]
    ) -> List[LetterStats]:
        """Select letter pool based on learning mode."""
        if mode == "revision" and buckets["weak"]:
            return buckets["weak"]
        
        elif mode == "spaced_review":
            # Prioritize letters that need SM-2 review
            pool = [s for s in buckets["mastered"] + buckets["learning"] if s.needs_sm2_review()]
            return pool if pool else buckets["learning"]
        
        elif mode == "review" and buckets["mastered"]:
            pool = [s for s in buckets["mastered"] if s.needs_review("mastered", SPACED_REPETITION)]
            return pool if pool else buckets["learning"] or buckets["weak"]
        
        elif mode == "confusion_drill":
            # Focus on commonly confused letters
            confused_letters = set()
            for stats in buckets["weak"] + buckets["learning"]:
                if stats.confused_with:
                    confused_letters.add(stats.letter)
                    confused_letters.update(stats.confused_with.keys())
            return [s for s in buckets["weak"] + buckets["learning"] if s.letter in confused_letters]
        
        elif buckets["learning"]:
            return buckets["learning"]
        
        elif buckets["weak"]:
            return buckets["weak"]
        
        else:
            return buckets["mastered"] if buckets["mastered"] else []
    
    # =========================================================================
    # Learning Step
    # =========================================================================
    
    async def get_learning_step(self, user_id: str, available_letters: List[str]) -> Dict:
        """Get next learning step for user."""
        user = await self.repository.get_user_state(user_id)
        
        mode = self.choose_mode(user)
        next_letter = self.choose_next_letter(user, available_letters)
        
        stats = user.letters.get(next_letter)
        
        # Generate reason based on mode and stats
        reason = self._generate_step_reason(mode, stats, next_letter)
        
        # Calculate expected difficulty for the user
        expected_difficulty = stats.difficulty if stats else 0.5
        
        response = {
            "mode": mode,
            "next_letter": next_letter,
            "reason": reason,
            "difficulty": round(expected_difficulty, 2),
            "user_difficulty_level": round(user.current_difficulty, 2),
        }
        
        if stats:
            retention_prob = stats.get_retention_probability()
            trend = stats.get_recent_trend()
            
            response["context"] = {
                "attempts": stats.attempts,
                "correct": stats.correct,
                "avg_response_time": round(stats.avg_response_time, 2),
                "last_seen_ago": round(stats.time_since_last_seen(), 1),
                "streak": stats.streak,
                "best_streak": stats.best_streak,
                "retention_probability": round(retention_prob, 2),
                "trend": trend,
                "sm2_interval": stats.interval,
                "easiness_factor": round(stats.easiness_factor, 2),
            }
        
        # Build mastery status for all available letters
        mastery_status = {}
        letter_details = {}
        
        for letter in available_letters:
            letter_stats = user.letters.get(letter)
            if letter_stats:
                mastery_status[letter] = self._get_mastery_level(letter_stats)
                letter_details[letter] = {
                    "mastery": mastery_status[letter],
                    "score": round(self._calculate_skill_score(letter_stats), 2),
                    "retention": round(letter_stats.get_retention_probability(), 2),
                    "trend": letter_stats.get_recent_trend(),
                    "needs_review": letter_stats.needs_sm2_review(),
                }
            else:
                mastery_status[letter] = "new"
                letter_details[letter] = {
                    "mastery": "new",
                    "score": 0,
                    "retention": 1.0,
                    "trend": "new",
                    "needs_review": False,
                }
        
        response["mastery_status"] = mastery_status
        response["letter_details"] = letter_details
        
        # Add recommendations
        response["recommendations"] = self._generate_recommendations(user, available_letters)
        
        # Save updated state
        await self.repository.save_user_state(user)
        
        # Update ESP32 state
        await self.repository.set_esp32_current_letter(user_id, next_letter.lower())
        
        return response
    
    def _generate_recommendations(self, user: UserState, available_letters: List[str]) -> List[Dict]:
        """Generate personalized learning recommendations."""
        recommendations = []
        
        # Find letters needing urgent review
        urgent_reviews = []
        for letter, stats in user.letters.items():
            if stats.needs_sm2_review() and stats.get_retention_probability() < 0.7:
                urgent_reviews.append({
                    "letter": letter,
                    "retention": stats.get_retention_probability()
                })
        
        if urgent_reviews:
            urgent_reviews.sort(key=lambda x: x["retention"])
            recommendations.append({
                "type": "urgent_review",
                "message": f"Review {urgent_reviews[0]['letter'].upper()} soon - you might be forgetting it!",
                "priority": "high",
                "letters": [r["letter"] for r in urgent_reviews[:3]]
            })
        
        # Find confusion pairs
        confusion_pairs = self.get_most_confused_pairs(user, top_n=3)
        if confusion_pairs:
            pair = confusion_pairs[0]
            recommendations.append({
                "type": "confusion_focus",
                "message": f"You often confuse {pair[0].upper()} with {pair[1].upper()}. Focus on their differences!",
                "priority": "medium",
                "letters": [pair[0], pair[1]]
            })
        
        # Check for declining performance
        declining = []
        for letter, stats in user.letters.items():
            if stats.get_recent_trend() == "declining":
                declining.append(letter)
        
        if declining:
            recommendations.append({
                "type": "declining_performance",
                "message": f"Your performance on {declining[0].upper()} is declining. Take a break and revisit!",
                "priority": "medium",
                "letters": declining[:3]
            })
        
        # Suggest new letters when ready
        mastered_count = sum(1 for s in user.letters.values() if self._get_mastery_level(s) == "mastered")
        total_available = len(available_letters)
        learned_count = len(user.letters)
        
        if learned_count < total_available and mastered_count >= learned_count * 0.5:
            recommendations.append({
                "type": "ready_for_new",
                "message": "You're doing great! Ready to learn a new letter?",
                "priority": "low",
                "letters": []
            })
        
        return recommendations
    
    def _generate_step_reason(self, mode: str, stats, letter: str) -> str:
        """Generate a human-readable reason for the next step."""
        if not stats or stats.attempts == 0:
            return f"Let's learn a new letter: {letter.upper()}!"
        
        retention = stats.get_retention_probability()
        trend = stats.get_recent_trend()
        
        if mode == "spaced_review":
            if retention < 0.7:
                return f"Time for a quick review of {letter.upper()} before you forget it!"
            return f"Perfect timing to reinforce {letter.upper()}!"
        
        if mode == "revision":
            if trend == "declining":
                return f"Let's work on {letter.upper()} - your recent attempts need a boost."
            return f"Time to practice {letter.upper()} - you're still learning this one."
        
        if mode == "review":
            return f"Let's review {letter.upper()} to keep it fresh!"
        
        if mode == "guided":
            return f"Keep going! Practice makes perfect with {letter.upper()}."
        
        if mode == "confusion_drill":
            if stats.confused_with:
                confused_with = max(stats.confused_with, key=stats.confused_with.get)
                return f"Focus time! {letter.upper()} is often confused with {confused_with.upper()}."
            return f"Let's clarify {letter.upper()}!"
        
        if mode == "challenge":
            accuracy = round(stats.accuracy() * 100)
            if trend == "improving":
                return f"🔥 You're on fire with {letter.upper()}! Keep the momentum!"
            return f"Challenge mode! You have {accuracy}% accuracy on {letter.upper()}."
        
        return f"Next up: {letter.upper()}"
    
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
        stats.session_attempts += 1
        stats.last_seen = time.time()
        
        # Track response time history
        stats.response_times.append(response_time)
        if len(stats.response_times) > TREND_WINDOW:
            stats.response_times = stats.response_times[-TREND_WINDOW:]
        
        # Update moving average response time
        if stats.attempts > 0:
            stats.avg_response_time = (
                ((stats.avg_response_time * (stats.attempts - 1)) + response_time) / stats.attempts
            )
        
        is_correct = spoken_letter.lower() == target_letter.lower()
        
        # Track recent results for trend analysis
        stats.recent_results.append(is_correct)
        if len(stats.recent_results) > TREND_WINDOW:
            stats.recent_results = stats.recent_results[-TREND_WINDOW:]
        
        # Calculate SM-2 quality and update
        quality = self._quality_from_response(is_correct, response_time, stats.avg_response_time)
        self._update_sm2(stats, quality)
        
        if is_correct:
            stats.correct += 1
            stats.session_correct += 1
            stats.streak += 1
            stats.best_streak = max(stats.best_streak, stats.streak)
            
            result = {
                "success": True,
                "accuracy": stats.accuracy(),
                "streak": stats.streak,
                "best_streak": stats.best_streak,
                "mastery_level": self._get_mastery_level(stats),
                "trend": stats.get_recent_trend(),
                "retention_probability": round(stats.get_retention_probability(), 2),
            }
            
            # Check for achievements
            achievements = self._check_achievements(user, stats)
            if achievements:
                result["new_achievements"] = achievements
        else:
            stats.streak = 0
            self.update_confusion(stats, spoken_letter.lower())
            
            result = {
                "success": False,
                "accuracy": stats.accuracy(),
                "streak": 0,
                "mastery_level": self._get_mastery_level(stats),
                "confused_with": spoken_letter.lower(),
                "trend": stats.get_recent_trend(),
                "retention_probability": round(stats.get_retention_probability(), 2),
            }
        
        # Update adaptive difficulty based on recent performance
        recent_accuracy = sum(stats.recent_results) / len(stats.recent_results) if stats.recent_results else 0
        self._adjust_difficulty(user, recent_accuracy)
        
        # Detect fatigue
        fatigue_detected = self._detect_fatigue(user)
        if fatigue_detected:
            result["fatigue_warning"] = True
        
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
        feedback = self._generate_feedback(result, target_letter, stats)
        
        return {
            "result": result,
            "feedback": feedback,
            "next_review_in": self._format_next_review(stats),
        }

    async def update_time_spent(self, user_id: str, seconds: float) -> Dict:
        """Update total time spent by user."""
        await self.repository.add_learning_time(user_id, seconds)
        return {"status": "updated", "added_seconds": seconds}

    
    def _check_achievements(self, user: UserState, stats: LetterStats) -> List[Dict]:
        """Check and award new achievements."""
        new_achievements = []
        
        # Streak achievements
        if stats.streak == 5 and "streak_5" not in user.achievements:
            user.achievements.append("streak_5")
            new_achievements.append({
                "id": "streak_5",
                "title": "Hot Streak!",
                "description": "Got 5 correct answers in a row"
            })
        
        if stats.streak == 10 and "streak_10" not in user.achievements:
            user.achievements.append("streak_10")
            new_achievements.append({
                "id": "streak_10",
                "title": "Unstoppable!",
                "description": "Got 10 correct answers in a row"
            })
        
        # Mastery achievements
        mastered_count = sum(1 for s in user.letters.values() if self._get_mastery_level(s) == "mastered")
        
        if mastered_count >= 5 and "master_5" not in user.achievements:
            user.achievements.append("master_5")
            new_achievements.append({
                "id": "master_5",
                "title": "Quick Learner",
                "description": "Mastered 5 letters"
            })
        
        if mastered_count >= 10 and "master_10" not in user.achievements:
            user.achievements.append("master_10")
            new_achievements.append({
                "id": "master_10",
                "title": "Letter Expert",
                "description": "Mastered 10 letters"
            })
        
        # Speed achievement
        if stats.avg_response_time < 2.0 and stats.attempts >= 10 and "speed_demon" not in user.achievements:
            user.achievements.append("speed_demon")
            new_achievements.append({
                "id": "speed_demon",
                "title": "Speed Demon",
                "description": "Average response time under 2 seconds"
            })
        
        # Perfect accuracy achievement
        if stats.accuracy() == 1.0 and stats.attempts >= 10 and f"perfect_{stats.letter}" not in user.achievements:
            user.achievements.append(f"perfect_{stats.letter}")
            new_achievements.append({
                "id": f"perfect_{stats.letter}",
                "title": f"Perfect {stats.letter.upper()}",
                "description": f"100% accuracy on letter {stats.letter.upper()}"
            })
        
        return new_achievements
    
    def _detect_fatigue(self, user: UserState) -> bool:
        """Detect if user is showing signs of fatigue."""
        # Calculate recent session performance
        total_recent = 0
        correct_recent = 0
        
        for stats in user.letters.values():
            if stats.session_attempts > 0:
                total_recent += stats.session_attempts
                correct_recent += stats.session_correct
        
        if total_recent < 10:
            return False
        
        session_accuracy = correct_recent / total_recent
        overall_accuracy = sum(s.correct for s in user.letters.values()) / max(1, sum(s.attempts for s in user.letters.values()))
        
        # Fatigue detected if session accuracy is significantly lower than overall
        return session_accuracy < overall_accuracy * FATIGUE_THRESHOLD
    
    def _format_next_review(self, stats: LetterStats) -> str:
        """Format next review time as human-readable string."""
        seconds_until = stats.next_review - time.time()
        
        if seconds_until <= 0:
            return "now"
        elif seconds_until < 3600:
            return f"{int(seconds_until / 60)} minutes"
        elif seconds_until < 86400:
            return f"{int(seconds_until / 3600)} hours"
        else:
            return f"{int(seconds_until / 86400)} days"
    
    def _generate_feedback(self, result: Dict, target_letter: str, stats: LetterStats) -> Dict:
        """Generate feedback message intent."""
        trend = stats.get_recent_trend()
        
        if result["success"]:
            if result.get("new_achievements"):
                return {
                    "type": "achievement",
                    "message_key": "achievement_unlocked",
                    "letter": target_letter,
                    "streak": result.get("streak", 0),
                    "achievements": result["new_achievements"],
                }
            
            if result.get("streak", 0) == 5:
                return {
                    "type": "achievement",
                    "message_key": "streak_milestone",
                    "letter": target_letter,
                    "streak": 5,
                }
            
            if trend == "improving":
                return {
                    "type": "positive",
                    "message_key": "improving",
                    "letter": target_letter,
                    "streak": result.get("streak", 0),
                }
            
            return {
                "type": "positive",
                "message_key": "correct_letter",
                "letter": target_letter,
                "streak": result.get("streak", 0),
            }
        
        # Incorrect response
        if result.get("fatigue_warning"):
            return {
                "type": "warning",
                "message_key": "fatigue_detected",
                "letter": target_letter,
                "confused_with": result.get("confused_with"),
            }
        
        if trend == "declining":
            return {
                "type": "corrective",
                "message_key": "take_break",
                "letter": target_letter,
                "confused_with": result.get("confused_with"),
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
        progress = await self.repository.get_user_progress(user_id)
        
        # Calculate letter mastery
        letter_mastery = {}
        total_attempts = 0
        total_correct = 0
        current_streak = 0
        best_streak = 0
        
        for letter, stats in user.letters.items():
            mastery = self._calculate_skill_score(stats)
            letter_mastery[letter] = mastery
            total_attempts += stats.attempts
            total_correct += stats.correct
            current_streak = max(current_streak, stats.streak)
            best_streak = max(best_streak, stats.best_streak)
        
        # Calculate overall accuracy
        overall_accuracy = total_correct / total_attempts if total_attempts > 0 else 0
        
        # Get recent activity (last 24 hours)
        recent_attempts_data = await self.repository.get_recent_attempts(user_id, limit=50)
        recent_attempts = len(recent_attempts_data)
        recent_correct = sum(1 for a in recent_attempts_data if a.get('is_correct', False))
        
        # Calculate mastery distribution
        mastery_distribution = {"mastered": 0, "learning": 0, "weak": 0, "new": 0}
        for letter, stats in user.letters.items():
            level = self._get_mastery_level(stats)
            mastery_distribution[level] = mastery_distribution.get(level, 0) + 1
        
        # Calculate average retention
        retentions = [s.get_retention_probability() for s in user.letters.values() if s.attempts > 0]
        avg_retention = sum(retentions) / len(retentions) if retentions else 1.0
        
        # Find letters needing review
        needs_review = [
            letter for letter, stats in user.letters.items()
            if stats.needs_sm2_review() and stats.attempts >= MIN_ATTEMPTS_FOR_MASTERY
        ]
        
        # Calculate learning velocity (letters mastered per session)
        mastered_count = mastery_distribution.get("mastered", 0)
        session_count = progress.get("total_sessions", 1) if progress else 1
        learning_velocity = mastered_count / max(1, session_count)
        
        # Identify problem areas
        problem_areas = []
        for letter, stats in user.letters.items():
            if stats.get_recent_trend() == "declining":
                problem_areas.append({
                    "letter": letter,
                    "issue": "declining_performance",
                    "accuracy": stats.accuracy()
                })
            if len(stats.confused_with) >= 2:
                problem_areas.append({
                    "letter": letter,
                    "issue": "high_confusion",
                    "confused_with": list(stats.confused_with.keys())
                })
        
        return {
            "user_id": user.user_id,
            "level": user.level,
            "sessions_count": progress.get("total_sessions", 0) if progress else 0,
            "total_attempts": progress.get("total_attempts", 0) if progress else total_attempts,
            "total_correct": progress.get("total_correct", 0) if progress else total_correct,
            "overall_accuracy": round(overall_accuracy, 3),
            "total_time": progress.get("total_time_spent", 0) if progress else user.total_time_spent,
            "current_streak": current_streak,
            "best_streak": best_streak,
            "letter_mastery": letter_mastery,
            "mastery_distribution": mastery_distribution,
            "recent_attempts": recent_attempts,
            "recent_correct": recent_correct,
            "recent_accuracy": round(recent_correct / max(1, recent_attempts), 3),
            "avg_retention": round(avg_retention, 3),
            "needs_review": needs_review,
            "learning_velocity": round(learning_velocity, 2),
            "current_difficulty": round(user.current_difficulty, 2),
            "problem_areas": problem_areas,
            "achievements": user.achievements,
            "letters": [
                {
                    "letter": letter,
                    "attempts": stats.attempts,
                    "correct": stats.correct,
                    "accuracy": round(stats.accuracy(), 3),
                    "avg_response_time": round(stats.avg_response_time, 2),
                    "confused_with": stats.confused_with,
                    "streak": stats.streak,
                    "best_streak": stats.best_streak,
                    "mastery_level": self._get_mastery_level(stats),
                    "skill_score": round(self._calculate_skill_score(stats), 3),
                    "retention": round(stats.get_retention_probability(), 3),
                    "trend": stats.get_recent_trend(),
                    "response_time_trend": stats.get_response_time_trend(),
                    "next_review": self._format_next_review(stats),
                    "difficulty": round(stats.difficulty, 2),
                    "easiness_factor": round(stats.easiness_factor, 2),
                }
                for letter, stats in user.letters.items()
            ],
        }
    
    async def get_learning_insights(self, user_id: str) -> Dict:
        """Get AI-powered learning insights and predictions."""
        user = await self.repository.get_user_state(user_id)
        
        insights = {
            "summary": "",
            "strengths": [],
            "weaknesses": [],
            "predictions": [],
            "optimal_practice_time": None,
            "recommended_session_length": user.optimal_session_length,
        }
        
        if not user.letters:
            insights["summary"] = "Start your learning journey! Begin with the first letter."
            return insights
        
        # Analyze strengths
        for letter, stats in user.letters.items():
            if self._get_mastery_level(stats) == "mastered" and stats.accuracy() >= 0.9:
                insights["strengths"].append({
                    "letter": letter,
                    "accuracy": stats.accuracy(),
                    "reason": "Consistently high performance"
                })
        
        # Analyze weaknesses
        for letter, stats in user.letters.items():
            if self._get_mastery_level(stats) == "weak":
                reasons = []
                if stats.accuracy() < 0.5:
                    reasons.append("Low accuracy")
                if stats.confused_with:
                    reasons.append(f"Often confused with {list(stats.confused_with.keys())[:2]}")
                if stats.get_recent_trend() == "declining":
                    reasons.append("Performance declining")
                
                insights["weaknesses"].append({
                    "letter": letter,
                    "accuracy": stats.accuracy(),
                    "reasons": reasons
                })
        
        # Generate predictions
        for letter, stats in user.letters.items():
            if stats.attempts >= 5:
                retention = stats.get_retention_probability()
                if retention < 0.7:
                    insights["predictions"].append({
                        "letter": letter,
                        "prediction": "at_risk",
                        "message": f"You might forget {letter.upper()} soon without review",
                        "retention": retention
                    })
                elif retention > 0.9 and self._get_mastery_level(stats) == "mastered":
                    insights["predictions"].append({
                        "letter": letter,
                        "prediction": "stable",
                        "message": f"{letter.upper()} is well memorized",
                        "retention": retention
                    })
        
        # Generate summary
        mastered_count = len(insights["strengths"])
        weak_count = len(insights["weaknesses"])
        total_letters = len(user.letters)
        
        if total_letters == 0:
            insights["summary"] = "Let's start learning!"
        elif weak_count == 0 and mastered_count > 0:
            insights["summary"] = f"Excellent progress! You've mastered {mastered_count} letters. Keep it up!"
        elif weak_count > mastered_count:
            insights["summary"] = f"Focus on practicing your weak letters. Slow and steady wins the race!"
        else:
            insights["summary"] = f"Good progress! {mastered_count} mastered, {weak_count} need work."
        
        return insights
    
    async def get_recent_sessions(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent learning sessions for a user."""
        return await self.repository.get_recent_sessions(user_id, limit)
    
    async def get_recent_attempts(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get recent letter attempts for a user."""
        return await self.repository.get_recent_attempts(user_id, limit)
    
    # =========================================================================
    # Reset Progress
    # =========================================================================
    
    async def reset_progress(self, user_id: str) -> None:
        """Reset all learning progress for a user."""
        await self.repository.reset_user_progress(user_id)
