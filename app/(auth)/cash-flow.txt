// app/(tabs)/cash-flow.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from 'nativewind';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import Transaction from '@/database/models/Transaction';
import { CashAccount } from '@/database/models/CashAccount';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '@/utils/dashboardUtils';
import * as Haptics from 'expo-haptics';
import PremiumHeader from '@/components/layout/PremiumHeader';

const { width: screenWidth } = Dimensions.get('window');

interface CashFlowData {
  periodInflow: number;
  periodOutflow: number;
  periodNetFlow: number;
  currentBalance: number;
  previousBalance: number;
  balanceChange: number;
  totalReceivables: number;
  receivablesDue: number;
  receivablesOverdue: number;
  inflowBySource: {
    cash: number;
    card: number;
    transfer: number;
    other: number;
  };
  outflowByType: {
    purchases: number;
    expenses: number;
    payroll: number;
    other: number;
  };
  dailyTotals: { date: string; value: number }[];
  monthlyTotals: { month: string; value: number }[];
  transactionCount: number;
  averageTransaction: number;
  largestInflow: number;
  largestOutflow: number;
}

interface CashFlowPageProps {
  transactions?: Transaction[];
  cashAccounts?: CashAccount[];
}

// Loading Skeleton
const LoadingSkeleton = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <View className="flex-1 bg-brand dark:bg-dark-brand">
      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Header Skeleton */}
          <View className="mb-6">
            <View className="h-8 w-48 bg-surface-soft dark:bg-dark-surface-soft rounded-lg animate-pulse mb-2" />
            <View className="h-4 w-64 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
          </View>

          {/* Balance Card Skeleton */}
          <View className="mb-6">
            <View className="h-32 bg-surface-soft dark:bg-dark-surface-soft rounded-xl animate-pulse" />
          </View>

          {/* Period Stats Skeleton */}
          <View className="flex-row gap-3 mb-6">
            {[1, 2, 3].map(i => (
              <View key={i} className="flex-1 h-24 bg-surface-soft dark:bg-dark-surface-soft rounded-xl animate-pulse" />
            ))}
          </View>

          {/* Chart Skeleton */}
          <View className="h-64 bg-surface-soft dark:bg-dark-surface-soft rounded-xl animate-pulse mb-6" />

          {/* Bottom Sections Skeleton */}
          <View className="flex-row gap-3">
            <View className="flex-1 h-48 bg-surface-soft dark:bg-dark-surface-soft rounded-xl animate-pulse" />
            <View className="flex-1 h-48 bg-surface-soft dark:bg-dark-surface-soft rounded-xl animate-pulse" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Main Page Component
