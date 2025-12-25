"""Pydantic models for API requests and responses."""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional
from datetime import datetime


# ============================================================================
# Learning Engine Models
# ============================================================================

class LearningStepRequest(BaseModel):
    """Request model for getting next learning step."""
    user_id: str = Field(..., min_length=1, description="User identifier")
    available_letters: List[str] = Field(..., min_items=1, description="Letters available for learning")
    
    @validator('user_id')
    def validate_user_id(cls, v):
        if not v.strip():
            raise ValueError('user_id cannot be empty or whitespace')
        return v.strip()


class LearningStepResponse(BaseModel):
    """Response model for learning step."""
    next_letter: str
    reason: str
    mastery_status: Dict[str, str]


class AttemptRequest(BaseModel):
    """Request model for recording a learning attempt."""
    user_id: str = Field(..., min_length=1)
    target_letter: str = Field(..., min_length=1)
    spoken_letter: str = Field(..., min_length=1)
    response_time: float = Field(..., ge=0, le=300)
    session_id: Optional[str] = None
    
    @validator('user_id', 'target_letter', 'spoken_letter')
    def validate_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Field cannot be empty or whitespace')
        return v.strip()


class AttemptResult(BaseModel):
    """Result of a learning attempt."""
    success: bool
    accuracy: float
    streak: int
    mastery_level: str


class AttemptResponse(BaseModel):
    """Response model for attempt recording."""
    result: AttemptResult
    feedback: Dict


class UserStatsResponse(BaseModel):
    """Response model for user statistics."""
    user_id: str
    level: str
    session_count: int
    total_time_spent: float
    letters: List[Dict]


# ============================================================================
# Tutorial Models
# ============================================================================

class TutorialStartRequest(BaseModel):
    """Request to start a tutorial session."""
    user_id: str = Field(..., min_length=1)


class TutorialControlRequest(BaseModel):
    """Request to control tutorial (pause, resume, stop)."""
    tutorial_id: str = Field(..., min_length=1)


class TutorialResponse(BaseModel):
    """Response for tutorial operations."""
    tutorial_id: str
    status: str
    message: Optional[str] = None


# ============================================================================
# User Models
# ============================================================================

class UserCreateRequest(BaseModel):
    """Request to create a new user."""
    username: str = Field(..., min_length=3, max_length=50)
    age: Optional[int] = Field(None, ge=3, le=100)
    email: Optional[str] = None
    full_name: Optional[str] = None
    
    @validator('username')
    def validate_username(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, hyphens, and underscores')
        return v.lower()


class UserUpdateRequest(BaseModel):
    """Request to update user information."""
    full_name: Optional[str] = None
    email: Optional[str] = None


class UserResponse(BaseModel):
    """User information response."""
    id: str
    username: str
    age: Optional[int] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    created_at: datetime
    is_active: bool


class SessionCreateRequest(BaseModel):
    """Request to create a learning session."""
    user_id: str
    session_type: str = "practice"


class SessionResponse(BaseModel):
    """Learning session response."""
    session_id: str
    user_id: str
    session_type: str
    start_time: datetime
    end_time: Optional[datetime]
    total_attempts: int
    correct_attempts: int


# ============================================================================
# ESP32 Models
# ============================================================================

class BrailleDotsResponse(BaseModel):
    """Response containing Braille dot pattern."""
    dots: List[int] = Field(..., min_items=6, max_items=6)


class LetterResponse(BaseModel):
    """Response for letter information."""
    letter: str
    dots: List[int]
    description: Optional[str] = None


# ============================================================================
# Health Check Models
# ============================================================================

class HealthCheckResponse(BaseModel):
    """Health check response."""
    status: str
    database: str
    total_users: int
    users_with_progress: int
    stateless: bool
    scalable: bool


class TimeUpdateRequest(BaseModel):
    """Request model for updating learning time."""
    user_id: str = Field(..., min_length=1)
    seconds: float = Field(..., ge=0, description="Time spent in seconds")
