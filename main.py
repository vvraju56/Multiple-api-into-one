from fastapi import FastAPI, HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
import requests
import os
import json
import uuid
from datetime import datetime, timedelta
from transformers import pipeline
import torch

app = FastAPI(title="AI API Server", description="ChatGPT-like API with Groq and local fallback")

# Environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ADMIN_SECRET = os.getenv("ADMIN_SECRET")
if not GROQ_API_KEY or not ADMIN_SECRET:
    raise ValueError("GROQ_API_KEY and ADMIN_SECRET must be set in environment variables")

# API key storage
API_KEY_FILE = "current_key.json"

def load_current_key():
    if os.path.exists(API_KEY_FILE):
        with open(API_KEY_FILE, "r") as f:
            data = json.load(f)
            expiry = datetime.fromisoformat(data["expiry"])
            if datetime.now() < expiry:
                return data["key"], expiry
    # Generate new key
    new_key = f"sk-{uuid.uuid4().hex[:16]}"
    expiry = datetime.now() + timedelta(days=7)
    save_current_key(new_key, expiry)
    return new_key, expiry

def save_current_key(key, expiry):
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
        if request.url.path in ["/current-key", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
        api_key = request.headers.get("x-api-key")
        if not api_key or api_key != current_api_key:
            raise HTTPException(status_code=401, detail="Invalid or expired API key")
        return await call_next(request)

app.add_middleware(APIKeyMiddleware)

# Load local model (TinyLlama)
local_model = pipeline(
    "text-generation",
    model="TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    torch_dtype=torch.float32,
    device_map="cpu",
    max_new_tokens=200
)

@app.get("/current-key")
async def get_current_key(request: Request):
    admin_secret = request.headers.get("admin-secret")
    if admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    return {"api_key": current_api_key, "expiry": key_expiry.isoformat()}

@app.post("/chat")
async def chat(chat_request: ChatRequest):
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
                "max_tokens": 1000
            }
        )
        response.raise_for_status()
        data = response.json()
        return data  # Return entire Groq JSON response
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")

@app.post("/local-chat")
async def local_chat(chat_request: ChatRequest):
    try:
        output = local_model(chat_request.prompt, do_sample=True, temperature=0.7)
        return {"response": output[0]["generated_text"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Local model error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