const CashFlowPageInner = ({ 
  transactions = [],
  cashAccounts = []
}: CashFlowPageProps) => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedView, setSelectedView] = useState<'overview' | 'inflow' | 'outflow'>('overview');

  // Colors from your theme
  const colors = {
    brand: isDark ? '#38bdf8' : '#0ea5e9',
    brandSoft: isDark ? '#1e3a5c' : '#e0f2fe',
    success: isDark ? '#4ade80' : '#22c55e',
    successSoft: isDark ? '#1a4532' : '#dcfce7',
    warning: isDark ? '#fbbf24' : '#f59e0b',
    warningSoft: isDark ? '#453209' : '#fef3c7',
    error: isDark ? '#f87171' : '#ef4444',
    errorSoft: isDark ? '#4c1d1d' : '#fee2e2',
    info: isDark ? '#60a5fa' : '#3b82f6',
    infoSoft: isDark ? '#1e3a5c' : '#dbeafe',
    surface: isDark ? '#0f172a' : '#ffffff',
    surfaceSoft: isDark ? '#1e293b' : '#f8fafc',
    surfaceMuted: isDark ? '#334155' : '#f1f5f9',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textSoft: isDark ? '#cbd5e1' : '#475569',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#475569' : '#e2e8f0',
    borderStrong: isDark ? '#64748b' : '#cbd5e1',
  };

  // Calculate cash flow metrics
  const cashFlowData = useMemo((): CashFlowData => {
    const now = Date.now();
    let periodStart: number;

    switch(timeRange) {
      case 'week':
        periodStart = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        periodStart = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'quarter':
        periodStart = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case 'year':
        periodStart = now - 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        periodStart = now - 30 * 24 * 60 * 60 * 1000;
    }

    const periodTransactions = transactions.filter(t => t.transactionDate >= periodStart);
    
    let periodInflow = 0;
    let periodOutflow = 0;
    const inflowBySource = { cash: 0, card: 0, transfer: 0, other: 0 };
    const outflowByType = { purchases: 0, expenses: 0, payroll: 0, other: 0 };
    const dailyMap = new Map<string, number>();
    const monthlyMap = new Map<string, number>();
    
    let largestInflow = 0;
    let largestOutflow = 0;

    periodTransactions.forEach(t => {
      const amount = t.totalAmount;
      const isInflow = amount > 0;
      
      if (isInflow) {
        periodInflow += amount;
        if (amount > largestInflow) largestInflow = amount;
        
        if (t.transactionType === 'sale') {
          if (t.paymentStatus === 'paid') inflowBySource.cash += amount;
          else inflowBySource.other += amount;
        } else {
          inflowBySource.other += amount;
        }
      } else {
        const outflow = Math.abs(amount);
        periodOutflow += outflow;
        if (outflow > largestOutflow) largestOutflow = outflow;
        
        if (t.transactionType === 'purchase') outflowByType.purchases += outflow;
        else if (t.transactionType === 'expense') {
          outflowByType.expenses += outflow;
        } else {
          outflowByType.other += outflow;
        }
      }

      const date = new Date(t.transactionDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      dailyMap.set(date, (dailyMap.get(date) || 0) + amount);

      const month = new Date(t.transactionDate).toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + amount);
    });

    const currentBalance = cashAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
    const periodNetFlow = periodInflow - periodOutflow;
    const previousBalance = currentBalance - periodNetFlow;

    const receivables = transactions.filter(t => 
      t.transactionType === 'sale' && 
      t.paymentStatus !== 'paid' &&
      t.balanceDue > 0
    );
    
    const totalReceivables = receivables.reduce((sum, t) => sum + t.balanceDue, 0);
    const receivablesDue = receivables
      .filter(t => t.dueDate && t.dueDate > now)
      .reduce((sum, t) => sum + t.balanceDue, 0);
    const receivablesOverdue = receivables
      .filter(t => t.dueDate && t.dueDate < now)
      .reduce((sum, t) => sum + t.balanceDue, 0);

    const dailyTotals = Array.from(dailyMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const monthlyTotals = Array.from(monthlyMap.entries())
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const averageTransaction = periodTransactions.length > 0 
      ? periodInflow / periodTransactions.length 
      : 0;

    return {
      periodInflow,
      periodOutflow,
      periodNetFlow,
      currentBalance,
      previousBalance,
      balanceChange: currentBalance - previousBalance,
      totalReceivables,
      receivablesDue,
      receivablesOverdue,
      inflowBySource,
      outflowByType,
      dailyTotals,
      monthlyTotals,
      transactionCount: periodTransactions.length,
      averageTransaction,
      largestInflow,
      largestOutflow,
    };
  }, [transactions, cashAccounts, timeRange]);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const timeRanges = [
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
    { label: 'Year', value: 'year' },
  ] as const;

  const chartData = cashFlowData.dailyTotals.map(item => ({
    value: item.value,
    label: item.date,
    dataPointText: formatCurrency(item.value),
  }));

  const inflowPieData = [
    { value: cashFlowData.inflowBySource.cash, color: colors.success, text: 'Cash', label: 'Cash' },
    { value: cashFlowData.inflowBySource.card, color: colors.info, text: 'Card', label: 'Card' },
    { value: cashFlowData.inflowBySource.transfer, color: colors.warning, text: 'Transfer', label: 'Transfer' },
    { value: cashFlowData.inflowBySource.other, color: colors.textMuted, text: 'Other', label: 'Other' },
  ].filter(item => item.value > 0);

  const outflowPieData = [
    { value: cashFlowData.outflowByType.purchases, color: colors.warning, text: 'Purchases', label: 'Purchases' },
    { value: cashFlowData.outflowByType.expenses, color: colors.error, text: 'Expenses', label: 'Expenses' },
    { value: cashFlowData.outflowByType.payroll, color: colors.info, text: 'Payroll', label: 'Payroll' },
    { value: cashFlowData.outflowByType.other, color: colors.textMuted, text: 'Other', label: 'Other' },
  ].filter(item => item.value > 0);
  

  if(refreshing) {
    return <LoadingSkeleton />;
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader showBackButton title="Cash Flow" subtitle="Real-time financial overview" />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={isDark ? ['#1e293b', '#0f172a'] : ['#f8fafc', '#ffffff']}
          className="px-4 pt-4 pb-6"
        >
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <ThemedText variant="heading" size="2xl" className="font-bold text-text dark:text-dark-text">
                Cash Flow
              </ThemedText>
              <ThemedText variant="muted" size="sm" className="text-text-muted dark:text-dark-text-muted">
                Real-time financial overview
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-surface-soft dark:bg-dark-surface-soft items-center justify-center"
              style={{ borderWidth: 1, borderColor: colors.border }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Time Range Selector */}
          <View className="flex-row p-1 bg-surface-soft dark:bg-dark-surface-soft rounded-xl" style={{ borderWidth: 1, borderColor: colors.border }}>
            {timeRanges.map((range) => (
              <TouchableOpacity
                key={range.value}
                onPress={() => setTimeRange(range.value)}
                className={`flex-1 py-2 px-3 rounded-lg ${
                  timeRange === range.value ? 'bg-brand' : ''
                }`}
              >
                <ThemedText 
                  size="sm" 
                  className={`text-center font-medium ${
                    timeRange === range.value ? 'text-white' : 'text-text-muted dark:text-dark-text-muted'
                  }`}
                >
                  {range.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        <View className="p-4">
          {/* Balance Card with Brand Gradient */}
          <Card variant="elevated" className="mb-6 overflow-hidden" style={{ borderWidth: 0 }}>
            <LinearGradient
              colors={isDark ? ['#1e3a5c', '#0f172a'] : ['#e0f2fe', '#ffffff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <CardContent className="p-6">
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 rounded-full bg-brand-soft dark:bg-dark-brand-soft items-center justify-center mr-3">
                      <Ionicons name="wallet" size={24} color={colors.brand} />
                    </View>
                    <View>
                      <ThemedText className="text-text-muted dark:text-dark-text-muted" size="xs">Current Balance</ThemedText>
                      <ThemedText variant="heading" size="3xl" className="font-bold text-text dark:text-dark-text">
                        {formatCurrency(cashFlowData.currentBalance)}
                      </ThemedText>
                    </View>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${cashFlowData.balanceChange >= 0 ? 'bg-surface-muted dark:bg-dark-surface-muted' : 'bg-error-soft dark:bg-dark-error-soft'}`}>
                    <View className="flex-row items-center">
                      <Ionicons 
                        name={cashFlowData.balanceChange >= 0 ? 'arrow-up' : 'arrow-down'} 
                        size={14} 
                        color={cashFlowData.balanceChange >= 0 ? colors.success : colors.error} 
                      />
                      <ThemedText 
                        size="xs" 
                        className="ml-1 font-medium"
                        style={{ color: cashFlowData.balanceChange >= 0 ? colors.success : colors.error }}
                      >
                        {formatCurrency(Math.abs(cashFlowData.balanceChange))}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <View className="flex-row justify-between">
                  <View>
                    <ThemedText className="text-text-muted dark:text-dark-text-muted" size="xs">Period Inflow</ThemedText>
                    <ThemedText variant="heading" size="lg" className="font-bold text-success">
                      {formatCurrency(cashFlowData.periodInflow)}
                    </ThemedText>
                  </View>
                  <View className="items-end">
                    <ThemedText className="text-text-muted dark:text-dark-text-muted" size="xs">Period Outflow</ThemedText>
                    <ThemedText variant="heading" size="lg" className="font-bold text-error">
                      {formatCurrency(cashFlowData.periodOutflow)}
                    </ThemedText>
                  </View>
                </View>
              </CardContent>
            </LinearGradient>
          </Card>

          {/* View Selector */}
          <View className="flex-row mb-4 p-1 bg-surface-soft dark:bg-dark-surface-soft rounded-xl" style={{ borderWidth: 1, borderColor: colors.border }}>
            {['overview', 'inflow', 'outflow'].map((view) => (
              <TouchableOpacity
                key={view}
                onPress={() => setSelectedView(view as any)}
                className={`flex-1 py-3 rounded-lg ${
                  selectedView === view ? 'bg-brand' : ''
                }`}
              >
                <ThemedText 
                  size="sm" 
                  className={`text-center font-medium ${
                    selectedView === view ? 'text-white' : 'text-text-muted dark:text-dark-text-muted'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chart Section */}
          {selectedView === 'overview' && (
            <Card variant="elevated" className="mb-6 overflow-hidden" style={{ borderWidth: 1, borderColor: colors.border }}>
              <CardContent className="p-4">
                <View className="flex-row justify-between items-center mb-4">
                  <ThemedText variant="heading" size="base" className="font-semibold text-text dark:text-dark-text">
                    Daily Cash Flow
                  </ThemedText>
                  <TouchableOpacity className="p-2 rounded-full bg-surface-soft dark:bg-dark-surface-soft">
                    <Ionicons name="download-outline" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {chartData.length > 0 ? (
                  <LineChart
                    data={chartData}
                    height={200}
                    width={screenWidth - 64}
                    thickness={3}
                    color={colors.brand}
                    hideDataPoints
                    curved
                    areaChart
                    startFillColor={colors.brand}
                    endFillColor={colors.brand}
                    startOpacity={0.3}
                    endOpacity={0}
                    initialSpacing={20}
                    spacing={40}
                    xAxisColor={colors.border}
                    yAxisColor={colors.border}
                    yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
                    rulesColor={colors.border}
                    rulesThickness={1}
                    formatYLabel={(value) => formatCurrency(parseFloat(value)).replace(/\.00$/, 'k')}
                  />
                ) : (
                  <View className="h-48 items-center justify-center">
                    <Ionicons name="analytics-outline" size={48} color={colors.textMuted} />
                    <ThemedText variant="muted" size="sm" className="text-text-muted dark:text-dark-text-muted mt-2">
                      No data for this period
                    </ThemedText>
                  </View>
                )}
              </CardContent>
            </Card>
          )}

          {selectedView === 'inflow' && inflowPieData.length > 0 && (
            <Card variant="elevated" className="mb-6" style={{ borderWidth: 1, borderColor: colors.border }}>
              <CardContent className="p-4 items-center">
                <ThemedText variant="heading" size="base" className="font-semibold text-text dark:text-dark-text mb-4">
                  Inflow Sources
                </ThemedText>
                
                <PieChart
                  data={inflowPieData}
                  donut
                  radius={100}
                  innerRadius={40}
                  innerCircleColor={colors.surface}
                  showText
                  textColor={colors.text}
                  textSize={12}
                  fontFamily="Inter-Medium"
                  showTextBackground
                  textBackgroundColor={colors.surfaceSoft}
                  textBackgroundRadius={12}
                  centerLabelComponent={() => (
                    <View className="items-center">
                      <ThemedText variant="heading" size="sm" className="font-bold text-brand">
                        Total
                      </ThemedText>
                      <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">
                        {formatCurrency(cashFlowData.periodInflow)}
                      </ThemedText>
                    </View>
                  )}
                />

                <View className="flex-row flex-wrap justify-center mt-4 gap-2">
                  {inflowPieData.map((item, index) => (
                    <View key={index} className="flex-row items-center mx-2">
                      <View className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: item.color }} />
                      <ThemedText size="xs" className="text-text dark:text-dark-text">{item.label}</ThemedText>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          )}

          {selectedView === 'outflow' && outflowPieData.length > 0 && (
            <Card variant="elevated" className="mb-6" style={{ borderWidth: 1, borderColor: colors.border }}>
              <CardContent className="p-4 items-center">
                <ThemedText variant="heading" size="base" className="font-semibold text-text dark:text-dark-text mb-4">
                  Outflow Distribution
                </ThemedText>
                
                <PieChart
                  data={outflowPieData}
                  donut
                  radius={100}
                  innerRadius={40}
                  innerCircleColor={colors.surface}
                  showText
                  textColor={colors.text}
                  textSize={12}
                  fontFamily="Inter-Medium"
                  showTextBackground
                  textBackgroundColor={colors.surfaceSoft}
                  textBackgroundRadius={12}
                  centerLabelComponent={() => (
                    <View className="items-center">
                      <ThemedText variant="heading" size="sm" className="font-bold text-error">
                        Total
                      </ThemedText>
                      <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">
                        {formatCurrency(cashFlowData.periodOutflow)}
                      </ThemedText>
                    </View>
                  )}
                />

                <View className="flex-row flex-wrap justify-center mt-4 gap-2">
                  {outflowPieData.map((item, index) => (
                    <View key={index} className="flex-row items-center mx-2">
                      <View className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: item.color }} />
                      <ThemedText size="xs" className="text-text dark:text-dark-text">{item.label}</ThemedText>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          )}

          {/* Receivables Section */}
          {cashFlowData.totalReceivables > 0 && (
            <Card variant="filled" className="mb-6" style={{ borderWidth: 1, borderColor: colors.border }}>
              <CardContent className="p-4">
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center">
                    <Ionicons name="receipt" size={20} color={colors.warning} />
                    <ThemedText variant="heading" size="base" className="font-semibold text-text dark:text-dark-text ml-2">
                      Receivables
                    </ThemedText>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/receivables')}>
                    <ThemedText variant="brand" size="sm">View All</ThemedText>
                  </TouchableOpacity>
                </View>

                <View className="flex-row justify-between mb-3">
                  <View>
                    <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">Total Outstanding</ThemedText>
                    <ThemedText variant="heading" size="lg" className="font-bold text-warning">
                      {formatCurrency(cashFlowData.totalReceivables)}
                    </ThemedText>
                  </View>
                  {cashFlowData.receivablesOverdue > 0 && (
                    <View className="items-end">
                      <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">Overdue</ThemedText>
                      <ThemedText variant="heading" size="lg" className="font-bold text-error">
                        {formatCurrency(cashFlowData.receivablesOverdue)}
                      </ThemedText>
                    </View>
                  )}
                </View>

                {cashFlowData.totalReceivables > 0 && (
                  <View>
                    <View className="flex-row justify-between mb-1">
                      <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">
                        Due: {formatCurrency(cashFlowData.receivablesDue)}
                      </ThemedText>
                      <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">
                        Overdue: {formatCurrency(cashFlowData.receivablesOverdue)}
                      </ThemedText>
                    </View>
                    <View className="h-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden">
                      <View 
                        className="h-full rounded-full bg-warning absolute"
                        style={{ width: `${(cashFlowData.receivablesDue / cashFlowData.totalReceivables) * 100}%` }}
                      />
                      <View 
                        className="h-full rounded-full bg-error absolute"
                        style={{ 
                          width: `${(cashFlowData.receivablesOverdue / cashFlowData.totalReceivables) * 100}%`,
                          left: `${(cashFlowData.receivablesDue / cashFlowData.totalReceivables) * 100}%`
                        }}
                      />
                    </View>
                  </View>
                )}
              </CardContent>
            </Card>
          )}

          {/* Key Insights */}
          <View className="mb-6">
            <ThemedText variant="heading" size="base" className="font-semibold text-text dark:text-dark-text mb-3">
              Key Insights
            </ThemedText>

            <View className="space-y-2">
              <InsightCard
                icon="trending-up"
                title="Cash Flow Health"
                value={cashFlowData.periodNetFlow >= 0 ? 'Positive' : 'Negative'}
                description={cashFlowData.periodNetFlow >= 0 
                  ? `Net positive of ${formatCurrency(cashFlowData.periodNetFlow)} this period`
                  : `Net negative of ${formatCurrency(Math.abs(cashFlowData.periodNetFlow))} this period`
                }
                color={cashFlowData.periodNetFlow >= 0 ? colors.success : colors.error}
                bgColor={cashFlowData.periodNetFlow >= 0 ? colors.successSoft : colors.errorSoft}
                textColor={colors.text}
              />

              {cashFlowData.largestInflow > 0 && (
                <InsightCard
                  icon="arrow-down"
                  title="Largest Inflow"
                  value={formatCurrency(cashFlowData.largestInflow)}
                  description="Single transaction"
                  color={colors.success}
                  bgColor={colors.successSoft}
                  textColor={colors.text}
                />
              )}

              {cashFlowData.largestOutflow > 0 && (
                <InsightCard
                  icon="arrow-up"
                  title="Largest Outflow"
                  value={formatCurrency(cashFlowData.largestOutflow)}
                  description="Single transaction"
                  color={colors.error}
                  bgColor={colors.errorSoft}
                  textColor={colors.text}
                />
              )}

              {cashFlowData.receivablesOverdue > 0 && (
                <InsightCard
                  icon="alert-circle"
                  title="Overdue Receivables"
                  value={formatCurrency(cashFlowData.receivablesOverdue)}
                  description="Requires attention"
                  color={colors.error}
                  bgColor={colors.errorSoft}
                  textColor={colors.text}
                />
              )}
            </View>
          </View>

          {/* Monthly Trend */}
          {cashFlowData.monthlyTotals.length > 1 && (
            <Card variant="filled" className="mb-6" style={{ borderWidth: 1, borderColor: colors.border }}>
              <CardContent className="p-4">
                <ThemedText variant="heading" size="base" className="font-semibold text-text dark:text-dark-text mb-3">
                  Monthly Trend
                </ThemedText>
                {cashFlowData.monthlyTotals.slice(-6).map((item, index) => (
                  <View key={index} className="flex-row items-center py-2 border-b border-border dark:border-dark-border last:border-0">
                    <ThemedText size="sm" className="w-20 text-text dark:text-dark-text">{item.month}</ThemedText>
                    <View className="flex-1 mx-2">
                      <View className="h-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden">
                        <View 
                          className="h-full rounded-full bg-brand"
                          style={{ 
                            width: `${Math.abs(item.value) / Math.max(...cashFlowData.monthlyTotals.map(m => Math.abs(m.value))) * 100}%` 
                          }}
                        />
                      </View>
                    </View>
                    <ThemedText 
                      size="sm" 
                      className={`font-medium ${
                        item.value >= 0 ? 'text-success' : 'text-error'
                      }`}
                    >
                      {formatCurrency(item.value)}
                    </ThemedText>
                  </View>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <View className="flex-row gap-3 mb-8">
            <TouchableOpacity
              onPress={() => router.push('/transactions/new')}
              className="flex-1 py-4 bg-brand rounded-xl flex-row items-center justify-center"
              style={{ shadowColor: colors.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <ThemedText className="text-white font-medium ml-2">New Transaction</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => router.push('/reports/cash-flow')}
              className="flex-1 py-4 bg-surface-soft dark:bg-dark-surface-soft rounded-xl flex-row items-center justify-center"
              style={{ borderWidth: 1, borderColor: colors.border }}
            >
              <Ionicons name="document-text" size={20} color={colors.text} />
              <ThemedText className="text-text dark:text-dark-text ml-2 font-medium">Full Report</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Insight Card Component
const InsightCard = ({ 
  icon, 
  title, 
  value, 
  description, 
  color, 
  bgColor,
  textColor
}: { 
  icon: string; 
  title: string; 
  value: string; 
  description: string; 
  color: string; 
  bgColor: string;
  textColor: string;
}) => (
  <View className="flex-row items-center p-3 bg-surface-soft dark:bg-dark-surface-soft rounded-xl" style={{ borderWidth: 1, borderColor: 'transparent' }}>
    <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: bgColor }}>
      <Ionicons name={icon as any} size={18} color={color} />
    </View>
    <View className="flex-1">
      <ThemedText size="xs" className="text-text-muted dark:text-dark-text-muted">{title}</ThemedText>
      <View className="flex-row items-center">
        <ThemedText variant="heading" size="base" className="font-bold mr-2" style={{ color }}>
          {value}
        </ThemedText>
        <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">{description}</ThemedText>
      </View>
    </View>
  </View>
);

// Enhance with observables
const enhance = withObservables(
  ['currentShop'],
  ({ currentShop }: { currentShop: any }) => {
    if (!currentShop) {
      return {
        transactions: [],
        cashAccounts: [],
      };
    }

    const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;

    return {
      transactions: database
        .get<Transaction>('transactions')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('transaction_date', Q.gte(yearAgo)),
          Q.sortBy('transaction_date', Q.desc)
        )
        .observe(),
      cashAccounts: database
        .get<CashAccount>('cash_accounts')
        .query(
          Q.where('shop_id', currentShop.id)
        )
        .observe(),
    };
  }
);

const CashFlowPageWithObservables = enhance(CashFlowPageInner);

export default function CashFlowPage() {
  const { currentShop } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!currentShop) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-dark-background">
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="storefront-outline" size={64} color={isDark ? '#94a3b8' : '#64748b'} />
          <ThemedText variant="heading" size="lg" className="font-bold text-center mt-4 text-text dark:text-dark-text">
            No Shop Selected
          </ThemedText>
          <ThemedText variant="muted" size="sm" className="text-center mt-2 text-text-muted dark:text-dark-text-muted">
            Please select a shop to view cash flow
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return <CashFlowPageWithObservables currentShop={currentShop} />;
}