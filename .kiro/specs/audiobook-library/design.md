# Design Document

## Overview

The audiobook library will be a single-page web application built with modern web technologies. It will feature a responsive card-based gallery layout with filtering capabilities, local data persistence, and a clean, intuitive user interface. The application will be optimized for both desktop and mobile viewing.

## Architecture

### Frontend Architecture
- **Build Tool**: Vite for fast development and optimized production builds
- **Framework**: Vanilla JavaScript with modern ES6+ features for simplicity and performance
- **CSS Framework**: Tailwind CSS for utility-first styling and responsive design
- **Data Storage**: JSON files in version control + localStorage for client-side caching
- **Hosting**: GitHub Pages for free static site hosting
- **Module Structure**: ES6 modules with Vite's native support

### Project Structure
```
audiobook-library/
├── package.json        # Vite and dependencies
├── vite.config.js     # Vite configuration
├── index.html         # Main HTML entry point
├── src/
│   ├── main.js        # Application entry point
│   ├── style.css      # Tailwind imports and custom styles
│   ├── components/
│   │   ├── Gallery.js     # Gallery component
│   │   ├── BookCard.js    # Individual book card
│   │   ├── Filters.js     # Filter sidebar
│   │   ├── BookForm.js    # Add/edit form modal
│   │   └── SearchBar.js   # Search functionality
│   ├── models/
│   │   └── Audiobook.js   # Audiobook data model
│   ├── services/
│   │   ├── DataService.js # JSON file loading
│   │   └── StorageService.js # localStorage caching
│   └── utils/
│       └── helpers.js     # Utility functions
├── public/
│   ├── data/
│   │   └── audiobooks.json # Main data file
│   └── images/
│       └── placeholder.jpg # Default book cover
└── dist/              # Vite build output (for GitHub Pages)
```

## Components and Interfaces

### 1. Audiobook Data Model
```javascript
class Audiobook {
  constructor({
    id,
    title,
    url,
    image,
    author,
    narrator,
    length,
    releaseDate,
    rating,
    price,
    genres = [],
    moods = []
  })
}
```

**Properties:**
- `id`: Unique identifier (UUID)
- `title`: Book title
- `url`: Audible/store URL
- `image`: Cover image URL
- `author`: Author name
- `narrator`: Narrator name(s)
- `length`: Duration (e.g., "6 hrs and 40 mins")
- `releaseDate`: Publication date
- `rating`: 1-5 star rating
- `price`: Price in USD
- `genres`: Array of genre tags
- `moods`: Array of mood descriptors

### 2. Gallery Component
**Responsibilities:**
- Render audiobook cards in responsive grid
- Handle card interactions (hover, click)
- Manage loading states and empty states
- Implement infinite scroll or pagination if needed

**Key Methods:**
- `renderGallery(audiobooks)`: Renders the complete gallery
- `createBookCard(audiobook)`: Creates individual book card HTML
- `updateGallery(filteredBooks)`: Updates display with filtered results

### 3. Filter System
**Responsibilities:**
- Manage genre and mood filter states
- Handle search functionality
- Combine multiple filter criteria
- Provide filter UI components

**Filter Categories:**
- **Genres**: Next, Done, Action, Thriller, Fantasy, Sci-Fi, + custom
- **Moods**: Funny, Fast-paced, Heavy, + custom
- **Search**: Title, author, narrator text search
- **Rating**: Star rating filter
- **Status**: Reading status (next, current, done)

### 4. Form System
**Add/Edit Form Fields:**
- Title (required)
- Author (required)
- Audible URL
- Cover Image URL
- Narrator
- Length
- Release Date
- Rating (1-5 stars)
- Price
- Genre checkboxes
- Mood checkboxes
- Custom genre/mood input

**Validation Rules:**
- Required fields must be filled
- URLs must be valid format
- Rating must be 1-5
- Price must be valid number

### 5. Data Service Layer
**Responsibilities:**
- Load audiobook collection from JSON files
- Cache data in localStorage for performance
- Handle data updates and persistence
- Manage GitHub integration for data updates

**Data Flow:**
1. Load initial data from `/public/data/audiobooks.json`
2. Cache in localStorage for fast subsequent loads
3. For updates: modify localStorage + provide export for manual JSON update
4. GitHub Actions can automate JSON file updates from form submissions

## Data Models

### Audiobook Schema
```json
{
  "id": "uuid-string",
  "title": "Three Men in a Boat",
  "url": "https://www.audible.com/pd/...",
  "image": "https://m.media-amazon.com/images/...",
  "author": "Jerome K. Jerome",
  "narrator": "Steven Crossley",
  "length": "6 hrs and 40 mins",
  "releaseDate": "2011-02-23",
  "rating": 4.5,
  "price": 10.23,
  "genres": ["done", "classic"],
  "moods": ["funny", "light"]
}
```

