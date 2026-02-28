// components/dashboard/SalesTrendWidget.tsx
import React from 'react';
import { BaseWidget } from './BaseWidget';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import Transaction from '@/database/models/Transaction';
import { formatCurrency } from '@/utils/dashboardUtils';
import { GradientAreaChart } from '@/components/charts';

interface TrendData {
  labels: string[];
  values: number[];
}

export function SalesTrendWidget() {
  const { currentShop } = useAuth();

  const fetchTrendData = async (): Promise<TrendData> => {
    if (!currentShop) throw new Error('No shop selected');

    const now = Date.now();
    const transactions = await database.get<Transaction>('transactions')
      .query(
        Q.where('shop_id', currentShop.id),
        Q.sortBy('transaction_date', Q.desc)
      )
      .fetch();

    const labels: string[] = [];
    const values: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dayStart = date.setHours(0, 0, 0, 0);
      const dayEnd = date.setHours(23, 59, 59, 999);
      
      const dayTransactions = transactions.filter(t => 
        t.transactionDate >= dayStart && t.transactionDate <= dayEnd
      );
      const dayTotal = dayTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
      
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      values.push(dayTotal);
    }

    return { labels, values };
  };

  return (
    <BaseWidget<TrendData>
      title="Sales Trend"
      fetchData={fetchTrendData}
      refreshInterval={300000} // 5 minutes
    >
      {(data) => (
        <GradientAreaChart 
          data={data.values}
          labels={data.labels}
          formatValue={formatCurrency}
          
        />
      )}
    </BaseWidget>
  );
}