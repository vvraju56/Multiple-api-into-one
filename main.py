from fastapi import FastAPI, HTTPException, Request, Form
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
import requests
import os
import json
import uuid
from datetime import datetime, timedelta
import hashlib

app = FastAPI(title="AI API Gateway", description="Secure proxy to Groq API with weekly key rotation")

# Environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ADMIN_SECRET = os.getenv("ADMIN_SECRET")
if not GROQ_API_KEY or not ADMIN_SECRET:
    raise ValueError("GROQ_API_KEY and ADMIN_SECRET must be set in environment variables")

# API key storage
API_KEY_FILE = "current_key.json"

def generate_weekly_key():
    """Generate a deterministic weekly API key based on current week"""
    current_week = datetime.now().isocalendar()[:2]  # (year, week_number)
    week_string = f"{current_week[0]}-{current_week[1]}"
    # Create deterministic key from week string + secret
    key_hash = hashlib.sha256((week_string + str(ADMIN_SECRET)).encode()).hexdigest()[:16]
    return f"sk-{key_hash}"

def load_current_key():
    """Load or generate current weekly API key"""
    new_key = generate_weekly_key()
    expiry = datetime.now() + timedelta(days=7)
    
    # Check if we have a stored key that's still valid
    if os.path.exists(API_KEY_FILE):
        try:
            with open(API_KEY_FILE, "r") as f:
                data = json.load(f)
                stored_expiry = datetime.fromisoformat(data["expiry"])
                if datetime.now() < stored_expiry and data["key"] == new_key:
                    return data["key"], stored_expiry
        except (json.JSONDecodeError, KeyError, ValueError):
            pass  # File corrupted, generate new key
    
    # Save new key
    save_current_key(new_key, expiry)
    return new_key, expiry

def save_current_key(key, expiry):
    """Save current API key and expiry"""
    with open(API_KEY_FILE, "w") as f:
        json.dump({"key": key, "expiry": expiry.isoformat()}, f)

# Load current key on startup
current_api_key, key_expiry = load_current_key()

# Pydantic models
class ChatRequest(BaseModel):
    prompt: str

# Middleware for API key validation
class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip auth for docs and admin endpoint
        if request.url.path in ["/current-key", "/docs", "/redoc", "/openapi.json", "/health"]:
            return await call_next(request)
        
        api_key = request.headers.get("x-api-key")
        if not api_key or api_key != current_api_key:
            raise HTTPException(status_code=401, detail="Invalid or expired API key")
        
        return await call_next(request)

app.add_middleware(APIKeyMiddleware)

@app.get("/health")
async def health_check():
    """Health check endpoint for Render"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/current-key")
async def get_current_key(request: Request):
    """Get current API key (admin only)"""
    admin_secret = request.headers.get("admin-secret")
    if admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    
    # Refresh key if needed
    global current_api_key, key_expiry
    if datetime.now() >= key_expiry:
        current_api_key, key_expiry = load_current_key()
    
    return {
        "api_key": current_api_key,
        "expiry": key_expiry.isoformat(),
        "days_remaining": (key_expiry - datetime.now()).days
    }

@app.post("/chat")
async def chat(prompt: str = Form(...)):
    """Chat endpoint using Groq API"""
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama3-70b-8192",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1000,
                "temperature": 0.7
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        # Return simplified response
        return {
            "response": data["choices"][0]["message"]["content"],
            "model": data["model"],
            "usage": data.get("usage", {})
        }
        
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"Invalid response from Groq API: {str(e)}")

@app.post("/chat/json")
async def chat_json(chat_request: ChatRequest):
    """Chat endpoint that accepts JSON"""
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama3-70b-8192",
                "messages": [{"role": "user", "content": chat_request.prompt}],
                "max_tokens": 1000,
                "temperature": 0.7
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        # Return simplified response
        return {
            "response": data["choices"][0]["message"]["content"],
            "model": data["model"],
            "usage": data.get("usage", {})
        }
        
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"Invalid response from Groq API: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)