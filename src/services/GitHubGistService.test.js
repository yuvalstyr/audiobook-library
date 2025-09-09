import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GitHubGistService from './GitHubGistService.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('GitHubGistService', () => {
    let service;
    let mockFetch;

    const validAudiobookData = {
        version: '1.0',
        lastUpdated: '2024-01-15T10:30:00Z',
        audiobooks: [
            {
                id: 'test-1',
                title: 'Test Book',
                author: 'Test Author',
                narrator: 'Test Narrator',
                genres: ['fantasy'],
                moods: ['fast-paced'],
                rating: 4.5,
                length: '10h 30m',
                price: '$14.95',
                imageUrl: 'https://example.com/image.jpg',
                audibleUrl: 'https://example.com/book',
                releaseDate: '2024-01-01',
                dateAdded: '2024-01-15T10:30:00Z'
            }
        ],
        customGenres: [],
        customMoods: []
    };

    const mockGistResponse = {
        id: 'test-gist-id',
        description: 'Audiobook Library Data',
        public: true,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:30:00Z',
        files: {
            'audiobook-library.json': {
                content: JSON.stringify(validAudiobookData)
            }
        }
    };

    beforeEach(() => {
        service = new GitHubGistService();
        mockFetch = vi.mocked(fetch);
        mockFetch.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('readGist', () => {
        it('should successfully read a public gist with valid data', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockGistResponse)
            });

            const result = await service.readGist('test-gist-id');

            expect(result).toEqual(validAudiobookData);
            expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/gists/test-gist-id', {});
        });

        it('should throw error for invalid gist ID', async () => {
            await expect(service.readGist('')).rejects.toThrow('Invalid gist ID provided');
            await expect(service.readGist(null)).rejects.toThrow('Invalid gist ID provided');
            await expect(service.readGist(123)).rejects.toThrow('Invalid gist ID provided');
        });

        it('should throw error for non-existent gist', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            await expect(service.readGist('non-existent')).rejects.toThrow('Gist not found');
        });

        it('should throw error for private gist', async () => {
            const privateGist = { ...mockGistResponse, public: false };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(privateGist)
            });

            await expect(service.readGist('private-gist')).rejects.toThrow('Gist must be public');
        });

        it('should throw error when no audiobook data file found', async () => {
            const gistWithoutData = {
                ...mockGistResponse,
                files: {
                    'other-file.txt': { content: 'some text' }
                }
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(gistWithoutData)
            });

            await expect(service.readGist('no-data-gist')).rejects.toThrow('No audiobook data file found');
        });

        it('should throw error for invalid JSON in gist', async () => {
            const gistWithInvalidJson = {
                ...mockGistResponse,
                files: {
                    'audiobook-library.json': { content: 'invalid json' }
                }
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(gistWithInvalidJson)
            });

            await expect(service.readGist('invalid-json-gist')).rejects.toThrow('Invalid JSON format');
        });

        it('should find audiobook data in alternative JSON files', async () => {
            const gistWithAlternativeFile = {
                ...mockGistResponse,
                files: {
                    'my-audiobooks.json': {
                        content: JSON.stringify(validAudiobookData)
                    }
                }
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(gistWithAlternativeFile)
            });

            const result = await service.readGist('alternative-file-gist');
            expect(result).toEqual(validAudiobookData);
        });
    });

    describe('createGist', () => {
        it('should successfully create a new public gist', async () => {
            const createdGist = { ...mockGistResponse, id: 'new-gist-id' };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: () => Promise.resolve(createdGist)
            });

            const gistId = await service.createGist(validAudiobookData);

            expect(gistId).toBe('new-gist-id');
            expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    description: 'Audiobook Library Data',
                    public: true,
                    files: {
                        'audiobook-library.json': {
                            content: JSON.stringify(validAudiobookData, null, 2)
                        }
                    }
                })
            });
        });

        it('should create gist with custom description', async () => {
            const createdGist = { ...mockGistResponse, id: 'custom-desc-gist' };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: () => Promise.resolve(createdGist)
            });

            await service.createGist(validAudiobookData, 'My Custom Library');

            const callArgs = mockFetch.mock.calls[0][1];
            const body = JSON.parse(callArgs.body);
            expect(body.description).toBe('My Custom Library');
        });

        it('should throw error for invalid data', async () => {
            await expect(service.createGist(null)).rejects.toThrow('Data must be an object');
            await expect(service.createGist({})).rejects.toThrow('Data must contain an audiobooks array');
            await expect(service.createGist({ audiobooks: [] })).rejects.toThrow('Data must contain a version string');
        });

        it('should handle gist creation failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 422
            });

            await expect(service.createGist(validAudiobookData)).rejects.toThrow('Failed to create gist');
        });
    });

    describe('updateGist', () => {
        it('should successfully update an existing gist', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockGistResponse)
            });

            await service.updateGist('test-gist-id', validAudiobookData);

            expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/gists/test-gist-id', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    files: {
                        'audiobook-library.json': {
                            content: JSON.stringify(validAudiobookData, null, 2)
                        }
                    }
                })
            });
        });

        it('should throw error for invalid gist ID', async () => {
            await expect(service.updateGist('', validAudiobookData)).rejects.toThrow('Invalid gist ID provided');
        });

        it('should throw error for invalid data', async () => {
            await expect(service.updateGist('test-id', null)).rejects.toThrow('Data must be an object');
        });

        it('should handle update failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            await expect(service.updateGist('test-id', validAudiobookData)).rejects.toThrow('Failed to update gist');
        });
    });

    describe('gistExists', () => {
        it('should return true for existing public gist', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockGistResponse)
            });

            const exists = await service.gistExists('test-gist-id');
            expect(exists).toBe(true);
        });

        it('should return false for non-existent gist', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            const exists = await service.gistExists('non-existent');
            expect(exists).toBe(false);
        });

        it('should return false for private gist', async () => {
            const privateGist = { ...mockGistResponse, public: false };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(privateGist)
            });

            const exists = await service.gistExists('private-gist');
            expect(exists).toBe(false);
        });

        it('should return false for invalid gist ID', async () => {
            const exists = await service.gistExists('');
            expect(exists).toBe(false);
        });

        it('should handle network errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const exists = await service.gistExists('test-id');
            expect(exists).toBe(false);
        });
    });

    describe('getGistMetadata', () => {
        it('should return gist metadata', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockGistResponse)
            });

            const metadata = await service.getGistMetadata('test-gist-id');

            expect(metadata).toEqual({
                id: 'test-gist-id',
                description: 'Audiobook Library Data',
                public: true,
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T10:30:00Z',
                files: ['audiobook-library.json'],
                hasAudiobookData: true
            });
        });

        it('should throw error for invalid gist ID', async () => {
            await expect(service.getGistMetadata('')).rejects.toThrow('Invalid gist ID provided');
        });

        it('should handle gist not found', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            await expect(service.getGistMetadata('not-found')).rejects.toThrow('Gist not found');
        });
    });

    describe('rate limiting and retry logic', () => {
        it('should retry on rate limit and succeed', async () => {
            // First call hits rate limit
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                headers: new Map([
                    ['X-RateLimit-Remaining', '0'],
                    ['X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 1)]
                ])
            });

            // Second call succeeds
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockGistResponse)
            });

            // Mock delay to speed up test
            vi.spyOn(service, '_delay').mockResolvedValue();

            const result = await service.readGist('test-gist-id');
            expect(result).toEqual(validAudiobookData);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('should retry on server errors', async () => {
            // First call returns server error
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            // Second call succeeds
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockGistResponse)
            });

            // Mock delay to speed up test
            vi.spyOn(service, '_delay').mockResolvedValue();

            const result = await service.readGist('test-gist-id');
            expect(result).toEqual(validAudiobookData);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('should fail after max retries', async () => {
            // All calls return server error
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500
            });

            // Mock delay to speed up test
            vi.spyOn(service, '_delay').mockResolvedValue();

            await expect(service.readGist('test-gist-id')).rejects.toThrow('GitHub service temporarily unavailable');
            expect(mockFetch).toHaveBeenCalledTimes(3); // maxRetries
        });

        it('should handle network errors with retry', async () => {
            // First two calls fail with network error
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            // Third call succeeds
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockGistResponse)
            });

            // Mock delay to speed up test
            vi.spyOn(service, '_delay').mockResolvedValue();

            const result = await service.readGist('test-gist-id');
            expect(result).toEqual(validAudiobookData);
            expect(mockFetch).toHaveBeenCalledTimes(3);
        });
    });

    describe('data validation', () => {
        it('should validate required fields in audiobook data', async () => {
            const invalidData = { audiobooks: [] }; // missing version and lastUpdated

            await expect(service.createGist(invalidData)).rejects.toThrow('Data must contain a version string');
        });

        it('should validate audiobooks array', async () => {
            const invalidData = {
                version: '1.0',
                lastUpdated: '2024-01-15T10:30:00Z',
                audiobooks: 'not an array'
            };

            await expect(service.createGist(invalidData)).rejects.toThrow('Data must contain an audiobooks array');
        });

        it('should accept valid minimal data structure', async () => {
            const minimalData = {
                version: '1.0',
                lastUpdated: '2024-01-15T10:30:00Z',
                audiobooks: []
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: () => Promise.resolve({ ...mockGistResponse, id: 'minimal-gist' })
            });

            const gistId = await service.createGist(minimalData);
            expect(gistId).toBe('minimal-gist');
        });
    });

    describe('error handling', () => {
        it('should create appropriate error messages for different HTTP status codes', () => {
            expect(service._createGistError(404, 'Test').message).toContain('Gist not found');
            expect(service._createGistError(403, 'Test').message).toContain('Access denied');
            expect(service._createGistError(422, 'Test').message).toContain('Invalid gist data format');
            expect(service._createGistError(500, 'Test').message).toContain('GitHub service temporarily unavailable');
            expect(service._createGistError(999, 'Test').message).toContain('Test (HTTP 999)');
        });
    });
});