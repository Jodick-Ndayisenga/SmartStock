// // services/transactionService.ts
// import database from '@/database';
// import { Payment } from '@/database/models/Payment';
// import { AccountTransaction } from '@/database/models/AccountTransaction';
// import { Q } from '@nozbe/watermelondb';
// import uuid from 'react-native-uuid'
// import Transaction from '@/database/models/Transaction';
// import { CashAccount } from '@/database/models/CashAccount';

// const transactions = database.get<Transaction>('transactions');
// const payments = database.get<Payment>('payments');
// const accountTransactions = database.get<AccountTransaction>('account_transactions');

// export type TransactionData = {
//   shopId: string;
//   // In TransactionData
//   transactionType: 'sale' | 'purchase' | 'expense' | 'income' | 'transfer';
//   contactId?: string;
//   expenseCategoryId?: string;
//   subtotal: number;
//   taxAmount?: number;
//   discountAmount?: number;
//   totalAmount: number;
//   amountPaid: number;
//   paymentStatus: 'paid' | 'partial' | 'due';
//   transactionDate: number;
//   dueDate?: number;
//   recordedBy: string;
//   notes?: string;
//   isBusinessExpense?: boolean;
//   transactionNumber?: string;
//   originalTransactionId?: string; // for returns/refunds
//   isRefund?: boolean; // explicit flag
// };

// export type PaymentInput = {
//   cashAccountId: string;
//   paymentMethodId: string;
//   amount: number;
//   referenceNumber?: string;
//   notes?: string;
// };

// export async function createTransactionWithPayments(
//   txnData: TransactionData,
//   paymentInputs: PaymentInput[] = []
// ) {
//   return database.write(async () => {
//     // Validate: total paid ≤ total amount
//     const totalPaid = paymentInputs.reduce((sum, p) => sum + p.amount, 0);
//     if (totalPaid > txnData.totalAmount) {
//       throw new Error('Total payments exceed transaction amount');
//     }

//     const balanceDue = txnData.totalAmount - totalPaid;
//     const finalStatus = 
//       balanceDue <= 0 ? 'paid' : 
//       totalPaid > 0 ? 'partial' : 'due';

//     // Create main transaction
//     const transaction = await transactions.create(t => {
//       t.shopId = txnData.shopId;
//       t.transactionType = txnData.transactionType;
//       t.transactionNumber = `TXN-${Date.now()}-${uuid.v4().slice(0, 6).toUpperCase()}`;
//       t.contactId = txnData.contactId;
//       t.expenseCategoryId = txnData.expenseCategoryId;
//       t.subtotal = txnData.subtotal;
//       t.taxAmount = txnData.taxAmount;
//       t.discountAmount = txnData.discountAmount;
//       t.totalAmount = txnData.totalAmount;
//       t.amountPaid = totalPaid;
//       t.balanceDue = balanceDue;
//       t.paymentStatus = finalStatus;
//       t.transactionDate = Date.now();
//       t.dueDate = txnData.dueDate;
//       t.recordedBy = txnData.recordedBy;
//       t.notes = txnData.notes;
//       t.isBusinessExpense = txnData.isBusinessExpense ?? false;
//     });

//     // Create payments & account transactions
//     for (const paymentInput of paymentInputs) {
//       const payment = await payments.create(p => {
//         p.transactionId = transaction.id;
//         p.shopId = txnData.shopId;
//         p.cashAccountId = paymentInput.cashAccountId;
//         p.paymentMethodId = paymentInput.paymentMethodId;
//         p.amount = paymentInput.amount;
//         p.paymentDate = Date.now();
//         p.referenceNumber = paymentInput.referenceNumber;
//         p.notes = paymentInput.notes;
//         p.recordedBy = txnData.recordedBy;
//       });

//       // Update cash account balance
//       const cashAccount = await database.get('cash_accounts').find(paymentInput.cashAccountId) as CashAccount;
//       const newBalance = cashAccount.currentBalance + 
//         (txnData.transactionType === 'sale' || txnData.transactionType === 'income' 
//           ? paymentInput.amount 
//           : -paymentInput.amount);

//       await cashAccount.update(a => {
//         a.currentBalance = newBalance;
//         a._tableStatus = 'updated';
//       });

