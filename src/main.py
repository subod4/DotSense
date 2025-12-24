"""Main application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

from src.config import get_settings, init_database, close_database
from src.core.logging import setup_logging
from src.core.exceptions import DatabaseException
from src.routers import learning, tutorial, users, esp32, health

# Get settings
settings = get_settings()

# Setup logging
setup_logging(debug=settings.debug)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting Braille Learning API...")
    await init_database()
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    await close_database()
    logger.info("Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="Adaptive learning system for Braille education",
    version=settings.app_version,
    lifespan=lifespan
)


@app.exception_handler(DatabaseException)
async def database_exception_handler(_request, exc: DatabaseException):
    logger.error("Database error: %s", exc)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


@app.exception_handler(ServerSelectionTimeoutError)
async def mongo_server_selection_timeout_handler(_request, exc: ServerSelectionTimeoutError):
    # Common causes: DNS issues, blocked network, MongoDB Atlas IP allowlist.
    logger.error("MongoDB server selection timeout: %s", exc)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


@app.exception_handler(PyMongoError)
async def mongo_error_handler(_request, exc: PyMongoError):
    logger.error("MongoDB operation failed: %s", exc)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)         # Root and health endpoints
app.include_router(learning.router)       # /api/learning/*
app.include_router(tutorial.router)       # /api/tutorial/*
app.include_router(users.router)          # /api/users/*
app.include_router(esp32.router)          # /api/esp32/*


# Constants endpoint for frontend
@app.get("/api/constants")
async def get_learning_constants():
    """Return learning engine constants for frontend calculations."""
    return {
        "MAX_RESPONSE_TIME": settings.max_response_time,
        "MASTERY_HIGH": settings.mastery_high,
        "MASTERY_MID": settings.mastery_mid,
        "MIN_ATTEMPTS_FOR_MASTERY": settings.min_attempts_for_mastery,
        "CONFIDENCE_Z_SCORE": 1.96,
    }


logger.info("All routers registered")


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting server on {settings.host}:{settings.port}")
    logger.info(f"API docs available at http://{settings.host}:{settings.port}/docs")
    
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
