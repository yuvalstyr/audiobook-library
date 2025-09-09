import { Audiobook } from '../models/Audiobook.js';
import { SyncManager } from './SyncManager.js';
import { LocalCacheService } from './LocalCacheService.js';

export class DataService {
    constructor() {
        // Use import.meta.env.BASE_URL for proper base path handling in production
        const basePath = import.meta.env.BASE_URL || '/';
        this.baseUrl = `${basePath}data/`;
        this.defaultDataFile = 'audiobooks.json';

        // Initialize sync system
        this.syncManager = new SyncManager();
        this.localCache = new LocalCacheService();
        this.isInitialized = false;

        // Event listeners for sync status
        this.eventListeners = new Map();
    }

    /**
     * Initialize the sync-aware data service
     * @param {Object} options - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(options = {}) {
        if (this.isInitialized) {
            return;
        }

        try {
            await this.syncManager.initialize(options);
            this.isInitialized = true;
            this.emit('initialized');
        } catch (error) {
            console.error('Failed to initialize DataService:', error);
            throw error;
        }
    }

    /**
     * Load audiobook collection with sync awareness
     * Tries to load from cache first, then syncs with cloud if available
     * @param {string} filename - Optional filename for fallback to static data
     * @returns {Promise<Object>} Collection data with audiobooks array and metadata
     */
    async loadCollection(filename = this.defaultDataFile) {
        try {
            // Initialize if not already done
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Try to load from local cache first
            let collection = await this.loadFromCache();

            // If no cached data, try to sync from cloud
            if (!collection) {
                try {
                    await this.syncManager.syncFromCloud();
                    collection = await this.loadFromCache();
                } catch (syncError) {
                    console.warn('Cloud sync failed, falling back to static data:', syncError.message);
                    // Fall back to static data file
                    collection = await this.loadFromStaticFile(filename);

                    // Save static data to cache for future use
                    if (collection) {
                        await this.saveToCache(collection);
                    }
                }
            }

            // If still no data, load from static file
            if (!collection) {
                collection = await this.loadFromStaticFile(filename);
            }

            // Trigger background sync if we have a collection
            if (collection) {
                this.triggerBackgroundSync();
            }

            return collection;

        } catch (error) {
            console.error('Failed to load collection:', error);
            throw error;
        }
    }

