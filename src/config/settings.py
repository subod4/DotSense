"""Application settings and configuration."""

from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """Application configuration settings."""
    
    # Application
    app_name: str = "Braille Learning API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # MongoDB
    mongodb_url: str
    db_name: str
    
    # CORS
    cors_origins: str = "http://localhost:5173"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Learning Engine
    max_response_time: float = 6.0
    mastery_high: float = 0.85
    mastery_mid: float = 0.6
    min_attempts_for_mastery: int = 5
    
    # Session
    session_timeout: int = 3600  # 1 hour in seconds
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
