import { google } from 'googleapis';
import { KeyValueStore } from './key-value-store';

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export class BackupService {
  private drive: any;
  private tokens: GoogleTokens | null = null;
  private folderId: string | null = null;
  
  constructor(private kvStore: KeyValueStore) {
    console.log('✅ Google Drive backup service initialized (client-side auth)');
  }

  setGoogleTokens(tokens: GoogleTokens, folderId?: string): void {
    this.tokens = tokens;
    this.folderId = folderId || null;
    
    // Create OAuth2 client with tokens
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
    console.log(`✅ Google Drive tokens updated${folderId ? ` (folder: ${folderId})` : ' (root folder)'}`);
  }

  isGoogleAuthConfigured(): boolean {
    return !!this.tokens && !!this.drive;
  }

  getAuthStatus(): { configured: boolean; hasRefreshToken: boolean } {
    return {
      configured: this.isGoogleAuthConfigured(),
      hasRefreshToken: !!(this.tokens?.refresh_token)
    };
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

      // Upload to Google Drive
      const fileMetadata: any = { name: fileName };
      
      // Add folder if specified (from client configuration)
      if (this.folderId) {
        fileMetadata.parents = [this.folderId];
      }

      const media = {
        mimeType: 'application/json',
        body: JSON.stringify(backupContent, null, 2)
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name'
      });

      const location = this.folderId ? `in folder ${this.folderId}` : 'in root drive';
      console.log(`✅ Backup completed successfully: ${response.data.name} (ID: ${response.data.id}) ${location}`);
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  private async getDatabaseValue(): Promise<string | null> {
    return await this.kvStore.get('db');
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