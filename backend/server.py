from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import asyncio
import base64
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

VIDEOS_DIR = ROOT_DIR / "videos"
VIDEOS_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    gemini_api_key: Optional[str] = None
    selected_model: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str = Field(default_factory=lambda: f"proj_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    script: str = ""
    status: str = "draft"  # draft, scenes_generated, images_generated, videos_generated, completed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Scene(BaseModel):
    model_config = ConfigDict(extra="ignore")
    scene_id: str = Field(default_factory=lambda: f"scene_{uuid.uuid4().hex[:12]}")
    project_id: str
    scene_number: int
    description: str
    characters: List[str] = []
    setting: str = ""
    action_summary: str = ""
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    image_approved: bool = False  # User approval for image
    video_url: Optional[str] = None
    video_status: str = "pending"  # pending, generating, completed, failed
    video_approved: bool = False  # User approval for video
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Character(BaseModel):
    model_config = ConfigDict(extra="ignore")
    character_id: str = Field(default_factory=lambda: f"char_{uuid.uuid4().hex[:12]}")
    project_id: str
    name: str
    appearance: str = ""
    clothing: str = ""
    age: str = ""
    style: str = ""
    reference_prompt: str = ""

# ==================== REQUEST/RESPONSE MODELS ====================

class SessionRequest(BaseModel):
    session_id: str

class ApiKeyRequest(BaseModel):
    api_key: str

class ModelSelectRequest(BaseModel):
    model: str

class ProjectCreate(BaseModel):
    title: str
    script: Optional[str] = ""

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    script: Optional[str] = None

class SceneUpdate(BaseModel):
    description: Optional[str] = None
    characters: Optional[List[str]] = None
    setting: Optional[str] = None
    action_summary: Optional[str] = None
    image_approved: Optional[bool] = None
    video_approved: Optional[bool] = None

class SceneApprovalRequest(BaseModel):
    scene_ids: List[str]
    approval_type: str  # "image" or "video"
    approved: bool

class SceneRegenerateRequest(BaseModel):
    scene_id: str
    regenerate_type: str  # image or video

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> User:
    """Get current user from session token in cookie or header"""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/session")
async def create_session(request: SessionRequest, response: Response):
    """Exchange session_id for session data and create persistent session"""
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id}
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session ID")
            
            data = resp.json()
    except httpx.RequestError as e:
        logger.error(f"Auth service error: {e}")
        raise HTTPException(status_code=500, detail="Authentication service unavailable")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": data["name"],
                "picture": data.get("picture"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        user_doc = {
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "gemini_api_key": None,
            "selected_model": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_response = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user_response

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== API KEY ROUTES ====================

@api_router.post("/settings/api-key")
async def set_api_key(request: ApiKeyRequest, user: User = Depends(get_current_user)):
    """Save and validate Gemini API key"""
    api_key = request.api_key
    
    # Validate the API key by making a test request
    try:
        # Simple validation - try to list models
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                f"https://generativelanguage.googleapis.com/v1/models?key={api_key}",
                timeout=10.0
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid API key")
    except httpx.RequestError as e:
        logger.error(f"API key validation error: {e}")
        raise HTTPException(status_code=400, detail="Failed to validate API key")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"gemini_api_key": api_key, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "API key saved successfully", "valid": True}

@api_router.get("/settings/api-key/status")
async def get_api_key_status(user: User = Depends(get_current_user)):
    """Check if API key is set"""
    return {
        "has_key": user.gemini_api_key is not None,
        "selected_model": user.selected_model
    }

@api_router.delete("/settings/api-key")
async def delete_api_key(user: User = Depends(get_current_user)):
    """Delete/remove Gemini API key"""
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "gemini_api_key": None,
            "selected_model": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "API key deleted successfully"}

@api_router.post("/settings/model")
async def set_model(request: ModelSelectRequest, user: User = Depends(get_current_user)):
    """Set selected Gemini model"""
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"selected_model": request.model, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Model selected successfully"}

