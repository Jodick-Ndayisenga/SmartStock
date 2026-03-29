// app/(tabs)/transactions.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SectionList,
  ScrollView,
  TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { ThemedText } from '@/components/ui/ThemedText';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

// Models
import Transaction from '@/database/models/Transaction';
import { Payment } from '@/database/models/Payment';
import { CashAccount } from '@/database/models/CashAccount';
import ExpenseCategory from '@/database/models/ExpenseCategory';
import { Contact } from '@/database/models/Contact';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { of } from '@nozbe/watermelondb/utils/rx';

// Types
interface TransactionItem {
  id: string;
  transactionNumber: string;
  transactionType: 'sale' | 'purchase' | 'expense' | 'income' | 'transfer' | 'payment';
  date: Date;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
  contactName?: string;
  contactId?: string;
  expenseCategoryName?: string;
  sourceAccountName?: string;
  destinationAccountName?: string;
  paymentCount?: number;
  isRecurring: boolean;
  customerName?: string; // For credit sales
  partialPaymentAmount?: number; // For partial payments
}

interface TransactionSection {
  title: string;
  data: TransactionItem[];
}

type TransactionFilter = 'all' | 'sales' | 'expenses' | 'transfers' | 'payments';
type StatusFilter = 'all' | 'paid' | 'partial' | 'unpaid' | 'overdue';
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';

