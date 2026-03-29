// app/(tabs)/debtors.tsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Linking,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import * as SMS from 'expo-sms';
import * as Clipboard from 'expo-clipboard';
import { Q } from '@nozbe/watermelondb';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { ThemedText } from '@/components/ui/ThemedText';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import CustomDialog from '@/components/ui/CustomDialog';
import DebtorCard from '@/components/DebtorCard';
import { useAuth } from '@/context/AuthContext';

// Database
import database from '@/database';
import { CashAccount } from '@/database/models/CashAccount';
import { AccountTransaction } from '@/database/models/AccountTransaction';
import { Payment } from '@/database/models/Payment';
import Transaction from '@/database/models/Transaction';

// Services
import DebtService, { DebtorSummary } from '@/services/debtService';
import FilterChip from '@/components/FilterChip';
import { useNotification } from '@/context/NotificationContext';

// Types
type SortOption = 'name' | 'amount-desc' | 'amount-asc' | 'oldest' | 'overdue' | 'recent';
type FilterOption = 'all' | 'overdue' | 'high-value' | 'recent' | 'this-week' | 'this-month';
type ViewMode = 'grid' | 'list';
type TimeRange = 'week' | 'month' | 'quarter' | 'year';

interface FilterState {
  search: string;
  sort: SortOption;
  filter: FilterOption;
  viewMode: 'grid' | 'list';
  timeRange: TimeRange;
  minAmount?: number;
  maxAmount?: number;
  dateRange?: {
    start: number;
    end: number;
  };
}

