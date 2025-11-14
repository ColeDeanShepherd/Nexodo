# Client-Side Google Drive Setup (Super Easy!)

This new approach handles everything in the web interface - no environment variables needed!

## Step 1: Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

## Step 3: Create OAuth2 Web Client

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in app name: "Nexodo Backup"
   - Add your email as a test user
4. For application type, choose **"Web application"**
5. Add your domain to "Authorized JavaScript origins":
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
6. Click "Create"
7. Copy the **Client ID** (you'll need this for the next step)

## Step 4: Use the App!

1. Start your server: `bun run dev`
2. Login to your REPL
3. (Optional) Click the menu (☰) > "📁 Set Backup Folder"
4. (Optional) Enter a Google Drive folder ID, or leave empty for root
5. Click the menu (☰) > "🔗 Authorize Google Drive"  
6. Click "Allow" in the Google popup
7. Done! Backups are now configured

**Note**: The Google Client ID is now hardcoded in the application, so you don't need to configure it manually.

## Benefits of Client-Side OAuth

✅ **Zero server config** - No environment variables needed
✅ **Hardcoded client ID** - No manual configuration needed  
✅ **Secure** - Tokens are handled by Google's secure flow
✅ **No secrets** - No client secrets to manage on the server
✅ **Personal Drive** - Uses your own Google Drive storage
✅ **Simple setup** - Just authorize and optionally set backup folder
✅ **Flexible folders** - Choose specific folder or use Drive root

## How It Works

1. **Hardcoded client ID** - App-specific client ID is built into the application
2. **Client-side OAuth** - Browser handles Google authentication
3. **Token caching** - Server stores tokens in memory for backups
4. **Automatic backups** - Scheduled backups use cached tokens
5. **No persistence** - Tokens are temporary (re-auth if server restarts)

## Troubleshooting

- **"Popup blocked"** - Allow popups for your domain
- **"Invalid client"** - Make sure your Client ID is correct
- **"Origin not allowed"** - Add your domain to authorized origins
- **"API not enabled"** - Enable Google Drive API in Google Cloud Console

This approach is much simpler than the previous methods!