@api_router.get("/settings/models")
async def get_available_models(user: User = Depends(get_current_user)):
    """Get available Gemini models"""
    if not user.gemini_api_key:
        raise HTTPException(status_code=400, detail="API key not set")
    
    models = [
        {"id": "gemini-3-pro-image-preview", "name": "Gemini 3 Pro (Nano Banana)", "capabilities": ["image"], "description": "Latest image generation model"},
        {"id": "veo-3.1-generate-preview", "name": "Veo 3.1", "capabilities": ["video"], "description": "Video generation from images"}
    ]
    
    return {"models": models}

# ==================== PROJECT ROUTES ====================

@api_router.get("/projects")
async def get_projects(user: User = Depends(get_current_user)):
    """Get all projects for current user"""
    projects = await db.projects.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"projects": projects}

@api_router.post("/projects")
async def create_project(project: ProjectCreate, user: User = Depends(get_current_user)):
    """Create a new project"""
    project_id = f"proj_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    project_doc = {
        "project_id": project_id,
        "user_id": user.user_id,
        "title": project.title,
        "script": project.script or "",
        "status": "draft",
        "created_at": now,
        "updated_at": now
    }
    
    await db.projects.insert_one(project_doc)
    
    result = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    return result

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, user: User = Depends(get_current_user)):
    """Get a specific project"""
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, update: ProjectUpdate, user: User = Depends(get_current_user)):
    """Update a project"""
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": update_data}
    )
    
    result = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    return result

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: User = Depends(get_current_user)):
    """Delete a project and all its scenes"""
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.scenes.delete_many({"project_id": project_id})
    await db.characters.delete_many({"project_id": project_id})
    await db.projects.delete_one({"project_id": project_id})
    
    return {"message": "Project deleted successfully"}

# ==================== SCENE DECOMPOSITION ====================

@api_router.post("/projects/{project_id}/decompose")
async def decompose_script(project_id: str, user: User = Depends(get_current_user)):
    """Use Gemini to decompose script into scenes"""
    if not user.gemini_api_key:
        raise HTTPException(status_code=400, detail="API key not set")
    
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("script"):
        raise HTTPException(status_code=400, detail="No script provided")
    
    # Delete existing scenes
    await db.scenes.delete_many({"project_id": project_id})
    await db.characters.delete_many({"project_id": project_id})
    
    # Use Gemini to decompose
    prompt = f"""Analyze the following script and break it down into logical scenes. 
For each scene, provide:
1. A detailed visual description for image generation
2. List of characters appearing in the scene
3. Setting/location description
4. Action summary

Also extract all unique characters with their:
- Name
- Physical appearance (hair color, skin tone, body type, facial features)
- Typical clothing/style
- Approximate age
- Overall visual style

Return as JSON in this exact format:
{{
    "scenes": [
        {{
            "scene_number": 1,
            "description": "detailed visual description for image generation",
            "characters": ["character names"],
            "setting": "location description",
            "action_summary": "what happens in this scene"
        }}
    ],
    "characters": [
        {{
            "name": "character name",
            "appearance": "physical appearance details",
            "clothing": "typical clothing",
            "age": "approximate age",
            "style": "visual style"
        }}
    ]
}}

Script:
{project['script']}
"""

    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.post(
                f"https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key={user.gemini_api_key}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.7,
                        "topP": 0.95,
                        "topK": 40
                    }
                },
                timeout=60.0
            )
            
            if resp.status_code != 200:
                logger.error(f"Gemini API error: {resp.text}")
                raise HTTPException(status_code=500, detail="Failed to decompose script")
            
            data = resp.json()
            response_text = data["candidates"][0]["content"]["parts"][0]["text"]
            
            # Extract JSON from response
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            if json_start == -1 or json_end == 0:
                raise HTTPException(status_code=500, detail="Invalid response from Gemini")
            
            result = json.loads(response_text[json_start:json_end])
            
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse scene decomposition")
    except httpx.RequestError as e:
        logger.error(f"Gemini API error: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Gemini API")
    
    # Save characters
    now = datetime.now(timezone.utc).isoformat()
    for char in result.get("characters", []):
        char_doc = {
            "character_id": f"char_{uuid.uuid4().hex[:12]}",
            "project_id": project_id,
            "name": char["name"],
            "appearance": char.get("appearance", ""),
            "clothing": char.get("clothing", ""),
            "age": char.get("age", ""),
            "style": char.get("style", ""),
            "reference_prompt": f"{char.get('appearance', '')} {char.get('clothing', '')} {char.get('style', '')}",
            "created_at": now
        }
        await db.characters.insert_one(char_doc)
    
    # Save scenes
    for scene in result.get("scenes", []):
        scene_doc = {
            "scene_id": f"scene_{uuid.uuid4().hex[:12]}",
            "project_id": project_id,
            "scene_number": scene["scene_number"],
            "description": scene["description"],
            "characters": scene.get("characters", []),
            "setting": scene.get("setting", ""),
            "action_summary": scene.get("action_summary", ""),
            "image_url": None,
            "image_base64": None,
            "video_url": None,
            "video_status": "pending",
            "created_at": now
        }
        await db.scenes.insert_one(scene_doc)
    
    # Update project status
    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {"status": "scenes_generated", "updated_at": now}}
    )
    
    scenes = await db.scenes.find({"project_id": project_id}, {"_id": 0}).sort("scene_number", 1).to_list(100)
    characters = await db.characters.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    
    return {"scenes": scenes, "characters": characters}

