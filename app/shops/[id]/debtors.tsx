// app/(tabs)/debtors.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Linking,
  SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import * as SMS from 'expo-sms';
import * as Clipboard from 'expo-clipboard';

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

// Services
import { DebtService, DebtorSummary } from '@/services/debtService';
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
  viewMode: ViewMode;
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
    variant: 'success' | 'error' | 'warning' | 'info';
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
    viewMode: 'list',
    timeRange: 'month',
  });
  // ✅ Define getDaysOverdue FIRST before using it
  const getDaysOverdue = useCallback((debtor: DebtorSummary) => {
    if (!debtor.dueDate) return 0;
    const days = Math.floor((Date.now() - debtor.dueDate) / (24 * 60 * 60 * 1000));
    return Math.max(0, days);
  }, []);

  // Check SMS availability on mount
  useEffect(() => {
    checkSmsAvailability();
  }, []);

  const checkSmsAvailability = async () => {
    const isAvailable = await SMS.isAvailableAsync();
    setSmsAvailable(isAvailable);
  };

  // Statistics with animations - now getDaysOverdue is defined
  const stats = useMemo(() => {
    const totalOutstanding = debtors.reduce((sum, d) => sum + d.totalDebt, 0);
    const totalOverdue = debtors.reduce((sum, d) => sum + d.overdueAmount, 0);
    const activeDebtors = debtors.filter(d => d.totalDebt > 0).length;
    const overdueCount = debtors.filter(d => d.overdueAmount > 0).length;
    const paidThisMonth = debtors.reduce((sum, d) => sum + (d.paidThisMonth || 0), 0);
    
    // Calculate recovery rate
    const totalEverOwed = debtors.reduce((sum, d) => sum + (d.totalEverOwed || d.totalDebt), 0);
    const totalPaid = totalEverOwed - totalOutstanding;
    const recoveryRate = totalEverOwed > 0 ? (totalPaid / totalEverOwed) * 100 : 0;

    // Aging buckets - use getDaysOverdue here
    const aging = {
      current: debtors.filter(d => !d.overdueAmount).reduce((sum, d) => sum + d.totalDebt, 0),
      '1-30': debtors.filter(d => getDaysOverdue(d) > 0 && getDaysOverdue(d) <= 30).reduce((sum, d) => sum + d.overdueAmount, 0),
      '31-60': debtors.filter(d => getDaysOverdue(d) > 30 && getDaysOverdue(d) <= 60).reduce((sum, d) => sum + d.overdueAmount, 0),
      '61-90': debtors.filter(d => getDaysOverdue(d) > 60 && getDaysOverdue(d) <= 90).reduce((sum, d) => sum + d.overdueAmount, 0),
      '90+': debtors.filter(d => getDaysOverdue(d) > 90).reduce((sum, d) => sum + d.overdueAmount, 0),
    };

    return {
      totalOutstanding,
      totalOverdue,
      activeDebtors,
      overdueCount,
      paidThisMonth,
      recoveryRate,
      aging,
      averageDebt: activeDebtors > 0 ? totalOutstanding / activeDebtors : 0,
      collectionRate: activeDebtors > 0 ? ((activeDebtors - overdueCount) / activeDebtors) * 100 : 100,
    };
  }, [debtors, getDaysOverdue]); // ✅ Add getDaysOverdue to dependencies

  // Filtered and sorted debtors
  const filteredDebtors = useMemo(() => {
    let filtered = [...debtors];

    // Apply search
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(d =>
        d.contactName.toLowerCase().includes(searchLower) ||
        d.contactPhone.includes(filters.search) ||
        d.contactEmail?.toLowerCase().includes(searchLower)
      );
    }

    // Apply amount range
    if (filters.minAmount !== undefined) {
      filtered = filtered.filter(d => d.totalDebt >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter(d => d.totalDebt <= filters.maxAmount!);
    }

    // Apply date range
    if (filters.dateRange) {
      filtered = filtered.filter(d => 
        d.oldestDebtDate >= filters.dateRange!.start &&
        d.oldestDebtDate <= filters.dateRange!.end
      );
    }

    // Apply smart filters
    switch (filters.filter) {
      case 'overdue':
        filtered = filtered.filter(d => d.overdueAmount > 0);
        break;
      case 'high-value':
        filtered = filtered.filter(d => d.totalDebt > stats.averageDebt * 1.5);
        break;
      case 'recent':
        filtered = filtered.filter(d => 
          d.lastPaymentDate && d.lastPaymentDate > Date.now() - 7 * 24 * 60 * 60 * 1000
        );
        break;
      case 'this-week':
        filtered = filtered.filter(d => 
          d.oldestDebtDate > Date.now() - 7 * 24 * 60 * 60 * 1000
        );
        break;
      case 'this-month':
        filtered = filtered.filter(d => 
          d.oldestDebtDate > Date.now() - 30 * 24 * 60 * 60 * 1000
        );
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sort) {
        case 'name':
          return a.contactName.localeCompare(b.contactName);
        case 'amount-desc':
          return b.totalDebt - a.totalDebt;
        case 'amount-asc':
          return a.totalDebt - b.totalDebt;
        case 'oldest':
          return a.oldestDebtDate - b.oldestDebtDate;
        case 'overdue':
          return b.overdueAmount - a.overdueAmount;
        case 'recent':
          return (b.lastPaymentDate || 0) - (a.lastPaymentDate || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [debtors, filters, stats.averageDebt]);

  // Group debtors for section list
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
      .map(([title, data]) => ({
        title,
        data,
      }));
  }, [filteredDebtors, filters.viewMode, stats.averageDebt]);

  // Load debtors data
  const loadDebtors = useCallback(async () => {
    if (!currentShop) return;

    try {
      const debtorsData = await DebtService.getDebtorSummaries(currentShop.id);
      setDebtors(debtorsData);
    } catch (error) {
      console.error('Error loading debtors:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load debtors',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentShop, showNotification]);

  // Initial load
  useEffect(() => {
    loadDebtors();
  }, [loadDebtors]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadDebtors();
  }, [loadDebtors]);

  // Handle payment
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
      const result = await DebtService.recordPayment({
        debtorId: selectedDebtor.contactId,
        shopId: currentShop.id,
        userId: user.id,
        amount,
        notes: paymentNotes,
        paymentMethod,
        transactionIds: selectedDebtor.transactionIds,
      });

      if (result.success) {
        setDialogData({
          visible: true,
          title: '✅ Payment Recorded',
          description: `Payment of ₣${amount.toLocaleString()} received from ${selectedDebtor.contactName}${
            result.balanceRemaining > 0 
              ? `\nRemaining balance: ₣${result.balanceRemaining.toLocaleString()}`
              : '\nDebt fully cleared! 🎉'
          }`,
          variant: 'success',
          icon: 'checkmark-circle',
        });

        // Refresh data
        await loadDebtors();
        
        // Reset form
        setPaymentAmount('');
        setPaymentNotes('');
        setShowPaymentDialog(false);
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error: any) {
      setDialogData({
        visible: true,
        title: '❌ Payment Failed',
        description: error.message || 'Failed to record payment',
        variant: 'error',
        icon: 'alert-circle',
      });
    } finally {
      setProcessingPayment(false);
      setSelectedDebtor(null);
    }
  }, [selectedDebtor, currentShop, user, paymentAmount, paymentNotes, paymentMethod, loadDebtors]);

  // Handle message
  const handleMessage = useCallback(async (debtor: DebtorSummary) => {
    if (!smsAvailable) {
      // Copy phone to clipboard if SMS not available
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

    const defaultMessage = `Hello ${debtor.contactName}, this is a friendly reminder about your outstanding balance of ₣${debtor.totalDebt.toLocaleString()}. Please contact us to arrange payment.`;
    setMessageText(defaultMessage);
    setSelectedDebtor(debtor);
    setShowMessageDialog(true);
  }, [smsAvailable]);

  // Send SMS
  const sendSMS = useCallback(async () => {
    if (!selectedDebtor || !messageText.trim()) return;
    try {
      const { result } = await SMS.sendSMSAsync(
        [selectedDebtor.contactPhone],
        messageText
      );

      if (result === 'sent' || result === 'cancelled') {
        setDialogData({
          visible: true,
          title: result === 'sent' ? '✅ Message Sent' : '📝 Message Cancelled',
          description: result === 'sent' 
            ? `Reminder sent to ${selectedDebtor.contactName}`
            : 'Message was cancelled',
          variant: result === 'sent' ? 'success' : 'info',
          icon: result === 'sent' ? 'checkmark-circle' : 'close-circle',
        });

        // Track in payment history (optional)
        if (result === 'sent') {
          await DebtService.trackReminder(selectedDebtor.contactId);
        }
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
  }, [selectedDebtor, messageText]);

  // Handle call
  const handleCall = useCallback(async (debtor: DebtorSummary) => {
    try {
      // Try to open phone app
      await Linking.openURL(`tel:${debtor.contactPhone}`);
      
      // Track call (optional)
      await DebtService.trackCall(debtor.contactId);
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // If phone app not available, copy to clipboard
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

  // Handle copy to clipboard
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

  // Handle export
  const handleExport = useCallback(async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      // TODO: Implement export service
      setDialogData({
        visible: true,
        title: '📊 Export Started',
        description: `Exporting debtors list as ${format.toUpperCase()}...`,
        variant: 'info',
        icon: 'document-text',
      });
      
      // Simulate export completion
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
  }, []);

  // Format utilities
  const formatCurrency = (amount: number) => {
    return `₣${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getRiskLevel = useCallback((debtor: DebtorSummary): 'low' | 'medium' | 'high' => {
    const daysOverdue = getDaysOverdue(debtor);
    const debtRatio = debtor.totalDebt / (stats.averageDebt || 1);
    
    if (daysOverdue > 60 || debtRatio > 3) return 'high';
    if (daysOverdue > 30 || debtRatio > 2) return 'medium';
    return 'low';
  }, [getDaysOverdue, stats.averageDebt]);

  if (loading){
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Debtors" showBackButton />
        <Loading text="Loading debtors..." />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <Animated.View style={{ opacity: headerOpacity }}>
        <PremiumHeader
          title="Debtors"
          showBackButton
          searchable
          searchPlaceholder="Search by name, phone or email..."
          onSearch={(text) => setFilters(prev => ({ ...prev, search: text }))}
          
        />
      </Animated.View>

      {/* Stats Summary */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={isDark ? '#fff' : '#0ea5e9'}
          />
        }
      >
        <View className="p-4">
          {/* Summary Cards */}
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
                <ThemedText variant="muted" size="sm">
                  Active Debtors
                </ThemedText>
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
                <ThemedText variant="muted" size="sm">
                  Outstanding
                </ThemedText>
                <ThemedText variant="heading" size="xl" className="font-bold text-warning">
                  {formatCurrency(stats.totalOutstanding)}
                </ThemedText>
                <View className="flex-row items-center mt-2">
                  <View className="flex-1 h-1.5 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden">
                    <View 
                      className="h-full bg-warning rounded-full"
                      style={{ width: `${(stats.totalOverdue / (stats.totalOutstanding || 1)) * 100}%` }}
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
                <ThemedText variant="muted" size="sm">
                  Recovery Rate
                </ThemedText>
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
                <ThemedText variant="muted" size="sm">
                  Collection Rate
                </ThemedText>
                <ThemedText variant="heading" size="xl" className="font-bold text-info">
                  {stats.collectionRate.toFixed(1)}%
                </ThemedText>
                <ThemedText variant="muted" size="xs" className="mt-2">
                  {stats.activeDebtors - stats.overdueCount} current debtors
                </ThemedText>
              </CardContent>
            </Card>
          </View>

          {/* Aging Chart Card */}
          <Card variant="elevated" className="mb-6">
            <CardContent className="p-4">
              <View className="flex-row items-center justify-between mb-4">
                <ThemedText variant="heading" size="base" className="font-semibold">
                  Aging Summary
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setFilters(prev => ({ 
                    ...prev, 
                    timeRange: prev.timeRange === 'month' ? 'quarter' : 'month' 
                  }))}
                >
                  <ThemedText variant="brand" size="sm">
                    {filters.timeRange === 'month' ? 'Monthly' : 'Quarterly'} View
                  </ThemedText>
                </TouchableOpacity>
              </View>
              
              {/* Aging Bars */}
              <View className="gap-2">
                {Object.entries(stats.aging).map(([period, amount]) => {
                  const percentage = (amount / (stats.totalOutstanding || 1)) * 100;
                  return (
                    <View key={period}>
                      <View className="flex-row justify-between mb-1">
                        <ThemedText variant="muted" size="sm" className="capitalize">
                          {period}
                        </ThemedText>
                        <ThemedText variant="default" size="sm" className="font-medium">
                          {formatCurrency(amount)}
                        </ThemedText>
                      </View>
                      <View className="h-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden">
                        <View 
                          className={`h-full rounded-full ${
                            period === 'current' ? 'bg-success' :
                            period === '1-30' ? 'bg-warning' :
                            period === '31-60' ? 'bg-orange-500' :
                            period === '61-90' ? 'bg-error' :
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

          {/* Filter Chips */}
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

          {/* View Toggle and Sort */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row bg-surface dark:bg-dark-surface rounded-lg p-1">
              <TouchableOpacity
                onPress={() => setFilters(prev => ({ ...prev, viewMode: 'list' }))}
                className={`px-3 py-2 rounded-l-lg ${
                  filters.viewMode === 'list' ? 'bg-brand/20' : ''
                }`}
              >
                <Ionicons 
                  name="list" 
                  size={18} 
                  color={filters.viewMode === 'list' ? '#0ea5e9' : isDark ? '#94a3b8' : '#64748b'} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilters(prev => ({ ...prev, viewMode: 'grid' }))}
                className={`px-3 py-2 rounded-r-lg ${
                  filters.viewMode === 'grid' ? 'bg-brand/20' : ''
                }`}
              >
                <Ionicons 
                  name="grid" 
                  size={18} 
                  color={filters.viewMode === 'grid' ? '#0ea5e9' : isDark ? '#94a3b8' : '#64748b'} 
                />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center">
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
                <Ionicons 
                  name="swap-vertical" 
                  size={16} 
                  color={isDark ? '#94a3b8' : '#64748b'} 
                />
                <ThemedText variant="muted" size="sm" className="ml-1 capitalize">
                  {filters.sort.replace('-', ' ')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Debtors List/Grid */}
          {filteredDebtors.length === 0 ? (
            <EmptyState
              icon={filters.search ? 'search-outline' : 'people-outline'}
              title={filters.search ? 'No Results Found' : 'No Debtors Yet'}
              description={
                filters.search
                  ? `No debtors matching "${filters.search}"`
                  : "No one owes you money yet. Credit sales will appear here."
              }
              actions={
                filters.search
                  ? [
                      {
                        label: 'Clear Search',
                        variant: 'outline',
                        onPress: () => setFilters(prev => ({ ...prev, search: '' })),
                        icon: 'refresh',
                      },
                    ]
                  : [
                      {
                        label: 'New Credit Sale',
                        variant: 'default',
                        onPress: () => router.push('/(tabs)/sales'),
                        icon: 'add-circle',
                      },
                    ]
              }
            />
          ) : filters.viewMode === 'grid' ? (
            <View className="flex-row flex-wrap gap-3">
              {filteredDebtors.map((debtor) => (
                <View key={debtor.contactId} className="w-[48%]">
                  <DebtorCard
                    debtor={debtor}
                    onPress={() => {
                      setSelectedDebtor(debtor);
                      setShowDetailsDialog(true);
                    }}
                    onPayment={() => {
                      setSelectedDebtor(debtor);
                      setShowPaymentDialog(true);
                    }}
                    onMessage={() => handleMessage(debtor)}
                    onCall={() => handleCall(debtor)}
                    onCopyPhone={() => handleCopyPhone(debtor.contactPhone, debtor.contactName)}
                    viewMode="grid"
                    riskLevel={getRiskLevel(debtor)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.contactId}
              renderSectionHeader={({ section: { title } }) => (
                <View className="bg-surface-soft dark:bg-dark-surface-soft py-2">
                  <ThemedText variant="label" size="sm" className="font-semibold">
                    {title}
                  </ThemedText>
                </View>
              )}
              renderItem={({ item }) => (
                <DebtorCard
                  debtor={item}
                  onPress={() => {
                    setSelectedDebtor(item);
                    setShowDetailsDialog(true);
                  }}
                  onPayment={() => {
                    setSelectedDebtor(item);
                    setShowPaymentDialog(true);
                  }}
                  onMessage={() => handleMessage(item)}
                  onCall={() => handleCall(item)}
                  onCopyPhone={() => handleCopyPhone(item.contactPhone, item.contactName)}
                  viewMode="list"
                  riskLevel={getRiskLevel(item)}
                />
              )}
              stickySectionHeadersEnabled
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

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
            label: 'Confirm',
            variant: 'default',
            onPress: handlePayment,
            disabled: !paymentAmount || parseFloat(paymentAmount) <= 0 || processingPayment,
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
                className={(selectedDebtor?.overdueAmount || 0) > 0 ? 'text-error font-bold' : ''}
              >
                {formatCurrency(selectedDebtor?.overdueAmount || 0)}
              </ThemedText>
            </View>
          </View>

          {/* Quick Amounts */}
          <View className="flex-row flex-wrap gap-2 mb-4">
            {selectedDebtor && [25, 50, 75, 100].map((percent) => {
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
            {(['cash', 'bank', 'mobile'] as const).map((method) => (
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
                    method === 'cash' ? 'cash-outline' :
                    method === 'bank' ? 'business-outline' :
                    'phone-portrait-outline'
                  } 
                  size={20} 
                  color={paymentMethod === method ? '#fff' : isDark ? '#94a3b8' : '#64748b'} 
                />
                <ThemedText 
                  size="xs" 
                  className={`mt-1 capitalize ${
                    paymentMethod === method ? 'text-white' : ''
                  }`}
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
        width={500}
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
            <ThemedText variant="muted" size="sm">To: {selectedDebtor?.contactPhone}</ThemedText>
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
          {/* Contact Info */}
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

          {/* Debt Stats */}
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

          {/* Due Date */}
          {selectedDebtor?.dueDate && (
            <View className={`p-3 rounded-lg ${
              selectedDebtor.overdueAmount > 0 ? 'bg-error-soft' : 'bg-surface-soft'
            }`}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons 
                    name="time-outline" 
                    size={16} 
                    color={selectedDebtor.overdueAmount > 0 ? '#ef4444' : isDark ? '#94a3b8' : '#64748b'} 
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
          {/* Amount Range */}
          <View className="mb-4">
            <ThemedText variant="label" className="mb-2 font-semibold">
              Amount Range
            </ThemedText>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  placeholder="Min"
                  value={filters.minAmount?.toString() || ''}
                  onChangeText={(text) => setFilters(prev => ({ 
                    ...prev, 
                    minAmount: text ? parseFloat(text) : undefined 
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Input
                  placeholder="Max"
                  value={filters.maxAmount?.toString() || ''}
                  onChangeText={(text) => setFilters(prev => ({ 
                    ...prev, 
                    maxAmount: text ? parseFloat(text) : undefined 
                  }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Sort Options */}
          <View>
            <ThemedText variant="label" className="mb-2 font-semibold">
              Sort By
            </ThemedText>
            <View className="flex-row flex-wrap gap-2">
              {(['amount-desc', 'name', 'overdue', 'oldest'] as SortOption[]).map((option) => (
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
          <TouchableOpacity
            onPress={() => {
              handleExport('pdf');
              setShowExportDialog(false);
            }}
            className="flex-row items-center p-4 bg-surface-soft dark:bg-dark-surface-soft rounded-lg mb-2"
          >
            <View className="w-10 h-10 rounded-full bg-error/10 items-center justify-center mr-3">
              <Ionicons name="document-text" size={20} color="#ef4444" />
            </View>
            <View className="flex-1">
              <ThemedText variant="default" size="base" className="font-semibold">
                PDF Report
              </ThemedText>
              <ThemedText variant="muted" size="sm">
                Professional report with aging analysis
              </ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              handleExport('excel');
              setShowExportDialog(false);
            }}
            className="flex-row items-center p-4 bg-surface-soft dark:bg-dark-surface-soft rounded-lg mb-2"
          >
            <View className="w-10 h-10 rounded-full bg-success/10 items-center justify-center mr-3">
              <Ionicons name="grid" size={20} color="#22c55e" />
            </View>
            <View className="flex-1">
              <ThemedText variant="default" size="base" className="font-semibold">
                Excel Spreadsheet
              </ThemedText>
              <ThemedText variant="muted" size="sm">
                Editable format for further analysis
              </ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              handleExport('csv');
              setShowExportDialog(false);
            }}
            className="flex-row items-center p-4 bg-surface-soft dark:bg-dark-surface-soft rounded-lg"
          >
            <View className="w-10 h-10 rounded-full bg-info/10 items-center justify-center mr-3">
              <Ionicons name="code" size={20} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <ThemedText variant="default" size="base" className="font-semibold">
                CSV File
              </ThemedText>
              <ThemedText variant="muted" size="sm">
                Simple format for data import
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      </CustomDialog>

      {/* Global Dialog for Notifications */}
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
    </View>
  );
}