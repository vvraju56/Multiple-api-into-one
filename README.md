# API Key Aggregator / Proxy

A production-ready Node.js application that combines multiple 3rd-party API keys into ONE single public API endpoint with automatic key rotation and retry logic.

## 🚀 Features

- **API Key Aggregation**: Accept one public API key and manage multiple private API keys
- **Automatic Rotation**: Round-robin load balancing across multiple API keys
- **Retry Logic**: Automatic retry with different keys on failures
- **Authentication**: Secure middleware for API key validation
- **Rate Limiting**: Built-in protection against abuse (100 requests/15min per IP)
- **Health Monitoring**: Real-time status and health check endpoints
- **Browser Demo**: Interactive web interface for testing
- **Production Ready**: Security headers, error handling, and logging

## 📋 Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn
- Multiple API keys from your target service
- One public API key for client authentication

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/vvraju56/Multiple-api-into-one.git
   cd Multiple-api-into-one
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your actual API keys:
   ```env
   PUBLIC_API_KEY=your-public-api-key-here
   API_KEYS=key1,key2,key3,key4,key5
   EXTERNAL_API_URL=https://api.example.com
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the application**
   - Frontend Demo: http://localhost:3000
   - Health Check: http://localhost:3000/health
   - API Endpoint: http://localhost:3000/api

## 🌐 Deployment

### Render.com (Recommended)

1. **Push to GitHub** (already done)
2. **Create Render Web Service**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your repository: `Multiple-api-into-one`
   - Configure:
     - **Name**: `multiple-api-proxy`
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

3. **Add Environment Variables** in Render dashboard:
   ```
   PUBLIC_API_KEY=your-actual-public-key
   API_KEYS=key1,key2,key3,key4,key5
   EXTERNAL_API_URL=https://api.example.com
   NODE_ENV=production
   ```

4. **Deploy** - Render will automatically build and deploy your service

## 📡 API Usage

### Authentication
Include your public API key in the request header:
```
X-API-Key: your-public-api-key-here
```

### Main API Endpoint
**POST** `/api`

#### Request Body
```json
{
  "method": "GET",
  "url": "/users",
  "headers": {
    "Content-Type": "application/json"
  },
  "params": {
    "limit": 10
  },
  "data": {} // Only for POST/PUT/PATCH
}
```

#### Response
```json
{
  "data": {}, // Response from external API
  "status": 200,
  "headers": {} // Response headers
}
```

### Health Check
**GET** `/health`

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "availableKeys": 4,
  "totalKeys": 5
}
```

### Service Status
**GET** `/status` (Requires authentication)

```json
{
  "service": "API Key Proxy",
  "version": "1.0.0",
  "status": "running",
  "availableKeys": 4,
  "totalKeys": 5,
  "failedKeys": 1,
  "uptime": 3600
}
```

## 🧪 Testing

### Browser Testing
1. Open http://localhost:3000
2. Enter your public API key
3. Test different endpoints and methods
4. View real-time responses

### curl Testing
```bash
# Health check
curl http://localhost:3000/health

# API test with GET
curl -X POST http://localhost:3000/api \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-public-api-key-here" \
  -d '{
    "method": "GET",
    "url": "/users",
    "headers": {"Content-Type": "application/json"}
  }'

# API test with POST
curl -X POST http://localhost:3000/api \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-public-api-key-here" \
  -d '{
    "method": "POST",
    "url": "/users",
    "headers": {"Content-Type": "application/json"},
    "data": {"name": "John Doe", "email": "john@example.com"}
  }'
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PUBLIC_API_KEY` | Yes | Public key for client authentication | `public-key-123` |
| `API_KEYS` | Yes | Comma-separated private API keys | `key1,key2,key3` |
| `EXTERNAL_API_URL` | No | Base URL for external API | `https://api.example.com` |
| `PORT` | No | Server port (default: 3000) | `3000` |
| `NODE_ENV` | No | Environment (development/production) | `production` |

### API Key Rotation

The service implements automatic round-robin rotation:
- Each request uses the next available API key
- Failed keys (401/403 errors) are automatically marked as failed
- Failed keys are temporarily removed from rotation
- When all keys fail, the failed list is reset
- Keys are retried after being marked as failed

## 🔒 Security Features

- **API Key Validation**: Middleware validates public API key on every request
- **Rate Limiting**: 100 requests per 15 minutes per IP address
- **Security Headers**: Helmet.js for security headers
- **CORS Protection**: Configurable CORS policies
- **Input Validation**: JSON parsing with error handling
- **No Key Exposure**: Private keys never exposed to frontend

## 📊 Monitoring

### Built-in Monitoring
- Health check endpoint for uptime monitoring
- Service status endpoint with key availability
- Automatic logging of failed API keys
- Request/response logging for debugging

### Recommended Monitoring Tools
- **Uptime Robot**: Monitor `/health` endpoint
- **LogDNA/Papertrail**: For application logs
- **Render Metrics**: Built-in performance monitoring

## 🚨 Error Handling

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request (missing URL, invalid JSON)
- `401`: Unauthorized (missing API key)
- `403`: Forbidden (invalid API key)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error
- `503`: Service Unavailable (external API down)

### Error Response Format
```json
{
  "error": "Error description",
  "message": "Detailed error message",
  "status": 400
}
```

## 🔄 API Key Management

### Best Practices
1. **Regular Rotation**: Change API keys periodically
2. **Multiple Keys**: Use at least 3-5 API keys for redundancy
3. **Monitoring**: Track key usage and failure rates
4. **Separation**: Use different keys for different environments
5. **Revocation**: Immediately revoke compromised keys

### Key Failure Recovery
- Automatic retry with different keys
- Failed key tracking and recovery
- Graceful degradation when keys fail
- Automatic reset of failed keys

## 🛠️ Development

### Project Structure
```
api-key-proxy/
├── server.js              # Main Express server
├── package.json            # Dependencies and scripts
├── .env.example           # Environment variables template
└── public/
    ├── index.html         # Frontend demo interface
    └── script.js          # Frontend JavaScript
```

### Scripts
```bash
npm start          # Start production server
npm run dev        # Start with nodemon (for development)
```

### Dependencies
- **express**: Web framework
- **axios**: HTTP client for API requests
- **dotenv**: Environment variable management
- **cors**: CORS middleware
- **helmet**: Security headers
- **express-rate-limit**: Rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/vvraju56/Multiple-api-into-one/issues) page
2. Create a new issue with detailed information
3. Include error logs and environment details

## 🔗 Live Demo

Once deployed on Render, your service will be available at:
`https://your-service-name.onrender.com`

---

**Built with ❤️ for reliable API key management**