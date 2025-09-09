import { ImportExportService } from '../services/ImportExportService.js';

export class ImportExportModal {
    constructor(onImportComplete, onExportComplete) {
        this.importExportService = new ImportExportService();
        this.onImportComplete = onImportComplete;
        this.onExportComplete = onExportComplete;
        this.modal = null;
        this.currentTab = 'export';
        this.isProcessing = false;

        this.createModal();
        this.setupEventListeners();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
        this.modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div class="flex items-center justify-between p-6 border-b">
                    <h2 class="text-xl font-semibold text-gray-900">Import & Export</h2>
                    <button type="button" class="close-btn text-gray-400 hover:text-gray-600 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <!-- Tab Navigation -->
                <div class="border-b">
                    <nav class="flex">
                        <button type="button" class="tab-btn px-6 py-3 text-sm font-medium border-b-2 transition-colors" data-tab="export">
                            Export Data
                        </button>
                        <button type="button" class="tab-btn px-6 py-3 text-sm font-medium border-b-2 transition-colors" data-tab="import">
                            Import Data
                        </button>
                    </nav>
                </div>

                <div class="p-6 overflow-y-auto max-h-[60vh]">
                    <!-- Export Tab -->
                    <div id="export-tab" class="tab-content">
                        <div class="space-y-6">
                            <div>
                                <h3 class="text-lg font-medium text-gray-900 mb-3">Export Your Library</h3>
                                <p class="text-gray-600 mb-4">Download your audiobook collection for backup or sharing.</p>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <!-- JSON Export -->
                                <div class="border rounded-lg p-4">
                                    <div class="flex items-center mb-3">
                                        <svg class="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        <h4 class="font-medium text-gray-900">JSON Format</h4>
                                    </div>
                                    <p class="text-sm text-gray-600 mb-4">Complete backup with all metadata. Best for restoring your library.</p>
                                    <button type="button" class="export-json-btn btn-primary w-full">
                                        Export as JSON
                                    </button>
                                </div>

                                <!-- CSV Export -->
                                <div class="border rounded-lg p-4">
                                    <div class="flex items-center mb-3">
                                        <svg class="w-8 h-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002 2m0 0V5a2 2 0 012-2h2a2 2 0 002 2v2M7 7h10"/>
                                        </svg>
                                        <h4 class="font-medium text-gray-900">CSV Format</h4>
                                    </div>
                                    <p class="text-sm text-gray-600 mb-4">Spreadsheet format. Great for editing in Excel or Google Sheets.</p>
                                    <button type="button" class="export-csv-btn btn-primary w-full">
                                        Export as CSV
                                    </button>
                                </div>
                            </div>

                            <!-- Export Status -->
                            <div id="export-status" class="hidden">
                                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div class="flex items-center">
                                        <svg class="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                        </svg>
                                        <span class="text-green-800 font-medium">Export completed successfully!</span>
                                    </div>
                                    <div id="export-details" class="mt-2 text-sm text-green-700"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Import Tab -->
                    <div id="import-tab" class="tab-content hidden">
                        <div class="space-y-6">
                            <div>
                                <h3 class="text-lg font-medium text-gray-900 mb-3">Import Audiobooks</h3>
                                <p class="text-gray-600 mb-4">Add books to your library from JSON or CSV files.</p>
                            </div>

                            <!-- File Upload Area -->
                            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                                <input type="file" id="import-file-input" class="hidden" accept=".json,.csv">
                                <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                </svg>
                                <p class="text-lg font-medium text-gray-900 mb-2">Choose a file to import</p>
                                <p class="text-gray-600 mb-4">Supports JSON and CSV formats</p>
                                <button type="button" class="select-file-btn btn-primary">
                                    Select File
                                </button>
                            </div>

                            <!-- Import Options -->
                            <div id="import-options" class="hidden">
                                <h4 class="font-medium text-gray-900 mb-3">Import Options</h4>
                                <div class="space-y-3">
                                    <label class="flex items-center">
                                        <input type="radio" name="merge-strategy" value="merge" class="mr-2" checked>
                                        <span class="text-sm">
                                            <strong>Merge:</strong> Update existing books and add new ones
                                        </span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="radio" name="merge-strategy" value="append" class="mr-2">
                                        <span class="text-sm">
                                            <strong>Append:</strong> Add new books only, skip duplicates
                                        </span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="radio" name="merge-strategy" value="replace" class="mr-2">
                                        <span class="text-sm text-red-600">
                                            <strong>Replace:</strong> Replace entire library (careful!)
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <!-- File Preview -->
                            <div id="file-preview" class="hidden">
                                <h4 class="font-medium text-gray-900 mb-3">File Preview</h4>
                                <div class="bg-gray-50 rounded-lg p-4">
                                    <div id="preview-content" class="text-sm text-gray-700"></div>
                                </div>
                            </div>

                            <!-- Import Actions -->
                            <div id="import-actions" class="hidden flex space-x-3">
                                <button type="button" class="import-btn btn-primary flex-1">
                                    Import Books
                                </button>
                                <button type="button" class="cancel-import-btn btn-secondary">
                                    Cancel
                                </button>
                            </div>

                            <!-- Sync Conflict Warning -->
                            <div id="sync-conflict-warning" class="hidden">
                                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                    <div class="flex items-start">
                                        <svg class="w-5 h-5 text-yellow-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"/>
                                        </svg>
                                        <div class="flex-1">
                                            <h4 class="font-medium text-yellow-800 mb-2">Sync Conflict Detected</h4>
                                            <div id="conflict-details" class="text-sm text-yellow-700 mb-3"></div>
                                            <div class="space-y-2">
                                                <label class="flex items-center">
                                                    <input type="radio" name="conflict-resolution" value="use-import" class="mr-2">
                                                    <span class="text-sm">Use imported data (recommended if import is newer)</span>
                                                </label>
                                                <label class="flex items-center">
                                                    <input type="radio" name="conflict-resolution" value="use-current" class="mr-2">
                                                    <span class="text-sm">Keep current data (recommended if current is newer)</span>
                                                </label>
                                                <label class="flex items-center">
                                                    <input type="radio" name="conflict-resolution" value="sync-aware-merge" class="mr-2" checked>
                                                    <span class="text-sm">Smart merge (recommended - uses newest data for each book)</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Import Status -->
                            <div id="import-status" class="hidden"></div>

                            <!-- Backup & Restore Section -->
                            <div class="border-t pt-6">
                                <h4 class="font-medium text-gray-900 mb-3">Backup & Restore</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <button type="button" class="create-backup-btn btn-secondary">
                                        Create Backup Before Import
                                    </button>
                                    <button type="button" class="show-backups-btn btn-secondary">
                                        View Available Backups
                                    </button>
                                </div>
                                
                                <!-- Backup List -->
                                <div id="backup-list" class="hidden">
                                    <h5 class="font-medium text-gray-800 mb-2">Available Backups</h5>
                                    <div id="backup-items" class="space-y-2 max-h-32 overflow-y-auto"></div>
                                </div>
                            </div>

                            <!-- CSV Template -->
                            <div class="border-t pt-6">
                                <h4 class="font-medium text-gray-900 mb-3">Need a CSV Template?</h4>
                                <p class="text-gray-600 mb-3">Download a template file to see the expected format for CSV imports.</p>
                                <button type="button" class="download-template-btn btn-secondary">
                                    Download CSV Template
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Processing Overlay -->
                <div id="processing-overlay" class="hidden absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p class="text-gray-600">Processing...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
    }