//       // Log account transaction
//       await accountTransactions.create(at => {
//         at.shopId = txnData.shopId;
//         at.cashAccountId = paymentInput.cashAccountId;
//         at.transactionId = transaction.id;
//         at.paymentId = payment.id;
//         at.type = 
//           txnData.transactionType === 'sale' || txnData.transactionType === 'income'
//             ? 'deposit'
//             : 'withdrawal';
//         at.amount = paymentInput.amount;
//         at.balanceBefore = cashAccount.currentBalance;
//         at.balanceAfter = newBalance;
//         at.description = `Payment for ${transaction.transactionNumber}`;
//         at.transactionDate = Date.now();
//         at.recordedBy = txnData.recordedBy;
//       });
//     }

//     return { transaction, payments: paymentInputs };
//   });
// }

// export async function getTransactionsByShop(shopId: string, limit = 100) {
//   return transactions.query(
//     Q.where('shop_id', shopId),
//     Q.take(limit)
//   ).fetch();
// }

// export async function getTransactionById(id: string) {
//   return transactions.find(id);
// }


// services/transactionService.ts
import database from '@/database';
import { Payment } from '@/database/models/Payment';
import { AccountTransaction } from '@/database/models/AccountTransaction';
import { Q } from '@nozbe/watermelondb';
import uuid from 'react-native-uuid';
import Transaction from '@/database/models/Transaction';
import { CashAccount } from '@/database/models/CashAccount';

const transactions = database.get<Transaction>('transactions');
const payments = database.get<Payment>('payments');
const accountTransactions = database.get<AccountTransaction>('account_transactions');

export type TransactionData = {
  shopId: string;
  transactionType: 'sale' | 'purchase' | 'expense' | 'income' | 'transfer';
  contactId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  expenseCategoryId?: string;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number; // Can be negative for refunds
  amountPaid: number;
  paymentStatus: 'paid' | 'partial' | 'due';
  transactionDate: number;
  dueDate?: number;
  recordedBy: string;
  notes?: string;
  isBusinessExpense?: boolean;
  isRefund?: boolean; // true if this is a refund/return
  originalTransactionId?: string; // optional link to original sale/purchase
  transactionNumber?: string;
};

export type PaymentInput = {
  cashAccountId: string;
  paymentMethodId: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
};

/**
 * Creates a new transaction with one or more payments.
 * Supports sales, purchases, expenses, income, and refunds.
 */
export async function createTransactionWithPayments(
  txnData: TransactionData,
  paymentInputs: PaymentInput[] = []
) {
  return database.write(async () => {
    const totalPaid = paymentInputs.reduce((sum, p) => sum + p.amount, 0);
    
    // For non-refund transactions, paid amount should not exceed total
    if (!txnData.isRefund && totalPaid > txnData.totalAmount) {
      throw new Error('Total payments cannot exceed transaction amount');
    }

    const balanceDue = txnData.totalAmount - totalPaid;
    const finalStatus =
      balanceDue <= 0 ? 'paid' :
      totalPaid > 0 ? 'partial' : 'due';

    const transaction = await transactions.create(t => {
      t.shopId = txnData.shopId;
      t.transactionType = txnData.transactionType;
      t.transactionNumber = txnData.transactionNumber ?? `TXN-${Date.now()}-${uuid.v4().slice(0, 6).toUpperCase()}`;
      t.contactId = txnData.contactId ?? '';
      t.sourceAccountId = txnData.fromAccountId ?? '';
      t.destinationAccountId = txnData.toAccountId ?? '';
      t.expenseCategoryId = txnData.expenseCategoryId ?? '';
      t.subtotal = txnData.subtotal;
      t.taxAmount = txnData.taxAmount ?? 0;
      t.discountAmount = txnData.discountAmount ?? 0;
      t.totalAmount = txnData.totalAmount;
      t.amountPaid = totalPaid;
      t.balanceDue = balanceDue;
      t.paymentStatus = finalStatus;
      t.transactionDate = txnData.transactionDate;
      t.dueDate = txnData.dueDate ?? Date.now() + 7 * 24 * 60 * 60 * 1000; // default to 1 week later
      t.recordedBy = txnData.recordedBy;
      t.notes = txnData.notes ?? '';
      t.isBusinessExpense = txnData.isBusinessExpense ?? false;
      t.isRecurring = false;
    });

    // Process each payment
    for (const paymentInput of paymentInputs) {
      // Determine cash flow direction
      const isMoneyIn =
        (!txnData.isRefund && (txnData.transactionType === 'income' || txnData.transactionType === 'sale')) ||
        (txnData.isRefund && (txnData.transactionType === 'expense' || txnData.transactionType === 'purchase'));

      const amountDelta = isMoneyIn ? paymentInput.amount : -paymentInput.amount;

      // Create payment record
      const payment = await payments.create(p => {
        p.transactionId = transaction.id;
        p.shopId = txnData.shopId;
        p.cashAccountId = paymentInput.cashAccountId;
        p.paymentMethodId = paymentInput.paymentMethodId;
        p.amount = paymentInput.amount;
        p.paymentDate = Date.now();
        p.referenceNumber = paymentInput.referenceNumber ?? '';
        p.notes = paymentInput.notes ?? '';
        p.recordedBy = txnData.recordedBy;
      });

      // Update cash account balance (atomic)
      const cashAccount = await database.get<CashAccount>('cash_accounts').find(paymentInput.cashAccountId);
      await cashAccount.update(a => {
        a.currentBalance = a.currentBalance + amountDelta;
        a._tableStatus = 'updated';
        a._lastSyncChanged = Date.now();
      });

      // Log account transaction
      await accountTransactions.create(at => {
        at.shopId = txnData.shopId;
        at.cashAccountId = paymentInput.cashAccountId;
        at.transactionId = transaction.id;
        at.paymentId = payment.id;
        at.type = amountDelta >= 0 ? 'deposit' : 'withdrawal';
        at.amount = Math.abs(amountDelta);
        at.balanceBefore = cashAccount.currentBalance - amountDelta;
        at.balanceAfter = cashAccount.currentBalance;
        at.description = `Payment for ${transaction.transactionNumber}`;
        at.reference = paymentInput.referenceNumber ?? '';
        at.category = '';
        at.notes = paymentInput.notes ?? '';
        at.transactionDate = Date.now();
        at.recordedBy = txnData.recordedBy;

        at._tableStatus = 'created';
        at._lastSyncChanged = Date.now();
      });
    }

    return { transaction, payments: paymentInputs };
  });
}

