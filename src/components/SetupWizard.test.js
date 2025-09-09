import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SetupWizard } from './SetupWizard.js';

// Mock GistManager
vi.mock('../services/GistManager.js', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            validateGistExists: vi.fn().mockResolvedValue(true),
            saveGistId: vi.fn(),
            getGistId: vi.fn().mockReturnValue(null)
        }))
    };
});

describe('SetupWizard', () => {
    let setupWizard;
    let mockOnComplete;
    let mockOnSkip;

    beforeEach(() => {
        // Clear DOM
        document.body.innerHTML = '';

        // Create mock callbacks
        mockOnComplete = vi.fn();
        mockOnSkip = vi.fn();

        // Create setup wizard instance
        setupWizard = new SetupWizard(mockOnComplete, mockOnSkip);
    });

    afterEach(() => {
        if (setupWizard) {
            setupWizard.destroy();
        }
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        it('should create wizard element with correct structure', () => {
            const element = setupWizard.create();

            expect(element).toBeDefined();
            expect(element.id).toBe('setup-wizard-overlay');
            expect(element.querySelector('h2').textContent).toBe('Welcome to Audiobook Library');
            expect(element.querySelector('#current-step').textContent).toBe('1');
        });

        it('should show step 1 content by default', () => {
            const element = setupWizard.create();

            const stepContent = element.querySelector('#step-content');
            expect(stepContent.innerHTML).toContain('Sync Your Library Across Devices');
            expect(stepContent.querySelector('[data-option="existing"]')).toBeDefined();
            expect(stepContent.querySelector('[data-option="new"]')).toBeDefined();
        });

        it('should have correct initial button states', () => {
            const element = setupWizard.create();

            const prevBtn = element.querySelector('#prev-btn');
            const nextBtn = element.querySelector('#next-btn');

            expect(prevBtn.disabled).toBe(true);
            expect(nextBtn.disabled).toBe(true);
        });
    });

    describe('Navigation', () => {
        it('should enable next button when option is selected', () => {
            const element = setupWizard.create();

            const existingOption = element.querySelector('[data-option="existing"]');
            const nextBtn = element.querySelector('#next-btn');

            // Initially disabled
            expect(nextBtn.disabled).toBe(true);

            // Click option
            existingOption.click();

            // Should be enabled
            expect(nextBtn.disabled).toBe(false);
            expect(element.querySelector('#setup-option').value).toBe('existing');
        });

        it('should update progress bar when moving to next step', () => {
            const element = setupWizard.create();

            // Select option and move to next step
            element.querySelector('[data-option="existing"]').click();
            setupWizard.nextStep();

            const progressBar = element.querySelector('#progress-bar');
            const currentStep = element.querySelector('#current-step');

            expect(currentStep.textContent).toBe('2');
            expect(progressBar.style.width).toBe('66.67%');
        });

        it('should show different content for step 2 based on selection', () => {
            const element = setupWizard.create();

            // Test existing option
            element.querySelector('[data-option="existing"]').click();
            setupWizard.nextStep();

            let stepContent = element.querySelector('#step-content');
            expect(stepContent.innerHTML).toContain('Connect to Existing Gist');
            expect(stepContent.querySelector('#gist-id-input')).toBeDefined();

            // Go back and test new option
            setupWizard.previousStep();
            element.querySelector('[data-option="new"]').click();
            setupWizard.nextStep();

            stepContent = element.querySelector('#step-content');
            expect(stepContent.innerHTML).toContain('Create New Gist');
            expect(stepContent.querySelector('#new-gist-id-input')).toBeDefined();
        });
    });

    describe('Skip functionality', () => {
        it('should call onSkip callback when skip is clicked', () => {
            const element = setupWizard.create();

            const skipBtn = element.querySelector('#skip-btn');
            skipBtn.click();

            expect(mockOnSkip).toHaveBeenCalled();
        });

        it('should call onSkip callback when skip setup is clicked', () => {
            const element = setupWizard.create();

            const skipSetupBtn = element.querySelector('#skip-setup');
            skipSetupBtn.click();

            expect(mockOnSkip).toHaveBeenCalled();
        });
    });

    describe('Show and destroy', () => {
        it('should add element to document body when shown', () => {
            setupWizard.show();

            const wizardElement = document.getElementById('setup-wizard-overlay');
            expect(wizardElement).toBeDefined();
            expect(document.body.contains(wizardElement)).toBe(true);
        });

        it('should remove element from document when destroyed', () => {
            setupWizard.show();

            let wizardElement = document.getElementById('setup-wizard-overlay');
            expect(wizardElement).toBeDefined();

            setupWizard.destroy();

            wizardElement = document.getElementById('setup-wizard-overlay');
            expect(wizardElement).toBeNull();
        });
    });

    describe('Validation messages', () => {
        it('should show validation messages with correct styling', () => {
            setupWizard.showValidationMessage('Test message', 'success', 'test-element');

            // Since we're testing the method directly, we need to create the element first
            const element = setupWizard.create();
            element.innerHTML += '<div id="test-element" class="hidden"></div>';

            setupWizard.showValidationMessage('Test message', 'success', 'test-element');

            const messageEl = element.querySelector('#test-element');
            expect(messageEl.textContent).toBe('Test message');
            expect(messageEl.classList.contains('text-green-600')).toBe(true);
            expect(messageEl.classList.contains('hidden')).toBe(false);
        });

        it('should get correct CSS classes for different message types', () => {
            expect(setupWizard.getMessageClasses('success')).toBe('text-green-600');
            expect(setupWizard.getMessageClasses('error')).toBe('text-red-600');
            expect(setupWizard.getMessageClasses('warning')).toBe('text-yellow-600');
            expect(setupWizard.getMessageClasses('info')).toBe('text-blue-600');
            expect(setupWizard.getMessageClasses('unknown')).toBe('text-gray-600');
        });
    });
});