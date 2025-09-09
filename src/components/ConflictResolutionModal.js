/**
 * ConflictResolutionModal - UI component for handling sync conflicts
 * Provides options for manual conflict resolution when automatic resolution fails
 */
export class ConflictResolutionModal {
    constructor() {
        this.modal = null;
        this.isVisible = false;
        this.onResolve = null;
        this.onCancel = null;
        this.conflictData = null;
    }

    /**
     * Show the conflict resolution modal
     * @param {Object} conflictInfo - Conflict information
     * @param {Object} localData - Local data
     * @param {Object} remoteData - Remote data
     * @param {Function} onResolve - Callback for resolution choice
     * @param {Function} onCancel - Callback for cancellation
     */
    show(conflictInfo, localData, remoteData, onResolve, onCancel) {
        this.conflictData = { conflictInfo, localData, remoteData };
        this.onResolve = onResolve;
        this.onCancel = onCancel;

        this.createModal();
        this.isVisible = true;

        // Focus the modal for accessibility
        setTimeout(() => {
            const firstButton = this.modal.querySelector('button');
            if (firstButton) {
                firstButton.focus();
            }
        }, 100);
    }

    /**
     * Hide the conflict resolution modal
     */
    hide() {
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
        this.modal = null;
        this.isVisible = false;
        this.conflictData = null;
        this.onResolve = null;
        this.onCancel = null;
    }