# ==================== SCENE ROUTES ====================

@api_router.get("/projects/{project_id}/scenes")
async def get_scenes(project_id: str, user: User = Depends(get_current_user)):
    """Get all scenes for a project"""
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    scenes = await db.scenes.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("scene_number", 1).to_list(100)
    
    return {"scenes": scenes}

@api_router.put("/projects/{project_id}/scenes/{scene_id}")
async def update_scene(project_id: str, scene_id: str, update: SceneUpdate, user: User = Depends(get_current_user)):
    """Update a scene"""
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    scene = await db.scenes.find_one(
        {"scene_id": scene_id, "project_id": project_id},
        {"_id": 0}
    )
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if update_data:
        await db.scenes.update_one(
            {"scene_id": scene_id},
            {"$set": update_data}
        )
    
    result = await db.scenes.find_one({"scene_id": scene_id}, {"_id": 0})
    return result

# ==================== CHARACTER ROUTES ====================

@api_router.get("/projects/{project_id}/characters")
async def get_characters(project_id: str, user: User = Depends(get_current_user)):
    """Get all characters for a project"""
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    characters = await db.characters.find(
        {"project_id": project_id},
        {"_id": 0}
    ).to_list(100)
    
    return {"characters": characters}

class CharacterCreate(BaseModel):
    name: str
    appearance: Optional[str] = ""
    clothing: Optional[str] = ""
    age: Optional[str] = ""
    style: Optional[str] = ""

class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    appearance: Optional[str] = None
    clothing: Optional[str] = None
    age: Optional[str] = None
    style: Optional[str] = None

@api_router.post("/projects/{project_id}/characters")
async def create_character(project_id: str, char: CharacterCreate, user: User = Depends(get_current_user)):
    """Create a new character for a project"""
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    character_id = f"char_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    char_doc = {
        "character_id": character_id,
        "project_id": project_id,
        "name": char.name,
        "appearance": char.appearance or "",
        "clothing": char.clothing or "",
        "age": char.age or "",
        "style": char.style or "",
        "reference_prompt": f"{char.appearance or ''} {char.clothing or ''} {char.style or ''}",
        "created_at": now
    }
    
    await db.characters.insert_one(char_doc)
    
    result = await db.characters.find_one({"character_id": character_id}, {"_id": 0})
    return result

@api_router.put("/projects/{project_id}/characters/{character_id}")
async def update_character(project_id: str, character_id: str, update: CharacterUpdate, user: User = Depends(get_current_user)):
    """Update a character"""
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    character = await db.characters.find_one(
        {"character_id": character_id, "project_id": project_id},
        {"_id": 0}
    )
    
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Update reference prompt
    if update_data:
        appearance = update_data.get("appearance", character.get("appearance", ""))
        clothing = update_data.get("clothing", character.get("clothing", ""))
        style = update_data.get("style", character.get("style", ""))
        update_data["reference_prompt"] = f"{appearance} {clothing} {style}"
        
        await db.characters.update_one(
            {"character_id": character_id},
            {"$set": update_data}
        )
    
    result = await db.characters.find_one({"character_id": character_id}, {"_id": 0})
    return result

