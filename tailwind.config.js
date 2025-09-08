/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            aspectRatio: {
                'book': '3 / 4',
            },
            colors: {
                'genre': {
                    'action': '#ef4444',
                    'thriller': '#dc2626',
                    'fantasy': '#8b5cf6',
                    'scifi': '#06b6d4',
                    'done': '#10b981',
                    'next': '#f59e0b'
                }
            }
        },
    },
    plugins: [],
}