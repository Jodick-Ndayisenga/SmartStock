// app/(tabs)/add-transaction.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
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
import { Contact } from '@/database/models/Contact';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import Transaction from '@/database/models/Transaction';
import { Payment } from '@/database/models/Payment';
import { AccountTransaction } from '@/database/models/AccountTransaction';
import { ThemedText } from '@/components/ui/ThemedText';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { useNotification } from '@/context/NotificationContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TransactionType = 'income' | 'expense' | 'transfer';
type TransactionCategory = 
  | 'sales' | 'purchase' | 'salary' | 'rent' | 'utilities' 
  | 'transport' | 'marketing' | 'maintenance' | 'equipment' | 'other';

const TRANSACTION_TYPES: { 
  id: TransactionType; 
  label: string; 
  icon: keyof typeof Ionicons.glyphMap; 
  color: string;
  description: string;
}[] = [
  { id: 'income', label: 'Income', icon: 'arrow-down-circle', color: '#22c55e', description: 'Money coming in' },
  { id: 'expense', label: 'Expense', icon: 'arrow-up-circle', color: '#ef4444', description: 'Money going out' },
  { id: 'transfer', label: 'Transfer', icon: 'swap-horizontal', color: '#0ea5e9', description: 'Move between accounts' },
];

const CATEGORIES: { id: TransactionCategory; label: string; icon: string; color: string; type: ('income' | 'expense' | 'both') }[] = [
  { id: 'sales', label: 'Sales', icon: '💰', color: '#22c55e', type: 'income' },
  { id: 'purchase', label: 'Purchase', icon: '🛒', color: '#ef4444', type: 'expense' },
  { id: 'salary', label: 'Salary', icon: '👨‍💼', color: '#f59e0b', type: 'expense' },
  { id: 'rent', label: 'Rent', icon: '🏠', color: '#8b5cf6', type: 'expense' },
  { id: 'utilities', label: 'Utilities', icon: '💡', color: '#ec4899', type: 'expense' },
  { id: 'transport', label: 'Transport', icon: '🚚', color: '#06b6d4', type: 'expense' },
  { id: 'marketing', label: 'Marketing', icon: '📢', color: '#f97316', type: 'expense' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧', color: '#84cc16', type: 'expense' },
  { id: 'equipment', label: 'Equipment', icon: '💻', color: '#a855f7', type: 'expense' },
  { id: 'other', label: 'Other', icon: '📦', color: '#64748b', type: 'both' },
];

// Account Selection Modal Component
const AccountModal = ({ 
  visible, 
  onClose, 
  accounts, 
  onSelect,
  isDark,
  title = 'Select Account',
  excludeAccountId
}: { 
  visible: boolean; 
  onClose: () => void; 
  accounts: CashAccount[]; 
  onSelect: (account: CashAccount) => void;
  isDark: boolean;
  title?: string;
  excludeAccountId?: string;
}) => {
  const filteredAccounts = excludeAccountId 
    ? accounts.filter(acc => acc.id !== excludeAccountId)
    : accounts;

  return (
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
              <ThemedText variant="heading" size="xl">
                {title}
              </ThemedText>
              <TouchableOpacity onPress={onClose}>
                <Ionicons 
                  name="close" 
                  size={28} 
                  color={isDark ? '#94a3b8' : '#64748b'} 
                />
              </TouchableOpacity>
            </View>
            <ThemedText variant="muted" size="sm">
              Choose an account for this transaction
            </ThemedText>
          </View>

          {/* Accounts List */}
          <ScrollView className="p-4">
            {filteredAccounts.length === 0 ? (
              <View className="items-center justify-center py-10">
                <Ionicons 
                  name="wallet-outline" 
                  size={48} 
                  color={isDark ? '#64748b' : '#94a3b8'} 
                />
                <ThemedText variant="muted" className="text-center mt-4">
                  No accounts available
                </ThemedText>
              </View>
            ) : (
              filteredAccounts.map(account => {
                const accountType = account.type;
                const getIcon = () => {
                  switch(accountType) {
                    case 'cash': return 'money-bill-wave';
                    case 'bank_account': return 'university';
                    case 'mobile_money': return 'mobile-alt';
                    case 'credit_card': return 'credit-card';
                    default: return 'wallet';
                  }
                };
                
                return (
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
                        name={getIcon()} 
                        size={20} 
                        color={isDark ? '#60a5fa' : '#3b82f6'} 
                      />
                    </View>
                    <View className="flex-1">
                      <ThemedText variant="default" className="font-semibold">
                        {account.name}
                      </ThemedText>
                      <ThemedText variant="muted" size="sm">
                        {account.type.replace('_', ' ')} • {account.currency}
                      </ThemedText>
                    </View>
                    <ThemedText variant="default" className="font-bold text-lg">
                      {account.currency === 'BIF' ? 'FBu' : '$'}{account.currentBalance?.toLocaleString() || 0}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function AddTransactionScreen() {
  const { colorScheme } = useColorScheme();
  const { currentShop, user } = useAuth();
  const { showNotification } = useNotification();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [accountSelectionMode, setAccountSelectionMode] = useState<'source' | 'target'>('source');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ title: string; message: string; transactionNumber?: string } | null>(null);
  
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    description: '',
    category: 'other' as TransactionCategory,
    accountId: '',
    targetAccountId: '', // For transfers
    contactId: '', // For income from customers
    date: new Date(),
    notes: '',
    reference: '',
    isBusinessExpense: true,
  });

  const isDark = colorScheme === 'dark';

  // Helper functions
  const selectSourceAccount = (accountId: string) => {
    setFormData(prev => ({ ...prev, accountId }));
  };

  const selectTargetAccount = (accountId: string) => {
    setFormData(prev => ({ ...prev, targetAccountId: accountId }));
  };

  const openAccountModal = (mode: 'source' | 'target') => {
    setAccountSelectionMode(mode);
    setShowAccountModal(true);
  };

  const getFilteredAccounts = () => {
    if (formData.type === 'transfer') {
      if (accountSelectionMode === 'source') {
        return accounts.filter(acc => acc.id !== formData.targetAccountId);
      } else {
        return accounts.filter(acc => acc.id !== formData.accountId);
      }
    }
    return accounts;
  };

  const getModalTitle = () => {
    if (formData.type === 'transfer') {
      return accountSelectionMode === 'source' 
        ? 'Select Source Account' 
        : 'Select Target Account';
    }
    return 'Select Account';
  };

  useEffect(() => {
    loadData();
    
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
  }, []);

  const loadData = async () => {
    if (!currentShop) return;

    try {
      const [allAccounts, allContacts] = await Promise.all([
        database.get<CashAccount>('cash_accounts')
          .query(
            Q.where('shop_id', currentShop.id),
            Q.where('is_active', true)
          )
          .fetch(),
        database.get<Contact>('contacts')
          .query(
            Q.where('shop_id', currentShop.id)
          )
          .fetch()
      ]);
      
      setAccounts(allAccounts);
      setContacts(allContacts);

      // Auto-select default account if available
      const defaultAccount = allAccounts.find(acc => acc.isDefault);
      if (defaultAccount && !params.accountId) {
        setFormData(prev => ({ ...prev, accountId: defaultAccount.id }));
      }

      // Pre-fill account from params
      if (params.accountId) {
        const selectedAccount = allAccounts.find(acc => acc.id === params.accountId);
        if (selectedAccount) {
          setFormData(prev => ({ ...prev, accountId: selectedAccount.id }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAccount = accounts.find(acc => acc.id === formData.accountId);
  const selectedTargetAccount = accounts.find(acc => acc.id === formData.targetAccountId);
  const selectedContact = contacts.find(c => c.id === formData.contactId);

  const generateTransactionNumber = (prefix: string): string => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}${month}${day}-${random}`;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !currentShop || !user) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const amount = parseFloat(formData.amount);
      const timestamp = formData.date.getTime();
      const recordedBy = user.id;

      await database.write(async () => {
        // CASE 1: TRANSFER (between accounts)
        if (formData.type === 'transfer') {
          const sourceAccount = await database.get<CashAccount>('cash_accounts').find(formData.accountId);
          const targetAccount = await database.get<CashAccount>('cash_accounts').find(formData.targetAccountId);

          if (!sourceAccount || !targetAccount) {
            throw new Error('One or both accounts not found');
          }

          const sourceOriginalBalance = sourceAccount.currentBalance || 0;
          const targetOriginalBalance = targetAccount.currentBalance || 0;

          // Update balances
          await sourceAccount.update(a => {
            a.currentBalance = sourceOriginalBalance - amount;
          });

          await targetAccount.update(a => {
            a.currentBalance = targetOriginalBalance + amount;
          });

          // Create transfer transaction
          const transactionNumber = generateTransactionNumber('TRF');
          const transaction = await database.get<Transaction>('transactions').create(t => {
            t.shopId = currentShop.id;
            t.transactionType = 'transfer';
            t.transactionNumber = transactionNumber;
            t.sourceAccountId = formData.accountId;
            t.destinationAccountId = formData.targetAccountId;
            t.subtotal = amount;
            t.totalAmount = amount;
            t.amountPaid = amount;
            t.balanceDue = 0;
            t.paymentStatus = 'paid';
            t.transactionDate = timestamp;
            t.recordedBy = recordedBy;
            t.notes = formData.notes || `Transfer from ${sourceAccount.name} to ${targetAccount.name}`;
          });

          // Create payment out (from source)
          const paymentOut = await database.get<Payment>('payments').create(p => {
            p.transactionId = transaction.id;
            p.shopId = currentShop.id;
            p.cashAccountId = formData.accountId;
            p.paymentMethodId = 'transfer_out';
            p.amount = amount;
            p.paymentDate = timestamp;
            p.referenceNumber = formData.reference || transactionNumber;
            p.notes = `Transfer to ${targetAccount.name}`;
            p.recordedBy = recordedBy;
          });

          // Create payment in (to target)
          const paymentIn = await database.get<Payment>('payments').create(p => {
            p.transactionId = transaction.id;
            p.shopId = currentShop.id;
            p.cashAccountId = formData.targetAccountId;
            p.paymentMethodId = 'transfer_in';
            p.amount = amount;
            p.paymentDate = timestamp;
            p.referenceNumber = formData.reference || transactionNumber;
            p.notes = `Transfer from ${sourceAccount.name}`;
            p.recordedBy = recordedBy;
          });

          // Account transaction for source (withdrawal)
          await database.get<AccountTransaction>('account_transactions').create(at => {
            at.shopId = currentShop.id;
            at.cashAccountId = formData.accountId;
            at.transactionId = transaction.id;
            at.paymentId = paymentOut.id;
            at.type = 'withdrawal';
            at.amount = amount;
            at.balanceBefore = sourceOriginalBalance;
            at.balanceAfter = sourceOriginalBalance - amount;
            at.description = `Transfer to ${targetAccount.name}`;
            at.category = 'transfer';
            at.reference = formData.reference || transactionNumber;
            at.notes = formData.notes || '';
            at.transactionDate = timestamp;
            at.recordedBy = recordedBy;
          });

          // Account transaction for target (deposit)
          await database.get<AccountTransaction>('account_transactions').create(at => {
            at.shopId = currentShop.id;
            at.cashAccountId = formData.targetAccountId;
            at.transactionId = transaction.id;
            at.paymentId = paymentIn.id;
            at.type = 'deposit';
            at.amount = amount;
            at.balanceBefore = targetOriginalBalance;
            at.balanceAfter = targetOriginalBalance + amount;
            at.description = `Transfer from ${sourceAccount.name}`;
            at.category = 'transfer';
            at.reference = formData.reference || transactionNumber;
            at.notes = formData.notes || '';
            at.transactionDate = timestamp;
            at.recordedBy = recordedBy;
          });

          setSuccessData({
            title: 'Transfer Completed',
            message: `${amount.toLocaleString()} transferred from ${sourceAccount.name} to ${targetAccount.name}`,
            transactionNumber
          });
          setShowSuccess(true);
          return;
        }

        // CASE 2: INCOME OR EXPENSE
        const isIncome = formData.type === 'income';
        const account = await database.get<CashAccount>('cash_accounts').find(formData.accountId);

        if (!account) {
          throw new Error('Account not found');
        }

        const originalBalance = account.currentBalance || 0;
        const newBalance = isIncome ? originalBalance + amount : originalBalance - amount;

        // Update account balance
        await account.update(a => {
          a.currentBalance = newBalance;
        });

        // Create transaction
        const transactionType = isIncome ? 'income' : 'expense';
        const transactionNumber = generateTransactionNumber(isIncome ? 'INC' : 'EXP');
        
        const transaction = await database.get<Transaction>('transactions').create(t => {
          t.shopId = currentShop.id;
          t.transactionType = transactionType;
          t.transactionNumber = transactionNumber;
          t.contactId = isIncome ? formData.contactId || undefined : undefined;
          t.sourceAccountId = isIncome ? undefined : formData.accountId;
          t.destinationAccountId = isIncome ? formData.accountId : undefined;
          t.subtotal = amount;
          t.totalAmount = amount;
          t.amountPaid = amount;
          t.balanceDue = 0;
          t.paymentStatus = 'paid';
          t.transactionDate = timestamp;
          t.recordedBy = recordedBy;
          t.notes = formData.notes || formData.description || '';
          t.isBusinessExpense = !isIncome && formData.isBusinessExpense;
        });

        // Create payment
        const payment = await database.get<Payment>('payments').create(p => {
          p.transactionId = transaction.id;
          p.shopId = currentShop.id;
          p.cashAccountId = formData.accountId;
          p.paymentMethodId = isIncome ? (formData.contactId ? 'credit' : 'cash') : 'expense';
          p.amount = amount;
          p.paymentDate = timestamp;
          p.referenceNumber = formData.reference || transactionNumber;
          p.notes = formData.description || '';
          p.recordedBy = recordedBy;
        });

        // Create account transaction
        await database.get<AccountTransaction>('account_transactions').create(at => {
          at.shopId = currentShop.id;
          at.cashAccountId = formData.accountId;
          at.transactionId = transaction.id;
          at.paymentId = payment.id;
          at.type = isIncome ? 'deposit' : 'withdrawal';
          at.amount = amount;
          at.balanceBefore = originalBalance;
          at.balanceAfter = newBalance;
          at.description = formData.description || (isIncome ? 'Income' : 'Expense');
          at.category = formData.category;
          at.reference = formData.reference || transactionNumber;
          at.notes = formData.notes || '';
          at.transactionDate = timestamp;
          at.recordedBy = recordedBy;
        });

        setSuccessData({
          title: isIncome ? 'Income Recorded' : 'Expense Recorded',
          message: `${amount.toLocaleString()} ${isIncome ? 'added to' : 'removed from'} ${account.name}`,
          transactionNumber
        });
        setShowSuccess(true);
      });

      showNotification({
        type: 'success',
        title: 'Success',
        message: successData?.title || 'Transaction recorded successfully',
      });

      // Reset form after success
      setFormData({
        type: 'expense',
        amount: '',
        description: '',
        category: 'other',
        accountId: selectedAccount?.id || '',
        targetAccountId: '',
        contactId: '',
        date: new Date(),
        notes: '',
        reference: '',
        isBusinessExpense: true,
      });

    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.message || 'Failed to save. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
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
    if (formData.type === 'income' && formData.amount && parseFloat(formData.amount) > 0 && !formData.description) {
      Alert.alert('Error', 'Please enter a description for this income');
      return false;
    }
    return true;
  };

  const getAccountCurrency = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account?.currency === 'BIF' ? 'FBu' : '$';
  };

  const getAccountColor = (accountType: string) => {
    switch(accountType) {
      case 'cash': return '#22c55e';
      case 'bank_account': return '#3b82f6';
      case 'mobile_money': return '#8b5cf6';
      case 'credit_card': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Success Modal
  const SuccessModal = () => (
    <Modal
      visible={showSuccess}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setShowSuccess(false);
        router.back();
      }}
    >
      <View className="flex-1 bg-black/50 items-center justify-center">
        <View className={`mx-6 rounded-2xl p-6 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
          <View className="items-center">
            <View className="w-16 h-16 rounded-full bg-success/20 items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
            </View>
            <ThemedText variant="heading" size="lg" className="text-center mb-2">
              {successData?.title}
            </ThemedText>
            <ThemedText variant="muted" size="sm" className="text-center mb-4">
              {successData?.message}
            </ThemedText>
            {successData?.transactionNumber && (
              <View className="bg-surface-soft dark:bg-dark-surface-soft rounded-lg p-2 mb-4">
                <ThemedText variant="muted" size="xs">Transaction #</ThemedText>
                <ThemedText variant="default" size="sm" className="font-mono">
                  {successData.transactionNumber}
                </ThemedText>
              </View>
            )}
            <TouchableOpacity
              onPress={() => {
                setShowSuccess(false);
                router.back();
              }}
              className="bg-brand py-3 px-6 rounded-xl w-full"
            >
              <ThemedText variant="default" className="text-white text-center font-semibold">
                Done
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'}`}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDark ? '#38bdf8' : '#0ea5e9'} />
          <ThemedText variant="muted" className="mt-4">
            Loading...
          </ThemedText>
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
            
            <ThemedText variant="heading" size="lg">
              New Transaction
            </ThemedText>
            
            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="p-2"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={isDark ? '#38bdf8' : '#0ea5e9'} />
              ) : (
                <ThemedText variant="brand" className="font-semibold">
                  Save
                </ThemedText>
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
            <ThemedText variant="subheading" className="mb-4">
              Transaction Type
            </ThemedText>
            <View className="flex-row gap-3">
              {TRANSACTION_TYPES.map(type => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFormData(prev => ({ 
                      ...prev, 
                      type: type.id,
                      ...(type.id !== 'transfer' && { targetAccountId: '' })
                    }));
                  }}
                  className={`flex-1 p-4 rounded-2xl items-center ${
                    formData.type === type.id 
                      ? isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'
                      : isDark ? 'bg-dark-surface-muted' : 'bg-surface-muted'
                  } border ${
                    formData.type === type.id 
                      ? `border-[${type.color}]` 
                      : isDark ? 'border-dark-border' : 'border-border'
                  }`}
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
                  <ThemedText 
                    variant={formData.type === type.id ? 'default' : 'muted'}
                    className="font-medium"
                  >
                    {type.label}
                  </ThemedText>
                  <ThemedText variant="muted" size="xs" className="text-center mt-1">
                    {type.description}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Amount */}
          <View className="px-4 mb-6">
            <ThemedText variant="subheading" className="mb-3">
              Amount
            </ThemedText>
            <Card variant="elevated" className="rounded-2xl">
              <CardContent className="p-5">
                <View className="flex-row items-center mb-2">
                  <ThemedText variant="muted" className="text-2xl">
                    {selectedAccount ? getAccountCurrency(selectedAccount.id) : 'FBu'}
                  </ThemedText>
                  <TextInput
                    value={formData.amount}
                    onChangeText={text => setFormData(prev => ({ ...prev, amount: text.replace(/[^0-9.]/g, '') }))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    className={`flex-1 text-4xl font-bold ml-3 ${isDark ? 'text-dark-text' : 'text-text'}`}
                    placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  />
                </View>
                {selectedAccount && (
                  <ThemedText variant="muted" size="sm">
                    Available balance: {getAccountCurrency(selectedAccount.id)} {selectedAccount.currentBalance?.toLocaleString() || 0}
                  </ThemedText>
                )}
              </CardContent>
            </Card>
          </View>

          {/* Account Selection */}
          <View className="px-4 mb-6">
            <ThemedText variant="subheading" className="mb-3">
              {formData.type === 'transfer' ? 'From Account' : 'Account'}
            </ThemedText>
            <TouchableOpacity
              onPress={() => openAccountModal('source')}
              className={`rounded-2xl p-4 ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'} border ${isDark ? 'border-dark-border' : 'border-border'}`}
            >
              {selectedAccount ? (
                <View className="flex-row items-center">
                  <View 
                    className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                    style={{ backgroundColor: `${getAccountColor(selectedAccount.type)}20` }}
                  >
                    <FontAwesome5 
                      name={selectedAccount.type === 'cash' ? 'money-bill-wave' : 
                            selectedAccount.type === 'bank_account' ? 'university' : 
                            selectedAccount.type === 'mobile_money' ? 'mobile-alt' : 
                            selectedAccount.type === 'credit_card' ? 'credit-card' : 'wallet'} 
                      size={20} 
                      color={getAccountColor(selectedAccount.type)} 
                    />
                  </View>
                  <View className="flex-1">
                    <ThemedText className="font-semibold">
                      {selectedAccount.name}
                    </ThemedText>
                    <ThemedText variant="muted" size="sm">
                      {selectedAccount.type.replace('_', ' ')} • {selectedAccount.currency}
                    </ThemedText>
                  </View>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={isDark ? '#94a3b8' : '#64748b'} 
                  />
                </View>
              ) : (
                <View className="flex-row items-center justify-between">
                  <ThemedText variant="muted">
                    {formData.type === 'transfer' ? 'Select from account' : 'Select account'}
                  </ThemedText>
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
              <ThemedText variant="subheading" className="mb-3">
                To Account
              </ThemedText>
              <TouchableOpacity
                onPress={() => openAccountModal('target')}
                className={`rounded-2xl p-4 ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'} border ${isDark ? 'border-dark-border' : 'border-border'}`}
              >
                {selectedTargetAccount ? (
                  <View className="flex-row items-center">
                    <View 
                      className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                      style={{ backgroundColor: `${getAccountColor(selectedTargetAccount.type)}20` }}
                    >
                      <FontAwesome5 
                        name={selectedTargetAccount.type === 'cash' ? 'money-bill-wave' : 
                              selectedTargetAccount.type === 'bank_account' ? 'university' : 
                              selectedTargetAccount.type === 'mobile_money' ? 'mobile-alt' : 
                              selectedTargetAccount.type === 'credit_card' ? 'credit-card' : 'wallet'} 
                        size={20} 
                        color={getAccountColor(selectedTargetAccount.type)} 
                      />
                    </View>
                    <View className="flex-1">
                      <ThemedText className="font-semibold">
                        {selectedTargetAccount.name}
                      </ThemedText>
                      <ThemedText variant="muted" size="sm">
                        {selectedTargetAccount.type.replace('_', ' ')} • {selectedTargetAccount.currency}
                      </ThemedText>
                    </View>
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={isDark ? '#94a3b8' : '#64748b'} 
                    />
                  </View>
                ) : (
                  <View className="flex-row items-center justify-between">
                    <ThemedText variant="muted">
                      Select target account
                    </ThemedText>
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
            <ThemedText variant="subheading" className="mb-3">
              Description
            </ThemedText>
            <Input
              value={formData.description}
              onChangeText={text => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Enter transaction description"
              leftIcon="document-text-outline"
            />
          </View>

          {/* Category */}
          <View className="px-4 mb-6">
            <ThemedText variant="subheading" className="mb-3">
              Category
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2 pb-2">
                {CATEGORIES.filter(cat => cat.type === 'both' || cat.type === formData.type).map(category => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFormData(prev => ({ ...prev, category: category.id }));
                    }}
                    className={`flex-row items-center px-4 py-3 rounded-xl ${
                      formData.category === category.id
                        ? isDark ? 'bg-dark-brand' : 'bg-brand'
                        : isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'
                    } border ${isDark ? 'border-dark-border' : 'border-border'}`}
                  >
                    <ThemedText className="mr-2">{category.icon}</ThemedText>
                    <ThemedText
                      variant={formData.category === category.id ? 'default' : 'muted'}
                      className={formData.category === category.id ? 'text-white' : ''}
                    >
                      {category.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Customer (for income) */}
          {formData.type === 'income' && (
            <View className="px-4 mb-6">
              <ThemedText variant="subheading" className="mb-3">
                Customer (Optional)
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  // Navigate to customer selection
                  router.push({
                    pathname: '/(tabs)/customers',
                    params: { selectMode: 'true' }
                  });
                }}
                className={`rounded-2xl p-4 ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'} border ${isDark ? 'border-dark-border' : 'border-border'}`}
              >
                <View className="flex-row items-center">
                  <Ionicons name="person-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                  <ThemedText className="ml-3 flex-1">
                    {selectedContact ? selectedContact.name : 'Select customer'}
                  </ThemedText>
                  {selectedContact && (
                    <TouchableOpacity
                      onPress={() => setFormData(prev => ({ ...prev, contactId: '' }))}
                      className="p-1"
                    >
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Date & Time */}
          <View className="px-4 mb-6">
            <ThemedText variant="subheading" className="mb-3">
              Date & Time
            </ThemedText>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className={`rounded-2xl p-4 ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'} border ${isDark ? 'border-dark-border' : 'border-border'}`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color={isDark ? '#94a3b8' : '#64748b'} 
                  />
                  <ThemedText className="ml-3">
                    {formData.date.toLocaleDateString()} • {formData.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </ThemedText>
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
            <ThemedText variant="subheading" className="mb-3">
              Notes (Optional)
            </ThemedText>
            <Input
              value={formData.notes}
              onChangeText={text => setFormData(prev => ({ ...prev, notes: text }))}
              placeholder="Add any additional notes"
              multiline
              numberOfLines={3}
              className="min-h-[100px]"
            />
          </View>

          {/* Reference */}
          <View className="px-4 mb-6">
            <ThemedText variant="subheading" className="mb-3">
              Reference (Optional)
            </ThemedText>
            <Input
              value={formData.reference}
              onChangeText={text => setFormData(prev => ({ ...prev, reference: text }))}
              placeholder="e.g., Invoice #, Receipt #"
              leftIcon="pricetag-outline"
            />
          </View>

          {/* Business Expense Toggle (for expenses) */}
          {formData.type === 'expense' && (
            <View className="px-4 mb-6">
              <ThemedText variant="subheading" className="mb-3">
                Business Expense
              </ThemedText>
              <TouchableOpacity
                onPress={() => setFormData(prev => ({ ...prev, isBusinessExpense: !prev.isBusinessExpense }))}
                className={`rounded-2xl p-4 ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'} border ${isDark ? 'border-dark-border' : 'border-border'}`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons 
                      name={formData.isBusinessExpense ? "briefcase" : "person"} 
                      size={20} 
                      color={isDark ? '#94a3b8' : '#64748b'} 
                    />
                    <ThemedText className="ml-3">
                      {formData.isBusinessExpense ? 'Business Expense' : 'Personal Expense'}
                    </ThemedText>
                  </View>
                  <Ionicons 
                    name={formData.isBusinessExpense ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={formData.isBusinessExpense ? '#22c55e' : '#ef4444'} 
                  />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Account Selection Modal */}
      <AccountModal
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        accounts={getFilteredAccounts()}
        onSelect={(account) => {
          if (accountSelectionMode === 'source') {
            selectSourceAccount(account.id);
          } else {
            selectTargetAccount(account.id);
          }
          setShowAccountModal(false);
        }}
        isDark={isDark}
        title={getModalTitle()}
        excludeAccountId={formData.type === 'transfer' && accountSelectionMode === 'target' ? formData.accountId : undefined}
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
            <View className={`rounded-t-3xl p-6 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
              <View className="flex-row items-center justify-between mb-6">
                <ThemedText variant="heading" size="lg">
                  Select Date & Time
                </ThemedText>
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
                className={`mt-6 py-3 rounded-xl items-center justify-center ${isDark ? 'bg-dark-brand' : 'bg-brand'}`}
              >
                <ThemedText className="text-white font-semibold">Done</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Success Modal */}
      <SuccessModal />

      {/* Save Button (Fixed at bottom) */}
      <View className={`absolute bottom-0 left-0 right-0 p-4 ${isDark ? 'bg-dark-surface' : 'bg-surface'} border-t ${isDark ? 'border-dark-border' : 'border-border'}`}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className={`py-4 rounded-xl items-center justify-center ${isSubmitting ? 'bg-brand/70' : isDark ? 'bg-dark-brand' : 'bg-brand'}`}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <ThemedText className="text-white text-lg font-semibold">
              Record Transaction
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}