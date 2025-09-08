#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 Verifying GitHub Pages build configuration...\n');

// Check if dist directory exists
if (!existsSync('dist')) {
    console.error('❌ dist directory not found. Run "npm run build" first.');
    process.exit(1);
}

// Check required files
const requiredFiles = [
    'dist/index.html',
    'dist/data/audiobooks.json',
    'dist/images/placeholder.svg'
];

let allFilesExist = true;
for (const file of requiredFiles) {
    if (existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.error(`❌ ${file} - Missing`);
        allFilesExist = false;
    }
}

// Check if index.html has correct base path
try {
    const indexHtml = readFileSync('dist/index.html', 'utf8');
    if (indexHtml.includes('/audiobook-library/assets/')) {
        console.log('✅ Base path correctly configured in index.html');
    } else {
        console.error('❌ Base path not found in index.html');
        allFilesExist = false;
    }
} catch (error) {
    console.error('❌ Could not read index.html');
    allFilesExist = false;
}

// Check GitHub Actions workflow
if (existsSync('.github/workflows/deploy.yml')) {
    console.log('✅ GitHub Actions deployment workflow exists');
} else {
    console.error('❌ GitHub Actions workflow missing');
    allFilesExist = false;
}

// Check vite.config.js
if (existsSync('vite.config.js')) {
    try {
        const viteConfig = readFileSync('vite.config.js', 'utf8');
        if (viteConfig.includes('/audiobook-library/')) {
            console.log('✅ Vite config has correct base path');
        } else {
            console.error('❌ Vite config missing base path');
            allFilesExist = false;
        }
    } catch (error) {
        console.error('❌ Could not read vite.config.js');
        allFilesExist = false;
    }
} else {
    console.error('❌ vite.config.js missing');
    allFilesExist = false;
}

console.log('\n' + '='.repeat(50));
if (allFilesExist) {
    console.log('🎉 All checks passed! Ready for GitHub Pages deployment.');
    console.log('\nNext steps:');
    console.log('1. Push to GitHub repository');
    console.log('2. Enable GitHub Pages in repository settings');
    console.log('3. Select "GitHub Actions" as the source');
    console.log('4. Your site will be available at: https://[username].github.io/audiobook-library/');
} else {
    console.log('❌ Some checks failed. Please fix the issues above.');
    process.exit(1);
}