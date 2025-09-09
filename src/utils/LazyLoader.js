/**
 * LazyLoader utility for implementing intersection observer-based lazy loading
 * Provides better performance for image loading and content rendering
 */
export class LazyLoader {
    constructor(options = {}) {
        this.options = {
            rootMargin: '50px 0px',
            threshold: 0.1,
            ...options
        };

        this.observer = null;
        this.observedElements = new Set();

        this.init();
    }

    /**
     * Initialize the intersection observer
     */
    init() {
        if (!('IntersectionObserver' in window)) {
            // Fallback for browsers without IntersectionObserver support
            this.loadAllImages();
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadElement(entry.target);
                    this.observer.unobserve(entry.target);
                    this.observedElements.delete(entry.target);
                }
            });
        }, this.options);
    }

    /**
     * Observe an element for lazy loading
     * @param {HTMLElement} element - Element to observe
     */
    observe(element) {
        if (!this.observer || this.observedElements.has(element)) {
            return;
        }

        this.observer.observe(element);
        this.observedElements.add(element);
    }

    /**
     * Stop observing an element
     * @param {HTMLElement} element - Element to stop observing
     */
    unobserve(element) {
        if (!this.observer || !this.observedElements.has(element)) {
            return;
        }

        this.observer.unobserve(element);
        this.observedElements.delete(element);
    }

    /**
     * Load an element (typically an image)
     * @param {HTMLElement} element - Element to load
     */
    loadElement(element) {
        if (element.tagName === 'IMG') {
            this.loadImage(element);
        } else {
            // Handle other types of lazy-loaded content
            const lazyImages = element.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => this.loadImage(img));
        }
    }

    /**
     * Load an image element
     * @param {HTMLImageElement} img - Image element to load
     */
    loadImage(img) {
        const src = img.dataset.src || img.src;

        if (!src || img.src === src) {
            return;
        }

        // Create a new image to preload
        const imageLoader = new Image();

        imageLoader.onload = () => {
            img.src = src;
            img.classList.add('fade-in');

            // Remove skeleton loader if present
            const skeleton = img.parentElement?.querySelector('.image-skeleton');
            if (skeleton) {
                skeleton.remove();
            }

            // Dispatch load event
            img.dispatchEvent(new CustomEvent('lazyload', {
                detail: { src }
            }));
        };

        imageLoader.onerror = () => {
            // Handle error - use placeholder
            img.src = '/images/placeholder.svg';
            img.classList.add('fade-in');

            // Remove skeleton loader
            const skeleton = img.parentElement?.querySelector('.image-skeleton');
            if (skeleton) {
                skeleton.remove();
            }

            // Dispatch error event
            img.dispatchEvent(new CustomEvent('lazyerror', {
                detail: { originalSrc: src }
            }));
        };

        imageLoader.src = src;
    }

    /**
     * Fallback method to load all images immediately
     * Used when IntersectionObserver is not supported
     */
    loadAllImages() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => this.loadImage(img));
    }

    /**
     * Disconnect the observer and clean up
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        this.observedElements.clear();
    }

    /**
     * Get the number of elements currently being observed
     * @returns {number} Number of observed elements
     */
    getObservedCount() {
        return this.observedElements.size;
    }
}

// Create a singleton instance for the app
export const lazyLoader = new LazyLoader();