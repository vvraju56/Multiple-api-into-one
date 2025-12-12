// DOM Elements
const envFileInput = document.getElementById('envFile');
const keysTextarea = document.getElementById('keyInput');
const encodedTextarea = document.getElementById('encodedOutput');
const publicKeyInput = document.getElementById('publicKey');
const rotationModeSelect = document.getElementById('rotationMode');
const requestMethodSelect = document.getElementById('requestMethod');
const jsonResponsePre = document.getElementById('jsonResponse');
const fileUploadArea = document.getElementById('fileUploadArea');
const extractedKeysInfo = document.getElementById('extractedKeysInfo');
const extractedCountSpan = document.getElementById('extractedCount');
const copyResponseBtn = document.getElementById('copyResponse');

// Event Listeners
if (envFileInput) {
    envFileInput.addEventListener('change', handleEnvFile);
}

if (fileUploadArea) {
    fileUploadArea.addEventListener('click', () => {
        envFileInput.click();
    });
    
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'rgba(106, 17, 203, 0.5)';
        fileUploadArea.style.background = 'rgba(255, 255, 255, 0.08)';
    });
    
    fileUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        fileUploadArea.style.background = 'rgba(255, 255, 255, 0.05)';
    });
    
    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        fileUploadArea.style.background = 'rgba(255, 255, 255, 0.05)';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
}

// Multi API Key Combiner Functions
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
    encodedTextarea.value = encodedKey;
    showNotification(`Successfully combined ${keys.length} API keys`, 'success');
}

// .env File Handler Functions
function handleEnvFile(event) {
    const file = event.target.files[0];
    if (file) {
        handleFileUpload(file);
    }
}

function handleFileUpload(file) {
    if (!file.name.endsWith('.env')) {
        showNotification('Please upload a .env file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const keys = parseEnvFile(content);
        
        if (keys.length > 0) {
            // Add extracted keys to the textarea
            const existingKeys = keysTextarea.value.trim();
            const allKeys = existingKeys ? [...keys, ...existingKeys.split('\n').map(k => k.trim())] : keys;
            const uniqueKeys = [...new Set(allKeys)];
            
            keysTextarea.value = uniqueKeys.join('\n');
            
            // Show success message
            extractedCountSpan.textContent = keys.length;
            extractedKeysInfo.style.display = 'block';
            
            showNotification(`Successfully extracted ${keys.length} API keys from .env file`, 'success');
        } else {
            showNotification('No API keys found in .env file', 'warning');
        }
    };
    
    reader.readAsText(file);
}

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

// Proxy Tester Functions
async function testProxy() {
    const publicKey = publicKeyInput.value.trim();
    const rotationMode = rotationModeSelect.value;
    const method = requestMethodSelect.value;
    
    if (!publicKey) {
        showNotification('Please enter a public API key', 'error');
        return;
    }
    
    // Show loading state
    jsonResponsePre.textContent = 'Loading...';
    copyResponseBtn.style.display = 'none';
    
    try {
        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': publicKey
            }
        });
        
        const data = await response.json();
        
        // Format and display the response
        jsonResponsePre.textContent = JSON.stringify(data, null, 2);
        copyResponseBtn.style.display = 'inline-flex';
        
        if (response.ok) {
            showNotification('Proxy request successful!', 'success');
        } else {
            showNotification(`Proxy request failed: ${data.error || 'Unknown error'}`, 'error');
        }
        
    } catch (error) {
        console.error('Proxy test error:', error);
        const errorData = {
            error: 'Network Error',
            message: error.message,
            timestamp: new Date().toISOString()
        };
        jsonResponsePre.textContent = JSON.stringify(errorData, null, 2);
        showNotification('Failed to connect to proxy server', 'error');
    }
}

// Utility Functions
function clearInput(inputId) {
    document.getElementById(inputId).value = '';
    showNotification('Input cleared', 'info');
}

function clearProxyResults() {
    publicKeyInput.value = '';
    rotationModeSelect.value = 'round';
    requestMethodSelect.value = 'GET';
    jsonResponsePre.textContent = '{}';
    copyResponseBtn.style.display = 'none';
    showNotification('Proxy results cleared', 'info');
}

async function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.value || element.textContent;
    
    if (!text || text === '{}' || text === 'Loading...') {
        showNotification('Nothing to copy', 'warning');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        if (element.tagName === 'TEXTAREA') {
            element.select();
            document.execCommand('copy');
        } else {
            // Create temporary textarea
            const tempTextarea = document.createElement('textarea');
            tempTextarea.value = text;
            document.body.appendChild(tempTextarea);
            tempTextarea.select();
            document.execCommand('copy');
            document.body.removeChild(tempTextarea);
        }
        showNotification('Copied to clipboard!', 'success');
    }
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Add icon based on type
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i> ';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i> ';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i> ';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i> ';
    }
    
    notification.innerHTML = icon + message;
    
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
        max-width: 350px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.9), rgba(139, 195, 74, 0.9))';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(135deg, rgba(244, 67, 54, 0.9), rgba(233, 30, 99, 0.9))';
            break;
        case 'warning':
            notification.style.background = 'linear-gradient(135deg, rgba(255, 152, 0, 0.9), rgba(255, 193, 7, 0.9))';
            break;
        default:
            notification.style.background = 'linear-gradient(135deg, rgba(33, 150, 243, 0.9), rgba(103, 58, 183, 0.9))';
    }
    
    // Add to document
    document.body.appendChild(notification);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
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

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Set initial placeholder text
    if (keysTextarea) {
        keysTextarea.placeholder = `Example API keys:
sk-1234567890abcdef
sk-fedcba0987654321
sk-abcdef1234567890

Or upload a .env file to automatically extract API keys...`;
    }
    
    // Add fade-in animation to cards
    const cards = document.querySelectorAll('.fade-in');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Log initialization
    console.log('Multi API Key Tool initialized successfully');
});

// Handle legacy DOM elements if they exist
if (typeof generateBtn !== 'undefined') {
    generateBtn.addEventListener('click', combineKeys);
}

if (typeof copyBtn !== 'undefined') {
    copyBtn.addEventListener('click', () => copyToClipboard('combinedOutput'));
}