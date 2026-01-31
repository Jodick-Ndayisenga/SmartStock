// database/models/Setting.ts
import { text, field } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import { BaseModel } from './BaseModel';

export class Setting extends BaseModel {
  static table = 'settings';

  static associations: Associations = {
    // Typically one per shop, no children
  };

  @text('shop_id') shopId!: string;
  @text('language') language!: string;
  @field('backup_enabled') backupEnabled!: boolean;
  @field('sms_alerts_enabled') smsAlertsEnabled!: boolean;
  @field('auto_backup_wifi_only') autoBackupWifiOnly!: boolean;
  @field('week_start_day') weekStartDay!: number;
  @text('currency') currency!: string;
}