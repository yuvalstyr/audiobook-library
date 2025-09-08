/**
 * BookDetailModal component for displaying book details with edit/delete options
 * Provides a modal view with book information and management actions
 */
export class BookDetailModal {
    constructor(onEdit, onDelete, onClose) {
        this.onEdit = onEdit;
        this.onDelete = onDelete;
        this.onClose = onClose;
        this.audiobook = null;
        this.isVisible = false;
        this.modalElement = null;

        this.createModal();
        this.setupEventListeners();
    }

    /**
     * Create the modal structure
     */
    createModal() {
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'fixed inset-0 z-50 hidden';
        this.modalElement.innerHTML = `
            <!-- Modal backdrop -->
            <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" id="detail-modal-backdrop"></div>
            
            <!-- Modal content -->
            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <div class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <!-- Modal header -->
                        <div class="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 class="text-xl font-semibold text-gray-900">
                                Book Details
                            </h2>
                            <button type="button" id="close-detail-modal-btn" class="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Modal body -->
                        <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <!-- Book cover and basic info -->
                                <div class="lg:col-span-1">
                                    <div class="space-y-4">
                                        <!-- Cover image -->
                                        <div class="aspect-book w-full max-w-xs mx-auto">
                                            <img id="detail-cover" 
                                                class="w-full h-full object-cover rounded-lg shadow-lg"
                                                alt="Book cover"
                                                onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
                                        </div>
                                        
                                        <!-- Rating -->
                                        <div class="text-center">
                                            <div id="detail-rating" class="flex items-center justify-center space-x-1 mb-2">
                                                <!-- Stars will be populated here -->
                                            </div>
                                            <span id="detail-rating-text" class="text-sm text-gray-600"></span>
                                        </div>
                                        
                                        <!-- Status indicator -->
                                        <div id="detail-status" class="text-center">
                                            <!-- Status badge will be populated here -->
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Book details -->
                                <div class="lg:col-span-2 space-y-6">
                                    <!-- Title and Author -->
                                    <div>
                                        <h1 id="detail-title" class="text-3xl font-bold text-gray-900 mb-2"></h1>
                                        <p id="detail-author" class="text-xl text-gray-600 mb-1"></p>
                                        <p id="detail-narrator" class="text-lg text-gray-500"></p>
                                    </div>
                                    
                                    <!-- Book metadata -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h3 class="text-sm font-medium text-gray-700 mb-1">Length</h3>
                                            <p id="detail-length" class="text-gray-900"></p>
                                        </div>
                                        <div>
                                            <h3 class="text-sm font-medium text-gray-700 mb-1">Release Date</h3>
                                            <p id="detail-release-date" class="text-gray-900"></p>
                                        </div>
                                        <div>
                                            <h3 class="text-sm font-medium text-gray-700 mb-1">Price</h3>
                                            <p id="detail-price" class="text-gray-900 font-semibold"></p>
                                        </div>
                                        <div>
                                            <h3 class="text-sm font-medium text-gray-700 mb-1">Audible Link</h3>
                                            <div id="detail-url-container">
                                                <!-- URL link will be populated here -->
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Categories -->
                                    <div class="space-y-4">
                                        <!-- Genres -->
                                        <div>
                                            <h3 class="text-sm font-medium text-gray-700 mb-2">Genres</h3>
                                            <div id="detail-genres" class="flex flex-wrap gap-2">
                                                <!-- Genre tags will be populated here -->
                                            </div>
                                        </div>
                                        
                                        <!-- Moods -->
                                        <div id="detail-moods-section">
                                            <h3 class="text-sm font-medium text-gray-700 mb-2">Moods</h3>
                                            <div id="detail-moods" class="flex flex-wrap gap-2">
                                                <!-- Mood tags will be populated here -->
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Modal footer -->
                        <div class="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                            <button type="button" id="close-detail-btn" class="btn-secondary">
                                Close
                            </button>
                            <div class="flex space-x-3">
                                <button type="button" id="edit-book-btn" class="btn-secondary">
                                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                    Edit Book
                                </button>
                                <button type="button" id="delete-book-btn" class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                    Delete Book
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalElement);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Modal close events
        const closeBtn = this.modalElement.querySelector('#close-detail-modal-btn');
        const closeDetailBtn = this.modalElement.querySelector('#close-detail-btn');
        const backdrop = this.modalElement.querySelector('#detail-modal-backdrop');

        closeBtn.addEventListener('click', () => this.hide());
        closeDetailBtn.addEventListener('click', () => this.hide());
        backdrop.addEventListener('click', () => this.hide());

        // Action buttons
        const editBtn = this.modalElement.querySelector('#edit-book-btn');
        const deleteBtn = this.modalElement.querySelector('#delete-book-btn');

        editBtn.addEventListener('click', () => this.handleEdit());
        deleteBtn.addEventListener('click', () => this.handleDelete());

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Show the modal with audiobook details
     * @param {Audiobook} audiobook - Audiobook to display
     */
    show(audiobook) {
        this.audiobook = audiobook;
        this.populateDetails(audiobook);
        this.isVisible = true;
        this.modalElement.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide the modal
     */
    hide() {
        this.isVisible = false;
        this.modalElement.classList.add('hidden');
        document.body.style.overflow = '';

        if (this.onClose) {
            this.onClose();
        }
    }

    /**
     * Populate modal with audiobook details
     * @param {Audiobook} audiobook - Audiobook data
     */
    populateDetails(audiobook) {
        // Cover image
        const coverImg = this.modalElement.querySelector('#detail-cover');
        coverImg.src = audiobook.image || '/images/placeholder.svg';
        coverImg.alt = `Cover of ${audiobook.title}`;

        // Basic info
        this.modalElement.querySelector('#detail-title').textContent = audiobook.title;
        this.modalElement.querySelector('#detail-author').textContent = `by ${audiobook.author}`;
        this.modalElement.querySelector('#detail-narrator').textContent = audiobook.narrator ? `Narrated by ${audiobook.narrator}` : '';

        // Rating
        this.populateRating(audiobook.rating);

        // Status
        this.populateStatus(audiobook.genres);

        // Metadata
        this.modalElement.querySelector('#detail-length').textContent = audiobook.length || 'Not specified';
        this.modalElement.querySelector('#detail-release-date').textContent = audiobook.releaseDate ?
            new Date(audiobook.releaseDate).toLocaleDateString() : 'Not specified';
        this.modalElement.querySelector('#detail-price').textContent = audiobook.price ?
            `$${audiobook.price.toFixed(2)}` : 'Not specified';

        // URL
        this.populateUrl(audiobook.url);

        // Categories
        this.populateGenres(audiobook.genres);
        this.populateMoods(audiobook.moods);
    }

    /**
     * Populate rating display
     * @param {number} rating - Rating value
     */
    populateRating(rating) {
        const ratingContainer = this.modalElement.querySelector('#detail-rating');
        const ratingText = this.modalElement.querySelector('#detail-rating-text');

        if (rating) {
            ratingContainer.innerHTML = this.renderStars(rating);
            ratingText.textContent = `${rating} out of 5 stars`;
        } else {
            ratingContainer.innerHTML = '<span class="text-gray-400">No rating</span>';
            ratingText.textContent = '';
        }
    }

    /**
     * Render star rating display
     * @param {number} rating - Rating value (0-5)
     * @returns {string} HTML for star rating
     */
    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHtml = '';

        // Full stars
        for (let i = 0; i < fullStars; i++) {
            starsHtml += '<svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
        }

        // Half star
        if (hasHalfStar) {
            starsHtml += '<svg class="w-5 h-5 text-yellow-400" viewBox="0 0 20 20"><defs><linearGradient id="half-detail"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><path fill="url(#half-detail)" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
        }

        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            starsHtml += '<svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 20 20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
        }

        return starsHtml;
    }

    /**
     * Populate status indicator
     * @param {Array} genres - Book genres
     */
    populateStatus(genres) {
        const statusContainer = this.modalElement.querySelector('#detail-status');
        const statusGenres = ['next', 'done'];
        const status = genres.find(genre => statusGenres.includes(genre));

        if (status) {
            const statusConfig = {
                'next': { color: 'bg-orange-500', text: 'Next to Read' },
                'done': { color: 'bg-green-500', text: 'Completed' }
            };

            const config = statusConfig[status];
            statusContainer.innerHTML = `
                <span class="${config.color} text-white px-4 py-2 rounded-full text-sm font-medium">
                    ${config.text}
                </span>
            `;
        } else {
            statusContainer.innerHTML = '';
        }
    }

    /**
     * Populate URL link
     * @param {string} url - Audible URL
     */
    populateUrl(url) {
        const urlContainer = this.modalElement.querySelector('#detail-url-container');

        if (url) {
            urlContainer.innerHTML = `
                <a href="${url}" target="_blank" rel="noopener noreferrer" 
                   class="text-blue-600 hover:text-blue-800 underline">
                    View on Audible
                    <svg class="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                </a>
            `;
        } else {
            urlContainer.innerHTML = '<span class="text-gray-400">Not available</span>';
        }
    }

    /**
     * Populate genre tags
     * @param {Array} genres - Book genres
     */
    populateGenres(genres) {
        const genresContainer = this.modalElement.querySelector('#detail-genres');
        const displayGenres = genres.filter(genre => !['next', 'done'].includes(genre));

        if (displayGenres.length === 0) {
            genresContainer.innerHTML = '<span class="text-gray-400">No genres specified</span>';
            return;
        }

        const genreColors = {
            'action': 'bg-red-100 text-red-800',
            'thriller': 'bg-red-200 text-red-900',
            'fantasy': 'bg-purple-100 text-purple-800',
            'sci-fi': 'bg-blue-100 text-blue-800',
            'classic': 'bg-amber-100 text-amber-800'
        };

        const genreTags = displayGenres.map(genre => {
            const colorClass = genreColors[genre] || 'bg-gray-100 text-gray-800';
            return `<span class="px-3 py-1 rounded-full text-sm font-medium ${colorClass}">${this.escapeHtml(genre)}</span>`;
        }).join('');

        genresContainer.innerHTML = genreTags;
    }

    /**
     * Populate mood tags
     * @param {Array} moods - Book moods
     */
    populateMoods(moods) {
        const moodsContainer = this.modalElement.querySelector('#detail-moods');
        const moodsSection = this.modalElement.querySelector('#detail-moods-section');

        if (moods.length === 0) {
            moodsSection.style.display = 'none';
            return;
        }

        moodsSection.style.display = 'block';
        const moodTags = moods.map(mood =>
            `<span class="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">${this.escapeHtml(mood)}</span>`
        ).join('');

        moodsContainer.innerHTML = moodTags;
    }

    /**
     * Handle edit button click
     */
    handleEdit() {
        if (this.onEdit && this.audiobook) {
            this.hide(); // Hide the detail modal first
            this.onEdit(this.audiobook);
        }
    }

    /**
     * Handle delete button click
     */
    handleDelete() {
        if (this.onDelete && this.audiobook) {
            this.onDelete(this.audiobook);
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Destroy the modal and clean up
     */
    destroy() {
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
        }
        this.modalElement = null;
    }
}