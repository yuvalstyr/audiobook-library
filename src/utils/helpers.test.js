import { describe, it, expect } from 'vitest';
import {
    generateId,
    validateUrl,
    validateRating,
    validatePrice,
    formatDuration,
    parseDuration,
    sanitizeString,
    debounce
} from './helpers.js';

describe('Helper Functions', () => {
    describe('generateId', () => {
        it('should generate unique IDs', () => {
            const id1 = generateId();
            const id2 = generateId();

            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^audiobook_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^audiobook_\d+_[a-z0-9]+$/);
        });

        it('should generate IDs with correct format', () => {
            const id = generateId();
            expect(id).toMatch(/^audiobook_\d+_[a-z0-9]{9}$/);
        });
    });

    describe('validateUrl', () => {
        it('should validate correct URLs', () => {
            expect(validateUrl('https://example.com')).toBe(true);
            expect(validateUrl('http://example.com')).toBe(true);
            expect(validateUrl('https://www.audible.com/pd/book')).toBe(true);
        });

        it('should reject invalid URLs', () => {
            expect(validateUrl('not-a-url')).toBe(false);
            expect(validateUrl('ftp://example.com')).toBe(false);
            expect(validateUrl('example.com')).toBe(false);
        });

        it('should allow empty URLs', () => {
            expect(validateUrl('')).toBe(true);
            expect(validateUrl(null)).toBe(true);
            expect(validateUrl(undefined)).toBe(true);
        });
    });

    describe('validateRating', () => {
        it('should validate ratings in range 1-5', () => {
            expect(validateRating(1)).toBe(true);
            expect(validateRating(3)).toBe(true);
            expect(validateRating(5)).toBe(true);
            expect(validateRating(4.5)).toBe(true);
            expect(validateRating('3.2')).toBe(true);
        });

        it('should reject ratings outside range', () => {
            expect(validateRating(0)).toBe(false);
            expect(validateRating(6)).toBe(false);
            expect(validateRating(-1)).toBe(false);
            expect(validateRating(5.1)).toBe(false);
        });

        it('should reject non-numeric ratings', () => {
            expect(validateRating('not-a-number')).toBe(false);
            expect(validateRating(null)).toBe(false);
            expect(validateRating(undefined)).toBe(false);
        });
    });

    describe('validatePrice', () => {
        it('should validate positive prices', () => {
            expect(validatePrice(0)).toBe(true);
            expect(validatePrice(10.99)).toBe(true);
            expect(validatePrice('15.50')).toBe(true);
            expect(validatePrice(100)).toBe(true);
        });

        it('should reject negative prices', () => {
            expect(validatePrice(-1)).toBe(false);
            expect(validatePrice('-5.99')).toBe(false);
        });

        it('should reject non-numeric prices', () => {
            expect(validatePrice('not-a-number')).toBe(false);
            expect(validatePrice(null)).toBe(false);
            expect(validatePrice(undefined)).toBe(false);
        });
    });

    describe('formatDuration', () => {
        it('should format minutes only', () => {
            expect(formatDuration(30)).toBe('30 mins');
            expect(formatDuration(45)).toBe('45 mins');
        });

        it('should format hours only', () => {
            expect(formatDuration(60)).toBe('1 hrs');
            expect(formatDuration(120)).toBe('2 hrs');
        });

        it('should format hours and minutes', () => {
            expect(formatDuration(90)).toBe('1 hrs and 30 mins');
            expect(formatDuration(150)).toBe('2 hrs and 30 mins');
        });

        it('should handle invalid input', () => {
            expect(formatDuration(null)).toBe('');
            expect(formatDuration(undefined)).toBe('');
            expect(formatDuration('not-a-number')).toBe('');
        });
    });

    describe('parseDuration', () => {
        it('should parse hours and minutes', () => {
            expect(parseDuration('2 hrs and 30 mins')).toBe(150);
            expect(parseDuration('1 hr and 45 mins')).toBe(105);
        });

        it('should parse hours only', () => {
            expect(parseDuration('3 hrs')).toBe(180);
            expect(parseDuration('1 hr')).toBe(60);
        });

        it('should parse minutes only', () => {
            expect(parseDuration('45 mins')).toBe(45);
            expect(parseDuration('30 min')).toBe(30);
        });

        it('should handle invalid input', () => {
            expect(parseDuration('')).toBe(0);
            expect(parseDuration(null)).toBe(0);
            expect(parseDuration('invalid')).toBe(0);
        });
    });

    describe('sanitizeString', () => {
        it('should escape HTML characters', () => {
            expect(sanitizeString('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
            expect(sanitizeString('Tom & Jerry')).toBe('Tom &amp; Jerry');
            expect(sanitizeString("It's a book")).toBe('It&#x27;s a book');
        });

        it('should handle empty input', () => {
            expect(sanitizeString('')).toBe('');
            expect(sanitizeString(null)).toBe('');
            expect(sanitizeString(undefined)).toBe('');
        });

        it('should leave safe strings unchanged', () => {
            expect(sanitizeString('Safe string')).toBe('Safe string');
            expect(sanitizeString('123 ABC')).toBe('123 ABC');
        });
    });

    describe('debounce', () => {
        it('should delay function execution', (done) => {
            let callCount = 0;
            const debouncedFn = debounce(() => {
                callCount++;
            }, 50);

            debouncedFn();
            debouncedFn();
            debouncedFn();

            // Should not have been called yet
            expect(callCount).toBe(0);

            setTimeout(() => {
                // Should have been called once after delay
                expect(callCount).toBe(1);
                done();
            }, 60);
        });

        it('should pass arguments correctly', (done) => {
            let receivedArgs;
            const debouncedFn = debounce((...args) => {
                receivedArgs = args;
            }, 50);

            debouncedFn('arg1', 'arg2', 123);

            setTimeout(() => {
                expect(receivedArgs).toEqual(['arg1', 'arg2', 123]);
                done();
            }, 60);
        });
    });
});