// services/transactionService.ts
import database from '@/database';
import { Payment } from '@/database/models/Payment';
import { AccountTransaction } from '@/database/models/AccountTransaction';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid'
import Transaction from '@/database/models/Transaction';
import { CashAccount } from '@/database/models/CashAccount';

const transactions = database.get<Transaction>('transactions');
const payments = database.get<Payment>('payments');
const accountTransactions = database.get<AccountTransaction>('account_transactions');

export type TransactionData = {
  shopId: string;
  transactionType: 'sale' | 'purchase' | 'expense' | 'income';
  contactId?: string;
  expenseCategoryId?: string;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: 'paid' | 'partial' | 'due';
  transactionDate: number;
  dueDate?: number;
  recordedBy: string;
  notes?: string;
  isBusinessExpense?: boolean;
  transactionNumber?: string;
};

export type PaymentInput = {
  cashAccountId: string;
  paymentMethodId: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
};

export async function createTransactionWithPayments(
  txnData: TransactionData,
  paymentInputs: PaymentInput[] = []
) {
  return database.write(async () => {
    // Validate: total paid ≤ total amount
    const totalPaid = paymentInputs.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid > txnData.totalAmount) {
      throw new Error('Total payments exceed transaction amount');
    }

    const balanceDue = txnData.totalAmount - totalPaid;
    const finalStatus = 
      balanceDue <= 0 ? 'paid' : 
      totalPaid > 0 ? 'partial' : 'due';

    // Create main transaction
    const transaction = await transactions.create(t => {
      t.shopId = txnData.shopId;
      t.transactionType = txnData.transactionType;
      t.transactionNumber = `TXN-${Date.now()}-${uuid.v4().slice(0, 6).toUpperCase()}`;
      t.contactId = txnData.contactId;
      t.expenseCategoryId = txnData.expenseCategoryId;
      t.subtotal = txnData.subtotal;
      t.taxAmount = txnData.taxAmount;
      t.discountAmount = txnData.discountAmount;
      t.totalAmount = txnData.totalAmount;
      t.amountPaid = totalPaid;
      t.balanceDue = balanceDue;
      t.paymentStatus = finalStatus;
      t.transactionDate = txnData.transactionDate;
      t.dueDate = txnData.dueDate;
      t.recordedBy = txnData.recordedBy;
      t.notes = txnData.notes;
      t.isBusinessExpense = txnData.isBusinessExpense ?? false;
    });

    // Create payments & account transactions
    for (const paymentInput of paymentInputs) {
      const payment = await payments.create(p => {
        p.transactionId = transaction.id;
        p.shopId = txnData.shopId;
        p.cashAccountId = paymentInput.cashAccountId;
        p.paymentMethodId = paymentInput.paymentMethodId;
        p.amount = paymentInput.amount;
        p.paymentDate = Date.now();
        p.referenceNumber = paymentInput.referenceNumber;
        p.notes = paymentInput.notes;
        p.recordedBy = txnData.recordedBy;
      });

      // Update cash account balance
      const cashAccount = await database.get('cash_accounts').find(paymentInput.cashAccountId) as CashAccount;
      const newBalance = cashAccount.currentBalance + 
        (txnData.transactionType === 'sale' || txnData.transactionType === 'income' 
          ? paymentInput.amount 
          : -paymentInput.amount);

      await cashAccount.update(a => {
        a.currentBalance = newBalance;
        a._tableStatus = 'updated';
      });

      // Log account transaction
      await accountTransactions.create(at => {
        at.shopId = txnData.shopId;
        at.cashAccountId = paymentInput.cashAccountId;
        at.transactionId = transaction.id;
        at.paymentId = payment.id;
        at.type = 
          txnData.transactionType === 'sale' || txnData.transactionType === 'income'
            ? 'deposit'
            : 'withdrawal';
        at.amount = paymentInput.amount;
        at.balanceBefore = cashAccount.currentBalance;
        at.balanceAfter = newBalance;
        at.description = `Payment for ${transaction.transactionNumber}`;
        at.transactionDate = Date.now();
        at.recordedBy = txnData.recordedBy;
      });
    }

    return { transaction, payments: paymentInputs };
  });
}

export async function getTransactionsByShop(shopId: string, limit = 100) {
  return transactions.query(
    Q.where('shop_id', shopId),
    Q.take(limit)
  ).fetch();
}

export async function getTransactionById(id: string) {
  return transactions.find(id);
}