import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataService } from './DataService.js';
import { Audiobook } from '../models/Audiobook.js';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock fetch globally
global.fetch = vi.fn();

// Mock the sync services
vi.mock('./SyncManager.js', () => ({
    SyncManager: vi.fn().mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue(undefined),
        sync: vi.fn().mockResolvedValue({ success: true }),
        syncFromCloud: vi.fn().mockResolvedValue({ success: true }),
        getSyncStatus: vi.fn().mockResolvedValue({ isInitialized: true }),
        destroy: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn()
    }))
}));

vi.mock('./LocalCacheService.js', () => ({
    LocalCacheService: vi.fn().mockImplementation(() => ({
        saveData: vi.fn().mockResolvedValue(undefined),
        loadData: vi.fn().mockResolvedValue(null),
        getDeviceId: vi.fn().mockReturnValue('test-device-id'),
        getSyncMetadata: vi.fn().mockResolvedValue({}),
        updateSyncMetadata: vi.fn().mockResolvedValue(undefined)
    }))
}));

describe('DataService', () => {
    let dataService;
    let mockCollectionData;

    beforeEach(() => {
        // Clear all mocks
        vi.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);

        dataService = new DataService();

        // Manually attach mocks to the instances created by DataService
        dataService.syncManager.initialize = vi.fn().mockResolvedValue(undefined);
        dataService.syncManager.sync = vi.fn().mockResolvedValue({ success: true });
        dataService.syncManager.syncFromCloud = vi.fn().mockResolvedValue({ success: true });
        dataService.syncManager.getSyncStatus = vi.fn().mockResolvedValue({ isInitialized: true });
        dataService.syncManager.destroy = vi.fn();
        dataService.syncManager.on = vi.fn();
        dataService.syncManager.off = vi.fn();
        dataService.syncManager.emit = vi.fn();

        dataService.localCache.saveData = vi.fn().mockResolvedValue(undefined);
        dataService.localCache.loadData = vi.fn().mockResolvedValue(null);
        dataService.localCache.getDeviceId = vi.fn().mockReturnValue('test-device-id');
        dataService.localCache.getSyncMetadata = vi.fn().mockResolvedValue({});
        dataService.localCache.updateSyncMetadata = vi.fn().mockResolvedValue(undefined);
        mockCollectionData = {
            version: '1.0',
            lastUpdated: '2025-01-07T10:30:00Z',
            audiobooks: [
                {
                    id: 'test-id-1',
                    title: 'Test Book 1',
                    author: 'Test Author 1',
                    narrator: 'Test Narrator 1',
                    genres: ['sci-fi'],
                    moods: ['fast-paced']
                },
                {
                    id: 'test-id-2',
                    title: 'Test Book 2',
                    author: 'Test Author 2',
                    narrator: 'Test Narrator 2',
                    genres: ['fantasy'],
                    moods: ['epic']
                }
            ],
            customGenres: ['custom-genre'],
            customMoods: ['custom-mood']
        };

        // Reset fetch mock
        fetch.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('loadCollection', () => {
        it('should load and parse collection data successfully', async () => {
            // Mock that no cached data exists, so it falls back to static file
            dataService.localCache.loadData.mockResolvedValueOnce(null);
            dataService.syncManager.syncFromCloud.mockRejectedValueOnce(new Error('No gist configured'));

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockCollectionData)
            });

            const result = await dataService.loadCollection();

            expect(fetch).toHaveBeenCalledWith('/data/audiobooks.json');
            expect(result.version).toBe('1.0');
            expect(result.audiobooks).toHaveLength(2);
            expect(result.audiobooks[0]).toBeInstanceOf(Audiobook);
            expect(result.audiobooks[0].title).toBe('Test Book 1');
            expect(result.customGenres).toEqual(['custom-genre']);
            expect(result.customMoods).toEqual(['custom-mood']);
        });

        it('should handle network errors', async () => {
            // Mock that no cached data exists and sync fails
            dataService.localCache.loadData.mockResolvedValueOnce(null);
            dataService.syncManager.syncFromCloud.mockRejectedValueOnce(new Error('No gist configured'));

            fetch.mockRejectedValueOnce(new TypeError('Network error'));

            await expect(dataService.loadCollection()).rejects.toThrow(
                'Network error: Unable to connect to data source'
            );
        });

        it('should handle HTTP errors', async () => {
            dataService.localCache.loadData.mockResolvedValueOnce(null);
            dataService.syncManager.syncFromCloud.mockRejectedValueOnce(new Error('No gist configured'));

            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            await expect(dataService.loadCollection()).rejects.toThrow(
                'Failed to load data: 404 Not Found'
            );
        });

        it('should handle invalid JSON', async () => {
            dataService.localCache.loadData.mockResolvedValueOnce(null);
            dataService.syncManager.syncFromCloud.mockRejectedValueOnce(new Error('No gist configured'));

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.reject(new SyntaxError('Invalid JSON'))
            });

            await expect(dataService.loadCollection()).rejects.toThrow(
                'Data format error: Invalid JSON structure'
            );
        });

        it('should handle invalid collection format', async () => {
            dataService.localCache.loadData.mockResolvedValueOnce(null);
            dataService.syncManager.syncFromCloud.mockRejectedValueOnce(new Error('No gist configured'));

            const invalidData = { invalid: 'data' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(invalidData)
            });

            await expect(dataService.loadCollection()).rejects.toThrow(
                'Invalid collection format: missing required fields'
            );
        });

        it('should skip invalid audiobook data and continue', async () => {
            dataService.localCache.loadData.mockResolvedValueOnce(null);
            dataService.syncManager.syncFromCloud.mockRejectedValueOnce(new Error('No gist configured'));

            const dataWithInvalidBook = {
                ...mockCollectionData,
                audiobooks: [
                    mockCollectionData.audiobooks[0],
                    { invalid: 'book data' }, // Invalid book
                    mockCollectionData.audiobooks[1]
                ]
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(dataWithInvalidBook)
            });

            const result = await dataService.loadCollection();
            expect(result.audiobooks).toHaveLength(2); // Should skip invalid book
        });

        it('should use custom filename when provided', async () => {
            dataService.localCache.loadData.mockResolvedValueOnce(null);
            dataService.syncManager.syncFromCloud.mockRejectedValueOnce(new Error('No gist configured'));

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockCollectionData)
            });

            await dataService.loadCollection('custom.json');

            expect(fetch).toHaveBeenCalledWith('/data/custom.json');
        });

        it('should load from cache when available', async () => {
            const cachedData = {
                metadata: {
                    version: '1.0',
                    lastModified: '2025-01-07T10:30:00Z'
                },
                audiobooks: mockCollectionData.audiobooks
            };

            dataService.localCache.loadData.mockResolvedValueOnce(cachedData);

            const result = await dataService.loadCollection();

            expect(result.version).toBe('1.0');
            expect(result.audiobooks).toHaveLength(2);
            expect(fetch).not.toHaveBeenCalled(); // Should not fetch from static file
        });
    });

    describe('loadMultipleCollections', () => {
        it('should load and merge multiple collections', async () => {
            const collection1 = {
                ...mockCollectionData,
                audiobooks: [mockCollectionData.audiobooks[0]]
            };
            const collection2 = {
                ...mockCollectionData,
                audiobooks: [mockCollectionData.audiobooks[1]]
            };

            fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(collection1)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(collection2)
                });

            const result = await dataService.loadMultipleCollections(['file1.json', 'file2.json']);

            expect(result.audiobooks).toHaveLength(2);
            expect(result.audiobooks[0].title).toBe('Test Book 1');
            expect(result.audiobooks[1].title).toBe('Test Book 2');
        });

        it('should handle partial failures gracefully', async () => {
            fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockCollectionData)
                })
                .mockRejectedValueOnce(new Error('Network error'));

            const result = await dataService.loadMultipleCollections(['file1.json', 'file2.json']);

            expect(result.audiobooks).toHaveLength(2); // Should still return data from successful load
        });

        it('should throw error if all collections fail to load', async () => {
            fetch
                .mockRejectedValueOnce(new Error('Error 1'))
                .mockRejectedValueOnce(new Error('Error 2'));

            await expect(
                dataService.loadMultipleCollections(['file1.json', 'file2.json'])
            ).rejects.toThrow('Failed to load any collections');
        });
    });

    describe('isValidCollection', () => {
        it('should validate correct collection format', () => {
            expect(dataService.isValidCollection(mockCollectionData)).toBe(true);
        });

        it('should reject invalid formats', () => {
            expect(dataService.isValidCollection(null)).toBe(false);
            expect(dataService.isValidCollection({})).toBe(false);
            expect(dataService.isValidCollection({ audiobooks: 'not-array' })).toBe(false);
            expect(dataService.isValidCollection({
                audiobooks: [],
                version: 123 // Should be string
            })).toBe(false);
        });
    });

    describe('mergeCollections', () => {
        it('should merge collections and remove duplicates', () => {
            const collection1 = {
                version: '1.0',
                lastUpdated: '2025-01-07T10:30:00Z',
                audiobooks: [{ id: 'book1', title: 'Book 1' }],
                customGenres: ['genre1'],
                customMoods: ['mood1']
            };

            const collection2 = {
                version: '1.0',
                lastUpdated: '2025-01-07T11:30:00Z',
                audiobooks: [
                    { id: 'book1', title: 'Book 1 Updated' }, // Duplicate ID
                    { id: 'book2', title: 'Book 2' }
                ],
                customGenres: ['genre1', 'genre2'], // Some overlap
                customMoods: ['mood2']
            };

            const result = dataService.mergeCollections([collection1, collection2]);

            expect(result.audiobooks).toHaveLength(2); // Should remove duplicate
            expect(result.audiobooks[0].title).toBe('Book 1'); // First occurrence kept
            expect(result.customGenres).toEqual(['genre1', 'genre2']);
            expect(result.customMoods).toEqual(['mood1', 'mood2']);
        });

        it('should return empty collection for empty input', () => {
            const result = dataService.mergeCollections([]);
            expect(result.audiobooks).toEqual([]);
            expect(result.version).toBe('1.0');
        });

        it('should return single collection unchanged', () => {
            const result = dataService.mergeCollections([mockCollectionData]);
            expect(result).toEqual(mockCollectionData);
        });
    });

    describe('exportCollection', () => {
        it('should export collection as JSON string', () => {
            const collection = {
                version: '1.0',
                lastUpdated: '2025-01-07T10:30:00Z',
                audiobooks: [new Audiobook({ title: 'Test', author: 'Author' })],
                customGenres: [],
                customMoods: []
            };

            const result = dataService.exportCollection(collection);
            const parsed = JSON.parse(result);

            expect(parsed.version).toBe('1.0');
            expect(parsed.audiobooks[0].title).toBe('Test');
            expect(typeof result).toBe('string');
        });

        it('should handle export errors', () => {
            const circularRef = {};
            circularRef.self = circularRef;

            expect(() => dataService.exportCollection({ audiobooks: [circularRef] }))
                .toThrow('Failed to export collection');
        });
    });

    describe('importCollection', () => {
        it('should import and validate JSON string', async () => {
            const jsonString = JSON.stringify(mockCollectionData);
            const currentCollection = {
                version: '1.0',
                lastUpdated: '2025-01-07T09:30:00Z',
                audiobooks: [],
                customGenres: [],
                customMoods: []
            };

            const result = await dataService.importCollection(jsonString, currentCollection);

            expect(result.version).toBe('1.0');
            expect(result.audiobooks).toHaveLength(2);
            expect(result.audiobooks[0]).toBeInstanceOf(Audiobook);
            expect(dataService.localCache.saveData).toHaveBeenCalled();
        });

        it('should handle invalid JSON', async () => {
            await expect(dataService.importCollection('invalid json'))
                .rejects.toThrow('Invalid JSON format');
        });

        it('should handle invalid collection format', async () => {
            const invalidData = JSON.stringify({ invalid: 'data' });
            await expect(dataService.importCollection(invalidData))
                .rejects.toThrow('Invalid collection format');
        });
    });

    describe('sync-aware operations', () => {
        let mockCollection;

        beforeEach(() => {
            mockCollection = {
                version: '1.0',
                lastUpdated: '2025-01-07T10:30:00Z',
                audiobooks: [new Audiobook({ id: 'test-1', title: 'Test Book', author: 'Test Author' })],
                customGenres: [],
                customMoods: []
            };
        });

        describe('addAudiobook', () => {
            it('should add audiobook and trigger sync', async () => {
                const newBook = new Audiobook({ id: 'test-2', title: 'New Book', author: 'New Author' });

                const result = await dataService.addAudiobook(newBook, mockCollection);

                expect(result.audiobooks).toHaveLength(2);
                expect(result.audiobooks[1]).toBe(newBook);
                expect(dataService.localCache.saveData).toHaveBeenCalled();
            });
        });

        describe('updateAudiobook', () => {
            it('should update audiobook and trigger sync', async () => {
                const updatedBook = new Audiobook({
                    id: 'test-1',
                    title: 'Updated Book',
                    author: 'Test Author'
                });

                const result = await dataService.updateAudiobook(updatedBook, mockCollection);

                expect(result.audiobooks[0].title).toBe('Updated Book');
                expect(dataService.localCache.saveData).toHaveBeenCalled();
            });

            it('should throw error if audiobook not found', async () => {
                const nonExistentBook = new Audiobook({
                    id: 'non-existent',
                    title: 'Not Found',
                    author: 'Unknown'
                });

                await expect(dataService.updateAudiobook(nonExistentBook, mockCollection))
                    .rejects.toThrow('Audiobook not found in collection');
            });
        });

        describe('removeAudiobook', () => {
            it('should remove audiobook and trigger sync', async () => {
                const result = await dataService.removeAudiobook('test-1', mockCollection);

                expect(result.audiobooks).toHaveLength(0);
                expect(dataService.localCache.saveData).toHaveBeenCalled();
            });

            it('should throw error if audiobook not found', async () => {
                await expect(dataService.removeAudiobook('non-existent', mockCollection))
                    .rejects.toThrow('Audiobook not found in collection');
            });
        });

        describe('getSyncStatus', () => {
            it('should return sync status', async () => {
                await dataService.initialize();
                const status = await dataService.getSyncStatus();

                expect(status.isInitialized).toBe(true);
            });
        });

        describe('manualSync', () => {
            it('should trigger manual sync', async () => {
                const result = await dataService.manualSync();

                expect(dataService.syncManager.sync).toHaveBeenCalled();
                expect(result.success).toBe(true);
            });
        });
    });

    describe('createEmptyCollection', () => {
        it('should create valid empty collection', () => {
            const result = dataService.createEmptyCollection();

            expect(result.version).toBe('1.0');
            expect(result.audiobooks).toEqual([]);
            expect(result.customGenres).toEqual([]);
            expect(result.customMoods).toEqual([]);
            expect(result.lastUpdated).toBeDefined();
        });
    });
});