// models/Payment.ts
import { field, relation } from '@nozbe/watermelondb/decorators';
import { BaseModel } from './BaseModel';
import Transaction from './Transaction';
import { CashAccount } from './CashAccount';
import { Relation } from '@nozbe/watermelondb';

export class Payment extends BaseModel {
  static table = 'payments';

  @field('transaction_id') transactionId!: string;
  @field('shop_id') shopId!: string;
  @field('payment_method_id') paymentMethodId!: string;
  @field('cash_account_id') cashAccountId!: string;
  @field('amount') amount!: number;
  @field('payment_date') paymentDate!: number;
  @field('reference_number') referenceNumber?: string;
  @field('notes') notes?: string;
  @field('recorded_by') recordedBy!: string;

  // Relations
  @relation('transactions', 'transaction_id') transaction ?: Relation<Transaction>;
  @relation('cash_accounts', 'cash_account_id') cashAccount !: Relation<CashAccount> ;
}