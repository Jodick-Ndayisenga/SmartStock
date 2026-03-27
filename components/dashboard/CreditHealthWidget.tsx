// components/dashboard/CreditHealthWidget.tsx
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
import { formatCurrency, formatPercent } from '@/utils/dashboardUtils';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { of } from '@nozbe/watermelondb/utils/rx';

interface CreditData {
  outstanding: number;
  overdue: number;
  recoveryRate: number;
  totalCredit: number;
  paidCredit: number;
  customerCount: number;
  atRiskCount: number;
}

interface CreditHealthWidgetProps {
  className?: string;
  creditTransactions?: Transaction[];
  allCreditSales?: Transaction[];
}

// Custom loading component
const LoadingComponent = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <View className="p-4">
      {/* Header skeleton */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="h-4 w-32 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
        <View className="h-4 w-24 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
      </View>

      {/* Progress bar skeleton */}
      <View className="mb-6">
        <View className="flex-row justify-between mb-2">
          <View className="h-3 w-20 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
          <View className="h-3 w-16 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
        </View>
        <View className="h-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full animate-pulse" />
      </View>

      {/* Stats row skeleton */}
      <View className="flex-row justify-between">
        <View className="flex-1">
          <View className="h-3 w-16 bg-surface-soft dark:bg-dark-surface-soft rounded mb-2 animate-pulse" />
          <View className="h-5 w-20 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
        </View>
        <View className="flex-1 items-end">
          <View className="h-3 w-12 bg-surface-soft dark:bg-dark-surface-soft rounded mb-2 animate-pulse" />
          <View className="h-5 w-20 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
        </View>
      </View>
    </View>
  );
};

