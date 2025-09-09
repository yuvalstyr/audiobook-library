import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GistManager from './GistManager.js';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};

// Mock fetch
global.fetch = vi.fn();

// Mock window and localStorage for Node.js environment
global.window = {};
Object.defineProperty(global.window, 'localStorage', {
    value: localStorageMock
});

// Also set localStorage directly on global for the GistManager
global.localStorage = localStorageMock;

describe('GistManager', () => {
    let gistManager;

    beforeEach(() => {
        gistManager = new GistManager();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('saveGistId', () => {
        it('should save valid gist ID to localStorage', () => {
            const gistId = 'abc123def456';
            gistManager.saveGistId(gistId);

            expect(localStorageMock.setItem).toHaveBeenCalledWith('audiobook-gist-id', gistId);
        });

        it('should trim whitespace from gist ID', () => {
            const gistId = '  abc123def456  ';
            gistManager.saveGistId(gistId);

            expect(localStorageMock.setItem).toHaveBeenCalledWith('audiobook-gist-id', 'abc123def456');
        });

        it('should throw error for invalid gist ID', () => {
            expect(() => gistManager.saveGistId(null)).toThrow('Invalid gist ID provided');
            expect(() => gistManager.saveGistId('')).toThrow('Invalid gist ID provided');
            expect(() => gistManager.saveGistId(123)).toThrow('Invalid gist ID provided');
        });
    });

    describe('getGistId', () => {
        it('should retrieve gist ID from localStorage', () => {
            const gistId = 'abc123def456';
            localStorageMock.getItem.mockReturnValue(gistId);

            const result = gistManager.getGistId();

            expect(localStorageMock.getItem).toHaveBeenCalledWith('audiobook-gist-id');
            expect(result).toBe(gistId);
        });

        it('should return null if no gist ID stored', () => {
            localStorageMock.getItem.mockReturnValue(null);

            const result = gistManager.getGistId();

            expect(result).toBeNull();
        });
    });

    describe('clearGistId', () => {
        it('should remove gist ID from localStorage', () => {
            gistManager.clearGistId();

            expect(localStorageMock.removeItem).toHaveBeenCalledWith('audiobook-gist-id');
        });
    });

    describe('validateGistExists', () => {
        it('should return true for valid public gist', async () => {
            const mockGist = {
                public: true,
                files: {
                    'audiobooks.json': { content: '{}' }
                }
            };

            fetch.mockResolvedValueOnce({
                status: 200,
                json: () => Promise.resolve(mockGist)
            });

            const result = await gistManager.validateGistExists('abc123def456');

            expect(result).toBe(true);
            expect(fetch).toHaveBeenCalledWith('https://api.github.com/gists/abc123def456');
        });

        it('should return false for non-existent gist', async () => {
            fetch.mockResolvedValueOnce({
                status: 404
            });

            const result = await gistManager.validateGistExists('nonexistent');

            expect(result).toBe(false);
        });

        it('should return false for private gist', async () => {
            const mockGist = {
                public: false,
                files: {
                    'audiobooks.json': { content: '{}' }
                }
            };

            fetch.mockResolvedValueOnce({
                status: 200,
                json: () => Promise.resolve(mockGist)
            });

            const result = await gistManager.validateGistExists('abc123def456');

            expect(result).toBe(false);
        });

        it('should return false for invalid gist ID', async () => {
            const result1 = await gistManager.validateGistExists(null);
            const result2 = await gistManager.validateGistExists('');

            expect(result1).toBe(false);
            expect(result2).toBe(false);
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should handle network errors gracefully', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await gistManager.validateGistExists('abc123def456');

            expect(result).toBe(false);
        });
    });

    describe('validateGistStructure', () => {
        it('should return true for gist with valid audiobook structure', async () => {
            const mockGist = {
                files: {
                    'audiobooks.json': {
                        content: JSON.stringify({
                            audiobooks: [],
                            metadata: { version: '1.0' }
                        })
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                status: 200,
                json: () => Promise.resolve(mockGist)
            });

            const result = await gistManager.validateGistStructure('abc123def456');

            expect(result).toBe(true);
        });

        it('should return false for gist without audiobook structure', async () => {
            const mockGist = {
                files: {
                    'other.txt': {
                        content: 'some other content'
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                status: 200,
                json: () => Promise.resolve(mockGist)
            });

            const result = await gistManager.validateGistStructure('abc123def456');

            expect(result).toBe(false);
        });

        it('should return false for empty gist', async () => {
            const mockGist = {
                files: {}
            };

            fetch.mockResolvedValueOnce({
                status: 200,
                json: () => Promise.resolve(mockGist)
            });

            const result = await gistManager.validateGistStructure('abc123def456');

            expect(result).toBe(false);
        });
    });

    describe('getGistInfo', () => {
        it('should return gist information', async () => {
            const mockGist = {
                id: 'abc123def456',
                description: 'My Audiobook Library',
                public: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                files: {
                    'audiobooks.json': { content: '{}' }
                }
            };

            fetch.mockResolvedValueOnce({
                status: 200,
                json: () => Promise.resolve(mockGist)
            });

            const result = await gistManager.getGistInfo('abc123def456');

            expect(result).toEqual({
                id: 'abc123def456',
                description: 'My Audiobook Library',
                public: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                files: ['audiobooks.json']
            });
        });

        it('should return null for non-existent gist', async () => {
            fetch.mockResolvedValueOnce({
                status: 404
            });

            const result = await gistManager.getGistInfo('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('hasValidStoredGist', () => {
        it('should return true if stored gist is valid', async () => {
            localStorageMock.getItem.mockReturnValue('abc123def456');

            const mockGist = {
                public: true,
                files: {
                    'audiobooks.json': { content: '{}' }
                }
            };

            fetch.mockResolvedValueOnce({
                status: 200,
                json: () => Promise.resolve(mockGist)
            });

            const result = await gistManager.hasValidStoredGist();

            expect(result).toBe(true);
        });

        it('should return false if no gist stored', async () => {
            localStorageMock.getItem.mockReturnValue(null);

            const result = await gistManager.hasValidStoredGist();

            expect(result).toBe(false);
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should return false if stored gist is invalid', async () => {
            localStorageMock.getItem.mockReturnValue('invalid-gist');

            fetch.mockResolvedValueOnce({
                status: 404
            });

            const result = await gistManager.hasValidStoredGist();

            expect(result).toBe(false);
        });
    });
});