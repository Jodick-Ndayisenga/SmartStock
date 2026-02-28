// components/dashboard/CreditHealthWidget.tsx
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { BaseWidget } from './BaseWidget';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import Transaction from '@/database/models/Transaction';
import { formatCurrency, formatPercent } from '@/utils/dashboardUtils';
import { useRouter } from 'expo-router';

interface CreditData {
  outstanding: number;
  overdue: number;
  recoveryRate: number;
  totalCredit: number;
}

export function CreditHealthWidget() {
  const { currentShop } = useAuth();
  const router = useRouter();

  const fetchCreditData = async (): Promise<CreditData> => {
    if (!currentShop) throw new Error('No shop selected');

    const now = Date.now();
    const transactions = await database.get<Transaction>('transactions')
      .query(
        Q.where('shop_id', currentShop.id),
        Q.where('paymentStatus', Q.oneOf(['due', 'partial']))
      )
      .fetch();

    const outstanding = transactions.reduce((sum, t) => sum + t.balanceDue, 0);
    const overdue = transactions
      .filter(t => t.dueDate && t.dueDate < now)
      .reduce((sum, t) => sum + t.balanceDue, 0);

    const allCreditTransactions = await database.get<Transaction>('transactions')
      .query(
        Q.where('shop_id', currentShop.id),
        Q.where('transactionType', 'sale'),
        Q.where('contactId', Q.notEq(null))
      )
      .fetch();

    const totalCredit = allCreditTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const paidCredit = totalCredit - outstanding;
    const recoveryRate = totalCredit > 0 ? (paidCredit / totalCredit) * 100 : 100;

    return {
      outstanding,
      overdue,
      recoveryRate,
      totalCredit,
    };
  };

  return (
    <BaseWidget<CreditData>
      title="Credit Health"
      fetchData={fetchCreditData}
      refreshInterval={600000} // 10 minutes
      action={{
        label: 'View Debtors',
        icon: 'arrow-forward',
        onPress: () => router.push('/debtors'),
      }}
    >
      {(data) => (
        <>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-error mr-1" />
              <ThemedText variant="error" size="xs">
                {formatCurrency(data.overdue)} overdue
              </ThemedText>
            </View>
          </View>

          <View className="flex-row items-center mb-4">
            <View className="flex-1">
              <View className="flex-row justify-between mb-1">
                <ThemedText variant="muted" size="xs">Outstanding</ThemedText>
                <ThemedText variant="default" size="sm" className="font-medium">
                  {formatCurrency(data.outstanding)}
                </ThemedText>
              </View>
              <View className="h-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden">
                <View 
                  className="h-full bg-warning rounded-full"
                  style={{ width: `${(data.overdue / (data.outstanding || 1)) * 100}%` }}
                />
              </View>
            </View>
          </View>

          <View className="flex-row justify-between">
            <View>
              <ThemedText variant="muted" size="xs">Recovery Rate</ThemedText>
              <ThemedText variant="heading" size="lg" className="font-bold text-success">
                {formatPercent(data.recoveryRate)}
              </ThemedText>
            </View>
            <View className="items-end">
              <ThemedText variant="muted" size="xs">At Risk</ThemedText>
              <ThemedText variant="heading" size="lg" className="font-bold text-error">
                {formatCurrency(data.overdue)}
              </ThemedText>
            </View>
          </View>
        </>
      )}
    </BaseWidget>
  );
}