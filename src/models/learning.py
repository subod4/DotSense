"""Data models for learning engine."""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List
import time


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


@dataclass
class UserState:
    """Complete user learning state."""
    user_id: str
    level: str = "letters_basic"
    session_count: int = 0
    letters: Dict[str, LetterStats] = field(default_factory=dict)
    total_time_spent: float = 0.0
    achievements: List[str] = field(default_factory=list)
