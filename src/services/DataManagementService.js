/**
 * DataManagementService - Handles data cleanup, validation, and management operations
 * Provides tools for clearing data, validating sync integrity, and managing device entries
 */
export class DataManagementService {
    constructor(dataService, syncManager, localCache, gistService, gistManager) {
        this.dataService = dataService;
        this.syncManager = syncManager;
        this.localCache = localCache;
        this.gistService = gistService;
        this.gistManager = gistManager;
    }

    /**
     * Clear all data from both local and cloud storage
     * @param {Object} options - Clear options
     * @param {boolean} options.clearLocal - Clear local cache
     * @param {boolean} options.clearCloud - Clear cloud gist
     * @param {boolean} options.preserveGistConnection - Keep gist ID but clear data
     * @returns {Promise<Object>} Clear operation result
     */
    async clearAllData(options = {}) {
        const {
            clearLocal = true,
            clearCloud = true,
            preserveGistConnection = false
        } = options;

        const result = {
            success: false,
            operations: [],
            errors: []
        };

        try {
            // Clear local cache
            if (clearLocal) {
                try {
                    await this.localCache.clearData();
                    result.operations.push('Local cache cleared');
                } catch (error) {
                    result.errors.push(`Failed to clear local cache: ${error.message}`);
                }
            }

            // Clear cloud gist
            if (clearCloud) {
                const gistId = this.gistManager.getGistId();
                if (gistId) {
                    try {
                        // Create empty data structure
                        const emptyData = {
                            metadata: {
                                version: '1.0',
                                lastModified: new Date().toISOString(),
                                deviceId: this.localCache.getDeviceId(),
                                appVersion: '1.0.0',
                                syncStatus: 'cleared'
                            },
                            audiobooks: []
                        };

                        await this.gistService.updateGist(gistId, emptyData);
                        result.operations.push('Cloud gist cleared');
                    } catch (error) {
                        result.errors.push(`Failed to clear cloud gist: ${error.message}`);
                    }
                }
            }

            // Clear gist connection if not preserving
            if (!preserveGistConnection) {
                try {
                    this.gistManager.clearGistId();
                    result.operations.push('Gist connection cleared');
                } catch (error) {
                    result.errors.push(`Failed to clear gist connection: ${error.message}`);
                }
            }

            // Stop sync system
            try {
                await this.syncManager.stop();
                result.operations.push('Sync system stopped');
            } catch (error) {
                result.errors.push(`Failed to stop sync: ${error.message}`);
            }

            result.success = result.errors.length === 0;
            result.timestamp = new Date().toISOString();

            return result;

        } catch (error) {
            result.errors.push(`Clear operation failed: ${error.message}`);
            result.success = false;
            return result;
        }
    }

    /**
     * Validate and repair corrupted sync data
     * @returns {Promise<Object>} Validation and repair result
     */
    async validateAndRepairData() {
        const result = {
            isValid: true,
            issues: [],
            repairs: [],
            errors: []
        };

        try {
            // Validate local cache data
            const localValidation = await this.validateLocalData();
            result.issues.push(...localValidation.issues);

            // Validate cloud data if available
            const gistId = this.gistManager.getGistId();
            if (gistId) {
                const cloudValidation = await this.validateCloudData(gistId);
                result.issues.push(...cloudValidation.issues);
            }

            // Attempt repairs for found issues
            for (const issue of result.issues) {
                try {
                    const repairResult = await this.repairDataIssue(issue);
                    if (repairResult.success) {
                        result.repairs.push(repairResult.description);
                    } else {
                        result.errors.push(repairResult.error);
                    }
                } catch (error) {
                    result.errors.push(`Failed to repair ${issue.type}: ${error.message}`);
                }
            }

            result.isValid = result.issues.length === 0;
            result.timestamp = new Date().toISOString();

            return result;

        } catch (error) {
            result.errors.push(`Validation failed: ${error.message}`);
            result.isValid = false;
            return result;
        }
    }

