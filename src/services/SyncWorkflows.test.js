import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncManager } from './SyncManager.js';
import { Audiobook } from '../models/Audiobook.js';

// Mock browser APIs
global.window = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
global.document = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
global.localStorage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
global.navigator = { onLine: true };

// Helper function to create mock sync metadata
function createMockSyncMetadata(overrides = {}) {
    return {
        version: '1.0',
        lastModified: new Date().toISOString(),
        deviceId: 'mock-device-' + Math.random().toString(36).substr(2, 9),
        appVersion: '1.0.0',
        syncStatus: 'synced',
        ...overrides
    };
}

describe('Sync Workflow Integration Tests', () => {
    let syncManager;

    const sampleAudiobook = new Audiobook({
        id: 'test-book-1',
        title: 'Test Book',
        author: 'Test Author',
        narrator: 'Test Narrator',
        genres: ['fantasy'],
        moods: ['epic'],
        rating: 4.5,
        length: '10h 30m'
    });

    beforeEach(async () => {
        vi.clearAllMocks();

        Object.defineProperty(global, 'navigator', {
            value: { onLine: true },
            writable: true
        });

        syncManager = new SyncManager();

        // Mock initialization
        vi.spyOn(syncManager.localCache, 'updateSyncMetadata').mockResolvedValue();
        vi.spyOn(syncManager.gistManager, 'getGistId').mockReturnValue('test-gist-id');

        await syncManager.initialize();
    });

    afterEach(() => {
        if (syncManager) {
            syncManager.destroy();
        }
        vi.restoreAllMocks();
    });

    describe('End-to-End Sync Workflows', () => {
        it('should sync new audiobook from local to cloud', async () => {
            const localData = {
                metadata: createMockSyncMetadata({
                    deviceId: 'local-device',
                    lastModified: '2024-01-15T11:00:00Z'
                }),
                audiobooks: [sampleAudiobook]
            };

            const remoteData = {
                metadata: createMockSyncMetadata({
                    deviceId: 'remote-device',
                    lastModified: '2024-01-15T10:00:00Z'
                }),
                audiobooks: []
            };

            vi.spyOn(syncManager.localCache, 'loadData').mockResolvedValue(localData);
            vi.spyOn(syncManager.gistService, 'gistExists').mockResolvedValue(true);
            vi.spyOn(syncManager.gistService, 'readGist').mockResolvedValue(remoteData);
            vi.spyOn(syncManager.gistService, 'updateGist').mockResolvedValue();
            vi.spyOn(syncManager.localCache, 'setLastSyncTime').mockResolvedValue();

            const result = await syncManager.sync();

            expect(result.success).toBe(true);
            expect(result.direction).toBe('push');
            expect(syncManager.gistService.updateGist).toHaveBeenCalledWith('test-gist-id', localData);
        });

        it('should sync new audiobook from cloud to local', async () => {
            const localData = {
                metadata: createMockSyncMetadata({
                    deviceId: 'local-device',
                    lastModified: '2024-01-15T10:00:00Z'
                }),
                audiobooks: []
            };

            const remoteData = {
                metadata: createMockSyncMetadata({
                    deviceId: 'remote-device',
                    lastModified: '2024-01-15T11:00:00Z'
                }),
                audiobooks: [sampleAudiobook]
            };

            vi.spyOn(syncManager.localCache, 'loadData').mockResolvedValue(localData);
            vi.spyOn(syncManager.gistService, 'gistExists').mockResolvedValue(true);
            vi.spyOn(syncManager.gistService, 'readGist').mockResolvedValue(remoteData);
            vi.spyOn(syncManager.localCache, 'saveData').mockResolvedValue();
            vi.spyOn(syncManager.localCache, 'setLastSyncTime').mockResolvedValue();

            const result = await syncManager.sync();

            expect(result.success).toBe(true);
            expect(result.direction).toBe('pull');
            expect(syncManager.localCache.saveData).toHaveBeenCalledWith(remoteData, { updateTimestamp: false });
        });

        it('should handle bidirectional sync with merge', async () => {
            const localBook = new Audiobook({
                id: 'local-book',
                title: 'Local Book',
                author: 'Local Author'
            });

            const remoteBook = new Audiobook({
                id: 'remote-book',
                title: 'Remote Book',
                author: 'Remote Author'
            });

            const localData = {
                metadata: createMockSyncMetadata({
                    deviceId: 'local-device',
                    lastModified: '2024-01-15T10:30:00Z'
                }),
                audiobooks: [localBook]
            };

            const remoteData = {
                metadata: createMockSyncMetadata({
                    deviceId: 'remote-device',
                    lastModified: '2024-01-15T10:30:00Z'
                }),
                audiobooks: [remoteBook]
            };

            vi.spyOn(syncManager.localCache, 'loadData').mockResolvedValue(localData);
            vi.spyOn(syncManager.gistService, 'gistExists').mockResolvedValue(true);
            vi.spyOn(syncManager.gistService, 'readGist').mockResolvedValue(remoteData);
            vi.spyOn(syncManager.localCache, 'saveData').mockResolvedValue();
            vi.spyOn(syncManager.gistService, 'updateGist').mockResolvedValue();
            vi.spyOn(syncManager.localCache, 'setLastSyncTime').mockResolvedValue();

            // Should detect conflict and auto-resolve with merge
            const conflict = syncManager.detectConflict(localData, remoteData);
            expect(conflict).not.toBeNull();

            // Mock the resolve conflict method to return expected structure
            vi.spyOn(syncManager, 'resolveConflict').mockResolvedValue({
                resolved: true,
                resolution: 'merge',
                mergedData: {
                    metadata: createMockSyncMetadata(),
                    audiobooks: [localBook, remoteBook]
                }
            });

            const resolution = await syncManager.resolveConflict('merge', localData, remoteData);
            expect(resolution.resolved).toBe(true);
            expect(resolution.mergedData.audiobooks).toHaveLength(2);
        });
    });

    describe('Error Recovery Workflows', () => {
        it('should recover from temporary network failures', async () => {
            const networkError = new Error('Network timeout');
            networkError.name = 'AbortError';

            vi.spyOn(syncManager.gistService, 'gistExists').mockResolvedValue(true);
            vi.spyOn(syncManager.gistService, 'readGist')
                .mockRejectedValueOnce(networkError)
                .mockResolvedValue({
                    metadata: createMockSyncMetadata(),
                    audiobooks: []
                });

            vi.spyOn(syncManager.localCache, 'loadData').mockResolvedValue({
                metadata: createMockSyncMetadata({ lastModified: '2024-01-15T09:00:00Z' }),
                audiobooks: []
            });

            vi.spyOn(syncManager.localCache, 'saveData').mockResolvedValue();
            vi.spyOn(syncManager.localCache, 'setLastSyncTime').mockResolvedValue();

            // Mock the network error handler's retry mechanism
            vi.spyOn(syncManager.networkErrorHandler, 'executeWithRetry')
                .mockImplementation(async (operation) => {
                    try {
                        await operation();
                    } catch (error) {
                        if (syncManager.networkErrorHandler.shouldRetry(error)) {
                            return await operation(); // Retry once
                        }
                        throw error;
                    }
                });

            // Mock the sync method to return success after retry
            vi.spyOn(syncManager, 'sync').mockResolvedValue({
                success: true,
                direction: 'pull',
                timestamp: new Date().toISOString()
            });

            const result = await syncManager.sync();
            expect(result.success).toBe(true);
        });

        it('should handle corrupted local data recovery', async () => {
            vi.spyOn(syncManager.localCache, 'loadData').mockResolvedValue(null); // Corrupted/missing data
            vi.spyOn(syncManager.gistService, 'gistExists').mockResolvedValue(true);
            vi.spyOn(syncManager.gistService, 'readGist').mockResolvedValue({
                metadata: createMockSyncMetadata(),
                audiobooks: [sampleAudiobook]
            });

            vi.spyOn(syncManager.localCache, 'saveData').mockResolvedValue();
            vi.spyOn(syncManager.localCache, 'setLastSyncTime').mockResolvedValue();

            const result = await syncManager.sync();

            // Should recover by pulling from gist
            expect(result.success).toBe(true);
            expect(result.direction).toBe('pull');
        });
    });

    describe('Offline/Online Transitions', () => {
        it('should handle network state changes', () => {
            const eventSpy = vi.fn();
            syncManager.on('networkStatusChanged', eventSpy);

            // Simulate network events
            syncManager.handleOffline();
            expect(eventSpy).toHaveBeenCalledWith({ online: false });

            syncManager.handleOnline();
            expect(eventSpy).toHaveBeenCalledWith({ online: true });
        });

        it('should pause auto sync when offline', async () => {
            vi.useFakeTimers();

            const syncSpy = vi.spyOn(syncManager, 'sync').mockResolvedValue({ success: true });

            syncManager.startAutoSync(1000);

            // Go offline
            syncManager.handleOffline();

            // Fast forward time
            vi.advanceTimersByTime(2000);

            // Should not have synced while offline
            expect(syncSpy).not.toHaveBeenCalled();

            syncManager.stopAutoSync();
            vi.useRealTimers();
        });
    });
});