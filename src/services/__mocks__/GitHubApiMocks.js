/**
 * Mock GitHub API responses for reliable testing
 */

export class GitHubApiMocks {
    static createValidGistResponse(options = {}) {
        const {
            id = 'mock-gist-id',
            description = 'Audiobook Library Data',
            public = true,
            audiobooks = [],
            customGenres = [],
            customMoods = [],
            metadata = {}
        } = options;

        const defaultMetadata = {
            version: '1.0',
            lastModified: new Date().toISOString(),
            deviceId: 'mock-device-123',
            appVersion: '1.0.0',
            syncStatus: 'synced',
            ...metadata
        };

        const audiobookData = {
            metadata: defaultMetadata,
            audiobooks,
            customGenres,
            customMoods
        };

        return {
            id,
            description,
            public,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: new Date().toISOString(),
            files: {
                'audiobook-library.json': {
                    content: JSON.stringify(audiobookData, null, 2)
                }
            }
        };
    }

    static createEmptyGistResponse(options = {}) {
        return this.createValidGistResponse({
            audiobooks: [],
            customGenres: [],
            customMoods: [],
            ...options
        });
    }

    static createGistWithAudiobooks(audiobooks, options = {}) {
        return this.createValidGistResponse({
            audiobooks,
            ...options
        });
    }

    static createPrivateGistResponse(options = {}) {
        return this.createValidGistResponse({
            public: false,
            ...options
        });
    }

    static createCorruptedGistResponse(options = {}) {
        const { id = 'corrupted-gist-id' } = options;

        return {
            id,
            description: 'Corrupted Audiobook Library Data',
            public: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: new Date().toISOString(),
            files: {
                'audiobook-library.json': {
                    content: 'invalid json content {'
                }
            }
        };
    }

    static createGistWithoutAudiobookFile(options = {}) {
        const { id = 'no-audiobook-file-gist' } = options;

        return {
            id,
            description: 'Gist without audiobook file',
            public: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: new Date().toISOString(),
            files: {
                'other-file.txt': {
                    content: 'some other content'
                }
            }
        };
    }

    static createRateLimitError() {
        const error = new Error('API rate limit exceeded');
        error.status = 403;
        error.headers = new Map([
            ['X-RateLimit-Remaining', '0'],
            ['X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600)]
        ]);
        return error;
    }

    static createNetworkError() {
        const error = new Error('fetch failed');
        error.name = 'TypeError';
        return error;
    }

    static createTimeoutError() {
        const error = new Error('Request timeout');
        error.name = 'AbortError';
        return error;
    }

    static createAuthenticationError() {
        const error = new Error('Bad credentials');
        error.status = 401;
        return error;
    }

    static createNotFoundError() {
        const error = new Error('Not Found');
        error.status = 404;
        return error;
    }

    static createServerError() {
        const error = new Error('Internal Server Error');
        error.status = 500;
        return error;
    }

    static createValidationError() {
        const error = new Error('Validation Failed');
        error.status = 422;
        return error;
    }

    static mockFetchResponse(data, options = {}) {
        const {
            ok = true,
            status = 200,
            statusText = 'OK',
            headers = new Map()
        } = options;

        return {
            ok,
            status,
            statusText,
            headers,
            json: () => Promise.resolve(data),
            text: () => Promise.resolve(JSON.stringify(data))
        };
    }

    static mockFetchError(error) {
        return Promise.reject(error);
    }

    static setupSuccessfulGistRead(gistId, audiobookData = []) {
        const response = this.createGistWithAudiobooks(audiobookData, { id: gistId });
        return this.mockFetchResponse(response);
    }

    static setupSuccessfulGistCreate(audiobookData = []) {
        const response = this.createGistWithAudiobooks(audiobookData, {
            id: 'newly-created-gist-id'
        });
        return this.mockFetchResponse(response, { status: 201 });
    }

    static setupSuccessfulGistUpdate(gistId, audiobookData = []) {
        const response = this.createGistWithAudiobooks(audiobookData, { id: gistId });
        return this.mockFetchResponse(response);
    }

    static setupGistNotFound() {
        return this.mockFetchResponse(null, {
            ok: false,
            status: 404,
            statusText: 'Not Found'
        });
    }

    static setupRateLimitResponse() {
        return this.mockFetchResponse(null, {
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            headers: new Map([
                ['X-RateLimit-Remaining', '0'],
                ['X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600)]
            ])
        });
    }

    static setupServerErrorResponse() {
        return this.mockFetchResponse(null, {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
        });
    }

    static createMockAudiobook(overrides = {}) {
        return {
            id: 'mock-audiobook-' + Math.random().toString(36).substr(2, 9),
            title: 'Mock Audiobook Title',
            author: 'Mock Author',
            narrator: 'Mock Narrator',
            genres: ['fantasy'],
            moods: ['epic'],
            rating: 4.5,
            length: '10h 30m',
            price: '$14.95',
            imageUrl: 'https://example.com/cover.jpg',
            audibleUrl: 'https://example.com/audiobook',
            releaseDate: '2024-01-01',
            dateAdded: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            ...overrides
        };
    }

    static createMockAudiobooks(count = 3) {
        return Array.from({ length: count }, (_, index) =>
            this.createMockAudiobook({
                id: `mock-audiobook-${index + 1}`,
                title: `Mock Audiobook ${index + 1}`,
                author: `Mock Author ${index + 1}`
            })
        );
    }

    static createConflictScenario() {
        const baseBook = this.createMockAudiobook({
            id: 'conflict-book',
            title: 'Original Title',
            author: 'Original Author'
        });

        const localVersion = {
            ...baseBook,
            title: 'Local Modified Title',
            lastModified: '2024-01-15T10:30:00Z'
        };

        const remoteVersion = {
            ...baseBook,
            title: 'Remote Modified Title',
            lastModified: '2024-01-15T10:30:30Z'
        };

        return { baseBook, localVersion, remoteVersion };
    }

    static createSyncMetadata(overrides = {}) {
        return {
            version: '1.0',
            lastModified: new Date().toISOString(),
            deviceId: 'mock-device-' + Math.random().toString(36).substr(2, 9),
            appVersion: '1.0.0',
            syncStatus: 'synced',
            ...overrides
        };
    }
}