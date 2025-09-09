import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalCacheService } from './LocalCacheService.js';
import { Audiobook } from '../models/Audiobook.js';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: vi.fn((index) => Object.keys(store)[index] || null)
    };
})();

// Mock global localStorage for Node.js environment
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
});

describe('LocalCacheService', () => {
    let cacheService;
    let sampleAudiobooks;
    let sampleData;

    beforeEach(() => {
        // Clear localStorage mock
        localStorageMock.clear();
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        localStorageMock.removeItem.mockClear();

        cacheService = new LocalCacheService();

        // Create sample audiobooks
        sampleAudiobooks = [
            new Audiobook({
                id: 'book1',
                title: 'Test Book 1',
                author: 'Test Author 1',
                narrator: 'Test Narrator 1',
                genres: ['fantasy'],
                moods: ['epic'],
                rating: 4.5,
                length: '10h 30m'
            }),
            new Audiobook({
                id: 'book2',
                title: 'Test Book 2',
                author: 'Test Author 2',
                narrator: 'Test Narrator 2',
                genres: ['sci-fi'],
                moods: ['fast-paced'],
                rating: 4.0,
                length: '8h 15m'
            })
        ];

        sampleData = {
            metadata: {
                version: '1.0',
                lastModified: '2024-01-15T10:30:00Z',
                deviceId: 'test-device-123',
                appVersion: '1.0.0',
                syncStatus: 'synced'
            },
            audiobooks: sampleAudiobooks
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Constructor and Device ID', () => {
        it('should initialize with correct storage keys', () => {
            expect(cacheService.storageKey).toBe('audiobook-library-cache');
            expect(cacheService.metadataKey).toBe('audiobook-sync-metadata');
            expect(cacheService.deviceIdKey).toBe('audiobook-device-id');
        });

        it('should generate device ID if not exists', () => {
            const deviceId = cacheService.getDeviceId();
            expect(deviceId).toMatch(/^device-[a-z0-9]+-[a-z0-9]+$/);
            expect(localStorageMock.setItem).toHaveBeenCalledWith('audiobook-device-id', deviceId);
        });

        it('should reuse existing device ID', () => {
            const existingId = 'device-existing-123';
            localStorageMock.setItem('audiobook-device-id', existingId);

            const newService = new LocalCacheService();
            expect(newService.getDeviceId()).toBe(existingId);
        });
    });

    describe('saveData', () => {
        it('should save data with correct structure', async () => {
            await cacheService.saveData(sampleData);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'audiobook-library-cache',
                expect.any(String)
            );

            // Find the call that saved the cache data (not device ID)
            const cacheCall = localStorageMock.setItem.mock.calls.find(call =>
                call[0] === 'audiobook-library-cache'
            );
            const savedData = JSON.parse(cacheCall[1]);
            expect(savedData.metadata.version).toBe('1.0');
            expect(savedData.metadata.deviceId).toMatch(/^device-/);
            expect(savedData.audiobooks).toHaveLength(2);
            expect(savedData.audiobooks[0].id).toBe('book1');
        });

        it('should update timestamp when updateTimestamp is true', async () => {
            const originalTime = sampleData.metadata.lastModified;

            // Wait a bit to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 1));

            await cacheService.saveData(sampleData, { updateTimestamp: true });

            const cacheCall = localStorageMock.setItem.mock.calls.find(call =>
                call[0] === 'audiobook-library-cache'
            );
            const savedData = JSON.parse(cacheCall[1]);
            expect(savedData.metadata.lastModified).not.toBe(originalTime);
        });

        it('should preserve timestamp when updateTimestamp is false', async () => {
            const originalTime = sampleData.metadata.lastModified;

            await cacheService.saveData(sampleData, { updateTimestamp: false });

            const cacheCall = localStorageMock.setItem.mock.calls.find(call =>
                call[0] === 'audiobook-library-cache'
            );
            const savedData = JSON.parse(cacheCall[1]);
            expect(savedData.metadata.lastModified).toBe(originalTime);
        });

        it('should handle Audiobook instances correctly', async () => {
            await cacheService.saveData(sampleData);

            const cacheCall = localStorageMock.setItem.mock.calls.find(call =>
                call[0] === 'audiobook-library-cache'
            );
            const savedData = JSON.parse(cacheCall[1]);
            expect(savedData.audiobooks[0]).toEqual(sampleAudiobooks[0].toJSON());
        });

        it('should throw error for invalid data', async () => {
            const invalidData = {
                audiobooks: [{ /* missing required fields */ }]
            };

            await expect(cacheService.saveData(invalidData)).rejects.toThrow('Each audiobook must have id and title');
        });

        it('should throw error when storage quota exceeded', async () => {
            // Mock QuotaExceededError
            localStorageMock.setItem.mockImplementationOnce(() => {
                const error = new Error('QuotaExceededError');
                error.name = 'QuotaExceededError';
                throw error;
            });

            await expect(cacheService.saveData(sampleData)).rejects.toThrow('Storage quota exceeded');
        });
    });

    describe('loadData', () => {
        it('should load and deserialize data correctly', async () => {
            // First save data
            await cacheService.saveData(sampleData);

            // Then load it
            const loadedData = await cacheService.loadData();

            expect(loadedData).toBeTruthy();
            expect(loadedData.metadata.version).toBe('1.0');
            expect(loadedData.audiobooks).toHaveLength(2);
            expect(loadedData.audiobooks[0]).toBeInstanceOf(Audiobook);
            expect(loadedData.audiobooks[0].id).toBe('book1');
        });

        it('should return null when no data exists', async () => {
            const loadedData = await cacheService.loadData();
            expect(loadedData).toBeNull();
        });

        it('should handle corrupted data gracefully', async () => {
            localStorageMock.setItem('audiobook-library-cache', 'invalid json');

            const loadedData = await cacheService.loadData();
            expect(loadedData).toBeNull();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('audiobook-library-cache');
        });

        it('should validate data structure and clear invalid data', async () => {
            const invalidData = { invalid: 'structure' };
            localStorageMock.setItem('audiobook-library-cache', JSON.stringify(invalidData));

            const loadedData = await cacheService.loadData();
            expect(loadedData).toBeNull();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('audiobook-library-cache');
        });

        it('should handle audiobooks with missing fields gracefully', async () => {
            const dataWithIncompleteBook = {
                metadata: {
                    version: '1.0',
                    lastModified: '2024-01-15T10:30:00Z',
                    deviceId: 'test-device',
                    appVersion: '1.0.0'
                },
                audiobooks: [
                    sampleAudiobooks[0].toJSON(),
                    { title: 'Incomplete Book', author: 'Some Author' }, // Incomplete but valid audiobook
                    sampleAudiobooks[1].toJSON()
                ]
            };

            localStorageMock.setItem('audiobook-library-cache', JSON.stringify(dataWithIncompleteBook));

            const loadedData = await cacheService.loadData();
            expect(loadedData.audiobooks).toHaveLength(3); // All audiobooks should be loaded
            expect(loadedData.audiobooks[1].title).toBe('Incomplete Book');
        });
    });

    describe('clearData', () => {
        it('should clear cache and metadata but keep device ID', async () => {
            await cacheService.saveData(sampleData);
            await cacheService.updateSyncMetadata({ test: 'data' });

            await cacheService.clearData();

            expect(localStorageMock.removeItem).toHaveBeenCalledWith('audiobook-library-cache');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('audiobook-sync-metadata');
            expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('audiobook-device-id');
        });
    });

    describe('Sync Timestamp Management', () => {
        it('should set and get last sync time', async () => {
            const timestamp = '2024-01-15T10:30:00Z';

            await cacheService.setLastSyncTime(timestamp);
            const retrievedTime = await cacheService.getLastSyncTime();

            expect(retrievedTime).toBe(timestamp);
        });

        it('should return null when no sync time exists', async () => {
            const syncTime = await cacheService.getLastSyncTime();
            expect(syncTime).toBeNull();
        });
    });

    describe('Sync Metadata Management', () => {
        it('should return default metadata when none exists', async () => {
            const metadata = await cacheService.getSyncMetadata();

            expect(metadata.lastSyncTime).toBeNull();
            expect(metadata.syncStatus).toBe('never');
            expect(metadata.conflictResolution).toBe('manual');
            expect(metadata.deviceId).toMatch(/^device-/);
        });

        it('should update metadata correctly', async () => {
            const updates = {
                lastSyncTime: '2024-01-15T10:30:00Z',
                syncStatus: 'synced',
                audiobookCount: 5
            };

            await cacheService.updateSyncMetadata(updates);
            const metadata = await cacheService.getSyncMetadata();

            expect(metadata.lastSyncTime).toBe(updates.lastSyncTime);
            expect(metadata.syncStatus).toBe(updates.syncStatus);
            expect(metadata.audiobookCount).toBe(updates.audiobookCount);
            expect(metadata.lastUpdated).toBeTruthy();
        });

        it('should merge updates with existing metadata', async () => {
            await cacheService.updateSyncMetadata({ syncStatus: 'synced' });
            await cacheService.updateSyncMetadata({ audiobookCount: 10 });

            const metadata = await cacheService.getSyncMetadata();
            expect(metadata.syncStatus).toBe('synced');
            expect(metadata.audiobookCount).toBe(10);
        });
    });

    describe('Cache Statistics', () => {
        it('should return correct stats when data exists', async () => {
            await cacheService.saveData(sampleData);

            const stats = await cacheService.getCacheStats();

            expect(stats.hasData).toBe(true);
            expect(stats.cacheSize).toBeGreaterThan(0);
            expect(stats.audiobookCount).toBe(2);
            expect(stats.deviceId).toMatch(/^device-/);
            expect(stats.lastCacheUpdate).toBeTruthy();
        });

        it('should return correct stats when no data exists', async () => {
            const stats = await cacheService.getCacheStats();

            expect(stats.hasData).toBe(false);
            expect(stats.cacheSize).toBe(0);
            expect(stats.audiobookCount).toBe(0);
            expect(stats.lastCacheUpdate).toBeNull();
        });
    });

    describe('hasData', () => {
        it('should return true when data exists', async () => {
            await cacheService.saveData(sampleData);
            const hasData = await cacheService.hasData();
            expect(hasData).toBe(true);
        });

        it('should return false when no data exists', async () => {
            const hasData = await cacheService.hasData();
            expect(hasData).toBe(false);
        });
    });

    describe('cleanup', () => {
        it('should clear old cache data', async () => {
            // Save data with old timestamp
            await cacheService.saveData(sampleData);

            // Mock old cache update time (8 days ago)
            const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
            await cacheService.updateSyncMetadata({ lastCacheUpdate: eightDaysAgo });

            await cacheService.cleanup();

            expect(localStorageMock.removeItem).toHaveBeenCalledWith('audiobook-library-cache');
        });

        it('should not clear recent cache data', async () => {
            await cacheService.saveData(sampleData);

            // Recent cache update
            await cacheService.updateSyncMetadata({ lastCacheUpdate: new Date().toISOString() });

            await cacheService.cleanup();

            expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('audiobook-library-cache');
        });
    });

    describe('Static Methods', () => {
        it('should detect localStorage availability', () => {
            expect(LocalCacheService.isStorageAvailable()).toBe(true);
        });

        it('should handle localStorage unavailability', () => {
            // Mock localStorage failure
            const originalSetItem = localStorageMock.setItem;
            localStorageMock.setItem.mockImplementationOnce(() => {
                throw new Error('Storage not available');
            });

            expect(LocalCacheService.isStorageAvailable()).toBe(false);

            // Restore original implementation
            localStorageMock.setItem = originalSetItem;
        });
    });

    describe('Data Validation', () => {
        it('should validate cache data structure correctly', () => {
            const validData = {
                metadata: {
                    version: '1.0',
                    lastModified: '2024-01-15T10:30:00Z',
                    deviceId: 'test-device',
                    appVersion: '1.0.0'
                },
                audiobooks: []
            };

            expect(cacheService.isValidCacheData(validData)).toBe(true);
        });

        it('should reject invalid cache data structure', () => {
            const invalidData = {
                metadata: {
                    version: '1.0'
                    // Missing required fields
                },
                audiobooks: []
            };

            expect(cacheService.isValidCacheData(invalidData)).toBe(false);
        });

        it('should validate audiobook data before saving', async () => {
            const invalidAudiobookData = {
                metadata: {
                    version: '1.0',
                    lastModified: '2024-01-15T10:30:00Z',
                    deviceId: 'test-device',
                    appVersion: '1.0.0'
                },
                audiobooks: [
                    { title: 'Missing ID' } // Missing required id field
                ]
            };

            await expect(cacheService.saveData(invalidAudiobookData)).rejects.toThrow('Each audiobook must have id and title');
        });
    });
});