// components/dashboard/QuickStatsWidget.tsx
import React, { useMemo, useEffect, useState } from 'react';
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
import DebtService, { DebtorSummary } from '@/services/debtService';
import { formatCurrency } from '@/utils/dashboardUtils';
import { useRouter } from 'expo-router';
import { of } from '@nozbe/watermelondb/utils/rx';

interface StatsData {
  weeklySales: number;
  weeklyTransactions: number;
  monthlySales: number;
  monthlyTransactions: number;
  newCustomers: number;
  totalCustomers: number;
  pendingCredit: number;
  activeDebtors: number;
}

interface QuickStatsWidgetProps {
  className?: string;
  weeklyTransactions?: Transaction[];
  monthlyTransactions?: Transaction[];
  customers?: Contact[];
}

// Simple loading component
const LoadingComponent = () => {
  return (
    <View className="flex-row flex-wrap gap-3">
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="w-[48%] mb-3">
          <View className="bg-surface dark:bg-dark-surface rounded-xl p-4">
            <View className="h-10 w-10 rounded-full bg-surface-soft dark:bg-dark-surface-soft mb-3 animate-pulse" />
            <View className="h-4 w-16 bg-surface-soft dark:bg-dark-surface-soft rounded mb-2 animate-pulse" />
            <View className="h-6 w-24 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
          </View>
        </View>
      ))}
    </View>
  );
};

