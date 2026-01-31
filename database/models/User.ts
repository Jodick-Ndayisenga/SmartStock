// database/models/User.ts
import { Query } from '@nozbe/watermelondb';
import { text, field, children} from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import { BaseModel } from './BaseModel';
import { Membership } from './Membership';

export class User extends BaseModel {
  static table = 'users';

  static associations: Associations = {
    memberships: { type: 'has_many', foreignKey: 'user_id' },
  };

  @text('firebase_uid') firebaseUid!: string;
  @text('display_name') displayName?: string;
  @text('phone') phone?: string;
  @text('email') email?: string;
  @text("password") password?: string;
  @field('is_owner') isOwner!: boolean;

  // Relations
  @children('memberships') memberships!: Query<Membership>;
}