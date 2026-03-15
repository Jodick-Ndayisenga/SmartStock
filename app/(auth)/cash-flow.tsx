// app/(tabs)/cashflow.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from "react-native-gifted-charts";
import { useWindowDimensions } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Loading } from '@/components/ui/Loading';

// Models
import Transaction from '@/database/models/Transaction';
import { Product } from '@/database/models/Product';
import { StockMovement } from '@/database/models/StockMovement';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';

// Types
interface CashFlowSummary {
  currentBalance: number;
  netCashFlow: number;
  moneyIn: number;
  moneyOut: number;
  operatingCF: number;
  investingCF: number;
  financingCF: number;
  beginningBalance: number;
}

interface CashFlowTransaction {
  id: string;
  date: Date;
  amount: number;
  type: 'in' | 'out';
  category: string;
  description: string;
  reference: string;
  paymentMethod: string;
}

interface CashFlowByCategory {
  category: string;
  amount: number;
  color: string;
  percentage: number;
}

type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

// Loading Skeleton Component
const CashFlowSkeleton = () => {
  const { width } = useWindowDimensions();
  
  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader title="Cash Flow" showBackButton />
      <ScrollView className="flex-1">
        {/* Period Selector Skeleton */}
        <View className="px-4 py-2">
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} className="w-16 h-8 bg-surface dark:bg-dark-surface rounded-full animate-pulse" />
            ))}
          </View>
        </View>

        {/* View Selector Skeleton */}
        <View className="mx-2 mt-2">
          <View className="flex-row bg-surface dark:bg-dark-surface rounded-lg p-1">
            {[1, 2, 3, 4].map((i) => (
              <View key={i} className="flex-1 h-8 bg-surface-soft dark:bg-dark-surface-soft rounded-md mx-1 animate-pulse" />
            ))}
          </View>
        </View>

        {/* Summary Cards Skeleton */}
        <View className="flex-row flex-wrap px-2 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="w-[48%] mr-[4%] mb-4">
              <View className="bg-white dark:bg-dark-surface rounded-xl p-3">
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 rounded-full bg-surface-soft dark:bg-dark-surface-soft animate-pulse mr-2" />
                  <View className="w-16 h-4 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
                </View>
                <View className="w-24 h-6 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse mb-1" />
                <View className="w-16 h-3 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
              </View>
            </View>
          ))}
        </View>

        {/* Chart Skeleton */}
        <View className="mx-2 mt-4">
          <View className="bg-white dark:bg-dark-surface rounded-xl p-4">
            <View className="w-32 h-5 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse mb-2" />
            <View className="w-48 h-4 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse mb-4" />
            
            {/* Chart Type Selector Skeleton */}
            <View className="flex-row gap-2 mb-4">
              {[1, 2, 3].map((i) => (
                <View key={i} className="w-20 h-8 bg-surface-soft dark:bg-dark-surface-soft rounded-full animate-pulse" />
              ))}
            </View>
            
            {/* Chart Area Skeleton */}
            <View className="h-[200px] w-full bg-surface-soft dark:bg-dark-surface-soft rounded-lg animate-pulse" />
          </View>
        </View>

        {/* Category Breakdown Skeleton */}
        <View className="mx-2 mt-4">
          <View className="bg-white dark:bg-dark-surface rounded-xl p-4">
            <View className="w-40 h-5 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse mb-2" />
            <View className="w-56 h-4 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse mb-4" />
            
            {[1, 2, 3, 4].map((i) => (
              <View key={i} className="mb-3">
                <View className="flex-row justify-between mb-1">
                  <View className="flex-row items-center">
                    <View className="w-3 h-3 rounded-full bg-surface-soft dark:bg-dark-surface-soft animate-pulse mr-2" />
                    <View className="w-20 h-4 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
                  </View>
                  <View className="w-16 h-4 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
                </View>
                <View className="w-full h-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full animate-pulse" />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Inner component that receives observable data
const CashFlowScreenInner = ({
  transactions = [],
  products = [],
  stockMovements = [],
  isLoading = false,
}: {
  transactions?: Transaction[],
  products?: Product[],
  stockMovements?: StockMovement[],
  isLoading?: boolean;
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { currentShop } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [selectedView, setSelectedView] = useState<'overview' | 'statement' | 'categories' | 'forecast'>('overview');
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(1))); // First day of month
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Show loading skeleton while data is loading
  if (isLoading) {
    return <CashFlowSkeleton />;
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return `FBU ${amount.toLocaleString('fr-FR')}`;
  };

  const formatShortCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `FBU ${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `FBU ${(amount / 1000).toFixed(0)}K`;
    }
    return `FBU ${amount}`;
  };

  // Get date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (selectedPeriod) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        // custom - use state values
        return { start: startDate, end: endDate };
    }
    return { start, end };
  };

  // Calculate cash flow summary
  const summary = useMemo((): CashFlowSummary => {
    const { start, end } = getDateRange();
    
    // Filter transactions within date range
    const periodTransactions = transactions.filter(t => {
      const tDate = new Date(t.transactionDate);
      return tDate >= start && tDate <= end;
    });

    // Calculate totals
    let moneyIn = 0;
    let moneyOut = 0;
    let operatingCF = 0;
    let investingCF = 0;
    let financingCF = 0;

    periodTransactions.forEach(t => {
      if (t.totalAmount > 0) {
        moneyIn += t.totalAmount;
        // Assume sales are operating activities
        operatingCF += t.totalAmount;
      }
    });

    // Add stock purchases as operating outflow
    const stockPurchases = stockMovements
      .filter(m => m.movementType === 'IN' || m.movementType === 'PURCHASE')
      .reduce((sum, m) => sum + (m.quantity * 1000), 0); // Rough estimate - you'd need actual cost

    moneyOut += stockPurchases;
    operatingCF -= stockPurchases;

    // Get beginning balance (all time)
    const allTransactions = transactions;
    const beginningBalance = allTransactions.reduce((sum, t) => sum + t.totalAmount, 0);

    const netCashFlow = moneyIn - moneyOut;
    const currentBalance = beginningBalance;

    return {
      currentBalance,
      netCashFlow,
      moneyIn,
      moneyOut,
      operatingCF,
      investingCF,
      financingCF,
      beginningBalance: currentBalance - netCashFlow,
    };
  }, [transactions, stockMovements, selectedPeriod, startDate, endDate]);

  // Update the chart data preparation
  const chartData = useMemo(() => {
    const { start, end } = getDateRange();
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const points = Math.min(days, 30); // Max 30 points for readability
    
    const inflow: any[] = [];
    const outflow: any[] = [];
    
    for (let i = 0; i < points; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + Math.floor((i * days) / points));
      
      // Format label
      let label = '';
      if (selectedPeriod === 'today') {
        label = date.getHours() + 'h';
      } else if (selectedPeriod === 'week' || selectedPeriod === 'month') {
        label = date.getDate() + '/' + (date.getMonth() + 1);
      } else {
        label = date.getDate() + '/' + (date.getMonth() + 1);
      }
      
      // Calculate daily totals
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayInflow = transactions
        .filter(t => t.transactionDate >= dayStart.getTime() && t.transactionDate <= dayEnd.getTime() && t.totalAmount > 0)
        .reduce((sum, t) => sum + t.totalAmount, 0);
      
      const dayOutflow = transactions
        .filter(t => t.transactionDate >= dayStart.getTime() && t.transactionDate <= dayEnd.getTime() && t.totalAmount < 0)
        .reduce((sum, t) => sum + Math.abs(t.totalAmount), 0);
      
      inflow.push({
        value: dayInflow,
        label: label,
        dataPointText: formatShortCurrency(dayInflow),
      });
      
      outflow.push({
        value: dayOutflow,
        label: label,
        dataPointText: formatShortCurrency(dayOutflow),
      });
    }
    
    return {
      inflow,
      outflow,
    };
  }, [transactions, selectedPeriod]);

  // Category breakdown
  const categoryBreakdown = useMemo((): CashFlowByCategory[] => {
    const categories: Record<string, number> = {};
    
    transactions.forEach(t => {
      const category = t.paymentMethod || 'Other';
      categories[category] = (categories[category] || 0) + t.totalAmount;
    });
    
    const total = Object.values(categories).reduce((sum, val) => sum + Math.abs(val), 0);
    const colors = ['#0ea5e9', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];
    
    return Object.entries(categories)
      .map(([category, amount], index) => ({
        category,
        amount: Math.abs(amount),
        color: colors[index % colors.length],
        percentage: total > 0 ? (Math.abs(amount) / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [transactions]);

  // Recent transactions for cash flow
  const recentTransactions = useMemo((): CashFlowTransaction[] => {
    return transactions
      .sort((a, b) => b.transactionDate - a.transactionDate)
      .slice(0, 10)
      .map(t => ({
        id: t.id,
        date: new Date(t.transactionDate),
        amount: Math.abs(t.totalAmount),
        type: t.totalAmount > 0 ? 'in' : 'out',
        category: t?.paymentMethod || 'Sale',
        description: `Transaction ${t.id.slice(0, 8)}`,
        reference: t.id,
        paymentMethod: t?.paymentMethod || 'Cash',
      }));
  }, [transactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      database.get<Transaction>('transactions').query().fetch(),
      database.get<Product>('products').query().fetch(),
      database.get<StockMovement>('stock_movements').query().fetch(),
    ]);
    setRefreshing(false);
  };

  // Time period selector component
  const PeriodSelector = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2 py-2">
      <View className="flex-row gap-2">
        {(['today', 'week', 'month', 'quarter', 'year'] as TimePeriod[]).map(period => (
          <TouchableOpacity
            key={period}
            onPress={() => setSelectedPeriod(period)}
            className={`px-2 py-2 rounded-full ${
              selectedPeriod === period 
                ? 'bg-brand' 
                : 'bg-surface-soft dark:bg-dark-surface-soft'
            }`}
          >
            <ThemedText 
              variant={selectedPeriod === period ? 'default' : 'muted'}
              className={selectedPeriod === period ? 'text-white' : ''}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  // View selector tabs
  const ViewSelector = () => (
    <View className="flex-row mx-2 mt-2 bg-surface-soft dark:bg-dark-surface-soft rounded-lg p-1">
      {(['overview', 'statement', 'categories', 'forecast'] as const).map(view => (
        <TouchableOpacity
          key={view}
          onPress={() => setSelectedView(view)}
          className={`flex-1 py-2 rounded-md ${
            selectedView === view ? 'bg-white dark:bg-dark-surface' : ''
          }`}
        >
          <ThemedText 
            variant={selectedView === view ? 'default' : 'muted'}
            className="text-center capitalize"
          >
            {view}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Summary Cards Component
  const SummaryCards = () => (
    <View className="flex-row flex-wrap px-2 mt-4">
      <Card variant="elevated" className="w-[48%] mr-[4%] mb-4">
        <CardContent className="p-3">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-success/10 items-center justify-center mr-2">
              <Ionicons name="trending-up" size={16} color="#22c55e" />
            </View>
            <ThemedText variant="muted" size="sm">Money In</ThemedText>
          </View>
          <ThemedText variant="brand" size="xl" className="font-bold">
            {formatShortCurrency(summary.moneyIn)}
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="mt-1">
            This period
          </ThemedText>
        </CardContent>
      </Card>

      <Card variant="elevated" className="w-[48%] mb-4">
        <CardContent className="p-3">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-error/10 items-center justify-center mr-2">
              <Ionicons name="trending-down" size={16} color="#ef4444" />
            </View>
            <ThemedText variant="muted" size="sm">Money Out</ThemedText>
          </View>
          <ThemedText variant="brand" size="xl" className="font-bold">
            {formatShortCurrency(summary.moneyOut)}
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="mt-1">
            This period
          </ThemedText>
        </CardContent>
      </Card>

      <Card variant="elevated" className="w-[48%] mr-[4%]">
        <CardContent className="p-3">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-brand/10 items-center justify-center mr-2">
              <Ionicons name="wallet" size={16} color="#0ea5e9" />
            </View>
            <ThemedText variant="muted" size="sm">Net Flow</ThemedText>
          </View>
          <ThemedText 
            variant="brand" 
            size="xl" 
            className={`font-bold ${
              summary.netCashFlow >= 0 ? 'text-success' : 'text-error'
            }`}
          >
            {summary.netCashFlow >= 0 ? '+' : '-'}
            {formatShortCurrency(Math.abs(summary.netCashFlow))}
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="mt-1">
            Net cash flow
          </ThemedText>
        </CardContent>
      </Card>

      <Card variant="elevated" className="w-[48%]">
        <CardContent className="p-3">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-warning/10 items-center justify-center mr-2">
              <Ionicons name="cash" size={16} color="#f59e0b" />
            </View>
            <ThemedText variant="muted" size="sm">Balance</ThemedText>
          </View>
          <ThemedText variant="brand" size="xl" className="font-bold">
            {formatShortCurrency(summary.currentBalance)}
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="mt-1">
            Current balance
          </ThemedText>
        </CardContent>
      </Card>
    </View>
  );

  // Cash Flow Statement Component
  const CashFlowStatement = () => (
    <Card variant="elevated" className="mx-2 mt-4">
      <CardHeader 
        title="Cash Flow Statement"
        subtitle={`${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} ${new Date().getFullYear()}`}
      />
      <CardContent className="p-4">
        {/* Operating Activities */}
        <View className="mb-4">
          <ThemedText variant="subheading" size="base" className="mb-2 font-semibold">
            Operating Activities
          </ThemedText>
          
          <View className="flex-row justify-between mb-1">
            <ThemedText variant="muted">Net Income (Sales)</ThemedText>
            <ThemedText variant="success">{formatCurrency(summary.moneyIn)}</ThemedText>
          </View>
          
          <View className="flex-row justify-between mb-1">
            <ThemedText variant="muted">Inventory Purchases</ThemedText>
            <ThemedText variant="error">-{formatCurrency(summary.moneyOut * 0.7)}</ThemedText>
          </View>
          
          <View className="flex-row justify-between mb-1">
            <ThemedText variant="muted">Operating Expenses</ThemedText>
            <ThemedText variant="error">-{formatCurrency(summary.moneyOut * 0.3)}</ThemedText>
          </View>
          
          <View className="flex-row justify-between mt-2 pt-2 border-t border-border dark:border-dark-border">
            <ThemedText variant="heading" size="sm">Net Operating Cash Flow</ThemedText>
            <ThemedText 
              variant="heading" 
              size="sm"
              className={summary.operatingCF >= 0 ? 'text-success' : 'text-error'}
            >
              {summary.operatingCF >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(summary.operatingCF))}
            </ThemedText>
          </View>
        </View>

        {/* Investing Activities */}
        <View className="mb-4">
          <ThemedText variant="subheading" size="base" className="mb-2 font-semibold">
            Investing Activities
          </ThemedText>
          
          <View className="flex-row justify-between mb-1">
            <ThemedText variant="muted">Equipment Purchase</ThemedText>
            <ThemedText variant="error">-{formatCurrency(15000)}</ThemedText>
          </View>
          
          <View className="flex-row justify-between mt-2 pt-2 border-t border-border dark:border-dark-border">
            <ThemedText variant="heading" size="sm">Net Investing Cash Flow</ThemedText>
            <ThemedText variant="error">-{formatCurrency(15000)}</ThemedText>
          </View>
        </View>

        {/* Financing Activities */}
        <View className="mb-4">
          <ThemedText variant="subheading" size="base" className="mb-2 font-semibold">
            Financing Activities
          </ThemedText>
          
          <View className="flex-row justify-between mb-1">
            <ThemedText variant="muted">Loan Received</ThemedText>
            <ThemedText variant="success">+{formatCurrency(10000)}</ThemedText>
          </View>
          
          <View className="flex-row justify-between mt-2 pt-2 border-t border-border dark:border-dark-border">
            <ThemedText variant="heading" size="sm">Net Financing Cash Flow</ThemedText>
            <ThemedText variant="success">+{formatCurrency(10000)}</ThemedText>
          </View>
        </View>

        {/* Net Cash Flow */}
        <View className="mt-4 pt-4 border-t-2 border-brand">
          <View className="flex-row justify-between">
            <ThemedText variant="heading" size="lg" className="font-bold">
              NET CASH FLOW
            </ThemedText>
            <ThemedText 
              variant="heading" 
              size="lg" 
              className={`font-bold ${
                summary.netCashFlow >= 0 ? 'text-success' : 'text-error'
              }`}
            >
              {summary.netCashFlow >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(summary.netCashFlow))}
            </ThemedText>
          </View>
          
          <View className="flex-row justify-between mt-2">
            <ThemedText variant="muted">Beginning Balance</ThemedText>
            <ThemedText variant="default">{formatCurrency(summary.beginningBalance)}</ThemedText>
          </View>
          
          <View className="flex-row justify-between mt-1">
            <ThemedText variant="heading" size="base" className="font-semibold">
              ENDING BALANCE
            </ThemedText>
            <ThemedText variant="heading" size="base" className="font-bold text-brand">
              {formatCurrency(summary.currentBalance)}
            </ThemedText>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  // Chart Component
  const CashFlowChart = () => {
    const [chartType, setChartType] = useState<'inflow' | 'outflow' | 'both'>('both');

    return (
      <Card variant="elevated" className="mx-2 mt-4">
        <CardHeader 
          title="Cash Flow Trend"
          subtitle="Money In vs Money Out"
        />
        <CardContent className="p-2">
          {/* Chart Type Selector */}
          <View className="flex-row gap-2 mb-3 px-2">
            <TouchableOpacity
              onPress={() => setChartType('both')}
              className={`px-3 py-1 rounded-full ${
                chartType === 'both' ? 'bg-brand' : 'bg-surface-soft dark:bg-dark-surface-soft'
              }`}
            >
              <ThemedText 
                variant={chartType === 'both' ? 'default' : 'muted'} 
                className={chartType === 'both' ? 'text-white' : ''}
              >
                Both
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setChartType('inflow')}
              className={`px-3 py-1 rounded-full ${
                chartType === 'inflow' ? 'bg-success' : 'bg-surface-soft dark:bg-dark-surface-soft'
              }`}
            >
              <ThemedText 
                variant={chartType === 'inflow' ? 'default' : 'muted'} 
                className={chartType === 'inflow' ? 'text-white' : ''}
              >
                Money In
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setChartType('outflow')}
              className={`px-3 py-1 rounded-full ${
                chartType === 'outflow' ? 'bg-error' : 'bg-surface-soft dark:bg-dark-surface-soft'
              }`}
            >
              <ThemedText 
                variant={chartType === 'outflow' ? 'default' : 'muted'} 
                className={chartType === 'outflow' ? 'text-white' : ''}
              >
                Money Out
              </ThemedText>
            </TouchableOpacity>
          </View>

          {chartData.inflow.length > 0 ? (
            <LineChart
              data={chartType === 'inflow' ? chartData.inflow : chartType === 'outflow' ? chartData.outflow : chartData.inflow}
              data2={chartType === 'both' ? chartData.outflow : undefined}
              height={200}
              width={width - 60}
              color1={chartType === 'outflow' ? '#ef4444' : '#22c55e'}
              color2="#ef4444"
              dataPointsColor1={chartType === 'outflow' ? '#ef4444' : '#22c55e'}
              dataPointsColor2="#ef4444"
              thickness={2}
              backgroundColor="transparent"
              curved
              isAnimated
              animationDuration={300}
              spacing={40}
              hideDataPoints={false}
              showFractionalValues={false}
              yAxisColor="#94a3b8"
              xAxisColor="#94a3b8"
              yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10 }}
              noOfSections={4}
              maxValue={Math.max(
                ...chartData.inflow.map(d => d.value),
                ...chartData.outflow.map(d => d.value),
                1
              ) * 1.1}
              pointerConfig={{
                pointerStripHeight: 160,
                pointerStripColor: '#94a3b8',
                pointerStripWidth: 1,
                pointerColor: '#0ea5e9',
                radius: 6,
                pointerLabelWidth: 100,
                pointerLabelHeight: 90,
                autoAdjustPointerLabelPosition: true,
                pointerLabelComponent: (items: any[]) => {
                  return (
                    <View className="bg-white dark:bg-dark-surface p-2 rounded-lg shadow">
                      {chartType === 'both' ? (
                        <>
                          <View className="flex-row items-center mb-1">
                            <View className="w-2 h-2 rounded-full bg-success mr-1" />
                            <ThemedText variant="muted" size="xs">In: {formatShortCurrency(items[0]?.value || 0)}</ThemedText>
                          </View>
                          <View className="flex-row items-center">
                            <View className="w-2 h-2 rounded-full bg-error mr-1" />
                            <ThemedText variant="muted" size="xs">Out: {formatShortCurrency(items[1]?.value || 0)}</ThemedText>
                          </View>
                        </>
                      ) : (
                        <ThemedText variant="muted" size="xs">
                          {chartType === 'inflow' ? 'In' : 'Out'}: {formatShortCurrency(items[0]?.value || 0)}
                        </ThemedText>
                      )}
                    </View>
                  );
                },
              }}
            />
          ) : (
            <View className="h-[200px] items-center justify-center">
              <ThemedText variant="muted">No data available for this period</ThemedText>
            </View>
          )}
        </CardContent>
      </Card>
    );
  };

  // Category Breakdown Component
  const CategoryBreakdown = () => (
    <Card variant="elevated" className="mx-2 mt-4">
      <CardHeader 
        title="Cash Flow by Category"
        subtitle="Where your money comes from and goes"
      />
      <CardContent className="p-4">
        {categoryBreakdown.map((item, index) => (
          <View key={item.category} className="mb-3">
            <View className="flex-row justify-between mb-1">
              <View className="flex-row items-center">
                <View 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }}
                />
                <ThemedText>{item.category}</ThemedText>
              </View>
              <ThemedText variant="default">
                {formatShortCurrency(item.amount)}
              </ThemedText>
            </View>
            <View className="w-full h-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden">
              <View 
                className="h-full rounded-full"
                style={{ 
                  width: `${item.percentage}%`,
                  backgroundColor: item.color 
                }}
              />
            </View>
            <ThemedText variant="muted" size="xs" className="mt-1 text-right">
              {item.percentage.toFixed(1)}% of total
            </ThemedText>
          </View>
        ))}
      </CardContent>
    </Card>
  );

  // Recent Transactions Component
  const RecentTransactions = () => (
    <Card variant="elevated" className="mx-2 mt-4 mb-8">
      <CardHeader 
        title="Recent Transactions"
        subtitle="Latest cash flow activities"
        action={
          <TouchableOpacity onPress={() => router.push(`/shops/${currentShop?.id}/transactions`)}>
            <ThemedText variant="brand" size="sm">View All</ThemedText>
          </TouchableOpacity>
        }
      />
      <CardContent className="p-2">
        {recentTransactions.length > 0 ? (
          recentTransactions.map((t, index) => (
            <TouchableOpacity 
              key={t.id}
              className={`flex-row items-center p-3 ${
                index < recentTransactions.length - 1 ? 'border-b border-border dark:border-dark-border' : ''
              }`}
            >
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                t.type === 'in' ? 'bg-success/10' : 'bg-error/10'
              }`}>
                <Ionicons 
                  name={t.type === 'in' ? 'arrow-down' : 'arrow-up'} 
                  size={20} 
                  color={t.type === 'in' ? '#22c55e' : '#ef4444'} 
                />
              </View>
              
              <View className="flex-1">
                <View className="flex-row justify-between">
                  <ThemedText variant="subheading" size="sm">
                    {t.description}
                  </ThemedText>
                  <ThemedText 
                    variant={`${t.type === 'in' ? 'success' : 'error'}`}
                    size="sm"
                  >
                    {t.type === 'in' ? '+' : '-'}{formatShortCurrency(t.amount)}
                  </ThemedText>
                </View>
                
                <View className="flex-row justify-between mt-1">
                  <View className="flex-row">
                    <Badge variant="outline" size="sm" className="ml-2">{t.category}</Badge>
                    <Badge variant="outline" size="sm" className="ml-2">{t.paymentMethod}</Badge>
                  </View>
                  <ThemedText variant="muted" size="xs">
                    {t.date.toLocaleDateString()}
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="py-8">
            <EmptyState
              icon="swap-vertical-outline"
              title="No Transactions"
              description="Transactions will appear here"
            />
          </View>
        )}
      </CardContent>
    </Card>
  );

  // Forecast Component
  const ForecastView = () => (
    <Card variant="elevated" className="mx-2 mt-4 mb-8">
      <CardHeader 
        title="Cash Flow Forecast"
        subtitle="Next 30 days projection"
        action={
          <Badge variant="warning">Beta</Badge>
        }
      />
      <CardContent className="p-4">
        <View className="mb-4">
          <View className="flex-row justify-between mb-2">
            <ThemedText variant="subheading">Expected Inflows</ThemedText>
            <ThemedText variant="success">+{formatCurrency(45000)}</ThemedText>
          </View>
          <View className="bg-success/10 p-3 rounded-lg">
            <View className="flex-row justify-between mb-1">
              <ThemedText variant="muted" size="sm">Recurring Sales</ThemedText>
              <ThemedText variant="default" size="sm">{formatCurrency(25000)}</ThemedText>
            </View>
            <View className="flex-row justify-between mb-1">
              <ThemedText variant="muted" size="sm">Pending Invoices</ThemedText>
              <ThemedText variant="default" size="sm">{formatCurrency(15000)}</ThemedText>
            </View>
            <View className="flex-row justify-between">
              <ThemedText variant="muted" size="sm">Expected New Sales</ThemedText>
              <ThemedText variant="default" size="sm">{formatCurrency(5000)}</ThemedText>
            </View>
          </View>
        </View>

        <View className="mb-4">
          <View className="flex-row justify-between mb-2">
            <ThemedText variant="subheading">Expected Outflows</ThemedText>
            <ThemedText variant="error">-{formatCurrency(32000)}</ThemedText>
          </View>
          <View className="bg-error/10 p-3 rounded-lg">
            <View className="flex-row justify-between mb-1">
              <ThemedText variant="muted" size="sm">Supplier Payments</ThemedText>
              <ThemedText variant="default" size="sm">{formatCurrency(18000)}</ThemedText>
            </View>
            <View className="flex-row justify-between mb-1">
              <ThemedText variant="muted" size="sm">Payroll</ThemedText>
              <ThemedText variant="default" size="sm">{formatCurrency(8000)}</ThemedText>
            </View>
            <View className="flex-row justify-between">
              <ThemedText variant="muted" size="sm">Rent & Utilities</ThemedText>
              <ThemedText variant="default" size="sm">{formatCurrency(6000)}</ThemedText>
            </View>
          </View>
        </View>

        <View className="bg-brand/10 p-4 rounded-lg">
          <View className="flex-row justify-between mb-2">
            <ThemedText variant="heading" size="base">Projected Net Flow</ThemedText>
            <ThemedText variant="success" size="base" className="font-bold">
              +{formatCurrency(13000)}
            </ThemedText>
          </View>
          <View className="flex-row justify-between">
            <ThemedText variant="muted">Projected Ending Balance</ThemedText>
            <ThemedText variant="heading" size="base" className="font-bold text-brand">
              {formatCurrency(summary.currentBalance + 13000)}
            </ThemedText>
          </View>
        </View>

        <View className="flex-row gap-2 mt-4">
          <Button variant="outline" size="sm" className="flex-1" icon="calculator-outline">
            Run Scenario
          </Button>
          <Button variant="outline" size="sm" className="flex-1" icon="git-branch-outline">
            What-If
          </Button>
        </View>
      </CardContent>
    </Card>
  );

  if (!currentShop) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Cash Flow" showBackButton />
        <EmptyState
          icon="cash-outline"
          title="No Shop Found"
          description="Create a shop first to view cash flow"
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
      <PremiumHeader 
        title={`${currentShop.name} - Cash Flow`}
        showBackButton
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        <PeriodSelector />

        {/* View Selector Tabs */}
        <ViewSelector />

        {/* Summary Cards - Always visible */}
        <SummaryCards />

        {/* Dynamic Content Based on Selected View */}
        {selectedView === 'overview' && (
          <>
            <CashFlowChart />
            <CategoryBreakdown />
            <RecentTransactions />
          </>
        )}

        {selectedView === 'statement' && (
          <CashFlowStatement />
        )}

        {selectedView === 'categories' && (
          <>
            <CategoryBreakdown />
            <Card variant="elevated" className="mx-2 mt-4 p-4">
              <ThemedText variant="subheading" className="mb-3">Cash Flow by Payment Method</ThemedText>
              <View className="flex-row flex-wrap justify-between">
                <View className="w-[48%] mb-3">
                  <View className="bg-success/10 p-3 rounded-lg items-center">
                    <Ionicons name="cash" size={24} color="#22c55e" />
                    <ThemedText variant="muted" size="sm" className="mt-1">Cash</ThemedText>
                    <ThemedText variant="default" className="font-bold">{formatShortCurrency(45000)}</ThemedText>
                  </View>
                </View>
                <View className="w-[48%] mb-3">
                  <View className="bg-brand/10 p-3 rounded-lg items-center">
                    <Ionicons name="card" size={24} color="#0ea5e9" />
                    <ThemedText variant="muted" size="sm" className="mt-1">Card</ThemedText>
                    <ThemedText variant="default" className="font-bold">{formatShortCurrency(25000)}</ThemedText>
                  </View>
                </View>
                <View className="w-[48%]">
                  <View className="bg-warning/10 p-3 rounded-lg items-center">
                    <Ionicons name="phone-portrait" size={24} color="#f59e0b" />
                    <ThemedText variant="muted" size="sm" className="mt-1">Mobile Money</ThemedText>
                    <ThemedText variant="default" className="font-bold">{formatShortCurrency(15000)}</ThemedText>
                  </View>
                </View>
                <View className="w-[48%]">
                  <View className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-lg items-center">
                    <Ionicons name="swap-horizontal" size={24} color="#8b5cf6" />
                    <ThemedText variant="muted" size="sm" className="mt-1">Transfer</ThemedText>
                    <ThemedText variant="default" className="font-bold">{formatShortCurrency(8000)}</ThemedText>
                  </View>
                </View>
              </View>
            </Card>
          </>
        )}

        {selectedView === 'forecast' && (
          <ForecastView />
        )}

        {/* Quick Actions */}
        <View className="flex-row gap-3 mx-4 mt-4 mb-8">
          <Button 
            variant="default" 
            size="lg" 
            className="flex-1"
            icon="add-circle"
            onPress={() => router.push('/add-transaction')}
          >
            Add Transaction
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="flex-1"
            icon="repeat"
            onPress={() => router.push('/(auth)/add-transaction')}
          >
            Transfer
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

