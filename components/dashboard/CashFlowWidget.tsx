// components/dashboard/CashFlowWidget.tsx
import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { Card, CardContent } from '@/components/ui/Card';
import { BaseWidget } from './BaseWidget';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import Transaction from '@/database/models/Transaction';
import { Payment } from '@/database/models/Payment';
import { formatCurrency } from '@/utils/dashboardUtils';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { of } from '@nozbe/watermelondb/utils/rx';

interface CashFlowData {
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  cashPayments: number; // Payments received in cash
  creditSales: number; // Sales on credit (receivables)
  creditPayments: number; // Payments received for credit sales
  expenses: number;
  purchases: number;
  transfers: number;
  payrollExpenses: number; // You might need to categorize expenses
  otherExpenses: number;
  transactionCount: number;
  pendingReceivables: number; // Total balance due from credit sales
}

interface CashFlowWidgetProps {
  className?: string;
  compact?: boolean;
  transactions?: Transaction[];
  payments?: Payment[];
}

// Custom loading component
const LoadingComponent = ({ compact = false }: { compact?: boolean }) => {
  return (
    <View className={compact ? "" : "p-4"}>
      {compact ? (
        <View className="flex-row justify-between">
          <View className="flex-1 items-center">
            <View className="w-16 h-16 rounded-full bg-surface-soft dark:bg-dark-surface-soft mb-2 animate-pulse" />
            <View className="h-4 w-20 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
          </View>
          <View className="flex-1 items-center">
            <View className="w-16 h-16 rounded-full bg-surface-soft dark:bg-dark-surface-soft mb-2 animate-pulse" />
            <View className="h-4 w-20 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
          </View>
        </View>
      ) : (
        <View>
          <View className="flex-row justify-between mb-6">
            {[1, 2].map((i) => (
              <Card key={i} variant="filled" className="flex-1 mx-1">
                <CardContent className="p-4 items-center">
                  <View className="w-12 h-12 rounded-full bg-surface-soft dark:bg-dark-surface-soft mb-2 animate-pulse" />
                  <View className="h-4 w-16 bg-surface-soft dark:bg-dark-surface-soft rounded mb-2 animate-pulse" />
                  <View className="h-6 w-20 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </View>
          <View className="h-40 bg-surface-soft dark:bg-dark-surface-soft rounded-lg animate-pulse mb-4" />
          <View className="flex-row flex-wrap gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} variant="filled" className="flex-1 min-w-[48%]">
                <CardContent className="p-4">
                  <View className="h-4 w-20 bg-surface-soft dark:bg-dark-surface-soft rounded mb-2 animate-pulse" />
                  <View className="h-6 w-24 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// Inner component that receives observable data
const CashFlowWidgetInner = ({ 
  transactions = [],
  payments = [],
  compact = false
}: CashFlowWidgetProps) => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Calculate cash flow metrics based on actual transaction types
  const calculateMetrics = (): CashFlowData => {
    let totalInflow = 0;
    let totalOutflow = 0;
    let cashSales = 0;
    let cardSales = 0;
    let transferSales = 0;
    let cashPayments = 0;
    let creditSales = 0;
    let creditPayments = 0;
    let expenses = 0;
    let purchases = 0;
    let transfers = 0;
    let payrollExpenses = 0;
    let otherExpenses = 0;
    let pendingReceivables = 0;

    // Process transactions
    transactions.forEach(t => {
      // Determine if this is inflow or outflow based on transaction type
      switch(t.transactionType) {
        case 'sale':
          // Sales are inflows
          totalInflow += t.totalAmount;
          
          // Track payment methods from associated payments
          // This would need payments relation - for now, we'll categorize by sale type
          // In a real implementation, you'd want to look at the associated payments
          
          // For now, assume cash sales are cash, credit sales are credit
          if (t.paymentStatus === 'paid' || t.paymentStatus === 'partial') {
            // These have some cash component
            cashSales += t.amountPaid; // Amount already paid
            if (t.balanceDue > 0) {
              creditSales += t.balanceDue; // Remaining credit portion
              pendingReceivables += t.balanceDue;
            }
          } else {
            // Pure credit sale
            creditSales += t.totalAmount;
            pendingReceivables += t.totalAmount;
          }
          break;

        case 'purchase':
          // Purchases are outflows
          totalOutflow += t.totalAmount;
          purchases += t.totalAmount;
          break;

        case 'expense':
          // Expenses are outflows
          totalOutflow += t.totalAmount;
          expenses += t.totalAmount;
          
          // You could categorize expenses based on expenseCategoryId
          // For now, we'll just put in other expenses
          otherExpenses += t.totalAmount;
          break;

        case 'income':
          // Income is inflow
          totalInflow += t.totalAmount;
          cashSales += t.totalAmount; // Treat as cash income
          break;

        case 'transfer':
          // Transfers are neutral for net flow (move money between accounts)
          // But we track them separately
          transfers += t.totalAmount;
          break;

        case 'payment':
          // Payments received (for credit sales)
          totalInflow += t.totalAmount;
          cashPayments += t.totalAmount;
          creditPayments += t.totalAmount;
          break;
      }
    });

    // Process payments directly (if available)
    payments.forEach(p => {
      // Payments are always inflows (money received)
      // But we might double-count if payments are also in transactions
      // So we need to be careful - in a real implementation, you'd want to
      // avoid double-counting by linking payments to transactions
      
      // For now, we'll just use transactions as the source of truth
    });

    const netFlow = totalInflow - totalOutflow;

    return {
      totalInflow,
      totalOutflow,
      netFlow,
      cashSales,
      cardSales, // You'd get this from payment methods
      transferSales,
      cashPayments,
      creditSales,
      creditPayments,
      expenses,
      purchases,
      transfers,
      payrollExpenses,
      otherExpenses,
      transactionCount: transactions.length,
      pendingReceivables,
    };
  };

  const data = calculateMetrics();
  const hasAnyData = data.transactionCount > 0;

  // Compact version for dashboard
  if (compact) {
    return (
      <TouchableOpacity
        onPress={() => router.push('/cash-flow')}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isDark 
            ? ['#1e293b', '#0f172a'] 
            : ['#ffffff', '#f8fafc']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-xl overflow-hidden p-4"
        >
          <View className="flex-row justify-between items-center mb-3">
            <ThemedText variant="heading" size="base" className="font-semibold">
              Cash Flow
            </ThemedText>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
          </View>

          <View className="flex-row justify-between">
            {/* Inflow */}
            <View className="flex-1 items-center">
              <View className="w-12 h-12 rounded-full bg-success/20 items-center justify-center mb-2">
                <Ionicons name="arrow-down" size={24} color="#22c55e" />
              </View>
              <ThemedText variant="muted" size="xs">Inflow</ThemedText>
              <ThemedText variant="heading" size="sm" className="font-bold text-success">
                {formatCurrency(data.totalInflow)}
              </ThemedText>
            </View>

            {/* Outflow */}
            <View className="flex-1 items-center">
              <View className="w-12 h-12 rounded-full bg-error/20 items-center justify-center mb-2">
                <Ionicons name="arrow-up" size={24} color="#ef4444" />
              </View>
              <ThemedText variant="muted" size="xs">Outflow</ThemedText>
              <ThemedText variant="heading" size="sm" className="font-bold text-error">
                {formatCurrency(data.totalOutflow)}
              </ThemedText>
            </View>
          </View>

          {/* Net Flow */}
          <View className="mt-3 pt-3 border-t border-border dark:border-dark-border flex-row justify-between items-center">
            <ThemedText variant="muted" size="sm">Net Flow</ThemedText>
            <ThemedText 
              variant="heading" 
              size="base" 
              className={`font-bold ${
                data.netFlow > 0 ? 'text-success' : 
                data.netFlow < 0 ? 'text-error' : 
                'text-muted'
              }`}
            >
              {formatCurrency(data.netFlow)}
            </ThemedText>
          </View>

          {/* Receivables indicator */}
          {data.pendingReceivables > 0 && (
            <View className="mt-2 flex-row items-center justify-end">
              <Ionicons name="alert-circle" size={14} color="#f59e0b" />
              <ThemedText variant="warning" size="xs" className="ml-1">
                {formatCurrency(data.pendingReceivables)} in receivables
              </ThemedText>
            </View>
          )}

          {!hasAnyData && (
            <View className="mt-2">
              <ThemedText variant="muted" size="xs" className="text-center">
                No transactions yet
              </ThemedText>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Full version for cash flow page
  return (
    <View>
      {/* Summary Cards */}
      <View className="flex-row justify-between mb-6">
        <Card variant="filled" className="flex-1 mr-2">
          <CardContent className="p-4 items-center">
            <View className="w-12 h-12 rounded-full bg-success/20 items-center justify-center mb-2">
              <Ionicons name="arrow-down" size={24} color="#22c55e" />
            </View>
            <ThemedText variant="muted" size="xs">Total Inflow</ThemedText>
            <ThemedText variant="heading" size="lg" className="font-bold text-success">
              {formatCurrency(data.totalInflow)}
            </ThemedText>
          </CardContent>
        </Card>

        <Card variant="filled" className="flex-1 ml-2">
          <CardContent className="p-4 items-center">
            <View className="w-12 h-12 rounded-full bg-error/20 items-center justify-center mb-2">
              <Ionicons name="arrow-up" size={24} color="#ef4444" />
            </View>
            <ThemedText variant="muted" size="xs">Total Outflow</ThemedText>
            <ThemedText variant="heading" size="lg" className="font-bold text-error">
              {formatCurrency(data.totalOutflow)}
            </ThemedText>
          </CardContent>
        </Card>
      </View>

      {/* Net Flow Card */}
      <Card variant="elevated" className="mb-6">
        <CardContent className="p-4">
          <View className="flex-row justify-between items-center">
            <View>
              <ThemedText variant="heading" size="base" className="font-semibold mb-1">
                Net Cash Flow
              </ThemedText>
              <ThemedText variant="muted" size="xs">
                Based on {data.transactionCount} transactions
              </ThemedText>
            </View>
            <View className="items-end">
              <ThemedText 
                variant="heading" 
                size="2xl" 
                className={`font-bold ${
                  data.netFlow > 0 ? 'text-success' : 
                  data.netFlow < 0 ? 'text-error' : 
                  'text-muted'
                }`}
              >
                {formatCurrency(data.netFlow)}
              </ThemedText>
              <View className="flex-row items-center mt-1">
                <Ionicons 
                  name={data.netFlow > 0 ? 'trending-up' : data.netFlow < 0 ? 'trending-down' : 'remove'} 
                  size={16} 
                  color={data.netFlow > 0 ? '#22c55e' : data.netFlow < 0 ? '#ef4444' : '#64748b'} 
                />
                <ThemedText 
                  variant="muted" 
                  size="xs" 
                  className="ml-1"
                >
                  {data.netFlow > 0 ? 'Positive' : data.netFlow < 0 ? 'Negative' : 'Neutral'}
                </ThemedText>
              </View>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Receivables Alert */}
      {data.pendingReceivables > 0 && (
        <Card variant="filled" className="mb-6 bg-warning/10 border-warning/20">
          <CardContent className="p-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-warning/20 items-center justify-center mr-3">
                <Ionicons name="alert-circle" size={20} color="#f59e0b" />
              </View>
              <View className="flex-1">
                <ThemedText variant="heading" size="sm" className="font-semibold mb-1">
                  Pending Receivables
                </ThemedText>
                <ThemedText variant="muted" size="sm">
                  You have {formatCurrency(data.pendingReceivables)} in outstanding credit sales
                </ThemedText>
              </View>
              {/* this is supposed to go to the receivables page */}
              <TouchableOpacity onPress={() => router.push('/')}>
                <ThemedText variant="brand" size="sm">View</ThemedText>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>
      )}

      {/* Inflow Breakdown */}
      <ThemedText variant="heading" size="base" className="font-semibold mb-3">
        Inflow Breakdown
      </ThemedText>
      
      <View className="flex-row flex-wrap gap-3 mb-6">
        <Card variant="filled" className="flex-1 min-w-[48%]">
          <CardContent className="p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-full bg-success/10 items-center justify-center">
                <Ionicons name="cash" size={16} color="#22c55e" />
              </View>
              <ThemedText variant="muted" size="xs">Cash Sales</ThemedText>
            </View>
            <ThemedText variant="heading" size="base" className="font-bold text-success">
              {formatCurrency(data.cashSales)}
            </ThemedText>
          </CardContent>
        </Card>

        <Card variant="filled" className="flex-1 min-w-[48%]">
          <CardContent className="p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-full bg-warning/10 items-center justify-center">
                <Ionicons name="card" size={16} color="#f59e0b" />
              </View>
              <ThemedText variant="muted" size="xs">Credit Sales</ThemedText>
            </View>
            <ThemedText variant="heading" size="base" className="font-bold text-warning">
              {formatCurrency(data.creditSales)}
            </ThemedText>
            {data.creditPayments > 0 && (
              <ThemedText variant="muted" size="xs" className="mt-1">
                {formatCurrency(data.creditPayments)} received
              </ThemedText>
            )}
          </CardContent>
        </Card>

        <Card variant="filled" className="flex-1 min-w-[48%]">
          <CardContent className="p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-full bg-info/10 items-center justify-center">
                <Ionicons name="phone-portrait" size={16} color="#3b82f6" />
              </View>
              <ThemedText variant="muted" size="xs">Card/Transfer</ThemedText>
            </View>
            <ThemedText variant="heading" size="base" className="font-bold text-info">
              {formatCurrency(data.cardSales + data.transferSales)}
            </ThemedText>
          </CardContent>
        </Card>
      </View>

      {/* Outflow Breakdown */}
      <ThemedText variant="heading" size="base" className="font-semibold mb-3">
        Outflow Breakdown
      </ThemedText>

      <View className="flex-row flex-wrap gap-3">
        <Card variant="filled" className="flex-1 min-w-[48%]">
          <CardContent className="p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-full bg-warning/10 items-center justify-center">
                <Ionicons name="cart" size={16} color="#f59e0b" />
              </View>
              <ThemedText variant="muted" size="xs">Purchases</ThemedText>
            </View>
            <ThemedText variant="heading" size="base" className="font-bold text-warning">
              {formatCurrency(data.purchases)}
            </ThemedText>
          </CardContent>
        </Card>

        <Card variant="filled" className="flex-1 min-w-[48%]">
          <CardContent className="p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-full bg-error/10 items-center justify-center">
                <Ionicons name="receipt" size={16} color="#ef4444" />
              </View>
              <ThemedText variant="muted" size="xs">Expenses</ThemedText>
            </View>
            <ThemedText variant="heading" size="base" className="font-bold text-error">
              {formatCurrency(data.expenses)}
            </ThemedText>
          </CardContent>
        </Card>

        <Card variant="filled" className="flex-1 min-w-[48%]">
          <CardContent className="p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-full bg-purple-500/10 items-center justify-center">
                <Ionicons name="swap-horizontal" size={16} color="#a855f7" />
              </View>
              <ThemedText variant="muted" size="xs">Transfers</ThemedText>
            </View>
            <ThemedText variant="heading" size="base" className="font-bold text-purple-500">
              {formatCurrency(data.transfers)}
            </ThemedText>
          </CardContent>
        </Card>

        <Card variant="filled" className="flex-1 min-w-[48%]">
          <CardContent className="p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-full bg-muted/10 items-center justify-center">
                <Ionicons name="ellipsis-horizontal" size={16} color="#64748b" />
              </View>
              <ThemedText variant="muted" size="xs">Other</ThemedText>
            </View>
            <ThemedText variant="heading" size="base" className="font-bold text-muted">
              {formatCurrency(data.otherExpenses)}
            </ThemedText>
          </CardContent>
        </Card>
      </View>

      {/* Empty state hint */}
      {!hasAnyData && (
        <View className="mt-6 p-4 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
          <View className="flex-row items-center justify-center">
            <Ionicons name="information-circle-outline" size={20} color="#64748b" />
            <ThemedText variant="muted" size="sm" className="ml-2 text-center">
              No transactions yet. Add sales, purchases, or expenses to see your cash flow analysis.
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
};

// Enhance with observables for real-time updates
const enhance = withObservables(
  ['currentShop', 'timeRange'], 
  ({ currentShop, timeRange = 'month' }: { currentShop: any; timeRange?: string }) => {
    if (!currentShop) {
      return {
        transactions: of([]),
        payments: of([]), // or [],
      };
    }

    const now = new Date();
    let startDate: number;

    // Calculate start date based on time range
    switch(timeRange) {
      case 'week':
        startDate = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - 7,
          0, 0, 0, 0
        )).getTime();
        break;
      case 'month':
        startDate = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() - 1,
          now.getUTCDate(),
          0, 0, 0, 0
        )).getTime();
        break;
      case 'quarter':
        startDate = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() - 3,
          now.getUTCDate(),
          0, 0, 0, 0
        )).getTime();
        break;
      case 'year':
        startDate = new Date(Date.UTC(
          now.getUTCFullYear() - 1,
          now.getUTCMonth(),
          now.getUTCDate(),
          0, 0, 0, 0
        )).getTime();
        break;
      default:
        startDate = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() - 1,
          now.getUTCDate(),
          0, 0, 0, 0
        )).getTime();
    }

    return {
      transactions: database
        .get<Transaction>('transactions')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('transaction_date', Q.gte(startDate))
        )
        .observe(),
      // If you have payments relation, you can observe payments too
      // payments: database.get<Payment>('payments').query(...).observe(),
    };
  }
);

const CashFlowWidgetWithObservables = enhance(CashFlowWidgetInner);

export function CashFlowWidget({ 
  className, 
  compact = false 
}: { className?: string; compact?: boolean }) {
  const { currentShop } = useAuth();
  const [timeRange, setTimeRange] = useState('month');

  // This wrapper uses BaseWidget for loading/error states
  const fetchData = async (): Promise<{ hasData: boolean }> => {
    if (!currentShop) throw new Error("No shop selected");
    return { hasData: true };
  };

  if (compact) {
    // For dashboard, render directly without BaseWidget wrapper
    if (!currentShop) {
      return (
        <Card variant="elevated" className={className}>
          <CardContent className="p-4">
            <ThemedText variant="muted">No shop selected</ThemedText>
          </CardContent>
        </Card>
      );
    }

    return (
      <CashFlowWidgetWithObservables 
        currentShop={currentShop} 
        compact={true}
        timeRange={timeRange}
      />
    );
  }

  // For full page, use BaseWidget
  return (
    <BaseWidget<{ hasData: boolean }>
      title="Cash Flow Analysis"
      fetchData={fetchData}
      refreshInterval={300000}
      loadingComponent={<LoadingComponent />}
      errorComponent={(error, retry) => (
        <ErrorComponent error={error} retry={retry} />
      )}
      emptyComponent={null}
      className={className}
      action={{
        label: "Filter",
        icon: "filter",
        onPress: () => {
          const ranges = ['week', 'month', 'quarter', 'year'];
          const nextRange = ranges[(ranges.indexOf(timeRange) + 1) % ranges.length];
          setTimeRange(nextRange);
        },
      }}
    >
      {() => currentShop ? (
        <CashFlowWidgetWithObservables 
          currentShop={currentShop} 
          compact={false}
          timeRange={timeRange}
        />
      ) : (
        <View className="items-center justify-center py-8">
          <ThemedText variant="muted">No shop selected</ThemedText>
        </View>
      )}
    </BaseWidget>
  );
}

// Error component for full page
const ErrorComponent = ({ error, retry }: { error: Error; retry: () => void }) => {
  return (
    <View className="items-center justify-center py-8">
      <View className="w-16 h-16 rounded-full bg-error/10 items-center justify-center mb-3">
        <Ionicons name="alert-circle" size={32} color="#ef4444" />
      </View>
      <ThemedText variant="error" size="sm" className="text-center mb-2">
        {error.message}
      </ThemedText>
      <TouchableOpacity
        onPress={retry}
        className="px-4 py-2 bg-brand rounded-lg flex-row items-center"
      >
        <Ionicons name="refresh" size={16} color="#fff" />
        <ThemedText className="text-white ml-2">Retry</ThemedText>
      </TouchableOpacity>
    </View>
  );
};