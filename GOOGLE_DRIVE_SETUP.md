# Google Drive Backup Setup

This guide explains how to set up automated Google Drive backups for your Nexodo server.

## Prerequisites

1. A Google Cloud Platform account
2. Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

## Step 3: Create a Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - Name: `nexodo-backup-service`
   - Description: `Service account for automated database backups`
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

## Step 4: Generate Service Account Key

1. In the "Credentials" page, find your service account
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" > "Create New Key"
5. Choose "JSON" format and click "Create"
6. The JSON file will download automatically - keep it secure!

## Step 5: Set Up Google Drive Folder (REQUIRED)

**Important**: Service accounts don't have personal Google Drive storage, so you MUST create a shared folder.

1. In Google Drive, create a folder for your backups (e.g., "Nexodo Backups")
2. Right-click the folder and choose "Share"
3. Share the folder with your service account email (from step 3)
4. Give it "Editor" permissions
5. Copy the folder ID from the URL (the part after `/folders/`)
6. **This folder ID is required** - the backup will fail without it

## Step 6: Configure Environment Variables

Add these variables to your `.env` file:

```env
# Required: Service account JSON key (entire JSON as one line)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id",...}

# Required: Specific folder ID (service accounts need a shared folder)
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here

# Optional: Timezone for backup schedule (default: UTC)
BACKUP_TIMEZONE=America/New_York
```

### Important Notes:

- The `GOOGLE_SERVICE_ACCOUNT_KEY` should be the entire JSON file content as a single line string
- Remove all line breaks and format it as a single line
- Be very careful with the private key formatting - it should include `\n` for line breaks

## Step 7: Deploy and Test

1. Deploy your application with the new environment variables
2. Test the backup manually by calling the `/api/backup/trigger` endpoint
3. Check the backup status with `/api/backup/status`

## API Endpoints

### Manual Backup Trigger
```http
POST /api/backup/trigger
Authorization: Bearer your_jwt_token
```

### Backup Status
```http
GET /api/backup/status
Authorization: Bearer your_jwt_token
```

## Backup Schedule

- Backups run automatically every day at midnight (00:00) in the configured timezone
- Each backup creates a JSON file with timestamp in the filename
- Files are uploaded to the root of Google Drive or to the specified folder

## Backup File Format

```json
{
  "timestamp": "2024-01-15T00:00:00.000Z",
  "data": "your_database_value_here",
  "metadata": {
    "backupType": "automated",
    "source": "railway-server"
  }
}
```

## Troubleshooting

### Common Issues:

1. **"Google Drive backup disabled"** - Check that `GOOGLE_SERVICE_ACCOUNT_KEY` is set correctly
2. **"Invalid credentials"** - Verify the service account JSON is properly formatted
3. **"Service Accounts do not have storage quota"** - You MUST set `GOOGLE_DRIVE_FOLDER_ID` to a folder that has been shared with your service account
4. **"GOOGLE_DRIVE_FOLDER_ID is required"** - Create a folder in Google Drive, share it with your service account, and set the folder ID
5. **"Insufficient permissions"** - Make sure the service account has "Editor" access to the shared folder
6. **"API not enabled"** - Ensure Google Drive API is enabled in your Google Cloud project

### Testing

Use the manual backup endpoint to test your configuration:

```bash
curl -X POST http://localhost:3000/api/backup/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security Notes

- Keep your service account key secure and never commit it to version control
- Use environment variables or secure secret management in production
- Consider rotating service account keys periodically
- Monitor API usage and quotas in Google Cloud Console