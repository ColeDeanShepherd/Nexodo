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
3. Click the menu (☰) > "⚙️ Configure Google Drive"
4. Enter your Client ID from step 3
5. (Optional) Click the menu (☰) > "📁 Set Backup Folder"
6. (Optional) Enter a Google Drive folder ID, or leave empty for root
7. Click the menu (☰) > "🔗 Authorize Google Drive"  
8. Click "Allow" in the Google popup
9. Done! Backups are now configured

## Benefits of Client-Side OAuth

✅ **Zero server config** - No environment variables needed
✅ **UI-based setup** - Configure everything through the web interface  
✅ **Secure** - Tokens are handled by Google's secure flow
✅ **No secrets** - No client secrets to manage on the server
✅ **Personal Drive** - Uses your own Google Drive storage
✅ **Persistent config** - Client ID and folder ID saved in browser localStorage
✅ **Flexible folders** - Choose specific folder or use Drive root

## How It Works

1. **Client-side OAuth** - Browser handles Google authentication
2. **Token caching** - Server stores tokens in memory for backups
3. **Automatic backups** - Scheduled backups use cached tokens
4. **No persistence** - Tokens are temporary (re-auth if server restarts)

## Troubleshooting

- **"Popup blocked"** - Allow popups for your domain
- **"Invalid client"** - Make sure your Client ID is correct
- **"Origin not allowed"** - Add your domain to authorized origins
- **"API not enabled"** - Enable Google Drive API in Google Cloud Console

This approach is much simpler than the previous methods!