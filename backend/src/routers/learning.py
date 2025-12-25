"""Learning router - adaptive learning endpoints."""

from fastapi import APIRouter, HTTPException, Depends
import logging

from src.models.schemas import (
    LearningStepRequest,
    AttemptRequest,
)
from src.services import LearningService
from src.core.dependencies import get_learning_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/learning", tags=["Learning Engine"])


@router.post("/step")
async def get_learning_step(
    req: LearningStepRequest,
    service: LearningService = Depends(get_learning_service)
):
    """Get the next letter to teach based on adaptive learning algorithm."""
    try:
        result = await service.get_learning_step(req.user_id, req.available_letters)
        return result
    except Exception as e:
        logger.error(f"Error in learning step: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/attempt")
async def record_attempt(
    req: AttemptRequest,
    service: LearningService = Depends(get_learning_service)
):
    """Record a learning attempt and get feedback."""
    try:
        result = await service.process_attempt(
            user_id=req.user_id,
            target_letter=req.target_letter,
            spoken_letter=req.spoken_letter,
            response_time=req.response_time,
            session_id=req.session_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error recording attempt: {e}")
        raise HTTPException(status_code=500, detail="Failed to save attempt")


@router.get("/stats/{user_id}")
async def get_user_stats(
    user_id: str,
    service: LearningService = Depends(get_learning_service)
):
    """Get comprehensive learning statistics for a user."""
    try:
        stats = await service.get_user_stats(user_id)
        return stats
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights/{user_id}")
async def get_learning_insights(
    user_id: str,
    service: LearningService = Depends(get_learning_service)
):
    """Get AI-powered learning insights and predictions for a user."""
    try:
        insights = await service.get_learning_insights(user_id)
        return insights
    except Exception as e:
        logger.error(f"Error getting insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{user_id}")
async def get_user_sessions(
    user_id: str,
    limit: int = 10,
    service: LearningService = Depends(get_learning_service)
):
    """Get recent learning sessions for a user."""
    try:
        sessions = await service.get_recent_sessions(user_id, limit)
        return sessions
    except Exception as e:
        logger.error(f"Error getting sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attempts/{user_id}")
async def get_user_attempts(
    user_id: str,
    limit: int = 20,
    service: LearningService = Depends(get_learning_service)
):
    """Get recent letter attempts for a user."""
    try:
        attempts = await service.get_recent_attempts(user_id, limit)
        return attempts
    except Exception as e:
        logger.error(f"Error getting attempts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset/{user_id}")
async def reset_user_progress(
    user_id: str,
    service: LearningService = Depends(get_learning_service)
):
    """Reset a user's learning progress."""
    try:
        await service.reset_progress(user_id)
        return {"status": "reset", "user_id": user_id}
    except Exception as e:
        logger.error(f"Error resetting progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))
