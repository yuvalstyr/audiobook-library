import { Audiobook } from '../models/Audiobook.js';
import { SyncManager } from './SyncManager.js';
import { LocalCacheService } from './LocalCacheService.js';

export class ImportExportService {
    constructor() {
        this.supportedFormats = ['json', 'csv'];
        this.syncManager = new SyncManager();
        this.localCache = new LocalCacheService();
    }

    /**
     * Export collection as JSON file with sync metadata
     * @param {Object} collection - Collection data to export
     * @param {string} filename - Optional filename (defaults to audiobooks-backup-YYYY-MM-DD.json)
     * @param {Object} options - Export options
     * @param {boolean} options.includeSyncMetadata - Include sync metadata for restoration
     * @returns {Promise<Object>} Export result with data and metadata
     */
    async exportJSON(collection, filename = null, options = {}) {
        try {
            const { includeSyncMetadata = true } = options;

            if (!filename) {
                const date = new Date().toISOString().split('T')[0];
                filename = `audiobooks-backup-${date}.json`;
            }

            // Get sync metadata if requested
            let syncMetadata = null;
            if (includeSyncMetadata) {
                try {
                    const [syncStatus, cacheStats] = await Promise.all([
                        this.syncManager.getSyncStatus(),
                        this.localCache.getCacheStats()
                    ]);

                    syncMetadata = {
                        deviceId: cacheStats.deviceId,
                        lastSyncTime: syncStatus.lastSyncTime,
                        syncStatus: syncStatus.syncStatus,
                        conflictResolution: syncStatus.conflictResolution,
                        hasGistId: syncStatus.hasGistId,
                        exportedFromSync: true
                    };
                } catch (error) {
                    console.warn('Could not retrieve sync metadata for export:', error.message);
                }
            }

            // Create export data with backup and sync metadata
            const exportData = {
                ...collection,
                audiobooks: collection.audiobooks.map(book =>
                    book instanceof Audiobook ? book.toJSON() : book
                ),
                exportMetadata: {
                    exportDate: new Date().toISOString(),
                    exportVersion: '2.0', // Updated version for sync-aware exports
                    totalBooks: collection.audiobooks.length,
                    exportType: 'full-backup',
                    syncMetadata
                }
            };

            const jsonString = JSON.stringify(exportData, null, 2);

            // Only download if we're in a browser environment
            if (typeof document !== 'undefined') {
                this.downloadFile(jsonString, filename, 'application/json');
            }

            return {
                success: true,
                filename,
                bookCount: collection.audiobooks.length,
                fileSize: jsonString.length,
                data: jsonString,
                includedSyncMetadata: !!syncMetadata
            };

        } catch (error) {
            throw new Error(`Failed to export JSON: ${error.message}`);
        }
    }

    /**
     * Export collection as CSV file
     * @param {Object} collection - Collection data to export
     * @param {string} filename - Optional filename
     * @returns {Object} Export result with data and metadata
     */
    exportCSV(collection, filename = null) {
        try {
            if (!filename) {
                const date = new Date().toISOString().split('T')[0];
                filename = `audiobooks-export-${date}.csv`;
            }

            const csvContent = this.convertToCSV(collection.audiobooks);

            // Only download if we're in a browser environment
            if (typeof document !== 'undefined') {
                this.downloadFile(csvContent, filename, 'text/csv');
            }

            return {
                success: true,
                filename,
                bookCount: collection.audiobooks.length,
                fileSize: csvContent.length,
                data: csvContent
            };

        } catch (error) {
            throw new Error(`Failed to export CSV: ${error.message}`);
        }
    }