### Collection Schema
```json
{
  "version": "1.0",
  "lastUpdated": "2025-01-07T10:30:00Z",
  "audiobooks": [...],
  "customGenres": ["biography", "self-help"],
  "customMoods": ["inspiring", "dark"]
}
```

## User Interface Design

### Layout Structure
1. **Header**: Title, search bar, add book button
2. **Filter Sidebar**: Genre and mood filters (collapsible on mobile)
3. **Main Gallery**: Responsive card grid
4. **Book Cards**: Cover image, title, author, rating, tags
5. **Modals**: Add/edit forms, book details

### Responsive Breakpoints (Tailwind)
- **Desktop (xl: 1280px+)**: 5-6 cards per row, sidebar visible
- **Large (lg: 1024px+)**: 4-5 cards per row, sidebar visible  
- **Tablet (md: 768px+)**: 3-4 cards per row, collapsible sidebar
- **Mobile (sm: 640px+)**: 2-3 cards per row, bottom sheet filters
- **Small (< 640px)**: 1-2 cards per row, mobile-first design

### Card Design (Tailwind Classes)
- **Aspect Ratio**: `aspect-[3/4]` (standard book cover ratio)
- **Hover Effects**: `hover:scale-105 hover:shadow-xl transition-transform`
- **Information Overlay**: `absolute inset-0 bg-gradient-to-t from-black/80`
- **Genre Tags**: `bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs`
- **Status Indicators**: `bg-green-500 text-white rounded-full w-6 h-6`

## Error Handling

### Data Validation
- Client-side form validation with real-time feedback
- Graceful handling of malformed URLs
- Image loading fallbacks for broken cover images
- Data sanitization for XSS prevention

### Storage Errors
- JSON file loading failures with fallback to localStorage
- localStorage quota exceeded handling
- Corrupted data recovery from JSON source
- Export functionality for manual JSON updates
- Network errors when loading from GitHub Pages

### Network Errors
- Offline functionality with cached data
- Image loading retry mechanisms
- Graceful degradation for missing resources

## Testing Strategy

### Unit Testing
- Audiobook model validation
- Filter logic correctness
- Storage operations
- Form validation functions

### Integration Testing
- Complete user workflows (add, edit, delete, filter)
- Cross-browser compatibility
- Responsive design testing
- Performance testing with large collections

### User Acceptance Testing
- Gallery browsing experience
- Filter and search functionality
- Mobile usability
- Data persistence across sessions

## Performance Considerations

### Optimization Strategies
- Lazy loading for book cover images
- Virtual scrolling for large collections (1000+ books)
- Debounced search input
- CSS containment for card animations
- Service worker for offline caching

### Memory Management
- Efficient DOM manipulation
- Image cleanup for removed books
- Event listener cleanup
- localStorage size monitoring

## Accessibility

### WCAG Compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management in modals
- Alt text for all images
- ARIA labels for interactive elements

### Inclusive Design
- Scalable text and UI elements
- Color-blind friendly color schemes
- Touch target sizing (44px minimum)
- Reduced motion preferences
#
# Deployment Strategy

### GitHub Pages Setup
- **Repository**: Public GitHub repository for free Pages hosting
- **Build Process**: Vite builds to `/dist` directory
- **GitHub Actions**: Automated deployment on push to main branch
- **Custom Domain**: Optional custom domain configuration

### Development Workflow
1. **Local Development**: `npm run dev` with Vite hot reload
2. **Data Updates**: Edit JSON files directly or use export feature
3. **Build**: `npm run build` creates optimized production bundle
4. **Deploy**: Push to GitHub triggers automatic deployment

### Data Management
- **Version Control**: JSON data files tracked in Git
- **Manual Updates**: Edit `audiobooks.json` directly in repository
- **Bulk Import**: Script to convert CSV/spreadsheet data to JSON
- **Backup**: Git history serves as complete backup system

### Configuration Files

#### package.json
```json
{
  "name": "audiobook-library",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

#### vite.config.js
```javascript
export default {
  base: '/audiobook-library/', // GitHub Pages subdirectory
  build: {
    outDir: 'dist'
  }
}
```

#### GitHub Actions (.github/workflows/deploy.yml)
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```
###
# tailwind.config.js
```javascript
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
```

#### postcss.config.js
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

#### src/style.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .book-card {
    @apply bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105;
  }
  
  .genre-tag {
    @apply px-2 py-1 rounded-full text-xs font-medium;
  }
  
  .btn-primary {
    @apply bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors;
  }
  
  .btn-secondary {
    @apply bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors;
  }
}
```