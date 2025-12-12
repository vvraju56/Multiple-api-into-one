// Main combine function
function combineKeys() {
    const rawInput = document.getElementById("multiKeys").value.trim();

    if (!rawInput) {
        alert("Please paste API keys first.");
        return;
    }

    const keys = rawInput.split("\n").map(k => k.trim()).filter(k => k.length > 0);

    // Create a combined encoded key
    const combinedObj = {
        keys: keys,
        created: Date.now()
    };

    const encoded = btoa(JSON.stringify(combinedObj));

    document.getElementById("combinedKey").value = encoded;
}

// Copy function
function copyCombined() {
    const output = document.getElementById("combinedKey");
    output.select();
    document.execCommand("copy");
    alert("Combined key copied!");
}

// .env File Reader Function
function readEnvFile() {
    const fileInput = document.getElementById("envFile");
    const file = fileInput.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(event) {
        const content = event.target.result;

        // Parse .env lines
        const lines = content.split("\n");

        let extractedKeys = [];

        lines.forEach(line => {
            line = line.trim();

            // Skip empty lines or comments
            if (!line || line.startsWith("#")) return;

            // Process key=value format
            const [key, value] = line.split("=");

            if (!value) return;

            // If API_KEYS=key1,key2,key3
            if (key === "API_KEYS") {
                extractedKeys.push(...value.split(",").map(v => v.trim()));
            }

            // If single keys (example: KEY1=xxxx)
            else if (key.toLowerCase().includes("key")) {
                extractedKeys.push(value.trim());
            }
        });

        if (extractedKeys.length > 0) {
            // Get existing keys and merge with extracted ones
            const existingKeys = document.getElementById("multiKeys").value.trim();
            const allKeys = existingKeys ? 
                [...new Set([...extractedKeys, ...existingKeys.split("\n").map(k => k.trim())])] : 
                extractedKeys;
            
            document.getElementById("multiKeys").value = allKeys.join("\n");
            alert("API keys loaded from .env file!");
        } else {
            alert("No API keys found in this .env file.");
        }
        
        // Clear the file input
        fileInput.value = '';
    };

    reader.readAsText(file);
}

// Initialize placeholder text
document.addEventListener('DOMContentLoaded', function() {
    const multiKeysTextarea = document.getElementById('multiKeys');
    if (multiKeysTextarea) {
        multiKeysTextarea.placeholder = `Example API keys:
sk-1234567890abcdef
sk-fedcba0987654321
sk-abcdef1234567890

Or upload a .env file to automatically extract API keys...`;
    }
});

// Add drag and drop functionality (optional enhancement)
document.addEventListener('DOMContentLoaded', function() {
    const multiKeysTextarea = document.getElementById('multiKeys');
    const firstCard = document.querySelector('.card');
    
    if (firstCard && multiKeysTextarea) {
        firstCard.addEventListener('dragover', (e) => {
            e.preventDefault();
            firstCard.style.background = 'rgba(255, 255, 255, 0.12)';
        });
        
        firstCard.addEventListener('dragleave', (e) => {
            e.preventDefault();
            firstCard.style.background = 'rgba(255, 255, 255, 0.08)';
        });
        
        firstCard.addEventListener('drop', (e) => {
            e.preventDefault();
            firstCard.style.background = 'rgba(255, 255, 255, 0.08)';
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].name.endsWith('.env')) {
                const fileInput = document.getElementById('envFile');
                fileInput.files = files;
                readEnvFile();
            }
        });
    }
});