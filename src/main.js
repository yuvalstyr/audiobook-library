// Application entry point
import './style.css'
import { Gallery } from './components/Gallery.js'
import { SearchBar } from './components/SearchBar.js'
import { Filters } from './components/Filters.js'
import { BookForm } from './components/BookForm.js'
import { BookDetailModal } from './components/BookDetailModal.js'
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal.js'
import { ImportExportModal } from './components/ImportExportModal.js'
import { DataService } from './services/DataService.js'
import { StorageService } from './services/StorageService.js'
import { FilterManager } from './utils/FilterManager.js'

class AudiobookLibraryApp {
    constructor() {
        this.dataService = new DataService();
        this.storageService = new StorageService();
        this.gallery = null;
        this.searchBar = null;
        this.filters = null;
        this.bookForm = null;
        this.bookDetailModal = null;
        this.deleteConfirmationModal = null;
        this.importExportModal = null;
        this.filterManager = null;
        this.collection = null;

        this.init();
    }

    async init() {
        try {
            // Initialize components
            await this.initializeComponents();

            // Load audiobook collection
            await this.loadCollection();

            // Set up event listeners
            this.setupEventListeners();

            console.log('Audiobook Library initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Audiobook Library:', error);
            this.showError('Failed to load audiobook library. Please refresh the page.');
        }
    }

    /**
     * Initialize all UI components
     */
    async initializeComponents() {
        // Initialize gallery
        const galleryContainer = document.getElementById('gallery-container');
        if (!galleryContainer) {
            throw new Error('Gallery container not found');
        }

        this.gallery = new Gallery(galleryContainer);
        this.gallery.setLoading(true);

        // Initialize filter manager
        this.filterManager = new FilterManager((filteredBooks) => {
            this.gallery.updateFilter(filteredBooks);
        });

        // Initialize search bar
        const searchContainer = document.getElementById('search-container');
        if (searchContainer) {
            this.searchBar = new SearchBar(searchContainer, (searchTerm) => {
                this.filterManager.updateSearch(searchTerm);
            });
        }

        // Initialize filters
        const filtersContainer = document.getElementById('filters-container');
        if (filtersContainer) {
            this.filters = new Filters(filtersContainer, (filters) => {
                this.filterManager.updateFilters(filters);
            });
        }

        // Initialize book form
        this.bookForm = new BookForm(
            (audiobook, action) => this.handleBookFormSubmit(audiobook, action),
            () => this.handleBookFormCancel()
        );

        // Initialize book detail modal
        this.bookDetailModal = new BookDetailModal(
            (audiobook) => this.handleEditBook(audiobook),
            (audiobook) => this.handleDeleteBookRequest(audiobook),
            () => this.handleBookDetailClose()
        );

        // Initialize delete confirmation modal
        this.deleteConfirmationModal = new DeleteConfirmationModal(
            (audiobook) => this.handleDeleteBookConfirm(audiobook),
            () => this.handleDeleteBookCancel()
        );

        // Initialize import/export modal
        this.importExportModal = new ImportExportModal(
            (collection, stats) => this.handleImportComplete(collection, stats),
            (result, format) => this.handleExportComplete(result, format)
        );
    }

    async loadCollection() {
        try {
            console.log('Loading collection...');
            this.collection = await this.dataService.loadCollection();
            console.log('Collection loaded:', this.collection);

            // Set audiobooks in gallery and filter manager
            this.gallery.setAudiobooks(this.collection.audiobooks);
            this.filterManager.setAudiobooks(this.collection.audiobooks);

            // Update filters with available options
            if (this.filters) {
                this.filters.updateAvailableFilters(
                    this.collection.audiobooks,
                    this.collection.customGenres || [],
                    this.collection.customMoods || []
                );
            }

            this.gallery.setLoading(false);
        } catch (error) {
            console.error('Failed to load collection:', error);
            this.gallery.setLoading(false);
            this.showError('Failed to load audiobook collection.');
        }
    }

