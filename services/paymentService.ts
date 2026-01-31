// services/paymentService.ts
import database from '@/database';
import { Payment } from '@/database/models/Payment';
import Transaction from '@/database/models/Transaction';
import { AccountTransaction } from '@/database/models/AccountTransaction';
import { CashAccount } from '@/database/models/CashAccount'; // ← ADD THIS

const payments = database.get<Payment>('payments');
const transactions = database.get<Transaction>('transactions');
const accountTransactions = database.get<AccountTransaction>('account_transactions');
const cashAccounts = database.get<CashAccount>('cash_accounts'); // ← ADD THIS

export type AddPaymentData = {
  transactionId: string;
  cashAccountId: string;
  paymentMethodId: string;
  amount: number;
  recordedBy: string;
  referenceNumber?: string;
  notes?: string;
};

export async function addPartialPayment(data: AddPaymentData) {
  return database.write(async () => {
    const transaction = await transactions.find(data.transactionId);
    const cashAccount = await cashAccounts.find(data.cashAccountId); // ← NOW TYPED

    if (transaction.balanceDue <= 0) {
      throw new Error('Transaction is already fully paid');
    }
    if (data.amount > transaction.balanceDue) {
      throw new Error('Payment exceeds balance due');
    }

    // Create payment
    const payment = await payments.create(p => {
      p.transactionId = data.transactionId;
      p.shopId = transaction.shopId;
      p.cashAccountId = data.cashAccountId;
      p.paymentMethodId = data.paymentMethodId;
      p.amount = data.amount;
      p.paymentDate = Date.now();
      p.referenceNumber = data.referenceNumber;
      p.notes = data.notes;
      p.recordedBy = data.recordedBy;
    });

    // Update transaction
    const newAmountPaid = transaction.amountPaid + data.amount;
    const newBalanceDue = transaction.balanceDue - data.amount;
    const newStatus = newBalanceDue <= 0 ? 'paid' : 'partial';

    await transaction.update(t => {
      t.amountPaid = newAmountPaid;
      t.balanceDue = newBalanceDue;
      t.paymentStatus = newStatus;
      t._tableStatus = 'updated';
      t._lastSyncChanged = Date.now();
    });

    // Update cash account
    const flow = transaction.transactionType === 'purchase' ? -1 : 1;
    const newBalance = cashAccount.currentBalance + flow * data.amount;

    await cashAccount.update(a => {
      a.currentBalance = newBalance;
      a._tableStatus = 'updated';
      a._lastSyncChanged = Date.now();
    });

    // Log account transaction
    await accountTransactions.create(at => {
      at.shopId = transaction.shopId;
      at.cashAccountId = data.cashAccountId;
      at.transactionId = data.transactionId;
      at.paymentId = payment.id;
      at.type = flow > 0 ? 'deposit' : 'withdrawal';
      at.amount = data.amount;
      at.balanceBefore = cashAccount.currentBalance - flow * data.amount; // ← BEFORE update
      at.balanceAfter = newBalance;
      at.description = `Partial payment for ${transaction.transactionNumber}`;
      at.transactionDate = Date.now();
      at.recordedBy = data.recordedBy;
    });

    return { payment, updatedTransaction: transaction };
  });
}