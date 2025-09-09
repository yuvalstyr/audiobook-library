# Audiobook Library - Data Persistence Manual

## Overview

Your audiobook library now supports cross-device data synchronization using GitHub Gists. This means you can access the same book collection from your Mac, phone, tablet, or any other device.

## How It Works

- **Public GitHub Gist**: Your audiobook data is stored in a public GitHub Gist (a simple file sharing service)
- **Gist ID**: Each collection has a unique ID (like `abc123def456`) that you share between devices
- **Automatic Sync**: Changes sync across devices every 30 seconds
- **No Account Required**: Works without needing a GitHub account

## First Time Setup

### Step 1: Initial Setup on Your First Device

1. **Open your audiobook library app**
2. **Setup wizard should appear automatically** (if this is your first time)
3. **Choose one of these options**:
   - **"Create New Collection"** - Start fresh with a new gist
   - **"Connect to Existing"** - Use an existing gist ID from another device

### Step 2: Creating a New Collection

1. **Click "Create New Collection"**
2. **The app will**:
   - Create a new public GitHub Gist
   - Generate a unique Gist ID (like `abc123def456`)
   - Show you the Gist ID to save
3. **Save your Gist ID** - you'll need this for other devices

### Step 3: Connecting to Existing Collection

1. **Click "Connect to Existing Collection"**
2. **Enter the Gist ID** from your other device
3. **Click "Connect"**
4. **Your audiobooks will load** from the shared collection

## Adding More Devices

### On Each New Device:

1. **Open the audiobook library app**
2. **When the setup wizard appears, click "Connect to Existing Collection"**
3. **Enter the same Gist ID** you saved from your first device
4. **Click "Connect"**
5. **Your complete audiobook collection will appear**

## Daily Usage

### Adding Books
- **Add books normally** - they'll automatically sync to all devices
- **Changes appear on other devices** within 30 seconds

### Editing Books
- **Edit any book** - changes sync automatically
- **If you edit the same book on multiple devices**, you'll get a conflict resolution dialog

### Deleting Books
- **Delete books normally** - they'll be removed from all devices

## Sync Status Indicators

Look for these indicators in your app:

- **🟢 Synced** - All changes are saved and synced
- **🟡 Syncing** - Currently uploading/downloading changes
- **🔴 Offline** - No internet connection, changes saved locally
- **⚠️ Conflict** - Same book edited on multiple devices

## Managing Your Data

### Settings Panel

Access the settings panel to:
- **View your current Gist ID**
- **Change to a different Gist ID**
- **Export your data as backup**
- **Import data from a file**
- **Clear all data**

### Export Your Data

1. **Open Settings**
2. **Click "Export Data"**
3. **Download the JSON file** - this is your complete backup

### Import Data

1. **Open Settings**
2. **Click "Import Data"**
3. **Select your JSON backup file**
4. **Choose how to handle conflicts** (replace, merge, etc.)

### Clear All Data

1. **Open Settings**
2. **Click "Clear All Data"**
3. **Confirm the action** (this removes data from both local device and the gist)

## Troubleshooting

### Setup Issues

**Problem**: Setup wizard doesn't appear
- **Solution**: Check if you already have a Gist ID saved. Go to Settings to change it.

**Problem**: "Invalid Gist ID" error
- **Solution**: Double-check the Gist ID for typos. It should be a long string like `abc123def456`

**Problem**: Can't create new gist
- **Solution**: Check your internet connection. GitHub might be temporarily unavailable.

### Sync Issues

**Problem**: Changes not appearing on other devices
- **Solution**: 
  - Wait up to 30 seconds for automatic sync
  - Check internet connection on both devices
  - Look for sync status indicators

**Problem**: "Sync conflict" dialog appears
- **Solution**: 
  - Choose which version to keep (yours or the other device's)
  - Or manually merge the changes
  - This happens when the same book is edited on multiple devices

**Problem**: App shows "Offline" status
- **Solution**: 
  - Check internet connection
  - Changes are saved locally and will sync when connection returns

### Data Issues

**Problem**: Lost all my books
- **Solution**: 
  - Check if you're connected to the right Gist ID in Settings
  - Try importing from a backup if you have one
  - Check if the gist still exists at `https://gist.github.com/YOUR_GIST_ID`

**Problem**: Duplicate books appearing
- **Solution**: 
  - This can happen during sync conflicts
  - Use the "Clear Duplicates" feature in Settings
  - Or manually delete the duplicates

## Advanced Features

### Sharing Your Collection

Since your gist is public, you can share your book collection:
1. **Share your Gist ID** with friends
2. **They can view your collection** (read-only unless they use the same ID in the app)
3. **View online** at `https://gist.github.com/YOUR_GIST_ID`

### Multiple Collections

You can maintain separate collections:
1. **Use different Gist IDs** for different collections (work books, personal books, etc.)
2. **Switch between collections** in Settings
3. **Export/import** to move books between collections

### Backup Strategy

**Recommended backup approach**:
1. **Export your data monthly** as a JSON file
2. **Save the Gist ID** in multiple places (notes app, email to yourself)
3. **Test the backup** by importing it on another device

## Privacy and Security

### What's Public
- **Your audiobook list** is publicly viewable if someone has your Gist ID
- **No personal information** is stored (just book titles, authors, etc.)
- **Gist ID is hard to guess** but not secret

### What's Private
- **Your Gist ID** - only people you share it with can access your collection
- **No account required** - no personal information tied to GitHub

### Data Ownership
- **You own the data** - it's stored in a public gist that you can access directly
- **No vendor lock-in** - you can export and use your data anywhere
- **GitHub reliability** - backed by GitHub's infrastructure

## Getting Help

### Check These First
1. **Internet connection** - most issues are connectivity related
2. **Gist ID accuracy** - make sure it's entered correctly
3. **Browser console** - look for error messages (F12 → Console)

### Common Error Messages

**"Rate limited"**: Too many requests to GitHub. Wait a few minutes.
**"Gist not found"**: Check your Gist ID for typos.
**"Network error"**: Check internet connection.
**"Sync conflict"**: Same data edited on multiple devices - choose which to keep.

### Still Need Help?
- **Check the browser console** for detailed error messages
- **Try exporting your data** as a backup before troubleshooting
- **Test with a new gist** to isolate the issue