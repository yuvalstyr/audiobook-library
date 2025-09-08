# GitHub Pages Deployment Guide

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

## Setup Instructions

### 1. Repository Configuration
1. Push your code to a GitHub repository
2. Go to your repository's Settings → Pages
3. Under "Source", select "GitHub Actions"
4. The deployment workflow will automatically trigger on pushes to the `main` branch

### 2. Automatic Deployment
The GitHub Actions workflow (`.github/workflows/deploy.yml`) will:
- Trigger on every push to the `main` branch
- Install dependencies with `npm ci`
- Build the project with `npm run build`
- Deploy the `dist` folder to GitHub Pages

### 3. Manual Deployment
You can also trigger deployment manually:
1. Go to the "Actions" tab in your GitHub repository
2. Select the "Deploy to GitHub Pages" workflow
3. Click "Run workflow" → "Run workflow"

### 4. Accessing Your Site
Once deployed, your site will be available at:
```
https://[your-username].github.io/audiobook-library/
```

### 5. Build Configuration
The project is configured with:
- **Base Path**: `/audiobook-library/` (configured in `vite.config.js`)
- **Output Directory**: `dist/` 
- **Node Environment**: Production builds use the correct base path

### 6. Local Testing
To test the production build locally:
```bash
npm run build
npm run preview
```

### 7. Troubleshooting
- Ensure your repository is public or you have GitHub Pages enabled for private repos
- Check the Actions tab for any build errors
- Verify that the `main` branch contains your latest changes
- Make sure all dependencies are listed in `package.json`

## Workflow Details
The deployment uses the latest GitHub Actions for Pages deployment:
- `actions/checkout@v4`
- `actions/setup-node@v4` 
- `actions/configure-pages@v4`
- `actions/upload-pages-artifact@v3`
- `actions/deploy-pages@v4`

The workflow includes proper permissions and concurrency controls for reliable deployments.