/**
 * Records an additional payment on an existing transaction (e.g., settling a debt).
 */
export async function recordPaymentOnExistingTransaction(
  transactionId: string,
  paymentInput: PaymentInput,
  recordedBy: string
) {
  return database.write(async () => {
    const transaction = await transactions.find(transactionId);

    if (transaction.paymentStatus === 'paid') {
      throw new Error('Transaction is already fully paid');
    }

    const newPaid = transaction.amountPaid + paymentInput.amount;
    const newBalance = Math.max(0, transaction.totalAmount - newPaid);
    const newStatus = 
      newBalance <= 0 ? 'paid' :
      newPaid > 0 ? 'partial' : 'due';

    // Update transaction
    await transaction.update(t => {
      t.amountPaid = newPaid;
      t.balanceDue = newBalance;
      t.paymentStatus = newStatus;
    });

    // Create payment
    const payment = await payments.create(p => {
      p.transactionId = transaction.id;
      p.shopId = transaction.shopId;
      p.cashAccountId = paymentInput.cashAccountId;
      p.paymentMethodId = paymentInput.paymentMethodId;
      p.amount = paymentInput.amount;
      p.paymentDate = Date.now();
      p.referenceNumber = paymentInput.referenceNumber ?? '';
      p.notes = paymentInput.notes ?? '';
      p.recordedBy = recordedBy;
    });

    // Update cash account (money coming in)
    const cashAccount = await database.get<CashAccount>('cash_accounts').find(paymentInput.cashAccountId);
    await cashAccount.update(a => {
      a.currentBalance = a.currentBalance + paymentInput.amount;
      a._tableStatus = 'updated';
      a._lastSyncChanged = Date.now();
    });

    // Log account transaction
    await accountTransactions.create(at => {
      at.shopId = transaction.shopId;
      at.cashAccountId = paymentInput.cashAccountId;
      at.transactionId = transaction.id;
      at.paymentId = payment.id;
      at.type = 'deposit';
      at.amount = paymentInput.amount;
      at.balanceBefore = cashAccount.currentBalance - paymentInput.amount;
      at.balanceAfter = cashAccount.currentBalance;
      at.description = `Payment for ${transaction.transactionNumber}`;
      at.reference = paymentInput.referenceNumber ?? '';
      at.category = '';
      at.notes = paymentInput.notes ?? '';
      at.transactionDate = Date.now();
      at.recordedBy = recordedBy;
    });

    return { transaction, payment };
  });
}

/**
 * Fetches transactions for a shop (for listing)
 */
export async function getTransactionsByShop(shopId: string, limit = 100) {
  return transactions.query(
    Q.where('shop_id', shopId),
    Q.take(limit),
    Q.sortBy('transaction_date', Q.desc)
  ).fetch();
}

/**
 * Get a single transaction by ID
 */
export async function getTransactionById(id: string) {
  return transactions.find(id);
}