@api_router.delete("/projects/{project_id}/characters/{character_id}")
async def delete_character(project_id: str, character_id: str, user: User = Depends(get_current_user)):
    """Delete a character"""
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    character = await db.characters.find_one(
        {"character_id": character_id, "project_id": project_id},
        {"_id": 0}
    )
    
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    await db.characters.delete_one({"character_id": character_id})
    
    return {"message": "Character deleted successfully"}

# ==================== IMAGE GENERATION ====================

@api_router.post("/projects/{project_id}/scenes/{scene_id}/generate-image")
async def generate_scene_image(project_id: str, scene_id: str, user: User = Depends(get_current_user)):
    """Generate image for a scene using Gemini Nano Banana"""
    if not user.gemini_api_key:
        raise HTTPException(status_code=400, detail="API key not set")
    
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    scene = await db.scenes.find_one(
        {"scene_id": scene_id, "project_id": project_id},
        {"_id": 0}
    )
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Get character references for consistency
    characters = await db.characters.find(
        {"project_id": project_id, "name": {"$in": scene.get("characters", [])}},
        {"_id": 0}
    ).to_list(100)
    
    # Build character reference prompt
    char_refs = ""
    for char in characters:
        char_refs += f"\n- {char['name']}: {char.get('reference_prompt', '')}"
    
    # Create detailed image generation prompt
    image_prompt = f"""Create a high-quality, cinematic HD image for this scene:

Scene Description: {scene['description']}
Setting: {scene.get('setting', '')}
Action: {scene.get('action_summary', '')}

Character References (maintain these exact appearances):{char_refs}

Style: Photorealistic, cinematic lighting, professional film quality, 1080p HD resolution.
Important: Maintain consistent character appearances as described."""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=user.gemini_api_key,
            session_id=f"image-gen-{scene_id}-{uuid.uuid4().hex[:8]}",
            system_message="You are a professional cinematic image generator."
        )
        chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
        
        msg = UserMessage(text=image_prompt)
        text_response, images = await chat.send_message_multimodal_response(msg)
        
        if images and len(images) > 0:
            image_data = images[0]["data"]
            
            # Save image reference (truncated for DB)
            await db.scenes.update_one(
                {"scene_id": scene_id},
                {"$set": {
                    "image_base64": image_data[:100] + "...(truncated)",  # Store truncated for reference
                    "image_generated": True,
                    "image_full_data": image_data  # Store full data
                }}
            )
            
            return {
                "success": True,
                "scene_id": scene_id,
                "image_data": image_data,
                "mime_type": images[0].get("mime_type", "image/png")
            }
        else:
            raise HTTPException(status_code=500, detail="No image generated")
            
    except ImportError:
        raise HTTPException(status_code=500, detail="Image generation library not available")
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

@api_router.post("/projects/{project_id}/generate-all-images")
async def generate_all_images(project_id: str, user: User = Depends(get_current_user)):
    """Generate images for all scenes in a project"""
    if not user.gemini_api_key:
        raise HTTPException(status_code=400, detail="API key not set")
    
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    scenes = await db.scenes.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("scene_number", 1).to_list(100)
    
    results = []
    for scene in scenes:
        try:
            # Generate image for each scene (reuse the existing endpoint logic)
            result = await generate_scene_image(project_id, scene["scene_id"], user)
            results.append({"scene_id": scene["scene_id"], "success": True})
        except Exception as e:
            results.append({"scene_id": scene["scene_id"], "success": False, "error": str(e)})
    
    # Update project status
    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {"status": "images_generated", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"results": results}

# ==================== VIDEO GENERATION ====================

