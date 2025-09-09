import GistManager from '../services/GistManager.js';

/**
 * GistIdInput - UI component for connecting to existing gists or creating new ones
 * Provides gist ID validation and user feedback
 */
class GistIdInput {
    constructor() {
        this.gistManager = new GistManager();
        this.element = null;
        this.onGistConnected = null;
        this.validationTimeout = null;
    }

    /**
     * Create the gist ID input component
     * @param {Function} onGistConnected - Callback when gist is successfully connected
     * @returns {HTMLElement} The component element
     */
    create(onGistConnected = null) {
        this.onGistConnected = onGistConnected;

        const container = document.createElement('div');
        container.className = 'gist-id-input-container bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto';

        container.innerHTML = `
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">Connect to GitHub Gist</h3>
        <p class="text-sm text-gray-600 mb-4">
          Enter a public GitHub Gist ID to sync your audiobook library across devices.
        </p>
      </div>
      
      <div class="mb-4">
        <label for="gist-id-input" class="block text-sm font-medium text-gray-700 mb-2">
          Gist ID
        </label>
        <input 
          type="text" 
          id="gist-id-input"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter gist ID (e.g., abc123def456...)"
        />
        <div id="validation-message" class="mt-2 text-sm hidden"></div>
      </div>
      
      <div class="flex gap-3">
        <button 
          id="connect-gist-btn"
          class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          Connect to Gist
        </button>
        <button 
          id="create-new-btn"
          class="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Create New Gist
        </button>
      </div>
      
      <div class="mt-4 text-xs text-gray-500">
        <p><strong>Instructions:</strong></p>
        <ul class="list-disc list-inside mt-1 space-y-1">
          <li>To connect: Enter an existing gist ID from GitHub</li>
          <li>To create: Click "Create New Gist" to generate a shareable gist</li>
          <li>Share the gist ID with other devices to sync your library</li>
        </ul>
      </div>
    `;

        this.element = container;
        this.attachEventListeners();
        this.loadExistingGistId();

        return container;
    }

    /**
     * Attach event listeners to the component elements
     */
    attachEventListeners() {
        const input = this.element.querySelector('#gist-id-input');
        const connectBtn = this.element.querySelector('#connect-gist-btn');
        const createBtn = this.element.querySelector('#create-new-btn');

        // Real-time validation as user types
        input.addEventListener('input', (e) => {
            clearTimeout(this.validationTimeout);
            const gistId = e.target.value.trim();

            if (gistId.length === 0) {
                this.clearValidationMessage();
                connectBtn.disabled = true;
                return;
            }

            // Debounce validation
            this.validationTimeout = setTimeout(() => {
                this.validateGistId(gistId);
            }, 500);
        });

        // Connect to existing gist
        connectBtn.addEventListener('click', () => {
            const gistId = input.value.trim();
            if (gistId) {
                this.connectToGist(gistId);
            }
        });

        // Create new gist (placeholder for now)
        createBtn.addEventListener('click', () => {
            this.showCreateNewGistInstructions();
        });
    }

    /**
     * Load existing gist ID if available
     */
    async loadExistingGistId() {
        const existingGistId = this.gistManager.getGistId();
        if (existingGistId) {
            const input = this.element.querySelector('#gist-id-input');
            input.value = existingGistId;

            // Validate the existing gist ID
            const isValid = await this.gistManager.validateGistExists(existingGistId);
            if (isValid) {
                this.showValidationMessage('Connected to existing gist', 'success');
                this.element.querySelector('#connect-gist-btn').disabled = false;
            } else {
                this.showValidationMessage('Stored gist ID is no longer valid', 'error');
            }
        }
    }

