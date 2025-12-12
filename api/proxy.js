const axios = require('axios');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1) Public API Key Authentication
    const providedKey = req.headers['x-api-key'];
    const publicKey = process.env.PUBLIC_API_KEY;

    if (!providedKey || providedKey !== publicKey) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Invalid or missing x-api-key header"
      });
    }

    // 2) Load Private API Keys
    const apiKeysString = process.env.API_KEYS;
    if (!apiKeysString) {
      return res.status(500).json({ 
        error: "Configuration error",
        message: "API_KEYS not configured"
      });
    }

    const privateKeys = apiKeysString.split(',').map(key => key.trim()).filter(key => key);
    if (privateKeys.length === 0) {
      return res.status(500).json({ 
        error: "Configuration error",
        message: "No API keys configured"
      });
    }

    // 3) Key Rotation Modes
    const mode = req.query.mode || 'round';
    let selectedKey;

    if (mode === 'random') {
      const randomIndex = Math.floor(Math.random() * privateKeys.length);
      selectedKey = privateKeys[randomIndex];
    } else {
      // Default to round-robin
      const currentIndex = parseInt(req.query.index || '0');
      const nextIndex = currentIndex % privateKeys.length;
      selectedKey = privateKeys[nextIndex];
    }

    // 4) Proxy Upstream Call
    const method = req.query.method || 'GET';
    const targetUrl = 'https://jsonplaceholder.typicode.com/todos/1';

    try {
      const response = await axios({
        method: method.toLowerCase(),
        url: targetUrl,
        headers: {
          'Authorization': `Bearer ${selectedKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Multi-API-Key-Tool/1.0'
        },
        timeout: 10000
      });

      // Return successful response with metadata
      res.json({
        success: true,
        data: response.data,
        metadata: {
          upstream_url: targetUrl,
          method: method,
          key_rotation_mode: mode,
          key_used: selectedKey.substring(0, 8) + '...', // Only show partial key for security
          total_keys_available: privateKeys.length,
          status_code: response.status,
          timestamp: new Date().toISOString()
        }
      });

    } catch (upstreamError) {
      // 5) Error Handling for upstream failures
      console.error('Upstream API error:', upstreamError.message);
      res.status(500).json({ 
        error: "Upstream API failed",
        message: upstreamError.message,
        metadata: {
          upstream_url: targetUrl,
          method: method,
          key_rotation_mode: mode,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    // General error handling
    console.error('Proxy function error:', error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};