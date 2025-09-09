/**
 * Performance utilities for debouncing, throttling, and optimization
 */

/**
 * Debounce function calls to improve performance
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to execute immediately on first call
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };

        const callNow = immediate && !timeout;

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) func.apply(this, args);
    };
}

/**
 * Throttle function calls to limit execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;

    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Request animation frame wrapper for smooth animations
 * @param {Function} callback - Callback to execute
 * @returns {number} Animation frame ID
 */
export function requestAnimationFrame(callback) {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) { window.setTimeout(callback, 1000 / 60); };
}

/**
 * Cancel animation frame
 * @param {number} id - Animation frame ID to cancel
 */
export function cancelAnimationFrame(id) {
    const cancel = window.cancelAnimationFrame ||
        window.webkitCancelAnimationFrame ||
        window.mozCancelAnimationFrame ||
        window.oCancelAnimationFrame ||
        window.msCancelAnimationFrame ||
        clearTimeout;

    cancel(id);
}

/**
 * Batch DOM operations for better performance
 * @param {Function} callback - Function containing DOM operations
 */
export function batchDOMOperations(callback) {
    const raf = requestAnimationFrame(() => {
        callback();
    });

    return raf;
}

/**
 * Measure performance of a function
 * @param {Function} func - Function to measure
 * @param {string} label - Label for the measurement
 * @returns {*} Function result
 */
export function measurePerformance(func, label = 'Operation') {
    const start = performance.now();
    const result = func();
    const end = performance.now();

    console.log(`${label} took ${(end - start).toFixed(2)} milliseconds`);

    return result;
}

/**
 * Create a memoized version of a function for caching results
 * @param {Function} func - Function to memoize
 * @param {Function} keyGenerator - Optional key generator function
 * @returns {Function} Memoized function
 */
export function memoize(func, keyGenerator) {
    const cache = new Map();

    return function memoizedFunction(...args) {
        const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key);
        }

        const result = func.apply(this, args);
        cache.set(key, result);

        return result;
    };
}

/**
 * Check if the user prefers reduced motion
 * @returns {boolean} True if user prefers reduced motion
 */
export function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get optimal animation duration based on user preferences
 * @param {number} defaultDuration - Default duration in milliseconds
 * @returns {number} Optimal duration
 */
export function getOptimalAnimationDuration(defaultDuration = 300) {
    return prefersReducedMotion() ? 0 : defaultDuration;
}

/**
 * Lazy load a module dynamically
 * @param {Function} importFunction - Dynamic import function
 * @returns {Promise} Promise resolving to the module
 */
export async function lazyLoadModule(importFunction) {
    try {
        const module = await importFunction();
        return module;
    } catch (error) {
        console.error('Failed to lazy load module:', error);
        throw error;
    }
}

/**
 * Preload critical resources
 * @param {string[]} urls - Array of URLs to preload
 * @param {string} as - Resource type (image, script, style, etc.)
 */
export function preloadResources(urls, as = 'image') {
    urls.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = url;
        link.as = as;
        document.head.appendChild(link);
    });
}

/**
 * Optimize images by creating responsive versions
 * @param {string} src - Original image source
 * @param {number[]} sizes - Array of sizes to generate
 * @returns {string} Srcset string
 */
export function generateResponsiveImageSrcset(src, sizes = [400, 800, 1200]) {
    // This is a placeholder - in a real app you'd have a service to generate different sizes
    return sizes.map(size => `${src}?w=${size} ${size}w`).join(', ');
}

/**
 * Check if an element is in the viewport
 * @param {HTMLElement} element - Element to check
 * @param {number} threshold - Threshold percentage (0-1)
 * @returns {boolean} True if element is in viewport
 */
export function isInViewport(element, threshold = 0) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    const verticalThreshold = windowHeight * threshold;
    const horizontalThreshold = windowWidth * threshold;

    return (
        rect.top >= -verticalThreshold &&
        rect.left >= -horizontalThreshold &&
        rect.bottom <= windowHeight + verticalThreshold &&
        rect.right <= windowWidth + horizontalThreshold
    );
}