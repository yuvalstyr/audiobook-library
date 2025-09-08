import { describe, it, expect, beforeEach } from 'vitest';
import { Audiobook } from './Audiobook.js';

describe('Audiobook Model', () => {
    describe('Constructor', () => {
        it('should create an audiobook with required fields', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author'
            });

            expect(audiobook.title).toBe('Test Book');
            expect(audiobook.author).toBe('Test Author');
            expect(audiobook.id).toBeDefined();
            expect(audiobook.genres).toEqual([]);
            expect(audiobook.moods).toEqual([]);
        });

        it('should generate unique IDs for different audiobooks', () => {
            const book1 = new Audiobook({ title: 'Book 1', author: 'Author 1' });
            const book2 = new Audiobook({ title: 'Book 2', author: 'Author 2' });

            expect(book1.id).not.toBe(book2.id);
        });

        it('should use provided ID if given', () => {
            const customId = 'custom-id-123';
            const audiobook = new Audiobook({
                id: customId,
                title: 'Test Book',
                author: 'Test Author'
            });

            expect(audiobook.id).toBe(customId);
        });

        it('should handle arrays for genres and moods', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author',
                genres: ['sci-fi', 'action'],
                moods: ['fast-paced', 'exciting']
            });

            expect(audiobook.genres).toEqual(['sci-fi', 'action']);
            expect(audiobook.moods).toEqual(['fast-paced', 'exciting']);
        });

        it('should convert non-arrays to empty arrays for genres and moods', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author',
                genres: 'not-an-array',
                moods: null
            });

            expect(audiobook.genres).toEqual([]);
            expect(audiobook.moods).toEqual([]);
        });
    });

    describe('Validation', () => {
        it('should validate a complete valid audiobook', () => {
            const audiobook = new Audiobook({
                title: 'Valid Book',
                author: 'Valid Author',
                url: 'https://example.com/book',
                image: 'https://example.com/image.jpg',
                narrator: 'Valid Narrator',
                length: '10 hrs',
                releaseDate: '2023-01-01',
                rating: 4.5,
                price: 19.99
            });

            const validation = audiobook.validate();
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toEqual([]);
        });

        it('should require title', () => {
            const audiobook = new Audiobook({
                author: 'Test Author'
            });

            const validation = audiobook.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Title is required');
        });

        it('should require author', () => {
            const audiobook = new Audiobook({
                title: 'Test Book'
            });

            const validation = audiobook.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Author is required');
        });

        it('should reject empty title', () => {
            const audiobook = new Audiobook({
                title: '   ',
                author: 'Test Author'
            });

            const validation = audiobook.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Title is required');
        });

        it('should reject empty author', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: '   '
            });

            const validation = audiobook.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Author is required');
        });

        it('should validate URL format', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author',
                url: 'invalid-url'
            });

            const validation = audiobook.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('URL must be a valid format');
        });

        it('should validate image URL format', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author',
                image: 'invalid-image-url'
            });

            const validation = audiobook.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Image URL must be a valid format');
        });

        it('should validate rating range', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author',
                rating: 6
            });

            const validation = audiobook.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Rating must be between 1 and 5');
        });

        it('should validate negative rating', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author',
                rating: -1
            });

            const validation = audiobook.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Rating must be between 1 and 5');
        });

        it('should validate price format', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author',
                price: 'not-a-number'
            });

            const validation = audiobook.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Price must be a valid number');
        });

        it('should validate date format', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author',
                releaseDate: 'invalid-date'
            });

            const validation = audiobook.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Release date must be a valid date format (YYYY-MM-DD)');
        });

        it('should accept valid date format', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author',
                releaseDate: '2023-12-25'
            });

            const validation = audiobook.validate();
            expect(validation.isValid).toBe(true);
        });

        it('should allow empty optional fields', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author',
                url: '',
                image: '',
                releaseDate: '',
                rating: 0,
                price: 0
            });

            const validation = audiobook.validate();
            expect(validation.isValid).toBe(true);
        });
    });

    describe('Date Validation', () => {
        it('should validate correct date format', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author'
            });

            expect(audiobook.isValidDate('2023-01-01')).toBe(true);
            expect(audiobook.isValidDate('2023-12-31')).toBe(true);
        });

        it('should reject invalid date formats', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author'
            });

            expect(audiobook.isValidDate('2023/01/01')).toBe(false);
            expect(audiobook.isValidDate('01-01-2023')).toBe(false);
            expect(audiobook.isValidDate('2023-13-01')).toBe(false);
            expect(audiobook.isValidDate('2023-01-32')).toBe(false);
        });

        it('should allow empty date', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author'
            });

            expect(audiobook.isValidDate('')).toBe(true);
            expect(audiobook.isValidDate(null)).toBe(true);
        });
    });

    describe('JSON Serialization', () => {
        it('should convert to JSON correctly', () => {
            const audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author',
                genres: ['sci-fi'],
                moods: ['exciting']
            });

            const json = audiobook.toJSON();
            expect(json.title).toBe('Test Book');
            expect(json.author).toBe('Test Author');
            expect(json.genres).toEqual(['sci-fi']);
            expect(json.moods).toEqual(['exciting']);
            expect(json.id).toBeDefined();
        });

        it('should create from JSON correctly', () => {
            const data = {
                id: 'test-id',
                title: 'Test Book',
                author: 'Test Author',
                genres: ['fantasy'],
                moods: ['epic']
            };

            const audiobook = Audiobook.fromJSON(data);
            expect(audiobook.id).toBe('test-id');
            expect(audiobook.title).toBe('Test Book');
            expect(audiobook.author).toBe('Test Author');
            expect(audiobook.genres).toEqual(['fantasy']);
            expect(audiobook.moods).toEqual(['epic']);
        });
    });

    describe('Data Transformation', () => {
        it('should transform from Audible data format', () => {
            const audibleData = {
                title: 'Audible Book',
                productUrl: 'https://audible.com/book',
                imageUrl: 'https://audible.com/image.jpg',
                authorName: 'Audible Author',
                narratorName: 'Audible Narrator',
                runtimeLength: '10 hrs',
                releaseDate: '2023-01-01',
                overallRating: 4.5,
                price: 19.99,
                categories: ['sci-fi', 'thriller']
            };

            const audiobook = Audiobook.fromAudibleData(audibleData);
            expect(audiobook.title).toBe('Audible Book');
            expect(audiobook.url).toBe('https://audible.com/book');
            expect(audiobook.author).toBe('Audible Author');
            expect(audiobook.genres).toEqual(['sci-fi', 'thriller']);
            expect(audiobook.moods).toEqual([]);
        });

        it('should transform from CSV row format', () => {
            const csvRow = {
                title: 'CSV Book',
                author: 'CSV Author',
                url: 'https://example.com',
                rating: '4.2',
                price: '15.99',
                genres: 'fantasy, action',
                moods: 'epic, fast-paced'
            };

            const audiobook = Audiobook.fromCSVRow(csvRow);
            expect(audiobook.title).toBe('CSV Book');
            expect(audiobook.author).toBe('CSV Author');
            expect(audiobook.rating).toBe(4.2);
            expect(audiobook.price).toBe(15.99);
            expect(audiobook.genres).toEqual(['fantasy', 'action']);
            expect(audiobook.moods).toEqual(['epic', 'fast-paced']);
        });

        it('should handle missing CSV fields gracefully', () => {
            const csvRow = {
                title: 'Minimal Book',
                author: 'Minimal Author'
            };

            const audiobook = Audiobook.fromCSVRow(csvRow);
            expect(audiobook.title).toBe('Minimal Book');
            expect(audiobook.author).toBe('Minimal Author');
            expect(audiobook.rating).toBe(0);
            expect(audiobook.price).toBe(0);
            expect(audiobook.genres).toEqual([]);
            expect(audiobook.moods).toEqual([]);
        });
    });

    describe('Utility Methods', () => {
        let audiobook;

        beforeEach(() => {
            audiobook = new Audiobook({
                title: 'Test Book',
                author: 'Test Author',
                genres: ['sci-fi', 'action'],
                moods: ['fast-paced']
            });
        });

        it('should check if audiobook has genre', () => {
            expect(audiobook.hasGenre('sci-fi')).toBe(true);
            expect(audiobook.hasGenre('fantasy')).toBe(false);
        });

        it('should check if audiobook has mood', () => {
            expect(audiobook.hasMood('fast-paced')).toBe(true);
            expect(audiobook.hasMood('slow')).toBe(false);
        });

        it('should add new genre', () => {
            audiobook.addGenre('fantasy');
            expect(audiobook.genres).toContain('fantasy');
        });

        it('should not add duplicate genre', () => {
            audiobook.addGenre('sci-fi');
            expect(audiobook.genres.filter(g => g === 'sci-fi')).toHaveLength(1);
        });

        it('should add new mood', () => {
            audiobook.addMood('exciting');
            expect(audiobook.moods).toContain('exciting');
        });

        it('should not add duplicate mood', () => {
            audiobook.addMood('fast-paced');
            expect(audiobook.moods.filter(m => m === 'fast-paced')).toHaveLength(1);
        });

        it('should remove genre', () => {
            audiobook.removeGenre('sci-fi');
            expect(audiobook.genres).not.toContain('sci-fi');
            expect(audiobook.genres).toContain('action');
        });

        it('should remove mood', () => {
            audiobook.removeMood('fast-paced');
            expect(audiobook.moods).not.toContain('fast-paced');
        });
    });
});