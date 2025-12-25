"""Dependency injection for FastAPI."""

from typing import AsyncGenerator
from fastapi import Depends

from src.config.database import get_database
from src.repositories import UserRepository, LearningRepository
from src.services import UserService, LearningService


async def get_user_repository() -> UserRepository:
    """Get user repository instance."""
    db = get_database()
    return UserRepository(db)


async def get_learning_repository() -> LearningRepository:
    """Get learning repository instance."""
    db = get_database()
    return LearningRepository(db)


async def get_user_service(
    repository: UserRepository = Depends(get_user_repository)
) -> UserService:
    """Get user service instance."""
    return UserService(repository)


async def get_learning_service(
    repository: LearningRepository = Depends(get_learning_repository)
) -> LearningService:
    """Get learning service instance."""
    return LearningService(repository)
