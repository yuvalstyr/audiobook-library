/**
 * FilterManager - Combines search and filter functionality
 * Handles the coordination between SearchBar and Filters components
 */
export class FilterManager {
    constructor(onFilterChange) {
        this.onFilterChange = onFilterChange;
        this.searchTerm = '';
        this.filters = {
            genres: [],
            moods: []
        };
        this.allAudiobooks = [];
    }

    /**
     * Set the complete audiobook collection
     * @param {Array} audiobooks - Array of all audiobooks
     */
    setAudiobooks(audiobooks) {
        this.allAudiobooks = audiobooks;
        this.applyFilters();
    }

    /**
     * Update search term
     * @param {string} searchTerm - New search term
     */
    updateSearch(searchTerm) {
        this.searchTerm = searchTerm;
        this.applyFilters();
    }

    /**
     * Update filter criteria
     * @param {Object} filters - Filter criteria
     * @param {Array} filters.genres - Selected genres
     * @param {Array} filters.moods - Selected moods
     */
    updateFilters(filters) {
        this.filters = {
            genres: filters.genres || [],
            moods: filters.moods || []
        };
        this.applyFilters();
    }

    /**
     * Apply all filters and search criteria
     */
    applyFilters() {
        let filteredBooks = [...this.allAudiobooks];

        // Apply search filter
        if (this.searchTerm && this.searchTerm.trim() !== '') {
            filteredBooks = this.filterBySearch(filteredBooks, this.searchTerm);
        }

        // Apply category filters
        if (this.filters.genres.length > 0 || this.filters.moods.length > 0) {
            filteredBooks = this.filterByCategories(filteredBooks, this.filters);
        }

        // Notify listeners of the filtered results
        if (this.onFilterChange) {
            this.onFilterChange(filteredBooks);
        }
    }

    /**
     * Filter audiobooks by search term
     * @param {Array} audiobooks - Audiobooks to filter
     * @param {string} searchTerm - Search term
     * @returns {Array} Filtered audiobooks
     */
    filterBySearch(audiobooks, searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            return audiobooks;
        }

        const term = searchTerm.toLowerCase().trim();

        return audiobooks.filter(audiobook => {
            // Search in title
            if (audiobook.title && audiobook.title.toLowerCase().includes(term)) {
                return true;
            }

            // Search in author
            if (audiobook.author && audiobook.author.toLowerCase().includes(term)) {
                return true;
            }

            // Search in narrator
            if (audiobook.narrator && audiobook.narrator.toLowerCase().includes(term)) {
                return true;
            }

            return false;
        });
    }

    /**
     * Filter audiobooks by genre and mood categories
     * @param {Array} audiobooks - Audiobooks to filter
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered audiobooks
     */
    filterByCategories(audiobooks, filters) {
        if (!filters || (!filters.genres?.length && !filters.moods?.length)) {
            return audiobooks;
        }

        return audiobooks.filter(audiobook => {
            // Check genre filters (AND logic - book must have ALL selected genres)
            if (filters.genres && filters.genres.length > 0) {
                const hasMatchingGenre = filters.genres.some(genre =>
                    audiobook.genres && audiobook.genres.includes(genre)
                );
                if (!hasMatchingGenre) {
                    return false;
                }
            }

            // Check mood filters (AND logic - book must have ALL selected moods)
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
     * Clear all filters and search
     */
    clearAll() {
        this.searchTerm = '';
        this.filters = {
            genres: [],
            moods: []
        };
        this.applyFilters();
    }

    /**
     * Get current filter state
     * @returns {Object} Current filter and search state
     */
    getState() {
        return {
            searchTerm: this.searchTerm,
            filters: {
                genres: [...this.filters.genres],
                moods: [...this.filters.moods]
            }
        };
    }

    /**
     * Check if any filters are active
     * @returns {boolean} True if filters or search are active
     */
    hasActiveFilters() {
        return this.searchTerm.trim() !== '' ||
            this.filters.genres.length > 0 ||
            this.filters.moods.length > 0;
    }

    /**
     * Get filter summary for display
     * @returns {string} Human-readable filter summary
     */
    getFilterSummary() {
        const parts = [];

        if (this.searchTerm.trim() !== '') {
            parts.push(`Search: "${this.searchTerm}"`);
        }

        if (this.filters.genres.length > 0) {
            parts.push(`Genres: ${this.filters.genres.join(', ')}`);
        }

        if (this.filters.moods.length > 0) {
            parts.push(`Moods: ${this.filters.moods.join(', ')}`);
        }

        return parts.length > 0 ? parts.join(' | ') : 'No filters applied';
    }
}