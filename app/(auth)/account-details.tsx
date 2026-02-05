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
import PremiumHeader from '@/components/layout/PremiumHeader';

interface TransactionRawRecord {
  id: string;
  shop_id: string;
  transaction_date: number;
  transaction_type: string;
  transaction_number: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: string;
  recorded_by: string;
  notes: string;
  expense_category_id: string | null;
  contact_id: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  due_date: number | null;
  is_business_expense: boolean;
  created_at: number;
  updated_at: number;
  last_sync_at: number | null;
  server_id: string | null;
  _status: string;
  _changed: string;
  _tableStatus: string;
  _lastSyncChanged: number;
  // Add other fields as needed
}

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

  const raw = transaction._raw as unknown as TransactionRawRecord;;
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
              {transaction.displayDescription.length > 25 
                ? `${transaction.displayDescription.slice(0, 25)}...`
                : transaction.displayDescription}
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
              {new Date(raw.transaction_date || Date.now()).toLocaleDateString()}
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

// Replace your existing ExportModal component with this enhanced version
const ExportModal = ({
  visible,
  onClose,
  account,
  transactions,
  stats,
  isDark
}: {
  visible: boolean;
  onClose: () => void;
  account: CashAccount;
  transactions: EnhancedTransaction[];
  stats: any;
  isDark: boolean;
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
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

  // Filter transactions based on selected period
  const filterTransactionsByPeriod = (period: string) => {
    const now = new Date();
    return transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate || Date.now());
      
      switch (period) {
        case 'today':
          return txDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return txDate >= weekAgo;
        case 'month':
          return txDate.getMonth() === now.getMonth() && 
                 txDate.getFullYear() === now.getFullYear();
        default:
          return true; // 'all' period
      }
    });
  };

  // Generate PDF HTML
  const generatePDFHTML = (period: string) => {
    const filteredTransactions = filterTransactionsByPeriod(period);
    const periodLabel = period === 'all' ? 'All Time' : 
                       period === 'today' ? 'Today' :
                       period === 'week' ? 'This Week' : 'This Month';
    
    const currencySymbol = account.currency === 'BIF' ? 'FBu' : '$';
    
    // Calculate period stats
    const periodStats = {
      income: filteredTransactions.filter(t => t.displayType === 'income')
                .reduce((sum, t) => sum + t.displayAmount, 0),
      expense: filteredTransactions.filter(t => t.displayType === 'expense')
                 .reduce((sum, t) => sum + t.displayAmount, 0),
      transfer: filteredTransactions.filter(t => t.displayType === 'transfer')
                 .reduce((sum, t) => sum + t.displayAmount, 0),
      count: filteredTransactions.length
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 40px;
            color: #1f2937;
            background: white;
            line-height: 1.6;
          }
          
          /* Header */
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 2px solid #e5e7eb;
          }
          
          .title {
            font-size: 32px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
          }
          
          .subtitle {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 12px;
          }
          
          .meta {
            display: flex;
            justify-content: center;
            gap: 20px;
            font-size: 14px;
            color: #9ca3af;
          }
          
          /* Account Info Card */
          .account-card {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 40px;
            border: 1px solid #e2e8f0;
          }
          
          .account-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 25px;
          }
          
          .account-name {
            font-size: 24px;
            font-weight: 600;
            color: #111827;
          }
          
          .account-balance {
            font-size: 28px;
            font-weight: 700;
            color: #059669;
          }
          
          .account-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
          
          .detail-item {
            margin-bottom: 15px;
          }
          
          .detail-label {
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
            margin-bottom: 4px;
          }
          
          .detail-value {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
          }
          
          /* Stats Grid */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 40px;
          }
          
          .stat-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid #e5e7eb;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          
          .stat-value {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          
          .stat-income { color: #059669; }
          .stat-expense { color: #dc2626; }
          .stat-transfer { color: #3b82f6; }
          .stat-count { color: #7c3aed; }
          
          .stat-label {
            font-size: 14px;
            color: #6b7280;
            font-weight: 500;
          }
          
          /* Transactions Table */
          .transactions-section {
            margin-top: 40px;
          }
          
          .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
          }
          
          .transaction-count {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 20px;
          }
          
          .transactions-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          
          .transactions-table th {
            background: #f8fafc;
            color: #374151;
            font-weight: 600;
            text-align: left;
            padding: 14px 16px;
            border-bottom: 2px solid #e5e7eb;
          }
          
          .transactions-table td {
            padding: 16px;
            border-bottom: 1px solid #f1f5f9;
          }
          
          .type-cell {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-weight: 500;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
          }
          
          .type-income { background: #d1fae5; color: #065f46; }
          .type-expense { background: #fee2e2; color: #991b1b; }
          .type-transfer { background: #dbeafe; color: #1e40af; }
          
          .amount-cell {
            font-weight: 600;
            font-size: 15px;
          }
          
          .amount-income { color: #059669; }
          .amount-expense { color: #dc2626; }
          .amount-transfer { color: #3b82f6; }
          
          .category-cell {
            font-size: 13px;
            color: #6b7280;
          }
          
          .date-cell {
            color: #6b7280;
            font-size: 13px;
          }
          
          /* Footer */
          .footer {
            margin-top: 60px;
            padding-top: 30px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #9ca3af;
            font-size: 13px;
          }
          
          .footer-note {
            margin-top: 8px;
            font-style: italic;
          }
          
          /* Responsive */
          @media print {
            body { padding: 20px; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .account-details { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <h1 class="title">Transaction Report</h1>
          <div class="subtitle">${account.name} • ${periodLabel}</div>
          <div class="meta">
            <span>Generated: ${new Date().toLocaleDateString()}</span>
            <span>•</span>
            <span>Account: ${account.type}</span>
            <span>•</span>
            <span>Currency: ${account.currency}</span>
          </div>
        </div>
        
        <!-- Account Info -->
        <div class="account-card">
          <div class="account-header">
            <div class="account-name">${account.name}</div>
            <div class="account-balance">${currencySymbol} ${account.currentBalance.toLocaleString()}</div>
          </div>
          <div class="account-details">
            <div class="detail-item">
              <div class="detail-label">Account Type</div>
              <div class="detail-value">${account.type}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Opening Balance</div>
              <div class="detail-value">${currencySymbol} ${account.openingBalance.toLocaleString()}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Status</div>
              <div class="detail-value">${account.isActive ? 'Active' : 'Inactive'}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Bank</div>
              <div class="detail-value">${account.bankName || 'Not specified'}</div>
            </div>
          </div>
        </div>
        
        <!-- Period Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value stat-income">${currencySymbol} ${periodStats.income.toLocaleString()}</div>
            <div class="stat-label">Total Income</div>
          </div>
          <div class="stat-card">
            <div class="stat-value stat-expense">${currencySymbol} ${periodStats.expense.toLocaleString()}</div>
            <div class="stat-label">Total Expense</div>
          </div>
          <div class="stat-card">
            <div class="stat-value stat-transfer">${currencySymbol} ${periodStats.transfer.toLocaleString()}</div>
            <div class="stat-label">Total Transfer</div>
          </div>
          <div class="stat-card">
            <div class="stat-value stat-count">${periodStats.count}</div>
            <div class="stat-label">Transactions</div>
          </div>
        </div>
        
        <!-- Transactions -->
        <div class="transactions-section">
          <h2 class="section-title">Transaction Details</h2>
          <div class="transaction-count">Showing ${filteredTransactions.length} transactions</div>
          
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map(transaction => {
                const typeClass = transaction.displayType;
                const typeConfig = TRANSACTION_TYPES[transaction.displayType];
                
                return `
                  <tr>
                    <td class="date-cell">
                      ${new Date(transaction.transactionDate || Date.now()).toLocaleDateString()}
                    </td>
                    <td>
                      <span class="type-cell type-${typeClass}">
                        ${typeConfig.label}
                      </span>
                    </td>
                    <td style="font-weight: 500;">${transaction.displayDescription}</td>
                    <td class="category-cell">${transaction.categoryName || '-'}</td>
                    <td class="amount-cell amount-${typeClass}">
                      ${transaction.displayType === 'income' ? '+' : '-'}
                      ${currencySymbol} ${transaction.displayAmount.toLocaleString()}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div>Report generated by ${account.bankName || 'Finance App'}</div>
          <div class="footer-note">Total Balance: ${currencySymbol} ${account.currentBalance.toLocaleString()}</div>
        </div>
      </body>
      </html>
    `;
  };

  const exportToPDF = async (period: string) => {
    try {
      setIsExporting(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const html = generatePDFHTML(period);
      
      const { uri } = await Print.printToFileAsync({ 
        html,
        width: 595,  // A4 width in points
        height: 842, // A4 height in points
        margins: {
          top: 40,
          bottom: 40,
          left: 40,
          right: 40
        }
      });
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${account.name.replace(/[^a-z0-9]/gi, '_')}_Report_${timestamp}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.moveAsync({ from: uri, to: newUri });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Export ${account.name} Report`,
          UTI: 'com.adobe.pdf'
        });
      }
      
      Alert.alert('Success', 'Report exported and shared successfully!');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const periodOptions = [
    { id: 'today', label: 'Today', icon: 'today-outline' },
    { id: 'week', label: 'This Week', icon: 'calendar-outline' },
    { id: 'month', label: 'This Month', icon: 'calendar-outline' },
    { id: 'all', label: 'All Time', icon: 'time-outline' },
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
            height: '65%'
          }}
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden"
        >
          <View className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
            {/* Header */}
            <View className={`p-6 border-b ${isDark ? 'border-dark-border' : 'border-border'}`}>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View className={`w-12 h-12 rounded-xl items-center justify-center mr-3 ${isDark ? 'bg-dark-brand/20' : 'bg-brand/10'}`}>
                    <Feather name="file-text" size={24} color={isDark ? '#38bdf8' : '#0ea5e9'} />
                  </View>
                  <View>
                    <Text className={`text-2xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                      Export Report
                    </Text>
                    <Text className={`text-sm mt-1 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                      ${account.currentBalance.toLocaleString()} • ${transactions.length} transactions
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={onClose}
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Ionicons name="close" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
              {/* Period Selection */}
              <View className="mb-8">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className={`text-lg font-semibold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                    Select Period
                  </Text>
                  <View className="px-3 py-1 rounded-full bg-surface-muted dark:bg-dark-surface-muted">
                    <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                      {filterTransactionsByPeriod(selectedPeriod).length} transactions
                    </Text>
                  </View>
                </View>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                  <View className="flex-row gap-3">
                    {periodOptions.map(option => (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => setSelectedPeriod(option.id)}
                        className={`
                          flex-row items-center px-4 py-3 rounded-xl min-w-[120px]
                          ${selectedPeriod === option.id 
                            ? isDark ? 'bg-dark-brand' : 'bg-brand'
                            : isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'
                          }
                          border ${isDark ? 'border-dark-border' : 'border-border'}
                        `}
                      >
                        <Ionicons 
                          name={option?.icon} 
                          size={20} 
                          color={selectedPeriod === option.id ? 'white' : (isDark ? '#94a3b8' : '#64748b')} 
                          style={{ marginRight: 8 }}
                        />
                        <Text 
                          className={`font-medium ${
                            selectedPeriod === option.id 
                              ? 'text-white' 
                              : isDark ? 'text-dark-text' : 'text-text'
                          }`}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Report Preview */}
              <View className={`rounded-2xl p-5 mb-8 ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'} border ${isDark ? 'border-dark-border' : 'border-border'}`}>
                <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                  Report Preview
                </Text>
                
                <View className="space-y-4">
                  <View className="flex-row items-center justify-between">
                    <Text className={`${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>Account</Text>
                    <Text className={`font-semibold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                      {account.name}
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center justify-between">
                    <Text className={`${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>Period</Text>
                    <Text className={`font-semibold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                      {periodOptions.find(o => o.id === selectedPeriod)?.label}
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center justify-between">
                    <Text className={`${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>Transactions</Text>
                    <Text className="font-semibold text-brand">
                      {filterTransactionsByPeriod(selectedPeriod).length} items
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center justify-between">
                    <Text className={`${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>Format</Text>
                    <View className="flex-row items-center">
                      <Ionicons name="document-text-outline" size={18} color={isDark ? '#38bdf8' : '#0ea5e9'} />
                      <Text className={`font-semibold ml-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                        PDF Document
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Export Button */}
              <TouchableOpacity
                onPress={() => exportToPDF(selectedPeriod)}
                disabled={isExporting}
                className={`
                  flex-row items-center justify-center py-4 rounded-xl mb-6
                  ${isExporting ? 'opacity-70' : ''}
                  ${isDark ? 'bg-dark-brand' : 'bg-brand'}
                `}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={22} color="white" style={{ marginRight: 10 }} />
                    <Text className="text-white text-lg font-semibold">
                      Generate & Export PDF
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Info Note */}
              <View className={`rounded-xl p-4 ${isDark ? 'bg-dark-surface-muted/50' : 'bg-surface-muted/50'} border ${isDark ? 'border-dark-border/50' : 'border-border/50'}`}>
                <View className="flex-row items-start">
                  <Ionicons name="information-circle-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginTop: 2, marginRight: 10 }} />
                  <Text className={`text-sm flex-1 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                    The report will include all transactions, account details, and summary statistics. 
                    Generated PDF will be saved and shared via your device's sharing options.
                  </Text>
                </View>
              </View>
            </ScrollView>
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
          Q.or(
            Q.where('source_account_id', accountId), // Transfers OUT of this account
            Q.where('destination_account_id', accountId), // Transfers INTO this account
            // For income/expense, we need to check AccountTransaction table
          ),
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
        //console.log(tx.transactionDate, Date.now());

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

      setTransactions(enhancedTxs.slice(0, 20)); // Show top 5

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
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mr-3">
                <Ionicons name="arrow-back" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
              <View>
                <Text className={`text-2xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>Cash Flow History</Text>
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
              <Text className={`text-4xl font-bold mt-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>{currencySymbol} {account.currentBalance.toLocaleString()}</Text>
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
                  <Text className={`ml-3 text-base flex-1 ${isDark ? 'text-dark-text' : 'text-text'}`}>{account.notes.length > 40 ? `${account.notes.slice(0, 40)}...` : account.notes}</Text>
                </View>
              )}
            </View>
          </View>

          <View className="mb-8">
            <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>Quick Actions</Text>
            <View className="flex-row justify-between gap-1">
              <QuickActionButton icon="add-circle-outline" label="Add Income" color="#22c55e" onPress={() => handleAddTransaction('income')} isDark={isDark} />
              <QuickActionButton icon="remove-circle-outline" label="Add Expense" color="#ef4444" onPress={() => handleAddTransaction('expense')} isDark={isDark} />
              <QuickActionButton icon="swap-horizontal-outline" label="Transfer" color="#0ea5e9" onPress={() => handleAddTransaction('transfer')} isDark={isDark} />
              {/* <QuickActionButton icon="download-outline" label="Export" color="#8b5cf6" onPress={handleExport} isDark={isDark} /> */}
              <QuickActionButton 
                icon="download-outline" 
                label="Export" 
                color="#8b5cf6" 
                onPress={() => setShowExportModal(true)} 
                isDark={isDark} 
              />
            </View>
          </View>

          <View className="mb-8">
            <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>Account Statistics</Text>
            <View className="flex-row gap-4">
              <StatCard icon="trending-up" label="Total Income" value={`${currencySymbol} ${stats.totalIncome.toLocaleString()}`} change={stats.totalIncome > 0 ? `+${stats.totalIncome}` : undefined} color="#22c55e" isDark={isDark} />
              <StatCard icon="trending-down" label="Total Expense" value={`${currencySymbol} ${stats.totalExpense.toLocaleString()}`} change={stats.totalExpense > 0 ? `-${stats.totalExpense}` : undefined} color="#ef4444" isDark={isDark} />
            </View>
            <View className="flex-row gap-4 mt-4">
              <StatCard icon="repeat" label="Transactions" value={stats.transactionCount.toString()} color="#0ea5e9" isDark={isDark} />
              <StatCard icon="pulse" label="Net Flow" value={`${currencySymbol} ${Math.abs(stats.netFlow).toLocaleString()}`} change={stats.netFlow >= 0 ? `+${stats.netFlow}` : `${stats.netFlow}`} color={stats.netFlow >= 0 ? '#22c55e' : '#ef4444'} isDark={isDark} />
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
          transactions={transactions}
          stats={stats}
          isDark={isDark}
        />
      )}

      <View className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface-soft/90 to-transparent dark:from-dark-surface/90 pointer-events-none" />
    </View>
  );
}