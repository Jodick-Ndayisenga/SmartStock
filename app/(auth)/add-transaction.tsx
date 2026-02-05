// app/(tabs)/add-transaction.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  Ionicons, 
  MaterialCommunityIcons,
  FontAwesome5
} from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/context/AuthContext';
import { CashAccount } from '@/database/models/CashAccount';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import  Transaction from '@/database/models/Transaction';
import { Payment } from '@/database/models/Payment';
import { AccountTransaction } from '@/database/models/AccountTransaction';
import { createTransactionWithPayments, TransactionData } from '@/services/transactionService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TransactionType = 'income' | 'expense' | 'transfer';
type TransactionCategory = 
  | 'sales' | 'purchase' | 'salary' | 'rent' | 'utilities' 
  | 'transport' | 'marketing' | 'maintenance' | 'other';

const TRANSACTION_TYPES: { 
  id: TransactionType; 
  label: string; 
  icon: keyof typeof Ionicons.glyphMap; 
  color: string;
}[] = [
  { id: 'income', label: 'Income', icon: 'arrow-down-circle', color: '#22c55e' },
  { id: 'expense', label: 'Expense', icon: 'arrow-up-circle', color: '#ef4444' },
  { id: 'transfer', label: 'Transfer', icon: 'swap-horizontal', color: '#0ea5e9' },
];

