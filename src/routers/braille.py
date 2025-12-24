from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator
import logging
from src.core.mqtt import publisher

router = APIRouter(prefix="/api/braille", tags=["Braille Display"])
logger = logging.getLogger(__name__)

class LetterRequest(BaseModel):
    letter: str = Field(..., description="Single letter A-Z")
    
    @field_validator('letter')
    @classmethod
    def validate_letter(cls, v):
        if not v or len(v) != 1 or not v.isalpha():
            raise ValueError('Must be a single letter A-Z')
        return v.upper()

class SuccessResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}

@router.post("/letter", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
async def send_letter(request: LetterRequest):
    """
    Send a single letter to the 6-dot Braille display via MQTT.
    
    - **letter**: Single character A-Z (case insensitive)
    """
    if not publisher.connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="MQTT broker not connected"
        )
    
    success = publisher.publish_letter(request.letter)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to publish letter to MQTT"
        )
    
    return SuccessResponse(
        success=True,
        message=f"Letter '{request.letter}' sent to Braille display",
        data={"letter": request.letter}
    )
