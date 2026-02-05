// app/(tabs)/cash-accounts.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Switch,
  Dimensions,
  RefreshControl
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
import { 
  createCashAccount, 
  updateCashAccount, 
  getCashAccountsByShop,
  type CashAccountData,
  type CashAccountType
} from '@/services/cashAccountService';
import * as Haptics from 'expo-haptics';
import { CashAccount } from '@/database/models/CashAccount';
import PremiumHeader from '@/components/layout/PremiumHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Account type configuration
const ACCOUNT_TYPES = [
  {
    id: 'cash',
    label: 'Cash',
    icon: 'money-bill-wave',
    color: '#22c55e',
    iconColor: '#ffffff',
    gradient: ['#22c55e', '#16a34a'],
    secondary: '#d1fae5'
  },
  {
    id: 'bank_account',
    label: 'Bank Account',
    icon: 'university',
    color: '#0ea5e9',
    iconColor: '#ffffff',
    gradient: ['#0ea5e9', '#0284c7'],
    secondary: '#dbeafe'
  },
  {
    id: 'mobile_money',
    label: 'Mobile Money',
    icon: 'mobile-alt',
    color: '#8b5cf6',
    iconColor: '#ffffff',
    gradient: ['#8b5cf6', '#7c3aed'],
    secondary : '#ede9fe'
  },
  {
    id: 'credit_card',
    label: 'Credit Card',
    icon: 'credit-card',
    color: '#ef4444',
    iconColor: '#ffffff',
    gradient: ['#ef4444', '#dc2626'],
    secondary : '#fee2e2'
  },
  {
    id: 'petty_cash',
    label: 'Petty Cash',
    icon: 'wallet',
    color: '#f59e0b',
    iconColor: '#ffffff',
    gradient: ['#f59e0b', '#d97706'],
    secondary : '#ffedd5'
  }
];

