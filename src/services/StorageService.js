import { Audiobook } from '../models/Audiobook.js';

export class StorageService {
    constructor() {
        this.storageKey = 'audiobook-library';
        this.cacheExpiryKey = 'audiobook-library-expiry';
        this.defaultCacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }

    /**
     * Save collection to localStorage
     * @param {Object} collection - Collection data to save
     * @param {number} expiryMs - Cache expiry time in milliseconds (optional)
     */
    saveCollection(collection, expiryMs = this.defaultCacheExpiry) {
        try {
            // Convert Audiobook instances to plain objects for storage
            const storageData = {
                ...collection,
                audiobooks: collection.audiobooks.map(book =>
                    book instanceof Audiobook ? book.toJSON() : book
                )
            };

            const dataString = JSON.stringify(storageData);

            // Check if data exceeds localStorage quota (rough estimate)
            if (dataString.length > 5 * 1024 * 1024) { // 5MB limit
                throw new Error('Data too large for localStorage');
            }

            localStorage.setItem(this.storageKey, dataString);

            // Set expiry time
            const expiryTime = Date.now() + expiryMs;
            localStorage.setItem(this.cacheExpiryKey, expiryTime.toString());

        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                // Try to clear old data and retry
                this.clearExpiredData();
                try {
                    localStorage.setItem(this.storageKey, JSON.stringify(collection));
                    const expiryTime = Date.now() + expiryMs;
                    localStorage.setItem(this.cacheExpiryKey, expiryTime.toString());
                } catch (retryError) {
                    throw new Error('localStorage quota exceeded and cleanup failed');
                }
            } else {
                throw new Error(`Failed to save to localStorage: ${error.message}`);
            }
        }
    }

    /**
     * Load collection from localStorage
     * @returns {Object|null} Collection data or null if not found/expired
     */
    loadCollection() {
        try {
            // Check if cache has expired
            if (this.isCacheExpired()) {
                this.clearCollection();
                return null;
            }

            const dataString = localStorage.getItem(this.storageKey);
            if (!dataString) {
                return null;
            }

            const data = JSON.parse(dataString);

            // Validate data structure
            if (!this.isValidStoredCollection(data)) {
                console.warn('Invalid stored collection format, clearing cache');
                this.clearCollection();
                return null;
            }

            // Transform audiobook data back to Audiobook instances
            const audiobooks = data.audiobooks.map(bookData => {
                try {
                    return Audiobook.fromJSON(bookData);
                } catch (error) {
                    console.warn('Skipping invalid stored audiobook:', bookData, error);
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
            console.error('Failed to load from localStorage:', error);
            this.clearCollection();
            return null;
        }
    }

    /**
     * Check if cached data has expired
     * @returns {boolean} True if cache has expired
     */
    isCacheExpired() {
        try {
            const expiryString = localStorage.getItem(this.cacheExpiryKey);
            if (!expiryString) {
                return true;
            }

            const expiryTime = parseInt(expiryString, 10);
            return Date.now() > expiryTime;

        } catch (error) {
            return true; // Assume expired if we can't parse expiry
        }
    }

    /**
     * Clear collection from localStorage
     */
    clearCollection() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.cacheExpiryKey);
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
        }
    }

    /**
     * Update a single audiobook in the stored collection
     * @param {Audiobook} audiobook - Audiobook to update
     */
    updateAudiobook(audiobook) {
        try {
            const collection = this.loadCollection();
            if (!collection) {
                throw new Error('No collection found in storage');
            }

            const index = collection.audiobooks.findIndex(book => book.id === audiobook.id);
            if (index === -1) {
                throw new Error('Audiobook not found in collection');
            }

            collection.audiobooks[index] = audiobook;
            collection.lastUpdated = new Date().toISOString();

            this.saveCollection(collection);

        } catch (error) {
            throw new Error(`Failed to update audiobook: ${error.message}`);
        }
    }

    /**
     * Add a new audiobook to the stored collection
     * @param {Audiobook} audiobook - Audiobook to add
     */
    addAudiobook(audiobook) {
        try {
            const collection = this.loadCollection() || {
                version: '1.0',
                lastUpdated: new Date().toISOString(),
                audiobooks: [],
                customGenres: [],
                customMoods: []
            };

            // Check for duplicate ID
            if (collection.audiobooks.some(book => book.id === audiobook.id)) {
                throw new Error('Audiobook with this ID already exists');
            }

            collection.audiobooks.push(audiobook);
            collection.lastUpdated = new Date().toISOString();

            this.saveCollection(collection);

        } catch (error) {
            throw new Error(`Failed to add audiobook: ${error.message}`);
        }
    }

    /**
     * Remove an audiobook from the stored collection
     * @param {string} audiobookId - ID of audiobook to remove
     */
    removeAudiobook(audiobookId) {
        try {
            const collection = this.loadCollection();
            if (!collection) {
                throw new Error('No collection found in storage');
            }

            const initialLength = collection.audiobooks.length;
            collection.audiobooks = collection.audiobooks.filter(book => book.id !== audiobookId);

            if (collection.audiobooks.length === initialLength) {
                throw new Error('Audiobook not found in collection');
            }

            collection.lastUpdated = new Date().toISOString();
            this.saveCollection(collection);

        } catch (error) {
            throw new Error(`Failed to remove audiobook: ${error.message}`);
        }
    }

    /**
     * Get storage usage information
     * @returns {Object} Storage usage stats
     */
    getStorageInfo() {
        try {
            const dataString = localStorage.getItem(this.storageKey);
            const expiryString = localStorage.getItem(this.cacheExpiryKey);

            return {
                hasData: !!dataString,
                dataSize: dataString ? dataString.length : 0,
                isExpired: this.isCacheExpired(),
                expiryTime: expiryString ? new Date(parseInt(expiryString, 10)) : null,
                storageQuotaUsed: this.getStorageQuotaUsage()
            };

        } catch (error) {
            return {
                hasData: false,
                dataSize: 0,
                isExpired: true,
                expiryTime: null,
                storageQuotaUsed: 0,
                error: error.message
            };
        }
    }

    /**
     * Estimate localStorage quota usage
     * @returns {number} Estimated usage percentage (0-100)
     */
    getStorageQuotaUsage() {
        try {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                }
            }

            // Rough estimate: most browsers have 5-10MB limit
            const estimatedQuota = 5 * 1024 * 1024; // 5MB
            return Math.round((totalSize / estimatedQuota) * 100);

        } catch (error) {
            return 0;
        }
    }

    /**
     * Clear expired data from localStorage
     */
    clearExpiredData() {
        try {
            // Clear our own expired data
            if (this.isCacheExpired()) {
                this.clearCollection();
            }

            // Could also clear other expired data if we had a registry
            // For now, just clear our own data

        } catch (error) {
            console.error('Failed to clear expired data:', error);
        }
    }

    /**
     * Validate stored collection data structure
     * @param {Object} data - Data to validate
     * @returns {boolean} True if valid
     */
    isValidStoredCollection(data) {
        return (
            data &&
            typeof data === 'object' &&
            Array.isArray(data.audiobooks) &&
            typeof data.version === 'string' &&
            typeof data.lastUpdated === 'string'
        );
    }

    /**
     * Check if localStorage is available
     * @returns {boolean} True if localStorage is supported and available
     */
    static isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Backup collection to a downloadable file
     * @param {Object} collection - Collection to backup
     * @returns {string} Data URL for download
     */
    createBackup(collection) {
        try {
            const backupData = {
                ...collection,
                audiobooks: collection.audiobooks.map(book =>
                    book instanceof Audiobook ? book.toJSON() : book
                ),
                backupDate: new Date().toISOString(),
                backupVersion: '1.0'
            };

            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            return URL.createObjectURL(blob);

        } catch (error) {
            throw new Error(`Failed to create backup: ${error.message}`);
        }
    }
}