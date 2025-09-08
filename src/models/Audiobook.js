import { generateId, validateUrl, validateRating, validatePrice } from '../utils/helpers.js';

export class Audiobook {
    constructor({
        id = null,
        title,
        url = '',
        image = '',
        author,
        narrator = '',
        length = '',
        releaseDate = '',
        rating = 0,
        price = 0,
        genres = [],
        moods = []
    }) {
        this.id = id || generateId();
        this.title = title;
        this.url = url;
        this.image = image;
        this.author = author;
        this.narrator = narrator;
        this.length = length;
        this.releaseDate = releaseDate;
        this.rating = rating;
        this.price = price;
        this.genres = Array.isArray(genres) ? genres : [];
        this.moods = Array.isArray(moods) ? moods : [];
    }

    // Validation methods
    validate() {
        const errors = [];

        if (!this.title || this.title.trim() === '') {
            errors.push('Title is required');
        }

        if (!this.author || this.author.trim() === '') {
            errors.push('Author is required');
        }

        if (this.url && !validateUrl(this.url)) {
            errors.push('URL must be a valid format');
        }

        if (this.image && !validateUrl(this.image)) {
            errors.push('Image URL must be a valid format');
        }

        if (this.rating && !validateRating(this.rating)) {
            errors.push('Rating must be between 1 and 5');
        }

        if (this.price && !validatePrice(this.price)) {
            errors.push('Price must be a valid number');
        }

        if (this.releaseDate && !this.isValidDate(this.releaseDate)) {
            errors.push('Release date must be a valid date format (YYYY-MM-DD)');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    isValidDate(dateString) {
        if (!dateString) return true; // Optional field
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;

        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date) && dateString === date.toISOString().split('T')[0];
    }

    // Data transformation methods
    static fromJSON(data) {
        return new Audiobook(data);
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            url: this.url,
            image: this.image,
            author: this.author,
            narrator: this.narrator,
            length: this.length,
            releaseDate: this.releaseDate,
            rating: this.rating,
            price: this.price,
            genres: this.genres,
            moods: this.moods
        };
    }

    // Transform from different input formats
    static fromAudibleData(audibleData) {
        return new Audiobook({
            title: audibleData.title,
            url: audibleData.productUrl,
            image: audibleData.imageUrl,
            author: audibleData.authorName,
            narrator: audibleData.narratorName,
            length: audibleData.runtimeLength,
            releaseDate: audibleData.releaseDate,
            rating: audibleData.overallRating,
            price: audibleData.price,
            genres: audibleData.categories || [],
            moods: []
        });
    }

    static fromCSVRow(csvRow) {
        return new Audiobook({
            title: csvRow.title,
            url: csvRow.url || '',
            image: csvRow.image || '',
            author: csvRow.author,
            narrator: csvRow.narrator || '',
            length: csvRow.length || '',
            releaseDate: csvRow.releaseDate || '',
            rating: parseFloat(csvRow.rating) || 0,
            price: parseFloat(csvRow.price) || 0,
            genres: csvRow.genres ? csvRow.genres.split(',').map(g => g.trim()) : [],
            moods: csvRow.moods ? csvRow.moods.split(',').map(m => m.trim()) : []
        });
    }

    // Utility methods
    hasGenre(genre) {
        return this.genres.includes(genre);
    }

    hasMood(mood) {
        return this.moods.includes(mood);
    }

    addGenre(genre) {
        if (!this.hasGenre(genre)) {
            this.genres.push(genre);
        }
    }

    addMood(mood) {
        if (!this.hasMood(mood)) {
            this.moods.push(mood);
        }
    }

    removeGenre(genre) {
        this.genres = this.genres.filter(g => g !== genre);
    }

    removeMood(mood) {
        this.moods = this.moods.filter(m => m !== mood);
    }
}