    /**
     * Create the modal DOM structure
     * @private
     */
    createModal() {
        // Remove existing modal if present
        this.hide();

        const { conflictInfo, localData, remoteData } = this.conflictData;

        // Create modal overlay
        this.modal = document.createElement('div');
        this.modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-modal', 'true');
        this.modal.setAttribute('aria-labelledby', 'conflict-modal-title');

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto';

        modalContent.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 id="conflict-modal-title" class="text-xl font-bold text-gray-900">
                        Sync Conflict Detected
                    </h2>
                    <button type="button" class="text-gray-400 hover:text-gray-600 cancel-btn" aria-label="Close">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="mb-6">
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div class="flex items-start">
                            <svg class="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                            </svg>
                            <div>
                                <h3 class="text-sm font-medium text-yellow-800">Concurrent Modifications Detected</h3>
                                <p class="text-sm text-yellow-700 mt-1">
                                    Your audiobook library was modified on multiple devices at the same time. 
                                    Please choose how to resolve this conflict.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    ${this.renderConflictDetails(conflictInfo, localData, remoteData)}
                </div>
                
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-gray-900">Resolution Options</h3>
                    
                    <div class="space-y-3">
                        <button type="button" class="resolution-btn w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" data-resolution="keep-local">
                            <div class="flex items-start">
                                <div class="flex-shrink-0 mt-1">
                                    <div class="w-4 h-4 border-2 border-blue-500 rounded-full flex items-center justify-center">
                                        <div class="w-2 h-2 bg-blue-500 rounded-full opacity-0 resolution-radio"></div>
                                    </div>
                                </div>
                                <div class="ml-3">
                                    <h4 class="font-medium text-gray-900">Keep This Device's Changes</h4>
                                    <p class="text-sm text-gray-600">Use the data from this device (${localData.audiobooks.length} books)</p>
                                    <p class="text-xs text-gray-500 mt-1">Last modified: ${this.formatTimestamp(localData.metadata.lastModified)}</p>
                                </div>
                            </div>
                        </button>
                        
                        <button type="button" class="resolution-btn w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" data-resolution="keep-remote">
                            <div class="flex items-start">
                                <div class="flex-shrink-0 mt-1">
                                    <div class="w-4 h-4 border-2 border-blue-500 rounded-full flex items-center justify-center">
                                        <div class="w-2 h-2 bg-blue-500 rounded-full opacity-0 resolution-radio"></div>
                                    </div>
                                </div>
                                <div class="ml-3">
                                    <h4 class="font-medium text-gray-900">Keep Other Device's Changes</h4>
                                    <p class="text-sm text-gray-600">Use the data from the other device (${remoteData.audiobooks.length} books)</p>
                                    <p class="text-xs text-gray-500 mt-1">Last modified: ${this.formatTimestamp(remoteData.metadata.lastModified)}</p>
                                </div>
                            </div>
                        </button>
                        
                        <button type="button" class="resolution-btn w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" data-resolution="merge">
                            <div class="flex items-start">
                                <div class="flex-shrink-0 mt-1">
                                    <div class="w-4 h-4 border-2 border-blue-500 rounded-full flex items-center justify-center">
                                        <div class="w-2 h-2 bg-blue-500 rounded-full opacity-0 resolution-radio"></div>
                                    </div>
                                </div>
                                <div class="ml-3">
                                    <h4 class="font-medium text-gray-900">Merge Both Changes</h4>
                                    <p class="text-sm text-gray-600">Automatically combine books from both devices</p>
                                    <p class="text-xs text-gray-500 mt-1">Recommended for most situations</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                    <button type="button" class="cancel-btn px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        Cancel
                    </button>
                    <button type="button" class="resolve-btn px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                        Resolve Conflict
                    </button>
                </div>
            </div>
        `;

        this.modal.appendChild(modalContent);
        document.body.appendChild(this.modal);

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Render conflict details section
     * @private
     * @param {Object} conflictInfo - Conflict information
     * @param {Object} localData - Local data
     * @param {Object} remoteData - Remote data
     * @returns {string} HTML string
     */
    renderConflictDetails(conflictInfo, localData, remoteData) {
        const timeDiff = Math.abs(
            new Date(conflictInfo.localTimestamp).getTime() -
            new Date(conflictInfo.remoteTimestamp).getTime()
        );
        const timeDiffMinutes = Math.round(timeDiff / 60000);

        return `
            <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="font-medium text-gray-900 mb-3">Conflict Details</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <h5 class="font-medium text-gray-700">This Device</h5>
                        <ul class="text-gray-600 mt-1 space-y-1">
                            <li>Books: ${localData.audiobooks.length}</li>
                            <li>Device: ${conflictInfo.localDeviceId.substring(0, 12)}...</li>
                            <li>Modified: ${this.formatTimestamp(conflictInfo.localTimestamp)}</li>
                        </ul>
                    </div>
                    <div>
                        <h5 class="font-medium text-gray-700">Other Device</h5>
                        <ul class="text-gray-600 mt-1 space-y-1">
                            <li>Books: ${remoteData.audiobooks.length}</li>
                            <li>Device: ${conflictInfo.remoteDeviceId.substring(0, 12)}...</li>
                            <li>Modified: ${this.formatTimestamp(conflictInfo.remoteTimestamp)}</li>
                        </ul>
                    </div>
                </div>
                <p class="text-xs text-gray-500 mt-3">
                    Changes were made within ${timeDiffMinutes} minute${timeDiffMinutes !== 1 ? 's' : ''} of each other.
                </p>
            </div>
        `;
    }

    /**
     * Set up event listeners for the modal
     * @private
     */
    setupEventListeners() {
        let selectedResolution = null;

        // Resolution button selection
        const resolutionButtons = this.modal.querySelectorAll('.resolution-btn');
        const resolveButton = this.modal.querySelector('.resolve-btn');

        resolutionButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Clear previous selection
                resolutionButtons.forEach(btn => {
                    btn.classList.remove('border-blue-500', 'bg-blue-50');
                    btn.classList.add('border-gray-200');
                    const radio = btn.querySelector('.resolution-radio');
                    if (radio) radio.style.opacity = '0';
                });

                // Select current button
                button.classList.remove('border-gray-200');
                button.classList.add('border-blue-500', 'bg-blue-50');
                const radio = button.querySelector('.resolution-radio');
                if (radio) radio.style.opacity = '1';

                selectedResolution = button.dataset.resolution;
                resolveButton.disabled = false;
            });
        });

        // Resolve button
        resolveButton.addEventListener('click', () => {
            if (selectedResolution && this.onResolve) {
                this.onResolve(selectedResolution);
                this.hide();
            }
        });

        // Cancel buttons
        const cancelButtons = this.modal.querySelectorAll('.cancel-btn');
        cancelButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (this.onCancel) {
                    this.onCancel();
                }
                this.hide();
            });
        });

        // Escape key handling
        const handleEscape = (event) => {
            if (event.key === 'Escape' && this.isVisible) {
                if (this.onCancel) {
                    this.onCancel();
                }
                this.hide();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Click outside to close
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                if (this.onCancel) {
                    this.onCancel();
                }
                this.hide();
            }
        });
    }

    /**
     * Format timestamp for display
     * @private
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMinutes = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMinutes / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMinutes < 1) {
                return 'Just now';
            } else if (diffMinutes < 60) {
                return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
            } else if (diffHours < 24) {
                return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            } else if (diffDays < 7) {
                return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
            } else {
                return date.toLocaleDateString();
            }
        } catch (error) {
            return timestamp;
        }
    }

    /**
     * Check if modal is currently visible
     * @returns {boolean} True if modal is visible
     */
    get visible() {
        return this.isVisible;
    }
}

export default ConflictResolutionModal;