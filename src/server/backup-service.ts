import { google } from 'googleapis';
import { Pool } from 'pg';

export class BackupService {
  private drive: any;
  
  constructor(private pool: Pool) {
    this.initializeGoogleDrive();
  }

  private initializeGoogleDrive() {
    try {
      // Parse the service account JSON from environment variable
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        console.warn('Google Drive backup disabled: GOOGLE_SERVICE_ACCOUNT_KEY not set');
        return;
      }

      const credentials = JSON.parse(serviceAccountKey);

      // Create JWT auth client
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      // Initialize Google Drive API
      this.drive = google.drive({ version: 'v3', auth });
      console.log('✅ Google Drive backup service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive:', error);
    }
  }

  async performBackup(): Promise<void> {
    if (!this.drive) {
      console.log('⚠️ Google Drive not configured, skipping backup');
      return;
    }

    try {
      console.log('🔄 Starting database backup...');

      // Get the database value
      const dbValue = await this.getDatabaseValue();
      if (!dbValue) {
        console.log('⚠️ No database value found, skipping backup');
        return;
      }

      // Create backup content
      const timestamp = new Date().toISOString();
      const backupContent = {
        timestamp,
        data: dbValue,
        metadata: {
          backupType: 'automated',
          source: 'railway-server'
        }
      };

      // Create file name with timestamp
      const fileName = `nexodo-backup-${timestamp.split('T')[0]}.json`;

      // Check if folder ID is provided (required for service accounts)
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      if (!folderId) {
        throw new Error('GOOGLE_DRIVE_FOLDER_ID is required for service account backups. Please create a shared folder and share it with your service account.');
      }

      // Upload to Google Drive
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      };

      const media = {
        mimeType: 'application/json',
        body: JSON.stringify(backupContent, null, 2)
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name'
      });

      console.log(`✅ Backup completed successfully: ${response.data.name} (ID: ${response.data.id})`);
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  private async getDatabaseValue(): Promise<string | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT value FROM key_value_store WHERE key = $1',
        ['db']
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].value;
    } finally {
      client.release();
    }
  }

  // Manual backup method for testing
  async triggerManualBackup(): Promise<{ success: boolean; message: string }> {
    try {
      await this.performBackup();
      return { success: true, message: 'Backup completed successfully' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Backup failed: ${message}` };
    }
  }
}