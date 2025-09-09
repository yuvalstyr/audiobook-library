/**
 * NetworkErrorHandler - Handles network errors with retry logic and user-friendly messages
 * Provides exponential backoff, error categorization, and recovery suggestions
 */
export class NetworkErrorHandler {
    constructor() {
        this.maxRetries = 5;
        this.baseDelayMs = 1000; // 1 second base delay
        this.maxDelayMs = 30000; // 30 seconds max delay
        this.retryableStatusCodes = [408, 429, 500, 502, 503, 504];

        // Track retry attempts per operation
        this.retryAttempts = new Map();
    }

    /**
     * Execute an operation with retry logic
     * @param {Function} operation - Async operation to execute
     * @param {Object} options - Retry options
     * @param {string} options.operationId - Unique ID for this operation
     * @param {number} options.maxRetries - Override max retries
     * @param {number} options.baseDelay - Override base delay
     * @param {string} options.operationType - Type of operation for error messages
     * @returns {Promise<*>} Operation result
     */
    async executeWithRetry(operation, options = {}) {
        const {
            operationId = `op-${Date.now()}-${Math.random()}`,
            maxRetries = this.maxRetries,
            baseDelay = this.baseDelayMs,
            operationType = 'operation'
        } = options;

        let lastError;
        let attempt = 0;

        while (attempt <= maxRetries) {
            try {
                const result = await operation();

                // Success - clear retry tracking
                this.retryAttempts.delete(operationId);
                return result;

            } catch (error) {
                lastError = error;
                attempt++;

                // Track this attempt
                this.retryAttempts.set(operationId, {
                    attempts: attempt,
                    lastError: error,
                    operationType,
                    startTime: this.retryAttempts.get(operationId)?.startTime || Date.now()
                });

                // Check if we should retry
                if (attempt > maxRetries || !this.shouldRetry(error)) {
                    break;
                }

                // Calculate delay with exponential backoff and jitter
                const delay = this.calculateDelay(attempt, baseDelay);

                console.warn(`${operationType} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error.message);

                await this.delay(delay);
            }
        }

        // All retries exhausted
        this.retryAttempts.delete(operationId);
        throw this.enhanceError(lastError, attempt - 1, operationType);
    }

    /**
     * Determine if an error should trigger a retry
     * @param {Error} error - Error to check
     * @returns {boolean} True if should retry
     */
    shouldRetry(error) {
        // Network errors (no response)
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return true;
        }

        // Timeout errors
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            return true;
        }

        // HTTP status codes that are retryable
        if (error.status && this.retryableStatusCodes.includes(error.status)) {
            return true;
        }

        // Rate limiting (GitHub specific)
        if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
            return true;
        }

        // Temporary GitHub service issues
        if (error.message.includes('temporarily unavailable') ||
            error.message.includes('service unavailable')) {
            return true;
        }

        return false;
    }

    /**
     * Calculate delay for exponential backoff with jitter
     * @param {number} attempt - Current attempt number (1-based)
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {number} Delay in milliseconds
     */
    calculateDelay(attempt, baseDelay) {
        // Exponential backoff: baseDelay * 2^(attempt-1)
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);

        // Add jitter (±25% random variation)
        const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
        const delayWithJitter = exponentialDelay + jitter;

        // Cap at maximum delay
        return Math.min(delayWithJitter, this.maxDelayMs);
    }

    /**
     * Enhance error with retry information and user-friendly message
     * @param {Error} originalError - Original error
     * @param {number} attempts - Number of retry attempts made
     * @param {string} operationType - Type of operation
     * @returns {Error} Enhanced error
     */
    enhanceError(originalError, attempts, operationType) {
        const errorInfo = this.categorizeError(originalError);

        const enhancedError = new Error(errorInfo.userMessage);
        enhancedError.originalError = originalError;
        enhancedError.category = errorInfo.category;
        enhancedError.retryAttempts = attempts;
        enhancedError.operationType = operationType;
        enhancedError.recoveryActions = errorInfo.recoveryActions;
        enhancedError.isRetryable = this.shouldRetry(originalError);

        return enhancedError;
    }

    /**
     * Categorize error and provide user-friendly information
     * @param {Error} error - Error to categorize
     * @returns {Object} Error information
     */
    categorizeError(error) {
        // Network connectivity issues
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return {
                category: 'network',
                userMessage: 'Unable to connect to the internet. Please check your network connection and try again.',
                recoveryActions: [
                    'Check your internet connection',
                    'Try refreshing the page',
                    'Wait a moment and try again'
                ]
            };
        }

        // Timeout errors
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            return {
                category: 'timeout',
                userMessage: 'The request timed out. This might be due to a slow connection or server issues.',
                recoveryActions: [
                    'Check your internet connection speed',
                    'Try again in a few moments',
                    'Contact support if the problem persists'
                ]
            };
        }

        // GitHub API specific errors
        if (error.status) {
            switch (error.status) {
                case 401:
                    return {
                        category: 'authentication',
                        userMessage: 'Authentication failed. Your access token may be invalid or expired.',
                        recoveryActions: [
                            'Check your GitHub access token',
                            'Generate a new access token if needed',
                            'Ensure the token has gist permissions'
                        ]
                    };

                case 403:
                    if (error.message.includes('rate limit')) {
                        return {
                            category: 'rate_limit',
                            userMessage: 'Too many requests. GitHub has temporarily limited your access.',
                            recoveryActions: [
                                'Wait a few minutes before trying again',
                                'Reduce the frequency of sync operations',
                                'Check your GitHub API rate limit status'
                            ]
                        };
                    }
                    return {
                        category: 'permission',
                        userMessage: 'Access denied. You may not have permission to access this gist.',
                        recoveryActions: [
                            'Check that the gist ID is correct',
                            'Ensure the gist is public or you have access',
                            'Verify your access token permissions'
                        ]
                    };

                case 404:
                    return {
                        category: 'not_found',
                        userMessage: 'The gist was not found. It may have been deleted or the ID is incorrect.',
                        recoveryActions: [
                            'Double-check the gist ID',
                            'Ensure the gist still exists on GitHub',
                            'Create a new gist if the original was deleted'
                        ]
                    };

                case 422:
                    return {
                        category: 'validation',
                        userMessage: 'The data format is invalid. There may be an issue with your audiobook data.',
                        recoveryActions: [
                            'Check your audiobook data for errors',
                            'Try exporting and re-importing your data',
                            'Contact support if the problem persists'
                        ]
                    };

                case 500:
                case 502:
                case 503:
                case 504:
                    return {
                        category: 'server_error',
                        userMessage: 'GitHub is experiencing technical difficulties. Please try again later.',
                        recoveryActions: [
                            'Wait a few minutes and try again',
                            'Check GitHub status page for known issues',
                            'Use offline mode until service is restored'
                        ]
                    };
            }
        }

        // Gist-specific errors
        if (error.message.includes('gist')) {
            return {
                category: 'gist_error',
                userMessage: 'There was a problem with your gist. Please check your gist configuration.',
                recoveryActions: [
                    'Verify your gist ID is correct',
                    'Check that the gist exists and is accessible',
                    'Try creating a new gist if needed'
                ]
            };
        }

        // Generic/unknown errors
        return {
            category: 'unknown',
            userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
            recoveryActions: [
                'Try the operation again',
                'Refresh the page and retry',
                'Check the browser console for more details',
                'Contact support with error details'
            ]
        };
    }

    /**
     * Get user-friendly error message with recovery suggestions
     * @param {Error} error - Error to format
     * @returns {Object} Formatted error information
     */
    formatErrorForUser(error) {
        const errorInfo = this.categorizeError(error);

        return {
            title: this.getErrorTitle(errorInfo.category),
            message: errorInfo.userMessage,
            category: errorInfo.category,
            recoveryActions: errorInfo.recoveryActions,
            technicalDetails: error.message,
            canRetry: this.shouldRetry(error),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get appropriate error title for category
     * @param {string} category - Error category
     * @returns {string} Error title
     */
    getErrorTitle(category) {
        switch (category) {
            case 'network':
                return 'Connection Problem';
            case 'timeout':
                return 'Request Timed Out';
            case 'authentication':
                return 'Authentication Error';
            case 'rate_limit':
                return 'Rate Limited';
            case 'permission':
                return 'Access Denied';
            case 'not_found':
                return 'Gist Not Found';
            case 'validation':
                return 'Data Error';
            case 'server_error':
                return 'Server Error';
            case 'gist_error':
                return 'Gist Error';
            default:
                return 'Unexpected Error';
        }
    }

    /**
     * Check if the device is currently online
     * @returns {boolean} True if online
     */
    isOnline() {
        return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }

    /**
     * Get retry statistics for monitoring
     * @returns {Object} Retry statistics
     */
    getRetryStats() {
        const stats = {
            activeRetries: this.retryAttempts.size,
            operations: []
        };

        for (const [operationId, info] of this.retryAttempts.entries()) {
            stats.operations.push({
                operationId,
                attempts: info.attempts,
                operationType: info.operationType,
                lastError: info.lastError.message,
                duration: Date.now() - info.startTime
            });
        }

        return stats;
    }

    /**
     * Clear retry tracking (useful for cleanup)
     */
    clearRetryTracking() {
        this.retryAttempts.clear();
    }

    /**
     * Delay execution for specified milliseconds
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create a timeout wrapper for operations
     * @param {Function} operation - Operation to wrap
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Function} Wrapped operation
     */
    withTimeout(operation, timeoutMs = 10000) {
        return async (...args) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const result = await operation(...args);
                clearTimeout(timeoutId);
                return result;
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error(`Operation timed out after ${timeoutMs}ms`);
                }
                throw error;
            }
        };
    }
}

export default NetworkErrorHandler;