
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

interface Props {
  weeklyTransactions?: Transaction[];
  monthlyTransactions?: Transaction[];
  customers?: Contact[];
  currentShop?: any;
}

const QuickStatsInner = ({
  weeklyTransactions = [],
  monthlyTransactions = [],
  customers = [],
  currentShop,
}: Props) => {
  const router = useRouter();
  const [debtors, setDebtors] = useState<DebtorSummary[]>([]);

  useEffect(() => {
    if (!currentShop) return;

    const load = () =>
      DebtService.getDebtorSummaries(currentShop.id).then(setDebtors);

    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [currentShop]);

  const data = useMemo(() => {
    const weeklySales = weeklyTransactions.reduce((s, t) => s + t.totalAmount, 0);
    const monthlySales = monthlyTransactions.reduce((s, t) => s + t.totalAmount, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newCustomers = customers.filter(c => {
      if (!c.createdAt) return false;
      return new Date(c.createdAt) >= startOfMonth;
    }).length;

    const pendingCredit = debtors.reduce((s, d) => s + d.totalDebt, 0);
    const activeDebtors = debtors.filter(d => d.totalDebt > 0).length;

    return {
      weeklySales,
      monthlySales,
      weeklyTransactions: weeklyTransactions.length,
      monthlyTransactions: monthlyTransactions.length,
      totalCustomers: customers.length,
      newCustomers,
      pendingCredit,
      activeDebtors,
    };
  }, [weeklyTransactions, monthlyTransactions, customers, debtors]);

  // 🎯 STATUS LOGIC (core of your idea)
  const monthlyStatus =
    data.monthlySales > 0 ? 'success' : 'default';

  const weeklyStatus =
    data.weeklySales > 0 ? 'success' : 'default';

  const creditStatus =
    data.pendingCredit === 0
      ? 'success'
      : data.pendingCredit > 0 && data.pendingCredit < 1000
      ? 'warning'
      : 'error';

  const customerStatus =
    data.newCustomers > 0 ? 'brand' : 'default';

  return (
    <View className="flex-row flex-wrap gap-3">

      {/* Monthly */}
      <Card variant="outlined" status={monthlyStatus} className="w-[48%]">
        <CardContent className="p-4">
          <ThemedText size="xs" variant="muted">Monthly Sales</ThemedText>

          <ThemedText size="lg" className="font-bold mt-1">
            {formatCurrency(data.monthlySales)}
          </ThemedText>

          <ThemedText size="xs" variant="muted" className="mt-1">
            {data.monthlyTransactions} transactions
          </ThemedText>
        </CardContent>
      </Card>

      {/* Weekly */}
      <Card variant="outlined" status={weeklyStatus} className="w-[48%]">
        <CardContent className="p-4">
          <ThemedText size="xs" variant="muted">This Week</ThemedText>

          <ThemedText size="lg" className="font-bold mt-1">
            {formatCurrency(data.weeklySales)}
          </ThemedText>

          <ThemedText size="xs" variant="muted" className="mt-1">
            {data.weeklyTransactions} txns
          </ThemedText>
        </CardContent>
      </Card>

      {/* Credit */}
      <TouchableOpacity
        onPress={() => router.push(`/shops/${currentShop?.id}/debtors`)}
        className="w-[48%]"
      >
        <Card variant="outlined" status={creditStatus}>
          <CardContent className="p-4">
            <ThemedText size="xs" variant="muted">Pending Credit</ThemedText>

            <ThemedText size="lg" className="font-bold mt-1">
              {formatCurrency(data.pendingCredit)}
            </ThemedText>

            <ThemedText size="xs" variant="muted" className="mt-1">
              {data.activeDebtors} debtors
            </ThemedText>
          </CardContent>
        </Card>
      </TouchableOpacity>

      {/* Customers */}
      <TouchableOpacity
        onPress={() => router.push(`/shops/${currentShop?.id}/contacts?`)}
        className="w-[48%]"
      >
        <Card variant="outlined" status={customerStatus}>
          <CardContent className="p-4">
            <ThemedText size="xs" variant="muted">Customers</ThemedText>

            <ThemedText size="lg" className="font-bold mt-1">
              {data.totalCustomers}
            </ThemedText>

            <ThemedText size="xs" variant="muted" className="mt-1">
              +{data.newCustomers} new
            </ThemedText>
          </CardContent>
        </Card>
      </TouchableOpacity>

    </View>
  );
};

// 🔄 Observables
const enhance = withObservables(
  ['currentShop'],
  ({ currentShop }: { currentShop: any }) => {
    if (!currentShop) {
      return {
        weeklyTransactions: of([]),
        monthlyTransactions: of([]),
        customers: of([]),
      };
    }

    const now = new Date();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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
          Q.where('transaction_date', Q.gte(startOfMonth.getTime()))
        )
        .observe(),

      customers: database
        .get<Contact>('contacts')
        .query(Q.where('shop_id', currentShop.id))
        .observe(),
    };
  }
);

const QuickStatsWithObservables = enhance(QuickStatsInner);

export function QuickStatsWidget({ className }: { className?: string }) {
  const { currentShop } = useAuth();

  return (
    <BaseWidget
      title="Quick Stats"
      fetchData={async () => ({ hasData: true })}
      className={className}
    >
      {() =>
        currentShop ? (
          <QuickStatsWithObservables currentShop={currentShop} />
        ) : (
          <View className="items-center py-6">
            <ThemedText variant="muted">No shop selected</ThemedText>
          </View>
        )
      }
    </BaseWidget>
  );
}