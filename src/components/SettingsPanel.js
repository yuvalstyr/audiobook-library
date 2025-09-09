import GistManager from '../services/GistManager.js';
import { DataManagementService } from '../services/DataManagementService.js';

/**
 * SettingsPanel - Settings panel for managing sync preferences and gist sharing
 * Provides interface for changing gist connections, sync settings, and troubleshooting
 */
class SettingsPanel {
    constructor(dataService, onSettingsChanged = null) {
        this.dataService = dataService;
        this.gistManager = new GistManager();
        this.onSettingsChanged = onSettingsChanged;
        this.element = null;
        this.validationTimeout = null;

        // Data management service will be initialized lazily
        this.dataManagementService = null;
    }

    /**
     * Create and show the settings panel
     * @returns {HTMLElement} The settings panel element
     */
    create() {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        overlay.id = 'settings-panel-overlay';

        const container = document.createElement('div');
        container.className = 'bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto';

        container.innerHTML = `
            <div class="p-6">
                <!-- Header -->
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">Sync Settings</h2>
                    <button id="close-settings" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <!-- Current Sync Status -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Current Sync Status</h3>
                    <div id="sync-status-card" class="border border-gray-200 rounded-lg p-4">
                        ${this.renderSyncStatus()}
                    </div>
                </div>

                <!-- Gist Connection -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Gist Connection</h3>
                    <div class="space-y-4">
                        <div>
                            <label for="current-gist-id" class="block text-sm font-medium text-gray-700 mb-2">
                                Current Gist ID
                            </label>
                            <div class="flex gap-2">
                                <input 
                                    type="text" 
                                    id="current-gist-id"
                                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="No gist connected"
                                    value="${this.gistManager.getGistId() || ''}"
                                />
                                <button id="copy-gist-id" class="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500">
                                    Copy
                                </button>
                            </div>
                            <div id="gist-validation-message" class="mt-2 text-sm hidden"></div>
                        </div>
                        
                        <div class="flex gap-3">
                            <button id="update-gist" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                Update Connection
                            </button>
                            <button id="disconnect-gist" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                                Disconnect
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Sync Preferences -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Sync Preferences</h3>
                    <div class="space-y-4">
                        <div>
                            <label for="sync-interval" class="block text-sm font-medium text-gray-700 mb-2">
                                Sync Interval
                            </label>
                            <select id="sync-interval" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="15000">15 seconds</option>
                                <option value="30000" selected>30 seconds</option>
                                <option value="60000">1 minute</option>
                                <option value="300000">5 minutes</option>
                                <option value="0">Manual only</option>
                            </select>
                        </div>
                        
                        <div>
                            <label for="conflict-resolution" class="block text-sm font-medium text-gray-700 mb-2">
                                Conflict Resolution
                            </label>
                            <select id="conflict-resolution" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="manual" selected>Ask me what to do</option>
                                <option value="auto-local">Always keep local changes</option>
                                <option value="auto-remote">Always keep remote changes</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Sharing Instructions -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Share with Other Devices</h3>
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 class="font-medium text-blue-900 mb-3">To sync on another device:</h4>
                        <ol class="text-sm text-blue-800 space-y-2">
                            <li>1. Open this audiobook library on your other device</li>
                            <li>2. Click the settings icon or go to Settings → Sync Settings</li>
                            <li>3. Enter your Gist ID in the "Current Gist ID" field</li>
                            <li>4. Click "Update Connection" to start syncing</li>
                        </ol>
                        <div class="mt-3 p-3 bg-white border border-blue-200 rounded">
                            <p class="text-xs text-blue-700 font-medium mb-1">Your Gist ID:</p>
                            <code class="text-sm font-mono text-blue-900">${this.gistManager.getGistId() || 'Not connected'}</code>
                        </div>
                    </div>
                </div>

                <!-- Data Management -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
                    <div class="space-y-3">
                        <button id="validate-data" class="w-full text-left px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <div class="font-medium text-blue-900">Validate & Repair Data</div>
                            <div class="text-sm text-blue-600">Check for data corruption and attempt automatic repairs</div>
                        </button>
                        
                        <button id="sync-diagnostics" class="w-full text-left px-4 py-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500">
                            <div class="font-medium text-green-900">Sync Diagnostics</div>
                            <div class="text-sm text-green-600">View detailed sync statistics and health information</div>
                        </button>
                        
                        <button id="device-management" class="w-full text-left px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <div class="font-medium text-purple-900">Device Management</div>
                            <div class="text-sm text-purple-600">View connected devices and clean up old entries</div>
                        </button>
                        
                        <button id="clear-all-data" class="w-full text-left px-4 py-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500">
                            <div class="font-medium text-red-900">Clear All Data</div>
                            <div class="text-sm text-red-600">Permanently delete all local and cloud data</div>
                        </button>
                    </div>
                </div>

                <!-- Troubleshooting -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Troubleshooting</h3>
                    <div class="space-y-3">
                        <button id="force-sync" class="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <div class="font-medium text-gray-900">Force Sync Now</div>
                            <div class="text-sm text-gray-600">Manually trigger a sync with the remote gist</div>
                        </button>
                        
                        <button id="clear-cache" class="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <div class="font-medium text-gray-900">Clear Local Cache</div>
                            <div class="text-sm text-gray-600">Clear local cache and re-sync from remote</div>
                        </button>
                        
                        <button id="reset-sync" class="w-full text-left px-4 py-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500">
                            <div class="font-medium text-red-900">Reset Sync Settings</div>
                            <div class="text-sm text-red-600">Disconnect and clear all sync data (local data preserved)</div>
                        </button>
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
                    <button id="cancel-settings" class="px-4 py-2 text-gray-600 hover:text-gray-800">
                        Cancel
                    </button>
                    <button id="save-settings" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        Save Changes
                    </button>
                </div>
            </div>
        `;

        overlay.appendChild(container);
        this.element = overlay;
        this.attachEventListeners();
        this.loadCurrentSettings();

        return overlay;
    }

