// DOM Elements
const envFileInput = document.getElementById('envFile');
const keysTextarea = document.getElementById('keysInput');
const combinedTextarea = document.getElementById('combinedOutput');
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');

// Event Listeners
envFileInput.addEventListener('change', readEnvFile);
generateBtn.addEventListener('click', combineKeys);
copyBtn.addEventListener('click', copyCombined);

// Read and parse .env file
function readEnvFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const keys = parseEnvFile(content);
        
        if (keys.length > 0) {
            keysTextarea.value = keys.join('\n');
            showNotification(`Loaded ${keys.length} API keys from .env file`);
        } else {
            showNotification('No API keys found in .env file', 'warning');
        }
    };
    
    reader.readAsText(file);
}

// Parse .env file content and extract API keys
function parseEnvFile(content) {
    const keys = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
        // Skip empty lines and comments
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue;
        }
        
        // Parse key-value pairs
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex === -1) continue;
        
        const key = trimmedLine.substring(0, equalIndex).trim();
        const value = trimmedLine.substring(equalIndex + 1).trim();
        
        // Check if the variable name contains 'key' (case insensitive)
        if (key.toLowerCase().includes('key')) {
            // Handle comma-separated values
            const commaSeparatedKeys = value.split(',').map(k => k.trim()).filter(k => k);
            keys.push(...commaSeparatedKeys);
        }
    }
    
    return keys;
}

// Combine multiple API keys into one encoded string
function combineKeys() {
    const inputText = keysTextarea.value.trim();
    
    if (!inputText) {
        showNotification('Please enter at least one API key', 'error');
        return;
    }
    
    // Split by lines and remove empty lines
    const keys = inputText.split('\n')
        .map(key => key.trim())
        .filter(key => key.length > 0);
    
    if (keys.length === 0) {
        showNotification('Please enter valid API keys', 'error');
        return;
    }
    
    // Create the combined object
    const combinedObj = {
        keys: keys,
        created: Math.floor(Date.now() / 1000) // Unix timestamp
    };
    
    // Encode to base64
    const jsonString = JSON.stringify(combinedObj);
    const encodedKey = btoa(jsonString);
    
    // Display the result
    combinedTextarea.value = encodedKey;
    showNotification(`Successfully combined ${keys.length} API keys`, 'success');
}

// Copy combined key to clipboard
async function copyCombined() {
    const combinedKey = combinedTextarea.value.trim();
    
    if (!combinedKey) {
        showNotification('No combined key to copy', 'warning');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(combinedKey);
        showNotification('Combined key copied!', 'success');
    } catch (err) {
        // Fallback for older browsers
        combinedTextarea.select();
        document.execCommand('copy');
        showNotification('Combined key copied!', 'success');
    }
}

// Show notification message
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.background = 'linear-gradient(135deg, #00b09b, #96c93d)';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a24)';
            break;
        case 'warning':
            notification.style.background = 'linear-gradient(135deg, #feca57, #ff9ff3)';
            break;
        default:
            notification.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
    }
    
    // Add to document
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize with example text (optional)
keysTextarea.placeholder = `Example:
sk-1234567890abcdef
sk-fedcba0987654321
sk-abcdef1234567890

Or upload a .env file containing API keys...`;