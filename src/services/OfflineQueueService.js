/**
 * OfflineQueueService - Manages queuing of operations when offline
 * Stores operations in localStorage and processes them when back online
 */
export class OfflineQueueService {
    constructor() {
        this.queueKey = 'audiobook-offline-queue';
        this.maxQueueSize = 100;
        this.retryAttempts = new Map(); // Track retry attempts per operation
    }

    /**
     * Add an operation to the offline queue
     * @param {Object} operation - Operation to queue
     * @param {string} operation.type - Operation type ('add', 'update', 'delete', 'sync')
     * @param {string} operation.id - Unique operation ID
     * @param {Object} operation.data - Operation data
     * @param {string} operation.timestamp - Operation timestamp
     * @returns {Promise<void>}
     */
    async enqueue(operation) {
        try {
            const queue = await this.getQueue();

            // Check for duplicate operations (same type and ID)
            const existingIndex = queue.findIndex(op =>
                op.type === operation.type &&
                op.id === operation.id
            );

            if (existingIndex !== -1) {
                // Replace existing operation with newer one
                queue[existingIndex] = {
                    ...operation,
                    timestamp: new Date().toISOString(),
                    queuedAt: new Date().toISOString()
                };
            } else {
                // Add new operation
                queue.push({
                    ...operation,
                    timestamp: operation.timestamp || new Date().toISOString(),
                    queuedAt: new Date().toISOString(),
                    retryCount: 0
                });
            }

            // Limit queue size
            if (queue.length > this.maxQueueSize) {
                queue.splice(0, queue.length - this.maxQueueSize);
            }

            await this.saveQueue(queue);

        } catch (error) {
            console.error('Failed to enqueue operation:', error);
            throw new Error(`Failed to queue operation: ${error.message}`);
        }
    }

    /**
     * Get the next operation from the queue
     * @returns {Promise<Object|null>} Next operation or null if queue is empty
     */
    async dequeue() {
        try {
            const queue = await this.getQueue();

            if (queue.length === 0) {
                return null;
            }

            const operation = queue.shift();
            await this.saveQueue(queue);

            return operation;

        } catch (error) {
            console.error('Failed to dequeue operation:', error);
            return null;
        }
    }

    /**
     * Peek at the next operation without removing it
     * @returns {Promise<Object|null>} Next operation or null if queue is empty
     */
    async peek() {
        try {
            const queue = await this.getQueue();
            return queue.length > 0 ? queue[0] : null;
        } catch (error) {
            console.error('Failed to peek at queue:', error);
            return null;
        }
    }

    /**
     * Get all operations in the queue
     * @returns {Promise<Array>} Array of queued operations
     */
    async getQueue() {
        try {
            const queueData = localStorage.getItem(this.queueKey);
            return queueData ? JSON.parse(queueData) : [];
        } catch (error) {
            console.error('Failed to load queue from storage:', error);
            return [];
        }
    }

    /**
     * Save the queue to localStorage
     * @param {Array} queue - Queue array to save
     * @returns {Promise<void>}
     */
    async saveQueue(queue) {
        try {
            localStorage.setItem(this.queueKey, JSON.stringify(queue));
        } catch (error) {
            console.error('Failed to save queue to storage:', error);
            throw new Error('Failed to save offline queue');
        }
    }

    /**
     * Get the size of the queue
     * @returns {Promise<number>} Number of operations in queue
     */
    async size() {
        const queue = await this.getQueue();
        return queue.length;
    }

    /**
     * Check if the queue is empty
     * @returns {Promise<boolean>} True if queue is empty
     */
    async isEmpty() {
        const size = await this.size();
        return size === 0;
    }

    /**
     * Clear all operations from the queue
     * @returns {Promise<void>}
     */
    async clear() {
        try {
            localStorage.removeItem(this.queueKey);
            this.retryAttempts.clear();
        } catch (error) {
            console.error('Failed to clear queue:', error);
        }
    }

    /**
     * Remove a specific operation from the queue
     * @param {string} operationId - ID of operation to remove
     * @returns {Promise<boolean>} True if operation was removed
     */
    async removeOperation(operationId) {
        try {
            const queue = await this.getQueue();
            const initialLength = queue.length;

            const filteredQueue = queue.filter(op => op.id !== operationId);

            if (filteredQueue.length !== initialLength) {
                await this.saveQueue(filteredQueue);
                this.retryAttempts.delete(operationId);
                return true;
            }

            return false;

        } catch (error) {
            console.error('Failed to remove operation from queue:', error);
            return false;
        }
    }

