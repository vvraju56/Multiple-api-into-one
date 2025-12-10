# AI API Server

A production-ready ChatGPT-like API server built with FastAPI, supporting Groq LLM models and local CPU fallback. Features automatic weekly API key rotation. Deployable on Render FREE tier.

## Features

- **Groq LLM Integration**: Uses Llama-3 70B model through secure backend proxy
- **Automatic API Key Rotation**: Generates new key every 7 days, only one valid key at a time
- **Local CPU Fallback**: TinyLlama model for offline use
- **Security**: Never exposes API keys to users
- **FastAPI**: High-performance async API
- **Render Deployment**: Optimized for free tier

## Tech Stack

- Python 3.11
- FastAPI
- Uvicorn
- Requests
- Transformers
- Torch (CPU)

## Setup

1. Clone this repository
2. Install dependencies: `pip install -r requirements.txt`
3. Set environment variables:
   - `GROQ_API_KEY`: Your Groq API key
   - `ADMIN_SECRET`: Secret for viewing current API key

## Local Development

Run the server:
```bash
uvicorn main:app --reload
```

## Render Deployment

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `GROQ_API_KEY`
   - `ADMIN_SECRET`
6. Deploy!

## Weekly API Key Rotation

The server automatically generates a new API key every 7 days on startup. Only the most recent key is valid. Expired keys are rejected with HTTP 401.

- Keys are stored in `current_key.json`
- Format: `sk-xxxxxxxxxxxxxxxx`
- No cron jobs required - rotation happens on server boot

## API Endpoints

### View Current API Key (Admin Only)
```bash
curl -X GET https://your-render-app.onrender.com/current-key \
  -H "admin-secret: YOUR_ADMIN_SECRET"
```

Response:
```json
{
  "api_key": "sk-xxxxxxxxxxxxxxxx",
  "expiry": "2024-01-15T10:30:00"
}
```

### Chat with Groq
```bash
curl -X POST https://your-render-app.onrender.com/chat \
  -H "x-api-key: sk-xxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}'
```

### Chat with Local Model
```bash
curl -X POST https://your-render-app.onrender.com/local-chat \
  -H "x-api-key: sk-xxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}'
```

## CLI Client Example

```python
import requests
import json

# Replace with your actual values
API_URL = "https://your-render-app.onrender.com"
ADMIN_SECRET = "your_admin_secret"

def get_current_key():
    response = requests.get(
        f"{API_URL}/current-key",
        headers={"admin-secret": ADMIN_SECRET}
    )
    return response.json()["api_key"]

def chat(prompt, api_key):
    response = requests.post(
        f"{API_URL}/chat",
        headers={"x-api-key": api_key, "Content-Type": "application/json"},
        json={"prompt": prompt}
    )
    data = response.json()
    return data["choices"][0]["message"]["content"]

# Usage
api_key = get_current_key()
print(chat("Tell me a joke", api_key))
```

## Performance Notes

### Render Free Limitations
- 750 hours/month
- 512 MB RAM
- No persistent storage (keys stored in JSON file)
- CPU-only inference for local models

### Why Groq Proxy is Preferred for Speed
- Groq provides optimized inference on their hardware
- No local computation overhead
- Low latency for API calls
- Scales better than local CPU

### Why Local CPU Models are Slow
- CPU inference is computationally expensive
- TinyLlama requires significant RAM and processing power
- Best for fallback when Groq is unavailable
- May cause timeouts on Render free tier

## Integration Examples

### Continue.dev (VS Code Copilot Alternative)

Add to your Continue.dev config:

```json
{
  "models": [
    {
      "title": "My AI API",
      "provider": "openai",
      "model": "gpt-3.5-turbo",
      "apiKey": "sk-xxxxxxxxxxxxxxxx",
      "apiBase": "https://your-render-app.onrender.com"
    }
  ]
}
```

Note: Update the apiKey with your current weekly key from `/current-key` endpoint.

### Simple Terminal Chat Client

```bash
#!/bin/bash

API_URL="https://your-render-app.onrender.com"
ADMIN_SECRET="your_admin_secret"

# Get current API key
API_KEY=$(curl -s -X GET "$API_URL/current-key" -H "admin-secret: $ADMIN_SECRET" | jq -r '.api_key')

echo "AI Chat Client. Type 'quit' to exit."
while true; do
    read -p "You: " prompt
    if [ "$prompt" = "quit" ]; then
        break
    fi
    response=$(curl -s -X POST "$API_URL/chat" \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"prompt\": \"$prompt\"}")
    echo "AI: $(echo $response | jq -r '.choices[0].message.content')"
done
```

## Security

- Groq API key stored securely in environment variables
- Admin secret required for viewing current key
- Automatic weekly key rotation
- Only one valid API key at a time
- Invalid or expired keys rejected with HTTP 401
- No sensitive data exposed in responses

## License

MIT
