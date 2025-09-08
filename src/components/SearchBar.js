/**
 * SearchBar component for real-time text filtering of audiobooks
 * Searches across title, author, and narrator fields
 */
export class SearchBar {
    constructor(container, onSearchChange) {
        this.container = container;
        this.onSearchChange = onSearchChange;
        this.searchTerm = '';
        this.debounceTimeout = null;
        this.debounceDelay = 300; // ms

        this.render();
        this.setupEventListeners();
    }

    /**
     * Render the search bar component
     */
    render() {
        this.container.innerHTML = `
            <div class="relative">
                <label for="search-input" class="sr-only">Search audiobooks</label>
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                </div>
                <input
                    type="search"
                    id="search-input"
                    class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm keyboard-focusable"
                    placeholder="Search books, authors, narrators..."
                    value="${this.searchTerm}"
                    aria-label="Search audiobooks by title, author, or narrator"
                    aria-describedby="search-help"
                    autocomplete="off"
                    spellcheck="false"
                />
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                        id="clear-search-btn"
                        class="text-gray-400 hover:text-gray-600 focus:outline-none keyboard-focusable touch-target ${this.searchTerm ? '' : 'hidden'}"
                        type="button"
                        aria-label="Clear search"
                    >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div id="search-help" class="sr-only">
                    Use Ctrl+K or Cmd+K to focus search. Press Escape to clear.
                </div>
            </div>
        `;
    }

    /**
     * Set up event listeners for search functionality
     */
    setupEventListeners() {
        const searchInput = this.container.querySelector('#search-input');
        const clearButton = this.container.querySelector('#clear-search-btn');

        if (searchInput) {
            // Handle input changes with debouncing
            searchInput.addEventListener('input', (event) => {
                this.handleSearchInput(event.target.value);
            });

            // Handle keyboard shortcuts
            searchInput.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    this.clearSearch();
                }
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearSearch();
            });
        }
    }

    /**
     * Handle search input with debouncing
     * @param {string} value - Search input value
     */
    handleSearchInput(value) {
        // Clear existing timeout
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        // Set new timeout for debounced search
        this.debounceTimeout = setTimeout(() => {
            this.updateSearch(value);
        }, this.debounceDelay);
    }

    /**
     * Update search term and trigger callback
     * @param {string} searchTerm - New search term
     */
    updateSearch(searchTerm) {
        const trimmedTerm = searchTerm.trim();

        if (this.searchTerm !== trimmedTerm) {
            this.searchTerm = trimmedTerm;
            this.updateClearButton();

            if (this.onSearchChange) {
                this.onSearchChange(this.searchTerm);
            }
        }
    }

    /**
     * Clear the search input and reset search
     */
    clearSearch() {
        const searchInput = this.container.querySelector('#search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }

        this.updateSearch('');
    }

    /**
     * Update the visibility of the clear button
     */
    updateClearButton() {
        const clearButton = this.container.querySelector('#clear-search-btn');
        if (clearButton) {
            if (this.searchTerm) {
                clearButton.classList.remove('hidden');
            } else {
                clearButton.classList.add('hidden');
            }
        }
    }

    /**
     * Get the current search term
     * @returns {string} Current search term
     */
    getSearchTerm() {
        return this.searchTerm;
    }

    /**
     * Set the search term programmatically
     * @param {string} searchTerm - Search term to set
     */
    setSearchTerm(searchTerm) {
        this.searchTerm = searchTerm;
        const searchInput = this.container.querySelector('#search-input');
        if (searchInput) {
            searchInput.value = searchTerm;
        }
        this.updateClearButton();
    }

    /**
     * Focus the search input
     */
    focus() {
        const searchInput = this.container.querySelector('#search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }

    /**
     * Filter audiobooks based on search term
     * @param {Array} audiobooks - Array of audiobooks to filter
     * @param {string} searchTerm - Search term to filter by
     * @returns {Array} Filtered audiobooks
     */
    static filterAudiobooks(audiobooks, searchTerm) {
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
     * Destroy the search bar and clean up resources
     */
    destroy() {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}