    setupEventListeners() {
        // Close modal
        this.modal.querySelector('.close-btn').addEventListener('click', () => {
            this.hide();
        });

        // Close on backdrop click
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        });

        // Tab switching
        this.modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // Export buttons
        this.modal.querySelector('.export-json-btn').addEventListener('click', () => {
            this.handleExport('json');
        });

        this.modal.querySelector('.export-csv-btn').addEventListener('click', () => {
            this.handleExport('csv');
        });

        // Import file selection
        this.modal.querySelector('.select-file-btn').addEventListener('click', () => {
            this.modal.querySelector('#import-file-input').click();
        });

        this.modal.querySelector('#import-file-input').addEventListener('change', (event) => {
            this.handleFileSelection(event.target.files[0]);
        });

        // Import actions
        this.modal.querySelector('.import-btn').addEventListener('click', () => {
            this.handleImport();
        });

        this.modal.querySelector('.cancel-import-btn').addEventListener('click', () => {
            this.cancelImport();
        });

        // Download template
        this.modal.querySelector('.download-template-btn').addEventListener('click', () => {
            this.downloadTemplate();
        });

        // Backup and restore
        this.modal.querySelector('.create-backup-btn').addEventListener('click', () => {
            this.createBackup();
        });

        this.modal.querySelector('.show-backups-btn').addEventListener('click', () => {
            this.toggleBackupList();
        });
    }

    show(collection, tab = 'export') {
        this.collection = collection;
        this.switchTab(tab);
        this.modal.classList.remove('hidden');

        // Reset state
        this.resetImportState();
        this.hideExportStatus();
        this.loadBackupList();
    }

    hide() {
        if (!this.isProcessing) {
            this.modal.classList.add('hidden');
            this.resetImportState();
        }
    }

    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        this.modal.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.classList.add('border-blue-500', 'text-blue-600');
                btn.classList.remove('border-transparent', 'text-gray-500');
            } else {
                btn.classList.remove('border-blue-500', 'text-blue-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            }
        });

        // Show/hide tab content
        this.modal.querySelectorAll('.tab-content').forEach(content => {
            if (content.id === `${tab}-tab`) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    }

    async handleExport(format) {
        try {
            this.setProcessing(true);

            let result;
            if (format === 'json') {
                result = this.importExportService.exportJSON(this.collection);
            } else if (format === 'csv') {
                result = this.importExportService.exportCSV(this.collection);
            }

            this.showExportStatus(result, format);

            if (this.onExportComplete) {
                this.onExportComplete(result, format);
            }

        } catch (error) {
            console.error('Export failed:', error);
            this.showExportError(error.message);
        } finally {
            this.setProcessing(false);
        }
    }

    async handleFileSelection(file) {
        if (!file) return;

        try {
            this.selectedFile = file;
            const fileType = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';

            // Show import options
            this.modal.querySelector('#import-options').classList.remove('hidden');

            // Show file preview
            await this.showFilePreview(file, fileType);

            // Show import actions
            this.modal.querySelector('#import-actions').classList.remove('hidden');

        } catch (error) {
            console.error('File selection failed:', error);
            this.showImportError(`Failed to read file: ${error.message}`);
        }
    }

    async showFilePreview(file, fileType) {
        try {
            const previewDiv = this.modal.querySelector('#file-preview');
            const contentDiv = this.modal.querySelector('#preview-content');

            if (fileType === 'json') {
                const text = await this.importExportService.readFileAsText(file);
                const data = JSON.parse(text);

                // Check for sync conflicts
                const syncConflict = await this.importExportService.detectImportSyncConflict(data);
                if (syncConflict) {
                    this.showSyncConflictWarning(syncConflict);
                } else {
                    this.hideSyncConflictWarning();
                }

                const hasSyncMetadata = !!(data.exportMetadata?.syncMetadata);
                const exportVersion = data.exportMetadata?.exportVersion || 'Unknown';

                contentDiv.innerHTML = `
                    <div class="space-y-2">
                        <p><strong>File:</strong> ${file.name}</p>
                        <p><strong>Format:</strong> JSON</p>
                        <p><strong>Books:</strong> ${data.audiobooks ? data.audiobooks.length : 0}</p>
                        <p><strong>Version:</strong> ${data.version || exportVersion}</p>
                        <p><strong>Last Updated:</strong> ${data.lastUpdated || 'Unknown'}</p>
                        ${hasSyncMetadata ? '<p><strong>Sync Data:</strong> ✓ Contains sync metadata</p>' : ''}
                        ${syncConflict ? '<p class="text-yellow-600"><strong>⚠️ Sync conflict detected</strong></p>' : ''}
                    </div>
                `;
            } else {
                const text = await this.importExportService.readFileAsText(file);
                const rows = this.importExportService.parseCSV(text);

                this.hideSyncConflictWarning(); // CSV files don't have sync metadata

                contentDiv.innerHTML = `
                    <div class="space-y-2">
                        <p><strong>File:</strong> ${file.name}</p>
                        <p><strong>Format:</strong> CSV</p>
                        <p><strong>Rows:</strong> ${rows.length - 1} (excluding header)</p>
                        <p><strong>Columns:</strong> ${rows[0] ? rows[0].join(', ') : 'None'}</p>
                    </div>
                `;
            }

            previewDiv.classList.remove('hidden');

        } catch (error) {
            console.error('Preview failed:', error);
            this.showImportError(`Failed to preview file: ${error.message}`);
        }
    }

    async handleImport() {
        if (!this.selectedFile) return;

        try {
            this.setProcessing(true);

            const fileType = this.selectedFile.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
            let mergeStrategy = this.modal.querySelector('input[name="merge-strategy"]:checked').value;

            // Check for sync conflicts and adjust merge strategy
            const conflictWarning = this.modal.querySelector('#sync-conflict-warning');
            if (!conflictWarning.classList.contains('hidden')) {
                const conflictResolution = this.modal.querySelector('input[name="conflict-resolution"]:checked').value;

                switch (conflictResolution) {
                    case 'use-import':
                        mergeStrategy = 'replace';
                        break;
                    case 'use-current':
                        mergeStrategy = 'append'; // Only add new books
                        break;
                    case 'sync-aware-merge':
                        mergeStrategy = 'sync-aware';
                        break;
                }
            }

            let importResult;
            if (fileType === 'json') {
                importResult = await this.importExportService.importJSON(this.selectedFile, {
                    checkSyncConflicts: true
                });
            } else {
                importResult = await this.importExportService.importCSV(this.selectedFile);
            }

            // Create backup before merging if requested
            let backupInfo = null;
            if (this.shouldCreateBackup) {
                try {
                    backupInfo = await this.importExportService.createImportBackup(this.collection);
                } catch (error) {
                    console.warn('Failed to create backup:', error.message);
                }
            }

            // Merge with existing collection
            const mergedCollection = await this.importExportService.mergeCollections(
                this.collection,
                importResult,
                mergeStrategy,
                { triggerSync: true }
            );

            this.showImportSuccess(importResult.importStats, mergeStrategy, backupInfo);

            if (this.onImportComplete) {
                this.onImportComplete(mergedCollection, importResult.importStats);
            }

        } catch (error) {
            console.error('Import failed:', error);
            this.showImportError(error.message);
        } finally {
            this.setProcessing(false);
        }
    }

    cancelImport() {
        this.resetImportState();
    }

    downloadTemplate() {
        try {
            this.importExportService.downloadCSVTemplate();
        } catch (error) {
            console.error('Template download failed:', error);
        }
    }

    showExportStatus(result, format) {
        const statusDiv = this.modal.querySelector('#export-status');
        const detailsDiv = this.modal.querySelector('#export-details');

        detailsDiv.innerHTML = `
            <p>File: ${result.filename}</p>
            <p>Books exported: ${result.bookCount}</p>
            <p>File size: ${(result.fileSize / 1024).toFixed(1)} KB</p>
        `;

        statusDiv.classList.remove('hidden');

        // Hide after 5 seconds
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 5000);
    }

    showExportError(message) {
        const statusDiv = this.modal.querySelector('#export-status');
        statusDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex items-center">
                    <svg class="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    <span class="text-red-800 font-medium">Export failed</span>
                </div>
                <p class="mt-2 text-sm text-red-700">${message}</p>
            </div>
        `;
        statusDiv.classList.remove('hidden');
    }

    showImportSuccess(stats, mergeStrategy, backupInfo = null) {
        const statusDiv = this.modal.querySelector('#import-status');
        statusDiv.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <div class="flex items-center mb-2">
                    <svg class="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span class="text-green-800 font-medium">Import completed successfully!</span>
                </div>
                <div class="text-sm text-green-700 space-y-1">
                    <p>Strategy: ${mergeStrategy}</p>
                    <p>Books processed: ${stats.totalAttempted}</p>
                    <p>Successfully imported: ${stats.successful}</p>
                    ${stats.failed > 0 ? `<p>Failed: ${stats.failed}</p>` : ''}
                    ${stats.hasSyncMetadata ? '<p>✓ Sync metadata processed</p>' : ''}
                    ${backupInfo ? `<p>✓ Backup created: ${backupInfo.filename}</p>` : ''}
                    ${stats.errors && stats.errors.length > 0 ? `
                        <details class="mt-2">
                            <summary class="cursor-pointer">View errors (${stats.errors.length})</summary>
                            <ul class="mt-1 ml-4 list-disc">
                                ${stats.errors.map(error => `<li>${error}</li>`).join('')}
                            </ul>
                        </details>
                    ` : ''}
                </div>
            </div>
        `;
        statusDiv.classList.remove('hidden');
    }

    showImportError(message) {
        const statusDiv = this.modal.querySelector('#import-status');
        statusDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex items-center">
                    <svg class="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    <span class="text-red-800 font-medium">Import failed</span>
                </div>
                <p class="mt-2 text-sm text-red-700">${message}</p>
            </div>
        `;
        statusDiv.classList.remove('hidden');
    }

    hideExportStatus() {
        this.modal.querySelector('#export-status').classList.add('hidden');
    }

    resetImportState() {
        this.selectedFile = null;
        this.shouldCreateBackup = false;
        this.modal.querySelector('#import-file-input').value = '';
        this.modal.querySelector('#import-options').classList.add('hidden');
        this.modal.querySelector('#file-preview').classList.add('hidden');
        this.modal.querySelector('#import-actions').classList.add('hidden');
        this.modal.querySelector('#import-status').classList.add('hidden');
        this.hideSyncConflictWarning();

        // Reset merge strategy to default
        this.modal.querySelector('input[name="merge-strategy"][value="merge"]').checked = true;
    }

    setProcessing(processing) {
        this.isProcessing = processing;
        const overlay = this.modal.querySelector('#processing-overlay');

        if (processing) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    // Sync conflict handling methods

    showSyncConflictWarning(conflict) {
        const warningDiv = this.modal.querySelector('#sync-conflict-warning');
        const detailsDiv = this.modal.querySelector('#conflict-details');

        const recommendedText = {
            'use_import': 'Use imported data (newer)',
            'use_current': 'Keep current data (newer)',
            'manual_review': 'Manual review needed'
        };

        detailsDiv.innerHTML = `
            <p>The imported data appears to be from a different device and may conflict with your current data.</p>
            <div class="mt-2 text-xs space-y-1">
                <p>Import: ${conflict.importBookCount} books from device ${conflict.importDeviceId.substring(0, 8)}...</p>
                <p>Current: ${conflict.currentBookCount} books from device ${conflict.currentDeviceId.substring(0, 8)}...</p>
                <p>Recommended: ${recommendedText[conflict.recommendedAction] || 'Smart merge'}</p>
            </div>
        `;

        // Set recommended option
        const recommendedInput = this.modal.querySelector(`input[name="conflict-resolution"][value="${conflict.recommendedAction === 'use_import' ? 'use-import' :
                conflict.recommendedAction === 'use_current' ? 'use-current' :
                    'sync-aware-merge'
            }"]`);

        if (recommendedInput) {
            recommendedInput.checked = true;
        }

        warningDiv.classList.remove('hidden');
    }

    hideSyncConflictWarning() {
        const warningDiv = this.modal.querySelector('#sync-conflict-warning');
        warningDiv.classList.add('hidden');
    }

    // Backup and restore methods

    async createBackup() {
        try {
            this.setProcessing(true);

            const backupInfo = await this.importExportService.createImportBackup(this.collection);
            this.shouldCreateBackup = true;

            this.showImportStatus(`
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <svg class="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        <span class="text-blue-800 font-medium">Backup created successfully!</span>
                    </div>
                    <p class="mt-2 text-sm text-blue-700">
                        File: ${backupInfo.filename}<br>
                        Books: ${backupInfo.bookCount}
                    </p>
                </div>
            `);

            this.loadBackupList();

        } catch (error) {
            console.error('Backup creation failed:', error);
            this.showImportError(`Failed to create backup: ${error.message}`);
        } finally {
            this.setProcessing(false);
        }
    }

    toggleBackupList() {
        const backupList = this.modal.querySelector('#backup-list');
        if (backupList.classList.contains('hidden')) {
            this.loadBackupList();
            backupList.classList.remove('hidden');
        } else {
            backupList.classList.add('hidden');
        }
    }

    loadBackupList() {
        const backupItems = this.modal.querySelector('#backup-items');
        const backups = this.importExportService.getImportBackups();

        if (backups.length === 0) {
            backupItems.innerHTML = '<p class="text-sm text-gray-500">No backups available</p>';
            return;
        }

        backupItems.innerHTML = backups.map(backup => `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div>
                    <p class="font-medium">${backup.filename}</p>
                    <p class="text-gray-500">${new Date(backup.timestamp).toLocaleString()}</p>
                    <p class="text-gray-500">${backup.bookCount} books, ${(backup.fileSize / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" class="restore-backup-btn text-blue-600 hover:text-blue-800" 
                        data-backup='${JSON.stringify(backup)}'>
                    Restore
                </button>
            </div>
        `).join('');

        // Add event listeners for restore buttons
        backupItems.querySelectorAll('.restore-backup-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const backup = JSON.parse(e.target.dataset.backup);
                this.confirmRestoreBackup(backup);
            });
        });
    }

    confirmRestoreBackup(backup) {
        if (confirm(`Are you sure you want to restore from backup "${backup.filename}"? This will replace your current library.`)) {
            this.restoreFromBackup(backup);
        }
    }

    async restoreFromBackup(backup) {
        try {
            this.setProcessing(true);

            // For now, we'll just show a message since we don't have the actual backup data
            // In a real implementation, you'd need to store the backup data or have a way to retrieve it
            this.showImportError('Backup restoration is not yet fully implemented. Please manually import the backup file.');

        } catch (error) {
            console.error('Restore failed:', error);
            this.showImportError(`Failed to restore backup: ${error.message}`);
        } finally {
            this.setProcessing(false);
        }
    }

    showImportStatus(html) {
        const statusDiv = this.modal.querySelector('#import-status');
        statusDiv.innerHTML = html;
        statusDiv.classList.remove('hidden');
    }
}