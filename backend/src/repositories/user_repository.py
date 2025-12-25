"""Repository for user-related database operations."""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)


class UserRepository:
    """Handle all user-related database operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def create_user(self, user_data: Dict[str, Any]) -> str:
        """Create a new user.
        
        Args:
            user_data: User information dictionary
            
        Returns:
            str: Created user ID
        """
        user_doc = {
            **user_data,
            "created_at": datetime.utcnow(),
            "is_active": True,
        }
        result = await self.db.users.insert_one(user_doc)
        return str(result.inserted_id)
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID."""
        try:
            user = await self.db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                user["id"] = str(user.pop("_id"))
            return user
        except Exception as e:
            logger.error(f"Error fetching user {user_id}: {e}")
            return None
    
    async def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username."""
        user = await self.db.users.find_one({"username": username})
        if user:
            user["id"] = str(user.pop("_id"))
        return user
    
    async def update_user(self, user_id: str, update_data: Dict[str, Any]) -> bool:
        """Update user information."""
        try:
            result = await self.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {**update_data, "updated_at": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {e}")
            return False
    
    async def delete_user(self, user_id: str) -> bool:
        """Soft delete a user."""
        return await self.update_user(user_id, {"is_active": False})
    
    async def list_users(self, skip: int = 0, limit: int = 100) -> list:
        """List all active users."""
        cursor = self.db.users.find({"is_active": True}).skip(skip).limit(limit)
        users = await cursor.to_list(length=limit)
        for user in users:
            user["id"] = str(user.pop("_id"))
        return users
    
    async def count_users(self) -> int:
        """Count total users."""
        return await self.db.users.count_documents({"is_active": True})
