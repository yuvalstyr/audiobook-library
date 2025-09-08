import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageService } from './StorageService.js';
import { Audiobook } from '../models/Audiobook.js';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
};

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
});

describe('StorageService', () => {
    let storageService;
    let mockCollection;

    beforeEach(() => {
        storageService = new StorageService();
        mockCollection = {
            version: '1.0',
            lastUpdated: '2025-01-07T10:30:00Z',
            audiobooks: [
                new Audiobook({
                    id: 'test-id-1',
                    title: 'Test Book 1',
                    author: 'Test Author 1'
                }),
                new Audiobook({
                    id: 'test-id-2',
                    title: 'Test Book 2',
                    author: 'Test Author 2'
                })
            ],
            customGenres: ['test-genre'],
            customMoods: ['test-mood']
        };

        // Reset localStorage mock
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        localStorageMock.removeItem.mockClear();
        localStorageMock.clear.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('saveCollection', () => {
        it('should save collection to localStorage', () => {
            storageService.saveCollection(mockCollection);

            expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'audiobook-library',
                expect.stringContaining('"Test Book 1"')
            );
        });
    });

    describe('loadCollection', () => {
        it('should load collection from localStorage', () => {
            const storedData = JSON.stringify({
                version: '1.0',
                lastUpdated: '2025-01-07T10:30:00Z',
                audiobooks: [
                    {
                        id: 'test-id-1',
                        title: 'Test Book 1',
                        author: 'Test Author 1',
                        genres: [],
                        moods: []
                    }
                ],
                customGenres: [],
                customMoods: []
            });

            localStorageMock.getItem
                .mockReturnValueOnce(Date.now() + 1000000) // Future expiry
                .mockReturnValueOnce(storedData);

            const result = storageService.loadCollection();

            expect(result).toBeDefined();
            expect(result.audiobooks).toHaveLength(1);
            expect(result.audiobooks[0]).toBeInstanceOf(Audiobook);
            expect(result.audiobooks[0].title).toBe('Test Book 1');
        });

        it('should return null if cache is expired', () => {
            localStorageMock.getItem.mockReturnValueOnce(Date.now() - 1000); // Past expiry

            const result = storageService.loadCollection();

            expect(result).toBeNull();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('audiobook-library');
        });

        it('should return null if no data exists', () => {
            localStorageMock.getItem
                .mockReturnValueOnce(Date.now() + 1000000) // Future expiry
                .mockReturnValueOnce(null); // No data

            const result = storageService.loadCollection();

            expect(result).toBeNull();
        });
    });

    describe('isCacheExpired', () => {
        it('should return false for future expiry time', () => {
            localStorageMock.getItem.mockReturnValue((Date.now() + 1000000).toString());

            expect(storageService.isCacheExpired()).toBe(false);
        });

        it('should return true for past expiry time', () => {
            localStorageMock.getItem.mockReturnValue((Date.now() - 1000).toString());

            expect(storageService.isCacheExpired()).toBe(true);
        });
    });

    describe('isStorageAvailable', () => {
        it('should return true when localStorage is available', () => {
            expect(StorageService.isStorageAvailable()).toBe(true);
        });
    });
});