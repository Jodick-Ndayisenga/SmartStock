// database/models/BaseModel.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class BaseModel extends Model {
  // Sync fields with defaults
  @field('_tableStatus') _tableStatus!: string;
  @field('_lastSyncChanged') _lastSyncChanged!: number;
  @field('server_id') serverId?: string;
  @field('last_sync_at') lastSyncAt?: number;

  // Timestamps
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  // Default values helper
  protected setDefaults() {
    const now = Date.now();
    if (!this._tableStatus) this._tableStatus = 'synced';
    if (!this._lastSyncChanged) this._lastSyncChanged = now;
    if (!this.createdAt) this.createdAt = new Date(now);
    if (!this.updatedAt) this.updatedAt = new Date(now);
  }

  // Sync methods
  async markAsCreated() {
    return this.update(record => {
      record._tableStatus = 'created';
      record._lastSyncChanged = Date.now();
      record.updatedAt = new Date();
    });
  }

  async markAsUpdated() {
    return this.update(record => {
      record._tableStatus = 'updated';
      record._lastSyncChanged = Date.now();
      record.updatedAt = new Date();
    });
  }

  async markAsDeleted(): Promise<void> {
    await this.update(record => {
        record._tableStatus = 'deleted';
        record._lastSyncChanged = Date.now();
        record.updatedAt = new Date();
    });
    }

  async markAsSynced() {
    return this.update(record => {
      record._tableStatus = 'synced';
      record.lastSyncAt = Date.now();
      record.updatedAt = new Date();
    });
  }
}