import { BookCard } from './BookCard.js';

/**
 * Gallery component for displaying audiobook collection in a responsive grid
 * Handles rendering, filtering, and user interactions
 */
export class Gallery {
    constructor(container) {
        this.container = container;
        this.audiobooks = [];
        this.filteredAudiobooks = [];
        this.bookCards = new Map(); // Map of audiobook ID to BookCard instance
        this.isLoading = false;
        this.isEmpty = false;

        this.initializeGallery();
    }

    /**
     * Initialize the gallery structure
     */
    initializeGallery() {
        this.container.innerHTML = `
            <div class="gallery-header mb-6">
                <div class="flex justify-between items-center">
                    <div id="gallery-stats" class="text-sm text-gray-600">
                        <!-- Stats will be updated dynamically -->
                    </div>
                    <div id="gallery-view-options" class="flex items-center space-x-2">
                        <!-- View options can be added here later -->
                    </div>
                </div>
            </div>
            
            <div id="gallery-content">
                <!-- Gallery content will be rendered here -->
            </div>
        `;

        this.contentContainer = this.container.querySelector('#gallery-content');
        this.statsContainer = this.container.querySelector('#gallery-stats');

        // Add event listeners
        this.container.addEventListener('bookSelected', (event) => {
            this.handleBookSelection(event.detail.audiobook);
        });
    }

    /**
     * Set the audiobook collection to display
     * @param {Audiobook[]} audiobooks - Array of audiobook objects
     */
    setAudiobooks(audiobooks) {
        this.audiobooks = audiobooks;
        this.filteredAudiobooks = [...audiobooks];
        this.render();
    }

    /**
     * Update the gallery with filtered audiobooks
     * @param {Audiobook[]} filteredAudiobooks - Filtered array of audiobooks
     */
    updateFilter(filteredAudiobooks) {
        this.filteredAudiobooks = filteredAudiobooks;
        this.render();
    }

    /**
     * Render the complete gallery
     */
    render() {
        if (this.isLoading) {
            this.renderLoading();
            return;
        }

        if (this.filteredAudiobooks.length === 0) {
            this.renderEmpty();
            return;
        }

        this.renderGallery();
        this.updateStats();
    }

    /**
     * Render the loading state
     */
    renderLoading() {
        this.contentContainer.innerHTML = `
            <div class="flex justify-center items-center py-16">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p class="text-gray-600">Loading your audiobook library...</p>
                </div>
            </div>
        `;
    }

