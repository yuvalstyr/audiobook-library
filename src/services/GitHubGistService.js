/**
 * GitHubGistService - Handles GitHub Gist API interactions for audiobook data persistence
 * Supports anonymous reading of public gists and creation of new gists
 */
class GitHubGistService {
    constructor() {
        this.baseUrl = 'https://api.github.com/gists';
        this.rateLimitDelay = 1000; // Base delay for rate limiting (1 second)
        this.maxRetries = 3;
        this.dataFileName = 'audiobook-library.json';
    }

    /**
     * Read data from a public gist anonymously
     * @param {string} gistId - The GitHub gist ID
     * @returns {Promise<Object>} The audiobook collection data
     * @throws {Error} If gist cannot be read or data is invalid
     */
    async readGist(gistId) {
        if (!gistId || typeof gistId !== 'string') {
            throw new Error('Invalid gist ID provided');
        }

        const url = `${this.baseUrl}/${gistId.trim()}`;

        try {
            const response = await this._fetchWithRetry(url);

            if (!response.ok) {
                throw this._createGistError(response.status, 'Failed to read gist');
            }

            const gist = await response.json();

            // Validate gist is public
            if (!gist.public) {
                throw new Error('Gist must be public to read anonymously');
            }

            // Find the audiobook data file
            const dataFile = this._findDataFile(gist.files);
            if (!dataFile) {
                throw new Error('No audiobook data file found in gist');
            }

            // Parse and validate the data
            const data = JSON.parse(dataFile.content);
            this._validateAudiobookData(data);

            return data;

        } catch (error) {
            if (error.name === 'SyntaxError') {
                throw new Error('Invalid JSON format in gist data');
            }
            throw error;
        }
    }

