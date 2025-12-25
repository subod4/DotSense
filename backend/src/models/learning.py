"""Data models for learning engine."""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional
import time
import math


@dataclass
class LetterStats:
    """Statistics for a single letter's learning progress."""
    letter: str
    attempts: int = 0
    correct: int = 0
    avg_response_time: float = 0.0
    last_seen: float = field(default_factory=time.time)
    confused_with: Dict[str, int] = field(default_factory=dict)
    streak: int = 0
    best_streak: int = 0
    
    # SM-2 Spaced Repetition fields
    easiness_factor: float = 2.5  # E-Factor (1.3 to 2.5+)
    interval: int = 1  # Days until next review
    repetition: int = 0  # Number of successful repetitions in a row
    next_review: float = field(default_factory=time.time)  # When to review next
    
    # Performance trend tracking
    recent_results: List[bool] = field(default_factory=list)  # Last N attempts (True=correct)
    response_times: List[float] = field(default_factory=list)  # Last N response times
    
    # Difficulty estimation (IRT-inspired)
    difficulty: float = 0.5  # Estimated difficulty (0-1, 0.5 = medium)
    discrimination: float = 1.0  # How well this letter differentiates skill levels
    
    # Session-based tracking
    session_attempts: int = 0
    session_correct: int = 0
    first_seen: float = field(default_factory=time.time)

    def accuracy(self) -> float:
        """Calculate accuracy rate for this letter."""
        if self.attempts == 0 or self.attempts < 0:
            return 0.0
        correct_clamped = min(self.correct, self.attempts)
        return correct_clamped / self.attempts
    
    def time_since_last_seen(self) -> float:
        """Get time elapsed since last practice (in seconds)."""
        return time.time() - self.last_seen
    
    def needs_review(self, mastery: str, spaced_repetition: Dict[str, int]) -> bool:
        """Check if letter needs review based on spaced repetition."""
        interval = spaced_repetition.get(mastery, 300)
        return self.time_since_last_seen() >= interval
    
    def needs_sm2_review(self) -> bool:
        """Check if letter needs review based on SM-2 algorithm."""
        return time.time() >= self.next_review
    
    def get_retention_probability(self) -> float:
        """Estimate current retention probability using forgetting curve."""
        time_elapsed = self.time_since_last_seen()
        # Ebbinghaus forgetting curve: R = e^(-t/S)
        # S = stability (derived from easiness factor and repetitions)
        stability = self.easiness_factor * (self.repetition + 1) * 86400  # in seconds
        retention = math.exp(-time_elapsed / stability) if stability > 0 else 0.5
        return min(1.0, max(0.0, retention))
    
    def get_recent_trend(self, window: int = 5) -> str:
        """Analyze recent performance trend."""
        if len(self.recent_results) < 3:
            return "insufficient_data"
        
        recent = self.recent_results[-window:]
        recent_accuracy = sum(recent) / len(recent) if recent else 0
        
        # Compare to overall accuracy
        overall = self.accuracy()
        
        if recent_accuracy > overall + 0.15:
            return "improving"
        elif recent_accuracy < overall - 0.15:
            return "declining"
        else:
            return "stable"
    
    def get_response_time_trend(self, window: int = 5) -> str:
        """Analyze response time trend."""
        if len(self.response_times) < 3:
            return "insufficient_data"
        
        recent = self.response_times[-window:]
        older = self.response_times[:-window] if len(self.response_times) > window else []
        
        if not older:
            return "stable"
        
        recent_avg = sum(recent) / len(recent)
        older_avg = sum(older) / len(older)
        
        if recent_avg < older_avg * 0.8:  # 20% faster
            return "speeding_up"
        elif recent_avg > older_avg * 1.2:  # 20% slower
            return "slowing_down"
        else:
            return "stable"


@dataclass
class LearningSession:
    """Track a learning session."""
    session_id: str
    user_id: str
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    letters_practiced: List[str] = field(default_factory=list)
    total_attempts: int = 0
    correct_attempts: int = 0
    avg_response_time: float = 0.0
    mood_score: Optional[float] = None  # Optional user-reported mood
    focus_score: float = 1.0  # Estimated focus level based on performance


@dataclass
class UserState:
    """Complete user learning state."""
    user_id: str
    level: str = "letters_basic"
    session_count: int = 0
    letters: Dict[str, LetterStats] = field(default_factory=dict)
    total_time_spent: float = 0.0
    achievements: List[str] = field(default_factory=list)
    
    # Learning preferences (adaptive)
    preferred_pace: str = "normal"  # slow, normal, fast
    learning_style: str = "balanced"  # visual, auditory, balanced
    optimal_session_length: int = 15  # minutes
    
    # Performance tracking
    daily_goal: int = 20  # attempts per day
    weekly_streak: int = 0
    longest_weekly_streak: int = 0
    last_active_date: str = ""
    
    # Adaptive difficulty
    current_difficulty: float = 0.5  # 0-1, adjusts based on performance
    difficulty_history: List[float] = field(default_factory=list)
