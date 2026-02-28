// services/debtService.ts
import { Q } from '@nozbe/watermelondb';
import database from '@/database';
import { Contact } from '@/database/models/Contact';
import Transaction from '@/database/models/Transaction';
import { CashAccount } from '@/database/models/CashAccount';
import { Payment } from '@/database/models/Payment';
import { AccountTransaction } from '@/database/models/AccountTransaction';

export interface DebtorSummary {
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  totalDebt: number;
  overdueAmount: number;
  oldestDebtDate: number;
  lastPaymentDate?: number;
  lastPaymentAmount?: number;
  transactionCount: number;
  transactionIds: string[];
  creditTerms?: string;
  dueDate?: number;
  totalEverOwed?: number;
  paidThisMonth?: number;
  paymentHistory?: PaymentHistoryItem[];
  lastReminderSent?: number;
  lastCallDate?: number;
  notes?: string;
  riskScore?: number;
}

export interface PaymentHistoryItem {
  id: string;
  date: number;
  amount: number;
  method: 'cash' | 'bank' | 'mobile' | 'other';
  notes?: string;
  transactionId?: string;
}

export interface ReminderRecord {
  id: string;
  contactId: string;
  type: 'payment_reminder' | 'follow_up' | 'thank_you';
  sentAt: number;
  status: 'sent' | 'failed' | 'pending';
  message?: string;
  channel: 'sms' | 'email' | 'whatsapp';
}

export interface CallLog {
  id: string;
  contactId: string;
  calledAt: number;
  duration?: number;
  type: 'outgoing' | 'incoming' | 'missed';
  notes?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  paymentId?: string;
  balanceRemaining: number;
  error?: string;
  newTransaction?: Transaction;
  newPayment?: Payment;
}

export interface PaymentParams {
  debtorId: string;
  shopId: string;
  userId: string;
  amount: number;
  notes?: string;
  paymentMethod: 'cash' | 'bank' | 'mobile' | 'other';
  transactionIds?: string[]; // Which transactions to allocate payment to
  accountId?: string; // Cash account to use (optional, will use default)
  paymentDate?: number; // Optional, defaults to now
}