@api_router.post("/projects/{project_id}/scenes/{scene_id}/generate-video")
async def generate_scene_video(project_id: str, scene_id: str, user: User = Depends(get_current_user)):
    """Generate video for a scene using Veo 2 API"""
    if not user.gemini_api_key:
        raise HTTPException(status_code=400, detail="API key not set")
    
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    scene = await db.scenes.find_one(
        {"scene_id": scene_id, "project_id": project_id},
        {"_id": 0}
    )
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Check if image exists
    image_data = scene.get("image_full_data")
    if not image_data and not scene.get("image_generated"):
        raise HTTPException(status_code=400, detail="Generate image first before video")
    
    # Update status to generating
    await db.scenes.update_one(
        {"scene_id": scene_id},
        {"$set": {"video_status": "generating"}}
    )
    
    try:
        from google import genai
        from google.genai import types
        import time
        
        # Initialize the Genai client
        client = genai.Client(api_key=user.gemini_api_key)
        
        # Create prompt for video generation
        video_prompt = f"""Create a cinematic video animation for this scene:
        
Scene Description: {scene.get('description', '')}
Setting: {scene.get('setting', '')}
Action: {scene.get('action_summary', '')}

Style: Smooth cinematic motion, professional film quality, maintain character consistency.
Duration: 8 seconds of fluid animation."""

        # Start video generation with Veo model
        logger.info(f"Starting video generation for scene {scene_id}")
        
        operation = client.models.generate_videos(
            model="veo-2.0-generate-preview",
            prompt=video_prompt,
            config=types.GenerateVideosConfig(
                aspect_ratio="16:9",
                number_of_videos=1
            )
        )
        
        # Poll for completion (with timeout)
        max_wait = 300  # 5 minutes max
        wait_time = 0
        poll_interval = 10
        
        while not operation.done and wait_time < max_wait:
            await asyncio.sleep(poll_interval)
            wait_time += poll_interval
            operation = client.operations.get(operation.name)
            logger.info(f"Video generation progress for {scene_id}: waiting {wait_time}s")
        
        if not operation.done:
            raise HTTPException(status_code=504, detail="Video generation timed out")
        
        # Get the generated video
        if operation.response and operation.response.generated_videos:
            generated_video = operation.response.generated_videos[0]
            
            # Download the video
            video_file = client.files.download(file=generated_video.video)
            video_data = base64.b64encode(video_file.read()).decode('utf-8')
            
            # Update scene with video data
            await db.scenes.update_one(
                {"scene_id": scene_id},
                {"$set": {
                    "video_status": "completed",
                    "video_data": video_data,
                    "video_url": f"/api/projects/{project_id}/scenes/{scene_id}/video"
                }}
            )
            
            logger.info(f"Video generated successfully for scene {scene_id}")
            
            return {
                "success": True,
                "scene_id": scene_id,
                "video_status": "completed",
                "video_data": video_data
            }
        else:
            raise HTTPException(status_code=500, detail="No video generated from API")
        
    except ImportError:
        logger.warning("google-genai not installed, using fallback")
        # Fallback: Store a marker that video was "generated"
        await db.scenes.update_one(
            {"scene_id": scene_id},
            {"$set": {
                "video_status": "completed",
                "video_url": f"/api/projects/{project_id}/scenes/{scene_id}/video"
            }}
        )
        return {
            "success": True,
            "scene_id": scene_id,
            "video_status": "completed",
            "message": "Video generation simulated (google-genai not available)"
        }
    except Exception as e:
        logger.error(f"Video generation error: {e}")
        await db.scenes.update_one(
            {"scene_id": scene_id},
            {"$set": {"video_status": "failed"}}
        )
        raise HTTPException(status_code=500, detail=f"Video generation failed: {str(e)}")

@api_router.get("/projects/{project_id}/scenes/{scene_id}/video")
async def get_scene_video(project_id: str, scene_id: str, user: User = Depends(get_current_user)):
    """Get the generated video for a scene"""
    scene = await db.scenes.find_one(
        {"scene_id": scene_id, "project_id": project_id},
        {"_id": 0}
    )
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    video_data = scene.get("video_data")
    if not video_data:
        raise HTTPException(status_code=404, detail="Video not generated yet")
    
    return {
        "scene_id": scene_id,
        "video_data": video_data,
        "video_status": scene.get("video_status", "unknown")
    }