    setupEventListeners() {
        // Gallery events
        if (this.gallery) {
            this.gallery.container.addEventListener('bookSelected', (event) => {
                this.handleBookSelection(event.detail.audiobook);
            });

            this.gallery.container.addEventListener('editBook', (event) => {
                this.handleEditBook(event.detail.audiobook);
            });

            this.gallery.container.addEventListener('addBook', () => {
                this.handleAddBook();
            });

            this.gallery.container.addEventListener('clearFilters', () => {
                this.handleClearFilters();
            });

            this.gallery.container.addEventListener('importExport', () => {
                this.handleImportExport();
            });
        }

        // Header button events
        const addBookBtn = document.getElementById('add-book-btn');
        if (addBookBtn) {
            addBookBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.handleAddBook();
            });
        }

        const importExportBtn = document.getElementById('import-export-btn');
        if (importExportBtn) {
            importExportBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.handleImportExport();
            });
        }

        // Mobile filter toggle events
        this.setupMobileFilterEvents();

        // Global keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });

        // Handle window resize for mobile responsiveness
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        // Handle orientation change on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleWindowResize(), 100);
        });
    }

    /**
     * Set up mobile filter toggle functionality
     */
    setupMobileFilterEvents() {
        const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
        const mobileFilterClose = document.getElementById('mobile-filter-close');
        const mobileFilterOverlay = document.getElementById('mobile-filter-overlay');
        const filtersContainer = document.getElementById('filters-container');

        if (mobileFilterToggle) {
            mobileFilterToggle.addEventListener('click', () => {
                this.toggleMobileFilters(true);
            });
        }

        if (mobileFilterClose) {
            mobileFilterClose.addEventListener('click', () => {
                this.toggleMobileFilters(false);
            });
        }

        if (mobileFilterOverlay) {
            mobileFilterOverlay.addEventListener('click', () => {
                this.toggleMobileFilters(false);
            });
        }

        // Handle escape key to close mobile filters
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isMobileFiltersOpen()) {
                this.toggleMobileFilters(false);
            }
        });
    }

    /**
     * Toggle mobile filters visibility
     * @param {boolean} open - Whether to open or close filters
     */
    toggleMobileFilters(open) {
        const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
        const mobileFilterOverlay = document.getElementById('mobile-filter-overlay');
        const filtersContainer = document.getElementById('filters-container');

        if (!filtersContainer || !mobileFilterOverlay || !mobileFilterToggle) return;

        if (open) {
            // Open filters
            mobileFilterOverlay.classList.remove('hidden');
            filtersContainer.classList.add('filters-mobile-open');
            filtersContainer.setAttribute('aria-hidden', 'false');
            mobileFilterToggle.setAttribute('aria-expanded', 'true');

            // Focus the close button for accessibility
            const closeButton = document.getElementById('mobile-filter-close');
            if (closeButton) {
                setTimeout(() => closeButton.focus(), 100);
            }

            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        } else {
            // Close filters
            mobileFilterOverlay.classList.add('hidden');
            filtersContainer.classList.remove('filters-mobile-open');
            filtersContainer.setAttribute('aria-hidden', 'true');
            mobileFilterToggle.setAttribute('aria-expanded', 'false');

            // Return focus to toggle button
            mobileFilterToggle.focus();

            // Restore body scroll
            document.body.style.overflow = '';
        }
    }

    /**
     * Check if mobile filters are currently open
     * @returns {boolean} True if mobile filters are open
     */
    isMobileFiltersOpen() {
        const filtersContainer = document.getElementById('filters-container');
        return filtersContainer && filtersContainer.classList.contains('filters-mobile-open');
    }

    /**
     * Handle window resize events
     */
    handleWindowResize() {
        // Close mobile filters on desktop resize
        if (window.innerWidth >= 1024 && this.isMobileFiltersOpen()) {
            this.toggleMobileFilters(false);
        }
    }

    /**
     * Handle global keyboard shortcuts
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardShortcuts(event) {
        // Don't handle shortcuts when typing in inputs or textareas
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            // Only handle Escape in inputs
            if (event.key === 'Escape') {
                event.target.blur();
                this.handleClearFilters();
            }
            return;
        }

        // Ctrl/Cmd + K: Focus search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            if (this.searchBar) {
                this.searchBar.focus();
            }
        }

        // Ctrl/Cmd + F: Focus search (alternative)
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            if (this.searchBar) {
                this.searchBar.focus();
            }
        }

        // Ctrl/Cmd + N: Add new book
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            this.handleAddBook();
        }

        // F: Toggle filters on mobile
        if (event.key === 'f' || event.key === 'F') {
            if (window.innerWidth < 1024) {
                event.preventDefault();
                this.toggleMobileFilters(!this.isMobileFiltersOpen());
            }
        }

        // Escape: Clear search and filters, or close mobile filters
        if (event.key === 'Escape') {
            if (this.isMobileFiltersOpen()) {
                this.toggleMobileFilters(false);
            } else {
                this.handleClearFilters();
            }
        }

        // Arrow keys for gallery navigation
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            this.handleGalleryNavigation(event);
        }
    }

    /**
     * Handle keyboard navigation within the gallery
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleGalleryNavigation(event) {
        const bookCards = document.querySelectorAll('.book-card');
        const focusedCard = document.activeElement.closest('.book-card');

        if (!focusedCard || bookCards.length === 0) return;

        const currentIndex = Array.from(bookCards).indexOf(focusedCard);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;
        const columns = this.getGalleryColumns();

        switch (event.key) {
            case 'ArrowLeft':
                nextIndex = Math.max(0, currentIndex - 1);
                break;
            case 'ArrowRight':
                nextIndex = Math.min(bookCards.length - 1, currentIndex + 1);
                break;
            case 'ArrowUp':
                nextIndex = Math.max(0, currentIndex - columns);
                break;
            case 'ArrowDown':
                nextIndex = Math.min(bookCards.length - 1, currentIndex + columns);
                break;
        }

        if (nextIndex !== currentIndex) {
            event.preventDefault();
            bookCards[nextIndex].focus();
        }
    }

    /**
     * Get the number of columns in the current gallery layout
     * @returns {number} Number of columns
     */
    getGalleryColumns() {
        const width = window.innerWidth;
        if (width >= 1536) return 6; // 2xl
        if (width >= 1280) return 5; // xl
        if (width >= 1024) return 4; // lg
        if (width >= 768) return 3;  // md
        if (width >= 640) return 2;  // sm
        return 1; // default
    }

    handleBookSelection(audiobook) {
        console.log('Book selected:', audiobook);
        if (this.bookDetailModal) {
            this.bookDetailModal.show(audiobook);
        }
    }

    handleAddBook() {
        console.log('Add book requested');
        if (this.bookForm && this.collection) {
            this.bookForm.showAdd(
                this.collection.customGenres || [],
                this.collection.customMoods || []
            );
        }
    }

    handleEditBook(audiobook) {
        console.log('Edit book requested:', audiobook.title);
        if (this.bookForm && this.collection) {
            // Don't hide the detail modal here - let the form handle it
            this.bookForm.showEdit(
                audiobook,
                this.collection.customGenres || [],
                this.collection.customMoods || []
            );
        }
    }

    /**
     * Handle book form submission (add or edit)
     * @param {Audiobook} audiobook - The audiobook data
     * @param {string} action - 'add' or 'edit'
     */
    async handleBookFormSubmit(audiobook, action) {
        try {
            if (action === 'add') {
                // Add to collection
                this.collection.audiobooks.push(audiobook);
                this.collection.lastUpdated = new Date().toISOString();

                // Update custom genres/moods if any were added
                const formCustomGenres = this.bookForm.getCustomGenres();
                const formCustomMoods = this.bookForm.getCustomMoods();

                formCustomGenres.forEach(genre => {
                    if (!this.collection.customGenres.includes(genre)) {
                        this.collection.customGenres.push(genre);
                    }
                });

                formCustomMoods.forEach(mood => {
                    if (!this.collection.customMoods.includes(mood)) {
                        this.collection.customMoods.push(mood);
                    }
                });

                // Save entire collection to storage
                await this.storageService.saveCollection(this.collection);

                // Update gallery and filter manager
                this.gallery.setAudiobooks(this.collection.audiobooks);
                this.filterManager.setAudiobooks(this.collection.audiobooks);

                // Update filters with new options
                if (this.filters) {
                    this.filters.updateAvailableFilters(
                        this.collection.audiobooks,
                        this.collection.customGenres,
                        this.collection.customMoods
                    );
                }

                console.log('Book added successfully:', audiobook.title);

            } else if (action === 'edit') {
                // Update in collection first
                const index = this.collection.audiobooks.findIndex(book => book.id === audiobook.id);
                if (index === -1) {
                    throw new Error('Audiobook not found in collection');
                }

                this.collection.audiobooks[index] = audiobook;
                this.collection.lastUpdated = new Date().toISOString();

                // Save entire collection to storage
                await this.storageService.saveCollection(this.collection);

                // Update custom genres/moods if any were added
                const formCustomGenres = this.bookForm.getCustomGenres();
                const formCustomMoods = this.bookForm.getCustomMoods();

                formCustomGenres.forEach(genre => {
                    if (!this.collection.customGenres.includes(genre)) {
                        this.collection.customGenres.push(genre);
                    }
                });

                formCustomMoods.forEach(mood => {
                    if (!this.collection.customMoods.includes(mood)) {
                        this.collection.customMoods.push(mood);
                    }
                });

                // Update gallery and filter manager
                this.gallery.setAudiobooks(this.collection.audiobooks);
                this.filterManager.setAudiobooks(this.collection.audiobooks);

                // Update filters with new options
                if (this.filters) {
                    this.filters.updateAvailableFilters(
                        this.collection.audiobooks,
                        this.collection.customGenres,
                        this.collection.customMoods
                    );
                }

                console.log('Book updated successfully:', audiobook.title);
            }

        } catch (error) {
            console.error('Failed to save audiobook:', error);
            throw new Error(`Failed to ${action} audiobook: ${error.message}`);
        }
    }

    /**
     * Handle book form cancellation
     */
    handleBookFormCancel() {
        console.log('Book form cancelled');
    }

    /**
     * Handle book detail modal close
     */
    handleBookDetailClose() {
        console.log('Book detail modal closed');
    }

    /**
     * Handle delete book request from detail modal
     * @param {Audiobook} audiobook - Audiobook to delete
     */
    handleDeleteBookRequest(audiobook) {
        console.log('Delete book requested:', audiobook.title);
        if (this.deleteConfirmationModal) {
            // Hide detail modal first
            this.bookDetailModal.hide();
            // Show delete confirmation
            this.deleteConfirmationModal.show(audiobook);
        }
    }

    /**
     * Handle delete book confirmation
     * @param {Audiobook} audiobook - Audiobook to delete
     */
    async handleDeleteBookConfirm(audiobook) {
        try {
            console.log('Deleting book:', audiobook.title);

            // Remove from collection
            const index = this.collection.audiobooks.findIndex(book => book.id === audiobook.id);
            if (index === -1) {
                throw new Error('Audiobook not found in collection');
            }

            this.collection.audiobooks.splice(index, 1);
            this.collection.lastUpdated = new Date().toISOString();

            // Save updated collection to storage with timeout
            const savePromise = this.storageService.saveCollection(this.collection);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Delete operation timed out')), 10000)
            );

            await Promise.race([savePromise, timeoutPromise]);

            // Update gallery and filter manager
            this.gallery.setAudiobooks(this.collection.audiobooks);
            this.filterManager.setAudiobooks(this.collection.audiobooks);

            // Update filters with new options (in case we removed the last book with certain genres/moods)
            if (this.filters) {
                this.filters.updateAvailableFilters(
                    this.collection.audiobooks,
                    this.collection.customGenres || [],
                    this.collection.customMoods || []
                );
            }

            console.log('Book deleted successfully:', audiobook.title);

        } catch (error) {
            console.error('Failed to delete audiobook:', error);
            throw new Error(`Failed to delete audiobook: ${error.message}`);
        }
    }

    /**
     * Handle delete book cancellation
     */
    handleDeleteBookCancel() {
        console.log('Delete book cancelled');
    }

    handleImportExport() {
        console.log('Import/Export requested');
        if (this.importExportModal && this.collection) {
            this.importExportModal.show(this.collection);
        }
    }

    /**
     * Handle import completion
     * @param {Object} collection - Updated collection after import
     * @param {Object} stats - Import statistics
     */
    async handleImportComplete(collection, stats) {
        try {
            console.log('Import completed:', stats);

            // Update the collection
            this.collection = collection;

            // Save to storage
            await this.storageService.saveCollection(this.collection);

            // Update gallery and filter manager
            this.gallery.setAudiobooks(this.collection.audiobooks);
            this.filterManager.setAudiobooks(this.collection.audiobooks);

            // Update filters with new options
            if (this.filters) {
                this.filters.updateAvailableFilters(
                    this.collection.audiobooks,
                    this.collection.customGenres || [],
                    this.collection.customMoods || []
                );
            }

            console.log(`Successfully imported ${stats.successful} books`);

        } catch (error) {
            console.error('Failed to complete import:', error);
            throw new Error(`Failed to save imported data: ${error.message}`);
        }
    }

    /**
     * Handle export completion
     * @param {Object} result - Export result
     * @param {string} format - Export format (json/csv)
     */
    handleExportComplete(result, format) {
        console.log(`Export completed: ${result.filename} (${format})`);
    }

    handleClearFilters() {
        console.log('Clear filters requested');

        // Clear all filters and search
        if (this.filterManager) {
            this.filterManager.clearAll();
        }

        // Reset UI components
        if (this.searchBar) {
            this.searchBar.setSearchTerm('');
        }

        if (this.filters) {
            this.filters.setFilters({ genres: [], moods: [] });
        }
    }

    showError(message) {
        // Simple error display - can be enhanced later
        const galleryContainer = document.getElementById('gallery-container');
        if (galleryContainer) {
            galleryContainer.innerHTML = `
                <div class="text-center py-16">
                    <div class="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                        <svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Library</h3>
                    <p class="text-gray-600 mb-6">${message}</p>
                    <button onclick="window.location.reload()" class="btn-primary">Reload Page</button>
                </div>
            `;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AudiobookLibraryApp();
});