import { describe, it, expect, beforeEach } from 'vitest';
import { FilterManager } from './FilterManager.js';

describe('FilterManager', () => {
    let filterManager;
    let mockCallback;
    let sampleBooks;

    beforeEach(() => {
        mockCallback = (filteredBooks) => {
            // Mock callback for testing
        };

        filterManager = new FilterManager(mockCallback);

        sampleBooks = [
            {
                id: '1',
                title: 'The Martian',
                author: 'Andy Weir',
                narrator: 'R.C. Bray',
                genres: ['sci-fi', 'next'],
                moods: ['fast-paced', 'technical']
            },
            {
                id: '2',
                title: 'Three Men in a Boat',
                author: 'Jerome K. Jerome',
                narrator: 'Steven Crossley',
                genres: ['done', 'classic'],
                moods: ['funny', 'light']
            },
            {
                id: '3',
                title: 'Gone Girl',
                author: 'Gillian Flynn',
                narrator: 'Julia Whelan',
                genres: ['thriller', 'done'],
                moods: ['dark', 'psychological']
            }
        ];

        filterManager.setAudiobooks(sampleBooks);
    });

    describe('search filtering', () => {
        it('should filter by title', () => {
            const result = filterManager.filterBySearch(sampleBooks, 'martian');
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('The Martian');
        });

        it('should filter by author', () => {
            const result = filterManager.filterBySearch(sampleBooks, 'jerome');
            expect(result).toHaveLength(1);
            expect(result[0].author).toBe('Jerome K. Jerome');
        });

        it('should filter by narrator', () => {
            const result = filterManager.filterBySearch(sampleBooks, 'julia');
            expect(result).toHaveLength(1);
            expect(result[0].narrator).toBe('Julia Whelan');
        });

        it('should be case insensitive', () => {
            const result = filterManager.filterBySearch(sampleBooks, 'MARTIAN');
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('The Martian');
        });

        it('should return all books for empty search', () => {
            const result = filterManager.filterBySearch(sampleBooks, '');
            expect(result).toHaveLength(3);
        });

        it('should return no results for non-matching search', () => {
            const result = filterManager.filterBySearch(sampleBooks, 'nonexistent');
            expect(result).toHaveLength(0);
        });
    });

    describe('category filtering', () => {
        it('should filter by genre', () => {
            const filters = { genres: ['sci-fi'], moods: [] };
            const result = filterManager.filterByCategories(sampleBooks, filters);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('The Martian');
        });

        it('should filter by mood', () => {
            const filters = { genres: [], moods: ['funny'] };
            const result = filterManager.filterByCategories(sampleBooks, filters);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Three Men in a Boat');
        });

        it('should filter by multiple genres', () => {
            const filters = { genres: ['done'], moods: [] };
            const result = filterManager.filterByCategories(sampleBooks, filters);
            expect(result).toHaveLength(2);
            expect(result.map(b => b.title)).toContain('Three Men in a Boat');
            expect(result.map(b => b.title)).toContain('Gone Girl');
        });

        it('should combine genre and mood filters', () => {
            const filters = { genres: ['done'], moods: ['dark'] };
            const result = filterManager.filterByCategories(sampleBooks, filters);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Gone Girl');
        });

        it('should return all books for empty filters', () => {
            const filters = { genres: [], moods: [] };
            const result = filterManager.filterByCategories(sampleBooks, filters);
            expect(result).toHaveLength(3);
        });
    });

    describe('state management', () => {
        it('should track search term', () => {
            filterManager.updateSearch('test search');
            const state = filterManager.getState();
            expect(state.searchTerm).toBe('test search');
        });

        it('should track filter selections', () => {
            const filters = { genres: ['sci-fi'], moods: ['funny'] };
            filterManager.updateFilters(filters);
            const state = filterManager.getState();
            expect(state.filters.genres).toEqual(['sci-fi']);
            expect(state.filters.moods).toEqual(['funny']);
        });

        it('should detect active filters', () => {
            expect(filterManager.hasActiveFilters()).toBe(false);

            filterManager.updateSearch('test');
            expect(filterManager.hasActiveFilters()).toBe(true);

            filterManager.updateSearch('');
            filterManager.updateFilters({ genres: ['sci-fi'], moods: [] });
            expect(filterManager.hasActiveFilters()).toBe(true);
        });

        it('should clear all filters', () => {
            filterManager.updateSearch('test');
            filterManager.updateFilters({ genres: ['sci-fi'], moods: ['funny'] });

            filterManager.clearAll();

            const state = filterManager.getState();
            expect(state.searchTerm).toBe('');
            expect(state.filters.genres).toEqual([]);
            expect(state.filters.moods).toEqual([]);
            expect(filterManager.hasActiveFilters()).toBe(false);
        });
    });

    describe('filter summary', () => {
        it('should show no filters message when empty', () => {
            const summary = filterManager.getFilterSummary();
            expect(summary).toBe('No filters applied');
        });

        it('should show search in summary', () => {
            filterManager.updateSearch('test search');
            const summary = filterManager.getFilterSummary();
            expect(summary).toContain('Search: "test search"');
        });

        it('should show genres in summary', () => {
            filterManager.updateFilters({ genres: ['sci-fi', 'fantasy'], moods: [] });
            const summary = filterManager.getFilterSummary();
            expect(summary).toContain('Genres: sci-fi, fantasy');
        });

        it('should show moods in summary', () => {
            filterManager.updateFilters({ genres: [], moods: ['funny', 'dark'] });
            const summary = filterManager.getFilterSummary();
            expect(summary).toContain('Moods: funny, dark');
        });

        it('should combine multiple filter types in summary', () => {
            filterManager.updateSearch('test');
            filterManager.updateFilters({ genres: ['sci-fi'], moods: ['funny'] });
            const summary = filterManager.getFilterSummary();
            expect(summary).toContain('Search: "test"');
            expect(summary).toContain('Genres: sci-fi');
            expect(summary).toContain('Moods: funny');
        });
    });
});