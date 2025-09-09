import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncManager } from './SyncManager.js';
import GitHubGistService from './GitHubGistService.js';
import { LocalCacheService } from './LocalCacheService.js';
import GistManager from './GistManager.js';
import { OfflineQueueService } from './OfflineQueueService.js';
import { NetworkErrorHandler } from './NetworkErrorHandler.js';

// Mock the dependencies
vi.mock('./GitHubGistService.js');
vi.mock('./LocalCacheService.js');
vi.mock('./GistManager.js');
vi.mock('./OfflineQueueService.js');
vi.mock('./NetworkErrorHandler.js');

// Mock browser APIs
const mockWindow = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
};

const mockDocument = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    hidden: false
};

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
};

// Set up global mocks
global.window = mockWindow;
global.document = mockDocument;
global.localStorage = localStorageMock;

// Mock navigator
Object.defineProperty(global, 'navigator', {
    value: { onLine: true },
    writable: true
});

describe('SyncManager', () => {
    let syncManager;
    let mockGistService;
    let mockLocalCache;
    let mockGistManager;

    const mockLocalData = {
        metadata: {
            version: '1.0',
            lastModified: '2024-01-15T10:00:00Z',
            deviceId: 'device-123',
            appVersion: '1.0.0',
            syncStatus: 'pending'
        },
        audiobooks: [
            { id: '1', title: 'Book 1', author: 'Author 1' },
            { id: '2', title: 'Book 2', author: 'Author 2' }
        ]
    };

    const mockRemoteData = {
        metadata: {
            version: '1.0',
            lastModified: '2024-01-15T11:00:00Z',
            deviceId: 'device-456',
            appVersion: '1.0.0',
            syncStatus: 'synced'
        },
        audiobooks: [
            { id: '1', title: 'Book 1', author: 'Author 1' },
            { id: '3', title: 'Book 3', author: 'Author 3' }
        ]
    };

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Reset browser API mocks
        mockWindow.addEventListener.mockClear();
        mockWindow.removeEventListener.mockClear();
        mockWindow.dispatchEvent.mockClear();
        mockDocument.addEventListener.mockClear();
        mockDocument.removeEventListener.mockClear();

        // Reset navigator
        Object.defineProperty(global, 'navigator', {
            value: { onLine: true },
            writable: true
        });

        // Create mock instances
        mockGistService = {
            readGist: vi.fn(),
            updateGist: vi.fn(),
            gistExists: vi.fn()
        };

        mockLocalCache = {
            loadData: vi.fn(),
            saveData: vi.fn(),
            updateSyncMetadata: vi.fn(),
            getSyncMetadata: vi.fn(),
            setLastSyncTime: vi.fn(),
            getDeviceId: vi.fn().mockReturnValue('device-123'),
            getCacheStats: vi.fn()
        };

        mockGistManager = {
            getGistId: vi.fn().mockReturnValue('test-gist-id')
        };

        // Mock OfflineQueueService
        const mockOfflineQueue = {
            enqueue: vi.fn(),
            dequeue: vi.fn(),
            processQueue: vi.fn().mockResolvedValue({ processed: 0, succeeded: 0, failed: 0, errors: [] }),
            getStats: vi.fn().mockResolvedValue({ totalOperations: 0, operationTypes: {}, oldestOperation: null, newestOperation: null, failedOperations: 0 }),
            size: vi.fn().mockResolvedValue(0),
            isEmpty: vi.fn().mockResolvedValue(true),
            clear: vi.fn()
        };

        // Mock NetworkErrorHandler
        const mockNetworkErrorHandler = {
            executeWithRetry: vi.fn().mockImplementation(async (operation) => {
                try {
                    return await operation();
                } catch (error) {
                    // For tests, just re-throw the original error
                    throw error;
                }
            }),
            formatErrorForUser: vi.fn().mockReturnValue({ title: 'Error', message: 'Test error', category: 'unknown', recoveryActions: [], technicalDetails: 'Test', canRetry: false, timestamp: new Date().toISOString() }),
            getRetryStats: vi.fn().mockReturnValue({ activeRetries: 0, operations: [] }),
            clearRetryTracking: vi.fn()
        };

        // Mock constructors
        GitHubGistService.mockImplementation(() => mockGistService);
        LocalCacheService.mockImplementation(() => mockLocalCache);
        GistManager.mockImplementation(() => mockGistManager);
        OfflineQueueService.mockImplementation(() => mockOfflineQueue);
        NetworkErrorHandler.mockImplementation(() => mockNetworkErrorHandler);

        // Mock navigator.onLine
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });

        syncManager = new SyncManager();
    });

    afterEach(() => {
        if (syncManager) {
            syncManager.destroy();
        }
    });

    describe('initialization', () => {
        it('should initialize with default configuration', async () => {
            mockLocalCache.updateSyncMetadata.mockResolvedValue();

            await syncManager.initialize();

            expect(syncManager.isInitialized).toBe(true);
            expect(syncManager.syncInterval).toBe(30000);
            expect(mockLocalCache.updateSyncMetadata).toHaveBeenCalledWith({
                conflictResolution: 'manual',
                syncInterval: 30000,
                initialized: true
            });
        });

        it('should initialize with custom configuration', async () => {
            mockLocalCache.updateSyncMetadata.mockResolvedValue();

            await syncManager.initialize({
                syncInterval: 60000,
                conflictResolution: 'auto-local'
            });

            expect(syncManager.syncInterval).toBe(60000);
            expect(mockLocalCache.updateSyncMetadata).toHaveBeenCalledWith({
                conflictResolution: 'auto-local',
                syncInterval: 60000,
                initialized: true
            });
        });

        it('should handle initialization errors', async () => {
            mockLocalCache.updateSyncMetadata.mockRejectedValue(new Error('Storage error'));

            await expect(syncManager.initialize()).rejects.toThrow('Failed to initialize sync manager: Storage error');
        });
    });

    describe('sync operations', () => {
        beforeEach(async () => {
            mockLocalCache.updateSyncMetadata.mockResolvedValue();
            await syncManager.initialize();
        });

        it('should perform successful sync when local is newer', async () => {
            mockGistService.gistExists.mockResolvedValue(true);
            mockLocalCache.loadData.mockResolvedValue(mockLocalData);
            mockGistService.readGist.mockResolvedValue({
                ...mockRemoteData,
                metadata: { ...mockRemoteData.metadata, lastModified: '2024-01-15T09:00:00Z' }
            });
            mockGistService.updateGist.mockResolvedValue();
            mockLocalCache.setLastSyncTime.mockResolvedValue();

            const result = await syncManager.sync();

            expect(result.direction).toBe('push');
            expect(result.success).toBe(true);
            expect(mockGistService.updateGist).toHaveBeenCalledWith('test-gist-id', mockLocalData);
        });

        it('should perform successful sync when remote is newer', async () => {
            mockGistService.gistExists.mockResolvedValue(true);
            mockLocalCache.loadData.mockResolvedValue({
                ...mockLocalData,
                metadata: { ...mockLocalData.metadata, lastModified: '2024-01-15T09:00:00Z' }
            });
            mockGistService.readGist.mockResolvedValue(mockRemoteData);
            mockLocalCache.saveData.mockResolvedValue();
            mockLocalCache.setLastSyncTime.mockResolvedValue();

            const result = await syncManager.sync();

            expect(result.direction).toBe('pull');
            expect(result.success).toBe(true);
            expect(mockLocalCache.saveData).toHaveBeenCalledWith(mockRemoteData, { updateTimestamp: false });
        });

        it('should handle sync when no gist ID is configured', async () => {
            mockGistManager.getGistId.mockReturnValue(null);

            await expect(syncManager.sync()).rejects.toThrow('No gist ID configured. Please set up a gist first.');
        });

        it('should handle sync when gist does not exist', async () => {
            mockGistService.gistExists.mockResolvedValue(false);

            await expect(syncManager.sync()).rejects.toThrow('Configured gist not found or not accessible');
        });

        it('should prevent concurrent sync operations', async () => {
            mockGistService.gistExists.mockResolvedValue(true);
            mockLocalCache.loadData.mockResolvedValue(mockLocalData);
            mockGistService.readGist.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            const syncPromise1 = syncManager.sync();

            await expect(syncManager.sync()).rejects.toThrow('Sync already in progress');

            // Clean up
            await syncPromise1.catch(() => { });
        });
    });

    describe('conflict detection', () => {
        beforeEach(async () => {
            mockLocalCache.updateSyncMetadata.mockResolvedValue();
            await syncManager.initialize();
        });

        it('should detect no conflict when same device', () => {
            const localData = { ...mockLocalData };
            const remoteData = { ...mockRemoteData, metadata: { ...mockRemoteData.metadata, deviceId: 'device-123' } };

            const conflict = syncManager.detectConflict(localData, remoteData);

            expect(conflict).toBeNull();
        });

        it('should detect no conflict when timestamps are far apart', () => {
            const localData = { ...mockLocalData };
            const remoteData = {
                ...mockRemoteData,
                metadata: { ...mockRemoteData.metadata, lastModified: '2024-01-15T12:00:00Z' }
            };

            const conflict = syncManager.detectConflict(localData, remoteData);

            expect(conflict).toBeNull();
        });

        it('should detect conflict when concurrent modifications', () => {
            const localData = { ...mockLocalData };
            const remoteData = {
                ...mockRemoteData,
                metadata: { ...mockRemoteData.metadata, lastModified: '2024-01-15T10:00:30Z' }
            };

            const conflict = syncManager.detectConflict(localData, remoteData);

            expect(conflict).not.toBeNull();
            expect(conflict.type).toBe('concurrent_modification');
            expect(conflict.localDeviceId).toBe('device-123');
            expect(conflict.remoteDeviceId).toBe('device-456');
        });

        it('should detect no conflict when data is identical', () => {
            const localData = { ...mockLocalData };
            const remoteData = {
                ...mockLocalData,
                metadata: { ...mockLocalData.metadata, deviceId: 'device-456', lastModified: '2024-01-15T10:00:30Z' }
            };

            const conflict = syncManager.detectConflict(localData, remoteData);

            expect(conflict).toBeNull();
        });
    });

    describe('conflict resolution', () => {
        beforeEach(async () => {
            mockLocalCache.updateSyncMetadata.mockResolvedValue();
            await syncManager.initialize();
        });

        it('should resolve conflict by keeping local data', async () => {
            mockGistService.updateGist.mockResolvedValue();

            const result = await syncManager.resolveConflict('keep-local', mockLocalData, mockRemoteData);

            expect(result.resolution).toBe('keep-local');
            expect(result.resolved).toBe(true);
            expect(mockGistService.updateGist).toHaveBeenCalledWith('test-gist-id', mockLocalData);
        });

        it('should resolve conflict by keeping remote data', async () => {
            mockLocalCache.saveData.mockResolvedValue();

            const result = await syncManager.resolveConflict('keep-remote', mockLocalData, mockRemoteData);

            expect(result.resolution).toBe('keep-remote');
            expect(result.resolved).toBe(true);
            expect(mockLocalCache.saveData).toHaveBeenCalledWith(mockRemoteData, { updateTimestamp: false });
        });

        it('should resolve conflict by merging data', async () => {
            mockLocalCache.saveData.mockResolvedValue();
            mockGistService.updateGist.mockResolvedValue();

            const result = await syncManager.resolveConflict('merge', mockLocalData, mockRemoteData);

            expect(result.resolution).toBe('merge');
            expect(result.resolved).toBe(true);
            expect(mockLocalCache.saveData).toHaveBeenCalled();
            expect(mockGistService.updateGist).toHaveBeenCalled();
        });

        it('should handle unknown resolution strategy', async () => {
            await expect(syncManager.resolveConflict('unknown', mockLocalData, mockRemoteData))
                .rejects.toThrow('Unknown conflict resolution strategy: unknown');
        });
    });

    describe('data merging', () => {
        beforeEach(async () => {
            mockLocalCache.updateSyncMetadata.mockResolvedValue();
            await syncManager.initialize();
        });

        it('should merge data correctly with overlapping books', () => {
            const localData = {
                ...mockLocalData,
                audiobooks: [
                    { id: '1', title: 'Book 1', lastModified: '2024-01-15T10:30:00Z' },
                    { id: '2', title: 'Book 2', lastModified: '2024-01-15T10:00:00Z' }
                ]
            };

            const remoteData = {
                ...mockRemoteData,
                audiobooks: [
                    { id: '1', title: 'Book 1 Updated', lastModified: '2024-01-15T10:15:00Z' },
                    { id: '3', title: 'Book 3', lastModified: '2024-01-15T10:00:00Z' }
                ]
            };

            const merged = syncManager.mergeData(localData, remoteData);

            expect(merged.audiobooks).toHaveLength(3);

            // Book 1 should use local version (newer)
            const book1 = merged.audiobooks.find(b => b.id === '1');
            expect(book1.title).toBe('Book 1');

            // Book 2 should be included from local
            const book2 = merged.audiobooks.find(b => b.id === '2');
            expect(book2.title).toBe('Book 2');

            // Book 3 should be included from remote
            const book3 = merged.audiobooks.find(b => b.id === '3');
            expect(book3.title).toBe('Book 3');
        });

        it('should handle books with only dateAdded when lastModified is missing', () => {
            const localData = {
                ...mockLocalData,
                audiobooks: [
                    { id: '1', title: 'Book 1', dateAdded: '2024-01-15T10:30:00Z' }
                ]
            };

            const remoteData = {
                ...mockRemoteData,
                audiobooks: [
                    { id: '1', title: 'Book 1 Updated', dateAdded: '2024-01-15T10:15:00Z' }
                ]
            };

            const merged = syncManager.mergeData(localData, remoteData);

            expect(merged.audiobooks).toHaveLength(1);
            const book1 = merged.audiobooks.find(b => b.id === '1');
            expect(book1.title).toBe('Book 1'); // Local is newer
        });
    });

    describe('auto sync', () => {
        beforeEach(async () => {
            mockLocalCache.updateSyncMetadata.mockResolvedValue();
            await syncManager.initialize();
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should start auto sync with default interval', () => {
            const eventSpy = vi.fn();
            syncManager.on('autoSyncStarted', eventSpy);

            syncManager.startAutoSync();

            expect(eventSpy).toHaveBeenCalledWith({ interval: 30000 });
            expect(syncManager.autoSyncTimer).not.toBeNull();
        });

        it('should start auto sync with custom interval', () => {
            const eventSpy = vi.fn();
            syncManager.on('autoSyncStarted', eventSpy);

            syncManager.startAutoSync(60000);

            expect(eventSpy).toHaveBeenCalledWith({ interval: 60000 });
        });

        it('should stop auto sync', () => {
            const eventSpy = vi.fn();
            syncManager.on('autoSyncStopped', eventSpy);

            syncManager.startAutoSync();
            syncManager.stopAutoSync();

            expect(eventSpy).toHaveBeenCalled();
            expect(syncManager.autoSyncTimer).toBeNull();
        });

        it('should perform auto sync at intervals', async () => {
            mockGistService.gistExists.mockResolvedValue(true);
            mockLocalCache.loadData.mockResolvedValue(mockLocalData);
            mockGistService.readGist.mockResolvedValue(mockRemoteData);
            mockLocalCache.saveData.mockResolvedValue();
            mockLocalCache.setLastSyncTime.mockResolvedValue();

            const syncSpy = vi.spyOn(syncManager, 'sync').mockResolvedValue({ success: true });

            syncManager.startAutoSync(100); // Shorter interval for testing

            // Fast forward time once
            vi.advanceTimersByTime(100);

            // Stop auto sync immediately
            syncManager.stopAutoSync();

            expect(syncSpy).toHaveBeenCalled();
        });

        it('should not auto sync when offline', async () => {
            // Set SyncManager to offline state
            syncManager.isOnline = false;

            const syncSpy = vi.spyOn(syncManager, 'sync');
            syncManager.startAutoSync(100); // Shorter interval for testing

            vi.advanceTimersByTime(100);

            // Stop auto sync immediately
            syncManager.stopAutoSync();

            expect(syncSpy).not.toHaveBeenCalled();

            // Restore online state
            syncManager.isOnline = true;
        });
    });

    describe('sync status', () => {
        beforeEach(async () => {
            mockLocalCache.updateSyncMetadata.mockResolvedValue();
            mockLocalCache.getSyncMetadata.mockResolvedValue({
                lastSyncTime: '2024-01-15T10:00:00Z',
                syncStatus: 'synced',
                conflictResolution: 'manual'
            });
            mockLocalCache.getCacheStats.mockResolvedValue({
                deviceId: 'device-123',
                hasData: true,
                cacheSize: 1024
            });
            await syncManager.initialize();
        });

        it('should return comprehensive sync status', async () => {
            const status = await syncManager.getSyncStatus();

            expect(status).toEqual({
                isInitialized: true,
                isSyncing: false,
                isAutoSyncEnabled: false,
                syncInterval: 30000,
                lastSyncTime: '2024-01-15T10:00:00Z',
                syncStatus: 'synced',
                conflictResolution: 'manual',
                deviceId: 'device-123',
                hasGistId: true,
                isOnline: true,
                cacheStats: {
                    deviceId: 'device-123',
                    hasData: true,
                    cacheSize: 1024
                },
                offlineQueue: {
                    size: 0,
                    isEmpty: true,
                    stats: {
                        totalOperations: 0,
                        operationTypes: {},
                        oldestOperation: null,
                        newestOperation: null,
                        failedOperations: 0
                    },
                    isProcessing: false
                },
                lastSyncError: null,
                networkRetryStats: {
                    activeRetries: 0,
                    operations: []
                }
            });
        });
    });

    describe('event handling', () => {
        it('should add and remove event listeners', () => {
            const callback = vi.fn();

            syncManager.on('test-event', callback);
            syncManager.emit('test-event', { data: 'test' });

            expect(callback).toHaveBeenCalledWith({ data: 'test' });

            syncManager.off('test-event', callback);
            syncManager.emit('test-event', { data: 'test2' });

            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should handle errors in event listeners gracefully', () => {
            const errorCallback = vi.fn(() => {
                throw new Error('Listener error');
            });
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            syncManager.on('test-event', errorCallback);
            syncManager.emit('test-event');

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error in event listener for test-event:',
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });
    });

    describe('network event handling', () => {
        beforeEach(async () => {
            mockLocalCache.updateSyncMetadata.mockResolvedValue();
            await syncManager.initialize();
        });

        it('should handle online event', () => {
            const eventSpy = vi.fn();
            syncManager.on('networkStatusChanged', eventSpy);

            // Directly call the event handler
            syncManager.handleOnline();

            expect(eventSpy).toHaveBeenCalledWith({ online: true });
        });

        it('should handle offline event', () => {
            const eventSpy = vi.fn();
            syncManager.on('networkStatusChanged', eventSpy);

            // Directly call the event handler
            syncManager.handleOffline();

            expect(eventSpy).toHaveBeenCalledWith({ online: false });
        });
    });

    describe('cleanup', () => {
        beforeEach(async () => {
            mockLocalCache.updateSyncMetadata.mockResolvedValue();
            await syncManager.initialize();
        });

        it('should clean up resources on destroy', () => {
            syncManager.startAutoSync();
            const eventSpy = vi.fn();
            syncManager.on('test-event', eventSpy);

            syncManager.destroy();

            expect(syncManager.isInitialized).toBe(false);
            expect(syncManager.autoSyncTimer).toBeNull();
            expect(syncManager.eventListeners.size).toBe(0);
        });
    });
});