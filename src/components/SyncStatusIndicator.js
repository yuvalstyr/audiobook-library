/**
 * SyncStatusIndicator - UI component for displaying sync status
 * Shows current sync state, last sync time, and provides manual sync controls
 */
export class SyncStatusIndicator {
    constructor(syncManager) {
        this.syncManager = syncManager;
        this.container = null;
        this.isVisible = false;
        this.currentStatus = 'unknown';

        // Bind event handlers
        this.handleSyncEvent = this.handleSyncEvent.bind(this);
        this.handleNetworkChange = this.handleNetworkChange.bind(this);

        // Set up sync manager event listeners
        this.setupSyncListeners();
    }

    /**
     * Create and show the sync status indicator
     * @param {HTMLElement} parentElement - Parent element to append indicator to
     */
    show(parentElement) {
        if (this.isVisible) {
            return;
        }

        this.createIndicator();
        parentElement.appendChild(this.container);
        this.isVisible = true;

        // Update initial status
        this.updateStatus();
    }

    /**
     * Hide the sync status indicator
     */
    hide() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.isVisible = false;
    }

    /**
     * Create the indicator DOM structure
     * @private
     */
    createIndicator() {
        this.container = document.createElement('div');
        this.container.className = 'sync-status-indicator fixed bottom-4 right-4 z-40';

        this.container.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <div class="sync-icon">
                            ${this.getStatusIcon('unknown')}
                        </div>
                        <div class="sync-text">
                            <div class="text-sm font-medium text-gray-900 status-text">Checking sync...</div>
                            <div class="text-xs text-gray-500 last-sync-text">Never synced</div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-1">
                        <button type="button" class="sync-btn p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded" title="Manual sync">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                        </button>
                        <button type="button" class="close-btn p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded" title="Hide">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Progress bar for sync operations -->
                <div class="sync-progress mt-2 hidden">
                    <div class="w-full bg-gray-200 rounded-full h-1">
                        <div class="bg-blue-600 h-1 rounded-full transition-all duration-300 progress-bar" style="width: 0%"></div>
                    </div>
                </div>
                
                <!-- Network status and offline queue indicator -->
                <div class="network-status mt-2 hidden">
                    <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center space-x-1">
                            <div class="w-2 h-2 rounded-full network-dot"></div>
                            <span class="network-text">Offline</span>
                        </div>
                        <div class="queue-info hidden">
                            <span class="queue-count text-gray-500">0 queued</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    /**
     * Set up event listeners for the indicator
     * @private
     */
    setupEventListeners() {
        // Manual sync button
        const syncBtn = this.container.querySelector('.sync-btn');
        syncBtn.addEventListener('click', async () => {
            try {
                await this.syncManager.sync();
            } catch (error) {
                console.error('Manual sync failed:', error);
                this.showError(error.message);
            }
        });

        // Close button
        const closeBtn = this.container.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            this.hide();
        });

        // Click to expand/collapse (future enhancement)
        this.container.addEventListener('click', (event) => {
            if (!event.target.closest('button')) {
                // Could implement expanded view here
            }
        });
    }

    /**
     * Set up sync manager event listeners
     * @private
     */
    setupSyncListeners() {
        this.syncManager.on('syncStarted', this.handleSyncEvent);
        this.syncManager.on('syncCompleted', this.handleSyncEvent);
        this.syncManager.on('syncError', this.handleSyncEvent);
        this.syncManager.on('conflictDetected', this.handleSyncEvent);
        this.syncManager.on('networkStatusChanged', this.handleNetworkChange);
        this.syncManager.on('autoSyncStarted', this.handleSyncEvent);
        this.syncManager.on('autoSyncStopped', this.handleSyncEvent);
        this.syncManager.on('operationQueued', this.handleSyncEvent);
        this.syncManager.on('offlineQueueProcessed', this.handleSyncEvent);
        this.syncManager.on('offlineQueueError', this.handleSyncEvent);
    }

    /**
     * Handle sync-related events
     * @private
     * @param {*} data - Event data
     */
    handleSyncEvent(data) {
        this.updateStatus();
    }

    /**
     * Handle network status changes
     * @private
     * @param {Object} data - Network status data
     */
    handleNetworkChange(data) {
        this.updateNetworkStatus(data.online);
    }

    /**
     * Update the sync status display
     * @private
     */
    async updateStatus() {
        if (!this.isVisible) {
            return;
        }

        try {
            const status = await this.syncManager.getSyncStatus();
            this.currentStatus = status.syncStatus;

            const statusText = this.container.querySelector('.status-text');
            const lastSyncText = this.container.querySelector('.last-sync-text');
            const syncIcon = this.container.querySelector('.sync-icon');

            // Update status text and icon
            const { text, icon } = this.getStatusDisplay(status);
            statusText.textContent = text;
            syncIcon.innerHTML = icon;

            // Update last sync time
            if (status.lastSyncTime) {
                lastSyncText.textContent = `Last sync: ${this.formatRelativeTime(status.lastSyncTime)}`;
            } else {
                lastSyncText.textContent = 'Never synced';
            }

            // Update network status and queue info
            this.updateNetworkStatus(status.isOnline, status.offlineQueue);

            // Show/hide progress bar
            const progressContainer = this.container.querySelector('.sync-progress');
            if (status.isSyncing) {
                progressContainer.classList.remove('hidden');
                this.animateProgress();
            } else {
                progressContainer.classList.add('hidden');
            }

            // Update sync button state
            const syncBtn = this.container.querySelector('.sync-btn');
            syncBtn.disabled = status.isSyncing || !status.isOnline || !status.hasGistId;

        } catch (error) {
            console.error('Failed to update sync status:', error);
        }
    }

    /**
     * Get status display text and icon
     * @private
     * @param {Object} status - Sync status object
     * @returns {Object} Display text and icon
     */
    getStatusDisplay(status) {
        if (!status.hasGistId) {
            return {
                text: 'No sync configured',
                icon: this.getStatusIcon('not-configured')
            };
        }

        if (!status.isOnline) {
            const queueSize = status.offlineQueue?.size || 0;
            const queueText = queueSize > 0 ? ` (${queueSize} queued)` : '';
            return {
                text: `Offline${queueText}`,
                icon: this.getStatusIcon('offline')
            };
        }

        if (status.isSyncing) {
            return {
                text: 'Syncing...',
                icon: this.getStatusIcon('syncing')
            };
        }

        switch (status.syncStatus) {
            case 'synced':
                return {
                    text: 'Up to date',
                    icon: this.getStatusIcon('synced')
                };
            case 'pending':
                return {
                    text: 'Changes pending',
                    icon: this.getStatusIcon('pending')
                };
            case 'error':
                return {
                    text: 'Sync error',
                    icon: this.getStatusIcon('error')
                };
            case 'never':
                return {
                    text: 'Not synced',
                    icon: this.getStatusIcon('never')
                };
            default:
                return {
                    text: 'Unknown status',
                    icon: this.getStatusIcon('unknown')
                };
        }
    }

    /**
     * Get status icon SVG
     * @private
     * @param {string} status - Status type
     * @returns {string} SVG HTML
     */
    getStatusIcon(status) {
        const iconClass = 'w-4 h-4';

        switch (status) {
            case 'synced':
                return `<svg class="${iconClass} text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>`;

            case 'syncing':
                return `<svg class="${iconClass} text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>`;

            case 'pending':
                return `<svg class="${iconClass} text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>`;

            case 'error':
                return `<svg class="${iconClass} text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>`;

            case 'offline':
                return `<svg class="${iconClass} text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12m6.364-6.364L12 12"></path>
                </svg>`;

            case 'not-configured':
                return `<svg class="${iconClass} text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>`;

            default:
                return `<svg class="${iconClass} text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>
                </svg>`;
        }
    }

    /**
     * Update network status display
     * @private
     * @param {boolean} isOnline - Whether device is online
     * @param {Object} queueInfo - Offline queue information
     */
    updateNetworkStatus(isOnline, queueInfo = null) {
        if (!this.isVisible) {
            return;
        }

        const networkStatus = this.container.querySelector('.network-status');
        const networkDot = this.container.querySelector('.network-dot');
        const networkText = this.container.querySelector('.network-text');
        const queueInfoEl = this.container.querySelector('.queue-info');
        const queueCount = this.container.querySelector('.queue-count');

        if (isOnline) {
            networkStatus.classList.add('hidden');
        } else {
            networkStatus.classList.remove('hidden');
            networkDot.className = 'w-2 h-2 rounded-full bg-red-500';
            networkText.textContent = 'Offline';

            // Show queue information if available
            if (queueInfo && queueInfo.size > 0) {
                queueInfoEl.classList.remove('hidden');
                queueCount.textContent = `${queueInfo.size} queued`;
            } else {
                queueInfoEl.classList.add('hidden');
            }
        }
    }

    /**
     * Animate progress bar during sync
     * @private
     */
    animateProgress() {
        const progressBar = this.container.querySelector('.progress-bar');
        if (!progressBar) return;

        // Simple indeterminate progress animation
        let progress = 0;
        const animate = () => {
            progress += 2;
            if (progress > 100) progress = 0;
            progressBar.style.width = `${progress}%`;

            if (this.currentStatus === 'syncing') {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    /**
     * Show error message temporarily
     * @private
     * @param {string} message - Error message
     */
    showError(message) {
        const statusText = this.container.querySelector('.status-text');
        const originalText = statusText.textContent;

        statusText.textContent = `Error: ${message}`;
        statusText.className = 'text-sm font-medium text-red-600';

        setTimeout(() => {
            statusText.textContent = originalText;
            statusText.className = 'text-sm font-medium text-gray-900';
        }, 3000);
    }

    /**
     * Format relative time for display
     * @private
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted relative time
     */
    formatRelativeTime(timestamp) {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMinutes = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMinutes / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMinutes < 1) {
                return 'just now';
            } else if (diffMinutes < 60) {
                return `${diffMinutes}m ago`;
            } else if (diffHours < 24) {
                return `${diffHours}h ago`;
            } else if (diffDays < 7) {
                return `${diffDays}d ago`;
            } else {
                return date.toLocaleDateString();
            }
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.hide();

        // Remove sync manager event listeners
        this.syncManager.off('syncStarted', this.handleSyncEvent);
        this.syncManager.off('syncCompleted', this.handleSyncEvent);
        this.syncManager.off('syncError', this.handleSyncEvent);
        this.syncManager.off('conflictDetected', this.handleSyncEvent);
        this.syncManager.off('networkStatusChanged', this.handleNetworkChange);
        this.syncManager.off('autoSyncStarted', this.handleSyncEvent);
        this.syncManager.off('autoSyncStopped', this.handleSyncEvent);
        this.syncManager.off('operationQueued', this.handleSyncEvent);
        this.syncManager.off('offlineQueueProcessed', this.handleSyncEvent);
        this.syncManager.off('offlineQueueError', this.handleSyncEvent);
    }
}

export default SyncStatusIndicator;