// Inner component that receives observable data
const TransactionsScreenInner = ({
  transactions = [],
  payments = [],
  accounts = [],
  categories = [],
  contacts = []
}: {
  transactions?: Transaction[];
  payments?: Payment[];
  accounts?: CashAccount[];
  categories?: ExpenseCategory[];
  contacts?: Contact[];
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentShop } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Format currency
  const formatShortCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `FBU ${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `FBU ${(amount / 1000).toFixed(0)}K`;
    }
    return `FBU ${amount}`;
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long'
      });
    }
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    
    let start: Date;
    let end: Date;

    switch (dateRange) {
      case 'today': {
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        break;
      }
      
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setUTCDate(now.getUTCDate() - 7);
        start = new Date(Date.UTC(weekAgo.getUTCFullYear(), weekAgo.getUTCMonth(), weekAgo.getUTCDate(), 0, 0, 0, 0));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        break;
      }
      
      case 'month': {
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        break;
      }
      
      case 'quarter': {
        const quarter = Math.floor(now.getUTCMonth() / 3);
        start = new Date(Date.UTC(now.getUTCFullYear(), quarter * 3, 1, 0, 0, 0, 0));
        end = new Date(Date.UTC(now.getUTCFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999));
        break;
      }
      
      case 'year': {
        start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
        end = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
        break;
      }
      
      case 'all': {
        start = new Date(Date.UTC(2020, 0, 1, 0, 0, 0, 0));
        end = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
        break;
      }
      
      default:
        start = new Date(0);
        end = new Date();
    }
    
    return { start, end };
  };

  // Helper function to get display name for transaction
  const getTransactionDisplayName = (transaction: Transaction): string => {
    // For sales with contact (credit sales)
    if (transaction.transactionType === 'sale' && transaction.contactId) {
      const contact = contacts.find(c => c.id === transaction.contactId);
      if (contact) {
        return contact.name;
      }
    }
    
    // For expenses with category
    if ((transaction.transactionType === 'expense' || transaction.transactionType === 'purchase') && transaction.expenseCategoryId) {
      const category = categories.find(c => c.id === transaction.expenseCategoryId);
      if (category) {
        return category.name;
      }
    }
    
    // For transfers
    if (transaction.transactionType === 'transfer') {
      let sourceName = '';
      let destName = '';
      
      if (transaction.sourceAccountId) {
        const source = accounts.find(a => a.id === transaction.sourceAccountId);
        sourceName = source?.name || '';
      }
      if (transaction.destinationAccountId) {
        const dest = accounts.find(a => a.id === transaction.destinationAccountId);
        destName = dest?.name || '';
      }
      
      if (sourceName && destName) {
        return `${sourceName} → ${destName}`;
      } else if (sourceName) {
        return `From ${sourceName}`;
      } else if (destName) {
        return `To ${destName}`;
      }
    }
    
    // For payments
    if (transaction.transactionType === 'payment' && transaction.transactionNumber) {
      return `Payment ${transaction.transactionNumber}`;
    }
    
    // Default based on transaction type
    switch (transaction.transactionType) {
      case 'sale': return 'Cash Sale';
      case 'expense': return 'Expense';
      case 'purchase': return 'Purchase';
      case 'income': return 'Income';
      case 'transfer': return 'Transfer';
      case 'payment': return 'Payment';
      default: return 'Transaction';
    }
  };

  const processedTransactions = useMemo((): TransactionItem[] => {
    const { start, end } = getDateRange();
    const startTimestamp = start.getTime();
    const endTimestamp = end.getTime();

    const paymentCountMap = new Map<string, number>();
    payments.forEach(payment => {
      const count = paymentCountMap.get(payment.transactionId) || 0;
      paymentCountMap.set(payment.transactionId, count + 1);
    });

    return transactions
      .filter(t => {
        return t.transactionDate >= startTimestamp && t.transactionDate <= endTimestamp;
      })
      .map(t => {
        // Get contact name for credit sales
        let contactName: string | undefined;
        let customerName: string | undefined;
        
        if (t.transactionType === 'sale' && t.contactId) {
          const contact = contacts.find(c => c.id === t.contactId);
          if (contact) {
            contactName = contact.name;
            customerName = contact.name;
          }
        }
        
        // Get expense category name
        let expenseCategoryName: string | undefined;
        if (t.expenseCategoryId) {
          const category = categories.find(c => c.id === t.expenseCategoryId);
          expenseCategoryName = category?.name;
        }
        
        // Get account names for transfers
        let sourceAccountName, destinationAccountName;
        if (t.sourceAccountId) {
          const account = accounts.find(a => a.id === t.sourceAccountId);
          sourceAccountName = account?.name;
        }
        if (t.destinationAccountId) {
          const account = accounts.find(a => a.id === t.destinationAccountId);
          destinationAccountName = account?.name;
        }

        // Determine display name
        const displayName = getTransactionDisplayName(t);

        return {
          id: t.id,
          transactionNumber: t.transactionNumber,
          transactionType: t.transactionType,
          date: new Date(t.transactionDate),
          totalAmount: t.totalAmount,
          amountPaid: t.amountPaid,
          balanceDue: t.balanceDue,
          paymentStatus: t.paymentStatus || 
            (t.balanceDue === 0 ? 'paid' : t.amountPaid > 0 ? 'partial' : 'unpaid'),
          contactName: displayName,
          contactId: t.contactId,
          expenseCategoryName,
          sourceAccountName,
          destinationAccountName,
          paymentCount: paymentCountMap.get(t.id) || 0,
          isRecurring: t.isRecurring || false,
          customerName,
          partialPaymentAmount: t.amountPaid > 0 && t.balanceDue > 0 ? t.amountPaid : undefined,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, payments, accounts, categories, contacts, dateRange]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return processedTransactions.filter(t => {
      // Apply search
      const matchesSearch = 
        t.transactionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.expenseCategoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.sourceAccountName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.destinationAccountName?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Apply type filter
      switch (filter) {
        case 'sales':
          return t.transactionType === 'sale' || t.transactionType === 'income';
        case 'expenses':
          return t.transactionType === 'expense' || t.transactionType === 'purchase';
        case 'transfers':
          return t.transactionType === 'transfer';
        case 'payments':
          return t.transactionType === 'payment';
        default:
          return true;
      }
    }).filter(t => {
      // Apply status filter
      switch (statusFilter) {
        case 'paid':
          return t.paymentStatus === 'paid';
        case 'partial':
          return t.paymentStatus === 'partial';
        case 'unpaid':
          return t.paymentStatus === 'unpaid';
        case 'overdue':
          return t.paymentStatus !== 'paid';
        default:
          return true;
      }
    });
  }, [processedTransactions, searchQuery, filter, statusFilter]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    let totalPending = 0;
    let transactionCount = filteredTransactions.length;

    filteredTransactions.forEach(t => {
      if (t.transactionType === 'sale' || t.transactionType === 'income') {
        totalInflow += t.totalAmount;
      } else if (t.transactionType === 'expense' || t.transactionType === 'purchase') {
        totalOutflow += t.totalAmount;
      }
      
      if (t.paymentStatus === 'partial' || t.paymentStatus === 'unpaid') {
        totalPending += t.balanceDue;
      }
    });

    return {
      totalInflow,
      totalOutflow,
      netFlow: totalInflow - totalOutflow,
      totalPending,
      transactionCount,
      paidCount: filteredTransactions.filter(t => t.paymentStatus === 'paid').length,
      pendingCount: filteredTransactions.filter(t => t.paymentStatus !== 'paid').length,
    };
  }, [filteredTransactions]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return {
      all: filteredTransactions.length,
      paid: filteredTransactions.filter(t => t.paymentStatus === 'paid').length,
      partial: filteredTransactions.filter(t => t.paymentStatus === 'partial').length,
      unpaid: filteredTransactions.filter(t => t.paymentStatus === 'unpaid').length,
    };
  }, [filteredTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      database.get<Transaction>('transactions').query().fetch(),
      database.get<Payment>('payments').query().fetch(),
      database.get<CashAccount>('cash_accounts').query().fetch(),
      database.get<ExpenseCategory>('expense_categories').query().fetch(),
      database.get<Contact>('contacts').query().fetch(),
    ]);
    setRefreshing(false);
  };

  const handleTransactionPress = (transactionId: string) => {
    setSelectedTransaction(transactionId);
    router.push(`/shops/${currentShop?.id}/transaction/${transactionId}`);
  };

  const handleLongPress = (transaction: TransactionItem) => {
    Alert.alert(
      'Transaction Options',
      `${transaction.transactionNumber}`,
      [
        { text: 'View Details', onPress: () => handleTransactionPress(transaction.id) },
        { text: 'Add Payment', onPress: () => router.push(`/(auth)/add-transaction`) },
        { text: 'Print Receipt', onPress: () => console.log('Print', transaction.id) },
        { text: 'Cancel', style: 'cancel' },
        { text: 'Void', style: 'destructive', onPress: () => console.log('Void', transaction.id) },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-success';
      case 'partial': return 'bg-warning';
      case 'unpaid': return 'bg-error';
      case 'overdue': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale':
      case 'income': return 'cart';
      case 'expense':
      case 'purchase': return 'remove-circle';
      case 'transfer': return 'swap-horizontal';
      case 'payment': return 'card';
      default: return 'document';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale':
      case 'income': return '#22c55e';
      case 'expense':
      case 'purchase': return '#ef4444';
      case 'transfer': return '#0ea5e9';
      case 'payment': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  const getRangeLabel = () => {
    switch (dateRange) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
      case 'all': return 'All Time';
      default: return 'Select Range';
    }
  };

  const sections = useMemo((): TransactionSection[] => {
    const groups: { [key: string]: TransactionItem[] } = {};
    
    filteredTransactions.forEach(t => {
      const dateKey = t.date.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(t);
    });

    const sections = Object.entries(groups)
      .map(([date, items]) => {
        return {
          title: date,
          data: items,
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.title);
        const dateB = new Date(b.title);
        return dateB.getTime() - dateA.getTime();
      });

    return sections;
  }, [filteredTransactions]);

  // Date Range Selector Component
  const DateRangeSelector = () => (
    <View className="px-2 mt-2">
      <TouchableOpacity
        onPress={() => setShowDatePicker(!showDatePicker)}
        className="flex-row items-center justify-between bg-white dark:bg-dark-surface rounded-sm px-4 py-3 border border-border dark:border-dark-border"
      >
        <View className="flex-row items-center">
          <Ionicons name="calendar-outline" size={20} color="#64748b" />
          <ThemedText variant="default" className="ml-2">
            {getRangeLabel()}
          </ThemedText>
        </View>
        <Ionicons 
          name={showDatePicker ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#64748b" 
        />
      </TouchableOpacity>

      {showDatePicker && (
        <View className="mt-2 bg-white dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border overflow-hidden">
          {(['today', 'week', 'month', 'quarter', 'year', 'all'] as DateRange[]).map((range, index) => (
            <TouchableOpacity
              key={range}
              onPress={() => {
                setDateRange(range);
                setShowDatePicker(false);
              }}
              className={`flex-row items-center justify-between px-4 py-3 ${
                index < 5 ? 'border-b border-border dark:border-dark-border' : ''
              } ${dateRange === range ? 'bg-brand/10' : ''}`}
            >
              <ThemedText 
                variant={dateRange === range ? 'brand' : 'default'}
                className="capitalize"
              >
                {range === 'today' ? 'Today' :
                 range === 'week' ? 'This Week' :
                 range === 'month' ? 'This Month' :
                 range === 'quarter' ? 'This Quarter' :
                 range === 'year' ? 'This Year' : 'All Time'}
              </ThemedText>
              {dateRange === range && (
                <Ionicons name="checkmark" size={18} color="#0ea5e9" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  // Filter Tabs Component
  const FilterTabs = () => (
    <View className="px-2 mt-3">
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="flex-row"
      >
        <View className="flex-row gap-2">
          {[
            { id: 'all', label: 'All', icon: 'apps' },
            { id: 'sales', label: 'Sales', icon: 'cart' },
            { id: 'expenses', label: 'Expenses', icon: 'remove-circle' },
            { id: 'transfers', label: 'Transfers', icon: 'swap-horizontal' },
            { id: 'payments', label: 'Payments', icon: 'card' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setFilter(tab.id as TransactionFilter)}
              className={`flex-row items-center px-4 py-2 rounded-sm ${
                filter === tab.id 
                  ? 'bg-brand' 
                  : 'bg-white dark:bg-dark-surface border border-border dark:border-dark-border'
              }`}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={16} 
                color={filter === tab.id ? '#ffffff' : '#64748b'} 
              />
              <ThemedText 
                variant={filter === tab.id ? 'default' : 'muted'}
                className={`ml-1 ${filter === tab.id ? 'text-white' : ''}`}
              >
                {tab.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // Status Filters Component
  const StatusFilters = () => (
    <View className="px-2 mt-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {[
            { id: 'all', label: 'All', color: 'bg-brand' },
            { id: 'paid', label: 'Paid', color: 'bg-success' },
            { id: 'partial', label: 'Partial', color: 'bg-warning' },
            { id: 'unpaid', label: 'Unpaid', color: 'bg-error' },
          ].map((status) => (
            <TouchableOpacity
              key={status.id}
              onPress={() => setStatusFilter(status.id as StatusFilter)}
              className={`flex-row items-center px-3 py-1.5 rounded-sm ${
                statusFilter === status.id 
                  ? status.color 
                  : 'bg-white dark:bg-dark-surface border border-border dark:border-dark-border'
              }`}
            >
              <ThemedText 
                variant={statusFilter === status.id ? 'default' : 'muted'}
                className={statusFilter === status.id ? 'text-white' : ''}
              >
                {status.label}
              </ThemedText>
              <View className={`ml-1.5 px-1.5 py-0.5 rounded-sm ${
                statusFilter === status.id 
                  ? 'bg-white/20' 
                  : 'bg-surface-soft dark:bg-dark-surface-soft'
              }`}>
                <ThemedText 
                  variant={statusFilter === status.id ? 'default' : 'muted'}
                  size="xs"
                  className={statusFilter === status.id ? 'text-white' : ''}
                >
                  {statusCounts[status.id as keyof typeof statusCounts]}
                </ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // Summary Cards Component
  const SummaryCards = () => (
    <View className="px-2 mt-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3">
          <View className="w-32 bg-success/10 rounded-sm p-3">
            <View className="flex-row items-center mb-1">
              <View className="w-6 h-6 rounded-full bg-success/20 items-center justify-center mr-1">
                <Ionicons name="arrow-down" size={12} color="#22c55e" />
              </View>
              <ThemedText variant="muted" size="xs">Inflow</ThemedText>
            </View>
            <ThemedText variant="success" size="sm" className="font-bold">
              {formatShortCurrency(summary.totalInflow)}
            </ThemedText>
          </View>

          <View className="w-32 bg-error/10 rounded-sm p-3">
            <View className="flex-row items-center mb-1">
              <View className="w-6 h-6 rounded-full bg-error/20 items-center justify-center mr-1">
                <Ionicons name="arrow-up" size={12} color="#ef4444" />
              </View>
              <ThemedText variant="muted" size="xs">Outflow</ThemedText>
            </View>
            <ThemedText variant="error" size="sm" className="font-bold">
              {formatShortCurrency(summary.totalOutflow)}
            </ThemedText>
          </View>

          <View className="w-32 bg-brand/10 rounded-sm p-3">
            <View className="flex-row items-center mb-1">
              <View className="w-6 h-6 rounded-full bg-brand/20 items-center justify-center mr-1">
                <Ionicons name="trending-up" size={12} color="#0ea5e9" />
              </View>
              <ThemedText variant="muted" size="xs">Net</ThemedText>
            </View>
            <ThemedText 
              variant="brand" 
              size="sm" 
              className={`font-bold ${
                summary.netFlow >= 0 ? 'text-success' : 'text-error'
              }`}
            >
              {summary.netFlow >= 0 ? '+' : '-'}
              {formatShortCurrency(Math.abs(summary.netFlow))}
            </ThemedText>
          </View>

          <View className="w-32 bg-warning/10 rounded-sm p-3">
            <View className="flex-row items-center mb-1">
              <View className="w-6 h-6 rounded-full bg-warning/20 items-center justify-center mr-1">
                <Ionicons name="time" size={12} color="#f59e0b" />
              </View>
              <ThemedText variant="muted" size="xs">Pending</ThemedText>
            </View>
            <ThemedText variant="warning" size="sm" className="font-bold">
              {formatShortCurrency(summary.totalPending)}
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  // Transaction Item Component
  const TransactionItemComponent = ({ item }: { item: TransactionItem }) => {
    const isInflow = item.transactionType === 'sale' || item.transactionType === 'income';
    const isOutflow = item.transactionType === 'expense' || item.transactionType === 'purchase';
    
    return (
      <TouchableOpacity
        onPress={() => handleTransactionPress(item.id)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
        className="mx-2 my-1"
      >
        <View className="bg-white dark:bg-dark-surface rounded-sm p-3 border border-border dark:border-dark-border">
          <View className="flex-row items-center">
            {/* Left icon */}
            <View 
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: `${getTypeColor(item.transactionType)}20` }}
            >
              <Ionicons 
                name={getTypeIcon(item.transactionType)} 
                size={18} 
                color={getTypeColor(item.transactionType)} 
              />
            </View>

            {/* Middle content */}
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  {/* Display contact/customer name for credit sales */}
                  <ThemedText variant="subheading" size="sm" numberOfLines={1} className="font-semibold">
                    {item.contactName || item.expenseCategoryName || item.transactionType}
                  </ThemedText>
                  
                  {/* Show customer badge for credit sales */}
                  {item.customerName && item.paymentStatus !== 'paid' && (
                    <View className="flex-row items-center mt-0.5">
                      <Badge variant="warning" size="sm">
                        <Ionicons name="person" size={10} color="#f59e0b" />
                        <ThemedText variant="warning" size="xs" className="ml-1">
                          {item.customerName}
                        </ThemedText>
                      </Badge>
                    </View>
                  )}
                  
                  {/* Show partial payment indicator */}
                  {item.partialPaymentAmount && (
                    <View className="flex-row items-center mt-0.5">
                      <Badge variant="info" size="sm">
                        <Ionicons name="cash" size={10} color="#0ea5e9" />
                        <ThemedText variant="brand" size="xs" className="ml-1">
                          Paid: {formatShortCurrency(item.partialPaymentAmount)}
                        </ThemedText>
                      </Badge>
                    </View>
                  )}
                  
                  <View className="flex-row items-center mt-0.5">
                    <ThemedText variant="muted" size="xs" className="mr-2">
                      {item.transactionNumber.slice(-8)}
                    </ThemedText>
                    <View className={`w-2 h-2 rounded-full ${getStatusColor(item.paymentStatus)}`} />
                  </View>
                </View>
                <ThemedText 
                  variant="heading" 
                  size="sm"
                  className={isInflow ? 'text-success' : isOutflow ? 'text-error' : 'text-brand'}
                >
                  {isOutflow ? '-' : ''}{formatShortCurrency(item.totalAmount)}
                </ThemedText>
              </View>

              {/* Bottom row */}
              <View className="flex-row items-center justify-between mt-1">
                <View className="flex-row items-center">
                  <Ionicons name="time" size={10} color="#64748b" />
                  <ThemedText variant="muted" size="xs" className="ml-0.5">
                    {formatShortDate(item.date)}
                  </ThemedText>
                  
                  {(item.paymentCount ?? 0) > 0 && (
                    <>
                      <Ionicons name="card" size={10} color="#64748b" className="ml-2" />
                      <ThemedText variant="muted" size="xs" className="ml-0.5">
                        {item.paymentCount} payment{item.paymentCount !== 1 ? 's' : ''}
                      </ThemedText>
                    </>
                  )}
                </View>
                
                {item.balanceDue > 0 && (
                  <ThemedText variant="error" size="xs">
                    Due: {formatShortCurrency(item.balanceDue)}
                  </ThemedText>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Section Header Component
  const SectionHeader = ({ title }: { title: string }) => {
    const date = new Date(title);
    return (
      <View className="bg-surface-soft dark:bg-dark-surface-soft px-4 py-2">
        <ThemedText variant="subheading" size="sm" className="font-semibold">
          {formatDate(date)}
        </ThemedText>
      </View>
    );
  };

  // Empty state component
  const renderEmptyState = () => {
    if (searchQuery) {
      return (
        <EmptyState
          icon="search-outline"
          title="No Results Found"
          description={`No transactions match "${searchQuery}"`}
          action={{
            label: "Clear Search",
            onPress: () => setSearchQuery('')
          }}
        />
      );
    }

    if (filter !== 'all') {
      return (
        <EmptyState
          icon="filter-outline"
          title={`No ${filter} transactions`}
          description={`No ${filter} transactions found for this period`}
          action={{
            label: "Clear Filter",
            onPress: () => setFilter('all')
          }}
        />
      );
    }

    return (
      <EmptyState
        icon="swap-vertical-outline"
        title="No Transactions"
        description="Start by creating your first transaction"
        action={{
          label: "New Sale",
          onPress: () => router.push('/(tabs)/sales')
        }}
      />
    );
  };

  if (!currentShop) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Transactions" showBackButton />
        <EmptyState
          icon="business-outline"
          title="No Shop Found"
          description="Create a shop first to view transactions"
          action={{
            label: "Create Shop",
            onPress: () => router.push('/(auth)/create-shop')
          }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader title="Transactions" subtitle={`All transactions for ${currentShop.name}`} showBackButton />
      {/* Search Bar */}
      <View className="px-2 mt-2">
        <View className="flex-row items-center bg-white dark:bg-dark-surface rounded-sm px-3 py-2 border border-border dark:border-dark-border">
          <Ionicons name="search" size={18} color="#64748b" />
          <TextInput
            className="flex-1 ml-2 text-text dark:text-dark-text text-sm"
            placeholder="Search transactions..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <DateRangeSelector />
      <FilterTabs />
      <StatusFilters />
      {filteredTransactions.length > 0 && <SummaryCards />}

      {/* Transactions List */}
      {filteredTransactions.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionItemComponent item={item} />}
          renderSectionHeader={({ section: { title } }) => <SectionHeader title={title} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{
            paddingBottom: 100,
            paddingTop: 8
          }}
          stickySectionHeadersEnabled={true}
          ListFooterComponent={
            <View className="items-center py-4">
              <ThemedText variant="muted" size="xs">
                End of transactions
              </ThemedText>
            </View>
          }
        />
      ) : (
        <View className="flex-1 justify-center">
          {renderEmptyState()}
        </View>
      )}

      {/* FAB */}
      <View className="absolute bottom-6 right-4">
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/sales')}
          className="w-14 h-14 rounded-full bg-brand items-center justify-center shadow-lg"
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Enhance with observables for real-time updates
const enhance = withObservables(
  ['currentShop'],
  ({ currentShop }: { currentShop: any }) => {
    if (!currentShop) {
      return {
        transactions: of([]), // or [],
        payments: of([]), // or [],
        accounts: of([]), // or [],
        categories: of([]), // or [],
        contacts: of([]), // or [],
      };
    }

    return {
      transactions: database
        .get<Transaction>('transactions')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.sortBy('transaction_date', Q.desc)
        )
        .observe(),
      payments: database
        .get<Payment>('payments')
        .query(
          Q.where('shop_id', currentShop.id)
        )
        .observe(),
      accounts: database
        .get<CashAccount>('cash_accounts')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('is_active', true)
        )
        .observe(),
      categories: database
        .get<ExpenseCategory>('expense_categories')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('is_active', true)
        )
        .observe(),
      contacts: database
        .get<Contact>('contacts')
        .query(
          Q.where('shop_id', currentShop.id)
        )
        .observe(),
    };
  }
);

const TransactionsScreenWithObservables = enhance(TransactionsScreenInner);

// Main exported component
export default function TransactionsScreen() {
  const { currentShop } = useAuth();
  return <TransactionsScreenWithObservables currentShop={currentShop}/>;
}