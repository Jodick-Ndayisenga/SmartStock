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
import ExpenseCategory from '@/database/models/ExpenseCategory';
import { Q } from '@nozbe/watermelondb';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

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
    icon: 'money-check', // ✅ Valid FontAwesome5 icon
    color: '#f59e0b',
    iconColor: '#ffffff',
    gradient: ['#f59e0b', '#d97706']
  }
];

// Map transactionType to UI-friendly types
const getTransactionDisplayType = (transactionType: string): 'income' | 'expense' | 'transfer' => {
  if (['income', 'sale'].includes(transactionType)) return 'income';
  if (['expense', 'purchase'].includes(transactionType)) return 'expense';
  return 'transfer';
};

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
  }
};

// Enhanced transaction with resolved category
type EnhancedTransaction = Transaction & {
  displayType: 'income' | 'expense' | 'transfer';
  displayAmount: number;
  displayDescription: string;
  categoryName?: string;
};

// Quick Action Component
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
          items-center justify-center p-4 rounded-2xl
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
  const transactionType = TRANSACTION_TYPES[transaction.displayType];

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
            name={transactionType.icon} 
            size={20} 
            color={transactionType.color} 
          />
        </View>

        <View className="flex-1">
          <View className="flex-row justify-between items-center mb-1">
            <Text className={`text-base font-semibold ${isDark ? 'text-dark-text' : 'text-text'}`}>
              {transaction.displayDescription}
            </Text>
            <Text className={`text-base font-bold ${
              transaction.displayType === 'income' 
                ? 'text-success' 
                : transaction.displayType === 'expense'
                ? 'text-error'
                : isDark ? 'text-dark-text' : 'text-text'
            }`}>
              {transaction.displayType === 'income' ? '+' : '-'}
              {transaction.displayAmount.toLocaleString()}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
              {new Date(transaction.transactionDate).toLocaleDateString()}
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

