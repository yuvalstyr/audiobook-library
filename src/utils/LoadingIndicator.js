/**
 * Loading indicator utility for showing loading states during async operations
 */
export class LoadingIndicator {
    constructor() {
        this.activeIndicators = new Set();
    }

    /**
     * Show a loading indicator
     * @param {string} id - Unique identifier for this loading state
     * @param {string} message - Loading message to display
     * @param {HTMLElement} target - Target element to show loading in (optional)
     */
    show(id, message = 'Loading...', target = null) {
        if (this.activeIndicators.has(id)) {
            return; // Already showing
        }

        this.activeIndicators.add(id);

        const indicator = document.createElement('div');
        indicator.id = `loading-${id}`;
        indicator.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        indicator.setAttribute('aria-live', 'polite');
        indicator.setAttribute('aria-label', message);

        indicator.innerHTML = `
            <div class="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4">
                <div class="flex items-center space-x-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span class="text-gray-700">${message}</span>
                </div>
            </div>
        `;

        if (target) {
            target.appendChild(indicator);
        } else {
            document.body.appendChild(indicator);
        }

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide a loading indicator
     * @param {string} id - Unique identifier for the loading state to hide
     */
    hide(id) {
        if (!this.activeIndicators.has(id)) {
            return; // Not showing
        }

        this.activeIndicators.delete(id);

        const indicator = document.getElementById(`loading-${id}`);
        if (indicator) {
            indicator.remove();
        }

        // Restore body scroll if no other indicators are active
        if (this.activeIndicators.size === 0) {
            document.body.style.overflow = '';
        }
    }

    /**
     * Show a minimal loading spinner for quick operations
     * @param {string} id - Unique identifier
     * @param {HTMLElement} target - Target element
     */
    showMinimal(id, target) {
        if (this.activeIndicators.has(id)) {
            return;
        }

        this.activeIndicators.add(id);

        const spinner = document.createElement('div');
        spinner.id = `loading-${id}`;
        spinner.className = 'absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10';
        spinner.innerHTML = `
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        `;

        if (target) {
            target.style.position = 'relative';
            target.appendChild(spinner);
        }
    }

    /**
     * Hide all loading indicators
     */
    hideAll() {
        this.activeIndicators.forEach(id => {
            const indicator = document.getElementById(`loading-${id}`);
            if (indicator) {
                indicator.remove();
            }
        });

        this.activeIndicators.clear();
        document.body.style.overflow = '';
    }

    /**
     * Check if any loading indicators are active
     * @returns {boolean} True if any indicators are showing
     */
    isLoading() {
        return this.activeIndicators.size > 0;
    }

    /**
     * Check if a specific loading indicator is active
     * @param {string} id - Identifier to check
     * @returns {boolean} True if the indicator is showing
     */
    isLoadingId(id) {
        return this.activeIndicators.has(id);
    }
}

// Create singleton instance
export const loadingIndicator = new LoadingIndicator();