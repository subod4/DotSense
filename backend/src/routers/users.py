"""User router - user management endpoints."""

from fastapi import APIRouter, HTTPException, Depends
import logging
from typing import List

from src.models.schemas import (
    UserCreateRequest,
    UserUpdateRequest,
    UserResponse,
)
from src.services import UserService
from src.core.dependencies import get_user_service
from src.core.exceptions import UserAlreadyExistsException, UserNotFoundException

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/users", tags=["User Management"])


@router.post("/create", response_model=UserResponse)
async def create_user(
    req: UserCreateRequest,
    service: UserService = Depends(get_user_service)
):
    """Create a new user."""
    try:
        user = await service.create_user(req)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except UserAlreadyExistsException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    service: UserService = Depends(get_user_service)
):
    """Get user by ID."""
    user = await service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/username/{username}", response_model=UserResponse)
async def get_user_by_username(
    username: str,
    service: UserService = Depends(get_user_service)
):
    """Get user by username."""
    user = await service.get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    req: UserUpdateRequest,
    service: UserService = Depends(get_user_service)
):
    """Update user information."""
    try:
        success = await service.update_user(user_id, req)
        if not success:
            raise HTTPException(status_code=404, detail="User not found or no changes made")
        return {"status": "updated", "user_id": user_id}
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user")


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    service: UserService = Depends(get_user_service)
):
    """Delete a user (soft delete)."""
    try:
        success = await service.delete_user(user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        return {"status": "deleted", "user_id": user_id}
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user")


@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    service: UserService = Depends(get_user_service)
):
    """List all users."""
    try:
        users = await service.list_users(skip=skip, limit=limit)
        return users
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(status_code=500, detail="Failed to list users")