export default function DebtorsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const { currentShop, user } = useAuth();
  const { showNotification } = useNotification();
  const isDark = colorScheme === 'dark';

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [debtors, setDebtors] = useState<DebtorSummary[]>([]);
  const [selectedDebtor, setSelectedDebtor] = useState<DebtorSummary | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  // Dialog states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [dialogData, setDialogData] = useState<{
    visible: boolean;
    title: string;
    description: string;
    variant: 'success' | 'error' | 'warning' | 'info' | 'neutral';
    icon?: keyof typeof Ionicons.glyphMap;
  }>({ visible: false, title: '', description: '', variant: 'info' });

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'mobile'>('cash');

  // Message form state
  const [messageText, setMessageText] = useState('');
  const [smsAvailable, setSmsAvailable] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    sort: 'amount-desc',
    filter: 'all',
    viewMode: 'grid',
    timeRange: 'month',
  });

  const getDaysOverdue = useCallback((debtor: DebtorSummary) => {
    if (!debtor.dueDate) return 0;
    const days = Math.floor((Date.now() - debtor.dueDate) / (24 * 60 * 60 * 1000));
    return Math.max(0, days);
  }, []);

  useEffect(() => {
    checkSmsAvailability();
  }, []);

  const checkSmsAvailability = async () => {
    const isAvailable = await SMS.isAvailableAsync();
    setSmsAvailable(isAvailable);
  };

  useEffect(() => {
    if (currentShop) {
      loadAnalytics();
    }
  }, [currentShop, debtors]);

  const loadAnalytics = async () => {
    if (!currentShop) return;
    try {
      const analyticsData = await DebtService.getDebtAnalytics(currentShop.id);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const stats = useMemo(() => {
    if (!analytics) {
      return {
        totalOutstanding: 0,
        totalOverdue: 0,
        activeDebtors: 0,
        overdueCount: 0,
        paidThisMonth: 0,
        recoveryRate: 0,
        aging: { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 },
        averageDebt: 0,
        collectionRate: 100,
      };
    }
    return {
      totalOutstanding: analytics.totalOutstanding,
      totalOverdue: analytics.totalOverdue,
      activeDebtors: analytics.activeDebtors,
      overdueCount: analytics.overdueCount,
      paidThisMonth:
        analytics.recentPayments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0,
      recoveryRate: analytics.recoveryRate,
      aging: analytics.aging,
      averageDebt: analytics.averageDebt,
      collectionRate: analytics.collectionRate,
    };
  }, [analytics]);

  const filteredDebtors = useMemo(() => {
    let filtered = [...debtors];

    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        d =>
          d.contactName.toLowerCase().includes(searchLower) ||
          d.contactPhone.includes(filters.search) ||
          d.contactEmail?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.minAmount !== undefined) {
      filtered = filtered.filter(d => d.totalDebt >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter(d => d.totalDebt <= filters.maxAmount!);
    }

    if (filters.dateRange) {
      filtered = filtered.filter(
        d =>
          d.oldestDebtDate >= filters.dateRange!.start &&
          d.oldestDebtDate <= filters.dateRange!.end
      );
    }

    switch (filters.filter) {
      case 'overdue':
        filtered = filtered.filter(d => d.overdueAmount > 0);
        break;
      case 'high-value':
        filtered = filtered.filter(d => d.totalDebt > stats.averageDebt * 1.5);
        break;
      case 'recent':
        filtered = filtered.filter(
          d =>
            d.lastPaymentDate &&
            d.lastPaymentDate > Date.now() - 7 * 24 * 60 * 60 * 1000
        );
        break;
      case 'this-week':
        filtered = filtered.filter(
          d => d.oldestDebtDate > Date.now() - 7 * 24 * 60 * 60 * 1000
        );
        break;
      case 'this-month':
        filtered = filtered.filter(
          d => d.oldestDebtDate > Date.now() - 30 * 24 * 60 * 60 * 1000
        );
        break;
    }

    filtered.sort((a, b) => {
      switch (filters.sort) {
        case 'name':          return a.contactName.localeCompare(b.contactName);
        case 'amount-desc':   return b.totalDebt - a.totalDebt;
        case 'amount-asc':    return a.totalDebt - b.totalDebt;
        case 'oldest':        return a.oldestDebtDate - b.oldestDebtDate;
        case 'overdue':       return b.overdueAmount - a.overdueAmount;
        case 'recent':        return (b.lastPaymentDate || 0) - (a.lastPaymentDate || 0);
        default:              return 0;
      }
    });

    return filtered;
  }, [debtors, filters, stats.averageDebt]);

  const sections = useMemo(() => {
    if (filters.viewMode !== 'list') return [];

    const groups: { [key: string]: DebtorSummary[] } = {
      '⚠️ Overdue': [],
      '💰 High Value': [],
      '📅 This Month': [],
      '✅ Good Standing': [],
    };

    filteredDebtors.forEach(debtor => {
      if (debtor.overdueAmount > 0) {
        groups['⚠️ Overdue'].push(debtor);
      } else if (debtor.totalDebt > stats.averageDebt * 2) {
        groups['💰 High Value'].push(debtor);
      } else if (debtor.oldestDebtDate > Date.now() - 30 * 24 * 60 * 60 * 1000) {
        groups['📅 This Month'].push(debtor);
      } else {
        groups['✅ Good Standing'].push(debtor);
      }
    });

    return Object.entries(groups)
      .filter(([_, items]) => items.length > 0)
      .map(([title, data]) => ({ title, data }));
  }, [filteredDebtors, filters.viewMode, stats.averageDebt]);

  const loadDebtors = useCallback(async () => {
    if (!currentShop) return;
    try {
      const debtorsData = await DebtService.getDebtorSummaries(currentShop.id);
      setDebtors(debtorsData);
    } catch (error) {
      console.error('Error loading debtors:', error);
      showNotification({ type: 'error', title: 'Error', message: 'Failed to load debtors' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentShop, showNotification]);

  useEffect(() => {
    loadDebtors();
  }, [loadDebtors]);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadDebtors();
  }, [loadDebtors]);

  // ─────────────────────────────────────────────────────────────────────────────
  // ACCOUNTING HELPERS
  // These mirror the exact same pattern used in useSaleProcessor so the books
  // stay consistent. All helpers MUST be called from inside database.write().
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Fetch the shop's default (cash) account. Called BEFORE database.write().
   */
  const getDefaultCashAccount = async (shopId: string): Promise<CashAccount | null> => {
    const accounts = await database
      .get<CashAccount>('cash_accounts')
      .query(
        Q.where('shop_id', shopId),
        Q.where('is_default', true),
        Q.where('is_active', true)
      )
      .fetch();
    return accounts.length > 0 ? accounts[0] : null;
  };

  /**
   * Fetch the shop's receivable account. Called BEFORE database.write().
   * This is the same account that was credited when the original credit sale
   * was recorded in useSaleProcessor.
   */
  const getReceivableAccount = async (shopId: string): Promise<CashAccount | null> => {
    const accounts = await database
      .get<CashAccount>('cash_accounts')
      .query(
        Q.where('shop_id', shopId),
        Q.where('type', 'receivable'),
        Q.where('is_active', true)
      )
      .fetch();
    return accounts.length > 0 ? accounts[0] : null;
  };

  /**
   * Create one account_transactions row and update the account balance in-place.
   *
   * ⚠️  MUST be called from inside an existing database.write() block.
   *     Pass the full CashAccount object — never just the ID.
   *     Pass currentBalanceOverride when the same account is touched more than
   *     once in a single writer (the in-memory object does not auto-refresh).
   */
  const createAccountTransaction = async (
    cashAccount: CashAccount,
    transactionId: string,
    paymentId: string | undefined,
    type: string,
    amount: number,
    description: string,
    category: string,
    reference: string,
    currentBalanceOverride?: number   // use when account was already mutated earlier in same write
  ): Promise<{ balanceBefore: number; balanceAfter: number }> => {
    const balanceBefore = currentBalanceOverride ?? (cashAccount.currentBalance || 0);

    let balanceAfter = balanceBefore;
    if (type === 'income' || type === 'deposit' || type === 'receivable') {
      balanceAfter = balanceBefore + amount;
    } else if (
      type === 'expense' ||
      type === 'withdrawal' ||
      type === 'receivable_payment'
    ) {
      balanceAfter = balanceBefore - amount;
    }

    await database.get<AccountTransaction>('account_transactions').create(at => {
      at.shopId = currentShop!.id;
      at.cashAccountId = cashAccount.id;
      at.transactionId = transactionId;
      at.paymentId = paymentId;
      at.type = type;
      at.amount = amount;
      at.balanceBefore = balanceBefore;
      at.balanceAfter = balanceAfter;
      at.description = description;
      at.category = category;
      at.reference = reference;
      at.transactionDate = Date.now();
      at.recordedBy = user!.id;
    });

    await cashAccount.update(account => {
      account.currentBalance = balanceAfter;
    });

    console.log(`✅ AccountTransaction [${type}] ${balanceBefore} → ${balanceAfter}`);
    return { balanceBefore, balanceAfter };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYMENT HANDLER
  // Mirrors the exact reverse of what useSaleProcessor does for credit sales.
  //
  // When a credit sale is recorded, useSaleProcessor does:
  //   receivable account  +totalAmount  (type: 'receivable')
  //   [if partial]
  //     cash account      +amountPaid   (type: 'deposit')
  //     receivable account -amountPaid  (type: 'receivable_payment')
  //
  // When a debtor pays back, we do:
  //   cash account        +paymentAmount  (type: 'deposit')       — cash came in
  //   receivable account  -paymentAmount  (type: 'receivable_payment') — debt reduced
  //   transactions        update balanceDue / paymentStatus
  // ─────────────────────────────────────────────────────────────────────────────
  const handlePayment = useCallback(async () => {
    if (!selectedDebtor || !currentShop || !user) return;

    const amount = parseFloat(paymentAmount);

    if (isNaN(amount) || amount <= 0) {
      setDialogData({
        visible: true,
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount',
        variant: 'warning',
        icon: 'alert-circle',
      });
      return;
    }

    if (amount > selectedDebtor.totalDebt) {
      setDialogData({
        visible: true,
        title: 'Amount Exceeds Debt',
        description: `Maximum payment allowed is ₣${selectedDebtor.totalDebt.toLocaleString()}`,
        variant: 'warning',
        icon: 'alert-circle',
      });
      return;
    }

    setProcessingPayment(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log('🟢 === RECORDING DEBT REPAYMENT ===');
      console.log('💰 Amount:', amount, '| Debtor:', selectedDebtor.contactName);

      // ── Step 1: Fetch both accounts BEFORE the writer ──────────────────────
      const defaultCashAccount = await getDefaultCashAccount(currentShop.id);
      if (!defaultCashAccount) {
        throw new Error(
          'No default cash account found. Please set a default account in settings.'
        );
      }

      const receivableAccount = await getReceivableAccount(currentShop.id);
      if (!receivableAccount) {
        throw new Error(
          'No receivable account found. This should not happen — please contact support.'
        );
      }

      console.log('✅ Cash account:', defaultCashAccount.id);
      console.log('✅ Receivable account:', receivableAccount.id);

      // ── Step 2: Single database.write() — all mutations inside ─────────────
      await database.write(async () => {
        console.log('🔵 Inside database.write() for debt repayment...');

        let remainingPayment = amount;

        // Apply payment across each transaction this debtor has outstanding,
        // oldest first — drains the most overdue balances first.
        for (const transactionId of selectedDebtor.transactionIds) {
          if (remainingPayment <= 0) break;

          // Fetch the original transaction
          let originalTransaction: Transaction;
          try {
            originalTransaction = await database
              .get<Transaction>('transactions')
              .find(transactionId);
          } catch {
            console.warn(`Transaction ${transactionId} not found, skipping`);
            continue;
          }

          const txBalanceDue = originalTransaction.balanceDue || 0;
          if (txBalanceDue <= 0) continue; // already fully paid

          // How much of this payment goes to this transaction
          const appliedAmount = Math.min(remainingPayment, txBalanceDue);
          remainingPayment -= appliedAmount;

          const newBalanceDue = txBalanceDue - appliedAmount;
          const newAmountPaid = (originalTransaction.amountPaid || 0) + appliedAmount;
          const newPaymentStatus =
            newBalanceDue <= 0
              ? 'paid'
              : newAmountPaid > 0
              ? 'partial'
              : 'due';

          const paymentMethodId =
            paymentMethod === 'bank'   ? 'bank' :
            paymentMethod === 'mobile' ? 'mobile' :
                                         'cash';

          const referenceNumber = `RPY-${transactionId.slice(-6)}-${Date.now()}`;

          // 2a. Create the payment record
          const payment = await database.get<Payment>('payments').create(p => {
            p.transactionId = transactionId;
            p.referenceNumber = referenceNumber;
            p.shopId = currentShop.id;
            p.paymentMethodId = paymentMethodId;
            p.cashAccountId = defaultCashAccount.id;
            p.amount = appliedAmount;
            p.paymentDate = Date.now();
            p.notes =
              paymentNotes.trim() ||
              `Debt repayment from ${selectedDebtor.contactName} - ${originalTransaction.transactionNumber}`;
            p.recordedBy = user.id;
          });
          console.log(`✅ Payment record created: ${payment.id} for ${appliedAmount}`);

          // 2b. Cash comes IN → credit the default cash account (type: 'deposit')
          await createAccountTransaction(
            defaultCashAccount,
            transactionId,
            payment.id,
            'deposit',
            appliedAmount,
            `Debt repayment from ${selectedDebtor.contactName} - ${originalTransaction.transactionNumber}`,
            'payment',
            referenceNumber
          );

          // 2c. Receivable goes DOWN → debit the receivable account (type: 'receivable_payment')
          // This is the exact reverse of what useSaleProcessor recorded when the
          // credit sale was created. The receivable account balance must decrease
          // by the same amount we are collecting now.
          await createAccountTransaction(
            receivableAccount,
            transactionId,
            payment.id,
            'receivable_payment',
            appliedAmount,
            `Debt collected from ${selectedDebtor.contactName} - ${originalTransaction.transactionNumber}`,
            'payment',
            referenceNumber
          );

          // 2d. Update the original transaction record
          await originalTransaction.update(tx => {
            tx.amountPaid = newAmountPaid;
            tx.balanceDue = newBalanceDue;
            tx.paymentStatus = newPaymentStatus;
          });

          console.log(
            `✅ Transaction ${originalTransaction.transactionNumber} updated: ` +
            `balanceDue ${txBalanceDue} → ${newBalanceDue} | status: ${newPaymentStatus}`
          );
        }

        console.log('✅ All transactions updated');
      });

      // ── Step 3: Reload UI data ─────────────────────────────────────────────
      await loadDebtors();
      await loadAnalytics();

      const balanceRemaining = Math.max(0, selectedDebtor.totalDebt - amount);

      setDialogData({
        visible: true,
        title: '✅ Payment Recorded',
        description:
          `Payment of ₣${amount.toLocaleString()} received from ${selectedDebtor.contactName}` +
          (balanceRemaining > 0
            ? `\nRemaining balance: ₣${balanceRemaining.toLocaleString()}`
            : '\nDebt fully cleared! 🎉'),
        variant: 'success',
        icon: 'checkmark-circle',
      });

      showNotification({
        type: 'success',
        title: 'Payment Recorded',
        message: `Payment of ₣${amount.toLocaleString()} recorded successfully`,
      });

      setPaymentAmount('');
      setPaymentNotes('');
      setShowPaymentDialog(false);

      console.log('🎉 Debt repayment completed successfully');
    } catch (error: any) {
      console.error('❌ Error recording payment:', error);
      setDialogData({
        visible: true,
        title: '❌ Payment Failed',
        description: error.message || 'Failed to record payment. Please try again.',
        variant: 'error',
        icon: 'alert-circle',
      });
    } finally {
      setProcessingPayment(false);
      setSelectedDebtor(null);
      console.log('🏁 === DEBT REPAYMENT ENDED ===');
    }
  }, [
    selectedDebtor,
    currentShop,
    user,
    paymentAmount,
    paymentNotes,
    paymentMethod,
    loadDebtors,
    showNotification,
  ]);

  // Handle sending reminder message
  const handleMessage = useCallback(async (debtor: DebtorSummary) => {
    if (!smsAvailable) {
      await Clipboard.setStringAsync(debtor.contactPhone);
      setDialogData({
        visible: true,
        title: '📱 Phone Number Copied',
        description: `${debtor.contactName}'s phone number has been copied to clipboard`,
        variant: 'info',
        icon: 'copy',
      });
      return;
    }

    const daysOverdue = getDaysOverdue(debtor);
    const defaultMessage =
      `Hello ${debtor.contactName}, this is a friendly reminder about your outstanding balance of ₣${debtor.totalDebt.toLocaleString()}. ` +
      (daysOverdue > 0 ? `This is ${daysOverdue} days overdue. ` : '') +
      `Please contact us to arrange payment. Thank you!`;

    setMessageText(defaultMessage);
    setSelectedDebtor(debtor);
    setShowMessageDialog(true);
  }, [smsAvailable, getDaysOverdue]);

  const sendSMS = useCallback(async () => {
    if (!selectedDebtor || !messageText.trim()) return;

    try {
      const { result } = await SMS.sendSMSAsync(
        [selectedDebtor.contactPhone],
        messageText
      );

      if (result === 'sent') {
        await DebtService.trackReminder(selectedDebtor.contactId, 'sms', messageText);
        setDialogData({
          visible: true,
          title: '✅ Message Sent',
          description: `Reminder sent to ${selectedDebtor.contactName}`,
          variant: 'success',
          icon: 'checkmark-circle',
        });
        showNotification({
          type: 'success',
          title: 'Message Sent',
          message: `Reminder sent to ${selectedDebtor.contactName}`,
        });
      } else if (result === 'cancelled') {
        setDialogData({
          visible: true,
          title: '📝 Message Cancelled',
          description: 'Message was cancelled',
          variant: 'info',
          icon: 'close-circle',
        });
      }
    } catch (error) {
      setDialogData({
        visible: true,
        title: '❌ Failed to Send',
        description: 'Could not send SMS. Please try again.',
        variant: 'error',
        icon: 'alert-circle',
      });
    } finally {
      setShowMessageDialog(false);
      setMessageText('');
      setSelectedDebtor(null);
    }
  }, [selectedDebtor, messageText, showNotification]);

  const handleCall = useCallback(async (debtor: DebtorSummary) => {
    try {
      await Linking.openURL(`tel:${debtor.contactPhone}`);
      await DebtService.trackCall(debtor.contactId, 'outgoing');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      await Clipboard.setStringAsync(debtor.contactPhone);
      setDialogData({
        visible: true,
        title: '📱 Phone Number Copied',
        description: `${debtor.contactName}'s phone number has been copied to clipboard`,
        variant: 'info',
        icon: 'copy',
      });
    }
  }, []);

  const handleCopyPhone = useCallback(async (phone: string, name: string) => {
    await Clipboard.setStringAsync(phone);
    setDialogData({
      visible: true,
      title: '📋 Copied!',
      description: `${name}'s phone number copied to clipboard`,
      variant: 'success',
      icon: 'copy',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleExport = useCallback(async (format: 'pdf' | 'excel' | 'csv') => {
    if (!currentShop) return;
    try {
      setDialogData({
        visible: true,
        title: '📊 Export Started',
        description: `Exporting debtors list as ${format.toUpperCase()}...`,
        variant: 'info',
        icon: 'document-text',
      });

      await DebtService.exportDebtorsData(currentShop.id, {
        format: format === 'csv' ? 'csv' : 'json',
        includeHistory: true,
      });

      setTimeout(() => {
        setDialogData({
          visible: true,
          title: '✅ Export Complete',
          description: `Debtors list exported as ${format.toUpperCase()}`,
          variant: 'success',
          icon: 'checkmark-circle',
        });
      }, 1500);
    } catch (error) {
      setDialogData({
        visible: true,
        title: '❌ Export Failed',
        description: 'Failed to export debtors list',
        variant: 'error',
        icon: 'alert-circle',
      });
    }
  }, [currentShop]);

  const formatCurrency = (amount: number) =>
    `₣${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const getRiskLevel = useCallback(
    (debtor: DebtorSummary): 'low' | 'medium' | 'high' => {
      const daysOverdue = getDaysOverdue(debtor);
      const debtRatio = debtor.totalDebt / (stats.averageDebt || 1);
      if (daysOverdue > 60 || debtRatio > 3) return 'high';
      if (daysOverdue > 30 || debtRatio > 2) return 'medium';
      return 'low';
    },
    [getDaysOverdue, stats.averageDebt]
  );

  const onGridScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const onListScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  if (loading) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Debtors" showBackButton />
        <Loading text="Loading debtors..." />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUB-COMPONENTS
  // ─────────────────────────────────────────────────────────────────────────────

  const SummaryCards = () => (
    <View className="flex-row flex-wrap gap-3 mb-6">
      <Card variant="elevated" className="flex-1 min-w-[48%]">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="w-10 h-10 rounded-full bg-error/10 items-center justify-center">
              <Ionicons name="people" size={20} color="#ef4444" />
            </View>
            <View className="px-2 py-1 bg-surface-soft dark:bg-dark-surface-soft rounded-full">
              <ThemedText variant="muted" size="xs">
                {((stats.activeDebtors / (debtors.length || 1)) * 100).toFixed(0)}%
              </ThemedText>
            </View>
          </View>
          <ThemedText variant="muted" size="sm">Active Debtors</ThemedText>
          <ThemedText variant="heading" size="xl" className="font-bold">
            {stats.activeDebtors}
          </ThemedText>
          <View className="flex-row items-center mt-2">
            <Ionicons
              name={stats.overdueCount > 0 ? 'alert-circle' : 'checkmark-circle'}
              size={14}
              color={stats.overdueCount > 0 ? '#ef4444' : '#22c55e'}
            />
            <ThemedText
              variant={stats.overdueCount > 0 ? 'error' : 'success'}
              size="xs"
              className="ml-1"
            >
              {stats.overdueCount} overdue
            </ThemedText>
          </View>
        </CardContent>
      </Card>

      <Card variant="elevated" className="flex-1 min-w-[48%]">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="w-10 h-10 rounded-full bg-warning/10 items-center justify-center">
              <Ionicons name="cash" size={20} color="#f59e0b" />
            </View>
          </View>
          <ThemedText variant="muted" size="sm">Outstanding</ThemedText>
          <ThemedText variant="heading" size="xl" className="font-bold text-warning">
            {formatCurrency(stats.totalOutstanding)}
          </ThemedText>
          <View className="flex-row items-center mt-2">
            <View className="flex-1 h-1.5 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden">
              <View
                className="h-full bg-warning rounded-full"
                style={{
                  width: `${(stats.totalOverdue / (stats.totalOutstanding || 1)) * 100}%`,
                }}
              />
            </View>
            <ThemedText variant="error" size="xs" className="ml-2">
              {formatCurrency(stats.totalOverdue)}
            </ThemedText>
          </View>
        </CardContent>
      </Card>

      <Card variant="elevated" className="flex-1 min-w-[48%]">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="w-10 h-10 rounded-full bg-success/10 items-center justify-center">
              <Ionicons name="trending-up" size={20} color="#22c55e" />
            </View>
          </View>
          <ThemedText variant="muted" size="sm">Recovery Rate</ThemedText>
          <ThemedText variant="heading" size="xl" className="font-bold text-success">
            {stats.recoveryRate.toFixed(1)}%
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="mt-2">
            {formatCurrency(stats.paidThisMonth)} paid this month
          </ThemedText>
        </CardContent>
      </Card>

      <Card variant="elevated" className="flex-1 min-w-[48%]">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="w-10 h-10 rounded-full bg-info/10 items-center justify-center">
              <Ionicons name="calendar" size={20} color="#3b82f6" />
            </View>
          </View>
          <ThemedText variant="muted" size="sm">Collection Rate</ThemedText>
          <ThemedText variant="heading" size="xl" className="font-bold text-info">
            {stats.collectionRate.toFixed(1)}%
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="mt-2">
            {stats.activeDebtors - stats.overdueCount} current debtors
          </ThemedText>
        </CardContent>
      </Card>
    </View>
  );

  const AgingChart = () => (
    <Card variant="elevated" className="mb-6">
      <CardContent className="p-4">
        <View className="flex-row items-center justify-between mb-4">
          <ThemedText variant="heading" size="base" className="font-semibold">
            Aging Summary
          </ThemedText>
          <TouchableOpacity
            onPress={() =>
              setFilters(prev => ({
                ...prev,
                timeRange: prev.timeRange === 'month' ? 'quarter' : 'month',
              }))
            }
          >
            <ThemedText variant="brand" size="sm">
              {filters.timeRange === 'month' ? 'Monthly' : 'Quarterly'} View
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View className="gap-2">
          {Object.entries(stats.aging).map(([period, amount]) => {
            const percentage = ((amount as number) / (stats.totalOutstanding || 1)) * 100;
            return (
              <View key={period}>
                <View className="flex-row justify-between mb-1">
                  <ThemedText variant="muted" size="sm" className="capitalize">
                    {period}
                  </ThemedText>
                  <ThemedText variant="default" size="sm" className="font-medium">
                    {formatCurrency(amount as number)}
                  </ThemedText>
                </View>
                <View className="h-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden">
                  <View
                    className={`h-full rounded-full ${
                      period === 'current'  ? 'bg-success' :
                      period === '1-30'     ? 'bg-warning' :
                      period === '31-60'    ? 'bg-orange-500' :
                      period === '61-90'    ? 'bg-error' :
                      'bg-error/70'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </CardContent>
    </Card>
  );

  const FilterChipsRow = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-4 -ml-4 pl-4"
    >
      <View className="flex-row gap-2">
        <FilterChip
          label={`All (${debtors.length})`}
          selected={filters.filter === 'all'}
          onPress={() => setFilters(prev => ({ ...prev, filter: 'all' }))}
        />
        <FilterChip
          label={`Overdue (${stats.overdueCount})`}
          selected={filters.filter === 'overdue'}
          onPress={() => setFilters(prev => ({ ...prev, filter: 'overdue' }))}
          color="error"
        />
        <FilterChip
          label="High Value"
          selected={filters.filter === 'high-value'}
          onPress={() => setFilters(prev => ({ ...prev, filter: 'high-value' }))}
          color="warning"
        />
        <FilterChip
          label="Recent"
          selected={filters.filter === 'recent'}
          onPress={() => setFilters(prev => ({ ...prev, filter: 'recent' }))}
          color="info"
        />
        <FilterChip
          label="This Week"
          selected={filters.filter === 'this-week'}
          onPress={() => setFilters(prev => ({ ...prev, filter: 'this-week' }))}
        />
        <FilterChip
          label="This Month"
          selected={filters.filter === 'this-month'}
          onPress={() => setFilters(prev => ({ ...prev, filter: 'this-month' }))}
        />
      </View>
    </ScrollView>
  );

  const ViewToggleAndSort = () => (
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-row bg-surface dark:bg-dark-surface rounded-lg p-1">
        <TouchableOpacity
          onPress={() => setFilters(prev => ({ ...prev, viewMode: 'list' }))}
          className={`px-3 py-2 rounded-l-lg ${filters.viewMode === 'list' ? 'bg-brand/20' : ''}`}
        >
          <Ionicons
            name="list"
            size={18}
            color={filters.viewMode === 'list' ? '#0ea5e9' : isDark ? '#94a3b8' : '#64748b'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilters(prev => ({ ...prev, viewMode: 'grid' }))}
          className={`px-3 py-2 rounded-r-lg ${filters.viewMode === 'grid' ? 'bg-brand/20' : ''}`}
        >
          <Ionicons
            name="grid"
            size={18}
            color={filters.viewMode === 'grid' ? '#0ea5e9' : isDark ? '#94a3b8' : '#64748b'}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => {
          const options: SortOption[] = ['amount-desc', 'name', 'overdue', 'oldest'];
          const currentIndex = options.indexOf(filters.sort);
          const nextSort = options[(currentIndex + 1) % options.length];
          setFilters(prev => ({ ...prev, sort: nextSort }));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        className="flex-row items-center bg-surface dark:bg-dark-surface px-3 py-2 rounded-lg"
      >
        <Ionicons name="swap-vertical" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
        <ThemedText variant="muted" size="sm" className="ml-1 capitalize">
          {filters.sort.replace('-', ' ')}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // DIALOGS (shared across both views)
  // ─────────────────────────────────────────────────────────────────────────────

  const Dialogs = () => (
    <>
      {/* Payment Dialog */}
      <CustomDialog
        visible={showPaymentDialog}
        title={`Record Payment - ${selectedDebtor?.contactName || ''}`}
        variant="info"
        icon="cash-outline"
        onClose={() => {
          setShowPaymentDialog(false);
          setSelectedDebtor(null);
          setPaymentAmount('');
          setPaymentNotes('');
        }}
        showCancel={true}
        cancelLabel="Cancel"
        actions={[
          {
            label: processingPayment ? 'Processing...' : 'Confirm Payment',
            variant: 'default',
            onPress: handlePayment,
            disabled:
              !paymentAmount ||
              parseFloat(paymentAmount) <= 0 ||
              processingPayment,
          },
        ]}
        loading={processingPayment}
      >
        <View className="w-full mt-4">
          {/* Debt Summary */}
          <View className="flex-row gap-2 mb-4">
            <View className="flex-1 p-3 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
              <ThemedText variant="muted" size="xs">Total Debt</ThemedText>
              <ThemedText variant="heading" size="lg" className="text-warning font-bold">
                {formatCurrency(selectedDebtor?.totalDebt || 0)}
              </ThemedText>
            </View>
            <View className="flex-1 p-3 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
              <ThemedText variant="muted" size="xs">Overdue</ThemedText>
              <ThemedText
                variant="heading"
                size="lg"
                className={
                  (selectedDebtor?.overdueAmount || 0) > 0 ? 'text-error font-bold' : ''
                }
              >
                {formatCurrency(selectedDebtor?.overdueAmount || 0)}
              </ThemedText>
            </View>
          </View>

          {/* Quick Amounts */}
          <View className="flex-row flex-wrap gap-2 mb-4">
            {selectedDebtor &&
              [25, 50, 75, 100].map(percent => {
                const amount = (selectedDebtor.totalDebt * percent) / 100;
                return (
                  <TouchableOpacity
                    key={percent}
                    onPress={() => setPaymentAmount(amount.toString())}
                    className="flex-1 p-2 bg-surface-soft dark:bg-dark-surface-soft rounded-lg items-center"
                  >
                    <ThemedText variant="muted" size="xs">{percent}%</ThemedText>
                    <ThemedText variant="default" size="sm" className="font-medium">
                      {formatCurrency(amount)}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
          </View>

          {/* Amount Input */}
          <Input
            placeholder="Payment Amount"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="numeric"
            leftIcon="cash-outline"
            className="mb-3"
          />

          {/* Payment Method */}
          <View className="flex-row gap-2 mb-3">
            {(['cash', 'bank', 'mobile'] as const).map(method => (
              <TouchableOpacity
                key={method}
                onPress={() => setPaymentMethod(method)}
                className={`flex-1 p-3 rounded-lg items-center ${
                  paymentMethod === method
                    ? 'bg-brand'
                    : 'bg-surface-soft dark:bg-dark-surface-soft'
                }`}
              >
                <Ionicons
                  name={
                    method === 'cash'   ? 'cash-outline' :
                    method === 'bank'   ? 'business-outline' :
                    'phone-portrait-outline'
                  }
                  size={20}
                  color={paymentMethod === method ? '#fff' : isDark ? '#94a3b8' : '#64748b'}
                />
                <ThemedText
                  size="xs"
                  className={`mt-1 capitalize ${paymentMethod === method ? 'text-white' : ''}`}
                >
                  {method}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes Input */}
          <Input
            placeholder="Notes (optional)"
            value={paymentNotes}
            onChangeText={setPaymentNotes}
            leftIcon="document-text-outline"
            multiline
            numberOfLines={2}
          />
        </View>
      </CustomDialog>

      {/* Message Dialog */}
      <CustomDialog
        visible={showMessageDialog}
        title={`Message ${selectedDebtor?.contactName || ''}`}
        variant="info"
        icon="chatbubble-outline"
        onClose={() => {
          setShowMessageDialog(false);
          setSelectedDebtor(null);
          setMessageText('');
        }}
        showCancel={true}
        cancelLabel="Cancel"
        width={400}
        actions={[
          {
            label: 'Send Message',
            variant: 'default',
            onPress: sendSMS,
            disabled: !messageText.trim(),
          },
        ]}
      >
        <View className="w-full mt-4">
          <View className="mb-3 p-3 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
            <ThemedText variant="muted" size="sm">
              To: {selectedDebtor?.contactPhone}
            </ThemedText>
          </View>
          <Input
            placeholder="Type your message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
            numberOfLines={4}
            className="min-h-[100px]"
          />
          {!smsAvailable && (
            <View className="mt-3 p-3 bg-warning-soft rounded-lg">
              <ThemedText variant="warning" size="sm">
                SMS is not available on this device. The message will be copied to clipboard instead.
              </ThemedText>
            </View>
          )}
        </View>
      </CustomDialog>

      {/* Debtor Details Dialog */}
      <CustomDialog
        visible={showDetailsDialog}
        title={selectedDebtor?.contactName || ''}
        variant="neutral"
        icon="person-circle-outline"
        onClose={() => {
          setShowDetailsDialog(false);
          setSelectedDebtor(null);
        }}
        showCancel={false}
        actions={[
          {
            label: 'Pay now',
            variant: 'default',
            onPress: () => {
              setShowDetailsDialog(false);
              setShowPaymentDialog(true);
            },
          },
          {
            label: 'Message',
            variant: 'outline',
            onPress: () => {
              setShowDetailsDialog(false);
              if (selectedDebtor) handleMessage(selectedDebtor);
            },
          },
          {
            label: 'Call',
            variant: 'outline',
            onPress: () => {
              setShowDetailsDialog(false);
              if (selectedDebtor) handleCall(selectedDebtor);
            },
          },
        ]}
      >
        <View className="w-full mt-4">
          <View className="mb-4 p-4 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
            <View className="flex-row items-center mb-2">
              <Ionicons name="call-outline" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
              <TouchableOpacity
                onPress={() => {
                  if (selectedDebtor) {
                    handleCopyPhone(selectedDebtor.contactPhone, selectedDebtor.contactName);
                  }
                }}
                className="flex-1 flex-row items-center ml-2"
              >
                <ThemedText variant="default" size="base">
                  {selectedDebtor?.contactPhone}
                </ThemedText>
                <Ionicons name="copy-outline" size={16} color="#0ea5e9" className="ml-2" />
              </TouchableOpacity>
            </View>
            {selectedDebtor?.contactEmail && (
              <View className="flex-row items-center">
                <Ionicons name="mail-outline" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                <ThemedText variant="default" size="base" className="ml-2">
                  {selectedDebtor.contactEmail}
                </ThemedText>
              </View>
            )}
          </View>

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <ThemedText variant="muted" size="xs">Total Debt</ThemedText>
              <ThemedText variant="heading" size="lg" className="text-warning font-bold">
                {formatCurrency(selectedDebtor?.totalDebt || 0)}
              </ThemedText>
            </View>
            <View className="flex-1">
              <ThemedText variant="muted" size="xs">Transactions</ThemedText>
              <ThemedText variant="heading" size="lg" className="font-bold">
                {selectedDebtor?.transactionCount || 0}
              </ThemedText>
            </View>
          </View>

          {selectedDebtor?.paymentHistory && selectedDebtor.paymentHistory.length > 0 && (
            <View className="mb-4">
              <ThemedText variant="muted" size="xs" className="mb-2">
                Recent Payments
              </ThemedText>
              {selectedDebtor.paymentHistory.slice(0, 3).map(payment => (
                <View
                  key={payment.id}
                  className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="cash-outline" size={14} color="#22c55e" />
                    <ThemedText variant="muted" size="xs" className="ml-2">
                      {formatDate(payment.date)}
                    </ThemedText>
                  </View>
                  <ThemedText variant="success" size="sm" className="font-medium">
                    {formatCurrency(payment.amount)}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {selectedDebtor?.dueDate && (
            <View
              className={`p-3 rounded-lg ${
                selectedDebtor.overdueAmount > 0 ? 'bg-error-soft' : 'bg-surface-soft'
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={
                      selectedDebtor.overdueAmount > 0
                        ? '#ef4444'
                        : isDark
                        ? '#94a3b8'
                        : '#64748b'
                    }
                  />
                  <ThemedText
                    variant={selectedDebtor.overdueAmount > 0 ? 'error' : 'muted'}
                    size="sm"
                    className="ml-1"
                  >
                    Due: {formatDate(selectedDebtor.dueDate)}
                  </ThemedText>
                </View>
                {selectedDebtor.overdueAmount > 0 && (
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-error mr-1" />
                    <ThemedText variant="error" size="sm">
                      {getDaysOverdue(selectedDebtor)} days overdue
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </CustomDialog>

      {/* Filter Dialog */}
      <CustomDialog
        visible={showFilterDialog}
        title="Filter Debtors"
        variant="neutral"
        icon="options-outline"
        onClose={() => setShowFilterDialog(false)}
        showCancel={true}
        cancelLabel="Reset"
        onCancel={() => {
          setFilters({
            search: '',
            sort: 'amount-desc',
            filter: 'all',
            viewMode: filters.viewMode,
            timeRange: 'month',
          });
        }}
        actions={[
          {
            label: 'Apply Filters',
            variant: 'default',
            onPress: () => setShowFilterDialog(false),
          },
        ]}
      >
        <View className="w-full mt-4">
          <View className="mb-4">
            <ThemedText variant="label" className="mb-2 font-semibold">
              Amount Range
            </ThemedText>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  placeholder="Min"
                  value={filters.minAmount?.toString() || ''}
                  onChangeText={text =>
                    setFilters(prev => ({
                      ...prev,
                      minAmount: text ? parseFloat(text) : undefined,
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Input
                  placeholder="Max"
                  value={filters.maxAmount?.toString() || ''}
                  onChangeText={text =>
                    setFilters(prev => ({
                      ...prev,
                      maxAmount: text ? parseFloat(text) : undefined,
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View>
            <ThemedText variant="label" className="mb-2 font-semibold">
              Sort By
            </ThemedText>
            <View className="flex-row flex-wrap gap-2">
              {(['amount-desc', 'name', 'overdue', 'oldest'] as SortOption[]).map(option => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setFilters(prev => ({ ...prev, sort: option }))}
                  className={`px-3 py-2 rounded-full ${
                    filters.sort === option
                      ? 'bg-brand'
                      : 'bg-surface-soft dark:bg-dark-surface-soft'
                  }`}
                >
                  <ThemedText
                    size="sm"
                    className={filters.sort === option ? 'text-white' : ''}
                  >
                    {option.replace('-', ' ').charAt(0).toUpperCase() + option.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </CustomDialog>

      {/* Export Dialog */}
      <CustomDialog
        visible={showExportDialog}
        title="Export Debtors"
        variant="neutral"
        icon="download-outline"
        onClose={() => setShowExportDialog(false)}
        showCancel={true}
        cancelLabel="Cancel"
        actions={[]}
      >
        <View className="w-full mt-4">
          {(['pdf', 'excel', 'csv'] as const).map(format => (
            <TouchableOpacity
              key={format}
              onPress={() => {
                handleExport(format);
                setShowExportDialog(false);
              }}
              className="flex-row items-center p-4 bg-surface-soft dark:bg-dark-surface-soft rounded-lg mb-2"
            >
              <View
                className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                  format === 'pdf'   ? 'bg-error/10' :
                  format === 'excel' ? 'bg-success/10' :
                  'bg-info/10'
                }`}
              >
                <Ionicons
                  name={
                    format === 'pdf'   ? 'document-text' :
                    format === 'excel' ? 'grid' :
                    'code'
                  }
                  size={20}
                  color={
                    format === 'pdf'   ? '#ef4444' :
                    format === 'excel' ? '#22c55e' :
                    '#3b82f6'
                  }
                />
              </View>
              <View className="flex-1">
                <ThemedText variant="default" size="base" className="font-semibold">
                  {format === 'pdf'   ? 'PDF Report' :
                   format === 'excel' ? 'Excel Spreadsheet' :
                   'CSV File'}
                </ThemedText>
                <ThemedText variant="muted" size="sm">
                  {format === 'pdf'   ? 'Professional report with aging analysis' :
                   format === 'excel' ? 'Editable format for further analysis' :
                   'Simple format for data import'}
                </ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </CustomDialog>

      {/* Global notification dialog */}
      <CustomDialog
        visible={dialogData.visible}
        title={dialogData.title}
        description={dialogData.description}
        variant={dialogData.variant}
        icon={dialogData.icon}
        actions={[
          {
            label: 'OK',
            variant: 'default',
            onPress: () => setDialogData(prev => ({ ...prev, visible: false })),
          },
        ]}
        onClose={() => setDialogData(prev => ({ ...prev, visible: false }))}
        showCancel={false}
      />
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // GRID VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (filters.viewMode === 'grid') {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <Animated.View style={{ opacity: headerOpacity }}>
          <PremiumHeader
            title="Debtors"
            showBackButton
            searchable
            searchPlaceholder="Search by name, phone or email..."
            onSearch={text => setFilters(prev => ({ ...prev, search: text }))}
            
          />
        </Animated.View>

        <Animated.ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? '#fff' : '#0ea5e9'}
            />
          }
          onScroll={onGridScroll}
          scrollEventThrottle={16}
        >
          <View className="p-4">
            <SummaryCards />
            <AgingChart />
            <FilterChipsRow />
            <ViewToggleAndSort />

            {filteredDebtors.length === 0 ? (
              <EmptyState
                icon={filters.search ? 'search-outline' : 'people-outline'}
                title={filters.search ? 'No Results Found' : 'No Debtors Yet'}
                description={
                  filters.search
                    ? `No debtors matching "${filters.search}"`
                    : 'No one owes you money yet. Credit sales will appear here.'
                }
                action={
                  filters.search
                    ? [{ label: 'Clear Search', variant: 'outline' as const, onPress: () => setFilters(prev => ({ ...prev, search: '' })), icon: 'refresh' }]
                    : [{ label: 'New Credit Sale', variant: 'default' as const, onPress: () => router.push('/(tabs)/sales'), icon: 'add-circle' }]
                }
              />
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {filteredDebtors.map(debtor => (
                  <View key={debtor.contactId} className="w-[48%]">
                    <DebtorCard
                      debtor={debtor}
                      onPress={() => { setSelectedDebtor(debtor); setShowDetailsDialog(true); }}
                      onPayment={() => { setSelectedDebtor(debtor); setShowPaymentDialog(true); }}
                      onMessage={() => handleMessage(debtor)}
                      onCall={() => handleCall(debtor)}
                      onCopyPhone={() => handleCopyPhone(debtor.contactPhone, debtor.contactName)}
                      viewMode="grid"
                      riskLevel={getRiskLevel(debtor)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.ScrollView>

        <Dialogs />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <Animated.View style={{ opacity: headerOpacity }}>
        <PremiumHeader
          title="Debtors"
          showBackButton
          searchable
          searchPlaceholder="Search by name, phone or email..."
          onSearch={text => setFilters(prev => ({ ...prev, search: text }))}
          
        />
      </Animated.View>

      <Animated.SectionList
        sections={sections}
        keyExtractor={item => item.contactId}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#fff' : '#0ea5e9'}
          />
        }
        onScroll={onListScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View className="p-4">
            <SummaryCards />
            <AgingChart />
            <FilterChipsRow />
            <ViewToggleAndSort />
          </View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View className="bg-surface-soft dark:bg-dark-surface-soft py-2 px-4">
            <ThemedText variant="label" size="sm" className="font-semibold">
              {title} ({sections.find(s => s.title === title)?.data.length || 0})
            </ThemedText>
          </View>
        )}
        renderItem={({ item }) => (
          <View className="px-4 pb-2">
            <DebtorCard
              debtor={item}
              onPress={() => { setSelectedDebtor(item); setShowDetailsDialog(true); }}
              onPayment={() => { setSelectedDebtor(item); setShowPaymentDialog(true); }}
              onMessage={() => handleMessage(item)}
              onCall={() => handleCall(item)}
              onCopyPhone={() => handleCopyPhone(item.contactPhone, item.contactName)}
              viewMode="list"
              riskLevel={getRiskLevel(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View className="p-4">
            <EmptyState
              icon={filters.search ? 'search-outline' : 'people-outline'}
              title={filters.search ? 'No Results Found' : 'No Debtors Yet'}
              description={
                filters.search
                  ? `No debtors matching "${filters.search}"`
                  : 'No one owes you money yet. Credit sales will appear here.'
              }
              action={
                filters.search
                  ? [{ label: 'Clear Search', variant: 'outline' as const, onPress: () => setFilters(prev => ({ ...prev, search: '' })), icon: 'refresh' }]
                  : [{ label: 'New Credit Sale', variant: 'default' as const, onPress: () => router.push('/(tabs)/sales'), icon: 'add-circle' }]
              }
            />
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Dialogs />
    </View>
  );
}