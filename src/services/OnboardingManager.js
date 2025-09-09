import { SetupWizard } from '../components/SetupWizard.js';
import { SettingsPanel } from '../components/SettingsPanel.js';
import GistManager from './GistManager.js';

/**
 * OnboardingManager - Manages user onboarding and setup wizard flow
 * Determines when to show setup wizard and handles first-time user experience
 */
class OnboardingManager {
    constructor(dataService) {
        this.dataService = dataService;
        this.gistManager = new GistManager();
        this.setupWizard = null;
        this.settingsPanel = null;
        this.storageKey = 'audiobook-onboarding-completed';
    }

    /**
     * Check if user needs onboarding and show setup wizard if needed
     * @returns {Promise<boolean>} True if onboarding was shown
     */
    async checkAndShowOnboarding() {
        // Check if onboarding was already completed
        if (this.isOnboardingCompleted()) {
            return false;
        }

        // Check if user already has a valid gist connection
        const hasValidGist = await this.gistManager.hasValidStoredGist();
        if (hasValidGist) {
            // Mark onboarding as completed since they already have sync set up
            this.markOnboardingCompleted();
            return false;
        }

        // Show setup wizard for first-time users
        this.showSetupWizard();
        return true;
    }

    /**
     * Show the setup wizard
     */
    showSetupWizard() {
        if (this.setupWizard) {
            this.setupWizard.destroy();
        }

        this.setupWizard = new SetupWizard(
            (gistId) => this.handleSetupComplete(gistId),
            () => this.handleSetupSkipped()
        );

        this.setupWizard.show();
    }

    /**
     * Show the settings panel
     */
    showSettingsPanel() {
        if (this.settingsPanel) {
            this.settingsPanel.destroy();
        }

        this.settingsPanel = new SettingsPanel(
            this.dataService,
            (event, data) => this.handleSettingsChanged(event, data)
        );

        this.settingsPanel.show();
    }

    /**
     * Handle setup wizard completion
     * @param {string} gistId - The connected gist ID
     */
    async handleSetupComplete(gistId) {
        try {
            console.log('Setup completed with gist ID:', gistId);

            // Mark onboarding as completed
            this.markOnboardingCompleted();

            // Initialize sync with the new gist
            if (this.dataService) {
                await this.dataService.reinitializeSync();
            }

            // Show success notification
            this.showNotification('Sync setup completed successfully! Your library will now sync across devices.', 'success');

        } catch (error) {
            console.error('Failed to complete setup:', error);
            this.showNotification('Setup completed, but there was an error initializing sync. Please check your settings.', 'warning');
        }
    }

    /**
     * Handle setup wizard being skipped
     */
    handleSetupSkipped() {
        console.log('Setup wizard skipped');

        // Mark onboarding as completed even if skipped
        this.markOnboardingCompleted();

        // Show informational notification
        this.showNotification('You can set up sync later by clicking the settings icon.', 'info');
    }

    /**
     * Handle settings panel changes
     * @param {string} event - The type of change
     * @param {*} data - Additional data for the event
     */
    async handleSettingsChanged(event, data) {
        console.log('Settings changed:', event, data);

        switch (event) {
            case 'gist-updated':
                // Reinitialize sync with new gist
                try {
                    if (this.dataService) {
                        await this.dataService.reinitializeSync();
                    }
                    this.showNotification('Gist connection updated successfully!', 'success');
                } catch (error) {
                    console.error('Failed to reinitialize sync:', error);
                    this.showNotification('Failed to update sync connection.', 'error');
                }
                break;

            case 'gist-disconnected':
                this.showNotification('Disconnected from gist. Sync is now disabled.', 'info');
                break;

            case 'cache-cleared':
                this.showNotification('Local cache cleared and data re-synced.', 'success');
                break;

            case 'sync-reset':
                this.showNotification('Sync settings have been reset.', 'info');
                break;

            case 'settings-saved':
                this.showNotification('Sync settings saved successfully.', 'success');
                break;
        }
    }

    /**
     * Check if onboarding has been completed
     * @returns {boolean} True if onboarding was completed
     */
    isOnboardingCompleted() {
        return localStorage.getItem(this.storageKey) === 'true';
    }

    /**
     * Mark onboarding as completed
     */
    markOnboardingCompleted() {
        localStorage.setItem(this.storageKey, 'true');
    }

    /**
     * Reset onboarding status (for testing or re-onboarding)
     */
    resetOnboarding() {
        localStorage.removeItem(this.storageKey);
    }

    /**
     * Show a notification to the user
     * @param {string} message - The notification message
     * @param {string} type - The notification type (success, error, warning, info)
     */
    showNotification(message, type = 'info') {
        // Create a simple notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;

        // Set colors based on type
        let bgColor, textColor, iconPath;
        switch (type) {
            case 'success':
                bgColor = 'bg-green-500';
                textColor = 'text-white';
                iconPath = 'M5 13l4 4L19 7';
                break;
            case 'error':
                bgColor = 'bg-red-500';
                textColor = 'text-white';
                iconPath = 'M6 18L18 6M6 6l12 12';
                break;
            case 'warning':
                bgColor = 'bg-yellow-500';
                textColor = 'text-white';
                iconPath = 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z';
                break;
            default:
                bgColor = 'bg-blue-500';
                textColor = 'text-white';
                iconPath = 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
        }

        notification.className += ` ${bgColor} ${textColor}`;

        notification.innerHTML = `
            <div class="flex items-start gap-3">
                <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/>
                </svg>
                <div class="flex-1">
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <button class="flex-shrink-0 ml-2 text-white hover:text-gray-200">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Add close functionality
        const closeBtn = notification.querySelector('button');
        const closeNotification = () => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        };

        closeBtn.addEventListener('click', closeNotification);

        // Auto-close after 5 seconds
        setTimeout(closeNotification, 5000);
    }

    /**
     * Add settings button to the UI
     */
    addSettingsButton() {
        // Check if settings button already exists
        if (document.getElementById('sync-settings-btn')) {
            return;
        }

        // Find the header actions container (the div containing import/export and add book buttons)
        const headerActions = document.querySelector('#import-export-btn')?.parentElement;

        if (!headerActions) {
            console.warn('Could not find header actions container to add settings button');
            return;
        }

        // Create settings button
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'sync-settings-btn';
        settingsBtn.className = 'btn-secondary flex items-center gap-2';
        settingsBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span class="hidden sm:inline">Settings</span>
        `;

        settingsBtn.addEventListener('click', () => {
            this.showSettingsPanel();
        });

        // Add to header actions
        headerActions.appendChild(settingsBtn);
    }

    /**
     * Initialize onboarding manager
     */
    async initialize() {
        // Add settings button to UI
        this.addSettingsButton();

        // Check if onboarding is needed
        const onboardingShown = await this.checkAndShowOnboarding();

        return onboardingShown;
    }

    /**
     * Destroy onboarding manager and clean up
     */
    destroy() {
        if (this.setupWizard) {
            this.setupWizard.destroy();
            this.setupWizard = null;
        }

        if (this.settingsPanel) {
            this.settingsPanel.destroy();
            this.settingsPanel = null;
        }

        // Remove settings button
        const settingsBtn = document.getElementById('sync-settings-btn');
        if (settingsBtn && settingsBtn.parentNode) {
            settingsBtn.parentNode.removeChild(settingsBtn);
        }
    }
}

export { OnboardingManager };