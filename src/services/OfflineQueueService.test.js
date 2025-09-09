import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineQueueService } from './OfflineQueueService.js';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
};

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
});

describe('OfflineQueueService', () => {
    let service;

    beforeEach(() => {
        service = new OfflineQueueService();
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        localStorageMock.removeItem.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('enqueue', () => {
        it('should add operation to empty queue', async () => {
            localStorageMock.getItem.mockReturnValue(null);

            const operation = {
                type: 'add',
                id: 'test-1',
                data: { title: 'Test Book' },
                timestamp: '2024-01-01T00:00:00Z'
            };

            await service.enqueue(operation);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'audiobook-offline-queue',
                expect.stringContaining('"type":"add"')
            );
        });

        it('should replace existing operation with same type and id', async () => {
            const existingQueue = [{
                type: 'add',
                id: 'test-1',
                data: { title: 'Old Book' },
                timestamp: '2024-01-01T00:00:00Z',
                queuedAt: '2024-01-01T00:00:00Z',
                retryCount: 0
            }];

            localStorageMock.getItem.mockReturnValue(JSON.stringify(existingQueue));

            const newOperation = {
                type: 'add',
                id: 'test-1',
                data: { title: 'New Book' },
                timestamp: '2024-01-01T01:00:00Z'
            };

            await service.enqueue(newOperation);

            const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedData).toHaveLength(1);
            expect(savedData[0].data.title).toBe('New Book');
        });

        it('should limit queue size to maxQueueSize', async () => {
            service.maxQueueSize = 2;

            const existingQueue = [
                { type: 'add', id: 'old-1', data: {}, timestamp: '2024-01-01T00:00:00Z' },
                { type: 'add', id: 'old-2', data: {}, timestamp: '2024-01-01T00:01:00Z' }
            ];

            localStorageMock.getItem.mockReturnValue(JSON.stringify(existingQueue));

            const newOperation = {
                type: 'add',
                id: 'new-1',
                data: {},
                timestamp: '2024-01-01T00:02:00Z'
            };

            await service.enqueue(newOperation);

            const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedData).toHaveLength(2);
            expect(savedData[0].id).toBe('old-2'); // First item removed
            expect(savedData[1].id).toBe('new-1'); // New item added
        });
    });

    describe('dequeue', () => {
        it('should return and remove first operation from queue', async () => {
            const queue = [
                { type: 'add', id: 'test-1', data: {}, timestamp: '2024-01-01T00:00:00Z' },
                { type: 'add', id: 'test-2', data: {}, timestamp: '2024-01-01T00:01:00Z' }
            ];

            localStorageMock.getItem.mockReturnValue(JSON.stringify(queue));

            const operation = await service.dequeue();

            expect(operation.id).toBe('test-1');

            const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedData).toHaveLength(1);
            expect(savedData[0].id).toBe('test-2');
        });

        it('should return null for empty queue', async () => {
            localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

            const operation = await service.dequeue();

            expect(operation).toBeNull();
        });
    });

    describe('markOperationFailed', () => {
        it('should increment retry count and update error info', async () => {
            const queue = [{
                type: 'sync',
                id: 'test-1',
                data: {},
                timestamp: '2024-01-01T00:00:00Z',
                retryCount: 1
            }];

            localStorageMock.getItem.mockReturnValue(JSON.stringify(queue));

            const operation = { id: 'test-1', type: 'sync' };
            const error = new Error('Network error');

            const shouldRetry = await service.markOperationFailed(operation, error);

            expect(shouldRetry).toBe(true);

            const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedData[0].retryCount).toBe(2);
            expect(savedData[0].lastError).toBe('Network error');
        });

        it('should remove operation after max retries', async () => {
            const queue = [{
                type: 'add',
                id: 'test-1',
                data: {},
                timestamp: '2024-01-01T00:00:00Z',
                retryCount: 2 // Already at max for 'add' operations (3)
            }];

            localStorageMock.getItem.mockReturnValue(JSON.stringify(queue));

            const operation = { id: 'test-1', type: 'add' };
            const error = new Error('Network error');

            const shouldRetry = await service.markOperationFailed(operation, error);

            expect(shouldRetry).toBe(false);

            const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedData).toHaveLength(0); // Operation removed
        });
    });

    describe('getRetryableOperations', () => {
        it('should return operations ready for retry based on backoff', async () => {
            const now = new Date();
            const oldRetry = new Date(now.getTime() - 5000); // 5 seconds ago
            const recentRetry = new Date(now.getTime() - 500); // 0.5 seconds ago

            const queue = [
                {
                    type: 'add',
                    id: 'ready-1',
                    retryCount: 1,
                    lastRetryAt: oldRetry.toISOString()
                },
                {
                    type: 'add',
                    id: 'not-ready-1',
                    retryCount: 1,
                    lastRetryAt: recentRetry.toISOString()
                },
                {
                    type: 'add',
                    id: 'never-tried-1'
                    // No lastRetryAt, should be ready
                }
            ];

            localStorageMock.getItem.mockReturnValue(JSON.stringify(queue));

            const retryable = await service.getRetryableOperations();

            expect(retryable).toHaveLength(2);
            expect(retryable.map(op => op.id)).toEqual(['ready-1', 'never-tried-1']);
        });
    });

    describe('processQueue', () => {
        it('should process retryable operations with processor function', async () => {
            const queue = [
                { type: 'add', id: 'test-1', data: { title: 'Book 1' } },
                { type: 'add', id: 'test-2', data: { title: 'Book 2' } }
            ];

            localStorageMock.getItem.mockReturnValue(JSON.stringify(queue));

            const processor = vi.fn().mockResolvedValue();
            const results = await service.processQueue(processor);

            expect(processor).toHaveBeenCalledTimes(2);
            expect(results.processed).toBe(2);
            expect(results.succeeded).toBe(2);
            expect(results.failed).toBe(0);
        });

        it('should handle processor failures and track retry attempts', async () => {
            const queue = [
                { type: 'add', id: 'test-1', data: { title: 'Book 1' } }
            ];

            localStorageMock.getItem.mockReturnValue(JSON.stringify(queue));

            const processor = vi.fn().mockRejectedValue(new Error('Processing failed'));
            const results = await service.processQueue(processor);

            expect(results.processed).toBe(1);
            expect(results.succeeded).toBe(0);
            expect(results.failed).toBe(1);
            expect(results.errors).toHaveLength(1);
            expect(results.errors[0].error).toBe('Processing failed');
        });
    });

    describe('getStats', () => {
        it('should return queue statistics', async () => {
            const queue = [
                { type: 'add', id: 'test-1', queuedAt: '2024-01-01T00:00:00Z', retryCount: 0 },
                { type: 'sync', id: 'test-2', queuedAt: '2024-01-01T00:01:00Z', retryCount: 1 },
                { type: 'add', id: 'test-3', queuedAt: '2024-01-01T00:02:00Z', retryCount: 0 }
            ];

            localStorageMock.getItem.mockReturnValue(JSON.stringify(queue));

            const stats = await service.getStats();

            expect(stats.totalOperations).toBe(3);
            expect(stats.operationTypes.add).toBe(2);
            expect(stats.operationTypes.sync).toBe(1);
            expect(stats.failedOperations).toBe(1);
            expect(stats.oldestOperation).toBe('2024-01-01T00:00:00Z');
            expect(stats.newestOperation).toBe('2024-01-01T00:02:00Z');
        });
    });
});