// Loading wrapper component
const CashFlowWithLoading = ({
  transactions,
  products,
  stockMovements,
}: {
  transactions?: Transaction[],
  products?: Product[],
  stockMovements?: StockMovement[],
}) => {
  const isLoading = !transactions || !products || !stockMovements;
  
  return (
    <CashFlowScreenInner
      transactions={transactions}
      products={products}
      stockMovements={stockMovements}
      isLoading={isLoading}
    />
  );
};

// Enhance with observables for real-time updates
const enhance = withObservables(
  ['currentShop'],
  ({ currentShop }: { currentShop: any }) => {
    if (!currentShop) {
      return {
        transactions: [],
        products: [],
        stockMovements: [],
      };
    }

    return {
      transactions: database
        .get<Transaction>('transactions')
        .query(
          Q.where('shop_id', currentShop.id)
        )
        .observe(),
      products: database
        .get<Product>('products')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('is_active', true)
        )
        .observe(),
      stockMovements: database
        .get<StockMovement>('stock_movements')
        .query(
          Q.where('shop_id', currentShop.id)
        )
        .observe(),
    };
  }
);

const CashFlowScreenWithObservables = enhance(CashFlowWithLoading);

// Main exported component
export default function CashFlowScreen() {
  const { currentShop } = useAuth();
  return <CashFlowScreenWithObservables currentShop={currentShop} />;
}