"""User service - business logic for user management."""

from typing import Optional, List, Dict, Any
import logging

from src.repositories.user_repository import UserRepository
from src.models.schemas import UserCreateRequest, UserUpdateRequest

logger = logging.getLogger(__name__)


class UserService:
    """Service for user management business logic."""
    
    def __init__(self, repository: UserRepository):
        self.repository = repository
    
    async def create_user(self, request: UserCreateRequest) -> Dict:
        """Create a new user."""
        # Check if username already exists
        existing = await self.repository.get_user_by_username(request.username)
        if existing:
            raise ValueError(f"Username '{request.username}' already exists")
        
        user_data = {
            "username": request.username,
            "age": request.age,
            "email": request.email,
            "full_name": request.full_name,
        }
        
        user_id = await self.repository.create_user(user_data)
        user = await self.repository.get_user_by_id(user_id)
        
        logger.info(f"Created new user: {request.username}")
        return user
    
    async def get_user(self, user_id: str) -> Optional[Dict]:
        """Get user by ID."""
        return await self.repository.get_user_by_id(user_id)
    
    async def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username."""
        return await self.repository.get_user_by_username(username)
    
    async def update_user(self, user_id: str, request: UserUpdateRequest) -> bool:
        """Update user information."""
        update_data = {}
        if request.full_name is not None:
            update_data["full_name"] = request.full_name
        if request.email is not None:
            update_data["email"] = request.email
        
        if not update_data:
            return False
        
        success = await self.repository.update_user(user_id, update_data)
        if success:
            logger.info(f"Updated user {user_id}")
        return success
    
    async def delete_user(self, user_id: str) -> bool:
        """Soft delete a user."""
        success = await self.repository.delete_user(user_id)
        if success:
            logger.info(f"Deleted user {user_id}")
        return success
    
    async def list_users(self, skip: int = 0, limit: int = 100) -> List[Dict]:
        """List all active users."""
        return await self.repository.list_users(skip, limit)
    
    async def get_user_count(self) -> int:
        """Get total number of users."""
        return await self.repository.count_users()
