import { Audiobook } from '../models/Audiobook.js';

/**
 * BookForm component for adding and editing audiobooks
 * Provides a modal form with validation and data persistence
 */
export class BookForm {
    constructor(onSubmit, onCancel) {
        this.onSubmit = onSubmit;
        this.onCancel = onCancel;
        this.audiobook = null; // Current audiobook being edited (null for new)
        this.isVisible = false;
        this.isSubmitting = false;
        this.formElement = null;
        this.modalElement = null;
        this.validationErrors = {};

        // Available options for genres and moods
        this.defaultGenres = ['next', 'done', 'action', 'thriller', 'fantasy', 'sci-fi'];
        this.defaultMoods = ['funny', 'fast-paced', 'heavy'];
        this.customGenres = [];
        this.customMoods = [];

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
            <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" id="modal-backdrop"></div>
            
            <!-- Modal content -->
            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                        <!-- Modal header -->
                        <div class="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 id="modal-title" class="text-xl font-semibold text-gray-900">
                                Add New Audiobook
                            </h2>
                            <button type="button" id="close-modal-btn" class="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Modal body -->
                        <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                            <form id="book-form" class="space-y-6">
                                <!-- Basic Information -->
                                <div class="space-y-4">
                                    <h3 class="text-lg font-medium text-gray-900">Basic Information</h3>
                                    
                                    <!-- Title -->
                                    <div>
                                        <label for="title" class="block text-sm font-medium text-gray-700 mb-1">
                                            Title <span class="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="title" name="title" required
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter book title">
                                        <div class="error-message hidden text-sm text-red-600 mt-1"></div>
                                    </div>
                                    
                                    <!-- Author -->
                                    <div>
                                        <label for="author" class="block text-sm font-medium text-gray-700 mb-1">
                                            Author <span class="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="author" name="author" required
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter author name">
                                        <div class="error-message hidden text-sm text-red-600 mt-1"></div>
                                    </div>
                                    
                                    <!-- Narrator -->
                                    <div>
                                        <label for="narrator" class="block text-sm font-medium text-gray-700 mb-1">
                                            Narrator
                                        </label>
                                        <input type="text" id="narrator" name="narrator"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter narrator name">
                                        <div class="error-message hidden text-sm text-red-600 mt-1"></div>
                                    </div>
                                </div>
                                
                                <!-- URLs and Media -->
                                <div class="space-y-4">
                                    <h3 class="text-lg font-medium text-gray-900">URLs and Media</h3>
                                    
                                    <!-- Audible URL -->
                                    <div>
                                        <label for="url" class="block text-sm font-medium text-gray-700 mb-1">
                                            Audible URL
                                        </label>
                                        <input type="url" id="url" name="url"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="https://www.audible.com/pd/...">
                                        <div class="error-message hidden text-sm text-red-600 mt-1"></div>
                                    </div>
                                    
                                    <!-- Cover Image URL -->
                                    <div>
                                        <label for="image" class="block text-sm font-medium text-gray-700 mb-1">
                                            Cover Image URL
                                        </label>
                                        <input type="url" id="image" name="image"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="https://example.com/cover.jpg">
                                        <div class="error-message hidden text-sm text-red-600 mt-1"></div>
                                        <div id="image-preview" class="mt-2 hidden">
                                            <img class="w-20 h-28 object-cover rounded border" alt="Cover preview">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Book Details -->
                                <div class="space-y-4">
                                    <h3 class="text-lg font-medium text-gray-900">Book Details</h3>
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <!-- Length -->
                                        <div>
                                            <label for="length" class="block text-sm font-medium text-gray-700 mb-1">
                                                Length
                                            </label>
                                            <input type="text" id="length" name="length"
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="6 hrs and 40 mins">
                                            <div class="error-message hidden text-sm text-red-600 mt-1"></div>
                                        </div>
                                        
                                        <!-- Release Date -->
                                        <div>
                                            <label for="releaseDate" class="block text-sm font-medium text-gray-700 mb-1">
                                                Release Date
                                            </label>
                                            <input type="date" id="releaseDate" name="releaseDate"
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                            <div class="error-message hidden text-sm text-red-600 mt-1"></div>
                                        </div>
                                        
                                        <!-- Rating -->
                                        <div>
                                            <label for="rating" class="block text-sm font-medium text-gray-700 mb-1">
                                                Rating
                                            </label>
                                            <select id="rating" name="rating"
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                                <option value="">Select rating</option>
                                                <option value="1">1 Star</option>
                                                <option value="2">2 Stars</option>
                                                <option value="3">3 Stars</option>
                                                <option value="4">4 Stars</option>
                                                <option value="5">5 Stars</option>
                                            </select>
                                            <div class="error-message hidden text-sm text-red-600 mt-1"></div>
                                        </div>
                                        
                                        <!-- Price -->
                                        <div>
                                            <label for="price" class="block text-sm font-medium text-gray-700 mb-1">
                                                Price ($)
                                            </label>
                                            <input type="number" id="price" name="price" step="0.01" min="0"
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="10.99">
                                            <div class="error-message hidden text-sm text-red-600 mt-1"></div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Categories -->
                                <div class="space-y-4">
                                    <h3 class="text-lg font-medium text-gray-900">Categories</h3>
                                    
                                    <!-- Genres -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            Genres
                                        </label>
                                        <div id="genres-container" class="space-y-2">
                                            <!-- Genre checkboxes will be populated here -->
                                        </div>
                                        <div class="mt-2">
                                            <input type="text" id="custom-genre" placeholder="Add custom genre..."
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                                        </div>
                                    </div>
                                    
                                    <!-- Moods -->
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            Moods
                                        </label>
                                        <div id="moods-container" class="space-y-2">
                                            <!-- Mood checkboxes will be populated here -->
                                        </div>
                                        <div class="mt-2">
                                            <input type="text" id="custom-mood" placeholder="Add custom mood..."
                                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <!-- Modal footer -->
                        <div class="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                            <button type="button" id="cancel-btn" class="btn-secondary">
                                Cancel
                            </button>
                            <button type="button" id="submit-btn" class="btn-primary">
                                <span id="submit-text">Add Book</span>
                                <div id="submit-spinner" class="hidden ml-2">
                                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalElement);
        this.formElement = this.modalElement.querySelector('#book-form');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Modal close events
        const closeBtn = this.modalElement.querySelector('#close-modal-btn');
        const cancelBtn = this.modalElement.querySelector('#cancel-btn');
        const backdrop = this.modalElement.querySelector('#modal-backdrop');

