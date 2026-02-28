// app/(auth)/edit-account.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Switch,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { 
  Ionicons, 
  MaterialCommunityIcons, 
  FontAwesome5,
  MaterialIcons 
} from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/context/AuthContext';
import { 
  updateCashAccount,
  getCashAccountsByShop,
  type CashAccountType
} from '@/services/cashAccountService';
import * as Haptics from 'expo-haptics';
import { CashAccount } from '@/database/models/CashAccount';
import database from '@/database';
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Button } from '@/components/ui/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Account type configuration - UPDATED with 'receivable'
const ACCOUNT_TYPES = [
  {
    id: 'cash',
    label: 'Cash',
    icon: 'money-bill-wave',
    color: '#22c55e',
    iconColor: '#ffffff',
    gradient: ['#22c55e', '#16a34a'],
    secondary: '#d1fae5',
    description: 'Physical cash on hand, like your cash register or cash drawer'
  },
  {
    id: 'bank_account',
    label: 'Bank Account',
    icon: 'university',
    color: '#0ea5e9',
    iconColor: '#ffffff',
    gradient: ['#0ea5e9', '#0284c7'],
    secondary: '#dbeafe',
    description: 'Money held in a bank account'
  },
  {
    id: 'mobile_money',
    label: 'Mobile Money',
    icon: 'mobile-alt',
    color: '#8b5cf6',
    iconColor: '#ffffff',
    gradient: ['#8b5cf6', '#7c3aed'],
    secondary: '#ede9fe',
    description: 'Mobile money services like M-PESA, EcoCash, etc.'
  },
  {
    id: 'credit_card',
    label: 'Credit Card',
    icon: 'credit-card',
    color: '#ef4444',
    iconColor: '#ffffff',
    gradient: ['#ef4444', '#dc2626'],
    secondary: '#fee2e2',
    description: 'Credit card accounts for expenses'
  },
  {
    id: 'petty_cash',
    label: 'Petty Cash',
    icon: 'wallet',
    color: '#f59e0b',
    iconColor: '#ffffff',
    gradient: ['#f59e0b', '#d97706'],
    secondary: '#ffedd5',
    description: 'Small amount of cash for minor expenses'
  },
  {
    id: 'receivable',
    label: 'Accounts Receivable',
    icon: 'hand-holding-heart',
    color: '#3b82f6',
    iconColor: '#ffffff',
    gradient: ['#3b82f6', '#2563eb'],
    secondary: '#dbeafe',
    description: 'Money owed to you by customers (system account)'
  }
];