// Inner component with observable data
const CreditHealthWidgetInner = ({ 
  creditTransactions = [],
  allCreditSales = [],
  className 
}: CreditHealthWidgetProps) => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const now = Date.now();

  // Calculate credit metrics
  const calculateCreditData = (): CreditData => {
    // Only consider active credit transactions (due or partial)
    const activeCredits = creditTransactions.filter(t => 
      t.paymentStatus === 'due' || t.paymentStatus === 'partial'
    );

    const outstanding = activeCredits.reduce((sum, t) => sum + t.balanceDue, 0);
    
    const overdue = activeCredits
      .filter(t => t.dueDate && t.dueDate < now)
      .reduce((sum, t) => sum + t.balanceDue, 0);

    const totalCredit = allCreditSales.reduce((sum, t) => sum + t.totalAmount, 0);
    const paidCredit = totalCredit - outstanding;
    const recoveryRate = totalCredit > 0 ? (paidCredit / totalCredit) * 100 : 100;

    // Count unique customers with credit
    const uniqueCustomers = new Set(activeCredits.map(t => t.contactId).filter(Boolean));
    const atRiskCustomers = new Set(
      activeCredits
        .filter(t => t.dueDate && t.dueDate < now && t.contactId)
        .map(t => t.contactId)
        .filter(Boolean)
    );

    return {
      outstanding,
      overdue,
      recoveryRate,
      totalCredit,
      paidCredit,
      customerCount: uniqueCustomers.size,
      atRiskCount: atRiskCustomers.size,
    };
  };

  const data = calculateCreditData();
  const hasCredit = data.outstanding > 0 || data.totalCredit > 0;

  // Colors from your theme
  const colors = {
    warning: isDark ? '#fbbf24' : '#f59e0b',
    error: isDark ? '#f87171' : '#ef4444',
    success: isDark ? '#4ade80' : '#22c55e',
    info: isDark ? '#60a5fa' : '#3b82f6',
    surface: isDark ? '#0f172a' : '#ffffff',
    surfaceSoft: isDark ? '#1e293b' : '#f8fafc',
  };

  if (!hasCredit) {
    return (
      <View className="p-8 items-center justify-center">
        <View className="w-24 h-24 rounded-full bg-surface-soft dark:bg-dark-surface-soft items-center justify-center mb-4">
          <Ionicons name="card-outline" size={48} color={isDark ? '#475569' : '#94a3b8'} />
        </View>
        <ThemedText variant="muted" size="sm" className="text-center mb-2">
          No credit sales yet
        </ThemedText>
        <ThemedText variant="muted" size="xs" className="text-center mb-4">
          When you sell on credit, you'll see the health here
        </ThemedText>
        <TouchableOpacity
          onPress={() => router.push('/sales')}
          className="px-4 py-2 bg-brand rounded-lg flex-row items-center"
        >
          <Ionicons name="add-circle" size={16} color="#fff" />
          <ThemedText className="text-white ml-2">Create Credit Sale</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  const overduePercentage = data.outstanding > 0 ? (data.overdue / data.outstanding) * 100 : 0;

  return (
    <View className="p-4">
      {/* Header with summary */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <View className={`w-2 h-2 rounded-full ${data.overdue > 0 ? 'bg-error' : 'bg-success'} mr-2`} />
          <ThemedText variant={data.overdue > 0 ? 'error' : 'muted'} size="xs">
            {data.overdue > 0 
              ? `${formatCurrency(data.overdue)} overdue` 
              : 'No overdue payments'}
          </ThemedText>
        </View>
        {data.customerCount > 0 && (
          <View className="flex-row items-center">
            <Ionicons name="people" size={14} color={colors.info} />
            <ThemedText variant="muted" size="xs" className="ml-1">
              {data.customerCount} customer{data.customerCount !== 1 ? 's' : ''}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Outstanding Progress Bar */}
      <View className="mb-4">
        <View className="flex-row justify-between mb-1">
          <ThemedText variant="muted" size="xs">Outstanding</ThemedText>
          <ThemedText variant="default" size="sm" className="font-medium">
            {formatCurrency(data.outstanding)}
          </ThemedText>
        </View>
        <View className="h-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden">
          <View 
            className="h-full rounded-full"
            style={{ 
              width: `${overduePercentage}%`,
              backgroundColor: colors.error,
            }}
          />
        </View>
        <View className="flex-row justify-between mt-1">
          <ThemedText variant="muted" size="xs">On time</ThemedText>
          <ThemedText variant="muted" size="xs">Overdue {formatCurrency(data.overdue)}</ThemedText>
        </View>
      </View>

      {/* Main Stats Cards */}
      <View className="flex-row gap-3 mb-4">
        <Card variant="filled" className="flex-1">
          <CardContent className="p-3">
            <View className="flex-row items-center mb-1">
              <View className="w-6 h-6 rounded-full bg-success/10 items-center justify-center mr-2">
                <Ionicons name="trending-up" size={12} color={colors.success} />
              </View>
              <ThemedText variant="muted" size="xs">Recovery Rate</ThemedText>
            </View>
            <ThemedText variant="heading" size="lg" className="font-bold text-success ml-8">
              {formatPercent(data.recoveryRate)}
            </ThemedText>
          </CardContent>
        </Card>

        <Card variant="filled" className="flex-1">
          <CardContent className="p-3">
            <View className="flex-row items-center mb-1">
              <View className="w-6 h-6 rounded-full bg-warning/10 items-center justify-center mr-2">
                <Ionicons name="alert" size={12} color={colors.warning} />
              </View>
              <ThemedText variant="muted" size="xs">At Risk</ThemedText>
            </View>
            <ThemedText variant="heading" size="lg" className="font-bold text-warning ml-8">
              {data.atRiskCount}
            </ThemedText>
            <ThemedText variant="muted" size="xs" className="ml-8">
              customer{data.atRiskCount !== 1 ? 's' : ''}
            </ThemedText>
          </CardContent>
        </Card>
      </View>

      {/* Additional Metrics */}
      <View className="flex-row justify-between pt-3 border-t border-border dark:border-dark-border">
        <View>
          <ThemedText variant="muted" size="xs">Total Credit</ThemedText>
          <ThemedText variant="heading" size="base" className="font-bold text-info">
            {formatCurrency(data.totalCredit)}
          </ThemedText>
        </View>
        
        <View className="items-center">
          <ThemedText variant="muted" size="xs">Paid</ThemedText>
          <ThemedText variant="heading" size="base" className="font-bold text-success">
            {formatCurrency(data.paidCredit)}
          </ThemedText>
        </View>
        
        <View className="items-end">
          <ThemedText variant="muted" size="xs">Collection</ThemedText>
          <View className="flex-row items-center">
            <Ionicons 
              name={data.recoveryRate > 70 ? 'checkmark-circle' : 'time'} 
              size={16} 
              color={data.recoveryRate > 70 ? colors.success : colors.warning} 
            />
            <ThemedText 
              variant="heading" 
              size="base" 
              className={`font-bold ml-1 ${
                data.recoveryRate > 70 ? 'text-success' : 'text-warning'
              }`}
            >
              {formatPercent(data.recoveryRate)}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Warning for high overdue */}
      {overduePercentage > 30 && (
        <View className="mt-3 p-2 bg-error/10 rounded-lg flex-row items-center">
          <Ionicons name="warning" size={16} color={colors.error} />
          <ThemedText variant="error" size="xs" className="ml-2 flex-1">
            {overduePercentage > 50 
              ? 'Critical: More than 50% of outstanding is overdue' 
              : 'Warning: Over 30% of outstanding is overdue'}
          </ThemedText>
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
        creditTransactions: of([]), // or [],
        allCreditSales: of([]), // or [],
      };
    }

    const now = Date.now();

    return {
      // Active credit transactions (due or partial)
      creditTransactions: database
        .get<Transaction>('transactions')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('payment_status', Q.oneOf(['due', 'partial'])),
          Q.sortBy('due_date', Q.asc)
        )
        .observe(),
      
      // All credit sales ever (for recovery rate calculation)
      allCreditSales: database
        .get<Transaction>('transactions')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('transaction_type', 'sale'),
          Q.where('contact_id', Q.notEq(null))
        )
        .observe(),
    };
  }
);

const CreditHealthWidgetWithObservables = enhance(CreditHealthWidgetInner);

export function CreditHealthWidget({ className }: { className?: string }) {
  const { currentShop } = useAuth();
  const router = useRouter();

  if (!currentShop) {
    return (
      <Card variant="elevated" className={className}>
        <CardContent className="p-4">
          <View className="items-center justify-center py-8">
            <Ionicons name="storefront-outline" size={48} color="#64748b" />
            <ThemedText variant="muted" size="sm" className="mt-2">
              No shop selected
            </ThemedText>
          </View>
        </CardContent>
      </Card>
    );
  }

  return (
    <BaseWidget<{ hasData: boolean }>
      title="Credit Health"
      fetchData={async () => ({ hasData: true })}
      refreshInterval={600000} // 10 minutes
      loadingComponent={<LoadingComponent />}
      errorComponent={(error, retry) => (
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
      )}
      emptyComponent={null}
      action={{
        label: 'View Debtors',
        icon: 'arrow-forward',
        onPress: () => router.push(`/shops/${currentShop.id}/debtors`),
      }}
      className={className}
    >
      {() => (
        <CreditHealthWidgetWithObservables currentShop={currentShop} />
      )}
    </BaseWidget>
  );
}