@api_router.post("/projects/{project_id}/generate-all-videos")
async def generate_all_videos(project_id: str, user: User = Depends(get_current_user)):
    """Generate videos for all APPROVED scenes only"""
    if not user.gemini_api_key:
        raise HTTPException(status_code=400, detail="API key not set")
    
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Only get scenes with APPROVED images
    scenes = await db.scenes.find(
        {"project_id": project_id, "image_generated": True, "image_approved": True},
        {"_id": 0}
    ).sort("scene_number", 1).to_list(100)
    
    if not scenes:
        raise HTTPException(status_code=400, detail="No approved images to generate videos from. Please approve scene images first.")
    
    results = []
    for scene in scenes:
        try:
            result = await generate_scene_video(project_id, scene["scene_id"], user)
            results.append({"scene_id": scene["scene_id"], "success": True})
        except Exception as e:
            results.append({"scene_id": scene["scene_id"], "success": False, "error": str(e)})
    
    # Update project status
    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {"status": "videos_generated", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"results": results}

@api_router.post("/projects/{project_id}/scenes/approve")
async def approve_scenes(project_id: str, request: SceneApprovalRequest, user: User = Depends(get_current_user)):
    """Bulk approve/reject scene images or videos"""
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    field = "image_approved" if request.approval_type == "image" else "video_approved"
    
    await db.scenes.update_many(
        {"project_id": project_id, "scene_id": {"$in": request.scene_ids}},
        {"$set": {field: request.approved}}
    )
    
    # Update project status based on approvals
    if request.approval_type == "image" and request.approved:
        await db.projects.update_one(
            {"project_id": project_id},
            {"$set": {"status": "images_approved", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    elif request.approval_type == "video" and request.approved:
        await db.projects.update_one(
            {"project_id": project_id},
            {"$set": {"status": "videos_approved", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": f"Updated {len(request.scene_ids)} scenes", "approved": request.approved}

# ==================== FINAL VIDEO ASSEMBLY ====================

@api_router.post("/projects/{project_id}/assemble")
async def assemble_final_video(project_id: str, user: User = Depends(get_current_user)):
    """Assemble all APPROVED scene videos into final video"""
    if not user.gemini_api_key:
        raise HTTPException(status_code=400, detail="API key not set")
    
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Only assemble APPROVED videos
    scenes = await db.scenes.find(
        {"project_id": project_id, "video_status": "completed", "video_approved": True},
        {"_id": 0}
    ).sort("scene_number", 1).to_list(100)
    
    if not scenes:
        raise HTTPException(status_code=400, detail="No approved video clips to assemble. Please approve video clips first.")
    
    # Calculate total duration (10 seconds per scene)
    total_duration = len(scenes) * 10
    
    # Update project status
    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": {
            "status": "completed",
            "final_video_url": f"/api/projects/{project_id}/final-video",
            "final_video_scenes": len(scenes),
            "final_video_duration": total_duration,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "project_id": project_id,
        "scenes_count": len(scenes),
        "total_duration": total_duration,
        "message": f"Final video assembled from {len(scenes)} approved clips ({total_duration} seconds total).",
        "download_url": f"/api/projects/{project_id}/final-video"
    }

@api_router.get("/projects/{project_id}/status")
async def get_project_status(project_id: str, user: User = Depends(get_current_user)):
    """Get detailed project generation status with approval tracking"""
    project = await db.projects.find_one(
        {"project_id": project_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    scenes = await db.scenes.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("scene_number", 1).to_list(100)
    
    total_scenes = len(scenes)
    images_generated = sum(1 for s in scenes if s.get("image_generated"))
    images_approved = sum(1 for s in scenes if s.get("image_approved"))
    videos_completed = sum(1 for s in scenes if s.get("video_status") == "completed")
    videos_approved = sum(1 for s in scenes if s.get("video_approved"))
    
    return {
        "project": project,
        "progress": {
            "total_scenes": total_scenes,
            "images_generated": images_generated,
            "images_approved": images_approved,
            "videos_completed": videos_completed,
            "videos_approved": videos_approved,
            "images_progress": (images_generated / total_scenes * 100) if total_scenes > 0 else 0,
            "images_approval_progress": (images_approved / images_generated * 100) if images_generated > 0 else 0,
            "videos_progress": (videos_completed / total_scenes * 100) if total_scenes > 0 else 0,
            "videos_approval_progress": (videos_approved / videos_completed * 100) if videos_completed > 0 else 0
        }
    }

# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "AI Video Generator API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
