import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataManagementService } from './DataManagementService.js';

describe('DataManagementService', () => {
    let dataManagementService;
    let mockDataService;
    let mockSyncManager;
    let mockLocalCache;
    let mockGistService;
    let mockGistManager;

    beforeEach(() => {
        // Mock dependencies
        mockDataService = {
            getSyncManager: vi.fn()
        };

        mockSyncManager = {
            stop: vi.fn().mockResolvedValue(),
            getSyncStatus: vi.fn().mockResolvedValue({
                isInitialized: true,
                isSyncing: false,
                syncStatus: 'synced',
                lastSyncTime: new Date().toISOString()
            })
        };

        mockLocalCache = {
            clearData: vi.fn().mockResolvedValue(),
            getDeviceId: vi.fn().mockReturnValue('device-123'),
            loadData: vi.fn().mockResolvedValue({
                metadata: {
                    version: '1.0',
                    lastModified: new Date().toISOString(),
                    deviceId: 'device-123',
                    appVersion: '1.0.0'
                },
                audiobooks: [
                    { id: 'book-1', title: 'Test Book', author: 'Test Author' }
                ]
            }),
            saveData: vi.fn().mockResolvedValue(),
            getSyncMetadata: vi.fn().mockResolvedValue({
                lastSyncTime: new Date().toISOString(),
                syncStatus: 'synced',
                lastUpdated: new Date().toISOString()
            }),
            getCacheStats: vi.fn().mockResolvedValue({
                hasData: true,
                cacheSize: 1024,
                audiobookCount: 1,
                deviceId: 'device-123'
            })
        };

        mockGistService = {
            updateGist: vi.fn().mockResolvedValue(),
            gistExists: vi.fn().mockResolvedValue(true),
            readGist: vi.fn().mockResolvedValue({
                metadata: {
                    version: '1.0',
                    lastModified: new Date().toISOString(),
                    deviceId: 'device-456'
                },
                audiobooks: []
            }),
            getGistMetadata: vi.fn().mockResolvedValue({
                id: 'gist-123',
                description: 'Test Gist',
                public: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
        };

        mockGistManager = {
            getGistId: vi.fn().mockReturnValue('gist-123'),
            clearGistId: vi.fn()
        };

        dataManagementService = new DataManagementService(
            mockDataService,
            mockSyncManager,
            mockLocalCache,
            mockGistService,
            mockGistManager
        );
    });

    describe('clearAllData', () => {
        it('should clear local and cloud data successfully', async () => {
            const result = await dataManagementService.clearAllData({
                clearLocal: true,
                clearCloud: true,
                preserveGistConnection: false
            });

            expect(result.success).toBe(true);
            expect(result.operations).toContain('Local cache cleared');
            expect(result.operations).toContain('Cloud gist cleared');
            expect(result.operations).toContain('Gist connection cleared');
            expect(result.operations).toContain('Sync system stopped');
            expect(result.errors).toHaveLength(0);

            expect(mockLocalCache.clearData).toHaveBeenCalled();
            expect(mockGistService.updateGist).toHaveBeenCalledWith('gist-123', expect.objectContaining({
                audiobooks: [],
                metadata: expect.objectContaining({
                    syncStatus: 'cleared'
                })
            }));
            expect(mockGistManager.clearGistId).toHaveBeenCalled();
            expect(mockSyncManager.stop).toHaveBeenCalled();
        });

        it('should preserve gist connection when requested', async () => {
            const result = await dataManagementService.clearAllData({
                clearLocal: true,
                clearCloud: true,
                preserveGistConnection: true
            });

            expect(result.success).toBe(true);
            expect(result.operations).not.toContain('Gist connection cleared');
            expect(mockGistManager.clearGistId).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            mockLocalCache.clearData.mockRejectedValue(new Error('Cache clear failed'));

            const result = await dataManagementService.clearAllData();

            expect(result.success).toBe(false);
            expect(result.errors).toContain('Failed to clear local cache: Cache clear failed');
        });

        it('should skip cloud operations when no gist is configured', async () => {
            mockGistManager.getGistId.mockReturnValue(null);

            const result = await dataManagementService.clearAllData({
                clearCloud: true
            });

            expect(result.success).toBe(true);
            expect(mockGistService.updateGist).not.toHaveBeenCalled();
        });
    });

    describe('validateAndRepairData', () => {
        it('should validate data without issues', async () => {
            const result = await dataManagementService.validateAndRepairData();

            expect(result.isValid).toBe(true);
            expect(result.issues).toHaveLength(0);
            expect(result.repairs).toHaveLength(0);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect missing metadata', async () => {
            mockLocalCache.loadData.mockResolvedValue({
                audiobooks: []
                // Missing metadata
            });

            const result = await dataManagementService.validateAndRepairData();

            expect(result.isValid).toBe(false);
            expect(result.issues).toContainEqual(expect.objectContaining({
                type: 'missing_metadata',
                severity: 'high',
                location: 'local'
            }));
        });

        it('should detect duplicate audiobook IDs', async () => {
            mockLocalCache.loadData.mockResolvedValue({
                metadata: {
                    version: '1.0',
                    lastModified: new Date().toISOString(),
                    deviceId: 'device-123'
                },
                audiobooks: [
                    { id: 'book-1', title: 'Book 1' },
                    { id: 'book-1', title: 'Book 1 Duplicate' }
                ]
            });

            const result = await dataManagementService.validateAndRepairData();

            expect(result.isValid).toBe(false);
            expect(result.issues).toContainEqual(expect.objectContaining({
                type: 'duplicate_audiobook_id',
                severity: 'high',
                location: 'local'
            }));
        });

        it('should detect missing audiobook IDs', async () => {
            mockLocalCache.loadData.mockResolvedValue({
                metadata: {
                    version: '1.0',
                    lastModified: new Date().toISOString(),
                    deviceId: 'device-123'
                },
                audiobooks: [
                    { title: 'Book Without ID' }
                ]
            });

            const result = await dataManagementService.validateAndRepairData();

            expect(result.isValid).toBe(false);
            expect(result.issues).toContainEqual(expect.objectContaining({
                type: 'missing_audiobook_id',
                severity: 'high',
                location: 'local'
            }));
        });

        it('should repair missing metadata', async () => {
            mockLocalCache.loadData.mockResolvedValue({
                audiobooks: []
                // Missing metadata
            });

            const result = await dataManagementService.validateAndRepairData();

            expect(result.repairs).toContain('Repaired missing metadata in local');
            expect(mockLocalCache.saveData).toHaveBeenCalledWith(expect.objectContaining({
                metadata: expect.objectContaining({
                    version: '1.0',
                    deviceId: 'device-123'
                })
            }));
        });

        it('should handle validation errors', async () => {
            mockLocalCache.loadData.mockRejectedValue(new Error('Load failed'));

            const result = await dataManagementService.validateAndRepairData();

            expect(result.isValid).toBe(false);
            expect(result.issues).toContainEqual(expect.objectContaining({
                type: 'local_data_corruption',
                severity: 'critical'
            }));
        });
    });

    describe('getSyncStatistics', () => {
        it('should gather comprehensive sync statistics', async () => {
            const result = await dataManagementService.getSyncStatistics();

            expect(result).toHaveProperty('timestamp');
            expect(result).toHaveProperty('sync');
            expect(result).toHaveProperty('cache');
            expect(result).toHaveProperty('gist');
            expect(result).toHaveProperty('devices');
            expect(result).toHaveProperty('health');

            expect(result.sync).toEqual(expect.objectContaining({
                isInitialized: true,
                isSyncing: false,
                syncStatus: 'synced'
            }));

            expect(result.cache).toEqual(expect.objectContaining({
                hasData: true,
                deviceId: 'device-123'
            }));

            expect(result.gist).toEqual(expect.objectContaining({
                connected: true,
                id: 'gist-123'
            }));

            expect(result.health.overall).toBe('good');
        });

        it('should detect health issues', async () => {
            mockGistManager.getGistId.mockReturnValue(null);

            const result = await dataManagementService.getSyncStatistics();

            expect(result.gist.connected).toBe(false);
            expect(result.health.overall).toBe('warning');
            expect(result.health.issues).toContain('No gist connection configured');
        });

        it('should handle gist connection errors', async () => {
            mockGistService.getGistMetadata.mockRejectedValue(new Error('Gist not found'));

            const result = await dataManagementService.getSyncStatistics();

            expect(result.gist.connected).toBe(false);
            expect(result.gist.error).toBe('Gist not found');
        });

        it('should handle statistics gathering errors', async () => {
            mockSyncManager.getSyncStatus.mockRejectedValue(new Error('Sync error'));

            const result = await dataManagementService.getSyncStatistics();

            expect(result.error).toBe('Sync error');
            expect(result.health.overall).toBe('error');
        });
    });

    describe('getDeviceStatistics', () => {
        it('should gather device statistics', async () => {
            const result = await dataManagementService.getDeviceStatistics();

            expect(result.currentDevice).toBe('device-123');
            expect(result.knownDevices).toHaveLength(2); // local + cloud device
            expect(result.totalDevices).toBe(2);

            const currentDevice = result.knownDevices.find(d => d.isCurrent);
            expect(currentDevice).toBeDefined();
            expect(currentDevice.id).toBe('device-123');
        });

        it('should handle missing cloud data', async () => {
            mockGistManager.getGistId.mockReturnValue(null);

            const result = await dataManagementService.getDeviceStatistics();

            expect(result.knownDevices).toHaveLength(1); // only local device
            expect(result.totalDevices).toBe(1);
        });

        it('should handle device statistics errors', async () => {
            mockLocalCache.getSyncMetadata.mockRejectedValue(new Error('Metadata error'));

            const result = await dataManagementService.getDeviceStatistics();

            expect(result.error).toBe('Metadata error');
        });
    });

    describe('cleanupOldDevices', () => {
        it('should complete device cleanup', async () => {
            const result = await dataManagementService.cleanupOldDevices({ maxAge: 30 });

            expect(result.success).toBe(true);
            expect(result.devicesRemoved).toBe(0);
            expect(result.message).toContain('Device cleanup completed');
        });

        it('should handle cleanup errors', async () => {
            mockLocalCache.getSyncMetadata.mockRejectedValue(new Error('Cleanup error'));

            const result = await dataManagementService.cleanupOldDevices();

            expect(result.success).toBe(false);
            expect(result.errors).toContain('Device cleanup failed: Cleanup error');
        });
    });

    describe('generateAudiobookId', () => {
        it('should generate valid IDs from title and author', () => {
            const id1 = dataManagementService.generateAudiobookId('Test Book', 'Test Author');
            const id2 = dataManagementService.generateAudiobookId('Another Book', 'Another Author');

            expect(id1).toMatch(/^test-book-test-author-[a-z0-9]+$/);
            expect(id2).toMatch(/^another-book-another-author-[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });

        it('should handle missing title or author', () => {
            const id1 = dataManagementService.generateAudiobookId('', 'Author');
            const id2 = dataManagementService.generateAudiobookId('Title', '');
            const id3 = dataManagementService.generateAudiobookId('', '');

            expect(id1).toMatch(/^untitled-author-[a-z0-9]+$/);
            expect(id2).toMatch(/^title-unknown-[a-z0-9]+$/);
            expect(id3).toMatch(/^untitled-unknown-[a-z0-9]+$/);
        });
    });
});