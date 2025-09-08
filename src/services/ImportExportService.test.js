import { describe, it, expect, beforeEach, test } from 'vitest';
import { ImportExportService } from './ImportExportService.js';
import { Audiobook } from '../models/Audiobook.js';

describe('ImportExportService', () => {
    let service;
    let mockCollection;

    beforeEach(() => {
        service = new ImportExportService();

        mockCollection = {
            version: '1.0',
            lastUpdated: '2025-01-07T10:30:00Z',
            audiobooks: [
                new Audiobook({
                    id: 'test-1',
                    title: 'Test Book 1',
                    author: 'Test Author 1',
                    narrator: 'Test Narrator 1',
                    url: 'https://example.com/book1',
                    image: 'https://example.com/cover1.jpg',
                    length: '10 hrs',
                    releaseDate: '2024-01-01',
                    rating: 4.5,
                    price: 15.99,
                    genres: ['fantasy', 'adventure'],
                    moods: ['epic', 'fast-paced']
                }),
                new Audiobook({
                    id: 'test-2',
                    title: 'Test Book 2',
                    author: 'Test Author 2',
                    narrator: 'Test Narrator 2',
                    url: 'https://example.com/book2',
                    image: 'https://example.com/cover2.jpg',
                    length: '8 hrs',
                    releaseDate: '2024-02-01',
                    rating: 4.0,
                    price: 12.99,
                    genres: ['sci-fi'],
                    moods: ['technical']
                })
            ],
            customGenres: ['adventure'],
            customMoods: ['epic', 'technical']
        };
    });

    describe('exportJSON', () => {
        test('should export collection as JSON string', () => {
            const result = service.exportJSON(mockCollection);

            expect(result.success).toBe(true);
            expect(result.bookCount).toBe(2);
            expect(result.filename).toMatch(/audiobooks-backup-\d{4}-\d{2}-\d{2}\.json/);
            expect(typeof result.fileSize).toBe('number');
        });

        test('should use custom filename when provided', () => {
            const customFilename = 'my-custom-backup.json';
            const result = service.exportJSON(mockCollection, customFilename);

            expect(result.filename).toBe(customFilename);
        });

        test('should handle empty collection', () => {
            const emptyCollection = {
                version: '1.0',
                lastUpdated: '2025-01-07T10:30:00Z',
                audiobooks: [],
                customGenres: [],
                customMoods: []
            };

            const result = service.exportJSON(emptyCollection);

            expect(result.success).toBe(true);
            expect(result.bookCount).toBe(0);
        });

        test('should throw error for invalid collection', () => {
            expect(() => {
                service.exportJSON(null);
            }).toThrow('Failed to export JSON');
        });
    });

    describe('exportCSV', () => {
        test('should export collection as CSV string', () => {
            const result = service.exportCSV(mockCollection);

            expect(result.success).toBe(true);
            expect(result.bookCount).toBe(2);
            expect(result.filename).toMatch(/audiobooks-export-\d{4}-\d{2}-\d{2}\.csv/);
            expect(typeof result.fileSize).toBe('number');
        });

        test('should use custom filename when provided', () => {
            const customFilename = 'my-export.csv';
            const result = service.exportCSV(mockCollection, customFilename);

            expect(result.filename).toBe(customFilename);
        });
    });

    describe('convertToCSV', () => {
        test('should convert audiobooks to CSV format', () => {
            const csv = service.convertToCSV(mockCollection.audiobooks);
            const lines = csv.split('\n');

            // Should have header + 2 data rows
            expect(lines.length).toBe(3);

            // Check header
            expect(lines[0]).toContain('Title,Author,Narrator');

            // Check data rows
            expect(lines[1]).toContain('Test Book 1');
            expect(lines[2]).toContain('Test Book 2');
        });

        test('should handle empty audiobooks array', () => {
            const csv = service.convertToCSV([]);
            const lines = csv.split('\n');

            // Should only have header
            expect(lines.length).toBe(1);
            expect(lines[0]).toContain('Title,Author,Narrator');
        });

        test('should escape CSV fields with commas', () => {
            const bookWithCommas = new Audiobook({
                id: 'test-comma',
                title: 'Book, with commas',
                author: 'Author, Name',
                narrator: 'Narrator Name',
                genres: ['genre1', 'genre2'],
                moods: ['mood1']
            });

            const csv = service.convertToCSV([bookWithCommas]);

            expect(csv).toContain('"Book, with commas"');
            expect(csv).toContain('"Author, Name"');
        });
    });

    describe('parseCSV', () => {
        test('should parse simple CSV text', () => {
            const csvText = 'Title,Author,Rating\nBook 1,Author 1,4.5\nBook 2,Author 2,4.0';
            const rows = service.parseCSV(csvText);

            expect(rows.length).toBe(3);
            expect(rows[0]).toEqual(['Title', 'Author', 'Rating']);
            expect(rows[1]).toEqual(['Book 1', 'Author 1', '4.5']);
            expect(rows[2]).toEqual(['Book 2', 'Author 2', '4.0']);
        });

        test('should handle quoted fields with commas', () => {
            const csvText = 'Title,Author\n"Book, with comma","Author, Name"';
            const rows = service.parseCSV(csvText);

            expect(rows.length).toBe(2);
            expect(rows[1]).toEqual(['Book, with comma', 'Author, Name']);
        });

        test('should handle escaped quotes', () => {
            const csvText = 'Title,Description\n"Book Title","He said ""Hello"" to me"';
            const rows = service.parseCSV(csvText);

            expect(rows.length).toBe(2);
            expect(rows[1]).toEqual(['Book Title', 'He said "Hello" to me']);
        });

        test('should handle empty lines', () => {
            const csvText = 'Title,Author\n\nBook 1,Author 1\n\n';
            const rows = service.parseCSV(csvText);

            expect(rows.length).toBe(2);
            expect(rows[0]).toEqual(['Title', 'Author']);
            expect(rows[1]).toEqual(['Book 1', 'Author 1']);
        });
    });

    describe('mapCSVRowToAudiobook', () => {
        test('should map CSV row to audiobook data', () => {
            const headers = ['title', 'author', 'narrator', 'rating', 'genres', 'moods'];
            const row = ['Test Book', 'Test Author', 'Test Narrator', '4.5', 'fantasy; sci-fi', 'epic; fast-paced'];

            const data = service.mapCSVRowToAudiobook(headers, row);

            expect(data.title).toBe('Test Book');
            expect(data.author).toBe('Test Author');
            expect(data.narrator).toBe('Test Narrator');
            expect(data.rating).toBe(4.5);
            expect(data.genres).toEqual(['fantasy', 'sci-fi']);
            expect(data.moods).toEqual(['epic', 'fast-paced']);
            expect(data.id).toBeDefined();
        });

        test('should handle missing values', () => {
            const headers = ['title', 'author', 'rating'];
            const row = ['Test Book', '', ''];

            const data = service.mapCSVRowToAudiobook(headers, row);

            expect(data.title).toBe('Test Book');
            expect(data.author).toBe('');
            expect(data.rating).toBe(null);
        });

        test('should handle different header formats', () => {
            const headers = ['title', 'release date', 'releasedate'];
            const row = ['Test Book', '2024-01-01', '2024-02-01'];

            const data = service.mapCSVRowToAudiobook(headers, row);

            expect(data.title).toBe('Test Book');
            expect(data.releaseDate).toBe('2024-01-01'); // First match should win
        });
    });

    describe('mergeCollections', () => {
        let existingCollection;
        let importedCollection;

        beforeEach(() => {
            existingCollection = {
                version: '1.0',
                lastUpdated: '2025-01-01T00:00:00Z',
                audiobooks: [
                    new Audiobook({
                        id: 'existing-1',
                        title: 'Existing Book 1',
                        author: 'Author 1'
                    }),
                    new Audiobook({
                        id: 'existing-2',
                        title: 'Existing Book 2',
                        author: 'Author 2'
                    })
                ],
                customGenres: ['fantasy'],
                customMoods: ['epic']
            };

            importedCollection = {
                version: '1.1',
                lastUpdated: '2025-01-07T00:00:00Z',
                audiobooks: [
                    new Audiobook({
                        id: 'existing-1',
                        title: 'Updated Book 1',
                        author: 'Updated Author 1'
                    }),
                    new Audiobook({
                        id: 'new-1',
                        title: 'New Book 1',
                        author: 'New Author 1'
                    })
                ],
                customGenres: ['sci-fi'],
                customMoods: ['fast-paced']
            };
        });

        test('should merge collections with merge strategy', () => {
            const result = service.mergeCollections(existingCollection, importedCollection, 'merge');

            expect(result.audiobooks.length).toBe(3);

            // Should update existing book
            const updatedBook = result.audiobooks.find(book => book.id === 'existing-1');
            expect(updatedBook.title).toBe('Updated Book 1');

            // Should keep unchanged existing book
            const unchangedBook = result.audiobooks.find(book => book.id === 'existing-2');
            expect(unchangedBook.title).toBe('Existing Book 2');

            // Should add new book
            const newBook = result.audiobooks.find(book => book.id === 'new-1');
            expect(newBook.title).toBe('New Book 1');

            // Should merge custom genres and moods
            expect(result.customGenres).toEqual(expect.arrayContaining(['fantasy', 'sci-fi']));
            expect(result.customMoods).toEqual(expect.arrayContaining(['epic', 'fast-paced']));
        });

        test('should append collections with append strategy', () => {
            const result = service.mergeCollections(existingCollection, importedCollection, 'append');

            expect(result.audiobooks.length).toBe(3);

            // Should keep original existing book
            const existingBook = result.audiobooks.find(book => book.id === 'existing-1');
            expect(existingBook.title).toBe('Existing Book 1');

            // Should add new book
            const newBook = result.audiobooks.find(book => book.id === 'new-1');
            expect(newBook.title).toBe('New Book 1');
        });

        test('should replace collections with replace strategy', () => {
            const result = service.mergeCollections(existingCollection, importedCollection, 'replace');

            expect(result.audiobooks.length).toBe(2);
            expect(result.audiobooks.map(book => book.id)).toEqual(['existing-1', 'new-1']);

            // Should use imported book data
            const book = result.audiobooks.find(book => book.id === 'existing-1');
            expect(book.title).toBe('Updated Book 1');
        });
    });

    describe('isValidCollection', () => {
        test('should validate correct collection format', () => {
            const validCollection = {
                version: '1.0',
                lastUpdated: '2025-01-07T10:30:00Z',
                audiobooks: []
            };

            expect(service.isValidCollection(validCollection)).toBe(true);
        });

        test('should accept collection without version and lastUpdated', () => {
            const minimalCollection = {
                audiobooks: []
            };

            expect(service.isValidCollection(minimalCollection)).toBe(true);
        });

        test('should reject invalid collection formats', () => {
            expect(service.isValidCollection(null)).toBe(false);
            expect(service.isValidCollection({})).toBe(false);
            expect(service.isValidCollection({ audiobooks: 'not-array' })).toBe(false);
            expect(service.isValidCollection({ version: 123 })).toBe(false);
        });
    });

    describe('escapeCSVField', () => {
        test('should escape fields with commas', () => {
            expect(service.escapeCSVField('Hello, World')).toBe('"Hello, World"');
        });

        test('should escape fields with quotes', () => {
            expect(service.escapeCSVField('He said "Hello"')).toBe('"He said ""Hello"""');
        });

        test('should escape fields with newlines', () => {
            expect(service.escapeCSVField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
        });

        test('should not escape simple fields', () => {
            expect(service.escapeCSVField('Simple text')).toBe('Simple text');
        });

        test('should handle empty and null values', () => {
            expect(service.escapeCSVField('')).toBe('');
            expect(service.escapeCSVField(null)).toBe('');
            expect(service.escapeCSVField(undefined)).toBe('');
        });
    });

    describe('getCSVTemplate', () => {
        test('should return CSV template with headers and example', () => {
            const template = service.getCSVTemplate();
            const lines = template.split('\n');

            expect(lines.length).toBe(2);
            expect(lines[0]).toContain('Title,Author,Narrator');
            expect(lines[1]).toContain('Example Book Title');
        });
    });
});