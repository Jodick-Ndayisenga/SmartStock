// models/Transaction.ts
import { Relation } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import { BaseModel } from './BaseModel';
import ExpenseCategory from "./ExpenseCategory"

export default class Transaction extends BaseModel {
  static table = 'transactions';

  static associations = {
    transaction_items: { type: 'has_many', foreignKey: 'transaction_id' },
    payments: { type: 'has_many', foreignKey: 'transaction_id' },
    account_transactions: { type: 'has_many', foreignKey: 'transaction_id' },
    expense_categories: { type: 'belongs_to', key: 'expense_category_id' },
  } as const;

  // ─── Core Info ───────────────────────────────────────────────
  @field('shop_id') shopId!: string;

  @field('transaction_type')
  transactionType!: 'sale' | 'purchase' | 'expense' | 'income' | 'transfer';

  @field('transaction_number') transactionNumber!: string;

  @field('contact_id') contactId?: string;

  // ─── Expense / Category ─────────────────────────────────────
  @field('expense_category_id') expenseCategoryId?: string;

  @relation('expense_categories', 'expense_category_id')
  expenseCategory?: Relation<ExpenseCategory>;

  // ─── Amounts ────────────────────────────────────────────────
  @field('subtotal') subtotal!: number;
  @field('tax_amount') taxAmount?: number;
  @field('discount_amount') discountAmount?: number;
  @field('total_amount') totalAmount!: number;
  @field('amount_paid') amountPaid!: number;
  @field('balance_due') balanceDue!: number;

  // ─── Status / Dates ─────────────────────────────────────────
  @field('payment_status') paymentStatus!: string;

  @field('transaction_date') transactionDate!: number; // Unix timestamp
  @field('due_date') dueDate?: number;

  // ─── Recurring ──────────────────────────────────────────────
  @field('is_recurring') isRecurring?: boolean;

  @field('recurring_interval')
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @field('next_recurring_date') nextRecurringDate?: number;

  // ─── Metadata ───────────────────────────────────────────────
  @field('receipt_image_url') receiptImageUrl?: string;
  @field('is_business_expense') isBusinessExpense?: boolean;
  @field('notes') notes?: string;

  @field('recorded_by') recordedBy!: string;
}