        closeBtn.addEventListener('click', () => this.hide());
        cancelBtn.addEventListener('click', () => this.hide());
        backdrop.addEventListener('click', () => this.hide());

        // Submit button click
        const submitBtn = this.modalElement.querySelector('#submit-btn');
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSubmit(e);
        });

        // Real-time validation
        const inputs = this.formElement.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });

        // Image preview
        const imageInput = this.modalElement.querySelector('#image');
        imageInput.addEventListener('input', () => this.updateImagePreview());

        // Custom genre/mood handling
        const customGenreInput = this.modalElement.querySelector('#custom-genre');
        const customMoodInput = this.modalElement.querySelector('#custom-mood');

        customGenreInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addCustomGenre(customGenreInput.value.trim());
                customGenreInput.value = '';
            }
        });

        customMoodInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addCustomMood(customMoodInput.value.trim());
                customMoodInput.value = '';
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }    /*
*
     * Show the modal for adding a new book
     * @param {Array} customGenres - Available custom genres
     * @param {Array} customMoods - Available custom moods
     */
    showAdd(customGenres = [], customMoods = []) {
        this.audiobook = null;
        this.customGenres = customGenres;
        this.customMoods = customMoods;

        this.modalElement.querySelector('#modal-title').textContent = 'Add New Audiobook';
        this.modalElement.querySelector('#submit-text').textContent = 'Add Book';

        this.resetForm();
        this.populateCategories();
        this.show();
    }

    /**
     * Show the modal for editing an existing book
     * @param {Audiobook} audiobook - Audiobook to edit
     * @param {Array} customGenres - Available custom genres
     * @param {Array} customMoods - Available custom moods
     */
    showEdit(audiobook, customGenres = [], customMoods = []) {
        this.audiobook = audiobook;
        this.customGenres = customGenres;
        this.customMoods = customMoods;

        this.modalElement.querySelector('#modal-title').textContent = 'Edit Audiobook';
        this.modalElement.querySelector('#submit-text').textContent = 'Save Changes';

        this.populateForm(audiobook);
        this.populateCategories();
        this.show();
    }

    /**
     * Show the modal
     */
    show() {
        this.isVisible = true;
        this.modalElement.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Focus first input
        setTimeout(() => {
            const firstInput = this.formElement.querySelector('input');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    /**
     * Hide the modal
     */
    hide() {
        this.isVisible = false;
        this.modalElement.classList.add('hidden');
        document.body.style.overflow = '';
        this.resetForm();

        if (this.onCancel) {
            this.onCancel();
        }
    }

    /**
     * Reset the form to initial state
     */
    resetForm() {
        this.formElement.reset();
        this.validationErrors = {};
        this.isSubmitting = false;
        this.clearAllErrors();
        this.hideImagePreview();
        this.setSubmitLoading(false);
    }

    /**
     * Populate form with audiobook data for editing
     * @param {Audiobook} audiobook - Audiobook data
     */
    populateForm(audiobook) {
        this.resetForm();

        // Populate basic fields
        const fields = ['title', 'author', 'narrator', 'url', 'image', 'length', 'releaseDate', 'rating', 'price'];
        fields.forEach(field => {
            const input = this.formElement.querySelector(`#${field}`);
            if (input && audiobook[field] !== undefined) {
                input.value = audiobook[field] || '';
            }
        });

        // Update image preview if image URL exists
        if (audiobook.image) {
            this.updateImagePreview();
        }
    }

    /**
     * Populate genre and mood categories
     */
    populateCategories() {
        this.populateGenres();
        this.populateMoods();
    }

    /**
     * Populate genre checkboxes
     */
    populateGenres() {
        const container = this.modalElement.querySelector('#genres-container');
        const allGenres = [...this.defaultGenres, ...this.customGenres];
        const selectedGenres = this.audiobook ? this.audiobook.genres : [];

        container.innerHTML = allGenres.map(genre => `
            <label class="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" name="genres" value="${genre}" 
                    ${selectedGenres.includes(genre) ? 'checked' : ''}
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm text-gray-700 capitalize">${genre}</span>
            </label>
        `).join('');
    }

    /**
     * Populate mood checkboxes
     */
    populateMoods() {
        const container = this.modalElement.querySelector('#moods-container');
        const allMoods = [...this.defaultMoods, ...this.customMoods];
        const selectedMoods = this.audiobook ? this.audiobook.moods : [];

        container.innerHTML = allMoods.map(mood => `
            <label class="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" name="moods" value="${mood}" 
                    ${selectedMoods.includes(mood) ? 'checked' : ''}
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm text-gray-700 capitalize">${mood}</span>
            </label>
        `).join('');
    }

    /**
     * Add a custom genre
     * @param {string} genre - Genre to add
     */
    addCustomGenre(genre) {
        if (!genre || this.customGenres.includes(genre) || this.defaultGenres.includes(genre)) {
            return;
        }

        this.customGenres.push(genre);
        this.populateGenres();

        // Auto-select the new genre
        const checkbox = this.modalElement.querySelector(`input[name="genres"][value="${genre}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    }

    /**
     * Add a custom mood
     * @param {string} mood - Mood to add
     */
    addCustomMood(mood) {
        if (!mood || this.customMoods.includes(mood) || this.defaultMoods.includes(mood)) {
            return;
        }

        this.customMoods.push(mood);
        this.populateMoods();

        // Auto-select the new mood
        const checkbox = this.modalElement.querySelector(`input[name="moods"][value="${mood}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    }

    /**
     * Update image preview
     */
    updateImagePreview() {
        const imageInput = this.modalElement.querySelector('#image');
        const preview = this.modalElement.querySelector('#image-preview');
        const img = preview.querySelector('img');

        if (imageInput.value.trim()) {
            img.src = imageInput.value;
            img.onload = () => {
                preview.classList.remove('hidden');
            };
            img.onerror = () => {
                this.hideImagePreview();
            };
        } else {
            this.hideImagePreview();
        }
    }

    /**
     * Hide image preview
     */
    hideImagePreview() {
        const preview = this.modalElement.querySelector('#image-preview');
        preview.classList.add('hidden');
    }

    /**
     * Handle form submission
     * @param {Event} event - Submit event
     */
    async handleSubmit(event) {
        event.preventDefault();

        // Prevent double submission
        if (this.isSubmitting) {
            return;
        }

        if (!this.validateForm()) {
            return;
        }

        this.isSubmitting = true;
        this.setSubmitLoading(true);

        try {
            const formData = this.getFormData();
            const audiobook = this.audiobook
                ? new Audiobook({ ...formData, id: this.audiobook.id })
                : new Audiobook(formData);

            // Validate the audiobook
            const validation = audiobook.validate();
            if (!validation.isValid) {
                this.displayValidationErrors(validation.errors);
                this.setSubmitLoading(false);
                return;
            }

            // Call the submit callback
            if (this.onSubmit) {
                await this.onSubmit(audiobook, this.audiobook ? 'edit' : 'add');
            }

            this.hide();

        } catch (error) {
            console.error('Form submission error:', error);
            this.displaySubmissionError(error.message);
            this.setSubmitLoading(false);
        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * Get form data as object
     * @returns {Object} Form data
     */
    getFormData() {
        const formData = new FormData(this.formElement);
        const data = {};

        // Get basic fields
        for (const [key, value] of formData.entries()) {
            if (key !== 'genres' && key !== 'moods') {
                data[key] = value.trim();
            }
        }

        // Convert numeric fields
        if (data.rating) {
            data.rating = parseFloat(data.rating);
        }
        if (data.price) {
            data.price = parseFloat(data.price);
        }

        // Get selected genres and moods
        const genreCheckboxes = this.formElement.querySelectorAll('input[name="genres"]:checked');
        const moodCheckboxes = this.formElement.querySelectorAll('input[name="moods"]:checked');

        data.genres = Array.from(genreCheckboxes).map(cb => cb.value);
        data.moods = Array.from(moodCheckboxes).map(cb => cb.value);

        return data;
    }

    /**
     * Validate the entire form
     * @returns {boolean} True if form is valid
     */
    validateForm() {
        this.clearAllErrors();
        let isValid = true;

        // Validate required fields
        const requiredFields = ['title', 'author'];
        requiredFields.forEach(fieldName => {
            const field = this.formElement.querySelector(`#${fieldName}`);
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Validate optional fields with specific rules
        const optionalFields = ['url', 'image', 'rating', 'price', 'releaseDate'];
        optionalFields.forEach(fieldName => {
            const field = this.formElement.querySelector(`#${fieldName}`);
            if (field.value.trim()) {
                if (!this.validateField(field)) {
                    isValid = false;
                }
            }
        });

        return isValid;
    }

    /**
     * Validate a single field
     * @param {HTMLElement} field - Field to validate
     * @returns {boolean} True if field is valid
     */
    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name || field.id;
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'title':
            case 'author':
                if (!value) {
                    errorMessage = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
                    isValid = false;
                }
                break;

            case 'url':
            case 'image':
                if (value && !this.isValidUrl(value)) {
                    errorMessage = 'Please enter a valid URL';
                    isValid = false;
                }
                break;

            case 'rating':
                if (value) {
                    const rating = parseFloat(value);
                    if (isNaN(rating) || rating < 1 || rating > 5) {
                        errorMessage = 'Rating must be between 1 and 5';
                        isValid = false;
                    }
                }
                break;

            case 'price':
                if (value) {
                    const price = parseFloat(value);
                    if (isNaN(price) || price < 0) {
                        errorMessage = 'Price must be a valid positive number';
                        isValid = false;
                    }
                }
                break;

            case 'releaseDate':
                if (value && !this.isValidDate(value)) {
                    errorMessage = 'Please enter a valid date';
                    isValid = false;
                }
                break;
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        } else {
            this.clearFieldError(field);
        }

        return isValid;
    }

    /**
     * Check if URL is valid
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if date is valid
     * @param {string} dateString - Date string to validate
     * @returns {boolean} True if valid
     */
    isValidDate(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;

        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date) && dateString === date.toISOString().split('T')[0];
    }

    /**
     * Show error for a specific field
     * @param {HTMLElement} field - Field element
     * @param {string} message - Error message
     */
    showFieldError(field, message) {
        const errorElement = field.parentElement.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }

        field.classList.add('border-red-500', 'focus:ring-red-500');
        field.classList.remove('border-gray-300', 'focus:ring-blue-500');
    }

    /**
     * Clear error for a specific field
     * @param {HTMLElement} field - Field element
     */
    clearFieldError(field) {
        const errorElement = field.parentElement.querySelector('.error-message');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }

        field.classList.remove('border-red-500', 'focus:ring-red-500');
        field.classList.add('border-gray-300', 'focus:ring-blue-500');
    }

    /**
     * Clear all form errors
     */
    clearAllErrors() {
        const errorElements = this.modalElement.querySelectorAll('.error-message');
        errorElements.forEach(el => el.classList.add('hidden'));

        const fields = this.formElement.querySelectorAll('input, select');
        fields.forEach(field => {
            field.classList.remove('border-red-500', 'focus:ring-red-500');
            field.classList.add('border-gray-300', 'focus:ring-blue-500');
        });
    }

    /**
     * Display validation errors from Audiobook model
     * @param {Array} errors - Array of error messages
     */
    displayValidationErrors(errors) {
        // Show general error message
        this.displaySubmissionError('Please fix the following errors: ' + errors.join(', '));
    }

    /**
     * Display submission error
     * @param {string} message - Error message
     */
    displaySubmissionError(message) {
        // Create or update error alert
        let errorAlert = this.modalElement.querySelector('#submission-error');
        if (!errorAlert) {
            errorAlert = document.createElement('div');
            errorAlert.id = 'submission-error';
            errorAlert.className = 'bg-red-50 border border-red-200 rounded-md p-4 mb-4';

            const formContainer = this.modalElement.querySelector('.p-6.overflow-y-auto');
            formContainer.insertBefore(errorAlert, formContainer.firstChild);
        }

        errorAlert.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-red-800">${message}</p>
                </div>
            </div>
        `;

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorAlert && errorAlert.parentElement) {
                errorAlert.remove();
            }
        }, 5000);
    }

    /**
     * Set submit button loading state
     * @param {boolean} loading - Whether to show loading state
     */
    setSubmitLoading(loading) {
        const submitBtn = this.modalElement.querySelector('#submit-btn');
        const submitText = this.modalElement.querySelector('#submit-text');
        const submitSpinner = this.modalElement.querySelector('#submit-spinner');

        if (loading) {
            submitBtn.disabled = true;
            submitText.classList.add('opacity-50');
            submitSpinner.classList.remove('hidden');
        } else {
            submitBtn.disabled = false;
            submitText.classList.remove('opacity-50');
            submitSpinner.classList.add('hidden');
        }
    }

    /**
     * Get custom genres that were added during form interaction
     * @returns {Array} Array of custom genres
     */
    getCustomGenres() {
        return [...this.customGenres];
    }

    /**
     * Get custom moods that were added during form interaction
     * @returns {Array} Array of custom moods
     */
    getCustomMoods() {
        return [...this.customMoods];
    }

    /**
     * Destroy the form and clean up
     */
    destroy() {
        if (this.modalElement && this.modalElement.parentElement) {
            this.modalElement.remove();
        }

        this.audiobook = null;
        this.formElement = null;
        this.modalElement = null;
        this.validationErrors = {};
    }
}