// Simple error component
const ErrorComponent = ({ error, retry }: { error: Error; retry: () => void }) => {
  return (
    <View className="items-center justify-center py-8">
      <View className="w-12 h-12 rounded-full bg-error/10 items-center justify-center mb-3">
        <Ionicons name="alert-circle" size={24} color="#ef4444" />
      </View>
      <ThemedText variant="error" size="sm" className="text-center mb-2">
        {error.message}
      </ThemedText>
      <TouchableOpacity
        onPress={retry}
        className="px-4 py-2 bg-brand rounded-lg"
      >
        <ThemedText className="text-white">Retry</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

// Inner component
const QuickStatsWidgetInner = ({ 
  weeklyTransactions = [],
  monthlyTransactions = [],
  customers = []
}: QuickStatsWidgetProps) => {
  const router = useRouter();
  const [debtors, setDebtors] = useState<DebtorSummary[]>([]);
  const { currentShop } = useAuth();

  // Load debtors data
  useEffect(() => {
    if (currentShop) {
      DebtService.getDebtorSummaries(currentShop.id).then(setDebtors);
      const interval = setInterval(() => {
        DebtService.getDebtorSummaries(currentShop.id).then(setDebtors);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [currentShop]);

  // Calculate metrics
  const data = useMemo(() => {
    const weeklySales = weeklyTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const monthlySales = monthlyTransactions.reduce((sum, t) => sum + t.totalAmount, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newCustomers = customers.filter(c => {
      if (!c.createdAt) return false;
      const createdDate = typeof c.createdAt === 'object' && 'getTime' in c.createdAt 
        ? c.createdAt 
        : new Date(c.createdAt);
      return createdDate >= startOfMonth;
    }).length;

    const totalPendingCredit = debtors.reduce((sum, d) => sum + d.totalDebt, 0);
    const activeDebtors = debtors.filter(d => d.totalDebt > 0).length;

    return {
      weeklySales,
      weeklyTransactions: weeklyTransactions.length,
      monthlySales,
      monthlyTransactions: monthlyTransactions.length,
      newCustomers,
      totalCustomers: customers.length,
      pendingCredit: totalPendingCredit,
      activeDebtors,
    };
  }, [weeklyTransactions, monthlyTransactions, customers, debtors]);

  const hasData = data.weeklySales > 0 || data.monthlySales > 0 || data.totalCustomers > 0;

  return (
    <View className="flex-row flex-wrap gap-3">
      {/* Weekly Sales */}
      <Card variant="elevated" className="w-[48%] mb-3">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="w-10 h-10 rounded-full bg-success/10 items-center justify-center">
              <Ionicons name="calendar" size={20} color="#22c55e" />
            </View>
            {data.weeklySales > 0 && (
              <Ionicons name="trending-up" size={14} color="#22c55e" />
            )}
          </View>
          <ThemedText variant="muted" size="xs">Weekly Sales</ThemedText>
          <ThemedText variant="heading" size="lg" className="font-bold mt-1">
            {formatCurrency(data.weeklySales)}
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="mt-1">
            {data.weeklyTransactions} transactions
          </ThemedText>
        </CardContent>
      </Card>

      {/* Monthly Sales */}
      <Card variant="elevated" className="w-[48%] mb-3">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="w-10 h-10 rounded-full bg-warning/10 items-center justify-center">
              <Ionicons name="trending-up" size={20} color="#f59e0b" />
            </View>
          </View>
          <ThemedText variant="muted" size="xs">Monthly Sales</ThemedText>
          <ThemedText variant="heading" size="lg" className="font-bold mt-1">
            {formatCurrency(data.monthlySales)}
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="mt-1">
            {data.monthlyTransactions} transactions
          </ThemedText>
        </CardContent>
      </Card>

      {/* Pending Credit */}
      <Card variant="elevated" className="w-[48%] mb-3">
        <TouchableOpacity 
          onPress={() => router.push(`/shops/${currentShop?.id}/debtors`)}
          activeOpacity={0.7}
        >
          <CardContent className="p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-10 h-10 rounded-full bg-orange-500/10 items-center justify-center">
                <Ionicons name="receipt" size={20} color="#f59e0b" />
              </View>
              {data.pendingCredit > 0 && (
                <Ionicons name="alert-circle" size={14} color="#f59e0b" />
              )}
            </View>
            <ThemedText variant="muted" size="xs">Pending Credit</ThemedText>
            <ThemedText variant="heading" size="lg" className="font-bold mt-1">
              {formatCurrency(data.pendingCredit)}
            </ThemedText>
            <ThemedText variant="muted" size="xs" className="mt-1">
              {data.activeDebtors} {data.activeDebtors === 1 ? 'debtor' : 'debtors'}
            </ThemedText>
          </CardContent>
        </TouchableOpacity>
      </Card>

      {/* New Customers */}
      <Card variant="elevated" className="w-[48%] mb-3">
        <TouchableOpacity 
          onPress={() => router.push(`/shops/${currentShop?.id}/contacts`)}
          activeOpacity={0.7}
        >
          <CardContent className="p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center">
                <Ionicons name="people" size={20} color="#3b82f6" />
              </View>
              {data.newCustomers > 0 && (
                <Ionicons name="add" size={14} color="#3b82f6" />
              )}
            </View>
            <ThemedText variant="muted" size="xs">New Customers</ThemedText>
            <ThemedText variant="heading" size="lg" className="font-bold mt-1">
              {data.newCustomers}
            </ThemedText>
            <ThemedText variant="muted" size="xs" className="mt-1">
              {data.totalCustomers} total
            </ThemedText>
          </CardContent>
        </TouchableOpacity>
      </Card>

      {/* Empty state */}
      {!hasData && (
        <View className="w-full mt-2">
          <View className="flex-row items-center justify-center p-3 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
            <Ionicons name="information-circle-outline" size={16} color="#64748b" />
            <ThemedText variant="muted" size="xs" className="ml-2">
              Add transactions to see your stats
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
};

// Enhance with observables
const enhance = withObservables(
  ['currentShop'], 
  ({ currentShop }: { currentShop: any }) => {
    if (!currentShop) {
      return {
        weeklyTransactions: of([]), // or [],
        monthlyTransactions: of([]), // or [],
        customers: of([]), // or [],
      };
    }

    const now = new Date();
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    return {
      weeklyTransactions: database
        .get<Transaction>('transactions')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('transaction_date', Q.gte(startOfWeek.getTime()))
        )
        .observe(),
      monthlyTransactions: database
        .get<Transaction>('transactions')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('transaction_date', Q.gte(startOfMonth.getTime())),
          Q.where('transaction_date', Q.lte(endOfMonth.getTime()))
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

  const fetchData = async (): Promise<{ hasData: boolean }> => {
    if (!currentShop) throw new Error("No shop selected");
    return { hasData: true };
  };

  return (
    <BaseWidget<{ hasData: boolean }>
      title="Quick Stats"
      fetchData={fetchData}
      refreshInterval={300000}
      loadingComponent={<LoadingComponent />}
      errorComponent={(error, retry) => <ErrorComponent error={error} retry={retry} />}
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