    /**
     * Validate gist ID and update UI
     * @param {string} gistId - The gist ID to validate
     */
    async validateGistId(gistId) {
        const connectBtn = this.element.querySelector('#connect-gist-btn');

        if (!gistId || gistId.length < 10) {
            this.showValidationMessage('Gist ID must be at least 10 characters', 'error');
            connectBtn.disabled = true;
            return;
        }

        this.showValidationMessage('Validating gist...', 'info');
        connectBtn.disabled = true;

        try {
            const exists = await this.gistManager.validateGistExists(gistId);

            if (exists) {
                const hasValidStructure = await this.gistManager.validateGistStructure(gistId);

                if (hasValidStructure) {
                    this.showValidationMessage('Valid audiobook gist found!', 'success');
                    connectBtn.disabled = false;
                } else {
                    this.showValidationMessage('Gist exists but contains no audiobook data. You can still connect to initialize it.', 'warning');
                    connectBtn.disabled = false;
                }
            } else {
                this.showValidationMessage('Gist not found or not accessible. Please check the ID.', 'error');
                connectBtn.disabled = true;
            }
        } catch (error) {
            this.showValidationMessage('Error validating gist. Please try again.', 'error');
            connectBtn.disabled = true;
        }
    }

    /**
     * Connect to the specified gist
     * @param {string} gistId - The gist ID to connect to
     */
    async connectToGist(gistId) {
        try {
            this.showValidationMessage('Connecting to gist...', 'info');

            const exists = await this.gistManager.validateGistExists(gistId);
            if (!exists) {
                this.showValidationMessage('Cannot connect: Gist not found or not accessible', 'error');
                return;
            }

            // Save the gist ID
            this.gistManager.saveGistId(gistId);

            // Get gist info for confirmation
            const gistInfo = await this.gistManager.getGistInfo(gistId);

            this.showValidationMessage(`Successfully connected to gist: ${gistInfo?.description || gistId}`, 'success');

            // Notify parent component
            if (this.onGistConnected) {
                this.onGistConnected(gistId, gistInfo);
            }

        } catch (error) {
            console.error('Error connecting to gist:', error);
            this.showValidationMessage('Failed to connect to gist. Please try again.', 'error');
        }
    }

    /**
     * Show instructions for creating a new gist
     */
    showCreateNewGistInstructions() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

        modal.innerHTML = `
      <div class="bg-white p-6 rounded-lg max-w-lg mx-4">
        <h3 class="text-lg font-semibold mb-4">Create New Gist</h3>
        <div class="space-y-3 text-sm">
          <p>To create a new gist for your audiobook library:</p>
          <ol class="list-decimal list-inside space-y-2 ml-4">
            <li>Go to <a href="https://gist.github.com" target="_blank" class="text-blue-600 hover:underline">gist.github.com</a></li>
            <li>Create a new <strong>public</strong> gist</li>
            <li>Name the file "audiobooks.json"</li>
            <li>Add this initial content:</li>
          </ol>
          <pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto">{"audiobooks": [], "metadata": {"version": "1.0"}}</pre>
          <ol class="list-decimal list-inside space-y-2 ml-4" start="5">
            <li>Click "Create public gist"</li>
            <li>Copy the gist ID from the URL</li>
            <li>Paste it in the input field above</li>
          </ol>
        </div>
        <button id="close-modal" class="mt-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
          Got it
        </button>
      </div>
    `;

        document.body.appendChild(modal);

        modal.querySelector('#close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Show validation message with appropriate styling
     * @param {string} message - The message to show
     * @param {string} type - Message type: 'success', 'error', 'warning', 'info'
     */
    showValidationMessage(message, type) {
        const messageEl = this.element.querySelector('#validation-message');
        messageEl.textContent = message;
        messageEl.className = `mt-2 text-sm ${this.getMessageClasses(type)}`;
        messageEl.classList.remove('hidden');
    }

    /**
     * Clear validation message
     */
    clearValidationMessage() {
        const messageEl = this.element.querySelector('#validation-message');
        messageEl.classList.add('hidden');
    }

    /**
     * Get CSS classes for message type
     * @param {string} type - Message type
     * @returns {string} CSS classes
     */
    getMessageClasses(type) {
        switch (type) {
            case 'success':
                return 'text-green-600';
            case 'error':
                return 'text-red-600';
            case 'warning':
                return 'text-yellow-600';
            case 'info':
                return 'text-blue-600';
            default:
                return 'text-gray-600';
        }
    }

    /**
     * Destroy the component and clean up
     */
    destroy() {
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
        }
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

export default GistIdInput;