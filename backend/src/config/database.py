"""Database connection and configuration."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
from urllib.parse import quote_plus, unquote_plus, urlsplit, urlunsplit
import logging

from src.config.settings import get_settings
from src.core.exceptions import DatabaseException

logger = logging.getLogger(__name__)

# Global MongoDB client
_mongodb_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None


def _sanitize_mongodb_url(url: str) -> str:
    """Ensure MongoDB credentials are URL-escaped per RFC 3986.

    PyMongo requires username/password in the URI to be percent-encoded.
    This helper normalizes any provided credentials by unquoting then quoting them.
    """
    if not url:
        return url

    try:
        parsed = urlsplit(url)
        if parsed.scheme not in {"mongodb", "mongodb+srv"}:
            return url

        netloc = parsed.netloc
        if "@" not in netloc:
            return url

        userinfo, hosts = netloc.rsplit("@", 1)
        had_colon = ":" in userinfo
        if had_colon:
            user, password = userinfo.split(":", 1)
        else:
            user, password = userinfo, ""

        user_escaped = quote_plus(unquote_plus(user))
        password_escaped = quote_plus(unquote_plus(password)) if password or had_colon else password

        new_userinfo = f"{user_escaped}:{password_escaped}" if had_colon else user_escaped
        new_netloc = f"{new_userinfo}@{hosts}"

        return urlunsplit((parsed.scheme, new_netloc, parsed.path, parsed.query, parsed.fragment))
    except Exception:
        return url


def _redact_mongodb_url(url: str) -> str:
    """Redact password in MongoDB URL for safe logging."""
    if not url:
        return url

    try:
        parsed = urlsplit(url)
        netloc = parsed.netloc
        if "@" not in netloc:
            return url

        userinfo, hosts = netloc.rsplit("@", 1)
        if ":" in userinfo:
            user, _password = userinfo.split(":", 1)
            redacted_userinfo = f"{user}:****"
        else:
            redacted_userinfo = userinfo

        redacted_netloc = f"{redacted_userinfo}@{hosts}"
        return urlunsplit((parsed.scheme, redacted_netloc, parsed.path, parsed.query, parsed.fragment))
    except Exception:
        return url


async def init_database() -> None:
    """Initialize MongoDB database connection."""
    global _mongodb_client, _database
    
    if _mongodb_client is not None:
        logger.warning("Database already initialized")
        return
    
    try:
        settings = get_settings()
        sanitized_url = _sanitize_mongodb_url(settings.mongodb_url)
        
        logger.info(f"Connecting to MongoDB: {_redact_mongodb_url(sanitized_url)}")
        
        _mongodb_client = AsyncIOMotorClient(sanitized_url)
        _database = _mongodb_client[settings.db_name]
        
        # Test connection
        await _database.command("ping")
        logger.info(f"Successfully connected to database: {settings.db_name}")
        
        # Create indexes
        await _create_indexes()
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def _create_indexes() -> None:
    """Create database indexes for better query performance."""
    try:
        # User indexes
        await _database.users.create_index("username", unique=True)
        await _database.users.create_index("email", unique=True, sparse=True)
        
        # Progress indexes
        await _database.user_progress.create_index("user_id", unique=True)
        
        # Letter stats indexes
        await _database.letter_stats.create_index([("user_id", 1), ("letter", 1)], unique=True)
        
        # Session indexes
        await _database.learning_sessions.create_index("user_id")
        await _database.learning_sessions.create_index("start_time")
        
        # Attempt indexes
        await _database.letter_attempts.create_index("user_id")
        await _database.letter_attempts.create_index("session_id")
        await _database.letter_attempts.create_index("timestamp")
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.warning(f"Error creating indexes: {e}")


async def close_database() -> None:
    """Close MongoDB database connection."""
    global _mongodb_client, _database
    
    if _mongodb_client is None:
        return
    
    try:
        _mongodb_client.close()
        _mongodb_client = None
        _database = None
        logger.info("Database connection closed")
    except Exception as e:
        logger.error(f"Error closing database: {e}")


def get_database() -> AsyncIOMotorDatabase:
    """Get database instance.
    
    Returns:
        AsyncIOMotorDatabase: The database instance
        
    Raises:
        DatabaseException: If database is not initialized
    """
    if _database is None:
        raise DatabaseException("Database not initialized. Call init_database() first.")
    return _database