    /**
     * Render current sync status
     */
    renderSyncStatus() {
        const gistId = this.gistManager.getGistId();
        const syncManager = this.dataService?.getSyncManager();

        if (!gistId) {
            return `
                <div class="flex items-center gap-3">
                    <div class="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <div>
                        <div class="font-medium text-gray-900">Not Connected</div>
                        <div class="text-sm text-gray-600">No gist configured for syncing</div>
                    </div>
                </div>
            `;
        }

        const status = syncManager?.getStatus() || 'unknown';
        const lastSync = syncManager?.getLastSyncTime();

        let statusColor = 'gray';
        let statusText = 'Unknown';

        switch (status) {
            case 'synced':
                statusColor = 'green';
                statusText = 'Synced';
                break;
            case 'pending':
                statusColor = 'yellow';
                statusText = 'Syncing...';
                break;
            case 'error':
                statusColor = 'red';
                statusText = 'Sync Error';
                break;
            case 'offline':
                statusColor = 'orange';
                statusText = 'Offline';
                break;
        }

        return `
            <div class="flex items-center gap-3">
                <div class="w-3 h-3 bg-${statusColor}-500 rounded-full"></div>
                <div>
                    <div class="font-medium text-gray-900">${statusText}</div>
                    <div class="text-sm text-gray-600">
                        ${lastSync ? `Last sync: ${new Date(lastSync).toLocaleString()}` : 'Never synced'}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Load current settings into the form
     */
    loadCurrentSettings() {
        const syncManager = this.dataService?.getSyncManager();

        if (syncManager) {
            const settings = syncManager.getSettings();

            // Load sync interval
            const intervalSelect = this.element.querySelector('#sync-interval');
            if (intervalSelect && settings.syncInterval !== undefined) {
                intervalSelect.value = settings.syncInterval.toString();
            }

            // Load conflict resolution
            const conflictSelect = this.element.querySelector('#conflict-resolution');
            if (conflictSelect && settings.conflictResolution) {
                conflictSelect.value = settings.conflictResolution;
            }
        }
    }

    /**
     * Attach event listeners to settings elements
     */
    attachEventListeners() {
        // Close button
        const closeBtn = this.element.querySelector('#close-settings');
        const cancelBtn = this.element.querySelector('#cancel-settings');

        closeBtn?.addEventListener('click', () => this.hide());
        cancelBtn?.addEventListener('click', () => this.hide());

        // Gist ID input validation
        const gistInput = this.element.querySelector('#current-gist-id');
        if (gistInput) {
            gistInput.addEventListener('input', (e) => {
                clearTimeout(this.validationTimeout);
                const gistId = e.target.value.trim();

                if (gistId.length === 0) {
                    this.clearGistValidationMessage();
                    return;
                }

                // Debounce validation
                this.validationTimeout = setTimeout(() => {
                    this.validateGistId(gistId);
                }, 500);
            });
        }

        // Copy gist ID
        const copyBtn = this.element.querySelector('#copy-gist-id');
        copyBtn?.addEventListener('click', () => this.copyGistId());

        // Gist connection actions
        const updateBtn = this.element.querySelector('#update-gist');
        const disconnectBtn = this.element.querySelector('#disconnect-gist');

        updateBtn?.addEventListener('click', () => this.updateGistConnection());
        disconnectBtn?.addEventListener('click', () => this.disconnectGist());

        // Data management actions
        const validateDataBtn = this.element.querySelector('#validate-data');
        const syncDiagnosticsBtn = this.element.querySelector('#sync-diagnostics');
        const deviceManagementBtn = this.element.querySelector('#device-management');
        const clearAllDataBtn = this.element.querySelector('#clear-all-data');

        validateDataBtn?.addEventListener('click', () => this.validateAndRepairData());
        syncDiagnosticsBtn?.addEventListener('click', () => this.showSyncDiagnostics());
        deviceManagementBtn?.addEventListener('click', () => this.showDeviceManagement());
        clearAllDataBtn?.addEventListener('click', () => this.clearAllData());

        // Troubleshooting actions
        const forceSyncBtn = this.element.querySelector('#force-sync');
        const clearCacheBtn = this.element.querySelector('#clear-cache');
        const resetSyncBtn = this.element.querySelector('#reset-sync');

        forceSyncBtn?.addEventListener('click', () => this.forceSync());
        clearCacheBtn?.addEventListener('click', () => this.clearCache());
        resetSyncBtn?.addEventListener('click', () => this.resetSync());

        // Save settings
        const saveBtn = this.element.querySelector('#save-settings');
        saveBtn?.addEventListener('click', () => this.saveSettings());

        // Close on overlay click
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) {
                this.hide();
            }
        });
    }

    /**
     * Validate gist ID and show feedback
     */
    async validateGistId(gistId) {
        if (!gistId || gistId.length < 10) {
            this.showGistValidationMessage('Gist ID must be at least 10 characters', 'error');
            return false;
        }

        this.showGistValidationMessage('Validating gist...', 'info');

        try {
            const exists = await this.gistManager.validateGistExists(gistId);

            if (exists) {
                this.showGistValidationMessage('Valid gist found!', 'success');
                return true;
            } else {
                this.showGistValidationMessage('Gist not found or not accessible', 'error');
                return false;
            }
        } catch (error) {
            this.showGistValidationMessage('Error validating gist', 'error');
            return false;
        }
    }

    /**
     * Show gist validation message
     */
    showGistValidationMessage(message, type) {
        const messageEl = this.element.querySelector('#gist-validation-message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `mt-2 text-sm ${this.getMessageClasses(type)}`;
            messageEl.classList.remove('hidden');
        }
    }

    /**
     * Clear gist validation message
     */
    clearGistValidationMessage() {
        const messageEl = this.element.querySelector('#gist-validation-message');
        if (messageEl) {
            messageEl.classList.add('hidden');
        }
    }

    /**
     * Get CSS classes for message type
     */
    getMessageClasses(type) {
        switch (type) {
            case 'success': return 'text-green-600';
            case 'error': return 'text-red-600';
            case 'warning': return 'text-yellow-600';
            case 'info': return 'text-blue-600';
            default: return 'text-gray-600';
        }
    }

    /**
     * Copy gist ID to clipboard
     */
    async copyGistId() {
        const gistInput = this.element.querySelector('#current-gist-id');
        const copyBtn = this.element.querySelector('#copy-gist-id');

        if (gistInput && gistInput.value) {
            try {
                await navigator.clipboard.writeText(gistInput.value);
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            } catch (error) {
                console.error('Failed to copy gist ID:', error);
            }
        }
    }

    /**
     * Update gist connection
     */
    async updateGistConnection() {
        const gistInput = this.element.querySelector('#current-gist-id');
        const gistId = gistInput?.value.trim();

        if (!gistId) {
            this.showGistValidationMessage('Please enter a gist ID', 'error');
            return;
        }

        const isValid = await this.validateGistId(gistId);
        if (!isValid) {
            return;
        }

        try {
            // Save the new gist ID
            this.gistManager.saveGistId(gistId);

            // Reinitialize sync with new gist
            if (this.dataService) {
                await this.dataService.reinitializeSync();
            }

            // Update sync status display
            this.updateSyncStatusDisplay();

            this.showGistValidationMessage('Gist connection updated successfully!', 'success');

            if (this.onSettingsChanged) {
                this.onSettingsChanged('gist-updated', gistId);
            }
        } catch (error) {
            console.error('Failed to update gist connection:', error);
            this.showGistValidationMessage('Failed to update connection', 'error');
        }
    }

    /**
     * Disconnect from current gist
     */
    async disconnectGist() {
        if (!confirm('Are you sure you want to disconnect from the current gist? Your local data will be preserved.')) {
            return;
        }

        try {
            // Clear gist ID
            this.gistManager.clearGistId();

            // Stop sync
            if (this.dataService) {
                await this.dataService.stopSync();
            }

            // Update UI
            const gistInput = this.element.querySelector('#current-gist-id');
            if (gistInput) {
                gistInput.value = '';
            }

            this.updateSyncStatusDisplay();
            this.clearGistValidationMessage();

            if (this.onSettingsChanged) {
                this.onSettingsChanged('gist-disconnected');
            }
        } catch (error) {
            console.error('Failed to disconnect gist:', error);
            this.showGistValidationMessage('Failed to disconnect', 'error');
        }
    }

    /**
     * Force sync now
     */
    async forceSync() {
        const syncManager = this.dataService?.getSyncManager();
        if (!syncManager) {
            alert('Sync is not available');
            return;
        }

        try {
            await syncManager.syncNow();
            this.updateSyncStatusDisplay();
            alert('Sync completed successfully!');
        } catch (error) {
            console.error('Force sync failed:', error);
            alert('Sync failed: ' + error.message);
        }
    }

    /**
     * Clear local cache
     */
    async clearCache() {
        if (!confirm('Are you sure you want to clear the local cache? This will re-download all data from the remote gist.')) {
            return;
        }

        try {
            const syncManager = this.dataService?.getSyncManager();
            if (syncManager) {
                await syncManager.clearLocalCache();
                await syncManager.syncFromCloud();
            }

            this.updateSyncStatusDisplay();
            alert('Local cache cleared and data re-synced!');

            if (this.onSettingsChanged) {
                this.onSettingsChanged('cache-cleared');
            }
        } catch (error) {
            console.error('Failed to clear cache:', error);
            alert('Failed to clear cache: ' + error.message);
        }
    }

    /**
     * Reset sync settings
     */
    async resetSync() {
        if (!confirm('Are you sure you want to reset all sync settings? This will disconnect from the gist and clear sync data, but preserve your local audiobook collection.')) {
            return;
        }

        try {
            // Clear gist connection
            this.gistManager.clearGistId();

            // Stop and reset sync
            if (this.dataService) {
                await this.dataService.resetSync();
            }

            // Update UI
            const gistInput = this.element.querySelector('#current-gist-id');
            if (gistInput) {
                gistInput.value = '';
            }

            this.updateSyncStatusDisplay();
            this.clearGistValidationMessage();

            alert('Sync settings have been reset. Your local data is preserved.');

            if (this.onSettingsChanged) {
                this.onSettingsChanged('sync-reset');
            }
        } catch (error) {
            console.error('Failed to reset sync:', error);
            alert('Failed to reset sync settings: ' + error.message);
        }
    }

    /**
     * Get or initialize data management service
     */
    async getDataManagementService() {
        if (!this.dataManagementService && this.dataService) {
            this.dataManagementService = await this.dataService.getDataManagementService();
        }
        return this.dataManagementService;
    }

    /**
     * Validate and repair data
     */
    async validateAndRepairData() {
        const dataManagementService = await this.getDataManagementService();
        if (!dataManagementService) {
            alert('Data management service not available');
            return;
        }

        try {
            const button = this.element.querySelector('#validate-data');
            const originalText = button.querySelector('.font-medium').textContent;
            button.querySelector('.font-medium').textContent = 'Validating...';
            button.disabled = true;

            const result = await dataManagementService.validateAndRepairData();

            let message = `Data validation completed.\n\n`;
            message += `Issues found: ${result.issues.length}\n`;
            message += `Repairs made: ${result.repairs.length}\n`;

            if (result.issues.length > 0) {
                message += `\nIssues:\n`;
                result.issues.forEach(issue => {
                    message += `- ${issue.description} (${issue.severity})\n`;
                });
            }

            if (result.repairs.length > 0) {
                message += `\nRepairs:\n`;
                result.repairs.forEach(repair => {
                    message += `- ${repair}\n`;
                });
            }

            if (result.errors.length > 0) {
                message += `\nErrors:\n`;
                result.errors.forEach(error => {
                    message += `- ${error}\n`;
                });
            }

            alert(message);

            if (this.onSettingsChanged) {
                this.onSettingsChanged('data-validated', result);
            }

        } catch (error) {
            console.error('Data validation failed:', error);
            alert('Data validation failed: ' + error.message);
        } finally {
            const button = this.element.querySelector('#validate-data');
            button.querySelector('.font-medium').textContent = 'Validate & Repair Data';
            button.disabled = false;
        }
    }

    /**
     * Show sync diagnostics
     */
    async showSyncDiagnostics() {
        const dataManagementService = await this.getDataManagementService();
        if (!dataManagementService) {
            alert('Data management service not available');
            return;
        }

        try {
            const button = this.element.querySelector('#sync-diagnostics');
            const originalText = button.querySelector('.font-medium').textContent;
            button.querySelector('.font-medium').textContent = 'Loading...';
            button.disabled = true;

            const stats = await dataManagementService.getSyncStatistics();

            this.showDiagnosticsModal(stats);

        } catch (error) {
            console.error('Failed to get sync diagnostics:', error);
            alert('Failed to get sync diagnostics: ' + error.message);
        } finally {
            const button = this.element.querySelector('#sync-diagnostics');
            button.querySelector('.font-medium').textContent = 'Sync Diagnostics';
            button.disabled = false;
        }
    }

    /**
     * Show device management
     */
    async showDeviceManagement() {
        const dataManagementService = await this.getDataManagementService();
        if (!dataManagementService) {
            alert('Data management service not available');
            return;
        }

        try {
            const button = this.element.querySelector('#device-management');
            const originalText = button.querySelector('.font-medium').textContent;
            button.querySelector('.font-medium').textContent = 'Loading...';
            button.disabled = true;

            const deviceStats = await dataManagementService.getDeviceStatistics();

            this.showDeviceManagementModal(deviceStats);

        } catch (error) {
            console.error('Failed to get device statistics:', error);
            alert('Failed to get device statistics: ' + error.message);
        } finally {
            const button = this.element.querySelector('#device-management');
            button.querySelector('.font-medium').textContent = 'Device Management';
            button.disabled = false;
        }
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        const confirmMessage = `⚠️ WARNING: This will permanently delete ALL data!

This action will:
• Delete all audiobooks from local storage
• Clear all audiobooks from your cloud gist
• Remove sync settings and connection

This action CANNOT be undone!

Type "DELETE ALL" to confirm:`;

        const confirmation = prompt(confirmMessage);

        if (confirmation !== 'DELETE ALL') {
            return;
        }

        const dataManagementService = await this.getDataManagementService();
        if (!dataManagementService) {
            alert('Data management service not available');
            return;
        }

        try {
            const button = this.element.querySelector('#clear-all-data');
            const originalText = button.querySelector('.font-medium').textContent;
            button.querySelector('.font-medium').textContent = 'Clearing...';
            button.disabled = true;

            const result = await dataManagementService.clearAllData({
                clearLocal: true,
                clearCloud: true,
                preserveGistConnection: false
            });

            let message = 'Data clearing completed.\n\n';
            message += `Operations: ${result.operations.length}\n`;

            if (result.operations.length > 0) {
                message += '\nCompleted:\n';
                result.operations.forEach(op => {
                    message += `- ${op}\n`;
                });
            }

            if (result.errors.length > 0) {
                message += '\nErrors:\n';
                result.errors.forEach(error => {
                    message += `- ${error}\n`;
                });
            }

            alert(message);

            // Update UI to reflect cleared state
            const gistInput = this.element.querySelector('#current-gist-id');
            if (gistInput) {
                gistInput.value = '';
            }
            this.updateSyncStatusDisplay();
            this.clearGistValidationMessage();

            if (this.onSettingsChanged) {
                this.onSettingsChanged('all-data-cleared', result);
            }

        } catch (error) {
            console.error('Failed to clear all data:', error);
            alert('Failed to clear all data: ' + error.message);
        } finally {
            const button = this.element.querySelector('#clear-all-data');
            button.querySelector('.font-medium').textContent = 'Clear All Data';
            button.disabled = false;
        }
    }

    /**
     * Save settings changes
     */
    async saveSettings() {
        try {
            const syncInterval = parseInt(this.element.querySelector('#sync-interval')?.value || '30000');
            const conflictResolution = this.element.querySelector('#conflict-resolution')?.value || 'manual';

            const settings = {
                syncInterval,
                conflictResolution
            };

            // Update sync manager settings
            const syncManager = this.dataService?.getSyncManager();
            if (syncManager) {
                await syncManager.updateSettings(settings);
            }

            if (this.onSettingsChanged) {
                this.onSettingsChanged('settings-saved', settings);
            }

            this.hide();
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings: ' + error.message);
        }
    }

    /**
     * Update sync status display
     */
    updateSyncStatusDisplay() {
        const statusCard = this.element.querySelector('#sync-status-card');
        if (statusCard) {
            statusCard.innerHTML = this.renderSyncStatus();
        }
    }

    /**
     * Show the settings panel
     */
    show() {
        if (!this.element) {
            this.create();
        }
        document.body.appendChild(this.element);

        // Focus the first input
        setTimeout(() => {
            const firstInput = this.element.querySelector('#current-gist-id');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    /**
     * Hide the settings panel
     */
    hide() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    /**
     * Show diagnostics modal
     */
    showDiagnosticsModal(stats) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4';

        const content = document.createElement('div');
        content.className = 'bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto';

        content.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-bold text-gray-900">Sync Diagnostics</h3>
                    <button class="close-modal text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Health Status -->
                <div class="mb-6">
                    <h4 class="text-lg font-semibold mb-3">Overall Health</h4>
                    <div class="flex items-center gap-3 p-4 rounded-lg ${this.getHealthStatusClass(stats.health.overall)}">
                        <div class="w-4 h-4 rounded-full ${this.getHealthDotClass(stats.health.overall)}"></div>
                        <div>
                            <div class="font-medium capitalize">${stats.health.overall}</div>
                            ${stats.health.issues.length > 0 ? `
                                <div class="text-sm mt-1">
                                    ${stats.health.issues.map(issue => `<div>• ${issue}</div>`).join('')}
                                </div>
                            ` : '<div class="text-sm text-gray-600">All systems operational</div>'}
                        </div>
                    </div>
                </div>

                <!-- Sync Status -->
                <div class="mb-6">
                    <h4 class="text-lg font-semibold mb-3">Sync Status</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-gray-50 p-3 rounded">
                            <div class="text-sm text-gray-600">Status</div>
                            <div class="font-medium">${stats.sync.syncStatus || 'Unknown'}</div>
                        </div>
                        <div class="bg-gray-50 p-3 rounded">
                            <div class="text-sm text-gray-600">Last Sync</div>
                            <div class="font-medium">${stats.sync.lastSyncTime ? new Date(stats.sync.lastSyncTime).toLocaleString() : 'Never'}</div>
                        </div>
                        <div class="bg-gray-50 p-3 rounded">
                            <div class="text-sm text-gray-600">Auto Sync</div>
                            <div class="font-medium">${stats.sync.isAutoSyncEnabled ? 'Enabled' : 'Disabled'}</div>
                        </div>
                        <div class="bg-gray-50 p-3 rounded">
                            <div class="text-sm text-gray-600">Online</div>
                            <div class="font-medium">${stats.sync.isOnline ? 'Yes' : 'No'}</div>
                        </div>
                    </div>
                </div>

                <!-- Cache Status -->
                <div class="mb-6">
                    <h4 class="text-lg font-semibold mb-3">Local Cache</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-gray-50 p-3 rounded">
                            <div class="text-sm text-gray-600">Has Data</div>
                            <div class="font-medium">${stats.cache.hasData ? 'Yes' : 'No'}</div>
                        </div>
                        <div class="bg-gray-50 p-3 rounded">
                            <div class="text-sm text-gray-600">Audiobooks</div>
                            <div class="font-medium">${stats.cache.audiobookCount || 0}</div>
                        </div>
                        <div class="bg-gray-50 p-3 rounded">
                            <div class="text-sm text-gray-600">Cache Size</div>
                            <div class="font-medium">${this.formatBytes(stats.cache.cacheSize || 0)}</div>
                        </div>
                        <div class="bg-gray-50 p-3 rounded">
                            <div class="text-sm text-gray-600">Device ID</div>
                            <div class="font-medium text-xs">${stats.cache.deviceId || 'Unknown'}</div>
                        </div>
                    </div>
                </div>

                <!-- Gist Status -->
                <div class="mb-6">
                    <h4 class="text-lg font-semibold mb-3">Cloud Gist</h4>
                    ${stats.gist.connected ? `
                        <div class="grid grid-cols-2 gap-4">
                            <div class="bg-gray-50 p-3 rounded">
                                <div class="text-sm text-gray-600">Gist ID</div>
                                <div class="font-medium text-xs">${stats.gist.id || 'Unknown'}</div>
                            </div>
                            <div class="bg-gray-50 p-3 rounded">
                                <div class="text-sm text-gray-600">Public</div>
                                <div class="font-medium">${stats.gist.public ? 'Yes' : 'No'}</div>
                            </div>
                            <div class="bg-gray-50 p-3 rounded">
                                <div class="text-sm text-gray-600">Created</div>
                                <div class="font-medium">${stats.gist.created_at ? new Date(stats.gist.created_at).toLocaleDateString() : 'Unknown'}</div>
                            </div>
                            <div class="bg-gray-50 p-3 rounded">
                                <div class="text-sm text-gray-600">Updated</div>
                                <div class="font-medium">${stats.gist.updated_at ? new Date(stats.gist.updated_at).toLocaleDateString() : 'Unknown'}</div>
                            </div>
                        </div>
                    ` : `
                        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div class="text-red-800">Not connected to a gist</div>
                            ${stats.gist.error ? `<div class="text-sm text-red-600 mt-1">Error: ${stats.gist.error}</div>` : ''}
                        </div>
                    `}
                </div>

                <!-- Device Information -->
                <div class="mb-6">
                    <h4 class="text-lg font-semibold mb-3">Devices</h4>
                    <div class="bg-gray-50 p-3 rounded">
                        <div class="text-sm text-gray-600">Known Devices</div>
                        <div class="font-medium">${stats.devices.totalDevices || 0}</div>
                    </div>
                </div>

                <div class="flex justify-end">
                    <button class="close-modal px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Add close handlers
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Show device management modal
     */
    showDeviceManagementModal(deviceStats) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4';

        const content = document.createElement('div');
        content.className = 'bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto';

        content.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-bold text-gray-900">Device Management</h3>
                    <button class="close-modal text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Current Device -->
                <div class="mb-6">
                    <h4 class="text-lg font-semibold mb-3">Current Device</h4>
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="font-medium text-blue-900">${deviceStats.currentDevice}</div>
                        <div class="text-sm text-blue-600">This device</div>
                    </div>
                </div>

                <!-- Known Devices -->
                <div class="mb-6">
                    <h4 class="text-lg font-semibold mb-3">Known Devices (${deviceStats.totalDevices})</h4>
                    <div class="space-y-2">
                        ${deviceStats.knownDevices.map(device => `
                            <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg ${device.isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}">
                                <div>
                                    <div class="font-medium ${device.isCurrent ? 'text-blue-900' : 'text-gray-900'}">${device.id}</div>
                                    <div class="text-sm ${device.isCurrent ? 'text-blue-600' : 'text-gray-600'}">
                                        Last seen: ${device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Unknown'}
                                        ${device.isCurrent ? ' • Current device' : ''}
                                    </div>
                                </div>
                                <div class="text-xs ${device.isCurrent ? 'text-blue-600' : 'text-gray-500'} uppercase">
                                    ${device.source}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Device Cleanup -->
                <div class="mb-6">
                    <h4 class="text-lg font-semibold mb-3">Cleanup</h4>
                    <button id="cleanup-devices" class="w-full px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <div class="font-medium text-orange-900">Clean Up Old Devices</div>
                        <div class="text-sm text-orange-600">Remove device entries older than 30 days</div>
                    </button>
                </div>

                ${deviceStats.error ? `
                    <div class="mb-6">
                        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div class="text-red-800">Error loading device information</div>
                            <div class="text-sm text-red-600 mt-1">${deviceStats.error}</div>
                        </div>
                    </div>
                ` : ''}

                <div class="flex justify-end">
                    <button class="close-modal px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Add cleanup handler
        const cleanupBtn = modal.querySelector('#cleanup-devices');
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', async () => {
                if (confirm('Remove device entries older than 30 days?')) {
                    try {
                        cleanupBtn.disabled = true;
                        cleanupBtn.querySelector('.font-medium').textContent = 'Cleaning...';

                        const dataManagementService = await this.getDataManagementService();
                        const result = await dataManagementService.cleanupOldDevices({ maxAge: 30 });

                        alert(`Device cleanup completed.\nDevices removed: ${result.devicesRemoved}\n${result.message || ''}`);

                        // Refresh the modal
                        document.body.removeChild(modal);
                        const newStats = await dataManagementService.getDeviceStatistics();
                        this.showDeviceManagementModal(newStats);

                    } catch (error) {
                        alert('Device cleanup failed: ' + error.message);
                    }
                }
            });
        }

        // Add close handlers
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Get health status CSS class
     */
    getHealthStatusClass(status) {
        switch (status) {
            case 'good': return 'bg-green-50 border border-green-200';
            case 'warning': return 'bg-yellow-50 border border-yellow-200';
            case 'error': return 'bg-red-50 border border-red-200';
            default: return 'bg-gray-50 border border-gray-200';
        }
    }

    /**
     * Get health dot CSS class
     */
    getHealthDotClass(status) {
        switch (status) {
            case 'good': return 'bg-green-500';
            case 'warning': return 'bg-yellow-500';
            case 'error': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    }

    /**
     * Format bytes to human readable string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Destroy the settings panel
     */
    destroy() {
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
        }

        this.hide();
        this.element = null;
    }
}

export { SettingsPanel };