// Currency options
const CURRENCIES = [
  { code: 'BIF', symbol: 'FBu', name: 'Burundi Franc' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
];

// Form Field Component
const FormField = ({ 
  label, 
  children, 
  error,
  required = false,
  description
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  description?: string;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="mb-6">
      <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
        {label} {required && <Text className="text-error">*</Text>}
      </Text>
      {children}
      {description && (
        <Text className={`text-xs mt-1 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
          {description}
        </Text>
      )}
      {error && (
        <Text className="text-error text-sm mt-1">{error}</Text>
      )}
    </View>
  );
};

export default function EditAccountScreen() {
  const { colorScheme } = useColorScheme();
  const { currentShop } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const accountId = params.accountId as string;

  const [account, setAccount] = useState<CashAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: '',
    type: 'cash' as CashAccountType,
    accountNumber: '',
    bankName: '',
    currency: 'BIF',
    notes: '',
    isDefault: false,
    isActive: true,
    openingBalance: '0'
  });

  const isDark = colorScheme === 'dark';
  const scrollViewRef = useRef<ScrollView>(null);

  // Check if this is a system account
  const isSystemAccount = account?.type === 'receivable' || account?.name === 'Accounts Receivable';

  // Fetch account data
  useEffect(() => {
    loadAccountData();
  }, [accountId]);

  const loadAccountData = async () => {
    if (!accountId) return;

    try {
      const cashAccounts = database.get<CashAccount>('cash_accounts');
      const fetchedAccount = await cashAccounts.find(accountId);
      
      if (fetchedAccount) {
        setAccount(fetchedAccount);
        setFormData({
          name: fetchedAccount.name,
          type: fetchedAccount.type as CashAccountType,
          accountNumber: fetchedAccount.accountNumber || '',
          bankName: fetchedAccount.bankName || '',
          currency: fetchedAccount.currency,
          notes: fetchedAccount.notes || '',
          isDefault: fetchedAccount.isDefault,
          isActive: fetchedAccount.isActive,
          openingBalance: fetchedAccount.openingBalance.toString()
        });
      } else {
        Alert.alert('Error', 'Account not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading account:', error);
      Alert.alert('Error', 'Failed to load account data');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
    }

    if (formData.type === 'bank_account' && !formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required for bank accounts';
    }

    if (formData.type === 'mobile_money' && !formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required for mobile money';
    }

    // Validate opening balance if provided
    if (formData.openingBalance) {
      const balance = parseFloat(formData.openingBalance);
      if (isNaN(balance) || balance < 0) {
        newErrors.openingBalance = 'Please enter a valid positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!currentShop || !account) {
      Alert.alert('Error', 'No shop or account selected');
      return;
    }

    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      const openingBalance = formData.openingBalance 
        ? parseFloat(formData.openingBalance) 
        : account.openingBalance;

      const updates = {
        name: formData.name.trim(),
        type: formData.type,
        accountNumber: formData.accountNumber.trim() || undefined,
        bankName: formData.bankName.trim() || undefined,
        currency: formData.currency,
        notes: formData.notes.trim() || undefined,
        isDefault: formData.isDefault,
        isActive: formData.isActive,
        openingBalance: openingBalance
      };

      await updateCashAccount(account.id, updates);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Account updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error updating account:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to update account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountTypeConfig = (typeId: string) => {
    return ACCOUNT_TYPES.find(t => t.id === typeId) || ACCOUNT_TYPES[0];
  };

  const handleDeleteAccount = () => {
    if (isSystemAccount) {
      Alert.alert('Cannot Delete', 'System accounts cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                if (account) {
                  await account.markAsDeleted();
                }
              });
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Account deleted successfully', [
                { text: 'OK', onPress: () => router.replace('/(auth)/cash-account') }
              ]);
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'}`}>
        <View className="flex-1 items-center justify-center">
          <View className="w-20 h-20 rounded-2xl bg-brand-soft dark:bg-dark-brand-soft items-center justify-center mb-6">
            <MaterialCommunityIcons 
              name="cash-sync" 
              size={36} 
              color={isDark ? '#38bdf8' : '#0ea5e9'} 
            />
          </View>
          <Text className={`text-xl font-bold mb-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
            Loading account...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'}`}>
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-24 h-24 rounded-2xl bg-red-100 dark:bg-red-900/30 items-center justify-center mb-6">
            <Ionicons name="alert-circle" size={48} color="#ef4444" />
          </View>
          <Text className={`text-2xl font-bold mb-3 text-center ${isDark ? 'text-dark-text' : 'text-text'}`}>
            Account Not Found
          </Text>
          <Text className={`text-base text-center mb-8 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
            The account you're trying to edit doesn't exist or has been deleted.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className={`
              px-6 py-3 rounded-xl
              ${isDark ? 'bg-dark-brand' : 'bg-brand'}
            `}
          >
            <Text className="text-white text-base font-semibold">
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'}`}>
      <PremiumHeader title="Edit Account" showBackButton />
      
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View className="p-6">
            {/* Account Type Selection */}
            <View className="mb-8">
              <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                Account Type
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                className="pb-2"
              >
                <View className="flex-row gap-3">
                  {ACCOUNT_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.id}
                      onPress={() => setFormData(prev => ({ ...prev, type: type.id as CashAccountType }))}
                      disabled={isSystemAccount}
                      className={`
                        items-center justify-center p-4 rounded-2xl min-w-[100px]
                        ${formData.type === type.id 
                          ? isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft' 
                          : isDark ? 'bg-dark-surface-muted' : 'bg-surface-muted'
                        }
                        border-2 ${formData.type === type.id 
                          ? `border-[${type.color}]` 
                          : isDark ? 'border-dark-border' : 'border-border'
                        }
                        ${isSystemAccount ? 'opacity-50' : ''}
                      `}
                    >
                      <View 
                        className="w-12 h-12 rounded-xl items-center justify-center mb-2"
                        style={{ 
                          backgroundColor: formData.type === type.id ? type.color : `${type.color}20` 
                        }}
                      >
                        <FontAwesome5 
                          name={type.icon} 
                          size={20} 
                          color={formData.type === type.id ? 'white' : type.color} 
                        />
                      </View>
                      <Text className={`
                        text-sm font-medium ${formData.type === type.id 
                          ? (isDark ? 'text-dark-text' : 'text-text')
                          : (isDark ? 'text-dark-text-soft' : 'text-text-soft')
                        }`}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text className={`text-xs mt-3 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                {getAccountTypeConfig(formData.type).description}
              </Text>
            </View>

            {/* Account Name */}
            <FormField 
              label="Account Name" 
              error={errors.name} 
              required
              description="A descriptive name for this account"
            >
              <TextInput
                value={formData.name}
                onChangeText={text => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="e.g., Main Cash Register, BCR Bank Account"
                editable={!isSystemAccount}
                className={`
                  border rounded-xl px-4 py-3 text-base
                  ${isSystemAccount ? 'opacity-50' : ''}
                  ${isDark 
                    ? 'bg-dark-surface-soft text-dark-text border-dark-border' 
                    : 'bg-surface text-text border-border'
                  }
                  ${errors.name ? 'border-error' : ''}
                `}
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              />
            </FormField>

            {/* Currency Selection */}
            <FormField label="Currency">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {CURRENCIES.map(currency => (
                    <TouchableOpacity
                      key={currency.code}
                      onPress={() => setFormData(prev => ({ ...prev, currency: currency.code }))}
                      disabled={isSystemAccount}
                      className={`
                        px-4 py-3 rounded-xl border
                        ${formData.currency === currency.code
                          ? isDark ? 'bg-dark-brand' : 'bg-brand'
                          : isDark ? 'bg-dark-surface-soft border-dark-border' : 'bg-surface-soft border-border'
                        }
                        ${isSystemAccount ? 'opacity-50' : ''}
                      `}
                    >
                      <Text className={`
                        font-medium
                        ${formData.currency === currency.code
                          ? 'text-white'
                          : isDark ? 'text-dark-text' : 'text-text'
                        }
                      `}>
                        {currency.code} ({currency.symbol})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </FormField>

            {/* Balance Information - NEW SECTION */}
            <View className="mb-6">
              <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                Balance Information
              </Text>
              
              <View className={`rounded-xl p-4 ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'} border ${isDark ? 'border-dark-border' : 'border-border'}`}>
                {/* Opening Balance */}
                <View className="mb-4">
                  <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                    Opening Balance
                  </Text>
                  <View className="flex-row items-center">
                    <Text className={`mr-2 text-lg ${isDark ? 'text-dark-text' : 'text-text'}`}>
                      {CURRENCIES.find(c => c.code === formData.currency)?.symbol}
                    </Text>
                    <TextInput
                      value={formData.openingBalance}
                      onChangeText={text => setFormData(prev => ({ ...prev, openingBalance: text }))}
                      placeholder="0"
                      keyboardType="numeric"
                      editable={!isSystemAccount}
                      className={`
                        flex-1 border rounded-xl px-4 py-3 text-base
                        ${isSystemAccount ? 'opacity-50' : ''}
                        ${isDark 
                          ? 'bg-dark-surface text-dark-text border-dark-border' 
                          : 'bg-white text-text border-border'
                        }
                        ${errors.openingBalance ? 'border-error' : ''}
                      `}
                    />
                  </View>
                  {errors.openingBalance && (
                    <Text className="text-error text-sm mt-1">{errors.openingBalance}</Text>
                  )}
                  <Text className={`text-xs mt-1 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                    Set the initial balance when creating this account
                  </Text>
                </View>

                {/* Current Balance (Read-only) */}
                <View className="flex-row justify-between items-center py-2 border-t border-border dark:border-dark-border">
                  <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                    Current Balance
                  </Text>
                  <Text className={`text-lg font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                    {CURRENCIES.find(c => c.code === account.currency)?.symbol} 
                    {account.currentBalance.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Additional Fields Based on Account Type */}
            {formData.type === 'bank_account' && (
              <FormField 
                label="Bank Name" 
                error={errors.bankName} 
                required
                description="Name of the bank where this account is held"
              >
                <TextInput
                  value={formData.bankName}
                  onChangeText={text => setFormData(prev => ({ ...prev, bankName: text }))}
                  placeholder="e.g., BANCOBU, ECOBANK"
                  editable={!isSystemAccount}
                  className={`
                    border rounded-xl px-4 py-3 text-base
                    ${isSystemAccount ? 'opacity-50' : ''}
                    ${isDark 
                      ? 'bg-dark-surface-soft text-dark-text border-dark-border' 
                      : 'bg-surface text-text border-border'
                    }
                    ${errors.bankName ? 'border-error' : ''}
                  `}
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                />
              </FormField>
            )}

            {(formData.type === 'bank_account' || formData.type === 'mobile_money') && (
              <FormField 
                label="Account Number"
                error={errors.accountNumber}
                description="Account number or mobile money phone number"
              >
                <TextInput
                  value={formData.accountNumber}
                  onChangeText={text => setFormData(prev => ({ ...prev, accountNumber: text }))}
                  placeholder={formData.type === 'mobile_money' ? 'e.g., 0712345678' : 'e.g., 1234567890'}
                  editable={!isSystemAccount}
                  className={`
                    border rounded-xl px-4 py-3 text-base
                    ${isSystemAccount ? 'opacity-50' : ''}
                    ${isDark 
                      ? 'bg-dark-surface-soft text-dark-text border-dark-border' 
                      : 'bg-surface text-text border-border'
                    }
                    ${errors.accountNumber ? 'border-error' : ''}
                  `}
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  keyboardType="number-pad"
                />
              </FormField>
            )}

            {/* Notes */}
            <FormField 
              label="Notes"
              description="Additional information about this account"
            >
              <TextInput
                value={formData.notes}
                onChangeText={text => setFormData(prev => ({ ...prev, notes: text }))}
                placeholder="Add any additional notes about this account"
                multiline
                numberOfLines={4}
                editable={!isSystemAccount}
                className={`
                  border rounded-xl px-4 py-3 text-base min-h-[120px]
                  ${isSystemAccount ? 'opacity-50' : ''}
                  ${isDark 
                    ? 'bg-dark-surface-soft text-dark-text border-dark-border' 
                    : 'bg-surface text-text border-border'
                  }
                `}
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                textAlignVertical="top"
              />
            </FormField>

            {/* Toggles Section */}
            <View className="mt-6">
              <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                Account Settings
              </Text>
              
              <View className="gap-4">
                <View className={`
                  rounded-xl p-4
                  ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'}
                  border ${isDark ? 'border-dark-border' : 'border-border'}
                `}>
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className={`text-base font-medium ${isDark ? 'text-dark-text' : 'text-text'}`}>
                        Set as Default Account
                      </Text>
                      <Text className={`text-sm mt-1 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                        Use this account for all transactions by default
                      </Text>
                    </View>
                    <Switch
                      value={formData.isDefault}
                      onValueChange={value => setFormData(prev => ({ ...prev, isDefault: value }))}
                      disabled={isSystemAccount}
                      trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: '#0ea5e9' }}
                      thumbColor={formData.isDefault ? '#ffffff' : isDark ? '#64748b' : '#94a3b8'}
                    />
                  </View>
                </View>

                <View className={`
                  rounded-xl p-4
                  ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'}
                  border ${isDark ? 'border-dark-border' : 'border-border'}
                `}>
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className={`text-base font-medium ${isDark ? 'text-dark-text' : 'text-text'}`}>
                        Account Status
                      </Text>
                      <Text className={`text-sm mt-1 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                        {formData.isActive ? 'Active and visible' : 'Inactive and hidden'}
                      </Text>
                    </View>
                    <Switch
                      value={formData.isActive}
                      onValueChange={value => setFormData(prev => ({ ...prev, isActive: value }))}
                      disabled={isSystemAccount}
                      trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: '#22c55e' }}
                      thumbColor={formData.isActive ? '#ffffff' : isDark ? '#64748b' : '#94a3b8'}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Account Info Card */}
            <View className={`
              mt-8 rounded-2xl p-5 mb-6
              ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'}
              border ${isDark ? 'border-dark-border' : 'border-border'}
            `}>
              <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                Account Information
              </Text>
              
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                    Current Balance
                  </Text>
                  <Text className={`text-lg font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                    {CURRENCIES.find(c => c.code === account.currency)?.symbol || ''} 
                    {account.currentBalance.toLocaleString()}
                  </Text>
                </View>
                
                <View className="flex-row items-center justify-between">
                  <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                    Opening Balance
                  </Text>
                  <Text className={`text-base ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                    {CURRENCIES.find(c => c.code === account.currency)?.symbol || ''} 
                    {account.openingBalance.toLocaleString()}
                  </Text>
                </View>
                
                <View className="flex-row items-center justify-between">
                  <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                    Created Date
                  </Text>
                  <Text className={`text-base ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                    {new Date(account.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {isSystemAccount && (
                  <View className="mt-2 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Text className="text-blue-700 dark:text-blue-400 text-xs">
                      ⓘ This is a system account used for tracking receivables. Some settings cannot be modified.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Action Bar */}
      <View className={`
        absolute bottom-0 left-0 right-0 p-6
        ${isDark ? 'bg-dark-surface' : 'bg-surface'}
        border-t ${isDark ? 'border-dark-border' : 'border-border'}
        shadow-lg shadow-black/20
      `}>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className={`
              flex-1 py-3 rounded-xl items-center justify-center
              ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'}
              border ${isDark ? 'border-dark-border' : 'border-border'}
            `}
          >
            <Text className={`text-base font-medium ${isDark ? 'text-dark-text' : 'text-text'}`}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`
              flex-1 py-3 rounded-xl items-center justify-center
              ${isSubmitting 
                ? 'bg-brand/70' 
                : isDark ? 'bg-dark-brand' : 'bg-brand'
              }
            `}
          >
            {isSubmitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="white" className="mr-2" />
                <Text className="text-white text-base font-semibold">
                  Saving...
                </Text>
              </View>
            ) : (
              <Text className="text-white text-base font-semibold">
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Delete Button - Hidden for system accounts */}
        {!isSystemAccount && !isSubmitting && (
          <Button
            variant="destructive"
            className="mt-4"
            onPress={handleDeleteAccount}
            fullWidth
            icon='trash'
          >
            Delete Account
          </Button>
        )}
      </View>
    </View>
  );
}