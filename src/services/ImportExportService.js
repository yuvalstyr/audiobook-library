import { Audiobook } from '../models/Audiobook.js';

export class ImportExportService {
    constructor() {
        this.supportedFormats = ['json', 'csv'];
    }

    /**
     * Export collection as JSON file
     * @param {Object} collection - Collection data to export
     * @param {string} filename - Optional filename (defaults to audiobooks-backup-YYYY-MM-DD.json)
     * @returns {Object} Export result with data and metadata
     */
    exportJSON(collection, filename = null) {
        try {
            if (!filename) {
                const date = new Date().toISOString().split('T')[0];
                filename = `audiobooks-backup-${date}.json`;
            }

            // Create export data with backup metadata
            const exportData = {
                ...collection,
                audiobooks: collection.audiobooks.map(book =>
                    book instanceof Audiobook ? book.toJSON() : book
                ),
                exportDate: new Date().toISOString(),
                exportVersion: '1.0',
                totalBooks: collection.audiobooks.length
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
                data: jsonString
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
     * Import collection from JSON file
     * @param {File} file - JSON file to import
     * @returns {Promise<Object>} Imported collection data
     */
    async importJSON(file) {
        try {
            if (!file || file.type !== 'application/json') {
                throw new Error('Please select a valid JSON file');
            }

            const text = await this.readFileAsText(file);
            const data = JSON.parse(text);

            // Validate collection structure
            if (!this.isValidCollection(data)) {
                throw new Error('Invalid collection format: missing required fields');
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
                version: data.version || '1.0',
                lastUpdated: data.lastUpdated || new Date().toISOString(),
                audiobooks,
                customGenres: data.customGenres || [],
                customMoods: data.customMoods || [],
                importStats: {
                    totalAttempted: data.audiobooks.length,
                    successful: audiobooks.length,
                    failed: data.audiobooks.length - audiobooks.length,
                    errors: errors.slice(0, 10) // Limit error messages
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
     * Merge imported collection with existing collection
     * @param {Object} existingCollection - Current collection
     * @param {Object} importedCollection - Imported collection
     * @param {string} mergeStrategy - 'replace', 'merge', or 'append'
     * @returns {Object} Merged collection
     */
    mergeCollections(existingCollection, importedCollection, mergeStrategy = 'merge') {
        try {
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

            return {
                version: importedCollection.version || existingCollection.version,
                lastUpdated: new Date().toISOString(),
                audiobooks: mergedAudiobooks,
                customGenres: Array.from(mergedGenres),
                customMoods: Array.from(mergedMoods)
            };

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
}