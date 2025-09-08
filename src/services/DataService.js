import { Audiobook } from '../models/Audiobook.js';

export class DataService {
    constructor() {
        this.baseUrl = '/data/';
        this.defaultDataFile = 'audiobooks.json';
    }

    /**
     * Load audiobook collection from JSON file
     * @param {string} filename - Optional filename, defaults to audiobooks.json
     * @returns {Promise<Object>} Collection data with audiobooks array and metadata
     */
    async loadCollection(filename = this.defaultDataFile) {
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
     * Import collection from JSON string
     * @param {string} jsonString - JSON string to import
     * @returns {Object} Parsed and validated collection
     */
    importCollection(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            if (!this.isValidCollection(data)) {
                throw new Error('Invalid collection format');
            }

            // Transform to Audiobook instances
            const audiobooks = data.audiobooks.map(bookData => Audiobook.fromJSON(bookData));

            return {
                version: data.version,
                lastUpdated: data.lastUpdated,
                audiobooks,
                customGenres: data.customGenres || [],
                customMoods: data.customMoods || []
            };

        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error('Invalid JSON format');
            }
            throw error;
        }
    }
}