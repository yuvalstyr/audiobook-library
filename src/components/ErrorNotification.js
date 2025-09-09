/**
 * ErrorNotification - User-friendly error notification component
 * Shows network errors with recovery suggestions and retry options
 */
export class ErrorNotification {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.autoHideTimer = null;
        this.currentError = null;
    }

    /**
     * Show an error notification
     * @param {Object} errorInfo - Error information from NetworkErrorHandler
     * @param {Object} options - Display options
     * @param {boolean} options.autoHide - Auto-hide after delay
     * @param {number} options.hideDelay - Delay before auto-hide (ms)
     * @param {Function} options.onRetry - Retry callback function
     */
    show(errorInfo, options = {}) {
        const {
            autoHide = true,
            hideDelay = 10000,
            onRetry = null
        } = options;

        this.currentError = errorInfo;
        this.createNotification(errorInfo, onRetry);

        // Add to page
        document.body.appendChild(this.container);
        this.isVisible = true;

        // Auto-hide if requested
        if (autoHide) {
            this.autoHideTimer = setTimeout(() => {
                this.hide();
            }, hideDelay);
        }

        // Animate in
        requestAnimationFrame(() => {
            this.container.classList.remove('translate-x-full');
            this.container.classList.add('translate-x-0');
        });
    }

    /**
     * Hide the notification
     */
    hide() {
        if (!this.isVisible) {
            return;
        }

        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
            this.autoHideTimer = null;
        }

        // Animate out
        this.container.classList.remove('translate-x-0');
        this.container.classList.add('translate-x-full');

        // Remove from DOM after animation
        setTimeout(() => {
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            this.isVisible = false;
            this.currentError = null;
        }, 300);
    }

    /**
     * Create the notification DOM structure
     * @private
     * @param {Object} errorInfo - Error information
     * @param {Function} onRetry - Retry callback
     */
    createNotification(errorInfo, onRetry) {
        this.container = document.createElement('div');
        this.container.className = `
            fixed top-4 right-4 z-50 max-w-md w-full
            transform translate-x-full transition-transform duration-300 ease-in-out
        `;

        const canRetry = errorInfo.canRetry && onRetry;
        const recoveryActionsHtml = this.createRecoveryActionsHtml(errorInfo.recoveryActions);

        this.container.innerHTML = `
            <div class="bg-white border-l-4 border-red-500 rounded-lg shadow-lg overflow-hidden">
                <div class="p-4">
                    <div class="flex items-start">
                        <div class="flex-shrink-0">
                            ${this.getErrorIcon(errorInfo.category)}
                        </div>
                        <div class="ml-3 flex-1">
                            <h3 class="text-sm font-medium text-gray-900 error-title">
                                ${errorInfo.title}
                            </h3>
                            <div class="mt-1 text-sm text-gray-600 error-message">
                                ${errorInfo.message}
                            </div>
                            
                            ${recoveryActionsHtml}
                            
                            <!-- Technical details (collapsible) -->
                            <div class="mt-3">
                                <button type="button" class="text-xs text-gray-500 hover:text-gray-700 focus:outline-none details-toggle">
                                    Show technical details
                                </button>
                                <div class="mt-2 text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded hidden technical-details">
                                    ${errorInfo.technicalDetails}
                                </div>
                            </div>
                        </div>
                        <div class="ml-4 flex-shrink-0">
                            <button type="button" class="text-gray-400 hover:text-gray-600 focus:outline-none close-btn">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Action buttons -->
                    <div class="mt-4 flex space-x-2">
                        ${canRetry ? `
                            <button type="button" class="retry-btn px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                Try Again
                            </button>
                        ` : ''}
                        <button type="button" class="dismiss-btn px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">
                            Dismiss
                        </button>
                    </div>
                </div>
                
                <!-- Progress indicator for retry attempts -->
                <div class="retry-progress hidden">
                    <div class="bg-blue-200 h-1">
                        <div class="bg-blue-600 h-1 transition-all duration-300 progress-bar" style="width: 0%"></div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners(onRetry);
    }

    /**
     * Create recovery actions HTML
     * @private
     * @param {Array} recoveryActions - Array of recovery action strings
     * @returns {string} HTML for recovery actions
     */
    createRecoveryActionsHtml(recoveryActions) {
        if (!recoveryActions || recoveryActions.length === 0) {
            return '';
        }

        const actionsHtml = recoveryActions
            .map(action => `<li class="text-sm text-gray-600">${action}</li>`)
            .join('');

        return `
            <div class="mt-3">
                <p class="text-sm font-medium text-gray-700">What you can do:</p>
                <ul class="mt-1 list-disc list-inside space-y-1">
                    ${actionsHtml}
                </ul>
            </div>
        `;
    }

    /**
     * Set up event listeners for the notification
     * @private
     * @param {Function} onRetry - Retry callback
     */
    setupEventListeners(onRetry) {
        // Close button
        const closeBtn = this.container.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.hide());

        // Dismiss button
        const dismissBtn = this.container.querySelector('.dismiss-btn');
        dismissBtn.addEventListener('click', () => this.hide());

        // Retry button
        const retryBtn = this.container.querySelector('.retry-btn');
        if (retryBtn && onRetry) {
            retryBtn.addEventListener('click', async () => {
                try {
                    this.showRetryProgress();
                    await onRetry();
                    this.hide();
                } catch (error) {
                    this.hideRetryProgress();
                    // Could show a new error notification here
                    console.error('Retry failed:', error);
                }
            });
        }

        // Technical details toggle
        const detailsToggle = this.container.querySelector('.details-toggle');
        const technicalDetails = this.container.querySelector('.technical-details');

        detailsToggle.addEventListener('click', () => {
            const isHidden = technicalDetails.classList.contains('hidden');

            if (isHidden) {
                technicalDetails.classList.remove('hidden');
                detailsToggle.textContent = 'Hide technical details';
            } else {
                technicalDetails.classList.add('hidden');
                detailsToggle.textContent = 'Show technical details';
            }
        });

        // Auto-hide on click outside (optional)
        setTimeout(() => {
            const handleClickOutside = (event) => {
                if (!this.container.contains(event.target)) {
                    this.hide();
                    document.removeEventListener('click', handleClickOutside);
                }
            };
            document.addEventListener('click', handleClickOutside);
        }, 100);
    }

    /**
     * Show retry progress indicator
     * @private
     */
    showRetryProgress() {
        const retryBtn = this.container.querySelector('.retry-btn');
        const progressContainer = this.container.querySelector('.retry-progress');
        const progressBar = this.container.querySelector('.progress-bar');

        if (retryBtn) {
            retryBtn.disabled = true;
            retryBtn.textContent = 'Retrying...';
        }

        if (progressContainer) {
            progressContainer.classList.remove('hidden');

            // Animate progress bar
            let progress = 0;
            const animate = () => {
                progress += 2;
                if (progress > 100) progress = 0;
                progressBar.style.width = `${progress}%`;

                if (retryBtn && retryBtn.disabled) {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }
    }

    /**
     * Hide retry progress indicator
     * @private
     */
    hideRetryProgress() {
        const retryBtn = this.container.querySelector('.retry-btn');
        const progressContainer = this.container.querySelector('.retry-progress');

        if (retryBtn) {
            retryBtn.disabled = false;
            retryBtn.textContent = 'Try Again';
        }

        if (progressContainer) {
            progressContainer.classList.add('hidden');
        }
    }

    /**
     * Get appropriate error icon for category
     * @private
     * @param {string} category - Error category
     * @returns {string} SVG icon HTML
     */
    getErrorIcon(category) {
        const iconClass = 'w-5 h-5';

        switch (category) {
            case 'network':
                return `<svg class="${iconClass} text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12m6.364-6.364L12 12"></path>
                </svg>`;

            case 'timeout':
                return `<svg class="${iconClass} text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>`;

            case 'authentication':
            case 'permission':
                return `<svg class="${iconClass} text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path>
                </svg>`;

            case 'rate_limit':
                return `<svg class="${iconClass} text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clip-rule="evenodd"></path>
                </svg>`;

            case 'server_error':
                return `<svg class="${iconClass} text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>`;

            default:
                return `<svg class="${iconClass} text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>`;
        }
    }

    /**
     * Check if notification is currently visible
     * @returns {boolean} True if visible
     */
    isShowing() {
        return this.isVisible;
    }

    /**
     * Get current error information
     * @returns {Object|null} Current error info or null
     */
    getCurrentError() {
        return this.currentError;
    }
}

export default ErrorNotification;