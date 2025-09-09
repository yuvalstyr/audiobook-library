import { Audiobook } from '../models/Audiobook.js';

/**
 * LocalCacheService - Handles sync-aware local caching for audiobook collections
 * This service is designed to work with the sync system and provides conflict detection
 * capabilities through timestamp tracking and device identification.
 */
export class LocalCacheService {
    constructor() {
        this.storageKey = 'audiobook-library-cache';
        this.metadataKey = 'audiobook-sync-metadata';
        this.deviceIdKey = 'audiobook-device-id';

        // Initialize device ID if not exists
        this.ensureDeviceId();
    }

    /**
     * Save audiobook collection data to local cache
     * @param {Object} data - Collection data to cache
     * @param {Object} options - Additional options
     * @param {boolean} options.updateTimestamp - Whether to update last modified timestamp
     * @returns {Promise<void>}
     */
    async saveData(data, options = {}) {
        try {
            const { updateTimestamp = true } = options;

            // Prepare data for storage
            const cacheData = {
                metadata: {
                    version: data.metadata?.version || '1.0',
                    lastModified: updateTimestamp ? new Date().toISOString() : (data.metadata?.lastModified || new Date().toISOString()),
                    deviceId: this.getDeviceId(),
                    appVersion: data.metadata?.appVersion || '1.0.0',
                    syncStatus: data.metadata?.syncStatus || 'pending'
                },
                audiobooks: this.serializeAudiobooks(data.audiobooks || [])
            };

            // Validate data before saving
            this.validateCacheData(cacheData);

            // Save to localStorage
            const serializedData = JSON.stringify(cacheData);

            // Check storage quota
            if (serializedData.length > 5 * 1024 * 1024) { // 5MB limit
                throw new Error('Cache data exceeds storage quota');
            }

            localStorage.setItem(this.storageKey, serializedData);

            // Update sync metadata
            await this.updateSyncMetadata({
                lastCacheUpdate: new Date().toISOString(),
                cacheSize: serializedData.length,
                audiobookCount: cacheData.audiobooks.length
            });

        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                // Attempt cleanup and retry
                await this.cleanup();
                throw new Error('Storage quota exceeded. Cache has been cleaned up, please try again.');
            }
            throw new Error(`Failed to save cache data: ${error.message}`);
        }
    }

    /**
     * Load audiobook collection data from local cache
     * @returns {Promise<Object|null>} Cached data or null if not found
     */
    async loadData() {
        try {
            const cachedString = localStorage.getItem(this.storageKey);
            if (!cachedString) {
                return null;
            }

            const cachedData = JSON.parse(cachedString);

            // Validate cached data structure
            if (!this.isValidCacheData(cachedData)) {
                console.warn('Invalid cache data structure, clearing cache');
                await this.clearData();
                return null;
            }

            // Deserialize audiobooks
            const audiobooks = this.deserializeAudiobooks(cachedData.audiobooks);

            return {
                metadata: cachedData.metadata,
                audiobooks
            };

        } catch (error) {
            console.error('Failed to load cache data:', error);
            await this.clearData();
            return null;
        }
    }

    /**
     * Clear all cached data
     * @returns {Promise<void>}
     */
    async clearData() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.metadataKey);
            // Keep device ID for future use
        } catch (error) {
            console.error('Failed to clear cache data:', error);
        }
    }

    /**
     * Get the last sync timestamp
     * @returns {Promise<string|null>} ISO timestamp or null
     */
    async getLastSyncTime() {
        try {
            const metadata = await this.getSyncMetadata();
            return metadata.lastSyncTime || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Set the last sync timestamp
     * @param {string} timestamp - ISO timestamp
     * @returns {Promise<void>}
     */
    async setLastSyncTime(timestamp) {
        try {
            await this.updateSyncMetadata({
                lastSyncTime: timestamp
            });
        } catch (error) {
            console.error('Failed to set last sync time:', error);
        }
    }

    /**
     * Get sync metadata
     * @returns {Promise<Object>} Sync metadata object
     */
    async getSyncMetadata() {
        try {
            const metadataString = localStorage.getItem(this.metadataKey);
            if (!metadataString) {
                return this.getDefaultSyncMetadata();
            }

            const metadata = JSON.parse(metadataString);
            return { ...this.getDefaultSyncMetadata(), ...metadata };

        } catch (error) {
            console.error('Failed to load sync metadata:', error);
            return this.getDefaultSyncMetadata();
        }
    }

    /**
     * Update sync metadata
     * @param {Object} updates - Metadata updates to apply
     * @returns {Promise<void>}
     */
    async updateSyncMetadata(updates) {
        try {
            const currentMetadata = await this.getSyncMetadata();
            const updatedMetadata = {
                ...currentMetadata,
                ...updates,
                lastUpdated: new Date().toISOString()
            };

            localStorage.setItem(this.metadataKey, JSON.stringify(updatedMetadata));

        } catch (error) {
            console.error('Failed to update sync metadata:', error);
        }
    }

    /**
     * Get device ID, creating one if it doesn't exist
     * @returns {string} Unique device identifier
     */
    getDeviceId() {
        let deviceId = localStorage.getItem(this.deviceIdKey);
        if (!deviceId) {
            deviceId = this.generateDeviceId();
            localStorage.setItem(this.deviceIdKey, deviceId);
        }
        return deviceId;
    }

    /**
     * Check if cache data exists
     * @returns {Promise<boolean>} True if cache data exists
     */
    async hasData() {
        try {
            return localStorage.getItem(this.storageKey) !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get cache statistics
     * @returns {Promise<Object>} Cache statistics
     */
    async getCacheStats() {
        try {
            const hasData = await this.hasData();
            const metadata = await this.getSyncMetadata();
            const cachedString = localStorage.getItem(this.storageKey);

            return {
                hasData,
                cacheSize: cachedString ? cachedString.length : 0,
                audiobookCount: metadata.audiobookCount || 0,
                lastCacheUpdate: metadata.lastCacheUpdate || null,
                lastSyncTime: metadata.lastSyncTime || null,
                deviceId: this.getDeviceId(),
                syncStatus: metadata.syncStatus || 'unknown'
            };

        } catch (error) {
            return {
                hasData: false,
                cacheSize: 0,
                audiobookCount: 0,
                lastCacheUpdate: null,
                lastSyncTime: null,
                deviceId: this.getDeviceId(),
                syncStatus: 'error',
                error: error.message
            };
        }
    }

    /**
     * Perform cache cleanup and invalidation
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            // For now, just clear old data
            // In the future, could implement more sophisticated cleanup
            const stats = await this.getCacheStats();

            // If cache is very old (7 days), clear it
            if (stats.lastCacheUpdate) {
                const cacheAge = Date.now() - new Date(stats.lastCacheUpdate).getTime();
                const sevenDays = 7 * 24 * 60 * 60 * 1000;

                if (cacheAge > sevenDays) {
                    console.log('Clearing old cache data (>7 days)');
                    await this.clearData();
                }
            }

        } catch (error) {
            console.error('Cache cleanup failed:', error);
        }
    }

    // Private helper methods

    /**
     * Ensure device ID exists
     * @private
     */
    ensureDeviceId() {
        if (!localStorage.getItem(this.deviceIdKey)) {
            const deviceId = this.generateDeviceId();
            localStorage.setItem(this.deviceIdKey, deviceId);
        }
    }

    /**
     * Generate a unique device ID
     * @private
     * @returns {string} Unique device identifier
     */
    generateDeviceId() {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substr(2, 9);
        return `device-${timestamp}-${randomPart}`;
    }

    /**
     * Get default sync metadata
     * @private
     * @returns {Object} Default metadata object
     */
    getDefaultSyncMetadata() {
        return {
            lastSyncTime: null,
            lastCacheUpdate: null,
            syncStatus: 'never',
            conflictResolution: 'manual',
            cacheSize: 0,
            audiobookCount: 0,
            deviceId: this.getDeviceId(),
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Serialize audiobooks for storage
     * @private
     * @param {Array} audiobooks - Array of audiobook objects
     * @returns {Array} Serialized audiobooks
     */
    serializeAudiobooks(audiobooks) {
        return audiobooks.map(book => {
            if (book instanceof Audiobook) {
                return book.toJSON();
            }
            return book;
        });
    }

    /**
     * Deserialize audiobooks from storage
     * @private
     * @param {Array} serializedBooks - Array of serialized audiobook data
     * @returns {Array} Array of Audiobook instances
     */
    deserializeAudiobooks(serializedBooks) {
        return serializedBooks.map(bookData => {
            try {
                return Audiobook.fromJSON(bookData);
            } catch (error) {
                console.warn('Skipping invalid audiobook data:', bookData, error);
                return null;
            }
        }).filter(book => book !== null);
    }

    /**
     * Validate cache data structure
     * @private
     * @param {Object} data - Data to validate
     * @returns {boolean} True if valid
     */
    isValidCacheData(data) {
        return (
            data &&
            typeof data === 'object' &&
            data.metadata &&
            typeof data.metadata === 'object' &&
            typeof data.metadata.version === 'string' &&
            typeof data.metadata.lastModified === 'string' &&
            typeof data.metadata.deviceId === 'string' &&
            Array.isArray(data.audiobooks)
        );
    }

    /**
     * Validate cache data before saving
     * @private
     * @param {Object} data - Data to validate
     * @throws {Error} If data is invalid
     */
    validateCacheData(data) {
        if (!this.isValidCacheData(data)) {
            throw new Error('Invalid cache data structure');
        }

        // Additional validation
        if (!data.metadata.deviceId) {
            throw new Error('Device ID is required in cache metadata');
        }

        if (!Array.isArray(data.audiobooks)) {
            throw new Error('Audiobooks must be an array');
        }

        // Validate each audiobook has required fields
        for (const book of data.audiobooks) {
            if (!book.id || !book.title) {
                throw new Error('Each audiobook must have id and title');
            }
        }
    }

    /**
     * Check if localStorage is available
     * @static
     * @returns {boolean} True if localStorage is supported
     */
    static isStorageAvailable() {
        try {
            const test = '__cache_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}