    /**
     * Render the empty state
     */
    renderEmpty() {
        const isFiltered = this.filteredAudiobooks.length === 0 && this.audiobooks.length > 0;

        this.contentContainer.innerHTML = `
            <div class="text-center py-16">
                <div class="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">
                    ${isFiltered ? 'No books match your filters' : 'No audiobooks in your library'}
                </h3>
                <p class="text-gray-600 mb-6">
                    ${isFiltered
                ? 'Try adjusting your search or filter criteria to find more books.'
                : 'Start building your collection by adding your first audiobook.'
            }
                </p>
                ${isFiltered
                ? '<button id="clear-filters-btn" class="btn-secondary">Clear Filters</button>'
                : '<button id="add-first-book-btn" class="btn-primary">Add Your First Book</button>'
            }
            </div>
        `;

        // Add event listeners for empty state buttons
        const clearFiltersBtn = this.contentContainer.querySelector('#clear-filters-btn');
        const addFirstBookBtn = this.contentContainer.querySelector('#add-first-book-btn');

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.dispatchEvent('clearFilters');
            });
        }

        if (addFirstBookBtn) {
            addFirstBookBtn.addEventListener('click', () => {
                this.dispatchEvent('addBook');
            });
        }
    }

    /**
     * Render the gallery grid with book cards
     */
    renderGallery() {
        // Clear existing book cards
        this.bookCards.clear();

        // Create grid container
        this.contentContainer.innerHTML = `
            <div 
                class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6" 
                id="books-grid"
                role="grid"
                aria-label="Audiobook collection"
            >
                <!-- Book cards will be inserted here -->
            </div>
        `;

        const gridContainer = this.contentContainer.querySelector('#books-grid');

        // Create and render book cards
        this.filteredAudiobooks.forEach((audiobook, index) => {
            const bookCard = new BookCard(audiobook);
            const cardElement = bookCard.render();

            // Add grid cell role and position info for screen readers
            cardElement.setAttribute('role', 'gridcell');
            cardElement.setAttribute('aria-posinset', index + 1);
            cardElement.setAttribute('aria-setsize', this.filteredAudiobooks.length);

            this.bookCards.set(audiobook.id, bookCard);
            gridContainer.appendChild(cardElement);
        });

        // Announce to screen readers when gallery updates
        this.announceGalleryUpdate();
    }

    /**
     * Update the gallery statistics display
     */
    updateStats() {
        const total = this.audiobooks.length;
        const showing = this.filteredAudiobooks.length;
        const isFiltered = showing !== total;

        let statsText = '';
        if (isFiltered) {
            statsText = `Showing ${showing} of ${total} audiobooks`;
        } else {
            statsText = `${total} audiobook${total !== 1 ? 's' : ''} in your library`;
        }

        this.statsContainer.textContent = statsText;
    }

    /**
     * Set loading state
     * @param {boolean} loading - Whether the gallery is loading
     */
    setLoading(loading) {
        this.isLoading = loading;
        this.render();
    }

    /**
     * Handle book selection events
     * @param {Audiobook} audiobook - Selected audiobook
     */
    handleBookSelection(audiobook) {
        // Dispatch event to parent components
        this.dispatchEvent('bookSelected', { audiobook });
    }

    /**
     * Add a new audiobook to the gallery
     * @param {Audiobook} audiobook - Audiobook to add
     */
    addAudiobook(audiobook) {
        this.audiobooks.push(audiobook);
        this.filteredAudiobooks.push(audiobook);
        this.render();
    }

    /**
     * Update an existing audiobook in the gallery
     * @param {Audiobook} updatedAudiobook - Updated audiobook data
     */
    updateAudiobook(updatedAudiobook) {
        // Update in main collection
        const index = this.audiobooks.findIndex(book => book.id === updatedAudiobook.id);
        if (index !== -1) {
            this.audiobooks[index] = updatedAudiobook;
        }

        // Update in filtered collection
        const filteredIndex = this.filteredAudiobooks.findIndex(book => book.id === updatedAudiobook.id);
        if (filteredIndex !== -1) {
            this.filteredAudiobooks[filteredIndex] = updatedAudiobook;

            // Update the existing card
            const bookCard = this.bookCards.get(updatedAudiobook.id);
            if (bookCard) {
                bookCard.update(updatedAudiobook);
            }
        }
    }

    /**
     * Remove an audiobook from the gallery
     * @param {string} audiobookId - ID of audiobook to remove
     */
    removeAudiobook(audiobookId) {
        // Remove from main collection
        this.audiobooks = this.audiobooks.filter(book => book.id !== audiobookId);

        // Remove from filtered collection
        this.filteredAudiobooks = this.filteredAudiobooks.filter(book => book.id !== audiobookId);

        // Remove and destroy the card
        const bookCard = this.bookCards.get(audiobookId);
        if (bookCard) {
            bookCard.destroy();
            this.bookCards.delete(audiobookId);
        }

        this.render();
    }

    /**
     * Get all audiobooks currently in the gallery
     * @returns {Audiobook[]} Array of all audiobooks
     */
    getAllAudiobooks() {
        return [...this.audiobooks];
    }

    /**
     * Get currently filtered audiobooks
     * @returns {Audiobook[]} Array of filtered audiobooks
     */
    getFilteredAudiobooks() {
        return [...this.filteredAudiobooks];
    }

    /**
     * Dispatch custom events
     * @param {string} eventName - Name of the event
     * @param {Object} detail - Event detail data
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true
        });
        this.container.dispatchEvent(event);
    }

    /**
     * Announce gallery updates to screen readers
     */
    announceGalleryUpdate() {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';

        const count = this.filteredAudiobooks.length;
        const isFiltered = this.filteredAudiobooks.length !== this.audiobooks.length;

        if (isFiltered) {
            announcement.textContent = `Showing ${count} of ${this.audiobooks.length} audiobooks`;
        } else {
            announcement.textContent = `${count} audiobook${count !== 1 ? 's' : ''} displayed`;
        }

        document.body.appendChild(announcement);

        // Remove after announcement
        setTimeout(() => {
            if (announcement.parentNode) {
                announcement.parentNode.removeChild(announcement);
            }
        }, 1000);
    }

    /**
     * Destroy the gallery and clean up resources
     */
    destroy() {
        // Destroy all book cards
        this.bookCards.forEach(bookCard => bookCard.destroy());
        this.bookCards.clear();

        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }

        // Reset state
        this.audiobooks = [];
        this.filteredAudiobooks = [];
    }
}