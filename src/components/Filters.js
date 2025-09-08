/**
 * Filters component for genre and mood filtering of audiobooks
 * Provides checkboxes for multiple filter criteria
 */
export class Filters {
    constructor(container, onFiltersChange) {
        this.container = container;
        this.onFiltersChange = onFiltersChange;
        this.selectedGenres = new Set();
        this.selectedMoods = new Set();
        this.availableGenres = new Set();
        this.availableMoods = new Set();
        this.customGenres = new Set();
        this.customMoods = new Set();

        this.render();
        this.setupEventListeners();
    }

    /**
     * Update available filter options based on audiobook collection
     * @param {Array} audiobooks - Array of audiobooks
     * @param {Array} customGenres - Array of custom genres
     * @param {Array} customMoods - Array of custom moods
     */
    updateAvailableFilters(audiobooks, customGenres = [], customMoods = []) {
        // Clear existing options
        this.availableGenres.clear();
        this.availableMoods.clear();
        this.customGenres = new Set(customGenres);
        this.customMoods = new Set(customMoods);

        // Extract all genres and moods from audiobooks
        audiobooks.forEach(audiobook => {
            if (audiobook.genres) {
                audiobook.genres.forEach(genre => this.availableGenres.add(genre));
            }
            if (audiobook.moods) {
                audiobook.moods.forEach(mood => this.availableMoods.add(mood));
            }
        });

        // Re-render with updated options
        this.render();
        this.setupEventListeners();
    }

