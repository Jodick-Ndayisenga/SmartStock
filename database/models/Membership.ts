// database/models/Membership.ts
import { text, field } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import { BaseModel } from './BaseModel';

export class Membership extends BaseModel {
  static table = 'memberships';

  static associations: Associations = {
    // No children needed
  };

  @text('user_id') userId!: string;
  @text('shop_id') shopId!: string;
  @text('role') role!: string;
  @text('status') status!: string;
  @text('invited_by') invitedBy?: string;
  @field('joined_at') joinedAt!: number;
}