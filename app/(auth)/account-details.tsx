
// app/(tabs)/account-details.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  Ionicons, 
  MaterialCommunityIcons, 
  Feather, 
  FontAwesome5
} from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { CashAccount } from '@/database/models/CashAccount';
import Transaction from '@/database/models/Transaction';
import { AccountTransaction } from '@/database/models/AccountTransaction';
import { Contact } from '@/database/models/Contact';
import AccountReportGenerator from '@/components/AccountReportGenerator';
import { Q } from '@nozbe/watermelondb';
import * as Haptics from 'expo-haptics';
import PremiumHeader from '@/components/layout/PremiumHeader';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Account type configuration
const ACCOUNT_TYPES = [
  {
    id: 'cash',
    label: 'Cash',
    icon: 'money-bill-wave',
    color: '#22c55e',
    iconColor: '#ffffff',
    gradient: ['#22c55e', '#16a34a']
  },
  {
    id: 'bank_account',
    label: 'Bank Account',
    icon: 'university',
    color: '#0ea5e9',
    iconColor: '#ffffff',
    gradient: ['#0ea5e9', '#0284c7']
  },
  {
    id: 'mobile_money',
    label: 'Mobile Money',
    icon: 'mobile-alt',
    color: '#8b5cf6',
    iconColor: '#ffffff',
    gradient: ['#8b5cf6', '#7c3aed']
  },
  {
    id: 'credit_card',
    label: 'Credit Card',
    icon: 'credit-card',
    color: '#ef4444',
    iconColor: '#ffffff',
    gradient: ['#ef4444', '#dc2626']
  },
  {
    id: 'petty_cash',
    label: 'Petty Cash',
    icon: 'money-check',
    color: '#f59e0b',
    iconColor: '#ffffff',
    gradient: ['#f59e0b', '#d97706']
  },
  {
    id: 'receivable',
    label: 'Accounts Receivable',
    icon: 'hand-holding-usd',
    color: '#06b6d4',
    iconColor: '#ffffff',
    gradient: ['#06b6d4', '#0891b2']
  }
];

// Transaction display types
const TRANSACTION_TYPES = {
  income: {
    label: 'Income',
    icon: 'arrow-down-circle',
    color: '#22c55e',
    bgColor: '#dcfce7'
  },
  expense: {
    label: 'Expense',
    icon: 'arrow-up-circle',
    color: '#ef4444',
    bgColor: '#fee2e2'
  },
  transfer: {
    label: 'Transfer',
    icon: 'swap-horizontal',
    color: '#0ea5e9',
    bgColor: '#e0f2fe'
  },
  receivable: {
    label: 'Receivable',
    icon: 'receipt-outline',
    color: '#06b6d4',
    bgColor: '#cffafe'
  },
  receivable_payment: {
    label: 'Payment Received',
    icon: 'cash-outline',
    color: '#22c55e',
    bgColor: '#dcfce7'
  }
};

interface EnhancedTransaction {
  id: string;
  accountTransactionId: string;
  date: number;
  type: string;
  description: string;
  amount: number;
  category?: string;
  reference?: string;
  transactionId?: string;
  paymentId?: string;
  balanceBefore: number;
  balanceAfter: number;
  displayType: 'income' | 'expense' | 'transfer';
  displayAmount: number;
  displayDescription: string;
  categoryName?: string;
}

