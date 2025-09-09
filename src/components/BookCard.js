import { lazyLoader } from '../utils/LazyLoader.js';

export class BookCard {
    constructor(audiobook) {
        this.audiobook = audiobook;
        this.element = null;
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = 'book-card group cursor-pointer';
        this.element.setAttribute('data-book-id', this.audiobook.id);

        this.element.innerHTML = `
            <div class="relative aspect-book overflow-hidden bg-gray-100">
                <img 
                    data-src="${this.audiobook.image}"
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E"
                    alt="Cover of ${this.escapeHtml(this.audiobook.title)}"
                    class="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                />
                <div class="image-skeleton absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse">
                    <div class="flex items-center justify-center h-full">
                        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                    </div>
                </div>
                
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div class="absolute top-2 left-2">
                        <button class="edit-btn bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors backdrop-blur-sm" 
                                title="Edit book" aria-label="Edit book">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <div class="space-y-2">
                            <div class="flex items-center space-x-1">
                                ${this.renderStars(this.audiobook.rating)}
                                <span class="text-sm ml-2">${this.audiobook.rating}</span>
                            </div>
                            
                            <div class="flex justify-between items-center text-sm">
                                <span>${this.audiobook.length}</span>
                                <span class="font-semibold">${this.audiobook.price}</span>
                            </div>
                            
                            <div class="text-sm opacity-90">
                                Narrated by ${this.escapeHtml(this.audiobook.narrator)}
                            </div>
                        </div>
                    </div>
                </div>

                ${this.renderStatusIndicator()}
            </div>

            <div class="p-4">
                <h3 class="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 leading-tight">
                    ${this.escapeHtml(this.audiobook.title)}
                </h3>
                <p class="text-gray-600 text-sm mb-3 line-clamp-1">
                    by ${this.escapeHtml(this.audiobook.author)}
                </p>
                
                <div class="space-y-2">
                    ${this.renderGenreTags()}
                    ${this.renderMoodTags()}
                </div>
            </div>
        `;

        this.element.addEventListener('click', (e) => this.handleClick(e));

        const editBtn = this.element.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => this.handleEditClick(e));
        }

        // Set up lazy loading for the image
        const img = this.element.querySelector('img');
        if (img) {
            lazyLoader.observe(img);
        }

        return this.element;
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHtml = '';

        for (let i = 0; i < fullStars; i++) {
            starsHtml += '<svg class="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
        }

        if (hasHalfStar) {
            starsHtml += '<svg class="w-4 h-4 text-yellow-400" viewBox="0 0 20 20"><defs><linearGradient id="half"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><path fill="url(#half)" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
        }

        for (let i = 0; i < emptyStars; i++) {
            starsHtml += '<svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 20 20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
        }

        return starsHtml;
    }

    renderStatusIndicator() {
        const statusGenres = ['next', 'done'];
        const status = this.audiobook.genres.find(genre => statusGenres.includes(genre));

        if (!status) return '';

        const statusConfig = {
            'next': { color: 'bg-orange-500', text: 'Next' },
            'done': { color: 'bg-green-500', text: 'Done' }
        };

        const config = statusConfig[status];

        return `
            <div class="absolute top-2 right-2 ${config.color} text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                ${config.text}
            </div>
        `;
    }

    renderGenreTags() {
        const displayGenres = this.audiobook.genres.filter(genre => !['next', 'done'].includes(genre));

        if (displayGenres.length === 0) return '';

        const genreColors = {
            'action': 'bg-red-100 text-red-800',
            'thriller': 'bg-red-200 text-red-900',
            'fantasy': 'bg-purple-100 text-purple-800',
            'sci-fi': 'bg-blue-100 text-blue-800',
            'classic': 'bg-amber-100 text-amber-800'
        };

        const genreTags = displayGenres.slice(0, 3).map(genre => {
            const colorClass = genreColors[genre] || 'bg-gray-100 text-gray-800';
            return `<span class="genre-tag ${colorClass}">${this.escapeHtml(genre)}</span>`;
        }).join('');

        return `<div class="flex flex-wrap gap-1">${genreTags}</div>`;
    }

    renderMoodTags() {
        if (this.audiobook.moods.length === 0) return '';

        const moodTags = this.audiobook.moods.slice(0, 2).map(mood =>
            `<span class="genre-tag bg-indigo-100 text-indigo-800">${this.escapeHtml(mood)}</span>`
        ).join('');

        return `<div class="flex flex-wrap gap-1 mt-1">${moodTags}</div>`;
    }

    handleClick(event) {
        if (event.target.closest('.edit-btn')) {
            return;
        }

        const customEvent = new CustomEvent('bookSelected', {
            detail: { audiobook: this.audiobook },
            bubbles: true
        });
        this.element.dispatchEvent(customEvent);
    }

    handleEditClick(event) {
        event.stopPropagation();

        const customEvent = new CustomEvent('editBook', {
            detail: { audiobook: this.audiobook },
            bubbles: true
        });
        this.element.dispatchEvent(customEvent);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    update(audiobook) {
        this.audiobook = audiobook;
        if (this.element && this.element.parentNode) {
            const parent = this.element.parentNode;
            const newElement = this.render();
            try {
                parent.replaceChild(newElement, this.element);
                this.element = newElement;
            } catch (error) {
                console.error('Failed to update book card:', error);
                parent.appendChild(newElement);
                this.element = newElement;
            }
        }
    }

    destroy() {
        if (this.element) {
            // Clean up lazy loading observer
            const img = this.element.querySelector('img');
            if (img) {
                lazyLoader.unobserve(img);
            }

            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }
        this.element = null;
    }
}