const CATEGORIES: { id: TransactionCategory; label: string; icon: string }[] = [
  { id: 'sales', label: 'Sales', icon: '💰' },
  { id: 'purchase', label: 'Purchase', icon: '🛒' },
  { id: 'salary', label: 'Salary', icon: '👨‍💼' },
  { id: 'rent', label: 'Rent', icon: '🏠' },
  { id: 'utilities', label: 'Utilities', icon: '💡' },
  { id: 'transport', label: 'Transport', icon: '🚚' },
  { id: 'marketing', label: 'Marketing', icon: '📢' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { id: 'other', label: 'Other', icon: '📦' },
];

// Account Selection Modal
const AccountModal = ({ 
  visible, 
  onClose, 
  accounts, 
  onSelect,
  isDark 
}: { 
  visible: boolean; 
  onClose: () => void; 
  accounts: CashAccount[]; 
  onSelect: (account: CashAccount) => void;
  isDark: boolean;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View className="flex-1 bg-black/50">
      <TouchableOpacity 
        className="flex-1" 
        activeOpacity={1}
        onPress={onClose}
      />
      
      <View className={`
        h-2/3 rounded-t-3xl overflow-hidden
        ${isDark ? 'bg-dark-surface' : 'bg-surface'}
      `}>
        {/* Header */}
        <View className={`
          p-6 border-b ${isDark ? 'border-dark-border' : 'border-border'}
        `}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`text-2xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
              Select Account
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons 
                name="close" 
                size={28} 
                color={isDark ? '#94a3b8' : '#64748b'} 
              />
            </TouchableOpacity>
          </View>
          <Text className={`text-base ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
            Choose an account for this transaction
          </Text>
        </View>

        {/* Accounts List */}
        <ScrollView className="p-4">
          {accounts.map(account => (
            <TouchableOpacity
              key={account.id}
              onPress={() => {
                onSelect(account);
                onClose();
              }}
              className={`
                flex-row items-center p-4 rounded-2xl mb-3
                ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
                border ${isDark ? 'border-dark-border' : 'border-border'}
              `}
            >
              <View className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-4">
                <FontAwesome5 
                  name={account.type === 'cash' ? 'money-bill-wave' : 
                         account.type === 'bank_account' ? 'university' : 
                         account.type === 'mobile_money' ? 'mobile-alt' : 
                         account.type === 'credit_card' ? 'credit-card' : 'wallet'} 
                  size={20} 
                  color={isDark ? '#60a5fa' : '#3b82f6'} 
                />
              </View>
              <View className="flex-1">
                <Text className={`font-semibold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                  {account.name}
                </Text>
                <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                  {account.type.replace('_', ' ')} • {account.currency}
                </Text>
              </View>
              <Text className={`font-bold text-lg ${isDark ? 'text-dark-text' : 'text-text'}`}>
                {account.currency === 'BIF' ? 'FBu' : '$'}{account.currentBalance.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

export default function AddTransactionScreen() {
  const { colorScheme } = useColorScheme();
  const { currentShop, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    description: '',
    category: 'other' as TransactionCategory,
    accountId: '',
    targetAccountId: '', // For transfers
    date: new Date(),
    notes: '',
    reference: '',
    attachment: '',
  });

  const isDark = colorScheme === 'dark';

  useEffect(() => {
    loadAccounts();
    ///console.log('Params:', params);
    
    // Pre-fill from params if provided
    if (params.accountId) {
      setFormData(prev => ({ ...prev, accountId: params.accountId as string }));
    }
    if (params.transactionType) {
      setFormData(prev => ({ ...prev, type: params.transactionType as TransactionType }));
    }
    if (params.accountName) {
      setFormData(prev => ({ 
        ...prev, 
        description: `Transaction for ${params.accountName}` 
      }));
    }

    //console.log(formData)
  }, []);

  const loadAccounts = async () => {
    if (!currentShop) return;

    try {
      const allAccounts = await database.get<CashAccount>('cash_accounts')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('is_active', true)
        )
        .fetch();
      
      setAccounts(allAccounts);
      
      // Auto-select default account if available
      const defaultAccount = allAccounts.find(acc => acc.isDefault);
      if (defaultAccount && !formData.accountId) {
        setFormData(prev => ({ ...prev, accountId: defaultAccount.id }));
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      Alert.alert('Error', 'Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAccount = accounts.find(acc => acc.id === formData.accountId);
  const selectedTargetAccount = accounts.find(acc => acc.id === formData.targetAccountId);

  const handleSubmit = async () => {
  if (!validateForm() || !currentShop || !user) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return;
  }

  setIsSubmitting(true);
  try {
    const amount = parseFloat(formData.amount);
    const timestamp = formData.date.getTime();
    const recordedBy = user.id; // 👈 ensure this matches your User model's ID

    // 🔹 CASE 1: TRANSFER (between accounts)
    if (formData.type === 'transfer') {
      if (!formData.targetAccountId) throw new Error('Target account required');

      await database.write(async () => {
        const sourceAccount = accounts.find(a => a.id === formData.accountId)!;
        const targetAccount = accounts .find(a => a.id === formData.targetAccountId)!;

        // Update balances
        await sourceAccount.update(a => {
          a.currentBalance -= amount;
          a._tableStatus = 'updated';
          a._lastSyncChanged = Date.now();
        });
        await targetAccount.update(a => {
          a.currentBalance += amount;
          a._tableStatus = 'updated';
          a._lastSyncChanged = Date.now();
        });

        // Create single 'transfer' transaction
        const transaction = await database.get<Transaction>('transactions').create(t => {
          t.shopId = currentShop.id;
          t.transactionType = 'transfer';
          t.transactionNumber = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          t.contactId = '';
          t.sourceAccountId = formData.accountId;
          t.destinationAccountId = formData.targetAccountId;
          t.expenseCategoryId = '';
          t.subtotal = amount;
          t.taxAmount = 0;
          t.discountAmount = 0;
          t.totalAmount = amount;
          t.amountPaid = amount;
          t.balanceDue = 0;
          t.paymentStatus = 'paid';
          t.transactionDate = timestamp;
          t.dueDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // +7 days
          t.recordedBy = recordedBy;
          t.notes = formData.notes || '';
          t.isBusinessExpense = false;
          t._tableStatus = 'created';
          t._lastSyncChanged = Date.now();
        });

        // Two payments: out + in
        await database.get<Payment>('payments').create(p => {
          p.transactionId = transaction.id;
          p.shopId = currentShop.id;
          p.cashAccountId = formData.accountId;
          p.paymentMethodId = 'transfer_out';
          p.amount = amount;
          p.paymentDate = timestamp;
          p.referenceNumber = formData.reference ;
          p.notes = `Transfer to ${targetAccount.name}`;
          p.recordedBy = recordedBy;
          p._tableStatus = 'created';
          p._lastSyncChanged = Date.now();
        });

        await database.get<Payment>('payments').create(p => {
          p.transactionId = transaction.id;
          p.shopId = currentShop.id;
          p.cashAccountId = formData.targetAccountId;
          p.paymentMethodId = 'transfer_in';
          p.amount = amount;
          p.paymentDate = timestamp;
          p.referenceNumber = formData.reference ;
          p.notes = `Transfer from ${sourceAccount.name}`;
          p.recordedBy = recordedBy;
          p._tableStatus = 'created';
          p._lastSyncChanged = Date.now();
        });

        // Two account transactions
        await database.get<AccountTransaction>('account_transactions').create(at => {
          at.shopId = currentShop.id;
          at.cashAccountId = formData.accountId;
          at.transactionId = transaction.id;
          at.type = 'transfer_out';
          at.amount = amount;
          at.balanceBefore = sourceAccount.currentBalance + amount;
          at.balanceAfter = sourceAccount.currentBalance;
          at.description = `Transfer to ${targetAccount.name}`;
          at.reference = formData.reference || '';
          at.notes = formData.notes || '';
          at.transactionDate = timestamp;
          at.recordedBy = recordedBy;
          at._tableStatus = 'created';
          at._lastSyncChanged = Date.now();
        });

        await database.get<AccountTransaction>('account_transactions').create(at => {
          at.shopId = currentShop.id;
          at.cashAccountId = formData.targetAccountId;
          at.transactionId = transaction.id;
          at.type = 'transfer_in';
          at.amount = amount;
          at.balanceBefore = targetAccount.currentBalance - amount;
          at.balanceAfter = targetAccount.currentBalance;
          at.description = `Transfer from ${sourceAccount.name}`;
          at.reference = formData.reference ;
          at.notes = formData.notes || '';
          at.transactionDate = timestamp;
          at.recordedBy = recordedBy;
          at._tableStatus = 'created';
          at._lastSyncChanged = Date.now();
        });
      });

      Alert.alert('Success', 'Transfer completed!', [{ text: 'OK', onPress: () => router.back() }]);
      return;
    }

    // 🔹 CASE 2: INCOME OR EXPENSE (new transaction)
    const isIncome = formData.type === 'income';

    // Optional: map category to real expense category ID (for now, skip)
    // Later: fetch category by name or create one

    // For EXPENSE: money goes OUT OF the selected account 
    const fromAccountId = isIncome ? undefined : formData.accountId;
    const toAccountId = isIncome ? formData.accountId : undefined;
    console.log('fromAccountId:', fromAccountId, 'toAccountId:', toAccountId);

    const txnData: TransactionData = {
      shopId: currentShop.id,
      transactionType: isIncome ? 'income' : 'expense',
      contactId: undefined, // add later if you include contact picker
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      expenseCategoryId: undefined,
      subtotal: amount,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: amount,
      amountPaid: amount, // fully paid at time of entry
      paymentStatus: 'paid',
      transactionDate: timestamp,
      dueDate: undefined,
      recordedBy,
      notes: formData.notes || undefined,
      isBusinessExpense: !isIncome,
      // Reference can be stored in notes or referenceNumber
    };

    const paymentInputs = [{
      cashAccountId: formData.accountId,
      paymentMethodId: isIncome ? 'manual_income' : 'manual_expense',
      amount: amount,
      referenceNumber: formData.reference || undefined,
      notes: formData.description || undefined,
    }];

    await createTransactionWithPayments(txnData, paymentInputs);

    Alert.alert(
      'Success',
      `${isIncome ? 'Income' : 'Expense'} recorded!`,
      [{ text: 'OK', onPress: () => router.back() }]
    );

  } catch (error: any) {
    console.error('Save error:', error);
    Alert.alert('Error', error.message || 'Failed to save. Please try again.');
  } finally {
    setIsSubmitting(false);
    Haptics.notificationAsync(
      isSubmitting ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success
    );
  }
};

  const validateForm = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }
    if (!formData.accountId) {
      Alert.alert('Error', 'Please select an account');
      return false;
    }
    if (formData.type === 'transfer' && !formData.targetAccountId) {
      Alert.alert('Error', 'Please select target account for transfer');
      return false;
    }
    if (formData.type === 'transfer' && formData.accountId === formData.targetAccountId) {
      Alert.alert('Error', 'Cannot transfer to the same account');
      return false;
    }
    return true;
  };

  const getAccountCurrency = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account?.currency === 'BIF' ? 'FBu' : '$';
  };

  if (isLoading) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'}`}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDark ? '#38bdf8' : '#0ea5e9'} />
          <Text className={`text-base mt-4 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-4 pt-6 pb-4">
          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2"
            >
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color={isDark ? '#94a3b8' : '#64748b'} 
              />
            </TouchableOpacity>
            
            <Text className={`text-xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
              New Transaction
            </Text>
            
            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="p-2"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={isDark ? '#38bdf8' : '#0ea5e9'} />
              ) : (
                <Text className={`font-semibold ${isDark ? 'text-dark-brand' : 'text-brand'}`}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Transaction Type */}
          <View className="px-4 mb-6">
            <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>
              Transaction Type
            </Text>
            <View className="flex-row justify-between">
              {TRANSACTION_TYPES.map(type => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFormData(prev => ({ ...prev, type: type.id }));
                  }}
                  className={`
                    items-center justify-center p-4 rounded-2xl flex-1 mx-1
                    ${formData.type === type.id 
                      ? isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft' 
                      : isDark ? 'bg-dark-surface-muted' : 'bg-surface-muted'
                    }
                    border ${formData.type === type.id 
                      ? `border-[${type.color}]` 
                      : isDark ? 'border-dark-border' : 'border-border'
                    }
                  `}
                >
                  <View 
                    className="w-12 h-12 rounded-xl items-center justify-center mb-2"
                    style={{ backgroundColor: formData.type === type.id ? type.color : `${type.color}20` }}
                  >
                    <Ionicons 
                      name={type.icon} 
                      size={24} 
                      color={formData.type === type.id ? 'white' : type.color} 
                    />
                  </View>
                  <Text className={`font-medium ${formData.type === type.id 
                    ? (isDark ? 'text-dark-text' : 'text-text')
                    : (isDark ? 'text-dark-text-soft' : 'text-text-soft')
                  }`}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Amount */}
          <View className="px-4 mb-6">
            <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-dark-text' : 'text-text'}`}>
              Amount
            </Text>
            <View className={`
              rounded-2xl p-5
              ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
              border ${isDark ? 'border-dark-border' : 'border-border'}
            `}>
              <View className="flex-row items-center mb-2">
                <Text className={`text-2xl ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                  {selectedAccount ? getAccountCurrency(selectedAccount.id) : 'FBu'}
                </Text>
                <TextInput
                  value={formData.amount}
                  onChangeText={text => setFormData(prev => ({ ...prev, amount: text.replace(/[^0-9.]/g, '') }))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  className={`
                    flex-1 text-4xl font-bold ml-3
                    ${isDark ? 'text-dark-text' : 'text-text'}
                  `}
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                />
              </View>
              {selectedAccount && (
                <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                  Account balance: {getAccountCurrency(selectedAccount.id)}{selectedAccount.currentBalance.toLocaleString()}
                </Text>
              )}
            </View>
          </View>

          {/* Account Selection */}
          <View className="px-4 mb-6">
            <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-dark-text' : 'text-text'}`}>
              {formData.type === 'transfer' ? 'From Account' : 'Account'}
            </Text>
            <TouchableOpacity
              onPress={() => setShowAccountModal(true)}
              className={`
                rounded-2xl p-4
                ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
                border ${isDark ? 'border-dark-border' : 'border-border'}
              `}
            >
              {selectedAccount ? (
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-4">
                    <FontAwesome5 
                      name={selectedAccount.type === 'cash' ? 'money-bill-wave' : 
                             selectedAccount.type === 'bank_account' ? 'university' : 
                             selectedAccount.type === 'mobile_money' ? 'mobile-alt' : 
                             selectedAccount.type === 'credit_card' ? 'credit-card' : 'wallet'} 
                      size={20} 
                      color={isDark ? '#60a5fa' : '#3b82f6'} 
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                      {selectedAccount.name}
                    </Text>
                    <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                      {selectedAccount.type.replace('_', ' ')} • {selectedAccount.currency}
                    </Text>
                  </View>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={isDark ? '#94a3b8' : '#64748b'} 
                  />
                </View>
              ) : (
                <View className="flex-row items-center justify-between">
                  <Text className={`${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                    Select account
                  </Text>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={isDark ? '#94a3b8' : '#64748b'} 
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Target Account (for transfers) */}
          {formData.type === 'transfer' && (
            <View className="px-4 mb-6">
              <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                To Account
              </Text>
              <TouchableOpacity
                onPress={() => {
                  // Open modal with filtered accounts (excluding selected source account)
                  setShowAccountModal(true);
                }}
                className={`
                  rounded-2xl p-4
                  ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
                  border ${isDark ? 'border-dark-border' : 'border-border'}
                `}
              >
                {selectedTargetAccount ? (
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 items-center justify-center mr-4">
                      <FontAwesome5 
                        name={selectedTargetAccount.type === 'cash' ? 'money-bill-wave' : 
                               selectedTargetAccount.type === 'bank_account' ? 'university' : 
                               selectedTargetAccount.type === 'mobile_money' ? 'mobile-alt' : 
                               selectedTargetAccount.type === 'credit_card' ? 'credit-card' : 'wallet'} 
                        size={20} 
                        color={isDark ? '#4ade80' : '#22c55e'} 
                      />
                    </View>
                    <View className="flex-1">
                      <Text className={`font-semibold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                        {selectedTargetAccount.name}
                      </Text>
                      <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                        {selectedTargetAccount.type.replace('_', ' ')} • {selectedTargetAccount.currency}
                      </Text>
                    </View>
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={isDark ? '#94a3b8' : '#64748b'} 
                    />
                  </View>
                ) : (
                  <View className="flex-row items-center justify-between">
                    <Text className={`${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                      Select target account
                    </Text>
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={isDark ? '#94a3b8' : '#64748b'} 
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Description */}
          <View className="px-4 mb-6">
            <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-dark-text' : 'text-text'}`}>
              Description
            </Text>
            <TextInput
              value={formData.description}
              onChangeText={text => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Enter transaction description"
              className={`
                rounded-2xl p-4 text-base
                ${isDark ? 'bg-dark-surface-soft text-dark-text' : 'bg-surface text-text'}
                border ${isDark ? 'border-dark-border' : 'border-border'}
              `}
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            />
          </View>

          {/* Category */}
          <View className="px-4 mb-6">
            <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-dark-text' : 'text-text'}`}>
              Category
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={true}>
              <View className="flex-row gap-2 pb-2">
                {CATEGORIES.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFormData(prev => ({ ...prev, category: category.id }));
                    }}
                    className={`
                      flex-row items-center px-4 py-3 rounded-xl
                      ${formData.category === category.id
                        ? isDark ? 'bg-dark-brand' : 'bg-brand'
                        : isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'
                      }
                      border ${isDark ? 'border-dark-border' : 'border-border'}
                    `}
                  >
                    <Text className="mr-2">{category.icon}</Text>
                    <Text className={`
                      font-medium
                      ${formData.category === category.id
                        ? 'text-white'
                        : isDark ? 'text-dark-text' : 'text-text'
                      }
                    `}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Date */}
          <View className="px-4 mb-6">
            <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-dark-text' : 'text-text'}`}>
              Date & Time
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className={`
                rounded-2xl p-4
                ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
                border ${isDark ? 'border-dark-border' : 'border-border'}
              `}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color={isDark ? '#94a3b8' : '#64748b'} 
                    className="mr-3"
                  />
                  <Text className={`${isDark ? 'text-dark-text' : 'text-text'}`}>
                    {formData.date.toLocaleDateString()} • {formData.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={isDark ? '#94a3b8' : '#64748b'} 
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <View className="px-4 mb-6">
            <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-dark-text' : 'text-text'}`}>
              Notes (Optional)
            </Text>
            <TextInput
              value={formData.notes}
              onChangeText={text => setFormData(prev => ({ ...prev, notes: text }))}
              placeholder="Add any additional notes"
              multiline
              numberOfLines={3}
              className={`
                rounded-2xl p-4 text-base min-h-[100px]
                ${isDark ? 'bg-dark-surface-soft text-dark-text' : 'bg-surface text-text'}
                border ${isDark ? 'border-dark-border' : 'border-border'}
              `}
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              textAlignVertical="top"
            />
          </View>

          {/* Reference */}
          <View className="px-4 mb-6">
            <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-dark-text' : 'text-text'}`}>
              Reference (Optional)
            </Text>
            <TextInput
              value={formData.reference}
              onChangeText={text => setFormData(prev => ({ ...prev, reference: text }))}
              placeholder="e.g., Invoice #, Receipt #"
              className={`
                rounded-2xl p-4 text-base
                ${isDark ? 'bg-dark-surface-soft text-dark-text' : 'bg-surface text-text'}
                border ${isDark ? 'border-dark-border' : 'border-border'}
              `}
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Account Selection Modal */}
      <AccountModal
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        accounts={accounts.filter(acc => acc.id !== formData.accountId)}
        onSelect={(account) => {
          if (formData.type === 'transfer' && !selectedTargetAccount) {
            setFormData(prev => ({ ...prev, targetAccountId: account.id }));
          } else {
            setFormData(prev => ({ ...prev, accountId: account.id }));
          }
        }}
        isDark={isDark}
      />

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className={`
              rounded-t-3xl p-6
              ${isDark ? 'bg-dark-surface' : 'bg-surface'}
            `}>
              <View className="flex-row items-center justify-between mb-6">
                <Text className={`text-xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                  Select Date & Time
                </Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons 
                    name="close" 
                    size={24} 
                    color={isDark ? '#94a3b8' : '#64748b'} 
                  />
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={formData.date}
                mode="datetime"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setFormData(prev => ({ ...prev, date: selectedDate }));
                  }
                }}
                themeVariant={isDark ? 'dark' : 'light'}
              />
              
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                className={`
                  mt-6 py-3 rounded-xl items-center justify-center
                  ${isDark ? 'bg-dark-brand' : 'bg-brand'}
                `}
              >
                <Text className="text-white font-semibold">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Save Button (Fixed at bottom) */}
      <View className={`
        absolute bottom-0 left-0 right-0 p-4
        ${isDark ? 'bg-dark-surface' : 'bg-surface'}
        border-t ${isDark ? 'border-dark-border' : 'border-border'}
      `}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className={`
            py-4 rounded-xl items-center justify-center
            ${isSubmitting 
              ? 'bg-brand/70' 
              : isDark ? 'bg-dark-brand' : 'bg-brand'
            }
          `}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white text-lg font-semibold">
              Record Transaction
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}