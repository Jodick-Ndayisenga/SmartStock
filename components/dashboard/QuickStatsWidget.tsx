// components/dashboard/QuickStatsWidget.tsx
import React from 'react';
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
import { Contact } from '@/database/models/Contact';
import { formatCurrency, formatPercent } from '@/utils/dashboardUtils';

interface StatsData {
  weeklySales: number;
  weeklyTransactions: number;
  monthlySales: number;
  monthlyTransactions: number;
  newCustomers: number;
  repeatRate: number;
  totalCustomers: number;
}

interface QuickStatsWidgetProps {
  className?: string;
  // Observable props
  weeklyTransactions?: Transaction[];
  monthlyTransactions?: Transaction[];
  customers?: Contact[];
}

// Custom loading component
const LoadingComponent = () => {
  return (
    <View className="flex-row flex-wrap gap-3">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} variant="filled" className="flex-1 min-w-[48%]">
          <CardContent className="p-4">
            <View className="h-10 w-10 rounded-full bg-surface-soft dark:bg-dark-surface-soft mb-2 animate-pulse" />
            <View className="h-4 w-20 bg-surface-soft dark:bg-dark-surface-soft rounded mb-2 animate-pulse" />
            <View className="h-6 w-24 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </View>
  );
};

// Custom error component
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

