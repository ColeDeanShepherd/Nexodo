import * as cron from 'node-cron';
import { BackupService } from './backup-service';

export class SchedulerService {
  private backupTask: cron.ScheduledTask | null = null;

  constructor(private backupService: BackupService) {}

  startScheduler(): void {
    // Stop existing scheduler if running
    this.stopScheduler();

    // Schedule backup at midnight every day (00:00)
    // Cron format: second minute hour day month dayOfWeek
    this.backupTask = cron.schedule('0 0 * * *', async () => {
      console.log('🕛 Midnight backup triggered...');
      try {
        await this.backupService.performBackup();
        console.log('✅ Scheduled backup completed');
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error);
      }
    }, {
      timezone: process.env.BACKUP_TIMEZONE || 'UTC'
    });
    console.log(`✅ Backup scheduler started - will run daily at midnight (${process.env.BACKUP_TIMEZONE || 'UTC'})`);
  }

  stopScheduler(): void {
    if (this.backupTask) {
      this.backupTask.stop();
      this.backupTask.destroy();
      this.backupTask = null;
      console.log('🛑 Backup scheduler stopped');
    }
  }

  getSchedulerStatus(): { 
    running: boolean; 
    nextRun: string | null; 
    timezone: string;
  } {
    return {
      running: this.backupTask ? true : false,
      nextRun: this.backupTask ? 'Daily at 00:00' : null,
      timezone: process.env.BACKUP_TIMEZONE || 'UTC'
    };
  }

  // For testing - trigger backup immediately
  async triggerTestBackup(): Promise<{ success: boolean; message: string }> {
    console.log('🧪 Test backup triggered manually...');
    return await this.backupService.triggerManualBackup();
  }
}