export interface DebtAnalytics {
  totalOutstanding: number;
  totalOverdue: number;
  activeDebtors: number;
  overdueCount: number;
  recoveryRate: number;
  averageDebt: number;
  collectionRate: number;
  aging: {
    current: number;
    '1-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
  topDebtors: DebtorSummary[];
  recentPayments: PaymentHistoryItem[];
  projectedRecovery: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

export class DebtService {
  /**
   * Get comprehensive debtor summaries for a shop
   */
  static async getDebtorSummaries(shopId: string): Promise<DebtorSummary[]> {
    try {
      // Get all credit transactions (due or partial)
      const transactions = await database.get<Transaction>('transactions')
        .query(
          Q.where('shop_id', shopId),
          Q.where('transaction_type', 'sale'),
          Q.where('payment_status', Q.oneOf(['due', 'partial'])),
          Q.sortBy('transaction_date', Q.desc)
        )
        .fetch();

      // Get all payments in the last 30 days for "paid this month" calculation
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recentPayments = await database.get<Payment>('payments')
        .query(
          Q.where('shop_id', shopId),
          Q.where('payment_date', Q.gte(thirtyDaysAgo))
        )
        .fetch();

      // Get all reminders and call logs (if you have these tables)
      let reminders: ReminderRecord[] = [];
      let callLogs: CallLog[] = [];
      
      try {
        // These tables might not exist yet, so we handle gracefully
        reminders = await database.get('reminders').query().fetch() as any;
        callLogs = await database.get('call_logs').query().fetch() as any;
      } catch (error) {
        // Tables don't exist yet, that's fine
        console.log('Reminders or call logs table not found');
      }

      // Group by contact
      const debtorMap = new Map<string, DebtorSummary>();

      for (const transaction of transactions) {
        if (!transaction.contactId) continue;

        const contact = await database.get<Contact>('contacts')
          .find(transaction.contactId)
          .catch(() => null);

        if (!contact) continue;

        const existing = debtorMap.get(transaction.contactId) || {
          contactId: transaction.contactId,
          contactName: contact.name,
          contactPhone: contact.phone || '',
          contactEmail: contact.email,
          totalDebt: 0,
          overdueAmount: 0,
          oldestDebtDate: transaction.transactionDate,
          lastPaymentDate: undefined,
          lastPaymentAmount: undefined,
          transactionCount: 0,
          transactionIds: [],
          creditTerms: transaction.notes || '',
          dueDate: transaction.dueDate,
          totalEverOwed: 0,
          paidThisMonth: 0,
          paymentHistory: [],
          lastReminderSent: undefined,
          lastCallDate: undefined,
          riskScore: 0,
        };

        // Update totals
        existing.totalDebt += transaction.balanceDue;
        existing.transactionCount += 1;
        existing.transactionIds.push(transaction.id);
        existing.oldestDebtDate = Math.min(existing.oldestDebtDate, transaction.transactionDate);
        existing.totalEverOwed = (existing.totalEverOwed || 0) + transaction.totalAmount;
        
        // Check if overdue
        if (transaction.dueDate && transaction.dueDate < Date.now()) {
          existing.overdueAmount += transaction.balanceDue;
        }

        // Calculate risk score (0-100, higher = riskier)
        const daysOverdue = transaction.dueDate ? 
          Math.max(0, Math.floor((Date.now() - transaction.dueDate) / (24 * 60 * 60 * 1000))) : 0;
        const debtRatio = existing.totalDebt / (existing.totalEverOwed || 1);
        
        existing.riskScore = Math.min(100, Math.round(
          (daysOverdue * 0.5) + // 50% weight on overdue days
          (debtRatio * 30) +     // 30% weight on debt ratio
          (existing.transactionCount > 5 ? 20 : 10) // 20% weight on transaction count
        ));

        debtorMap.set(transaction.contactId, existing);
      }

      // Add payment history and "paid this month" calculation
      for (const payment of recentPayments) {
        const transaction = await database.get<Transaction>('transactions')
          .find(payment.transactionId)
          .catch(() => null);

        if (!transaction?.contactId) continue;

        const debtor = debtorMap.get(transaction.contactId);
        if (debtor) {
          debtor.paidThisMonth = (debtor.paidThisMonth || 0) + payment.amount;
          
          // Build payment history
          if (!debtor.paymentHistory) debtor.paymentHistory = [];
          debtor.paymentHistory.push({
            id: payment.id,
            date: payment.paymentDate,
            amount: payment.amount,
            method: payment.paymentMethodId as any,
            notes: payment.notes,
            transactionId: payment.transactionId,
          });
          
          // Update last payment info
          if (!debtor.lastPaymentDate || payment.paymentDate > debtor.lastPaymentDate) {
            debtor.lastPaymentDate = payment.paymentDate;
            debtor.lastPaymentAmount = payment.amount;
          }
        }
      }

      // Add reminder and call data
      for (const reminder of reminders) {
        const debtor = debtorMap.get(reminder.contactId);
        if (debtor) {
          if (!debtor.lastReminderSent || reminder.sentAt > debtor.lastReminderSent) {
            debtor.lastReminderSent = reminder.sentAt;
          }
        }
      }

      for (const call of callLogs) {
        const debtor = debtorMap.get(call.contactId);
        if (debtor) {
          if (!debtor.lastCallDate || call.calledAt > debtor.lastCallDate) {
            debtor.lastCallDate = call.calledAt;
          }
        }
      }

      // Sort payment history for each debtor
      debtorMap.forEach(debtor => {
        if (debtor.paymentHistory) {
          debtor.paymentHistory.sort((a, b) => b.date - a.date);
        }
      });

      return Array.from(debtorMap.values());
    } catch (error) {
      console.error('Error in getDebtorSummaries:', error);
      throw error;
    }
  }

  /**
   * Record a payment from a debtor
   */
  static async recordPayment(params: PaymentParams): Promise<PaymentResult> {
    const {
      debtorId,
      shopId,
      userId,
      amount,
      notes,
      paymentMethod,
      transactionIds,
      accountId,
      paymentDate = Date.now(),
    } = params;

    try {
      // Get or create default cash account
      let cashAccountId = accountId;
      if (!cashAccountId) {
        const defaultAccount = await this.getDefaultCashAccount(shopId);
        if (!defaultAccount) {
          throw new Error('No default cash account found. Please set one in settings.');
        }
        cashAccountId = defaultAccount.id;
      }

      // Get all outstanding transactions for this debtor
      let transactionsToPay: Transaction[] = [];
      
      if (transactionIds && transactionIds.length > 0) {
        // Pay specific transactions
        transactionsToPay = await Promise.all(
          transactionIds.map(id => 
            database.get<Transaction>('transactions').find(id)
          )
        );
      } else {
        // Pay oldest transactions first (FIFO)
        transactionsToPay = await database.get<Transaction>('transactions')
          .query(
            Q.where('contact_id', debtorId),
            Q.where('shop_id', shopId),
            Q.where('payment_status', Q.oneOf(['due', 'partial'])),
            Q.sortBy('transaction_date', Q.asc)
          )
          .fetch();
      }

      if (transactionsToPay.length === 0) {
        throw new Error('No outstanding transactions found for this debtor');
      }

      let remainingAmount = amount;
      const updatedTransactions: Transaction[] = [];
      const createdPayments: Payment[] = [];

      // Perform the payment allocation in a single write batch
      await database.write(async () => {
        // Allocate payment to transactions (oldest first)
        for (const transaction of transactionsToPay) {
          if (remainingAmount <= 0) break;

          const amountForThisTransaction = Math.min(remainingAmount, transaction.balanceDue);
          
          // Create payment record
          const payment = await database.get<Payment>('payments').create(p => {
            p.transactionId = transaction.id;
            p.shopId = shopId;
            p.paymentMethodId = paymentMethod;
            p.cashAccountId = cashAccountId!;
            p.amount = amountForThisTransaction;
            p.paymentDate = paymentDate;
            p.notes = notes || `Payment received`;
            p.recordedBy = userId;
          });
          createdPayments.push(payment);

          // Update transaction
          const newAmountPaid = transaction.amountPaid + amountForThisTransaction;
          const newBalanceDue = transaction.totalAmount - newAmountPaid;
          const newPaymentStatus = newBalanceDue <= 0 
            ? 'paid' 
            : 'partial';

          await transaction.update(t => {
            t.amountPaid = newAmountPaid;
            t.balanceDue = newBalanceDue;
            t.paymentStatus = newPaymentStatus;
          });
          updatedTransactions.push(transaction);

          // Update cash account balance
          const cashAccount = await database.get<CashAccount>('cash_accounts').find(cashAccountId!);
          const oldBalance = cashAccount.currentBalance || 0;
          
          await cashAccount.update(account => {
            account.currentBalance = oldBalance + amountForThisTransaction;
          });

          // Create account transaction for audit trail
          await database.get<AccountTransaction>('account_transactions').create(at => {
            at.shopId = shopId;
            at.cashAccountId = cashAccountId!;
            at.transactionId = transaction.id;
            at.paymentId = payment.id;
            at.type = 'deposit';
            at.amount = amountForThisTransaction;
            at.balanceBefore = oldBalance;
            at.balanceAfter = oldBalance + amountForThisTransaction;
            at.description = `Payment received from debtor - ${transaction.transactionNumber}`;
            at.transactionDate = paymentDate;
            at.recordedBy = userId;
          });

          remainingAmount -= amountForThisTransaction;
        }

        // If there's remaining amount that couldn't be allocated (shouldn't happen)
        if (remainingAmount > 0.01) { // Floating point tolerance
          console.warn(`Payment amount ₣${remainingAmount} could not be allocated`);
        }
      });

      // Calculate total balance remaining
      const balanceRemaining = transactionsToPay.reduce(
        (sum, t) => sum + t.balanceDue, 
        0
      );

      // Track payment in analytics
      await this.trackPayment({
        debtorId,
        amount,
        paymentMethod,
        transactionCount: updatedTransactions.length,
      });

      return {
        success: true,
        transactionId: updatedTransactions[0]?.id,
        paymentId: createdPayments[0]?.id,
        balanceRemaining,
        newTransaction: updatedTransactions[0],
        newPayment: createdPayments[0],
      };

    } catch (error: any) {
      console.error('Error recording payment:', error);
      return {
        success: false,
        balanceRemaining: 0,
        error: error.message || 'Failed to record payment',
      };
    }
  }

  /**
   * Track a payment reminder sent to debtor
   */
  static async trackReminder(
    contactId: string, 
    channel: 'sms' | 'email' | 'whatsapp' = 'sms',
    message?: string
  ): Promise<void> {
    try {
      // Check if reminders table exists
      await database.write(async () => {
        // Try to create in reminders table if it exists
        try {
          await database.get('reminders').create((reminder: any) => {
            reminder.contactId = contactId;
            reminder.type = 'payment_reminder';
            reminder.sentAt = Date.now();
            reminder.status = 'sent';
            reminder.channel = channel;
            reminder.message = message;
          });
        } catch (error) {
          // Table doesn't exist, store in localStorage or ignore
          console.log('Reminders table not available, skipping storage');
        }
      });

      // Also track in analytics
      console.log(`Reminder sent to contact ${contactId} via ${channel}`);
    } catch (error) {
      console.error('Error tracking reminder:', error);
    }
  }

  /**
   * Track a call made to debtor
   */
  static async trackCall(
    contactId: string,
    type: 'outgoing' | 'incoming' | 'missed' = 'outgoing',
    duration?: number,
    notes?: string
  ): Promise<void> {
    try {
      await database.write(async () => {
        // Try to create in call_logs table if it exists
        try {
          await database.get('call_logs').create((log: any) => {
            log.contactId = contactId;
            log.calledAt = Date.now();
            log.type = type;
            log.duration = duration;
            log.notes = notes;
          });
        } catch (error) {
          // Table doesn't exist, store in localStorage or ignore
          console.log('Call logs table not available, skipping storage');
        }
      });

      console.log(`Call tracked for contact ${contactId}`);
    } catch (error) {
      console.error('Error tracking call:', error);
    }
  }

  /**
   * Get default cash account for a shop
   */
  static async getDefaultCashAccount(shopId: string): Promise<CashAccount | null> {
    try {
      const accounts = await database.get<CashAccount>('cash_accounts')
        .query(
          Q.where('shop_id', shopId),
          Q.where('is_default', true),
          Q.where('is_active', true)
        )
        .fetch();

      return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('Error getting default cash account:', error);
      return null;
    }
  }

  /**
   * Get comprehensive debt analytics
   */
  static async getDebtAnalytics(shopId: string): Promise<DebtAnalytics> {
    const debtors = await this.getDebtorSummaries(shopId);
    
    const totalOutstanding = debtors.reduce((sum, d) => sum + d.totalDebt, 0);
    const totalOverdue = debtors.reduce((sum, d) => sum + d.overdueAmount, 0);
    const activeDebtors = debtors.filter(d => d.totalDebt > 0).length;
    const overdueCount = debtors.filter(d => d.overdueAmount > 0).length;
    
    // Calculate recovery rate
    const totalEverOwed = debtors.reduce((sum, d) => sum + (d.totalEverOwed || d.totalDebt), 0);
    const totalPaid = totalEverOwed - totalOutstanding;
    const recoveryRate = totalEverOwed > 0 ? (totalPaid / totalEverOwed) * 100 : 0;

    // Aging buckets
    const aging = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    };

    debtors.forEach(debtor => {
      const daysOverdue = debtor.dueDate ? 
        Math.max(0, Math.floor((Date.now() - debtor.dueDate) / (24 * 60 * 60 * 1000))) : 0;
      
      if (daysOverdue === 0) {
        aging.current += debtor.totalDebt;
      } else if (daysOverdue <= 30) {
        aging['1-30'] += debtor.overdueAmount;
      } else if (daysOverdue <= 60) {
        aging['31-60'] += debtor.overdueAmount;
      } else if (daysOverdue <= 90) {
        aging['61-90'] += debtor.overdueAmount;
      } else {
        aging['90+'] += debtor.overdueAmount;
      }
    });

    // Risk distribution
    const riskDistribution = {
      low: debtors.filter(d => (d.riskScore || 0) < 30).length,
      medium: debtors.filter(d => (d.riskScore || 0) >= 30 && (d.riskScore || 0) < 70).length,
      high: debtors.filter(d => (d.riskScore || 0) >= 70).length,
    };

    // Top debtors (top 5 by amount)
    const topDebtors = [...debtors]
      .sort((a, b) => b.totalDebt - a.totalDebt)
      .slice(0, 5);

    // Recent payments (last 10)
    const allPayments: PaymentHistoryItem[] = [];
    debtors.forEach(d => {
      if (d.paymentHistory) {
        allPayments.push(...d.paymentHistory);
      }
    });
    const recentPayments = allPayments
      .sort((a, b) => b.date - a.date)
      .slice(0, 10);

    // Projected recovery (optimistic: 90% of current, 70% of 1-30, 50% of 31-60, 30% of 61-90, 10% of 90+)
    const projectedRecovery = 
      aging.current * 0.9 +
      aging['1-30'] * 0.7 +
      aging['31-60'] * 0.5 +
      aging['61-90'] * 0.3 +
      aging['90+'] * 0.1;

    return {
      totalOutstanding,
      totalOverdue,
      activeDebtors,
      overdueCount,
      recoveryRate,
      averageDebt: activeDebtors > 0 ? totalOutstanding / activeDebtors : 0,
      collectionRate: activeDebtors > 0 ? ((activeDebtors - overdueCount) / activeDebtors) * 100 : 100,
      aging,
      topDebtors,
      recentPayments,
      projectedRecovery,
      riskDistribution,
    };
  }

  /**
   * Get payment history for a specific debtor
   */
  static async getDebtorPaymentHistory(
    contactId: string, 
    limit: number = 20
  ): Promise<PaymentHistoryItem[]> {
    try {
      const payments = await database.get<Payment>('payments')
        .query(
          Q.where('transaction_id', Q.oneOf(
            await this.getDebtorTransactionIds(contactId)
          )),
          Q.sortBy('payment_date', Q.desc),
          Q.take(limit)
        )
        .fetch();

      return payments.map(p => ({
        id: p.id,
        date: p.paymentDate,
        amount: p.amount,
        method: p.paymentMethodId as any,
        notes: p.notes,
        transactionId: p.transactionId,
      }));
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }

  /**
   * Get all transaction IDs for a debtor
   */
  private static async getDebtorTransactionIds(contactId: string): Promise<string[]> {
    const transactions = await database.get<Transaction>('transactions')
      .query(
        Q.where('contact_id', contactId),
        Q.where('transaction_type', 'sale')
      )
      .fetch();

    return transactions.map(t => t.id);
  }

  /**
   * Send bulk reminders to multiple debtors
   */
  static async sendBulkReminders(
    debtorIds: string[],
    message: string,
    channel: 'sms' | 'email' | 'whatsapp' = 'sms'
  ): Promise<{
    sent: number;
    failed: number;
    results: Array<{ debtorId: string; success: boolean; error?: string }>;
  }> {
    const results = [];
    let sent = 0;
    let failed = 0;

    for (const debtorId of debtorIds) {
      try {
        // Track the reminder (actual sending would be handled by a separate service)
        await this.trackReminder(debtorId, channel, message);
        sent++;
        results.push({ debtorId, success: true });
      } catch (error: any) {
        failed++;
        results.push({ debtorId, success: false, error: error.message });
      }
    }

    return { sent, failed, results };
  }

  /**
   * Get debtors by risk level
   */
  static async getDebtorsByRisk(
    shopId: string,
    riskLevel: 'low' | 'medium' | 'high'
  ): Promise<DebtorSummary[]> {
    const debtors = await this.getDebtorSummaries(shopId);
    
    return debtors.filter(d => {
      const score = d.riskScore || 0;
      if (riskLevel === 'low') return score < 30;
      if (riskLevel === 'medium') return score >= 30 && score < 70;
      return score >= 70;
    });
  }

  /**
   * Get aging summary for reporting
   */
  static async getAgingSummary(shopId: string): Promise<{
    buckets: Array<{ label: string; amount: number; count: number }>;
    totalOverdue: number;
  }> {
    const debtors = await this.getDebtorSummaries(shopId);
    
    const buckets = [
      { label: 'Current', amount: 0, count: 0 },
      { label: '1-30 days', amount: 0, count: 0 },
      { label: '31-60 days', amount: 0, count: 0 },
      { label: '61-90 days', amount: 0, count: 0 },
      { label: '90+ days', amount: 0, count: 0 },
    ];

    debtors.forEach(debtor => {
      const daysOverdue = debtor.dueDate ? 
        Math.max(0, Math.floor((Date.now() - debtor.dueDate) / (24 * 60 * 60 * 1000))) : 0;
      
      if (daysOverdue === 0) {
        buckets[0].amount += debtor.totalDebt;
        buckets[0].count++;
      } else if (daysOverdue <= 30) {
        buckets[1].amount += debtor.overdueAmount;
        buckets[1].count++;
      } else if (daysOverdue <= 60) {
        buckets[2].amount += debtor.overdueAmount;
        buckets[2].count++;
      } else if (daysOverdue <= 90) {
        buckets[3].amount += debtor.overdueAmount;
        buckets[3].count++;
      } else {
        buckets[4].amount += debtor.overdueAmount;
        buckets[4].count++;
      }
    });

    const totalOverdue = buckets.slice(1).reduce((sum, b) => sum + b.amount, 0);

    return { buckets, totalOverdue };
  }

  /**
   * Track payment for analytics
   */
  private static async trackPayment(data: {
    debtorId: string;
    amount: number;
    paymentMethod: string;
    transactionCount: number;
  }): Promise<void> {
    // This could send to analytics service
    console.log('Payment tracked:', data);
    
    // You could also store in a payments_analytics table
    try {
      await database.write(async () => {
        try {
          await database.get('payment_analytics').create((record: any) => {
            record.debtorId = data.debtorId;
            record.amount = data.amount;
            record.method = data.paymentMethod;
            record.transactionCount = data.transactionCount;
            record.receivedAt = Date.now();
          });
        } catch (error) {
          // Table doesn't exist
        }
      });
    } catch (error) {
      console.error('Error tracking payment:', error);
    }
  }

  /**
   * Generate payment allocation suggestions
   */
  static suggestPaymentAllocation(
    amount: number,
    outstandingTransactions: Array<{ id: string; dueDate: number; amount: number }>
  ): Array<{ transactionId: string; amount: number }> {
    // Sort by due date (oldest first) for FIFO allocation
    const sorted = [...outstandingTransactions].sort((a, b) => a.dueDate - b.dueDate);
    
    const allocation = [];
    let remaining = amount;

    for (const txn of sorted) {
      if (remaining <= 0) break;
      
      const amountForTxn = Math.min(remaining, txn.amount);
      allocation.push({
        transactionId: txn.id,
        amount: amountForTxn,
      });
      remaining -= amountForTxn;
    }

    return allocation;
  }

  /**
   * Export debtors data for reporting
   */
  static async exportDebtorsData(
    shopId: string,
    options: {
      format: 'json' | 'csv';
      includeHistory?: boolean;
      dateRange?: { start: number; end: number };
    }
  ): Promise<any> {
    const debtors = await this.getDebtorSummaries(shopId);
    
    // Filter by date range if specified
    let filteredDebtors = debtors;
    if (options.dateRange) {
      filteredDebtors = debtors.filter(d => 
        d.oldestDebtDate >= options.dateRange!.start &&
        d.oldestDebtDate <= options.dateRange!.end
      );
    }

    if (options.format === 'json') {
      return filteredDebtors;
    }

    // CSV format
    const csvRows = [];
    
    // Headers
    csvRows.push([
      'Name',
      'Phone',
      'Email',
      'Total Debt',
      'Overdue',
      'Transactions',
      'Oldest Debt',
      'Last Payment',
      'Last Payment Amount',
      'Risk Score',
    ].join(','));

    // Data rows
    filteredDebtors.forEach(d => {
      csvRows.push([
        `"${d.contactName}"`,
        `"${d.contactPhone}"`,
        `"${d.contactEmail || ''}"`,
        d.totalDebt,
        d.overdueAmount,
        d.transactionCount,
        new Date(d.oldestDebtDate).toISOString().split('T')[0],
        d.lastPaymentDate ? new Date(d.lastPaymentDate).toISOString().split('T')[0] : '',
        d.lastPaymentAmount || 0,
        d.riskScore || 0,
      ].join(','));
    });

    return csvRows.join('\n');
  }
}

export default DebtService;