// Inner component that receives observable data
const QuickStatsWidgetInner = ({ 
  weeklyTransactions = [],
  monthlyTransactions = [],
  customers = []
}: QuickStatsWidgetProps) => {
  
  // Calculate metrics from observable data
  const calculateMetrics = (): StatsData => {
    const weeklySales = weeklyTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const monthlySales = monthlyTransactions.reduce((sum, t) => sum + t.totalAmount, 0);

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1,
      0, 0, 0, 0
    )).getTime();
    
    const newCustomers = customers.filter(c => {
      if (!c.createdAt) return false;
      // Handle both Date objects and timestamps
      const customerDate = typeof c.createdAt === 'object' && 'getTime' in c.createdAt 
        ? c.createdAt.getTime() 
        : c.createdAt;
      return customerDate >= startOfMonth;
    }).length;

    // Calculate repeat rate based on customers with multiple transactions
    // Get unique customer IDs from transactions
    const customerIdsFromTransactions = new Set([
      ...weeklyTransactions.map(t => t.contactId).filter(Boolean),
      ...monthlyTransactions.map(t => t.contactId).filter(Boolean)
    ]);
    
    // Count customers who appear more than once
    const customerTransactionCounts = new Map();
    
    [...weeklyTransactions, ...monthlyTransactions].forEach(t => {
      if (t.contactId) {
        const count = customerTransactionCounts.get(t.contactId) || 0;
        customerTransactionCounts.set(t.contactId, count + 1);
      }
    });
    
    const repeatCustomers = Array.from(customerTransactionCounts.values()).filter(count => count > 1).length;
    
    const repeatRate = customerIdsFromTransactions.size > 0 
      ? (repeatCustomers / customerIdsFromTransactions.size) * 100 
      : 0;

    return {
      weeklySales,
      weeklyTransactions: weeklyTransactions.length,
      monthlySales,
      monthlyTransactions: monthlyTransactions.length,
      newCustomers,
      repeatRate,
      totalCustomers: customers.length,
    };
  };

  const data = calculateMetrics();
  const hasAnyData = data.weeklySales > 0 || data.monthlySales > 0 || data.totalCustomers > 0;

  // If no data at all, show zeros but keep layout
  return (
    <View className="flex-row flex-wrap gap-3">
      {/* Weekly Sales Card */}
      <Card variant="filled" className="flex-1 min-w-[48%]">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="w-10 h-10 rounded-full bg-success/10 items-center justify-center">
              <Ionicons name="calendar" size={20} color="#22c55e" />
            </View>
            {data.weeklySales > 0 && (
              <Ionicons name="trending-up" size={16} color="#22c55e" />
            )}
          </View>
          <ThemedText variant="muted" size="sm">Weekly Sales</ThemedText>
          <ThemedText variant="heading" size="lg" className={`font-bold ${data.weeklySales > 0 ? 'text-success' : 'text-muted'}`}>
            {formatCurrency(data.weeklySales)}
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="mt-1">
            {data.weeklyTransactions > 0 
              ? `${data.weeklyTransactions} transactions` 
              : 'No transactions yet'}
          </ThemedText>
        </CardContent>
      </Card>

      {/* Monthly Sales Card */}
      <Card variant="filled" className="flex-1 min-w-[48%]">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="w-10 h-10 rounded-full bg-warning/10 items-center justify-center">
              <Ionicons name="trending-up" size={20} color="#f59e0b" />
            </View>
            {data.monthlySales > 0 && (
              <Ionicons name="calendar" size={16} color="#f59e0b" />
            )}
          </View>
          <ThemedText variant="muted" size="sm">Monthly Sales</ThemedText>
          <ThemedText variant="heading" size="lg" className={`font-bold ${data.monthlySales > 0 ? 'text-warning' : 'text-muted'}`}>
            {formatCurrency(data.monthlySales)}
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="mt-1">
            {data.monthlyTransactions > 0 
              ? `${data.monthlyTransactions} transactions` 
              : 'No transactions yet'}
          </ThemedText>
        </CardContent>
      </Card>

      {/* New Customers Card */}
      <Card variant="filled" className="flex-1 min-w-[48%]">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="w-10 h-10 rounded-full bg-info/10 items-center justify-center">
              <Ionicons name="people" size={20} color="#3b82f6" />
            </View>
            {data.newCustomers > 0 && (
              <Ionicons name="add" size={16} color="#3b82f6" />
            )}
          </View>
          <ThemedText variant="muted" size="sm">New Customers</ThemedText>
          <ThemedText variant="heading" size="lg" className={`font-bold ${data.newCustomers > 0 ? 'text-info' : 'text-muted'}`}>
            {data.newCustomers}
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="mt-1">
            {data.newCustomers > 0 ? 'this month' : 'No new customers'}
          </ThemedText>
        </CardContent>
      </Card>

      {/* Repeat Rate Card */}
      <Card variant="filled" className="flex-1 min-w-[48%]">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="w-10 h-10 rounded-full bg-purple-500/10 items-center justify-center">
              <Ionicons name="repeat" size={20} color="#a855f7" />
            </View>
            {data.repeatRate > 0 && (
              <Ionicons name="people" size={16} color="#a855f7" />
            )}
          </View>
          <ThemedText variant="muted" size="sm">Repeat Rate</ThemedText>
          <ThemedText variant="heading" size="lg" className={`font-bold ${data.repeatRate > 0 ? 'text-purple-500' : 'text-muted'}`}>
            {data.repeatRate > 0 ? formatPercent(data.repeatRate) : '---'}
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="mt-1">
            {data.totalCustomers > 0 
              ? `${data.totalCustomers} total customers` 
              : 'No customers yet'}
          </ThemedText>
        </CardContent>
      </Card>

      {/* Subtle hint for brand new accounts */}
      {!hasAnyData && (
        <View className="w-full mt-2">
          <View className="flex-row items-center justify-center p-3 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
            <Ionicons name="information-circle-outline" size={16} color="#64748b" />
            <ThemedText variant="muted" size="xs" className="ml-2">
              Add customers and transactions to see your stats
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
};

// Enhance with observables for real-time updates
const enhance = withObservables(
  ['currentShop'], 
  ({ currentShop }: { currentShop: any }) => {
    if (!currentShop) {
      return {
        weeklyTransactions: [],
        monthlyTransactions: [],
        customers: [],
      };
    }

    const now = new Date();
    
    // Calculate timestamps for queries
    const startOfWeek = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - now.getUTCDay(), // Start of week (Sunday)
      0, 0, 0, 0
    )).getTime();
    
    const startOfMonth = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1,
      0, 0, 0, 0
    )).getTime();

    return {
      weeklyTransactions: database
        .get<Transaction>('transactions')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('transaction_date', Q.gte(startOfWeek))
        )
        .observe(),
      monthlyTransactions: database
        .get<Transaction>('transactions')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('transaction_date', Q.gte(startOfMonth))
        )
        .observe(),
      customers: database
        .get<Contact>('contacts')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.or(
            Q.where('role', 'customer'),
            Q.where('role', 'both')
          )
        )
        .observe(),
    };
  }
);

const QuickStatsWidgetWithObservables = enhance(QuickStatsWidgetInner);

export function QuickStatsWidget({ className }: { className?: string }) {
  const { currentShop } = useAuth();

  // This wrapper uses BaseWidget for loading/error states
  const fetchData = async (): Promise<{ hasData: boolean }> => {
    if (!currentShop) throw new Error("No shop selected");
    return { hasData: true };
  };

  return (
    <BaseWidget<{ hasData: boolean }>
      title="Quick Stats"
      fetchData={fetchData}
      refreshInterval={300000} // 5 minutes (kept for compatibility)
      loadingComponent={<LoadingComponent />}
      errorComponent={(error, retry) => (
        <ErrorComponent error={error} retry={retry} />
      )}
      emptyComponent={null}
      className={className}
    >
      {() => currentShop ? (
        <QuickStatsWidgetWithObservables currentShop={currentShop} />
      ) : (
        <View className="items-center justify-center py-8">
          <ThemedText variant="muted">No shop selected</ThemedText>
        </View>
      )}
    </BaseWidget>
  );
}