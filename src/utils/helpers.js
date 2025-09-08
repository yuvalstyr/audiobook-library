// Utility functions for audiobook library

// Generate unique ID for audiobooks
export function generateId() {
    return 'audiobook_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Validate URL format
export function validateUrl(url) {
    if (!url) return true; // Optional field
    try {
        const urlObj = new URL(url);
        // Only allow http and https protocols
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

// Validate rating (1-5 scale)
export function validateRating(rating) {
    const num = parseFloat(rating);
    return !isNaN(num) && num >= 1 && num <= 5;
}

// Validate price (positive number)
export function validatePrice(price) {
    const num = parseFloat(price);
    return !isNaN(num) && num >= 0;
}

// Format duration string
export function formatDuration(minutes) {
    if (!minutes || isNaN(minutes)) return '';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
        return `${mins} mins`;
    } else if (mins === 0) {
        return `${hours} hrs`;
    } else {
        return `${hours} hrs and ${mins} mins`;
    }
}

// Parse duration string to minutes
export function parseDuration(durationString) {
    if (!durationString) return 0;

    const hoursMatch = durationString.match(/(\d+)\s*hrs?/);
    const minsMatch = durationString.match(/(\d+)\s*mins?/);

    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1]) : 0;

    return hours * 60 + mins;
}

// Sanitize string for safe HTML output
export function sanitizeString(str) {
    if (!str) return '';
    return str.replace(/[<>&"']/g, function (match) {
        const escapeMap = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#x27;'
        };
        return escapeMap[match];
    });
}

// Debounce function for search input
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}