// database/models/Shop.ts

import { Query } from '@nozbe/watermelondb'
import { text, children, field } from '@nozbe/watermelondb/decorators'
import { Associations } from '@nozbe/watermelondb/Model'
import { BaseModel } from './BaseModel'

import { Product } from './Product'
import { StockMovement } from './StockMovement'
import { Contact } from './Contact'
import { Setting } from './Setting'
import { Membership } from './Membership'

// --- Associations ---
const shopAssociations = {
  products: { type: 'has_many' as const, foreignKey: 'shop_id' as const },
  stock_movements: { type: 'has_many' as const, foreignKey: 'shop_id' as const },
  contacts: { type: 'has_many' as const, foreignKey: 'shop_id' as const },
  settings: { type: 'has_many' as const, foreignKey: 'shop_id' as const },
  memberships: { type: 'has_many' as const, foreignKey: 'shop_id' as const },
} satisfies Associations

export class Shop extends BaseModel {
  static table = 'shops'
  static associations = shopAssociations

  // Basic fields
  @text('name') name!: string
  @text('shopId') shopId!: string
  @text('owner_id') ownerId!: string
  @text('location') location?: string
  @text('phone') phone?: string
  @text('branch_code') branchCode?: string

  // Block fields
  @field('is_blocked') isBlocked!: boolean | null
  @text('blocked_reason') blockedReason?: string
  @field('blocked_at') blockedAt?: number | null

  // Relations
  @children('products') products!: Query<Product>
  @children('stock_movements') stockMovements!: Query<StockMovement>
  @children('contacts') contacts!: Query<Contact>
  @children('settings') settings!: Query<Setting>
  @children('memberships') memberships!: Query<Membership>

  get displayName(): string {
    return `${this.name}${this.branchCode ? ` - ${this.branchCode}` : ''}`
  }
}
