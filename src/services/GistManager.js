/**
 * GistManager - Handles public gist ID storage and validation
 * Manages connection to existing gists and creation of new ones
 */
class GistManager {
    constructor() {
        this.storageKey = 'audiobook-gist-id';
        this.baseUrl = 'https://api.github.com/gists';
    }

    /**
     * Save gist ID to localStorage
     * @param {string} gistId - The GitHub gist ID
     */
    saveGistId(gistId) {
        if (!gistId || typeof gistId !== 'string') {
            throw new Error('Invalid gist ID provided');
        }
        localStorage.setItem(this.storageKey, gistId.trim());
    }

    /**
     * Retrieve stored gist ID from localStorage
     * @returns {string|null} The stored gist ID or null if not found
     */
    getGistId() {
        return localStorage.getItem(this.storageKey);
    }

    /**
     * Clear stored gist ID
     */
    clearGistId() {
        localStorage.removeItem(this.storageKey);
    }

    /**
     * Validate that a gist ID exists and is accessible
     * @param {string} gistId - The gist ID to validate
     * @returns {Promise<boolean>} True if gist exists and is accessible
     */
    async validateGistExists(gistId) {
        if (!gistId || typeof gistId !== 'string') {
            return false;
        }

        try {
            const response = await fetch(`${this.baseUrl}/${gistId.trim()}`);

            if (response.status === 200) {
                const gist = await response.json();
                // Verify it's a public gist and has the expected structure
                return gist.public === true && gist.files && Object.keys(gist.files).length > 0;
            }

            return false;
        } catch (error) {
            console.error('Error validating gist:', error);
            return false;
        }
    }

    /**
     * Check if gist contains audiobook data structure
     * @param {string} gistId - The gist ID to check
     * @returns {Promise<boolean>} True if gist contains valid audiobook data
     */
    async validateGistStructure(gistId) {
        if (!gistId) {
            return false;
        }

        try {
            const response = await fetch(`${this.baseUrl}/${gistId.trim()}`);

            if (response.status !== 200) {
                return false;
            }

            const gist = await response.json();
            const files = Object.values(gist.files);

            if (files.length === 0) {
                return false;
            }

            // Check if any file contains audiobook data structure
            for (const file of files) {
                try {
                    const content = JSON.parse(file.content);
                    if (content.audiobooks && Array.isArray(content.audiobooks)) {
                        return true;
                    }
                } catch (parseError) {
                    // Continue checking other files
                }
            }

            return false;
        } catch (error) {
            console.error('Error validating gist structure:', error);
            return false;
        }
    }

    /**
     * Get gist information for display
     * @param {string} gistId - The gist ID to get info for
     * @returns {Promise<Object|null>} Gist information or null if not found
     */
    async getGistInfo(gistId) {
        if (!gistId) {
            return null;
        }

        try {
            const response = await fetch(`${this.baseUrl}/${gistId.trim()}`);

            if (response.status !== 200) {
                return null;
            }

            const gist = await response.json();
            return {
                id: gist.id,
                description: gist.description || 'Audiobook Library Data',
                public: gist.public,
                created_at: gist.created_at,
                updated_at: gist.updated_at,
                files: Object.keys(gist.files)
            };
        } catch (error) {
            console.error('Error getting gist info:', error);
            return null;
        }
    }

    /**
     * Check if we have a valid stored gist ID
     * @returns {Promise<boolean>} True if stored gist ID is valid
     */
    async hasValidStoredGist() {
        const gistId = this.getGistId();
        if (!gistId) {
            return false;
        }
        return await this.validateGistExists(gistId);
    }
}

export default GistManager;