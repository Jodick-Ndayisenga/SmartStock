// models/CashAccount.ts
import { field } from '@nozbe/watermelondb/decorators';
import { BaseModel } from './BaseModel';

export class CashAccount extends BaseModel {
  static table = 'cash_accounts';

  static associations = {
    payments: { type: 'has_many', foreignKey: 'cash_account_id' },
    account_transactions: { type: 'has_many', foreignKey: 'cash_account_id' },
  } as const;

  @field('shop_id') shopId!: string; // ← Fixed: added !
  @field('name') name!: string;
  @field('type') type!: 'cash' | 'bank_account' | 'mobile_money' | 'credit_card' | 'petty_cash';
  @field('account_number') accountNumber?: string;
  @field('bank_name') bankName?: string;
  @field('current_balance') currentBalance!: number;
  @field('opening_balance') openingBalance!: number;
  @field('currency') currency!: string;
  @field('is_active') isActive!: boolean;
  @field('is_default') isDefault!: boolean;
  @field('notes') notes?: string;
}