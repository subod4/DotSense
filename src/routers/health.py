"""Health check and info router."""

from fastapi import APIRouter
import logging

from src.config.database import get_database
from src.utils.constants import LEARNING_CONSTANTS

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Health & Info"])


@router.get("/")
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
            "health": "/api/health",
            "docs": "/docs"
        }
    }


@router.get("/api/constants")
def get_constants():
    """Get learning engine constants for frontend calculations."""
    return LEARNING_CONSTANTS


@router.get("/api/health")
async def health_check():
    """Detailed health check."""
    try:
        db = get_database()
        user_count = await db.users.count_documents({})
        progress_count = await db.user_progress.count_documents({})
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        user_count = 0
        progress_count = 0
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "total_users": user_count,
        "users_with_progress": progress_count,
        "stateless": True,
        "scalable": True
    }
