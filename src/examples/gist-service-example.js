/**
 * Example usage of GitHubGistService for audiobook data persistence
 * This demonstrates how to use the service for reading and creating gists
 */

import GitHubGistService from '../services/GitHubGistService.js';

// Example audiobook data structure
const sampleAudiobookData = {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    audiobooks: [
        {
            id: 'sample-1',
            title: 'The Hobbit',
            author: 'J.R.R. Tolkien',
            narrator: 'Rob Inglis',
            genres: ['fantasy', 'adventure'],
            moods: ['whimsical', 'epic'],
            rating: 4.8,
            length: '11h 5m',
            price: '$14.95',
            imageUrl: 'https://example.com/hobbit.jpg',
            audibleUrl: 'https://example.com/hobbit',
            releaseDate: '1937-09-21',
            dateAdded: new Date().toISOString()
        }
    ],
    customGenres: ['epic-fantasy'],
    customMoods: ['whimsical']
};

/**
 * Example: Create a new gist with audiobook data
 */
async function createNewGist() {
    const gistService = new GitHubGistService();

    try {
        console.log('Creating new gist with audiobook data...');
        const gistId = await gistService.createGist(sampleAudiobookData, 'My Audiobook Library');
        console.log(`✅ Gist created successfully! ID: ${gistId}`);
        console.log(`🔗 View at: https://gist.github.com/${gistId}`);
        return gistId;
    } catch (error) {
        console.error('❌ Failed to create gist:', error.message);
        throw error;
    }
}

/**
 * Example: Read data from an existing public gist
 */
async function readFromGist(gistId) {
    const gistService = new GitHubGistService();

    try {
        console.log(`Reading data from gist: ${gistId}`);

        // First check if gist exists
        const exists = await gistService.gistExists(gistId);
        if (!exists) {
            throw new Error('Gist not found or not public');
        }

        // Get metadata
        const metadata = await gistService.getGistMetadata(gistId);
        console.log('📋 Gist metadata:', {
            description: metadata.description,
            created: new Date(metadata.created_at).toLocaleDateString(),
            updated: new Date(metadata.updated_at).toLocaleDateString(),
            hasAudiobookData: metadata.hasAudiobookData
        });

        // Read the actual data
        const data = await gistService.readGist(gistId);
        console.log(`✅ Successfully loaded ${data.audiobooks.length} audiobooks`);
        console.log('📚 First book:', data.audiobooks[0]?.title || 'No books found');

        return data;
    } catch (error) {
        console.error('❌ Failed to read gist:', error.message);
        throw error;
    }
}

/**
 * Example: Update an existing gist (requires ownership)
 */
async function updateGist(gistId, newData) {
    const gistService = new GitHubGistService();

    try {
        console.log(`Updating gist: ${gistId}`);
        await gistService.updateGist(gistId, newData);
        console.log('✅ Gist updated successfully!');
    } catch (error) {
        console.error('❌ Failed to update gist:', error.message);
        console.log('💡 Note: You can only update gists you own. Consider creating a new gist instead.');
        throw error;
    }
}

/**
 * Example: Complete workflow - create, read, and demonstrate error handling
 */
async function demonstrateGistWorkflow() {
    console.log('🚀 Starting GitHub Gist Service demonstration...\n');

    try {
        // Step 1: Create a new gist
        const gistId = await createNewGist();
        console.log('');

        // Step 2: Read back the data
        await readFromGist(gistId);
        console.log('');

        // Step 3: Demonstrate error handling
        console.log('🧪 Testing error handling...');
        try {
            await readFromGist('invalid-gist-id');
        } catch (error) {
            console.log('✅ Error handling works:', error.message);
        }

        console.log('\n🎉 Demonstration complete!');
        console.log(`📝 Your gist ID: ${gistId}`);
        console.log('💡 You can use this ID to access your data from any device');

    } catch (error) {
        console.error('❌ Demonstration failed:', error.message);
    }
}

// Export functions for use in other modules
export {
    createNewGist,
    readFromGist,
    updateGist,
    demonstrateGistWorkflow,
    sampleAudiobookData
};

// Run demonstration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    demonstrateGistWorkflow();
}