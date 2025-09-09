import GitHubGistService from './GitHubGistService.js';
import { LocalCacheService } from './LocalCacheService.js';
import GistManager from './GistManager.js';
import { OfflineQueueService } from './OfflineQueueService.js';
import { NetworkErrorHandler } from './NetworkErrorHandler.js';

/**
 * SyncManager - Orchestrates data synchronization between local cache and GitHub Gist
 * Handles conflict detection, resolution, and automatic sync scheduling
 */
export class SyncManager {
    constructor() {
        this.gistService = new GitHubGistService();
        this.localCache = new LocalCacheService();
        this.gistManager = new GistManager();
        this.offlineQueue = new OfflineQueueService();
        this.networkErrorHandler = new NetworkErrorHandler();

        // Sync configuration
        this.syncInterval = 30000; // 30 seconds default
        this.maxSyncRetries = 3;
        this.syncTimeoutMs = 10000; // 10 seconds

        // State management
        this.isInitialized = false;
        this.isSyncing = false;
        this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        this.autoSyncTimer = null;
        this.offlineProcessingTimer = null;
        this.syncQueue = [];

        // Event listeners for sync status updates
        this.eventListeners = new Map();

        // Bind methods to preserve context
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleOnline = this.handleOnline.bind(this);
        this.handleOffline = this.handleOffline.bind(this);
        this.processOfflineQueue = this.processOfflineQueue.bind(this);
    }

    /**
     * Initialize the sync manager
     * @param {Object} options - Configuration options
     * @param {number} options.syncInterval - Auto sync interval in milliseconds
     * @param {string} options.conflictResolution - Default conflict resolution strategy
     * @returns {Promise<void>}
     */
    async initialize(options = {}) {
        try {
            const { syncInterval = 30000, conflictResolution = 'manual' } = options;

            this.syncInterval = syncInterval;

            // Update sync metadata with configuration
            await this.localCache.updateSyncMetadata({
                conflictResolution,
                syncInterval: this.syncInterval,
                initialized: true
            });

            // Set up event listeners for network and visibility changes
            this.setupEventListeners();

            this.isInitialized = true;
            this.emit('initialized', { syncInterval: this.syncInterval });

        } catch (error) {
            throw new Error(`Failed to initialize sync manager: ${error.message}`);
        }
    }