// Currency options
const CURRENCIES = [
  { code: 'BIF', symbol: 'FBu', name: 'Burundi Franc' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
];

// Create Account Modal Component
const CreateAccountModal = ({ 
  visible, 
  onClose, 
  onSuccess,
  initialData,
  mode = 'create'
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: CashAccount;
  mode?: 'create' | 'edit';
}) => {
  const { colorScheme } = useColorScheme();
  const { currentShop } = useAuth();
  const isDark = colorScheme === 'dark';
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    accountNumber: '',
    bankName: '',
    openingBalance: '',
    currency: 'BIF',
    notes: '',
    isDefault: false,
    isActive: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start();

      if (mode === 'edit' && initialData) {
        setFormData({
          name: initialData.name,
          type: initialData.type,
          accountNumber: initialData.accountNumber || '',
          bankName: initialData.bankName || '',
          openingBalance: initialData.openingBalance.toString(),
          currency: initialData.currency,
          notes: initialData.notes || '',
          isDefault: initialData.isDefault,
          isActive: initialData.isActive
        });
      }
    } else {
      slideAnim.setValue(SCREEN_WIDTH);
      setFormData({
        name: '',
        type: 'cash',
        accountNumber: '',
        bankName: '',
        openingBalance: '',
        currency: 'BIF',
        notes: '',
        isDefault: false,
        isActive: true
      });
      setErrors({});
    }
  }, [visible, mode, initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
    }

    if (!formData.openingBalance) {
      newErrors.openingBalance = 'Opening balance is required';
    } else if (isNaN(Number(formData.openingBalance))) {
      newErrors.openingBalance = 'Enter a valid number';
    }

    if (formData.type === 'bank_account' && !formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required for bank accounts';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!currentShop) {
      Alert.alert('Error', 'No shop selected');
      return;
    }

    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      const accountData: CashAccountData = {
        shopId: currentShop.id,
        name: formData.name.trim(),
        type: formData.type as CashAccountType,
        accountNumber: formData.accountNumber.trim() || undefined,
        bankName: formData.bankName.trim() || undefined,
        openingBalance: Number(formData.openingBalance),
        currency: formData.currency,
        notes: formData.notes.trim() || undefined,
        isDefault: formData.isDefault,
        isActive: formData.isActive
      };

      if (mode === 'create') {
        await createCashAccount(accountData);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Cash account created successfully!');
      } else if (mode === 'edit' && initialData) {
        await updateCashAccount(initialData.id, accountData);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Cash account updated successfully!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving cash account:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save cash account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountType = (typeId: string) => {
    return ACCOUNT_TYPES.find(t => t.id === typeId) || ACCOUNT_TYPES[0];
  };

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
            transform: [{ translateX: slideAnim }],
            height: '90%'
          }}
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden"
        >
          <View className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
            {/* Modal Header */}
            <View className={`
              p-6 border-b ${isDark ? 'border-dark-border' : 'border-border'}
            `}>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3
                    ${getAccountType(formData.type).color}20`}>
                    <FontAwesome5 
                      name={getAccountType(formData.type).icon} 
                      size={18}
                      color={getAccountType(formData.type).color}
                    />
                  </View>
                  <Text className={`text-2xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                    {mode === 'create' ? 'Create New Account' : 'Edit Account'}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons 
                    name="close" 
                    size={28} 
                    color={isDark ? '#94a3b8' : '#64748b'} 
                  />
                </TouchableOpacity>
              </View>
              
              <Text className={`text-base ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                {mode === 'create' 
                  ? 'Add a new cash account to manage your finances'
                  : 'Update your cash account details'}
              </Text>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="p-6">
                {/* Account Type Selection */}
                <View className="mb-8">
                  <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                    Account Type
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-2">
                    <View className="flex-row gap-3">
                      {ACCOUNT_TYPES.map(type => (
                        <TouchableOpacity
                          key={type.id}
                          onPress={() => setFormData(prev => ({ ...prev, type: type.id as any }))}
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
                          `}
                        >
                          <View 
                            className="w-12 h-12 rounded-xl items-center justify-center mb-2"
                            style={{ backgroundColor: formData.type === type.id ? type.color : `${type.color}20` }}
                          >
                            <FontAwesome5 
                              name={type.icon} 
                              size={20} 
                              color={formData.type === type.id ? 'white' : type.color} 
                            />
                          </View>
                          <Text className={`text-sm font-medium ${formData.type === type.id 
                            ? (isDark ? 'text-dark-text' : 'text-text')
                            : (isDark ? 'text-dark-text-soft' : 'text-text-soft')
                          }`}>
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Account Name */}
                <View className="mb-6">
                  <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                    Account Name *
                  </Text>
                  <TextInput
                    value={formData.name}
                    onChangeText={text => setFormData(prev => ({ ...prev, name: text }))}
                    placeholder="e.g., Main Cash Register, BCR Bank Account"
                    className={`
                      border rounded-xl px-4 py-3 text-base
                      ${isDark 
                        ? 'bg-dark-surface-soft text-dark-text border-dark-border' 
                        : 'bg-surface text-text border-border'
                      }
                      ${errors.name ? 'border-error' : ''}
                    `}
                    placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  />
                  {errors.name && (
                    <Text className="text-error text-sm mt-1">{errors.name}</Text>
                  )}
                </View>

                {/* Opening Balance */}
                <View className="mb-6">
                  <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                    Opening Balance *
                  </Text>
                  <View className="flex-row items-center">
                    <View className={`
                      flex-row items-center px-4 py-3 rounded-l-xl border-y border-l
                      ${isDark 
                        ? 'bg-dark-surface-soft border-dark-border' 
                        : 'bg-surface-soft border-border'
                      }
                    `}>
                      <Text className={isDark ? 'text-dark-text-soft' : 'text-text-soft'}>
                        {CURRENCIES.find(c => c.code === formData.currency)?.symbol}
                      </Text>
                    </View>
                    <TextInput
                      value={formData.openingBalance}
                      onChangeText={text => setFormData(prev => ({ ...prev, openingBalance: text }))}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      className={`
                        flex-1 border-y border-r rounded-r-xl px-4 py-3 text-base
                        ${isDark 
                          ? 'bg-dark-surface-soft text-dark-text border-dark-border' 
                          : 'bg-surface text-text border-border'
                        }
                        ${errors.openingBalance ? 'border-error' : ''}
                      `}
                      placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    />
                  </View>
                  {errors.openingBalance && (
                    <Text className="text-error text-sm mt-1">{errors.openingBalance}</Text>
                  )}
                </View>

                {/* Currency Selection */}
                <View className="mb-6">
                  <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                    Currency
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {CURRENCIES.map(currency => (
                        <TouchableOpacity
                          key={currency.code}
                          onPress={() => setFormData(prev => ({ ...prev, currency: currency.code }))}
                          className={`
                            px-4 py-3 rounded-xl border
                            ${formData.currency === currency.code
                              ? isDark ? 'bg-dark-brand' : 'bg-brand'
                              : isDark ? 'bg-dark-surface-soft border-dark-border' : 'bg-surface-soft border-border'
                            }
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
                </View>

                {/* Additional Fields Based on Account Type */}
                {formData.type === 'bank_account' && (
                  <View className="mb-6">
                    <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                      Bank Name *
                    </Text>
                    <TextInput
                      value={formData.bankName}
                      onChangeText={text => setFormData(prev => ({ ...prev, bankName: text }))}
                      placeholder="e.g., BANCOBU, ECOBANK"
                      className={`
                        border rounded-xl px-4 py-3 text-base
                        ${isDark 
                          ? 'bg-dark-surface-soft text-dark-text border-dark-border' 
                          : 'bg-surface text-text border-border'
                        }
                        ${errors.bankName ? 'border-error' : ''}
                      `}
                      placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    />
                    {errors.bankName && (
                      <Text className="text-error text-sm mt-1">{errors.bankName}</Text>
                    )}
                  </View>
                )}

                {(formData.type === 'bank_account' || formData.type === 'mobile_money') && (
                  <View className="mb-6">
                    <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                      Account Number
                    </Text>
                    <TextInput
                      value={formData.accountNumber}
                      onChangeText={text => setFormData(prev => ({ ...prev, accountNumber: text }))}
                      placeholder="e.g., 1234567890"
                      className={`
                        border rounded-xl px-4 py-3 text-base
                        ${isDark 
                          ? 'bg-dark-surface-soft text-dark-text border-dark-border' 
                          : 'bg-surface text-text border-border'
                        }
                      `}
                      placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    />
                  </View>
                )}

                {/* Notes */}
                <View className="mb-6">
                  <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                    Notes (Optional)
                  </Text>
                  <TextInput
                    value={formData.notes}
                    onChangeText={text => setFormData(prev => ({ ...prev, notes: text }))}
                    placeholder="Add any additional notes about this account"
                    multiline
                    numberOfLines={3}
                    className={`
                      border rounded-xl px-4 py-3 text-base min-h-[100px]
                      ${isDark 
                        ? 'bg-dark-surface-soft text-dark-text border-dark-border' 
                        : 'bg-surface text-text border-border'
                      }
                    `}
                    placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    textAlignVertical="top"
                  />
                </View>

                {/* Toggles */}
                <View className="space-y-4 mb-8">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className={`text-base font-medium ${isDark ? 'text-dark-text' : 'text-text'}`}>
                        Set as Default Account
                      </Text>
                      <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                        Use this account for all transactions by default
                      </Text>
                    </View>
                    <Switch
                      value={formData.isDefault}
                      onValueChange={value => setFormData(prev => ({ ...prev, isDefault: value }))}
                      trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: '#0ea5e9' }}
                      thumbColor={formData.isDefault ? '#ffffff' : isDark ? '#64748b' : '#94a3b8'}
                    />
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className={`text-base font-medium ${isDark ? 'text-dark-text' : 'text-text'}`}>
                        Active Status
                      </Text>
                      <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                        Disable to hide from active accounts
                      </Text>
                    </View>
                    <Switch
                      value={formData.isActive}
                      onValueChange={value => setFormData(prev => ({ ...prev, isActive: value }))}
                      trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: '#22c55e' }}
                      thumbColor={formData.isActive ? '#ffffff' : isDark ? '#64748b' : '#94a3b8'}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className={`
              p-6 border-t ${isDark ? 'border-dark-border' : 'border-border'}
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
                  <View className="flex-row items-center">
                    <Ionicons name="sync" size={20} color="white" className="mr-2 animate-spin" />
                    <Text className="text-white text-base font-semibold">
                      {mode === 'create' ? 'Creating...' : 'Updating...'}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white text-base font-semibold">
                    {mode === 'create' ? 'Create Account' : 'Update Account'}
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={onClose}
                disabled={isSubmitting}
                className="py-4 rounded-xl items-center justify-center mt-3"
              >
                <Text className={`text-base font-medium ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Account Card Component
const AccountCard = ({ 
  account, 
  onPress,
  onEdit,
  onToggleDefault,
  onToggleActive
}: {
  account: CashAccount;
  onPress: () => void;
  onEdit: () => void;
  onToggleDefault: () => void;
  onToggleActive: () => void;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const accountType = ACCOUNT_TYPES.find(t => t.id === account.type) || ACCOUNT_TYPES[0];
  const currencySymbol = CURRENCIES.find(c => c.code === account.currency)?.symbol || '';

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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
          rounded-3xl p-6 mb-4
          ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
          border-2 ${account.isDefault 
            ? isDark ? 'border-dark-brand' : 'border-brand' 
            : isDark ? 'border-dark-border' : 'border-border'
          }
        `}
      >
        {/* Card Header */}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-row items-center flex-1">
            <View 
              className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
              style={{ backgroundColor: isDark ? `${accountType.color}20` : accountType?.secondary }}
            >
              <FontAwesome5 
                name={accountType.icon} 
                size={24} 
                color={accountType.color} 
              />
            </View>
            
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className={`text-xl font-bold mr-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                  {account.name}
                </Text>
                {account.isDefault && (
                  <View className="px-2 py-1 rounded-full bg-brand-soft dark:bg-dark-brand-soft">
                    <Text className="text-xs font-semibold text-brand dark:text-dark-brand">
                      DEFAULT
                    </Text>
                  </View>
                )}
              </View>
              
              <Text className={`text-sm mt-1 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                {accountType.label} • {account.currency}
              </Text>
            </View>
          </View>

          {/* Status Indicators */}
          <View className="items-end">
            <View className="flex-row items-center mb-2">
              <TouchableOpacity
                onPress={onToggleActive}
                className={`w-8 h-8 rounded-full items-center justify-center mr-2
                  ${account.isActive 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-red-100 dark:bg-red-900/30'
                  }
                `}
              >
                <View className={`w-3 h-3 rounded-full ${account.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={onEdit}>
                <Ionicons 
                  name="create-outline" 
                  size={20} 
                  color={isDark ? '#94a3b8' : '#64748b'} 
                />
              </TouchableOpacity>
            </View>
            
            <Text className={`text-xs ${isDark ? 'text-dark-text-muted' : 'text-text-muted'}`}>
              {account.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Account Details */}
        <View className="space-y-3">
          {(account.bankName || account.accountNumber) && (
            <View className="flex-row items-center">
              <Ionicons 
                name="information-circle-outline" 
                size={16} 
                color={isDark ? '#94a3b8' : '#64748b'} 
              />
              <Text className="ml-2 text-sm text-text-soft dark:text-dark-text-soft">
                {account.bankName || ''} {account.accountNumber ? `• ${account.accountNumber}` : ''}
              </Text>
            </View>
          )}

          {account.notes && (
            <View className="flex-row">
              <Ionicons 
                name="document-text-outline" 
                size={16} 
                color={isDark ? '#94a3b8' : '#64748b'} 
                style={{ marginTop: 2 }}
              />
              <Text className="ml-2 text-sm text-text-soft dark:text-dark-text-soft flex-1">
                {account.notes.length > 70
                  ? `${account.notes.substring(0, 70)}...`
                  : account.notes
                }
              </Text>
            </View>
          )}
        </View>

        {/* Balance Section */}
        <View className="mt-6 pt-4 border-t border-border dark:border-dark-border">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className={`text-sm font-medium ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                Current Balance
              </Text>
              <Text className={`text-2xl font-bold mt-1 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                {currencySymbol} {account.currentBalance.toLocaleString()}
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={onToggleDefault}
              className={`
                px-4 py-2 rounded-full
                ${account.isDefault
                  ? isDark ? 'bg-dark-brand/20' : 'bg-brand/10'
                  : isDark ? 'bg-dark-surface-muted' : 'bg-surface-muted'
                }
              `}
            >
              <Text className={`
                text-sm font-medium
                ${account.isDefault
                  ? 'text-brand dark:text-dark-brand'
                  : isDark ? 'text-dark-text-soft' : 'text-text-soft'
                }
              `}>
                {account.isDefault ? 'Default ✓' : 'Set as Default'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Main Component
export default function CashAccountsScreen() {
  const { colorScheme } = useColorScheme();
  const { currentShop } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CashAccount | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [activeAccounts, setActiveAccounts] = useState(0);

  const isDark = colorScheme === 'dark';

  const loadAccounts = async () => {
    if (!currentShop) return;

    try {
      const fetchedAccounts = await getCashAccountsByShop(currentShop.id);
      setAccounts(fetchedAccounts);

      // Calculate total balance
      const total = fetchedAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
      setTotalBalance(total);

      // Count active accounts
      const active = fetchedAccounts.filter(acc => acc.isActive).length;
      setActiveAccounts(active);
    } catch (error) {
      console.error('Error loading cash accounts:', error);
      Alert.alert('Error', 'Failed to load cash accounts');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [currentShop]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAccounts();
  };

  const handleCreateAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreateModal(true);
  };

  const handleEditAccount = (account: CashAccount) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAccount(account);
    setShowEditModal(true);
  };

  const handleToggleDefault = async (account: CashAccount) => {
    try {
      await updateCashAccount(account.id, { isDefault: !account.isDefault });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadAccounts();
    } catch (error) {
      console.error('Error toggling default:', error);
      Alert.alert('Error', 'Failed to update default account');
    }
  };

  const handleToggleActive = async (account: CashAccount) => {
    const action = account.isActive ? 'deactivate' : 'activate';
    
    Alert.alert(
      `${action === 'deactivate' ? 'Deactivate' : 'Activate'} Account`,
      `Are you sure you want to ${action} this account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'deactivate' ? 'Deactivate' : 'Activate',
          style: action === 'deactivate' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateCashAccount(account.id, { isActive: !account.isActive });
              Haptics.notificationAsync(
                action === 'deactivate' 
                  ? Haptics.NotificationFeedbackType.Warning
                  : Haptics.NotificationFeedbackType.Success
              );
              loadAccounts();
            } catch (error) {
              console.error('Error toggling active:', error);
              Alert.alert('Error', `Failed to ${action} account`);
            }
          }
        }
      ]
    );
  };

  const handleAccountPress = (account: CashAccount) => {
    // Navigate to account details or transactions
    router.push({
      pathname: '/(auth)/account-details',
      params: { accountId: account.id }
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'}`}>
        <View className="flex-1 items-center justify-center">
          <View className="w-20 h-20 rounded-2xl bg-brand-soft dark:bg-dark-brand-soft items-center justify-center mb-6">
            <MaterialCommunityIcons 
              name="cash-multiple" 
              size={36} 
              color={isDark ? '#38bdf8' : '#0ea5e9'} 
            />
          </View>
          <Text className={`text-xl font-bold mb-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
            Loading accounts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'}`}>
        <PremiumHeader title="Cash Accounts 💰" subtitle="Manage your financial accounts" showBackButton/>
      {/* Header */}
      <View className="px-6 pt-4">

        {/* Stats Cards */}
        <View className="flex-row justify-between mb-4">
          <View className={`
            w-[48%] rounded-2xl p-5
            ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
            border ${isDark ? 'border-dark-border' : 'border-border'}
          `}>
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-3">
                <MaterialCommunityIcons name="cash-multiple" size={20} color={isDark ? '#60a5fa' : '#3b82f6'} />
              </View>
              <Text className={`text-2xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                {accounts.length}
              </Text>
            </View>
            <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
              Total Accounts
            </Text>
          </View>

          <View className={`
            w-[48%] rounded-2xl p-5
            ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
            border ${isDark ? 'border-dark-border' : 'border-border'}
          `}>
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 items-center justify-center mr-3">
                <Feather name="dollar-sign" size={20} color={isDark ? '#4ade80' : '#22c55e'} />
              </View>
              <Text className={`text-${totalBalance.toString().length < 5 ? '2xl' : 'sm'} font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                {CURRENCIES[0].symbol} {totalBalance.toLocaleString()}
              </Text>
            </View>
            <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
              Total Balance
            </Text>
          </View>
        </View>
      </View>

      {/* Accounts List */}
      <FlatList
        data={accounts}
        renderItem={({ item }) => (
          <AccountCard
            account={item}
            onPress={() => handleAccountPress(item)}
            onEdit={() => handleEditAccount(item)}
            onToggleDefault={() => handleToggleDefault(item)}
            onToggleActive={() => handleToggleActive(item)}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#94a3b8' : '#64748b'}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <View className="w-48 h-48 rounded-full bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mb-8">
              <MaterialCommunityIcons 
                name="cash-remove" 
                size={80} 
                color={isDark ? '#64748b' : '#94a3b8'} 
              />
            </View>
            <Text className={`text-2xl font-bold mb-3 text-center ${isDark ? 'text-dark-text' : 'text-text'}`}>
              No Accounts Yet
            </Text>
            <Text className={`text-base text-center mb-8 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
              Create your first cash account to start managing finances
            </Text>
            <TouchableOpacity
              onPress={handleCreateAccount}
              className={`
                flex-row items-center px-6 py-3 rounded-xl
                ${isDark ? 'bg-dark-brand' : 'bg-brand'}
              `}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white text-base font-semibold ml-2">
                Create First Account
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create Account Modal */}
      <CreateAccountModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadAccounts}
        mode="create"
      />

      {/* Edit Account Modal */}
      {selectedAccount && (
        <CreateAccountModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAccount(null);
          }}
          onSuccess={loadAccounts}
          initialData={selectedAccount}
          mode="edit"
        />
      )}

      {/* Floating Action Button */}
      {accounts.length > 0 && (
        <TouchableOpacity
          onPress={handleCreateAccount}
          className={`
            absolute bottom-8 right-6 w-16 h-16 rounded-2xl items-center justify-center
            shadow-lg shadow-black/20
            ${isDark ? 'bg-dark-brand' : 'bg-brand'}
            border-2 ${isDark ? 'border-dark-border' : 'border-white/20'}
          `}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      )}

      {/* Bottom Gradient Overlay */}
      <View className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface-soft/90 to-transparent dark:from-dark-surface/90 pointer-events-none" />
    </View>
  );
}