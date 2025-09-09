import GistManager from '../services/GistManager.js';

/**
 * SetupWizard - Step-by-step setup wizard for first-time users
 * Guides users through connecting to or creating a GitHub Gist for data sync
 */
class SetupWizard {
    constructor(onComplete = null, onSkip = null) {
        this.gistManager = new GistManager();
        this.onComplete = onComplete;
        this.onSkip = onSkip;
        this.currentStep = 1;
        this.totalSteps = 3;
        this.element = null;
        this.gistId = null;
        this.validationTimeout = null;
    }

    /**
     * Create and show the setup wizard
     * @returns {HTMLElement} The wizard element
     */
    create() {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        overlay.id = 'setup-wizard-overlay';

        const container = document.createElement('div');
        container.className = 'bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto';

        container.innerHTML = `
            <div class="p-6">
                <!-- Header -->
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900">Welcome to Audiobook Library</h2>
                        <p class="text-gray-600 mt-1">Let's set up cross-device sync for your collection</p>
                    </div>
                    <button id="skip-setup" class="text-gray-400 hover:text-gray-600 text-sm">
                        Skip Setup
                    </button>
                </div>

                <!-- Progress Bar -->
                <div class="mb-8">
                    <div class="flex items-center justify-between text-sm text-gray-500 mb-2">
                        <span>Step <span id="current-step">1</span> of ${this.totalSteps}</span>
                        <span id="step-title">Getting Started</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div id="progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 33.33%"></div>
                    </div>
                </div>

                <!-- Step Content -->
                <div id="step-content">
                    ${this.renderStep1()}
                </div>

                <!-- Navigation -->
                <div class="flex justify-between mt-8 pt-6 border-t border-gray-200">
                    <button id="prev-btn" class="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                        Previous
                    </button>
                    <div class="flex gap-3">
                        <button id="skip-btn" class="px-4 py-2 text-gray-600 hover:text-gray-800">
                            Skip for Now
                        </button>
                        <button id="next-btn" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                            Next
                        </button>
                    </div>
                </div>
            </div>
        `;

        overlay.appendChild(container);
        this.element = overlay;
        this.attachEventListeners();

        return overlay;
    }

    /**
     * Render step 1: Introduction and options
     */
    renderStep1() {
        return `
            <div class="text-center">
                <div class="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                    <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-4">Sync Your Library Across Devices</h3>
                <p class="text-gray-600 mb-8 max-w-md mx-auto">
                    Keep your audiobook collection synchronized across all your devices using GitHub Gist as a simple cloud database.
                </p>
                
                <div class="grid md:grid-cols-2 gap-4 max-w-lg mx-auto">
                    <div class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors" data-option="existing">
                        <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                            </svg>
                        </div>
                        <h4 class="font-medium text-gray-900 mb-2">Connect Existing</h4>
                        <p class="text-sm text-gray-600">I have a gist ID from another device</p>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors" data-option="new">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                            </svg>
                        </div>
                        <h4 class="font-medium text-gray-900 mb-2">Create New</h4>
                        <p class="text-sm text-gray-600">Set up a new gist for syncing</p>
                    </div>
                </div>
                
                <input type="hidden" id="setup-option" value="">
            </div>
        `;
    }

    /**
     * Render step 2: Connect to existing gist or create new
     */
    renderStep2() {
        const option = document.getElementById('setup-option')?.value;

        if (option === 'existing') {
            return this.renderConnectExisting();
        } else if (option === 'new') {
            return this.renderCreateNew();
        }

        return '<p class="text-center text-gray-600">Please select an option to continue.</p>';
    }