    /**
     * Mark an operation as failed and increment retry count
     * @param {Object} operation - Operation that failed
     * @param {Error} error - Error that occurred
     * @returns {Promise<boolean>} True if operation should be retried
     */
    async markOperationFailed(operation, error) {
        try {
            const queue = await this.getQueue();
            const operationIndex = queue.findIndex(op => op.id === operation.id);

            if (operationIndex !== -1) {
                queue[operationIndex].retryCount = (queue[operationIndex].retryCount || 0) + 1;
                queue[operationIndex].lastError = error.message;
                queue[operationIndex].lastRetryAt = new Date().toISOString();

                // Check if we should continue retrying
                const maxRetries = this.getMaxRetriesForOperation(operation.type);
                if (queue[operationIndex].retryCount >= maxRetries) {
                    // Remove from queue after max retries
                    queue.splice(operationIndex, 1);
                    await this.saveQueue(queue);
                    return false;
                }

                await this.saveQueue(queue);
                return true;
            }

            return false;

        } catch (error) {
            console.error('Failed to mark operation as failed:', error);
            return false;
        }
    }

    /**
     * Get maximum retry attempts for operation type
     * @param {string} operationType - Type of operation
     * @returns {number} Maximum retry attempts
     */
    getMaxRetriesForOperation(operationType) {
        switch (operationType) {
            case 'sync':
                return 5;
            case 'add':
            case 'update':
            case 'delete':
                return 3;
            default:
                return 3;
        }
    }

    /**
     * Get operations that are ready for retry (considering backoff)
     * @returns {Promise<Array>} Operations ready for retry
     */
    async getRetryableOperations() {
        try {
            const queue = await this.getQueue();
            const now = new Date();

            return queue.filter(operation => {
                if (!operation.lastRetryAt) {
                    return true; // Never retried, ready to try
                }

                const lastRetry = new Date(operation.lastRetryAt);
                const retryCount = operation.retryCount || 0;

                // Exponential backoff: 2^retryCount seconds
                const backoffMs = Math.pow(2, retryCount) * 1000;
                const nextRetryTime = new Date(lastRetry.getTime() + backoffMs);

                return now >= nextRetryTime;
            });

        } catch (error) {
            console.error('Failed to get retryable operations:', error);
            return [];
        }
    }

    /**
     * Get queue statistics
     * @returns {Promise<Object>} Queue statistics
     */
    async getStats() {
        try {
            const queue = await this.getQueue();
            const stats = {
                totalOperations: queue.length,
                operationTypes: {},
                oldestOperation: null,
                newestOperation: null,
                failedOperations: 0
            };

            if (queue.length > 0) {
                // Count by type
                queue.forEach(op => {
                    stats.operationTypes[op.type] = (stats.operationTypes[op.type] || 0) + 1;
                    if (op.retryCount > 0) {
                        stats.failedOperations++;
                    }
                });

                // Find oldest and newest
                const sortedByTime = [...queue].sort((a, b) =>
                    new Date(a.queuedAt) - new Date(b.queuedAt)
                );

                stats.oldestOperation = sortedByTime[0].queuedAt;
                stats.newestOperation = sortedByTime[sortedByTime.length - 1].queuedAt;
            }

            return stats;

        } catch (error) {
            console.error('Failed to get queue stats:', error);
            return {
                totalOperations: 0,
                operationTypes: {},
                oldestOperation: null,
                newestOperation: null,
                failedOperations: 0
            };
        }
    }

    /**
     * Process all queued operations
     * @param {Function} processor - Function to process each operation
     * @returns {Promise<Object>} Processing results
     */
    async processQueue(processor) {
        const results = {
            processed: 0,
            succeeded: 0,
            failed: 0,
            errors: []
        };

        try {
            const retryableOps = await this.getRetryableOperations();

            for (const operation of retryableOps) {
                results.processed++;

                try {
                    await processor(operation);
                    await this.removeOperation(operation.id);
                    results.succeeded++;

                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        operationId: operation.id,
                        error: error.message
                    });

                    const shouldRetry = await this.markOperationFailed(operation, error);
                    if (!shouldRetry) {
                        console.warn(`Operation ${operation.id} failed permanently:`, error.message);
                    }
                }
            }

        } catch (error) {
            console.error('Failed to process queue:', error);
            results.errors.push({
                operationId: 'queue-processing',
                error: error.message
            });
        }

        return results;
    }
}

export default OfflineQueueService;