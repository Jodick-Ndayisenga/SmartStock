// database/models/Contact.ts
import { text, field } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import { BaseModel } from './BaseModel';

export class Contact extends BaseModel {
  static table = 'contacts';

  static associations: Associations = {
    // No children needed for MVP
  };

  @text('shop_id') shopId!: string;
  @text('name') name!: string;
  @text('phone') phone!: string;
  @text('role') role!: string;
  @text('email') email?: string;
  @text('address') address?: string;
  @field('is_default_alert_contact') isDefaultAlertContact!: boolean;
}