    /**
     * Render connect to existing gist interface
     */
    renderConnectExisting() {
        return `
            <div>
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Connect to Existing Gist</h3>
                <p class="text-gray-600 mb-6">
                    Enter the gist ID you received from another device to sync your audiobook library.
                </p>
                
                <div class="mb-4">
                    <label for="gist-id-input" class="block text-sm font-medium text-gray-700 mb-2">
                        Gist ID
                    </label>
                    <input 
                        type="text" 
                        id="gist-id-input"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter gist ID (e.g., abc123def456...)"
                    />
                    <div id="validation-message" class="mt-2 text-sm hidden"></div>
                </div>
                
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 class="font-medium text-blue-900 mb-2">Where to find your Gist ID:</h4>
                    <ul class="text-sm text-blue-800 space-y-1">
                        <li>• Check the settings on your other device</li>
                        <li>• Look in your GitHub gists at gist.github.com</li>
                        <li>• The ID is the long string in the gist URL</li>
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Render create new gist interface
     */
    renderCreateNew() {
        return `
            <div>
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Create New Gist</h3>
                <p class="text-gray-600 mb-6">
                    Follow these steps to create a new GitHub Gist for syncing your audiobook library.
                </p>
                
                <div class="space-y-4">
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">1</div>
                        <div>
                            <p class="font-medium text-gray-900">Go to GitHub Gist</p>
                            <p class="text-sm text-gray-600 mt-1">
                                Visit <a href="https://gist.github.com" target="_blank" class="text-blue-600 hover:underline">gist.github.com</a> and sign in to your GitHub account
                            </p>
                        </div>
                    </div>
                    
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">2</div>
                        <div>
                            <p class="font-medium text-gray-900">Create a new gist</p>
                            <p class="text-sm text-gray-600 mt-1">Click "+" and select "New gist"</p>
                        </div>
                    </div>
                    
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">3</div>
                        <div>
                            <p class="font-medium text-gray-900">Set up the gist</p>
                            <div class="text-sm text-gray-600 mt-1 space-y-1">
                                <p>• Filename: <code class="bg-gray-100 px-1 rounded">audiobooks.json</code></p>
                                <p>• Make it <strong>Public</strong></p>
                                <p>• Add this content:</p>
                            </div>
                            <pre class="bg-gray-100 p-3 rounded text-xs mt-2 overflow-x-auto">{"audiobooks": [], "metadata": {"version": "1.0"}}</pre>
                        </div>
                    </div>
                    
                    <div class="flex items-start gap-3">
                        <div class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">4</div>
                        <div>
                            <p class="font-medium text-gray-900">Get the Gist ID</p>
                            <p class="text-sm text-gray-600 mt-1">
                                After creating, copy the gist ID from the URL (the long string after gist.github.com/)
                            </p>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6">
                    <label for="new-gist-id-input" class="block text-sm font-medium text-gray-700 mb-2">
                        Paste your new Gist ID here:
                    </label>
                    <input 
                        type="text" 
                        id="new-gist-id-input"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Paste gist ID here..."
                    />
                    <div id="new-validation-message" class="mt-2 text-sm hidden"></div>
                </div>
            </div>
        `;
    }

    /**
     * Render step 3: Success and sharing instructions
     */
    renderStep3() {
        return `
            <div class="text-center">
                <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-4">Setup Complete!</h3>
                <p class="text-gray-600 mb-8">
                    Your audiobook library is now set up for cross-device sync.
                </p>
                
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                    <h4 class="font-medium text-gray-900 mb-3">Your Gist ID:</h4>
                    <div class="flex items-center gap-2 bg-white border rounded-md p-3">
                        <code id="final-gist-id" class="flex-1 text-sm font-mono text-gray-800">${this.gistId || 'Loading...'}</code>
                        <button id="copy-gist-id" class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            Copy
                        </button>
                    </div>
                </div>
                
                <div class="text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 class="font-medium text-blue-900 mb-3">To sync on other devices:</h4>
                    <ol class="text-sm text-blue-800 space-y-2">
                        <li>1. Open this audiobook library on your other device</li>
                        <li>2. Go to Settings → Sync Settings</li>
                        <li>3. Enter this Gist ID to connect</li>
                        <li>4. Your libraries will automatically sync!</li>
                    </ol>
                </div>
                
                <div class="text-sm text-gray-600">
                    <p>You can always find this Gist ID in Settings → Sync Settings</p>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to wizard elements
     */
    attachEventListeners() {
        // Skip setup buttons
        const skipSetup = this.element.querySelector('#skip-setup');
        const skipBtn = this.element.querySelector('#skip-btn');

        skipSetup?.addEventListener('click', () => this.handleSkip());
        skipBtn?.addEventListener('click', () => this.handleSkip());

        // Navigation buttons
        const prevBtn = this.element.querySelector('#prev-btn');
        const nextBtn = this.element.querySelector('#next-btn');

        prevBtn?.addEventListener('click', () => this.previousStep());
        nextBtn?.addEventListener('click', () => this.nextStep());

        // Step 1 option selection
        this.attachStep1Listeners();
    }

    /**
     * Attach listeners for step 1 option selection
     */
    attachStep1Listeners() {
        const options = this.element.querySelectorAll('[data-option]');
        options.forEach(option => {
            option.addEventListener('click', () => {
                console.log('Option clicked:', option.dataset.option); // Debug log

                // Remove selection from all options
                options.forEach(opt => opt.classList.remove('border-blue-500', 'bg-blue-50'));

                // Add selection to clicked option
                option.classList.add('border-blue-500', 'bg-blue-50');

                // Store selection
                const setupOption = this.element.querySelector('#setup-option');
                if (setupOption) {
                    setupOption.value = option.dataset.option;
                    console.log('Setup option set to:', setupOption.value); // Debug log
                }

                // Enable next button
                const nextBtn = this.element.querySelector('#next-btn');
                if (nextBtn) {
                    nextBtn.disabled = false;
                    nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    console.log('Next button enabled'); // Debug log
                }
            });
        });
    }

    /**
     * Attach listeners for step 2 gist input
     */
    attachStep2Listeners() {
        const option = document.getElementById('setup-option')?.value;

        if (option === 'existing') {
            const input = this.element.querySelector('#gist-id-input');
            if (input) {
                input.addEventListener('input', (e) => {
                    clearTimeout(this.validationTimeout);
                    const gistId = e.target.value.trim();

                    if (gistId.length === 0) {
                        this.clearValidationMessage();
                        this.updateNextButton(false);
                        return;
                    }

                    // Debounce validation
                    this.validationTimeout = setTimeout(() => {
                        this.validateGistId(gistId, 'validation-message');
                    }, 500);
                });
            }
        } else if (option === 'new') {
            const input = this.element.querySelector('#new-gist-id-input');
            if (input) {
                input.addEventListener('input', (e) => {
                    clearTimeout(this.validationTimeout);
                    const gistId = e.target.value.trim();

                    if (gistId.length === 0) {
                        this.clearValidationMessage('new-validation-message');
                        this.updateNextButton(false);
                        return;
                    }

                    // Debounce validation
                    this.validationTimeout = setTimeout(() => {
                        this.validateGistId(gistId, 'new-validation-message');
                    }, 500);
                });
            }
        }
    }

    /**
     * Attach listeners for step 3 copy functionality
     */
    attachStep3Listeners() {
        const copyBtn = this.element.querySelector('#copy-gist-id');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const gistIdEl = this.element.querySelector('#final-gist-id');
                if (gistIdEl) {
                    navigator.clipboard.writeText(gistIdEl.textContent).then(() => {
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            copyBtn.textContent = 'Copy';
                        }, 2000);
                    });
                }
            });
        }

        // Change final button to "Complete Setup"
        const nextBtn = this.element.querySelector('#next-btn');
        if (nextBtn) {
            nextBtn.textContent = 'Complete Setup';
            nextBtn.onclick = () => this.handleComplete();
        }
    }

    /**
     * Validate gist ID and update UI
     */
    async validateGistId(gistId, messageElementId) {
        if (!gistId || gistId.length < 10) {
            this.showValidationMessage('Gist ID must be at least 10 characters', 'error', messageElementId);
            this.updateNextButton(false);
            return;
        }

        this.showValidationMessage('Validating gist...', 'info', messageElementId);
        this.updateNextButton(false);

        try {
            const exists = await this.gistManager.validateGistExists(gistId);

            if (exists) {
                this.showValidationMessage('Valid gist found!', 'success', messageElementId);
                this.gistId = gistId;
                this.updateNextButton(true);
            } else {
                this.showValidationMessage('Gist not found or not accessible. Please check the ID.', 'error', messageElementId);
                this.updateNextButton(false);
            }
        } catch (error) {
            this.showValidationMessage('Error validating gist. Please try again.', 'error', messageElementId);
            this.updateNextButton(false);
        }
    }

    /**
     * Show validation message
     */
    showValidationMessage(message, type, elementId) {
        const messageEl = this.element.querySelector(`#${elementId}`);
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `mt-2 text-sm ${this.getMessageClasses(type)}`;
            messageEl.classList.remove('hidden');
        }
    }

    /**
     * Clear validation message
     */
    clearValidationMessage(elementId = 'validation-message') {
        const messageEl = this.element.querySelector(`#${elementId}`);
        if (messageEl) {
            messageEl.classList.add('hidden');
        }
    }

    /**
     * Get CSS classes for message type
     */
    getMessageClasses(type) {
        switch (type) {
            case 'success': return 'text-green-600';
            case 'error': return 'text-red-600';
            case 'warning': return 'text-yellow-600';
            case 'info': return 'text-blue-600';
            default: return 'text-gray-600';
        }
    }

    /**
     * Update next button state
     */
    updateNextButton(enabled) {
        const nextBtn = this.element.querySelector('#next-btn');
        if (nextBtn) {
            nextBtn.disabled = !enabled;
        }
    }

    /**
     * Move to next step
     */
    async nextStep() {
        console.log('nextStep called, current step:', this.currentStep); // Debug log

        if (this.currentStep < this.totalSteps) {
            // Validate current step before proceeding
            if (this.currentStep === 1) {
                const option = this.element.querySelector('#setup-option')?.value;
                console.log('Step 1 option:', option); // Debug log
                if (!option) {
                    console.log('No option selected, not proceeding'); // Debug log
                    return; // Don't proceed without selection
                }
            } else if (this.currentStep === 2) {
                console.log('Step 2 gistId:', this.gistId); // Debug log
                if (!this.gistId) {
                    console.log('No gist ID, not proceeding'); // Debug log
                    return; // Don't proceed without valid gist ID
                }

                // Save the gist ID
                this.gistManager.saveGistId(this.gistId);
            }

            this.currentStep++;
            console.log('Moving to step:', this.currentStep); // Debug log
            this.updateStep();
        }
    }

    /**
     * Move to previous step
     */
    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStep();
        }
    }

    /**
     * Update the wizard UI for current step
     */
    updateStep() {
        // Update progress bar
        const progressBar = this.element.querySelector('#progress-bar');
        const currentStepEl = this.element.querySelector('#current-step');
        const stepTitleEl = this.element.querySelector('#step-title');

        if (progressBar) {
            const progress = (this.currentStep / this.totalSteps) * 100;
            progressBar.style.width = `${progress}%`;
        }

        if (currentStepEl) {
            currentStepEl.textContent = this.currentStep;
        }

        // Update step title
        const titles = ['Getting Started', 'Setup Sync', 'Complete'];
        if (stepTitleEl && titles[this.currentStep - 1]) {
            stepTitleEl.textContent = titles[this.currentStep - 1];
        }

        // Update step content
        const stepContent = this.element.querySelector('#step-content');
        if (stepContent) {
            switch (this.currentStep) {
                case 1:
                    stepContent.innerHTML = this.renderStep1();
                    this.attachStep1Listeners();
                    break;
                case 2:
                    stepContent.innerHTML = this.renderStep2();
                    this.attachStep2Listeners();
                    break;
                case 3:
                    stepContent.innerHTML = this.renderStep3();
                    this.attachStep3Listeners();
                    break;
            }
        }

        // Update navigation buttons
        const prevBtn = this.element.querySelector('#prev-btn');
        const nextBtn = this.element.querySelector('#next-btn');

        if (prevBtn) {
            prevBtn.disabled = this.currentStep === 1;
        }

        if (nextBtn) {
            if (this.currentStep === 1) {
                nextBtn.disabled = true; // Will be enabled when option is selected
            } else if (this.currentStep === 2) {
                nextBtn.disabled = !this.gistId; // Will be enabled when gist is validated
            }
        }
    }

    /**
     * Handle setup completion
     */
    handleComplete() {
        if (this.onComplete) {
            this.onComplete(this.gistId);
        }
        this.destroy();
    }

    /**
     * Handle setup skip
     */
    handleSkip() {
        if (this.onSkip) {
            this.onSkip();
        }
        this.destroy();
    }

    /**
     * Show the wizard
     */
    show() {
        if (!this.element) {
            this.create();
        }
        document.body.appendChild(this.element);

        // Focus the first interactive element
        setTimeout(() => {
            const firstOption = this.element.querySelector('[data-option]');
            if (firstOption) {
                firstOption.focus();
            }
        }, 100);
    }

    /**
     * Hide and destroy the wizard
     */
    destroy() {
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
        }

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this.element = null;
    }
}

export { SetupWizard };