// Quick Action Button Component
const QuickActionButton = ({ 
  icon, 
  label, 
  color, 
  onPress,
  isDark 
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string; 
  color: string; 
  onPress: () => void;
  isDark: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        className={`
          items-center justify-center p-4 rounded-2xl flex-1 mx-1
          ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
          border ${isDark ? 'border-dark-border' : 'border-border'}
        `}
      >
        <View 
          className="w-12 h-12 rounded-xl items-center justify-center mb-2"
          style={{ backgroundColor: `${color}20` }}
        >
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text className={`text-sm font-medium text-center ${isDark ? 'text-dark-text' : 'text-text'}`}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Transaction Item Component
const TransactionItem = ({ 
  transaction,
  isDark 
}: { 
  transaction: EnhancedTransaction;
  isDark: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const transactionType = TRANSACTION_TYPES[transaction.displayType as keyof typeof TRANSACTION_TYPES] || TRANSACTION_TYPES.expense;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getAmountColor = () => {
    if (transaction.displayType === 'income') return 'text-success';
    if (transaction.displayType === 'expense') return 'text-error';
    return isDark ? 'text-dark-text' : 'text-text';
  };

  const getAmountSign = () => {
    if (transaction.displayType === 'income') return '+';
    if (transaction.displayType === 'expense') return '-';
    return '';
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        className={`
          flex-row items-center p-4 rounded-2xl mb-3
          ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
          border ${isDark ? 'border-dark-border' : 'border-border'}
        `}
      >
        <View 
          className="w-12 h-12 rounded-xl items-center justify-center mr-4"
          style={{ backgroundColor: isDark ? `${transactionType.color}20` : transactionType.bgColor }}
        >
          <Ionicons 
            name={transactionType.icon as any} 
            size={20} 
            color={transactionType.color} 
          />
        </View>

        <View className="flex-1">
          <View className="flex-row justify-between items-center mb-1">
            <Text className={`text-base font-semibold flex-1 ${isDark ? 'text-dark-text' : 'text-text'}`}>
              {transaction.displayDescription}
            </Text>
            <Text className={`text-base font-bold ${getAmountColor()}`}>
              {getAmountSign()} {transaction.displayAmount.toLocaleString()}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
              {new Date(transaction.date).toLocaleDateString()}
            </Text>
            {transaction.categoryName && (
              <>
                <Text className="mx-2 text-text-muted dark:text-dark-text-muted">•</Text>
                <View className="px-2 py-1 rounded-full bg-surface-muted dark:bg-dark-surface-muted">
                  <Text className="text-xs text-text-soft dark:text-dark-text-soft">
                    {transaction.categoryName}
                  </Text>
                </View>
              </>
            )}
            {transaction.reference && (
              <>
                <Text className="mx-2 text-text-muted dark:text-dark-text-muted">•</Text>
                <Text className={`text-xs ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                  Ref: {transaction.reference}
                </Text>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity className="ml-2">
          <Ionicons 
            name="ellipsis-vertical" 
            size={20} 
            color={isDark ? '#94a3b8' : '#64748b'} 
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Statistics Card Component
const StatCard = ({ 
  icon, 
  label, 
  value, 
  change, 
  color,
  isDark 
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string; 
  value: string; 
  change?: string; 
  color: string;
  isDark: boolean;
}) => (
  <View className={`
    flex-1 rounded-2xl p-4
    ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
    border ${isDark ? 'border-dark-border' : 'border-border'}
  `}>
    <View className="flex-row items-center mb-2">
      <View 
        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: isDark ? `${color}20` : `${color}15` }}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text className={`text-lg font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
        {value}
      </Text>
    </View>
    <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
      {label}
    </Text>
    {change && (
      <View className="flex-row items-center mt-2">
        <Feather 
          name={change.startsWith('+') ? 'trending-up' : 'trending-down'} 
          size={14} 
          color={change.startsWith('+') ? '#22c55e' : '#ef4444'} 
        />
        <Text className={`text-xs ml-1 ${
          change.startsWith('+') ? 'text-success' : 'text-error'
        }`}>
          {change}
        </Text>
      </View>
    )}
  </View>
);

// Main Component
export default function AccountDetailsScreen() {
  const { colorScheme } = useColorScheme();
  const { currentShop } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [account, setAccount] = useState<CashAccount | null>(null);
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netFlow: 0,
    transactionCount: 0
  });

  const isDark = colorScheme === 'dark';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const loadAccountData = async () => {
    if (!currentShop || !params.accountId) return;

    try {
      const accountId = params.accountId as string;
      
      // Load account details
      const accountData = await database.get<CashAccount>('cash_accounts').find(accountId);
      setAccount(accountData);

      // Load customers for reference
      const customersData = await database.get<Contact>('contacts')
        .query(Q.where('shop_id', currentShop.id))
        .fetch();
      setCustomers(customersData);

      // Query all account transactions for this account
      const accountTransactions = await database.get<AccountTransaction>('account_transactions')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('cash_account_id', accountId),
          Q.sortBy('transaction_date', Q.desc),
          Q.take(100)
        )
        .fetch();

      // Process and enhance transactions
      const enhancedTxs: EnhancedTransaction[] = [];
      let totalIncome = 0;
      let totalExpense = 0;

      for (const accTx of accountTransactions) {
        // Determine display type based on account transaction type and amount
        let displayType: 'income' | 'expense' | 'transfer' = 'expense';
        let displayAmount = Math.abs(accTx.amount);
        
        // Determine if this is income or expense for this account
        if (accTx.type === 'income' || accTx.type === 'deposit' || 
            (accTx.type === 'receivable' && accTx.amount > 0) ||
            (accTx.type === 'receivable_payment' && accTx.amount < 0)) {
          displayType = 'income';
          totalIncome += displayAmount;
        } 
        else if (accTx.type === 'expense' || accTx.type === 'withdrawal' ||
                 (accTx.type === 'receivable' && accTx.amount < 0) ||
                 (accTx.type === 'receivable_payment' && accTx.amount > 0)) {
          displayType = 'expense';
          totalExpense += displayAmount;
        }
        else if (accTx.type === 'transfer_out') {
          displayType = 'expense';
          totalExpense += displayAmount;
        }
        else if (accTx.type === 'transfer_in') {
          displayType = 'income';
          totalIncome += displayAmount;
        }

        // Get friendly description
        let displayDescription = accTx.description || 'Transaction';
        
        // Try to fetch linked transaction for more details if available
        if (accTx.transactionId) {
          try {
            const transaction = await database.get<Transaction>('transactions').find(accTx.transactionId);
            if (transaction) {
              if (transaction.transactionType === 'sale') {
                displayDescription = `Sale #${transaction.transactionNumber}`;
                if (transaction.contactId) {
                  const customer = customersData.find(c => c.id === transaction.contactId);
                  if (customer) displayDescription += ` - ${customer.name}`;
                }
              } else if (transaction.transactionType === 'expense') {
                displayDescription = transaction.notes || `Expense #${transaction.transactionNumber}`;
              } else if (transaction.transactionType === 'transfer') {
                displayDescription = `Transfer #${transaction.transactionNumber}`;
                if (transaction.destinationAccountId === accountId) {
                  displayType = 'income';
                  displayDescription = `Transfer Received - ${transaction.transactionNumber}`;
                } else if (transaction.sourceAccountId === accountId) {
                  displayType = 'expense';
                  displayDescription = `Transfer Sent - ${transaction.transactionNumber}`;
                }
              }
            }
          } catch (e) {
            // Transaction not found, use original description
          }
        }

        // Create enhanced transaction object
        const enhancedTx: EnhancedTransaction = {
          id: accTx.id,
          accountTransactionId: accTx.id,
          date: accTx.transactionDate,
          type: accTx.type,
          description: accTx.description,
          amount: accTx.amount,
          category: accTx.category,
          reference: accTx.reference,
          transactionId: accTx.transactionId,
          paymentId: accTx.paymentId,
          balanceBefore: accTx.balanceBefore,
          balanceAfter: accTx.balanceAfter,
          displayType,
          displayAmount,
          displayDescription,
          categoryName: accTx.category || (accTx.type === 'income' ? 'Sales' : 
                                          accTx.type === 'receivable' ? 'Credit Sale' : 
                                          accTx.type === 'receivable_payment' ? 'Payment' : 'General')
        };

        enhancedTxs.push(enhancedTx);
      }

      setTransactions(enhancedTxs);
      
      const netFlow = totalIncome - totalExpense;
      setStats({
        totalIncome,
        totalExpense,
        netFlow,
        transactionCount: enhancedTxs.length
      });

      // Animate content
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true })
      ]).start();

    } catch (error) {
      console.error('Error loading account details:', error);
      Alert.alert('Error', 'Failed to load account details');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAccountData();
  }, [params.accountId, currentShop]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAccountData();
  };

  const handleAddTransaction = (type: 'income' | 'expense' | 'transfer') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(auth)/add-transaction',
      params: {
        accountId: account?.id,
        accountName: account?.name,
        transactionType: type
      }
    });
  };

  const handleEditAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(auth)/edit-account',
      params: { accountId: account?.id }
    });
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const currencySymbol = account?.currency === 'BIF' ? 'FBu' : '$';
      const message = `💼 ${account?.name}\n💰 Balance: ${currencySymbol} ${account?.currentBalance?.toLocaleString()}\n📊 ${stats.transactionCount} transactions\n📈 Income: ${currencySymbol} ${stats.totalIncome.toLocaleString()}\n📉 Expenses: ${currencySymbol} ${stats.totalExpense.toLocaleString()}\n🏪 ${currentShop?.name}`;
      await Share.share({ message, title: `Account Summary - ${account?.name}` });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getAccountType = (typeId: string) => {
    return ACCOUNT_TYPES.find(t => t.id === typeId) || ACCOUNT_TYPES[0];
  };

  if (isLoading || !account) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'}`}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDark ? '#38bdf8' : '#0ea5e9'} />
          <Text className={`text-base mt-4 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
            Loading account details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const accountType = getAccountType(account.type);
  const currencySymbol = account.currency === 'BIF' ? 'FBu' : '$';

  return (
    <View className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'}`}>
      <PremiumHeader title='Account Information' showBackButton subtitle='Money movement details and history'/>
      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#94a3b8' : '#64748b'} />
        }
      >
        <View className="px-2 pt-8 pb-6">
          {/* Header with Actions */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mr-3">
                <Ionicons name="arrow-back" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
              <View>
                <Text className={`text-2xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                  {account.name}
                </Text>
                <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                  {accountType.label} • {account.currency}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity onPress={handleShare} className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mr-2">
                <Ionicons name="share-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEditAccount} className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-dark-surface-muted items-center justify-center">
                <Ionicons name="create-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Balance Card */}
          <View className={`rounded-3xl p-6 mb-6 ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'} border ${isDark ? 'border-dark-border' : 'border-border'}`}>
            <View className="flex-row items-start justify-between mb-6">
              <View className="flex-row items-center">
                <View className="w-14 h-14 rounded-2xl items-center justify-center mr-4" 
                  style={{ backgroundColor: isDark ? `${accountType.color}20` : `${accountType.color}15` }}>
                  <FontAwesome5 name={accountType.icon} size={24} color={accountType.color} />
                </View>
                <View>
                  <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                    Current Balance
                  </Text>
                  <Text className={`text-3xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                    {currencySymbol} {account.currentBalance?.toLocaleString() || '0'}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <View className="flex-row items-center mb-1">
                  <View className={`w-2 h-2 rounded-full mr-2 ${account.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  <Text className={`text-xs ${isDark ? 'text-dark-text-muted' : 'text-text-muted'}`}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <Text className={`text-xs ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                  Opening: {currencySymbol}{account.openingBalance?.toLocaleString() || '0'}
                </Text>
              </View>
            </View>

            {/* Account Details */}
            {(account.bankName || account.accountNumber || account.notes) && (
              <View className="mt-4 pt-4 border-t border-border dark:border-dark-border">
                {account.bankName && (
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="business-outline" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                    <Text className={`ml-2 text-sm ${isDark ? 'text-dark-text' : 'text-text'}`}>
                      {account.bankName}
                    </Text>
                  </View>
                )}
                {account.accountNumber && (
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="card-outline" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                    <Text className={`ml-2 text-sm ${isDark ? 'text-dark-text' : 'text-text'}`}>
                      Account: {account.accountNumber}
                    </Text>
                  </View>
                )}
                {account.notes && (
                  <View className="flex-row">
                    <Ionicons name="document-text-outline" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                    <Text className={`ml-2 text-sm flex-1 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                      {account.notes}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View className="mb-8">
            <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>
              Quick Actions
            </Text>
            <View className="flex-row justify-between gap-2">
              <QuickActionButton 
                icon="add-circle-outline" 
                label="Add Income" 
                color="#22c55e" 
                onPress={() => handleAddTransaction('income')} 
                isDark={isDark} 
              />
              <QuickActionButton 
                icon="remove-circle-outline" 
                label="Add Expense" 
                color="#ef4444" 
                onPress={() => handleAddTransaction('expense')} 
                isDark={isDark} 
              />
              <QuickActionButton 
                icon="swap-horizontal-outline" 
                label="Transfer" 
                color="#0ea5e9" 
                onPress={() => handleAddTransaction('transfer')} 
                isDark={isDark} 
              />
              <QuickActionButton 
                icon="download-outline" 
                label="Export" 
                color="#8b5cf6" 
                onPress={() => setShowExportModal(true)} 
                isDark={isDark} 
              />
            </View>
          </View>

          {/* Statistics */}
          <View className="mb-8">
            <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>
              Statistics
            </Text>
            <View className="flex-row gap-4">
              <StatCard 
                icon="trending-up" 
                label="Total Income" 
                value={`${currencySymbol} ${stats.totalIncome.toLocaleString()}`} 
                color="#22c55e" 
                isDark={isDark} 
              />
              <StatCard 
                icon="trending-down" 
                label="Total Expense" 
                value={`${currencySymbol} ${stats.totalExpense.toLocaleString()}`} 
                color="#ef4444" 
                isDark={isDark} 
              />
            </View>
            <View className="flex-row gap-4 mt-4">
              <StatCard 
                icon="repeat" 
                label="Transactions" 
                value={stats.transactionCount.toString()} 
                color="#0ea5e9" 
                isDark={isDark} 
              />
              <StatCard 
                icon="pulse" 
                label="Net Flow" 
                value={`${currencySymbol} ${Math.abs(stats.netFlow).toLocaleString()}`} 
                change={stats.netFlow >= 0 ? `+${stats.netFlow.toLocaleString()}` : `${stats.netFlow.toLocaleString()}`}
                color={stats.netFlow >= 0 ? '#22c55e' : '#ef4444'} 
                isDark={isDark} 
              />
            </View>
          </View>

          {/* Recent Transactions */}
          <View>
            <View className="flex-row items-center justify-between mb-4">
              <Text className={`text-lg font-semibold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                Transaction History
              </Text>
              <TouchableOpacity 
                onPress={() => router.push({ 
                  pathname: '/(tabs)/transactions', 
                  params: { accountId: account.id } 
                })}
              >
                <Text className={`text-sm font-medium ${isDark ? 'text-dark-brand' : 'text-brand'}`}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            {transactions.length > 0 ? (
              <View>
                {transactions.slice(0, 10).map(transaction => (
                  <TransactionItem 
                    key={transaction.id} 
                    transaction={transaction} 
                    isDark={isDark} 
                  />
                ))}
                {transactions.length > 10 && (
                  <TouchableOpacity 
                    onPress={() => router.push({ 
                      pathname: `/shops/${currentShop?.id}/transactions`, 
                      params: { accountId: account.id } 
                    })}
                    className={`mt-2 py-3 rounded-xl items-center ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}`}
                  >
                    <Text className={`text-sm font-medium ${isDark ? 'text-dark-brand' : 'text-brand'}`}>
                      View All {transactions.length} Transactions
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View className="items-center justify-center py-12">
                <View className="w-32 h-32 rounded-full bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mb-6">
                  <MaterialCommunityIcons name="cash-remove" size={60} color={isDark ? '#64748b' : '#94a3b8'} />
                </View>
                <Text className={`text-xl font-bold mb-3 text-center ${isDark ? 'text-dark-text' : 'text-text'}`}>
                  No Transactions Yet
                </Text>
                <Text className={`text-base text-center mb-8 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                  Start adding transactions to track your account activity
                </Text>
                <TouchableOpacity 
                  onPress={() => handleAddTransaction('income')} 
                  className={`flex-row items-center px-6 py-3 rounded-xl ${isDark ? 'bg-dark-brand' : 'bg-brand'}`}
                >
                  <Ionicons name="add" size={20} color="white" />
                  <Text className="text-white text-base font-semibold ml-2">Add First Transaction</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <View className="h-32" />
      </Animated.ScrollView>

      {/* Export Modal */}
      {account && (
      <AccountReportGenerator
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        account={account}
        transactions={transactions}
        stats={stats}
        shopName={currentShop?.name || 'Business'}
        isDark={isDark}
      />
    )}
    </View>
  );
}