    /**
     * Import collection from JSON file with sync conflict detection
     * @param {File} file - JSON file to import
     * @param {Object} options - Import options
     * @param {boolean} options.checkSyncConflicts - Check for sync conflicts before importing
     * @returns {Promise<Object>} Imported collection data with conflict information
     */
    async importJSON(file, options = {}) {
        try {
            const { checkSyncConflicts = true } = options;

            if (!file || file.type !== 'application/json') {
                throw new Error('Please select a valid JSON file');
            }

            const text = await this.readFileAsText(file);
            const data = JSON.parse(text);

            // Validate collection structure
            if (!this.isValidCollection(data)) {
                throw new Error('Invalid collection format: missing required fields');
            }

            // Check for sync conflicts if enabled
            let syncConflict = null;
            if (checkSyncConflicts) {
                syncConflict = await this.detectImportSyncConflict(data);
            }

            // Transform audiobook data into Audiobook instances
            const audiobooks = [];
            const errors = [];

            for (let i = 0; i < data.audiobooks.length; i++) {
                try {
                    const bookData = data.audiobooks[i];
                    const audiobook = Audiobook.fromJSON(bookData);
                    const validation = audiobook.validate();

                    if (!validation.isValid) {
                        errors.push(`Book ${i + 1}: ${validation.errors.join(', ')}`);
                        continue;
                    }

                    audiobooks.push(audiobook);
                } catch (error) {
                    errors.push(`Book ${i + 1}: ${error.message}`);
                }
            }

            const result = {
                version: data.version || data.exportMetadata?.exportVersion || '1.0',
                lastUpdated: data.lastUpdated || new Date().toISOString(),
                audiobooks,
                customGenres: data.customGenres || [],
                customMoods: data.customMoods || [],
                exportMetadata: data.exportMetadata || null,
                syncConflict,
                importStats: {
                    totalAttempted: data.audiobooks.length,
                    successful: audiobooks.length,
                    failed: data.audiobooks.length - audiobooks.length,
                    errors: errors.slice(0, 10), // Limit error messages
                    hasSyncMetadata: !!(data.exportMetadata?.syncMetadata),
                    exportVersion: data.exportMetadata?.exportVersion || 'unknown'
                }
            };

            return result;

        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error('Invalid JSON format: Please check your file');
            }
            throw error;
        }
    }

    /**
     * Import audiobooks from CSV file
     * @param {File} file - CSV file to import
     * @returns {Promise<Object>} Imported audiobooks and stats
     */
    async importCSV(file) {
        try {
            if (!file || file.type !== 'text/csv') {
                throw new Error('Please select a valid CSV file');
            }

            const text = await this.readFileAsText(file);
            const rows = this.parseCSV(text);

            if (rows.length === 0) {
                throw new Error('CSV file is empty');
            }

            const headers = rows[0].map(h => h.toLowerCase().trim());
            const requiredHeaders = ['title', 'author'];

            // Check for required headers
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
            }

            const audiobooks = [];
            const errors = [];

            // Process data rows (skip header)
            for (let i = 1; i < rows.length; i++) {
                try {
                    const row = rows[i];
                    const bookData = this.mapCSVRowToAudiobook(headers, row);

                    const audiobook = new Audiobook(bookData);
                    const validation = audiobook.validate();

                    if (!validation.isValid) {
                        errors.push(`Row ${i + 1}: ${validation.errors.join(', ')}`);
                        continue;
                    }

                    audiobooks.push(audiobook);
                } catch (error) {
                    errors.push(`Row ${i + 1}: ${error.message}`);
                }
            }

            return {
                audiobooks,
                importStats: {
                    totalAttempted: rows.length - 1,
                    successful: audiobooks.length,
                    failed: (rows.length - 1) - audiobooks.length,
                    errors: errors.slice(0, 10) // Limit error messages
                }
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Merge imported collection with existing collection (sync-aware)
     * @param {Object} existingCollection - Current collection
     * @param {Object} importedCollection - Imported collection
     * @param {string} mergeStrategy - 'replace', 'merge', 'append', or 'sync-aware'
     * @param {Object} options - Merge options
     * @param {boolean} options.triggerSync - Whether to trigger sync after merge
     * @returns {Promise<Object>} Merged collection
     */
    async mergeCollections(existingCollection, importedCollection, mergeStrategy = 'merge', options = {}) {
        try {
            const { triggerSync = true } = options;
            let mergedAudiobooks = [];
            const existingIds = new Set(existingCollection.audiobooks.map(book => book.id));

            switch (mergeStrategy) {
                case 'replace':
                    // Replace entire collection
                    mergedAudiobooks = importedCollection.audiobooks;
                    break;

                case 'append':
                    // Add all imported books, skip duplicates
                    mergedAudiobooks = [...existingCollection.audiobooks];
                    importedCollection.audiobooks.forEach(book => {
                        if (!existingIds.has(book.id)) {
                            mergedAudiobooks.push(book);
                        }
                    });
                    break;

                case 'sync-aware':
                    // Intelligent merge considering modification timestamps
                    mergedAudiobooks = await this.performSyncAwareMerge(
                        existingCollection.audiobooks,
                        importedCollection.audiobooks
                    );
                    break;

                case 'merge':
                default:
                    // Merge collections, update existing books with imported data
                    const importedMap = new Map(
                        importedCollection.audiobooks.map(book => [book.id, book])
                    );

                    mergedAudiobooks = existingCollection.audiobooks.map(book => {
                        return importedMap.get(book.id) || book;
                    });

                    // Add new books from import
                    importedCollection.audiobooks.forEach(book => {
                        if (!existingIds.has(book.id)) {
                            mergedAudiobooks.push(book);
                        }
                    });
                    break;
            }

            // Merge custom genres and moods
            const mergedGenres = new Set([
                ...(existingCollection.customGenres || []),
                ...(importedCollection.customGenres || [])
            ]);

            const mergedMoods = new Set([
                ...(existingCollection.customMoods || []),
                ...(importedCollection.customMoods || [])
            ]);

            const mergedCollection = {
                version: importedCollection.version || existingCollection.version,
                lastUpdated: new Date().toISOString(),
                audiobooks: mergedAudiobooks,
                customGenres: Array.from(mergedGenres),
                customMoods: Array.from(mergedMoods),
                metadata: {
                    ...existingCollection.metadata,
                    lastModified: new Date().toISOString(),
                    importedAt: new Date().toISOString(),
                    mergeStrategy
                }
            };

            // Trigger sync if requested and sync manager is available
            if (triggerSync && this.syncManager.isInitialized) {
                try {
                    await this.syncManager.syncToCloud();
                } catch (error) {
                    console.warn('Failed to sync after import merge:', error.message);
                }
            }

            return mergedCollection;

        } catch (error) {
            throw new Error(`Failed to merge collections: ${error.message}`);
        }
    }

    /**
     * Convert audiobooks to CSV format
     * @param {Audiobook[]} audiobooks - Array of audiobooks
     * @returns {string} CSV content
     */
    convertToCSV(audiobooks) {
        const headers = [
            'Title', 'Author', 'Narrator', 'URL', 'Image', 'Length',
            'Release Date', 'Rating', 'Price', 'Genres', 'Moods'
        ];

        const rows = [headers];

        audiobooks.forEach(book => {
            const bookData = book instanceof Audiobook ? book.toJSON() : book;
            rows.push([
                this.escapeCSVField(bookData.title || ''),
                this.escapeCSVField(bookData.author || ''),
                this.escapeCSVField(bookData.narrator || ''),
                this.escapeCSVField(bookData.url || ''),
                this.escapeCSVField(bookData.image || ''),
                this.escapeCSVField(bookData.length || ''),
                this.escapeCSVField(bookData.releaseDate || ''),
                bookData.rating || '',
                bookData.price || '',
                this.escapeCSVField((bookData.genres || []).join('; ')),
                this.escapeCSVField((bookData.moods || []).join('; '))
            ]);
        });

        return rows.map(row => row.join(',')).join('\n');
    }

    /**
     * Parse CSV text into rows
     * @param {string} text - CSV text content
     * @returns {string[][]} Array of rows, each row is array of fields
     */
    parseCSV(text) {
        const rows = [];
        const lines = text.split('\n');

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            const fields = [];
            let field = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        // Escaped quote
                        field += '"';
                        i++; // Skip next quote
                    } else {
                        // Toggle quote state
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    // Field separator
                    fields.push(field.trim());
                    field = '';
                } else {
                    field += char;
                }
            }

            // Add last field
            fields.push(field.trim());
            rows.push(fields);
        }

        return rows;
    }

    /**
     * Map CSV row to audiobook data
     * @param {string[]} headers - CSV headers
     * @param {string[]} row - CSV row data
     * @returns {Object} Audiobook data object
     */
    mapCSVRowToAudiobook(headers, row) {
        const data = {};

        headers.forEach((header, index) => {
            const value = row[index] ? row[index].trim() : '';

            switch (header) {
                case 'title':
                    data.title = value;
                    break;
                case 'author':
                    data.author = value;
                    break;
                case 'narrator':
                    data.narrator = value;
                    break;
                case 'url':
                    data.url = value;
                    break;
                case 'image':
                    data.image = value;
                    break;
                case 'length':
                    data.length = value;
                    break;
                case 'release date':
                case 'releasedate':
                    if (!data.releaseDate) {
                        data.releaseDate = value;
                    }
                    break;
                case 'rating':
                    data.rating = value ? parseFloat(value) : null;
                    break;
                case 'price':
                    data.price = value ? parseFloat(value) : null;
                    break;
                case 'genres':
                case 'genre':
                    if (!data.genres) {
                        data.genres = value ? value.split(';').map(g => g.trim()).filter(g => g) : [];
                    }
                    break;
                case 'moods':
                case 'mood':
                    if (!data.moods) {
                        data.moods = value ? value.split(';').map(m => m.trim()).filter(m => m) : [];
                    }
                    break;
            }
        });

        // Generate ID if not provided
        if (!data.id) {
            data.id = `audiobook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        return data;
    }

    /**
     * Escape CSV field value
     * @param {string} value - Field value
     * @returns {string} Escaped value
     */
    escapeCSVField(value) {
        if (!value) return '';

        const stringValue = String(value);

        // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
    }

    /**
     * Read file as text
     * @param {File} file - File to read
     * @returns {Promise<string>} File content as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Download file to user's computer
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
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
            (typeof data.version === 'string' || typeof data.version === 'undefined') &&
            (typeof data.lastUpdated === 'string' || typeof data.lastUpdated === 'undefined')
        );
    }

    /**
     * Get CSV template for manual data entry
     * @returns {string} CSV template content
     */
    getCSVTemplate() {
        const headers = [
            'Title', 'Author', 'Narrator', 'URL', 'Image', 'Length',
            'Release Date', 'Rating', 'Price', 'Genres', 'Moods'
        ];

        const exampleRow = [
            'Example Book Title',
            'Author Name',
            'Narrator Name',
            'https://www.audible.com/pd/example',
            'https://example.com/cover.jpg',
            '10 hrs and 30 mins',
            '2024-01-15',
            '4.5',
            '15.99',
            'fantasy; adventure',
            'epic; fast-paced'
        ];

        return [headers, exampleRow].map(row => row.join(',')).join('\n');
    }

    /**
     * Download CSV template
     * @param {string} filename - Optional filename
     */
    downloadCSVTemplate(filename = 'audiobooks-template.csv') {
        const template = this.getCSVTemplate();
        this.downloadFile(template, filename, 'text/csv');
    }

    // Sync-aware methods

    /**
     * Detect potential sync conflicts when importing data
     * @param {Object} importData - Data being imported
     * @returns {Promise<Object|null>} Conflict information or null
     */
    async detectImportSyncConflict(importData) {
        try {
            // Check if we have sync metadata in the import
            const importSyncMetadata = importData.exportMetadata?.syncMetadata;
            if (!importSyncMetadata || !importSyncMetadata.exportedFromSync) {
                return null; // No sync metadata, no conflict to detect
            }

            // Get current sync status
            const currentSyncStatus = await this.syncManager.getSyncStatus();
            if (!currentSyncStatus.hasGistId) {
                return null; // No sync configured locally
            }

            // Get current local data
            const currentData = await this.localCache.loadData();
            if (!currentData) {
                return null; // No local data to conflict with
            }

            // Compare device IDs
            if (importSyncMetadata.deviceId === currentSyncStatus.deviceId) {
                return null; // Same device, no conflict
            }

            // Compare sync timestamps
            const importSyncTime = new Date(importSyncMetadata.lastSyncTime || 0);
            const currentSyncTime = new Date(currentSyncStatus.lastSyncTime || 0);

            // Check if import data is significantly different
            const importBookIds = new Set(importData.audiobooks.map(book => book.id));
            const currentBookIds = new Set(currentData.audiobooks.map(book => book.id));

            const onlyInImport = [...importBookIds].filter(id => !currentBookIds.has(id));
            const onlyInCurrent = [...currentBookIds].filter(id => !importBookIds.has(id));

            if (onlyInImport.length === 0 && onlyInCurrent.length === 0) {
                // Same books, check for modifications
                const hasModifications = importData.audiobooks.some(importBook => {
                    const currentBook = currentData.audiobooks.find(book => book.id === importBook.id);
                    return currentBook && this.booksAreDifferent(importBook, currentBook);
                });

                if (!hasModifications) {
                    return null; // No meaningful differences
                }
            }

            return {
                type: 'import_sync_conflict',
                importDeviceId: importSyncMetadata.deviceId,
                currentDeviceId: currentSyncStatus.deviceId,
                importSyncTime: importSyncTime.toISOString(),
                currentSyncTime: currentSyncTime.toISOString(),
                importBookCount: importData.audiobooks.length,
                currentBookCount: currentData.audiobooks.length,
                onlyInImport: onlyInImport.length,
                onlyInCurrent: onlyInCurrent.length,
                hasModifications: true,
                recommendedAction: this.getRecommendedConflictAction(importSyncTime, currentSyncTime)
            };

        } catch (error) {
            console.warn('Error detecting import sync conflict:', error.message);
            return null;
        }
    }

    /**
     * Perform sync-aware merge of audiobook collections
     * @param {Array} existingBooks - Current audiobooks
     * @param {Array} importedBooks - Imported audiobooks
     * @returns {Promise<Array>} Merged audiobooks
     */
    async performSyncAwareMerge(existingBooks, importedBooks) {
        const existingMap = new Map(existingBooks.map(book => [book.id, book]));
        const importedMap = new Map(importedBooks.map(book => [book.id, book]));
        const mergedBooks = [];

        // Get all unique book IDs
        const allIds = new Set([...existingMap.keys(), ...importedMap.keys()]);

        for (const id of allIds) {
            const existingBook = existingMap.get(id);
            const importedBook = importedMap.get(id);

            if (existingBook && importedBook) {
                // Both exist - choose based on modification time
                const existingModified = new Date(existingBook.lastModified || existingBook.dateAdded || 0);
                const importedModified = new Date(importedBook.lastModified || importedBook.dateAdded || 0);

                if (importedModified > existingModified) {
                    mergedBooks.push({
                        ...importedBook,
                        mergeInfo: {
                            source: 'imported',
                            reason: 'newer_modification_time',
                            importedAt: new Date().toISOString()
                        }
                    });
                } else {
                    mergedBooks.push({
                        ...existingBook,
                        mergeInfo: {
                            source: 'existing',
                            reason: 'newer_or_equal_modification_time'
                        }
                    });
                }
            } else if (importedBook) {
                // Only in import - add it
                mergedBooks.push({
                    ...importedBook,
                    mergeInfo: {
                        source: 'imported',
                        reason: 'new_book',
                        importedAt: new Date().toISOString()
                    }
                });
            } else {
                // Only in existing - keep it
                mergedBooks.push({
                    ...existingBook,
                    mergeInfo: {
                        source: 'existing',
                        reason: 'not_in_import'
                    }
                });
            }
        }

        return mergedBooks;
    }

    /**
     * Create a backup before importing (for rollback)
     * @param {Object} currentCollection - Current collection to backup
     * @returns {Promise<Object>} Backup information
     */
    async createImportBackup(currentCollection) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFilename = `audiobooks-pre-import-backup-${timestamp}.json`;

            const backupData = await this.exportJSON(currentCollection, backupFilename, {
                includeSyncMetadata: true
            });

            // Store backup reference in local storage for recovery
            const backupInfo = {
                filename: backupFilename,
                timestamp: new Date().toISOString(),
                bookCount: currentCollection.audiobooks.length,
                fileSize: backupData.fileSize
            };

            const existingBackups = JSON.parse(localStorage.getItem('audiobook-import-backups') || '[]');
            existingBackups.push(backupInfo);

            // Keep only last 5 backups
            if (existingBackups.length > 5) {
                existingBackups.splice(0, existingBackups.length - 5);
            }

            localStorage.setItem('audiobook-import-backups', JSON.stringify(existingBackups));

            return backupInfo;

        } catch (error) {
            throw new Error(`Failed to create import backup: ${error.message}`);
        }
    }

    /**
     * Restore from a backup
     * @param {string} backupData - JSON backup data
     * @returns {Promise<Object>} Restored collection
     */
    async restoreFromBackup(backupData) {
        try {
            const data = JSON.parse(backupData);

            if (!this.isValidCollection(data)) {
                throw new Error('Invalid backup format');
            }

            // Import the backup data
            const restoredCollection = await this.importJSON(
                new Blob([backupData], { type: 'application/json' }),
                { checkSyncConflicts: false }
            );

            return restoredCollection;

        } catch (error) {
            throw new Error(`Failed to restore from backup: ${error.message}`);
        }
    }

    /**
     * Get list of available import backups
     * @returns {Array} List of backup information
     */
    getImportBackups() {
        try {
            return JSON.parse(localStorage.getItem('audiobook-import-backups') || '[]');
        } catch (error) {
            console.warn('Failed to get import backups:', error.message);
            return [];
        }
    }

    /**
     * Clear old import backups
     * @param {number} maxAge - Maximum age in days (default: 30)
     */
    cleanupImportBackups(maxAge = 30) {
        try {
            const backups = this.getImportBackups();
            const cutoffDate = new Date(Date.now() - (maxAge * 24 * 60 * 60 * 1000));

            const validBackups = backups.filter(backup => {
                return new Date(backup.timestamp) > cutoffDate;
            });

            localStorage.setItem('audiobook-import-backups', JSON.stringify(validBackups));

        } catch (error) {
            console.warn('Failed to cleanup import backups:', error.message);
        }
    }

    // Helper methods

    /**
     * Compare two books to detect differences
     * @param {Object} book1 - First book
     * @param {Object} book2 - Second book
     * @returns {boolean} True if books are different
     */
    booksAreDifferent(book1, book2) {
        const compareFields = ['title', 'author', 'narrator', 'rating', 'genres', 'moods', 'url'];

        return compareFields.some(field => {
            const val1 = book1[field];
            const val2 = book2[field];

            if (Array.isArray(val1) && Array.isArray(val2)) {
                return JSON.stringify(val1.sort()) !== JSON.stringify(val2.sort());
            }

            return val1 !== val2;
        });
    }

    /**
     * Get recommended action for sync conflicts
     * @param {Date} importTime - Import sync time
     * @param {Date} currentTime - Current sync time
     * @returns {string} Recommended action
     */
    getRecommendedConflictAction(importTime, currentTime) {
        if (importTime > currentTime) {
            return 'use_import'; // Import data is newer
        } else if (currentTime > importTime) {
            return 'use_current'; // Current data is newer
        } else {
            return 'manual_review'; // Same time, needs manual review
        }
    }
}