// Export Modal Component (unchanged logic)
const ExportModal = ({ 
  visible, 
  onClose, 
  account,
  isDark 
}: { 
  visible: boolean; 
  onClose: () => void; 
  account: CashAccount;
  isDark: boolean;
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible]);

  const exportToPDF = async (period: string) => {
    try {
      setIsExporting(true);
      
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .title { font-size: 24px; font-weight: bold; color: #333; }
              .subtitle { color: #666; margin-bottom: 20px; }
              .info { margin-bottom: 20px; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .section { margin-top: 30px; }
              .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f5f5f5; }
              .positive { color: green; }
              .negative { color: red; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">${account.name} - Transaction Report</div>
              <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
            </div>
            <div class="info">
              <div class="info-row"><strong>Account Type:</strong> ${account.type}</div>
              <div class="info-row"><strong>Current Balance:</strong> ${account.currentBalance}</div>
              <div class="info-row"><strong>Currency:</strong> ${account.currency}</div>
            </div>
            <div class="section">
              <div class="section-title">Recent Transactions</div>
              <p>Transaction list would appear here...</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      const newUri = `${FileSystem.documentDirectory}${account.name.replace(/[^a-z0-9]/gi, '_')}_Report.pdf`;
      await FileSystem.moveAsync({ from: uri, to: newUri });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Export ${account.name} Report`
        });
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Report exported successfully!');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    { id: 'today', label: 'Today', icon: 'calendar-outline' },
    { id: 'week', label: 'This Week', icon: 'calendar-outline' },
    { id: 'month', label: 'This Month', icon: 'calendar-outline' },
    { id: 'custom', label: 'Custom Range', icon: 'calendar-outline' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <TouchableOpacity 
          className="flex-1" 
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View 
          style={{ 
            transform: [{ translateY: slideAnim }],
            height: '50%'
          }}
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden"
        >
          <View className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
            <View className={`p-6 border-b ${isDark ? 'border-dark-border' : 'border-border'}`}>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isDark ? 'bg-dark-brand/20' : 'bg-brand/10'}`}>
                    <Feather name="download" size={20} color={isDark ? '#38bdf8' : '#0ea5e9'} />
                  </View>
                  <Text className={`text-2xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>Export Report</Text>
                </View>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={28} color={isDark ? '#94a3b8' : '#64748b'} />
                </TouchableOpacity>
              </View>
              <Text className={`text-base ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                Select a time period to export transactions
              </Text>
            </View>

            <ScrollView className="p-6">
              <View className="space-y-3">
                {exportOptions.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => exportToPDF(option.id)}
                    disabled={isExporting}
                    className={`flex-row items-center p-4 rounded-2xl ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'} border ${isDark ? 'border-dark-border' : 'border-border'}`}
                  >
                    <View className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-4">
                      <Ionicons name={option.icon} size={20} color={isDark ? '#60a5fa' : '#3b82f6'} />
                    </View>
                    <Text className={`flex-1 text-base font-medium ${isDark ? 'text-dark-text' : 'text-text'}`}>{option.label}</Text>
                    <Ionicons name="chevron-forward" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View className={`p-6 border-t ${isDark ? 'border-dark-border' : 'border-border'}`}>
              <TouchableOpacity onPress={onClose} disabled={isExporting} className="py-4 rounded-xl items-center justify-center">
                <Text className={`text-base font-medium ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Main Component
export default function AccountDetailsScreen() {
  const { colorScheme } = useColorScheme();
  const { currentShop } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [account, setAccount] = useState<CashAccount | null>(null);
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
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
      
      const accountData = await database.get<CashAccount>('cash_accounts').find(accountId);
      setAccount(accountData);

      // Fetch transactions linked to this account via account_transactions
      // But your current model doesn't link transactions to accounts directly!
      // ⚠️ This is a critical issue.

      // Assuming you have an `account_transactions` table that links:
      // - cash_account_id → account.id
      // - transaction_id → transaction.id

      // For now, we'll simulate by fetching all transactions (not ideal)
      // You should ideally query account_transactions first, then get transaction IDs

      const allTransactions = await database.get<Transaction>('transactions')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.sortBy('transaction_date', Q.desc),
          Q.take(20)
        )
        .fetch();

      // Enhance transactions
      const enhancedTxs: EnhancedTransaction[] = [];
      let totalIncome = 0;
      let totalExpense = 0;

      for (const tx of allTransactions) {
        const displayType = getTransactionDisplayType(tx.transactionType);
        const displayAmount = tx.totalAmount;
        const displayDescription = tx.notes || tx.transactionNumber || 'No description';

        // Resolve category name if available
        let categoryName: string | undefined;
        if (tx.expenseCategoryId) {
          try {
            const category = await tx.expenseCategory?.fetch();
            categoryName = category?.name;
          } catch (e) {
            console.warn('Category fetch failed:', e);
          }
        }

        const enhancedTx: EnhancedTransaction = {
          ...tx,
          displayType,
          displayAmount,
          displayDescription,
          categoryName
        };

        enhancedTxs.push(enhancedTx);

        if (displayType === 'income') totalIncome += displayAmount;
        if (displayType === 'expense') totalExpense += displayAmount;
      }

      setTransactions(enhancedTxs.slice(0, 5)); // Show top 5

      const netFlow = totalIncome - totalExpense;
      setStats({
        totalIncome,
        totalExpense,
        netFlow,
        transactionCount: enhancedTxs.length
      });

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
      pathname: '/(tabs)/add-transaction',
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
      pathname: '/(tabs)/cash-accounts',
      params: { editAccountId: account?.id }
    });
  };

  const handleExport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowExportModal(true);
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const message = `💼 ${account?.name}\n💰 Balance: ${account?.currentBalance} ${account?.currency}\n📊 ${stats.transactionCount} transactions\n🏪 ${currentShop?.name}`;
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
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'}`}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#94a3b8' : '#64748b'} />
        }
      >
        <View className="px-6 pt-8 pb-6">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mr-3">
                <Ionicons name="arrow-back" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
              <View>
                <Text className={`text-2xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>Account Details</Text>
                <Text className={`text-base ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                  {account.isDefault ? 'Default Account • ' : ''}Updated just now
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

          <View className={`rounded-3xl p-6 mb-6 ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'} border-2 ${account.isDefault ? (isDark ? 'border-dark-brand' : 'border-brand') : (isDark ? 'border-dark-border' : 'border-border')}`}>
            <View className="flex-row items-start justify-between mb-6">
              <View className="flex-row items-center">
                <View className="w-16 h-16 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: isDark ? `${accountType.color}20` : accountType.gradient[1] }}>
                  <FontAwesome5 name={accountType.icon} size={28} color={accountType.color} />
                </View>
                <View>
                  <Text className={`text-2xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>{account.name}</Text>
                  <Text className={`text-base mt-1 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>{accountType.label} • {account.currency}</Text>
                </View>
              </View>
              <View className="items-end">
                <View className="flex-row items-center mb-2">
                  <View className={`w-3 h-3 rounded-full mr-2 ${account.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  <Text className={`text-sm ${isDark ? 'text-dark-text-muted' : 'text-text-muted'}`}>{account.isActive ? 'Active' : 'Inactive'}</Text>
                </View>
                {account.accountNumber && (
                  <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>#{account.accountNumber}</Text>
                )}
              </View>
            </View>

            <View className="items-center py-6 border-t border-b border-border dark:border-dark-border">
              <Text className={`text-base font-medium ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>Current Balance</Text>
              <Text className={`text-5xl font-bold mt-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>{currencySymbol}{account.currentBalance.toLocaleString()}</Text>
              <Text className={`text-sm mt-2 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>Opening: {currencySymbol}{account.openingBalance.toLocaleString()}</Text>
            </View>

            <View className="mt-6 space-y-3">
              {account.bankName && (
                <View className="flex-row items-center">
                  <Ionicons name="business-outline" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                  <Text className={`ml-3 text-base ${isDark ? 'text-dark-text' : 'text-text'}`}>{account.bankName}</Text>
                </View>
              )}
              {account.notes && (
                <View className="flex-row">
                  <Ionicons name="document-text-outline" size={18} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginTop: 2 }} />
                  <Text className={`ml-3 text-base flex-1 ${isDark ? 'text-dark-text' : 'text-text'}`}>{account.notes}</Text>
                </View>
              )}
            </View>
          </View>

          <View className="mb-8">
            <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>Quick Actions</Text>
            <View className="flex-row justify-between">
              <QuickActionButton icon="add-circle-outline" label="Add Income" color="#22c55e" onPress={() => handleAddTransaction('income')} isDark={isDark} />
              <QuickActionButton icon="remove-circle-outline" label="Add Expense" color="#ef4444" onPress={() => handleAddTransaction('expense')} isDark={isDark} />
              <QuickActionButton icon="swap-horizontal-outline" label="Transfer" color="#0ea5e9" onPress={() => handleAddTransaction('transfer')} isDark={isDark} />
              <QuickActionButton icon="download-outline" label="Export" color="#8b5cf6" onPress={handleExport} isDark={isDark} />
            </View>
          </View>

          <View className="mb-8">
            <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>Account Statistics</Text>
            <View className="flex-row gap-4">
              <StatCard icon="trending-up" label="Total Income" value={`${currencySymbol}${stats.totalIncome.toLocaleString()}`} change={stats.totalIncome > 0 ? `+${stats.totalIncome}` : undefined} color="#22c55e" isDark={isDark} />
              <StatCard icon="trending-down" label="Total Expense" value={`${currencySymbol}${stats.totalExpense.toLocaleString()}`} change={stats.totalExpense > 0 ? `-${stats.totalExpense}` : undefined} color="#ef4444" isDark={isDark} />
            </View>
            <View className="flex-row gap-4 mt-4">
              <StatCard icon="repeat" label="Transactions" value={stats.transactionCount.toString()} color="#0ea5e9" isDark={isDark} />
              <StatCard icon="pulse" label="Net Flow" value={`${currencySymbol}${Math.abs(stats.netFlow).toLocaleString()}`} change={stats.netFlow >= 0 ? `+${stats.netFlow}` : `${stats.netFlow}`} color={stats.netFlow >= 0 ? '#22c55e' : '#ef4444'} isDark={isDark} />
            </View>
          </View>

          <View>
            <View className="flex-row items-center justify-between mb-4">
              <Text className={`text-lg font-semibold ${isDark ? 'text-dark-text' : 'text-text'}`}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/transactions', params: { accountId: account.id } })}>
                <Text className={`text-base font-medium ${isDark ? 'text-dark-brand' : 'text-brand'}`}>View All</Text>
              </TouchableOpacity>
            </View>

            {transactions.length > 0 ? (
              <View>
                {transactions.map(transaction => (
                  <TransactionItem key={transaction.id} transaction={transaction} isDark={isDark} />
                ))}
              </View>
            ) : (
              <View className="items-center justify-center py-12">
                <View className="w-32 h-32 rounded-full bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mb-6">
                  <MaterialCommunityIcons name="cash-remove" size={60} color={isDark ? '#64748b' : '#94a3b8'} />
                </View>
                <Text className={`text-xl font-bold mb-3 text-center ${isDark ? 'text-dark-text' : 'text-text'}`}>No Transactions Yet</Text>
                <Text className={`text-base text-center mb-8 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>Start adding transactions to track your account activity</Text>
                <TouchableOpacity onPress={() => handleAddTransaction('income')} className={`flex-row items-center px-6 py-3 rounded-xl ${isDark ? 'bg-dark-brand' : 'bg-brand'}`}>
                  <Ionicons name="add" size={20} color="white" />
                  <Text className="text-white text-base font-semibold ml-2">Add First Transaction</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <View className="h-32" />
      </Animated.ScrollView>

      {account && (
        <ExportModal
          visible={showExportModal}
          onClose={() => setShowExportModal(false)}
          account={account}
          isDark={isDark}
        />
      )}

      <View className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface-soft/90 to-transparent dark:from-dark-surface/90 pointer-events-none" />
    </SafeAreaView>
  );
}