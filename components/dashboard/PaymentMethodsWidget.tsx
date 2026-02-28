// components/dashboard/PaymentMethodsWidget.tsx
import React from 'react';
import { TouchableOpacity,  View } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { BaseWidget } from './BaseWidget';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { Payment } from '@/database/models/Payment';
import { formatCurrency } from '@/utils/dashboardUtils';
import { PaymentMethodPieChart } from '@/components/charts/ThreePieChartsVariation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface PaymentMethodData {
  cash: number;
  bank: number;
  mobile: number;
  card: number;
  other: number;
  total: number;
}

export function PaymentMethodsWidget({ className }: { className?: string }) {
  const { currentShop } = useAuth();
  const router = useRouter();

  const fetchPaymentData = async (): Promise<PaymentMethodData> => {
    if (!currentShop) throw new Error('No shop selected');

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    const payments = await database.get<Payment>('payments')
      .query(
        Q.where('shop_id', currentShop.id),
        Q.where('payment_date', Q.gte(thirtyDaysAgo))
      )
      .fetch();

    const cash = payments
      .filter(p => p.paymentMethodId === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const bank = payments
      .filter(p => p.paymentMethodId === 'bank_transfer' || p.paymentMethodId === 'bank')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const mobile = payments
      .filter(p => p.paymentMethodId === 'mobile_money' || p.paymentMethodId === 'mobile')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const card = payments
      .filter(p => p.paymentMethodId === 'credit_card' || p.paymentMethodId === 'debit_card')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const other = payments
      .filter(p => !['cash', 'bank_transfer', 'bank', 'mobile_money', 'mobile', 'credit_card', 'debit_card'].includes(p.paymentMethodId))
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      cash,
      bank,
      mobile,
      card,
      other,
      total: cash + bank + mobile + card + other,
    };
  };

  // Custom loading component
  const LoadingComponent = () => (
    <View className="h-48 items-center justify-center">
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-surface-soft dark:bg-dark-surface-soft mr-2" />
        <View className="w-12 h-12 rounded-full bg-surface-soft dark:bg-dark-surface-soft mr-2" />
        <View className="w-12 h-12 rounded-full bg-surface-soft dark:bg-dark-surface-soft" />
      </View>
      <ThemedText variant="muted" size="sm" className="mt-4">
        Loading payment data...
      </ThemedText>
    </View>
  );

  // Custom error component
  const ErrorComponent = (error: Error, retry: () => void) => (
    <View className="h-48 items-center justify-center">
      <View className="w-16 h-16 rounded-full bg-error/10 items-center justify-center mb-3">
        <Ionicons name="cash-outline" size={32} color="#ef4444" />
      </View>
      <ThemedText variant="error" size="sm" className="text-center mb-2">
        Failed to load payment methods
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

  return (
    <BaseWidget<PaymentMethodData>
      title="Payment Methods"
      fetchData={fetchPaymentData}
      refreshInterval={600000} // 10 minutes
      loadingComponent={<LoadingComponent />}
      errorComponent={ErrorComponent}
      emptyComponent={
        <View className="h-48 items-center justify-center">
          <Ionicons name="card-outline" size={48} color="#64748b" />
          <ThemedText variant="muted" size="sm" className="text-center mt-2">
            No payment data available
          </ThemedText>
        </View>
      }
      action={{
        label: 'View All',
        icon: 'arrow-forward',
        onPress: () => router.push('/payments/analytics'),
      }}
      className={className}
    >
      {(data) => (
        <View>
          <PaymentMethodPieChart
            cash={data.cash}
            bank={data.bank}
            mobile={data.mobile}
            card={data.card}
            other={data.other}
            formatValue={formatCurrency}
          />
          
          {/* Legend and Summary */}
          <View className="mt-4 pt-4 border-t border-border dark:border-dark-border">
            <View className="flex-row justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-[#22c55e] mr-2" />
                <ThemedText variant="muted" size="xs">Cash</ThemedText>
              </View>
              <ThemedText variant="default" size="sm" className="font-medium">
                {formatCurrency(data.cash)}
              </ThemedText>
              <ThemedText variant="muted" size="xs">
                {((data.cash / data.total) * 100).toFixed(1)}%
              </ThemedText>
            </View>

            <View className="flex-row justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-[#3b82f6] mr-2" />
                <ThemedText variant="muted" size="xs">Bank</ThemedText>
              </View>
              <ThemedText variant="default" size="sm" className="font-medium">
                {formatCurrency(data.bank)}
              </ThemedText>
              <ThemedText variant="muted" size="xs">
                {((data.bank / data.total) * 100).toFixed(1)}%
              </ThemedText>
            </View>

            <View className="flex-row justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-[#f59e0b] mr-2" />
                <ThemedText variant="muted" size="xs">Mobile Money</ThemedText>
              </View>
              <ThemedText variant="default" size="sm" className="font-medium">
                {formatCurrency(data.mobile)}
              </ThemedText>
              <ThemedText variant="muted" size="xs">
                {((data.mobile / data.total) * 100).toFixed(1)}%
              </ThemedText>
            </View>

            {data.card > 0 && (
              <View className="flex-row justify-between mb-2">
                <View className="flex-row items-center">
                  <View className="w-3 h-3 rounded-full bg-[#8b5cf6] mr-2" />
                  <ThemedText variant="muted" size="xs">Card</ThemedText>
                </View>
                <ThemedText variant="default" size="sm" className="font-medium">
                  {formatCurrency(data.card)}
                </ThemedText>
                <ThemedText variant="muted" size="xs">
                  {((data.card / data.total) * 100).toFixed(1)}%
                </ThemedText>
              </View>
            )}

            {data.other > 0 && (
              <View className="flex-row justify-between">
                <View className="flex-row items-center">
                  <View className="w-3 h-3 rounded-full bg-[#64748b] mr-2" />
                  <ThemedText variant="muted" size="xs">Other</ThemedText>
                </View>
                <ThemedText variant="default" size="sm" className="font-medium">
                  {formatCurrency(data.other)}
                </ThemedText>
                <ThemedText variant="muted" size="xs">
                  {((data.other / data.total) * 100).toFixed(1)}%
                </ThemedText>
              </View>
            )}

            <View className="mt-3 pt-2 border-t border-border dark:border-dark-border">
              <View className="flex-row justify-between">
                <ThemedText variant="heading" size="sm" className="font-semibold">
                  Total (30 days)
                </ThemedText>
                <ThemedText variant="heading" size="sm" className="font-bold text-brand">
                  {formatCurrency(data.total)}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      )}
    </BaseWidget>
  );
}