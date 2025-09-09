import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NetworkErrorHandler } from './NetworkErrorHandler.js';

describe('NetworkErrorHandler', () => {
    let handler;

    beforeEach(() => {
        handler = new NetworkErrorHandler();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    describe('executeWithRetry', () => {
        it('should return result on successful operation', async () => {
            const operation = vi.fn().mockResolvedValue('success');

            const result = await handler.executeWithRetry(operation);

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should retry on retryable errors', async () => {
            const networkError = new Error('fetch failed');
            networkError.name = 'TypeError';

            const operation = vi.fn()
                .mockRejectedValueOnce(networkError)
                .mockResolvedValue('success');

            const promise = handler.executeWithRetry(operation, {
                maxRetries: 2,
                baseDelay: 100
            });

            // Fast-forward through the delay
            await vi.advanceTimersByTimeAsync(200);
            const result = await promise;

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(2);
        });

        it('should not retry on non-retryable errors', async () => {
            const operation = vi.fn().mockRejectedValue(new Error('Invalid data'));

            await expect(handler.executeWithRetry(operation)).rejects.toThrow();
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should exhaust retries and throw enhanced error', async () => {
            const originalError = new Error('Network timeout');
            originalError.name = 'AbortError';

            const operation = vi.fn().mockRejectedValue(originalError);

            const promise = handler.executeWithRetry(operation, {
                maxRetries: 2,
                baseDelay: 100,
                operationType: 'test operation'
            });

            // Fast-forward through all retry delays
            await vi.advanceTimersByTimeAsync(1000);

            await expect(promise).rejects.toMatchObject({
                category: 'timeout',
                retryAttempts: 2,
                operationType: 'test operation'
            });

            expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });
    });

    describe('shouldRetry', () => {
        it('should return true for network errors', () => {
            const networkError = new Error('fetch failed');
            networkError.name = 'TypeError';

            expect(handler.shouldRetry(networkError)).toBe(true);
        });

        it('should return true for timeout errors', () => {
            const timeoutError = new Error('Request timeout');
            timeoutError.name = 'AbortError';

            expect(handler.shouldRetry(timeoutError)).toBe(true);
        });

        it('should return true for retryable HTTP status codes', () => {
            const serverError = new Error('Server error');
            serverError.status = 503;

            expect(handler.shouldRetry(serverError)).toBe(true);
        });

        it('should return true for rate limit errors', () => {
            const rateLimitError = new Error('Rate limit exceeded');

            expect(handler.shouldRetry(rateLimitError)).toBe(true);
        });

        it('should return false for client errors', () => {
            const clientError = new Error('Bad request');
            clientError.status = 400;

            expect(handler.shouldRetry(clientError)).toBe(false);
        });
    });

    describe('calculateDelay', () => {
        it('should calculate exponential backoff with jitter', () => {
            const delay1 = handler.calculateDelay(1, 1000);
            const delay2 = handler.calculateDelay(2, 1000);
            const delay3 = handler.calculateDelay(3, 1000);

            // Should be roughly exponential (with jitter)
            expect(delay1).toBeGreaterThan(500);
            expect(delay1).toBeLessThan(1500);

            expect(delay2).toBeGreaterThan(1500);
            expect(delay2).toBeLessThan(3000);

            expect(delay3).toBeGreaterThan(3000);
            expect(delay3).toBeLessThan(6000);
        });

        it('should cap delay at maximum', () => {
            handler.maxDelayMs = 5000;

            const delay = handler.calculateDelay(10, 1000);

            expect(delay).toBeLessThanOrEqual(5000);
        });
    });

    describe('categorizeError', () => {
        it('should categorize network errors', () => {
            const networkError = new Error('fetch failed');
            networkError.name = 'TypeError';

            const info = handler.categorizeError(networkError);

            expect(info.category).toBe('network');
            expect(info.userMessage).toContain('network connection');
            expect(info.recoveryActions).toContain('Check your internet connection');
        });

        it('should categorize timeout errors', () => {
            const timeoutError = new Error('Request timeout');
            timeoutError.name = 'AbortError';

            const info = handler.categorizeError(timeoutError);

            expect(info.category).toBe('timeout');
            expect(info.userMessage).toContain('timed out');
        });

        it('should categorize HTTP 401 errors', () => {
            const authError = new Error('Unauthorized');
            authError.status = 401;

            const info = handler.categorizeError(authError);

            expect(info.category).toBe('authentication');
            expect(info.userMessage).toContain('Authentication failed');
            expect(info.recoveryActions).toContain('Check your GitHub access token');
        });

        it('should categorize HTTP 403 rate limit errors', () => {
            const rateLimitError = new Error('rate limit exceeded');
            rateLimitError.status = 403;

            const info = handler.categorizeError(rateLimitError);

            expect(info.category).toBe('rate_limit');
            expect(info.userMessage).toContain('Too many requests');
        });

        it('should categorize HTTP 404 errors', () => {
            const notFoundError = new Error('Not found');
            notFoundError.status = 404;

            const info = handler.categorizeError(notFoundError);

            expect(info.category).toBe('not_found');
            expect(info.userMessage).toContain('not found');
        });

        it('should categorize server errors', () => {
            const serverError = new Error('Internal server error');
            serverError.status = 500;

            const info = handler.categorizeError(serverError);

            expect(info.category).toBe('server_error');
            expect(info.userMessage).toContain('technical difficulties');
        });

        it('should categorize unknown errors', () => {
            const unknownError = new Error('Something went wrong');

            const info = handler.categorizeError(unknownError);

            expect(info.category).toBe('unknown');
            expect(info.userMessage).toContain('unexpected error');
        });
    });

    describe('formatErrorForUser', () => {
        it('should format error with all required fields', () => {
            const error = new Error('Test error');
            error.status = 500;

            const formatted = handler.formatErrorForUser(error);

            expect(formatted).toHaveProperty('title');
            expect(formatted).toHaveProperty('message');
            expect(formatted).toHaveProperty('category');
            expect(formatted).toHaveProperty('recoveryActions');
            expect(formatted).toHaveProperty('technicalDetails');
            expect(formatted).toHaveProperty('canRetry');
            expect(formatted).toHaveProperty('timestamp');

            expect(formatted.title).toBe('Server Error');
            expect(formatted.canRetry).toBe(true);
        });
    });

    describe('withTimeout', () => {
        it('should resolve if operation completes within timeout', async () => {
            const operation = vi.fn().mockResolvedValue('success');
            const wrappedOperation = handler.withTimeout(operation, 1000);

            const result = await wrappedOperation();

            expect(result).toBe('success');
        });

        it.skip('should reject with timeout error if operation takes too long', async () => {
            const operation = vi.fn().mockImplementation(() =>
                new Promise(resolve => setTimeout(resolve, 2000))
            );

            const wrappedOperation = handler.withTimeout(operation, 1000);

            const promise = wrappedOperation();

            // Fast-forward past timeout
            await vi.advanceTimersByTimeAsync(1100);

            await expect(promise).rejects.toThrow('Operation timed out after 1000ms');
        }, 10000);
    });

    describe('getRetryStats', () => {
        it('should return retry statistics', () => {
            // Simulate some retry attempts
            handler.retryAttempts.set('op1', {
                attempts: 2,
                operationType: 'sync',
                lastError: new Error('Network error'),
                startTime: Date.now() - 5000
            });

            const stats = handler.getRetryStats();

            expect(stats.activeRetries).toBe(1);
            expect(stats.operations).toHaveLength(1);
            expect(stats.operations[0].operationType).toBe('sync');
            expect(stats.operations[0].attempts).toBe(2);
        });
    });
});