    /**
     * Create a new public gist with audiobook data
     * @param {Object} data - The audiobook collection data
     * @param {string} description - Optional description for the gist
     * @returns {Promise<string>} The created gist ID
     * @throws {Error} If gist creation fails
     */
    async createGist(data, description = 'Audiobook Library Data') {
        this._validateAudiobookData(data);

        const gistData = {
            description: description,
            public: true,
            files: {
                [this.dataFileName]: {
                    content: JSON.stringify(data, null, 2)
                }
            }
        };

        try {
            const response = await this._fetchWithRetry(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(gistData)
            });

            if (!response.ok) {
                throw this._createGistError(response.status, 'Failed to create gist');
            }

            const createdGist = await response.json();
            return createdGist.id;

        } catch (error) {
            throw new Error(`Failed to create gist: ${error.message}`);
        }
    }

    /**
     * Update an existing public gist with new data
     * Note: This requires the gist to be owned by the user making the request
     * For anonymous usage, this will typically fail - users should create new gists instead
     * @param {string} gistId - The gist ID to update
     * @param {Object} data - The audiobook collection data
     * @returns {Promise<void>}
     * @throws {Error} If update fails
     */
    async updateGist(gistId, data) {
        if (!gistId || typeof gistId !== 'string') {
            throw new Error('Invalid gist ID provided');
        }

        this._validateAudiobookData(data);

        const updateData = {
            files: {
                [this.dataFileName]: {
                    content: JSON.stringify(data, null, 2)
                }
            }
        };

        const url = `${this.baseUrl}/${gistId.trim()}`;

        try {
            const response = await this._fetchWithRetry(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw this._createGistError(response.status, 'Failed to update gist');
            }

        } catch (error) {
            throw new Error(`Failed to update gist: ${error.message}`);
        }
    }

    /**
     * Check if a gist exists and is accessible
     * @param {string} gistId - The gist ID to check
     * @returns {Promise<boolean>} True if gist exists and is public
     */
    async gistExists(gistId) {
        if (!gistId || typeof gistId !== 'string') {
            return false;
        }

        try {
            const url = `${this.baseUrl}/${gistId.trim()}`;
            const response = await this._fetchWithRetry(url);

            if (response.status === 200) {
                const gist = await response.json();
                return gist.public === true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get gist metadata without downloading full content
     * @param {string} gistId - The gist ID
     * @returns {Promise<Object>} Gist metadata
     */
    async getGistMetadata(gistId) {
        if (!gistId || typeof gistId !== 'string') {
            throw new Error('Invalid gist ID provided');
        }

        const url = `${this.baseUrl}/${gistId.trim()}`;

        try {
            const response = await this._fetchWithRetry(url);

            if (!response.ok) {
                throw this._createGistError(response.status, 'Failed to get gist metadata');
            }

            const gist = await response.json();

            return {
                id: gist.id,
                description: gist.description,
                public: gist.public,
                created_at: gist.created_at,
                updated_at: gist.updated_at,
                files: Object.keys(gist.files),
                hasAudiobookData: this._findDataFile(gist.files) !== null
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Find the audiobook data file in gist files
     * @param {Object} files - Gist files object
     * @returns {Object|null} The data file object or null if not found
     * @private
     */
    _findDataFile(files) {
        // First try to find the expected filename
        if (files[this.dataFileName]) {
            return files[this.dataFileName];
        }

        // Then look for any JSON file that might contain audiobook data
        for (const [filename, file] of Object.entries(files)) {
            if (filename.endsWith('.json')) {
                try {
                    const content = JSON.parse(file.content);
                    if (content.audiobooks && Array.isArray(content.audiobooks)) {
                        return file;
                    }
                } catch (error) {
                    // Continue searching other files
                }
            }
        }

        return null;
    }

    /**
     * Validate audiobook data structure
     * @param {Object} data - Data to validate
     * @throws {Error} If data is invalid
     * @private
     */
    _validateAudiobookData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Data must be an object');
        }

        if (!Array.isArray(data.audiobooks)) {
            throw new Error('Data must contain an audiobooks array');
        }

        if (typeof data.version !== 'string') {
            throw new Error('Data must contain a version string');
        }

        if (typeof data.lastUpdated !== 'string') {
            throw new Error('Data must contain a lastUpdated timestamp');
        }
    }

    /**
     * Fetch with retry logic and rate limit handling
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     * @private
     */
    async _fetchWithRetry(url, options = {}) {
        let lastError;

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const response = await fetch(url, options);

                // Handle rate limiting
                if (response.status === 403) {
                    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
                    const rateLimitReset = response.headers.get('X-RateLimit-Reset');

                    if (rateLimitRemaining === '0') {
                        const resetTime = new Date(parseInt(rateLimitReset) * 1000);
                        const waitTime = Math.max(resetTime.getTime() - Date.now(), this.rateLimitDelay);

                        if (attempt < this.maxRetries - 1) {
                            await this._delay(waitTime);
                            continue;
                        }

                        throw new Error(`Rate limit exceeded. Try again after ${new Date(resetTime).toLocaleTimeString()}`);
                    }
                }

                // Handle temporary server errors with exponential backoff
                if (response.status >= 500 && attempt < this.maxRetries - 1) {
                    await this._delay(this.rateLimitDelay * Math.pow(2, attempt));
                    continue;
                }

                return response;

            } catch (error) {
                lastError = error;

                // Don't retry on network errors for the last attempt
                if (attempt === this.maxRetries - 1) {
                    break;
                }

                // Wait before retrying
                await this._delay(this.rateLimitDelay * Math.pow(2, attempt));
            }
        }

        throw new Error(`Network request failed after ${this.maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Create appropriate error based on HTTP status
     * @param {number} status - HTTP status code
     * @param {string} defaultMessage - Default error message
     * @returns {Error} Appropriate error object
     * @private
     */
    _createGistError(status, defaultMessage) {
        switch (status) {
            case 404:
                return new Error('Gist not found. Please check the gist ID.');
            case 403:
                return new Error('Access denied. Gist may be private or rate limit exceeded.');
            case 422:
                return new Error('Invalid gist data format.');
            case 500:
            case 502:
            case 503:
                return new Error('GitHub service temporarily unavailable. Please try again later.');
            default:
                return new Error(`${defaultMessage} (HTTP ${status})`);
        }
    }

    /**
     * Delay execution for specified milliseconds
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default GitHubGistService;