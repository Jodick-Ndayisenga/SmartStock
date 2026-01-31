// models/AccountTransaction.ts
import { field, relation } from '@nozbe/watermelondb/decorators';
import { BaseModel } from './BaseModel';
import { CashAccount } from './CashAccount';
import { Relation } from '@nozbe/watermelondb';
import Transaction from './Transaction';
import { Payment } from './Payment';

export class AccountTransaction extends BaseModel {
  static table = 'account_transactions';

  @field('shop_id') shopId!: string;
  @field('cash_account_id') cashAccountId!: string;
  @field('transaction_id') transactionId?: string;
  @field('payment_id') paymentId?: string;
  @field('type') type!: string;
  @field('amount') amount!: number;
  @field('balance_before') balanceBefore!: number;
  @field('balance_after') balanceAfter!: number;
  @field('description') description!: string;
  @field('category') category?: string;
  @field('reference') reference?: string;
  @field('notes') notes?: string;
  @field('transaction_date') transactionDate!: number;
  @field('recorded_by') recordedBy!: string;

  // Relations
  @relation('cash_accounts', 'cash_account_id') cashAccount !: Relation<CashAccount>;
  @relation('transactions', 'transaction_id') transaction?: Relation<Transaction>;
  @relation('payments', 'payment_id') payment?: Relation<Payment>;
}