    /**
     * Load collection from static JSON file (fallback)
     * @param {string} filename - Filename to load
     * @returns {Promise<Object>} Collection data
     * @private
     */
    async loadFromStaticFile(filename = this.defaultDataFile) {
        try {
            const response = await fetch(`${this.baseUrl}${filename}`);

            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Validate collection structure
            if (!this.isValidCollection(data)) {
                throw new Error('Invalid collection format: missing required fields');
            }

            // Transform audiobook data into Audiobook instances
            const audiobooks = data.audiobooks.map(bookData => {
                try {
                    const audiobook = Audiobook.fromJSON(bookData);
                    const validation = audiobook.validate();
                    if (!validation.isValid) {
                        console.warn(`Skipping invalid audiobook data:`, bookData, validation.errors);
                        return null;
                    }
                    return audiobook;
                } catch (error) {
                    console.warn(`Skipping invalid audiobook data:`, bookData, error);
                    return null;
                }
            }).filter(book => book !== null);

            return {
                version: data.version,
                lastUpdated: data.lastUpdated,
                audiobooks,
                customGenres: data.customGenres || [],
                customMoods: data.customMoods || []
            };

        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error('Network error: Unable to connect to data source');
            }

            if (error instanceof SyntaxError) {
                throw new Error('Data format error: Invalid JSON structure');
            }

            throw error;
        }
    }

    /**
     * Load multiple collection files and merge them
     * @param {string[]} filenames - Array of filenames to load
     * @returns {Promise<Object>} Merged collection data
     */
    async loadMultipleCollections(filenames) {
        try {
            const collections = await Promise.allSettled(
                filenames.map(filename => this.loadCollection(filename))
            );

            const successfulCollections = collections
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);

            if (successfulCollections.length === 0) {
                throw new Error('Failed to load any collections');
            }

            // Merge collections
            return this.mergeCollections(successfulCollections);

        } catch (error) {
            throw new Error(`Failed to load multiple collections: ${error.message}`);
        }
    }

    /**
     * Validate collection data structure
     * @param {Object} data - Collection data to validate
     * @returns {boolean} True if valid collection format
     */
    isValidCollection(data) {
        return !!(
            data &&
            typeof data === 'object' &&
            Array.isArray(data.audiobooks) &&
            typeof data.version === 'string' &&
            typeof data.lastUpdated === 'string'
        );
    }

    /**
     * Merge multiple collections into one
     * @param {Object[]} collections - Array of collection objects
     * @returns {Object} Merged collection
     */
    mergeCollections(collections) {
        if (collections.length === 0) {
            return this.createEmptyCollection();
        }

        if (collections.length === 1) {
            return collections[0];
        }

        const merged = {
            version: collections[0].version,
            lastUpdated: new Date().toISOString(),
            audiobooks: [],
            customGenres: new Set(),
            customMoods: new Set()
        };

        // Merge audiobooks (remove duplicates by ID)
        const seenIds = new Set();
        collections.forEach(collection => {
            collection.audiobooks.forEach(book => {
                if (!seenIds.has(book.id)) {
                    seenIds.add(book.id);
                    merged.audiobooks.push(book);
                }
            });

            // Merge custom genres and moods
            collection.customGenres.forEach(genre => merged.customGenres.add(genre));
            collection.customMoods.forEach(mood => merged.customMoods.add(mood));
        });

        // Convert sets back to arrays
        merged.customGenres = Array.from(merged.customGenres);
        merged.customMoods = Array.from(merged.customMoods);

        return merged;
    }

    /**
     * Create empty collection structure
     * @returns {Object} Empty collection
     */
    createEmptyCollection() {
        return {
            version: '1.0',
            lastUpdated: new Date().toISOString(),
            audiobooks: [],
            customGenres: [],
            customMoods: []
        };
    }

    /**
     * Add a new audiobook to the collection with sync
     * @param {Audiobook} audiobook - Audiobook to add
     * @param {Object} collection - Current collection
     * @returns {Promise<Object>} Updated collection
     */
    async addAudiobook(audiobook, collection) {
        try {
            // Add to collection
            const updatedCollection = {
                ...collection,
                audiobooks: [...collection.audiobooks, audiobook],
                lastUpdated: new Date().toISOString()
            };

            // Save to cache and trigger sync
            await this.saveToCache(updatedCollection);
            this.triggerBackgroundSync();

            this.emit('audiobookAdded', { audiobook, collection: updatedCollection });
            return updatedCollection;

        } catch (error) {
            throw new Error(`Failed to add audiobook: ${error.message}`);
        }
    }

    /**
     * Update an existing audiobook in the collection with sync
     * @param {Audiobook} audiobook - Updated audiobook
     * @param {Object} collection - Current collection
     * @returns {Promise<Object>} Updated collection
     */
    async updateAudiobook(audiobook, collection) {
        try {
            const index = collection.audiobooks.findIndex(book => book.id === audiobook.id);
            if (index === -1) {
                throw new Error('Audiobook not found in collection');
            }

            // Update in collection
            const updatedAudiobooks = [...collection.audiobooks];
            updatedAudiobooks[index] = audiobook;

            const updatedCollection = {
                ...collection,
                audiobooks: updatedAudiobooks,
                lastUpdated: new Date().toISOString()
            };

            // Save to cache and trigger sync
            await this.saveToCache(updatedCollection);
            this.triggerBackgroundSync();

            this.emit('audiobookUpdated', { audiobook, collection: updatedCollection });
            return updatedCollection;

        } catch (error) {
            throw new Error(`Failed to update audiobook: ${error.message}`);
        }
    }

    /**
     * Remove an audiobook from the collection with sync
     * @param {string} audiobookId - ID of audiobook to remove
     * @param {Object} collection - Current collection
     * @returns {Promise<Object>} Updated collection
     */
    async removeAudiobook(audiobookId, collection) {
        try {
            const index = collection.audiobooks.findIndex(book => book.id === audiobookId);
            if (index === -1) {
                throw new Error('Audiobook not found in collection');
            }

            const removedAudiobook = collection.audiobooks[index];

            // Remove from collection
            const updatedAudiobooks = collection.audiobooks.filter(book => book.id !== audiobookId);

            const updatedCollection = {
                ...collection,
                audiobooks: updatedAudiobooks,
                lastUpdated: new Date().toISOString()
            };

            // Save to cache and trigger sync
            await this.saveToCache(updatedCollection);
            this.triggerBackgroundSync();

            this.emit('audiobookRemoved', { audiobook: removedAudiobook, collection: updatedCollection });
            return updatedCollection;

        } catch (error) {
            throw new Error(`Failed to remove audiobook: ${error.message}`);
        }
    }

    /**
     * Save collection to local cache
     * @param {Object} collection - Collection to save
     * @returns {Promise<void>}
     * @private
     */
    async saveToCache(collection) {
        try {
            const cacheData = {
                metadata: {
                    version: collection.version || '1.0',
                    lastModified: collection.lastUpdated || new Date().toISOString(),
                    deviceId: this.localCache.getDeviceId(),
                    appVersion: '1.0.0'
                },
                audiobooks: collection.audiobooks
            };

            await this.localCache.saveData(cacheData);
        } catch (error) {
            console.error('Failed to save to cache:', error);
            throw error;
        }
    }

    /**
     * Load collection from local cache
     * @returns {Promise<Object|null>} Cached collection or null
     * @private
     */
    async loadFromCache() {
        try {
            const cacheData = await this.localCache.loadData();
            if (!cacheData) {
                return null;
            }

            return {
                version: cacheData.metadata.version,
                lastUpdated: cacheData.metadata.lastModified,
                audiobooks: cacheData.audiobooks,
                customGenres: [], // TODO: Add custom genres to cache
                customMoods: []   // TODO: Add custom moods to cache
            };

        } catch (error) {
            console.error('Failed to load from cache:', error);
            return null;
        }
    }

    /**
     * Trigger background sync (non-blocking)
     * @private
     */
    triggerBackgroundSync() {
        // Don't await - let it run in background
        setTimeout(async () => {
            try {
                await this.syncManager.sync();
            } catch (error) {
                console.warn('Background sync failed:', error.message);
                this.emit('syncError', error);
            }
        }, 100);
    }

    /**
     * Get sync status
     * @returns {Promise<Object>} Sync status information
     */
    async getSyncStatus() {
        if (!this.isInitialized) {
            return { isInitialized: false };
        }
        return await this.syncManager.getSyncStatus();
    }

    /**
     * Manually trigger sync
     * @returns {Promise<Object>} Sync result
     */
    async manualSync() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return await this.syncManager.sync();
    }

    /**
     * Export collection data as JSON string
     * @param {Object} collection - Collection data to export
     * @returns {string} JSON string representation
     */
    exportCollection(collection) {
        try {
            // Convert Audiobook instances to plain objects
            const exportData = {
                ...collection,
                audiobooks: collection.audiobooks.map(book =>
                    book instanceof Audiobook ? book.toJSON() : book
                )
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            throw new Error(`Failed to export collection: ${error.message}`);
        }
    }

    /**
     * Import collection from JSON string with sync
     * @param {string} jsonString - JSON string to import
     * @param {Object} currentCollection - Current collection for merging
     * @returns {Promise<Object>} Updated collection after import
     */
    async importCollection(jsonString, currentCollection = null) {
        try {
            const data = JSON.parse(jsonString);

            if (!this.isValidCollection(data)) {
                throw new Error('Invalid collection format');
            }

            // Transform to Audiobook instances
            const audiobooks = data.audiobooks.map(bookData => Audiobook.fromJSON(bookData));

            let updatedCollection;
            if (currentCollection) {
                // Merge with existing collection
                updatedCollection = this.mergeCollections([currentCollection, {
                    version: data.version,
                    lastUpdated: data.lastUpdated,
                    audiobooks,
                    customGenres: data.customGenres || [],
                    customMoods: data.customMoods || []
                }]);
            } else {
                updatedCollection = {
                    version: data.version,
                    lastUpdated: new Date().toISOString(),
                    audiobooks,
                    customGenres: data.customGenres || [],
                    customMoods: data.customMoods || []
                };
            }

            // Save to cache and trigger sync
            await this.saveToCache(updatedCollection);
            this.triggerBackgroundSync();

            this.emit('collectionImported', { collection: updatedCollection });
            return updatedCollection;

        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error('Invalid JSON format');
            }
            throw error;
        }
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
     * @private
     */
    emit(event, data = null) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in DataService event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get sync manager instance for direct access
     * @returns {SyncManager} Sync manager instance
     */
    getSyncManager() {
        return this.syncManager;
    }

    /**
     * Reinitialize sync system (e.g., after gist ID change)
     * @returns {Promise<void>}
     */
    async reinitializeSync() {
        try {
            if (this.syncManager) {
                await this.syncManager.reinitialize();
            }
        } catch (error) {
            console.error('Failed to reinitialize sync:', error);
            throw error;
        }
    }

    /**
     * Stop sync system
     * @returns {Promise<void>}
     */
    async stopSync() {
        try {
            if (this.syncManager) {
                await this.syncManager.stop();
            }
        } catch (error) {
            console.error('Failed to stop sync:', error);
            throw error;
        }
    }

    /**
     * Reset sync system and clear sync data
     * @returns {Promise<void>}
     */
    async resetSync() {
        try {
            if (this.syncManager) {
                await this.syncManager.reset();
            }
        } catch (error) {
            console.error('Failed to reset sync:', error);
            throw error;
        }
    }

    /**
     * Get data management service instance
     * @returns {DataManagementService} Data management service instance
     */
    async getDataManagementService() {
        if (!this.dataManagementService && this.syncManager) {
            // Lazy initialization of data management service
            const { DataManagementService } = await import('./DataManagementService.js');
            this.dataManagementService = new DataManagementService(
                this,
                this.syncManager,
                this.localCache,
                this.syncManager.gistService,
                this.syncManager.gistManager
            );
        }
        return this.dataManagementService;
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.syncManager) {
            this.syncManager.destroy();
        }
        this.eventListeners.clear();
        this.isInitialized = false;
    }
}