    /**
     * Render the filters component
     */
    render() {
        const genreOptions = this.renderFilterSection('Genres', Array.from(this.availableGenres), this.selectedGenres, 'genre');
        const moodOptions = this.renderFilterSection('Moods', Array.from(this.availableMoods), this.selectedMoods, 'mood');

        this.container.innerHTML = `
            <div class="filters-container">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-medium text-gray-900 lg:sr-only">Filters</h3>
                    <button
                        id="clear-all-filters-btn"
                        class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none keyboard-focusable ${this.hasActiveFilters() ? '' : 'hidden'}"
                        aria-label="Clear all active filters"
                    >
                        Clear All
                    </button>
                </div>

                ${genreOptions}
                ${moodOptions}

                <div class="mt-6 pt-4 border-t border-gray-200">
                    <div class="text-sm text-gray-600" id="filter-summary" role="status" aria-live="polite">
                        ${this.getFilterSummary()}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render a filter section (genres or moods)
     * @param {string} title - Section title
     * @param {Array} options - Available options
     * @param {Set} selectedOptions - Currently selected options
     * @param {string} type - Filter type ('genre' or 'mood')
     * @returns {string} HTML string for the section
     */
    renderFilterSection(title, options, selectedOptions, type) {
        if (options.length === 0) {
            return '';
        }

        // Sort options: predefined first, then custom, then alphabetically
        const predefinedOptions = this.getPredefinedOptions(type);
        const sortedOptions = options.sort((a, b) => {
            const aIsPredefined = predefinedOptions.includes(a);
            const bIsPredefined = predefinedOptions.includes(b);

            if (aIsPredefined && !bIsPredefined) return -1;
            if (!aIsPredefined && bIsPredefined) return 1;

            return a.localeCompare(b);
        });

        const checkboxes = sortedOptions.map(option => {
            const isSelected = selectedOptions.has(option);
            const checkboxId = `${type}-${option.replace(/\s+/g, '-').toLowerCase()}`;

            return `
                <label class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 focus-within:bg-gray-50 p-2 rounded touch-spacing keyboard-focusable">
                    <input
                        type="checkbox"
                        id="${checkboxId}"
                        data-type="${type}"
                        data-value="${option}"
                        class="filter-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 keyboard-focusable"
                        ${isSelected ? 'checked' : ''}
                        aria-describedby="${checkboxId}-label"
                    />
                    <span id="${checkboxId}-label" class="text-sm text-gray-700 capitalize flex-1">${this.formatOptionLabel(option)}</span>
                    <span class="text-xs text-gray-400 ml-auto" aria-hidden="true">${this.getOptionCount(option, type)}</span>
                </label>
            `;
        }).join('');

        return `
            <fieldset class="filter-section mb-6">
                <legend class="text-sm font-medium text-gray-900 mb-3">${title}</legend>
                <div class="space-y-1 max-h-48 overflow-y-auto" role="group" aria-labelledby="${type}-filters-legend">
                    ${checkboxes}
                </div>
            </fieldset>
        `;
    }

    /**
     * Get predefined options for a filter type
     * @param {string} type - Filter type ('genre' or 'mood')
     * @returns {Array} Array of predefined options
     */
    getPredefinedOptions(type) {
        if (type === 'genre') {
            return ['next', 'done', 'action', 'thriller', 'fantasy', 'sci-fi'];
        } else if (type === 'mood') {
            return ['funny', 'fast-paced', 'heavy'];
        }
        return [];
    }

    /**
     * Format option label for display
     * @param {string} option - Option value
     * @returns {string} Formatted label
     */
    formatOptionLabel(option) {
        // Handle special cases
        if (option === 'sci-fi') return 'Sci-Fi';
        if (option === 'fast-paced') return 'Fast-Paced';

        // Capitalize first letter
        return option.charAt(0).toUpperCase() + option.slice(1);
    }

    /**
     * Get count of audiobooks for a specific option
     * @param {string} option - Option value
     * @param {string} type - Filter type
     * @returns {number} Count of audiobooks with this option
     */
    getOptionCount(option, type) {
        // This would need access to the full audiobook collection
        // For now, return empty string - can be enhanced later
        return '';
    }

    /**
     * Set up event listeners for filter interactions
     */
    setupEventListeners() {
        // Filter checkbox changes
        const checkboxes = this.container.querySelectorAll('.filter-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (event) => {
                this.handleFilterChange(event.target);
            });
        });

        // Clear all filters button
        const clearAllBtn = this.container.querySelector('#clear-all-filters-btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }

    /**
     * Handle individual filter checkbox changes
     * @param {HTMLInputElement} checkbox - Changed checkbox element
     */
    handleFilterChange(checkbox) {
        const type = checkbox.dataset.type;
        const value = checkbox.dataset.value;
        const isChecked = checkbox.checked;

        if (type === 'genre') {
            if (isChecked) {
                this.selectedGenres.add(value);
            } else {
                this.selectedGenres.delete(value);
            }
        } else if (type === 'mood') {
            if (isChecked) {
                this.selectedMoods.add(value);
            } else {
                this.selectedMoods.delete(value);
            }
        }

        this.updateFilterSummary();
        this.updateClearAllButton();

        if (this.onFiltersChange) {
            this.onFiltersChange({
                genres: Array.from(this.selectedGenres),
                moods: Array.from(this.selectedMoods)
            });
        }
    }

    /**
     * Clear all active filters
     */
    clearAllFilters() {
        this.selectedGenres.clear();
        this.selectedMoods.clear();

        // Uncheck all checkboxes
        const checkboxes = this.container.querySelectorAll('.filter-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        this.updateFilterSummary();
        this.updateClearAllButton();

        if (this.onFiltersChange) {
            this.onFiltersChange({
                genres: [],
                moods: []
            });
        }
    }

    /**
     * Check if there are any active filters
     * @returns {boolean} True if filters are active
     */
    hasActiveFilters() {
        return this.selectedGenres.size > 0 || this.selectedMoods.size > 0;
    }

    /**
     * Get filter summary text
     * @returns {string} Summary of active filters
     */
    getFilterSummary() {
        const totalFilters = this.selectedGenres.size + this.selectedMoods.size;

        if (totalFilters === 0) {
            return 'No filters applied';
        }

        return `${totalFilters} filter${totalFilters !== 1 ? 's' : ''} applied`;
    }

    /**
     * Update the filter summary display
     */
    updateFilterSummary() {
        const summaryElement = this.container.querySelector('#filter-summary');
        if (summaryElement) {
            summaryElement.textContent = this.getFilterSummary();
        }
    }

    /**
     * Update the visibility of the clear all button
     */
    updateClearAllButton() {
        const clearAllBtn = this.container.querySelector('#clear-all-filters-btn');
        if (clearAllBtn) {
            if (this.hasActiveFilters()) {
                clearAllBtn.classList.remove('hidden');
            } else {
                clearAllBtn.classList.add('hidden');
            }
        }
    }

    /**
     * Get current filter state
     * @returns {Object} Current filter selections
     */
    getFilters() {
        return {
            genres: Array.from(this.selectedGenres),
            moods: Array.from(this.selectedMoods)
        };
    }

    /**
     * Set filter state programmatically
     * @param {Object} filters - Filter state to set
     * @param {Array} filters.genres - Selected genres
     * @param {Array} filters.moods - Selected moods
     */
    setFilters(filters) {
        this.selectedGenres = new Set(filters.genres || []);
        this.selectedMoods = new Set(filters.moods || []);

        // Update checkboxes
        const checkboxes = this.container.querySelectorAll('.filter-checkbox');
        checkboxes.forEach(checkbox => {
            const type = checkbox.dataset.type;
            const value = checkbox.dataset.value;

            if (type === 'genre') {
                checkbox.checked = this.selectedGenres.has(value);
            } else if (type === 'mood') {
                checkbox.checked = this.selectedMoods.has(value);
            }
        });

        this.updateFilterSummary();
        this.updateClearAllButton();
    }

    /**
     * Filter audiobooks based on current filter selections
     * @param {Array} audiobooks - Array of audiobooks to filter
     * @param {Object} filters - Filter criteria
     * @param {Array} filters.genres - Selected genres
     * @param {Array} filters.moods - Selected moods
     * @returns {Array} Filtered audiobooks
     */
    static filterAudiobooks(audiobooks, filters) {
        if (!filters || (!filters.genres?.length && !filters.moods?.length)) {
            return audiobooks;
        }

        return audiobooks.filter(audiobook => {
            // Check genre filters
            if (filters.genres && filters.genres.length > 0) {
                const hasMatchingGenre = filters.genres.some(genre =>
                    audiobook.genres && audiobook.genres.includes(genre)
                );
                if (!hasMatchingGenre) {
                    return false;
                }
            }

            // Check mood filters
            if (filters.moods && filters.moods.length > 0) {
                const hasMatchingMood = filters.moods.some(mood =>
                    audiobook.moods && audiobook.moods.includes(mood)
                );
                if (!hasMatchingMood) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Destroy the filters component and clean up resources
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }

        this.selectedGenres.clear();
        this.selectedMoods.clear();
        this.availableGenres.clear();
        this.availableMoods.clear();
    }
}