    /**
     * Perform a full sync cycle (both directions)
     * @param {Object} options - Sync options
     * @param {boolean} options.force - Force sync even if no changes detected
     * @param {boolean} options.skipOfflineCheck - Skip offline check for manual sync
     * @returns {Promise<Object>} Sync result
     */
    async sync(options = {}) {
        if (this.isSyncing) {
            throw new Error('Sync already in progress');
        }

        const { force = false, skipOfflineCheck = false } = options;

        // Check if we're offline and handle accordingly
        if (!skipOfflineCheck && !this.isOnline) {
            const queuedOperation = {
                type: 'sync',
                id: `sync-${Date.now()}`,
                data: { force },
                timestamp: new Date().toISOString()
            };

            await this.offlineQueue.enqueue(queuedOperation);

            return {
                queued: true,
                message: 'Sync queued for when connection is restored',
                timestamp: new Date().toISOString()
            };
        }

        try {
            this.isSyncing = true;
            this.emit('syncStarted');

            const gistId = this.gistManager.getGistId();
            if (!gistId) {
                throw new Error('No gist ID configured. Please set up a gist first.');
            }

            // Execute sync with retry logic
            const syncResult = await this.networkErrorHandler.executeWithRetry(
                async () => {
                    // Check if gist exists
                    const gistExists = await this.gistService.gistExists(gistId);
                    if (!gistExists) {
                        throw new Error('Configured gist not found or not accessible');
                    }

                    // Get local and remote data
                    const [localData, remoteData] = await Promise.all([
                        this.localCache.loadData(),
                        this.gistService.readGist(gistId)
                    ]);

                    // Detect conflicts
                    const conflict = this.detectConflict(localData, remoteData);

                    if (conflict && !force) {
                        return await this.handleConflict(localData, remoteData, conflict);
                    } else {
                        // No conflict or forced sync - determine sync direction
                        return await this.performSync(localData, remoteData, force);
                    }
                },
                {
                    operationId: `sync-${gistId}`,
                    operationType: 'sync',
                    maxRetries: this.maxSyncRetries
                }
            );

            // Update sync metadata
            await this.localCache.setLastSyncTime(new Date().toISOString());
            await this.localCache.updateSyncMetadata({
                syncStatus: 'synced',
                lastSyncResult: syncResult
            });

            this.emit('syncCompleted', syncResult);
            return syncResult;

        } catch (error) {
            // Handle different types of errors
            const enhancedError = this.networkErrorHandler.formatErrorForUser(error);

            await this.localCache.updateSyncMetadata({
                syncStatus: 'error',
                lastSyncError: enhancedError.message,
                lastSyncErrorDetails: enhancedError
            });

            this.emit('syncError', enhancedError);
            throw error;

        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync local changes to cloud (push)
     * @returns {Promise<Object>} Sync result
     */
    async syncToCloud() {
        // Check if we're offline
        if (!this.isOnline) {
            const queuedOperation = {
                type: 'push',
                id: `push-${Date.now()}`,
                data: {},
                timestamp: new Date().toISOString()
            };

            await this.offlineQueue.enqueue(queuedOperation);

            return {
                queued: true,
                direction: 'push',
                message: 'Push queued for when connection is restored',
                timestamp: new Date().toISOString()
            };
        }

        return await this.networkErrorHandler.executeWithRetry(
            async () => {
                const gistId = this.gistManager.getGistId();
                if (!gistId) {
                    throw new Error('No gist ID configured');
                }

                const localData = await this.localCache.loadData();
                if (!localData) {
                    throw new Error('No local data to sync');
                }

                // Update gist with local data
                await this.gistService.updateGist(gistId, localData);

                // Update local metadata to reflect successful sync
                await this.localCache.updateSyncMetadata({
                    syncStatus: 'synced',
                    lastPushTime: new Date().toISOString()
                });

                return {
                    direction: 'push',
                    success: true,
                    timestamp: new Date().toISOString(),
                    audiobookCount: localData.audiobooks.length
                };
            },
            {
                operationId: `push-${this.gistManager.getGistId()}`,
                operationType: 'push to cloud'
            }
        );
    }

    /**
     * Sync cloud changes to local (pull)
     * @returns {Promise<Object>} Sync result
     */
    async syncFromCloud() {
        // Check if we're offline
        if (!this.isOnline) {
            throw new Error('Cannot pull from cloud while offline. Please check your internet connection.');
        }

        return await this.networkErrorHandler.executeWithRetry(
            async () => {
                const gistId = this.gistManager.getGistId();
                if (!gistId) {
                    throw new Error('No gist ID configured');
                }

                // Get remote data
                const remoteData = await this.gistService.readGist(gistId);

                // Save to local cache
                await this.localCache.saveData(remoteData, { updateTimestamp: false });

                // Update sync metadata
                await this.localCache.updateSyncMetadata({
                    syncStatus: 'synced',
                    lastPullTime: new Date().toISOString()
                });

                return {
                    direction: 'pull',
                    success: true,
                    timestamp: new Date().toISOString(),
                    audiobookCount: remoteData.audiobooks.length
                };
            },
            {
                operationId: `pull-${this.gistManager.getGistId()}`,
                operationType: 'pull from cloud'
            }
        );
    }

    /**
     * Detect conflicts between local and remote data
     * @param {Object} localData - Local data
     * @param {Object} remoteData - Remote data
     * @returns {Object|null} Conflict information or null if no conflict
     */
    detectConflict(localData, remoteData) {
        if (!localData || !remoteData) {
            return null;
        }

        const localTimestamp = new Date(localData.metadata.lastModified);
        const remoteTimestamp = new Date(remoteData.metadata.lastModified);
        const localDeviceId = localData.metadata.deviceId;
        const remoteDeviceId = remoteData.metadata.deviceId;

        // No conflict if same device
        if (localDeviceId === remoteDeviceId) {
            return null;
        }

        // No conflict if timestamps are significantly different (>1 minute)
        const timeDiff = Math.abs(localTimestamp.getTime() - remoteTimestamp.getTime());
        if (timeDiff > 60000) { // 1 minute
            return null;
        }

        // Check for actual data differences
        const localBooks = this.normalizeAudiobooksForComparison(localData.audiobooks);
        const remoteBooks = this.normalizeAudiobooksForComparison(remoteData.audiobooks);

        if (JSON.stringify(localBooks) === JSON.stringify(remoteBooks)) {
            return null; // Same data, no conflict
        }

        return {
            type: 'concurrent_modification',
            localTimestamp: localTimestamp.toISOString(),
            remoteTimestamp: remoteTimestamp.toISOString(),
            localDeviceId,
            remoteDeviceId,
            localCount: localData.audiobooks.length,
            remoteCount: remoteData.audiobooks.length
        };
    }

    /**
     * Handle sync conflicts based on resolution strategy
     * @param {Object} localData - Local data
     * @param {Object} remoteData - Remote data
     * @param {Object} conflict - Conflict information
     * @returns {Promise<Object>} Resolution result
     */
    async handleConflict(localData, remoteData, conflict) {
        const metadata = await this.localCache.getSyncMetadata();
        const strategy = metadata.conflictResolution || 'manual';

        switch (strategy) {
            case 'auto-local':
                return await this.resolveConflict('keep-local', localData, remoteData);

            case 'auto-remote':
                return await this.resolveConflict('keep-remote', localData, remoteData);

            case 'manual':
            default:
                // Emit conflict event for UI to handle
                this.emit('conflictDetected', {
                    conflict,
                    localData,
                    remoteData,
                    resolutionOptions: ['keep-local', 'keep-remote', 'merge']
                });

                // Return conflict info for manual resolution
                return {
                    conflict: true,
                    conflictInfo: conflict,
                    requiresManualResolution: true
                };
        }
    }

    /**
     * Resolve a conflict with the specified strategy
     * @param {string} resolution - Resolution strategy ('keep-local', 'keep-remote', 'merge')
     * @param {Object} localData - Local data
     * @param {Object} remoteData - Remote data
     * @returns {Promise<Object>} Resolution result
     */
    async resolveConflict(resolution, localData, remoteData) {
        try {
            let resolvedData;

            switch (resolution) {
                case 'keep-local':
                    resolvedData = localData;
                    await this.gistService.updateGist(this.gistManager.getGistId(), localData);
                    break;

                case 'keep-remote':
                    resolvedData = remoteData;
                    await this.localCache.saveData(remoteData, { updateTimestamp: false });
                    break;

                case 'merge':
                    resolvedData = this.mergeData(localData, remoteData);
                    await this.localCache.saveData(resolvedData);
                    await this.gistService.updateGist(this.gistManager.getGistId(), resolvedData);
                    break;

                default:
                    throw new Error(`Unknown conflict resolution strategy: ${resolution}`);
            }

            return {
                conflict: true,
                resolved: true,
                resolution,
                timestamp: new Date().toISOString(),
                audiobookCount: resolvedData.audiobooks.length
            };

        } catch (error) {
            throw new Error(`Failed to resolve conflict: ${error.message}`);
        }
    }

    /**
     * Merge local and remote data intelligently
     * @param {Object} localData - Local data
     * @param {Object} remoteData - Remote data
     * @returns {Object} Merged data
     */
    mergeData(localData, remoteData) {
        const localBooks = new Map(localData.audiobooks.map(book => [book.id, book]));
        const remoteBooks = new Map(remoteData.audiobooks.map(book => [book.id, book]));

        const mergedBooks = [];
        const allIds = new Set([...localBooks.keys(), ...remoteBooks.keys()]);

        for (const id of allIds) {
            const localBook = localBooks.get(id);
            const remoteBook = remoteBooks.get(id);

            if (localBook && remoteBook) {
                // Both exist - use the one with later modification time
                const localModified = new Date(localBook.lastModified || localBook.dateAdded);
                const remoteModified = new Date(remoteBook.lastModified || remoteBook.dateAdded);

                mergedBooks.push(localModified >= remoteModified ? localBook : remoteBook);
            } else {
                // Only one exists - include it
                mergedBooks.push(localBook || remoteBook);
            }
        }

        return {
            metadata: {
                version: '1.0',
                lastModified: new Date().toISOString(),
                deviceId: this.localCache.getDeviceId(),
                appVersion: '1.0.0',
                syncStatus: 'synced'
            },
            audiobooks: mergedBooks
        };
    }

    /**
     * Perform sync based on data comparison
     * @param {Object} localData - Local data
     * @param {Object} remoteData - Remote data
     * @param {boolean} force - Force sync regardless of timestamps
     * @returns {Promise<Object>} Sync result
     */
    async performSync(localData, remoteData, force = false) {
        if (!localData && !remoteData) {
            return { direction: 'none', success: true, message: 'No data to sync' };
        }

        if (!localData) {
            return await this.syncFromCloud();
        }

        if (!remoteData) {
            return await this.syncToCloud();
        }

        if (force) {
            // Force push local data
            return await this.syncToCloud();
        }

        // Compare timestamps to determine sync direction
        const localTimestamp = new Date(localData.metadata.lastModified);
        const remoteTimestamp = new Date(remoteData.metadata.lastModified);

        if (localTimestamp > remoteTimestamp) {
            return await this.syncToCloud();
        } else if (remoteTimestamp > localTimestamp) {
            return await this.syncFromCloud();
        } else {
            // Same timestamp - no sync needed
            return {
                direction: 'none',
                success: true,
                message: 'Data already in sync',
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Start automatic sync scheduling
     * @param {number} interval - Sync interval in milliseconds (optional)
     */
    startAutoSync(interval = null) {
        if (this.autoSyncTimer) {
            this.stopAutoSync();
        }

        const syncInterval = interval || this.syncInterval;

        this.autoSyncTimer = setInterval(async () => {
            try {
                if (!this.isSyncing && this.isOnline) {
                    await this.sync();
                }
            } catch (error) {
                console.warn('Auto sync failed:', error.message);
                this.emit('autoSyncError', error);
            }
        }, syncInterval);

        // Also start offline queue processing
        this.startOfflineQueueProcessing();

        this.emit('autoSyncStarted', { interval: syncInterval });
    }

    /**
     * Stop automatic sync scheduling
     */
    stopAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
            this.emit('autoSyncStopped');
        }

        this.stopOfflineQueueProcessing();
    }

    /**
     * Start offline queue processing
     * @private
     */
    startOfflineQueueProcessing() {
        if (this.offlineProcessingTimer) {
            return;
        }

        // Process offline queue every 10 seconds when online
        this.offlineProcessingTimer = setInterval(async () => {
            if (this.isOnline && !this.isSyncing) {
                await this.processOfflineQueue();
            }
        }, 10000);
    }

    /**
     * Stop offline queue processing
     * @private
     */
    stopOfflineQueueProcessing() {
        if (this.offlineProcessingTimer) {
            clearInterval(this.offlineProcessingTimer);
            this.offlineProcessingTimer = null;
        }
    }

    /**
     * Process queued offline operations
     * @returns {Promise<Object>} Processing results
     */
    async processOfflineQueue() {
        try {
            const results = await this.offlineQueue.processQueue(async (operation) => {
                switch (operation.type) {
                    case 'sync':
                        await this.sync({
                            force: operation.data.force,
                            skipOfflineCheck: true
                        });
                        break;

                    case 'push':
                        await this.syncToCloud();
                        break;

                    case 'pull':
                        await this.syncFromCloud();
                        break;

                    case 'add':
                    case 'update':
                    case 'delete':
                        // These operations should trigger a sync
                        await this.sync({ skipOfflineCheck: true });
                        break;

                    default:
                        console.warn(`Unknown operation type in queue: ${operation.type}`);
                }
            });

            if (results.processed > 0) {
                this.emit('offlineQueueProcessed', results);
            }

            return results;

        } catch (error) {
            console.error('Failed to process offline queue:', error);
            this.emit('offlineQueueError', error);
            return {
                processed: 0,
                succeeded: 0,
                failed: 1,
                errors: [{ error: error.message }]
            };
        }
    }

    /**
     * Queue an operation for offline processing
     * @param {string} operationType - Type of operation
     * @param {Object} operationData - Operation data
     * @returns {Promise<void>}
     */
    async queueOperation(operationType, operationData = {}) {
        const operation = {
            type: operationType,
            id: `${operationType}-${Date.now()}-${Math.random()}`,
            data: operationData,
            timestamp: new Date().toISOString()
        };

        await this.offlineQueue.enqueue(operation);
        this.emit('operationQueued', { operation, queueSize: await this.offlineQueue.size() });
    }

    /**
     * Get offline queue status
     * @returns {Promise<Object>} Queue status
     */
    async getOfflineQueueStatus() {
        const [stats, size, isEmpty] = await Promise.all([
            this.offlineQueue.getStats(),
            this.offlineQueue.size(),
            this.offlineQueue.isEmpty()
        ]);

        return {
            size,
            isEmpty,
            stats,
            isProcessing: this.offlineProcessingTimer !== null
        };
    }

    /**
     * Clear the offline queue
     * @returns {Promise<void>}
     */
    async clearOfflineQueue() {
        await this.offlineQueue.clear();
        this.emit('offlineQueueCleared');
    }

    /**
     * Get current sync status
     * @returns {Promise<Object>} Sync status information
     */
    async getSyncStatus() {
        const metadata = await this.localCache.getSyncMetadata();
        const cacheStats = await this.localCache.getCacheStats();
        const queueStatus = await this.getOfflineQueueStatus();

        return {
            isInitialized: this.isInitialized,
            isSyncing: this.isSyncing,
            isAutoSyncEnabled: this.autoSyncTimer !== null,
            syncInterval: this.syncInterval,
            lastSyncTime: metadata.lastSyncTime,
            syncStatus: metadata.syncStatus,
            conflictResolution: metadata.conflictResolution,
            deviceId: cacheStats.deviceId,
            hasGistId: !!this.gistManager.getGistId(),
            isOnline: this.isOnline,
            cacheStats,
            offlineQueue: queueStatus,
            lastSyncError: metadata.lastSyncErrorDetails || null,
            networkRetryStats: this.networkErrorHandler.getRetryStats()
        };
    }

    // Event handling methods

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data = null) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // Private helper methods

    /**
     * Set up event listeners for network and visibility changes
     * @private
     */
    setupEventListeners() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleOnline);
            window.addEventListener('offline', this.handleOffline);
        }

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
        }
    }

    /**
     * Handle online event
     * @private
     */
    handleOnline() {
        this.isOnline = true;
        this.emit('networkStatusChanged', { online: true });

        // Process offline queue when coming back online
        if (this.isInitialized && !this.isSyncing) {
            setTimeout(async () => {
                try {
                    // First process any queued operations
                    await this.processOfflineQueue();

                    // Then attempt a regular sync
                    await this.sync();
                } catch (error) {
                    console.warn('Sync after coming online failed:', error.message);
                }
            }, 2000); // Wait 2 seconds to ensure connection is stable
        }
    }

    /**
     * Handle offline event
     * @private
     */
    handleOffline() {
        this.isOnline = false;
        this.emit('networkStatusChanged', { online: false });

        // Update sync status to indicate offline mode
        this.localCache.updateSyncMetadata({
            syncStatus: 'offline'
        }).catch(error => {
            console.error('Failed to update sync status for offline mode:', error);
        });
    }

    /**
     * Handle visibility change (tab focus/blur)
     * @private
     */
    handleVisibilityChange() {
        if (typeof document !== 'undefined' && typeof navigator !== 'undefined' &&
            !document.hidden && this.isInitialized && !this.isSyncing && navigator.onLine) {
            // Sync when tab becomes visible
            setTimeout(() => {
                this.sync().catch(error => {
                    console.warn('Sync after visibility change failed:', error.message);
                });
            }, 2000);
        }
    }

    /**
     * Normalize audiobooks for comparison
     * @private
     * @param {Array} audiobooks - Audiobooks array
     * @returns {Array} Normalized audiobooks
     */
    normalizeAudiobooksForComparison(audiobooks) {
        return audiobooks
            .map(book => ({
                id: book.id,
                title: book.title,
                author: book.author,
                // Include key fields for comparison, exclude timestamps
                rating: book.rating,
                genres: book.genres,
                moods: book.moods
            }))
            .sort((a, b) => a.id.localeCompare(b.id));
    }

    /**
     * Get current sync status
     * @returns {string} Current sync status
     */
    getStatus() {
        return this.status;
    }

    /**
     * Get last sync time
     * @returns {number|null} Last sync timestamp
     */
    getLastSyncTime() {
        return this.lastSyncTime;
    }

    /**
     * Get current sync settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return {
            syncInterval: this.syncInterval,
            conflictResolution: this.conflictResolution
        };
    }

    /**
     * Update sync settings
     * @param {Object} settings - New settings
     * @returns {Promise<void>}
     */
    async updateSettings(settings) {
        if (settings.syncInterval !== undefined) {
            this.syncInterval = settings.syncInterval;
            // Restart auto sync with new interval
            if (this.autoSyncTimer) {
                this.startAutoSync(this.syncInterval);
            }
        }

        if (settings.conflictResolution !== undefined) {
            this.conflictResolution = settings.conflictResolution;
        }

        // Save settings to localStorage
        localStorage.setItem('audiobook-sync-settings', JSON.stringify(this.getSettings()));
    }

    /**
     * Force sync now
     * @returns {Promise<void>}
     */
    async syncNow() {
        await this.syncToCloud();
        await this.syncFromCloud();
    }

    /**
     * Clear local cache
     * @returns {Promise<void>}
     */
    async clearLocalCache() {
        this.localCache.clearData();
        this.lastSyncTime = null;
    }

    /**
     * Reinitialize sync system
     * @returns {Promise<void>}
     */
    async reinitialize() {
        this.stopAutoSync();
        await this.initialize();
    }

    /**
     * Stop sync system
     * @returns {Promise<void>}
     */
    async stop() {
        this.stopAutoSync();
        this.status = 'stopped';
        this.emit('statusChanged', this.status);
    }

    /**
     * Reset sync system
     * @returns {Promise<void>}
     */
    async reset() {
        this.stopAutoSync();
        this.clearLocalCache();
        this.status = 'reset';
        this.lastSyncTime = null;
        this.emit('statusChanged', this.status);
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopAutoSync();

        // Remove event listeners
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnline);
            window.removeEventListener('offline', this.handleOffline);
        }

        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        }

        // Clear retry tracking
        this.networkErrorHandler.clearRetryTracking();

        // Clear event listeners
        this.eventListeners.clear();

        this.isInitialized = false;
    }
}