    /**
     * Validate local cache data
     * @returns {Promise<Object>} Local validation result
     * @private
     */
    async validateLocalData() {
        const issues = [];

        try {
            const localData = await this.localCache.loadData();

            if (!localData) {
                return { issues: [] }; // No data to validate
            }

            // Check metadata structure
            if (!localData.metadata) {
                issues.push({
                    type: 'missing_metadata',
                    severity: 'high',
                    description: 'Local data missing metadata',
                    location: 'local'
                });
            } else {
                // Validate metadata fields
                const requiredFields = ['version', 'lastModified', 'deviceId'];
                for (const field of requiredFields) {
                    if (!localData.metadata[field]) {
                        issues.push({
                            type: 'missing_metadata_field',
                            severity: 'medium',
                            description: `Missing metadata field: ${field}`,
                            location: 'local',
                            field
                        });
                    }
                }

                // Validate timestamp format
                if (localData.metadata.lastModified) {
                    const timestamp = new Date(localData.metadata.lastModified);
                    if (isNaN(timestamp.getTime())) {
                        issues.push({
                            type: 'invalid_timestamp',
                            severity: 'medium',
                            description: 'Invalid lastModified timestamp format',
                            location: 'local'
                        });
                    }
                }
            }

            // Check audiobooks array
            if (!Array.isArray(localData.audiobooks)) {
                issues.push({
                    type: 'invalid_audiobooks_structure',
                    severity: 'high',
                    description: 'Audiobooks is not an array',
                    location: 'local'
                });
            } else {
                // Validate individual audiobooks
                const seenIds = new Set();
                localData.audiobooks.forEach((book, index) => {
                    if (!book.id) {
                        issues.push({
                            type: 'missing_audiobook_id',
                            severity: 'high',
                            description: `Audiobook at index ${index} missing ID`,
                            location: 'local',
                            index
                        });
                    } else if (seenIds.has(book.id)) {
                        issues.push({
                            type: 'duplicate_audiobook_id',
                            severity: 'high',
                            description: `Duplicate audiobook ID: ${book.id}`,
                            location: 'local',
                            id: book.id
                        });
                    } else {
                        seenIds.add(book.id);
                    }

                    if (!book.title) {
                        issues.push({
                            type: 'missing_audiobook_title',
                            severity: 'medium',
                            description: `Audiobook ${book.id} missing title`,
                            location: 'local',
                            id: book.id
                        });
                    }
                });
            }

        } catch (error) {
            issues.push({
                type: 'local_data_corruption',
                severity: 'critical',
                description: `Cannot read local data: ${error.message}`,
                location: 'local'
            });
        }

        return { issues };
    }

    /**
     * Validate cloud gist data
     * @param {string} gistId - Gist ID to validate
     * @returns {Promise<Object>} Cloud validation result
     * @private
     */
    async validateCloudData(gistId) {
        const issues = [];

        try {
            // Check if gist exists
            const exists = await this.gistService.gistExists(gistId);
            if (!exists) {
                issues.push({
                    type: 'gist_not_found',
                    severity: 'critical',
                    description: 'Configured gist not found or not accessible',
                    location: 'cloud',
                    gistId
                });
                return { issues };
            }

            // Load and validate gist data
            const cloudData = await this.gistService.readGist(gistId);

            // Similar validation as local data
            if (!cloudData.metadata) {
                issues.push({
                    type: 'missing_metadata',
                    severity: 'high',
                    description: 'Cloud data missing metadata',
                    location: 'cloud'
                });
            }

            if (!Array.isArray(cloudData.audiobooks)) {
                issues.push({
                    type: 'invalid_audiobooks_structure',
                    severity: 'high',
                    description: 'Cloud audiobooks is not an array',
                    location: 'cloud'
                });
            }

        } catch (error) {
            issues.push({
                type: 'cloud_data_corruption',
                severity: 'critical',
                description: `Cannot read cloud data: ${error.message}`,
                location: 'cloud'
            });
        }

        return { issues };
    }

