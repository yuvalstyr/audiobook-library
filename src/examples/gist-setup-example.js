/**
 * Example usage of GistManager and GistIdInput components
 * This demonstrates how to integrate gist ID management into the app
 */

import GistManager from '../services/GistManager.js';
import GistIdInput from '../components/GistIdInput.js';

/**
 * Example setup function that could be called from main.js
 */
export function setupGistIntegration() {
    const gistManager = new GistManager();

    // Check if we already have a valid gist connection
    gistManager.hasValidStoredGist().then(hasValid => {
        if (hasValid) {
            console.log('Already connected to a valid gist');
            // App can proceed with sync functionality
            initializeSyncFeatures(gistManager);
        } else {
            console.log('No valid gist connection found');
            // Show gist setup UI
            showGistSetupModal(gistManager);
        }
    });
}

/**
 * Show the gist setup modal
 */
function showGistSetupModal(gistManager) {
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'gist-setup-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

    // Create gist input component
    const gistInput = new GistIdInput();
    const gistInputElement = gistInput.create((gistId, gistInfo) => {
        console.log('Successfully connected to gist:', gistId);

        // Initialize sync features
        initializeSyncFeatures(gistManager);

        // Close modal
        document.body.removeChild(modal);

        // Show success message
        showSuccessMessage(`Connected to gist: ${gistInfo?.description || gistId}`);
    });

    modal.appendChild(gistInputElement);
    document.body.appendChild(modal);

    // Allow closing modal by clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

/**
 * Initialize sync features after gist connection is established
 */
function initializeSyncFeatures(gistManager) {
    console.log('Initializing sync features...');

    // Add sync status indicator to UI
    addSyncStatusIndicator();

    // Add gist management to settings
    addGistManagementToSettings(gistManager);

    // Here you would initialize the actual sync service
    // This is a placeholder for future tasks
    console.log('Sync features initialized');
}

/**
 * Add sync status indicator to the UI
 */
function addSyncStatusIndicator() {
    const header = document.querySelector('header') || document.querySelector('.header');
    if (!header) return;

    const syncIndicator = document.createElement('div');
    syncIndicator.id = 'sync-status';
    syncIndicator.className = 'flex items-center gap-2 text-sm text-gray-600';
    syncIndicator.innerHTML = `
    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
    <span>Synced</span>
  `;

    header.appendChild(syncIndicator);
}

/**
 * Add gist management options to settings
 */
function addGistManagementToSettings(gistManager) {
    // This would integrate with existing settings UI
    // For now, just add a simple button to the page

    const settingsButton = document.createElement('button');
    settingsButton.textContent = 'Manage Gist Connection';
    settingsButton.className = 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700';
    settingsButton.onclick = () => showGistManagementModal(gistManager);

    // Add to a settings area or create one
    let settingsArea = document.querySelector('#settings-area');
    if (!settingsArea) {
        settingsArea = document.createElement('div');
        settingsArea.id = 'settings-area';
        settingsArea.className = 'fixed top-4 right-4 z-40';
        document.body.appendChild(settingsArea);
    }

    settingsArea.appendChild(settingsButton);
}

/**
 * Show gist management modal for changing/disconnecting gist
 */
function showGistManagementModal(gistManager) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

    const currentGistId = gistManager.getGistId();

    modal.innerHTML = `
    <div class="bg-white p-6 rounded-lg max-w-md mx-4">
      <h3 class="text-lg font-semibold mb-4">Manage Gist Connection</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Current Gist ID:</label>
          <code class="block bg-gray-100 p-2 rounded text-sm break-all">${currentGistId || 'None'}</code>
        </div>
        <div class="flex gap-3">
          <button id="change-gist" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Change Gist
          </button>
          <button id="disconnect-gist" class="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Disconnect
          </button>
        </div>
        <button id="close-modal" class="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
          Close
        </button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('#change-gist').onclick = () => {
        document.body.removeChild(modal);
        showGistSetupModal(gistManager);
    };

    modal.querySelector('#disconnect-gist').onclick = () => {
        if (confirm('Are you sure you want to disconnect from the current gist? This will stop syncing across devices.')) {
            gistManager.clearGistId();
            document.body.removeChild(modal);
            showSuccessMessage('Disconnected from gist');

            // Remove sync indicator
            const syncIndicator = document.querySelector('#sync-status');
            if (syncIndicator) {
                syncIndicator.remove();
            }
        }
    };

    modal.querySelector('#close-modal').onclick = () => {
        document.body.removeChild(modal);
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

/**
 * Show success message to user
 */
function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            document.body.removeChild(toast);
        }
    }, 3000);
}

// Export for use in main.js
export { setupGistIntegration };