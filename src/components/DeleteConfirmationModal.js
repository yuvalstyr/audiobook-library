/**
 * DeleteConfirmationModal component for confirming book deletion
 * Provides a modal dialog with proper UX for destructive actions
 */
export class DeleteConfirmationModal {
    constructor(onConfirm, onCancel) {
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        this.audiobook = null;
        this.isVisible = false;
        this.modalElement = null;
        this.isDeleting = false;

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
            <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" id="delete-modal-backdrop"></div>
            
            <!-- Modal content -->
            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full">
                        <!-- Modal header -->
                        <div class="flex items-center justify-between p-6 border-b border-gray-200">
                            <div class="flex items-center">
                                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                    <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                                    </svg>
                                </div>
                                <div class="ml-4">
                                    <h3 class="text-lg font-medium text-gray-900">
                                        Delete Audiobook
                                    </h3>
                                </div>
                            </div>
                            <button type="button" id="close-delete-modal-btn" class="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Modal body -->
                        <div class="p-6">
                            <div class="flex">
                                <!-- Book cover thumbnail -->
                                <div class="flex-shrink-0 mr-4">
                                    <img id="delete-book-cover" 
                                        class="w-16 h-20 object-cover rounded border"
                                        alt="Book cover"
                                        onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
                                </div>
                                
                                <!-- Confirmation text -->
                                <div class="flex-1">
                                    <p class="text-sm text-gray-500 mb-3">
                                        Are you sure you want to delete this audiobook from your library?
                                    </p>
                                    <div class="space-y-1">
                                        <p id="delete-book-title" class="font-medium text-gray-900"></p>
                                        <p id="delete-book-author" class="text-sm text-gray-600"></p>
                                    </div>
                                    <div class="mt-4 p-3 bg-red-50 rounded-md">
                                        <div class="flex">
                                            <div class="flex-shrink-0">
                                                <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                                                </svg>
                                            </div>
                                            <div class="ml-3">
                                                <p class="text-sm text-red-800">
                                                    This action cannot be undone. The audiobook will be permanently removed from your library.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Modal footer -->
                        <div class="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                            <button type="button" id="cancel-delete-btn" class="btn-secondary">
                                Cancel
                            </button>
                            <button type="button" id="confirm-delete-btn" class="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center">
                                <span id="delete-text">Delete Book</span>
                                <div id="delete-spinner" class="hidden ml-2">
                                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                </div>
                            </button>
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
        const closeBtn = this.modalElement.querySelector('#close-delete-modal-btn');
        const cancelBtn = this.modalElement.querySelector('#cancel-delete-btn');
        const backdrop = this.modalElement.querySelector('#delete-modal-backdrop');

        closeBtn.addEventListener('click', () => this.hide());
        cancelBtn.addEventListener('click', () => this.hide());
        backdrop.addEventListener('click', () => this.hide());

        // Confirm delete button
        const confirmBtn = this.modalElement.querySelector('#confirm-delete-btn');
        confirmBtn.addEventListener('click', () => this.handleConfirm());

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Show the confirmation modal
     * @param {Audiobook} audiobook - Audiobook to delete
     */
    show(audiobook) {
        this.audiobook = audiobook;
        this.populateBookInfo(audiobook);
        this.isVisible = true;
        this.modalElement.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Focus the cancel button by default (safer option)
        setTimeout(() => {
            const cancelBtn = this.modalElement.querySelector('#cancel-delete-btn');
            if (cancelBtn) {
                cancelBtn.focus();
            }
        }, 100);
    }

    /**
     * Hide the modal
     */
    hide() {
        // Reset all state
        this.isVisible = false;
        this.isDeleting = false;
        this.modalElement.classList.add('hidden');
        document.body.style.overflow = '';
        this.setDeleteLoading(false);

        // Clear any error messages
        const errorDiv = this.modalElement.querySelector('#delete-error');
        if (errorDiv && errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }

        if (this.onCancel) {
            this.onCancel();
        }
    }

    /**
     * Populate modal with book information
     * @param {Audiobook} audiobook - Audiobook data
     */
    populateBookInfo(audiobook) {
        // Book cover
        const coverImg = this.modalElement.querySelector('#delete-book-cover');
        coverImg.src = audiobook.image || '/images/placeholder.svg';
        coverImg.alt = `Cover of ${audiobook.title}`;

        // Book details
        this.modalElement.querySelector('#delete-book-title').textContent = audiobook.title;
        this.modalElement.querySelector('#delete-book-author').textContent = `by ${audiobook.author}`;
    }

    /**
     * Handle confirm delete button click
     */
    async handleConfirm() {
        if (this.isDeleting || !this.audiobook) {
            return;
        }

        this.isDeleting = true;
        this.setDeleteLoading(true);

        try {
            if (this.onConfirm) {
                await this.onConfirm(this.audiobook);
            }
            // Reset state before hiding
            this.isDeleting = false;
            this.setDeleteLoading(false);
            this.hide();
        } catch (error) {
            console.error('Delete confirmation error:', error);
            this.isDeleting = false;
            this.setDeleteLoading(false);
            this.showDeleteError(error.message);
        }
    }

    /**
     * Set loading state for delete button
     * @param {boolean} loading - Whether to show loading state
     */
    setDeleteLoading(loading) {
        const confirmBtn = this.modalElement.querySelector('#confirm-delete-btn');
        const deleteText = this.modalElement.querySelector('#delete-text');
        const deleteSpinner = this.modalElement.querySelector('#delete-spinner');

        if (loading) {
            confirmBtn.disabled = true;
            deleteText.textContent = 'Deleting...';
            deleteSpinner.classList.remove('hidden');
        } else {
            confirmBtn.disabled = false;
            deleteText.textContent = 'Delete Book';
            deleteSpinner.classList.add('hidden');
        }
    }

    /**
     * Show delete error message
     * @param {string} message - Error message
     */
    showDeleteError(message) {
        // Create or update error message
        let errorDiv = this.modalElement.querySelector('#delete-error');

        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'delete-error';
            errorDiv.className = 'mt-3 p-3 bg-red-50 border border-red-200 rounded-md';

            const modalBody = this.modalElement.querySelector('.p-6');
            modalBody.appendChild(errorDiv);
        }

        errorDiv.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-red-800">
                        Failed to delete audiobook: ${this.escapeHtml(message)}
                    </p>
                </div>
            </div>
        `;

        // Auto-hide error after 5 seconds
        setTimeout(() => {
            if (errorDiv && errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
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