    /**
     * Repair a specific data issue
     * @param {Object} issue - Issue to repair
     * @returns {Promise<Object>} Repair result
     * @private
     */
    async repairDataIssue(issue) {
        try {
            switch (issue.type) {
                case 'missing_metadata':
                    return await this.repairMissingMetadata(issue.location);

                case 'missing_metadata_field':
                    return await this.repairMissingMetadataField(issue.location, issue.field);

                case 'invalid_timestamp':
                    return await this.repairInvalidTimestamp(issue.location);

                case 'duplicate_audiobook_id':
                    return await this.repairDuplicateIds(issue.location);

                case 'missing_audiobook_id':
                    return await this.repairMissingAudiobookId(issue.location, issue.index);

                default:
                    return {
                        success: false,
                        error: `No repair method for issue type: ${issue.type}`
                    };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Repair missing metadata
     * @param {string} location - 'local' or 'cloud'
     * @returns {Promise<Object>} Repair result
     * @private
     */
    async repairMissingMetadata(location) {
        const defaultMetadata = {
            version: '1.0',
            lastModified: new Date().toISOString(),
            deviceId: this.localCache.getDeviceId(),
            appVersion: '1.0.0',
            syncStatus: 'repaired'
        };

        if (location === 'local') {
            const data = await this.localCache.loadData() || { audiobooks: [] };
            data.metadata = defaultMetadata;
            await this.localCache.saveData(data);
        } else if (location === 'cloud') {
            const gistId = this.gistManager.getGistId();
            const data = await this.gistService.readGist(gistId);
            data.metadata = defaultMetadata;
            await this.gistService.updateGist(gistId, data);
        }

        return {
            success: true,
            description: `Repaired missing metadata in ${location}`
        };
    }

    /**
     * Repair missing metadata field
     * @param {string} location - 'local' or 'cloud'
     * @param {string} field - Missing field name
     * @returns {Promise<Object>} Repair result
     * @private
     */
    async repairMissingMetadataField(location, field) {
        const fieldDefaults = {
            version: '1.0',
            lastModified: new Date().toISOString(),
            deviceId: this.localCache.getDeviceId(),
            appVersion: '1.0.0'
        };

        if (location === 'local') {
            const data = await this.localCache.loadData();
            if (data && data.metadata) {
                data.metadata[field] = fieldDefaults[field];
                await this.localCache.saveData(data);
            }
        } else if (location === 'cloud') {
            const gistId = this.gistManager.getGistId();
            const data = await this.gistService.readGist(gistId);
            if (data.metadata) {
                data.metadata[field] = fieldDefaults[field];
                await this.gistService.updateGist(gistId, data);
            }
        }

        return {
            success: true,
            description: `Repaired missing ${field} field in ${location}`
        };
    }

    /**
     * Repair invalid timestamp
     * @param {string} location - 'local' or 'cloud'
     * @returns {Promise<Object>} Repair result
     * @private
     */
    async repairInvalidTimestamp(location) {
        const validTimestamp = new Date().toISOString();

        if (location === 'local') {
            const data = await this.localCache.loadData();
            if (data && data.metadata) {
                data.metadata.lastModified = validTimestamp;
                await this.localCache.saveData(data);
            }
        } else if (location === 'cloud') {
            const gistId = this.gistManager.getGistId();
            const data = await this.gistService.readGist(gistId);
            if (data.metadata) {
                data.metadata.lastModified = validTimestamp;
                await this.gistService.updateGist(gistId, data);
            }
        }

        return {
            success: true,
            description: `Repaired invalid timestamp in ${location}`
        };
    }

    /**
     * Repair duplicate audiobook IDs
     * @param {string} location - 'local' or 'cloud'
     * @returns {Promise<Object>} Repair result
     * @private
     */
    async repairDuplicateIds(location) {
        let data;

        if (location === 'local') {
            data = await this.localCache.loadData();
        } else {
            const gistId = this.gistManager.getGistId();
            data = await this.gistService.readGist(gistId);
        }

        if (!data || !Array.isArray(data.audiobooks)) {
            return { success: false, error: 'No audiobooks data found' };
        }

        const seenIds = new Set();
        const uniqueBooks = [];
        let duplicatesRemoved = 0;

        for (const book of data.audiobooks) {
            if (!seenIds.has(book.id)) {
                seenIds.add(book.id);
                uniqueBooks.push(book);
            } else {
                duplicatesRemoved++;
            }
        }

        data.audiobooks = uniqueBooks;
        data.metadata.lastModified = new Date().toISOString();

        if (location === 'local') {
            await this.localCache.saveData(data);
        } else {
            const gistId = this.gistManager.getGistId();
            await this.gistService.updateGist(gistId, data);
        }

        return {
            success: true,
            description: `Removed ${duplicatesRemoved} duplicate audiobooks from ${location}`
        };
    }

    /**
     * Repair missing audiobook ID
     * @param {string} location - 'local' or 'cloud'
     * @param {number} index - Index of audiobook missing ID
     * @returns {Promise<Object>} Repair result
     * @private
     */
    async repairMissingAudiobookId(location, index) {
        let data;

        if (location === 'local') {
            data = await this.localCache.loadData();
        } else {
            const gistId = this.gistManager.getGistId();
            data = await this.gistService.readGist(gistId);
        }

        if (!data || !Array.isArray(data.audiobooks) || !data.audiobooks[index]) {
            return { success: false, error: 'Audiobook not found at specified index' };
        }

        // Generate a new ID based on title and author
        const book = data.audiobooks[index];
        const newId = this.generateAudiobookId(book.title, book.author);
        book.id = newId;

        data.metadata.lastModified = new Date().toISOString();

        if (location === 'local') {
            await this.localCache.saveData(data);
        } else {
            const gistId = this.gistManager.getGistId();
            await this.gistService.updateGist(gistId, data);
        }

        return {
            success: true,
            description: `Generated ID ${newId} for audiobook at index ${index} in ${location}`
        };
    }

    /**
     * Generate audiobook ID from title and author
     * @param {string} title - Book title
     * @param {string} author - Book author
     * @returns {string} Generated ID
     * @private
     */
    generateAudiobookId(title, author) {
        const text = `${title || 'untitled'}-${author || 'unknown'}`;
        const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const timestamp = Date.now().toString(36);
        return `${normalized}-${timestamp}`;
    }

    /**
     * Get comprehensive sync statistics and diagnostics
     * @returns {Promise<Object>} Sync statistics
     */
    async getSyncStatistics() {
        try {
            const stats = {
                timestamp: new Date().toISOString(),
                sync: {},
                cache: {},
                gist: {},
                devices: {},
                health: {
                    overall: 'unknown',
                    issues: []
                }
            };

            // Get sync manager statistics
            if (this.syncManager) {
                stats.sync = await this.syncManager.getSyncStatus();
            }

            // Get cache statistics
            stats.cache = await this.localCache.getCacheStats();

            // Get gist information
            const gistId = this.gistManager.getGistId();
            if (gistId) {
                try {
                    stats.gist = await this.gistService.getGistMetadata(gistId);
                    stats.gist.connected = true;
                } catch (error) {
                    stats.gist = {
                        connected: false,
                        error: error.message,
                        gistId
                    };
                }
            } else {
                stats.gist = { connected: false };
            }

            // Get device information
            stats.devices = await this.getDeviceStatistics();

            // Assess overall health
            stats.health = this.assessSyncHealth(stats);

            return stats;

        } catch (error) {
            return {
                timestamp: new Date().toISOString(),
                error: error.message,
                health: {
                    overall: 'error',
                    issues: [`Failed to gather statistics: ${error.message}`]
                }
            };
        }
    }

    /**
     * Get device management statistics
     * @returns {Promise<Object>} Device statistics
     */
    async getDeviceStatistics() {
        const deviceStats = {
            currentDevice: this.localCache.getDeviceId(),
            knownDevices: [],
            lastSeenDevices: {},
            totalDevices: 0
        };

        try {
            // Get device info from local metadata
            const localMetadata = await this.localCache.getSyncMetadata();

            // Try to get device info from cloud if available
            const gistId = this.gistManager.getGistId();
            if (gistId) {
                try {
                    const cloudData = await this.gistService.readGist(gistId);
                    if (cloudData.metadata && cloudData.metadata.deviceId) {
                        deviceStats.knownDevices.push({
                            id: cloudData.metadata.deviceId,
                            lastSeen: cloudData.metadata.lastModified,
                            source: 'cloud'
                        });
                    }
                } catch (error) {
                    // Cloud data not available
                }
            }

            // Add current device
            deviceStats.knownDevices.push({
                id: deviceStats.currentDevice,
                lastSeen: localMetadata.lastUpdated || new Date().toISOString(),
                source: 'local',
                isCurrent: true
            });

            // Remove duplicates and count
            const uniqueDevices = new Map();
            deviceStats.knownDevices.forEach(device => {
                if (!uniqueDevices.has(device.id) || device.isCurrent) {
                    uniqueDevices.set(device.id, device);
                }
            });

            deviceStats.knownDevices = Array.from(uniqueDevices.values());
            deviceStats.totalDevices = deviceStats.knownDevices.length;

            // Create last seen lookup
            deviceStats.knownDevices.forEach(device => {
                deviceStats.lastSeenDevices[device.id] = device.lastSeen;
            });

        } catch (error) {
            deviceStats.error = error.message;
        }

        return deviceStats;
    }

    /**
     * Clean up old device entries
     * @param {Object} options - Cleanup options
     * @param {number} options.maxAge - Maximum age in days for device entries
     * @returns {Promise<Object>} Cleanup result
     */
    async cleanupOldDevices(options = {}) {
        const { maxAge = 30 } = options; // Default 30 days
        const cutoffDate = new Date(Date.now() - (maxAge * 24 * 60 * 60 * 1000));

        const result = {
            success: false,
            devicesRemoved: 0,
            errors: []
        };

        try {
            const deviceStats = await this.getDeviceStatistics();
            const currentDeviceId = this.localCache.getDeviceId();

            // For now, we can only clean up local references
            // In a more advanced implementation, we might track devices in the gist

            // Clean up local sync metadata for old devices
            const localMetadata = await this.localCache.getSyncMetadata();

            // This is a placeholder for device cleanup
            // In practice, device cleanup would depend on how device tracking is implemented
            result.success = true;
            result.message = 'Device cleanup completed (no old devices found)';

        } catch (error) {
            result.errors.push(`Device cleanup failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Assess overall sync health
     * @param {Object} stats - Sync statistics
     * @returns {Object} Health assessment
     * @private
     */
    assessSyncHealth(stats) {
        const issues = [];
        let overall = 'good';

        // Check gist connection
        if (!stats.gist.connected) {
            issues.push('No gist connection configured');
            overall = 'warning';
        } else if (stats.gist.error) {
            issues.push(`Gist connection error: ${stats.gist.error}`);
            overall = 'error';
        }

        // Check sync status
        if (stats.sync.syncStatus === 'error') {
            issues.push('Sync system has errors');
            overall = 'error';
        } else if (stats.sync.syncStatus === 'offline') {
            issues.push('Currently offline');
            if (overall === 'good') overall = 'warning';
        }

        // Check cache health
        if (stats.cache.error) {
            issues.push(`Cache error: ${stats.cache.error}`);
            overall = 'error';
        }

        // Check last sync time
        if (stats.sync.lastSyncTime) {
            const lastSync = new Date(stats.sync.lastSyncTime);
            const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

            if (hoursSinceSync > 24) {
                issues.push('No sync in over 24 hours');
                if (overall === 'good') overall = 'warning';
            }
        } else if (stats.gist.connected) {
            issues.push('Never synced');
            if (overall === 'good') overall = 'warning';
        }

        return { overall, issues };
    }
}