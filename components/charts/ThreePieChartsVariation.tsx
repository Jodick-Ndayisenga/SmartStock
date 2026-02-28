// components/charts/ThreeDPieChartVariations.tsx
import React from 'react';
import { View } from 'react-native';
import { ThreeDPieChart } from './ThreePieCharts';

interface RevenuePieChartProps {
  cash: number;
  bank: number;
  mobile: number;
  receivables: number;
  formatValue: (value: number) => string;
}

export const RevenuePieChart: React.FC<RevenuePieChartProps> = ({
  cash,
  bank,
  mobile,
  receivables,
  formatValue,
}) => {
  const total = cash + bank + mobile + receivables;
  
  const data = [
    { value: cash, color: '#22c55e', label: 'Cash' },
    { value: bank, color: '#3b82f6', label: 'Bank' },
    { value: mobile, color: '#f59e0b', label: 'Mobile' },
    { value: receivables, color: '#ef4444', label: 'Receivables' },
  ].filter(item => item.value > 0);

  return (
    <ThreeDPieChart
      data={data}
      total={total}
      formatValue={formatValue}
      donut={true}
      innerRadius={50}
    />
  );
};

interface PaymentMethodPieChartProps {
  cash: number;
  bank: number;
  mobile: number;
  formatValue: (value: number) => string;
}

export const PaymentMethodPieChart: React.FC<PaymentMethodPieChartProps> = ({
  cash,
  bank,
  mobile,
  formatValue,
}) => {
  const total = cash + bank + mobile;
  
  const data = [
    { value: cash, color: '#22c55e', label: 'Cash' },
    { value: bank, color: '#3b82f6', label: 'Bank' },
    { value: mobile, color: '#f59e0b', label: 'Mobile' },
  ].filter(item => item.value > 0);

  return (
    <ThreeDPieChart
      data={data}
      total={total}
      formatValue={formatValue}
      donut={false}
      innerRadius={0}
    />
  );
};

interface StockPieChartProps {
  healthy: number;
  lowStock: number;
  outOfStock: number;
  formatValue: (value: number) => string;
}

export const StockPieChart: React.FC<StockPieChartProps> = ({
  healthy,
  lowStock,
  outOfStock,
  formatValue,
}) => {
  const total = healthy + lowStock + outOfStock;
  
  const data = [
    { value: healthy, color: '#22c55e', label: 'Healthy' },
    { value: lowStock, color: '#f59e0b', label: 'Low Stock' },
    { value: outOfStock, color: '#ef4444', label: 'Out of Stock' },
  ].filter(item => item.value > 0);

  return (
    <ThreeDPieChart
      data={data}
      total={total}
      formatValue={formatValue}
      donut={true}
      innerRadius={45}
    />
  );
};

interface CategoryPieChartProps {
  categories: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  formatValue: (value: number) => string;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  categories,
  formatValue,
}) => {
  const total = categories.reduce((sum, cat) => sum + cat.value, 0);
  
  const data = categories.map(cat => ({
    value: cat.value,
    color: cat.color,
    label: cat.name,
  }));

  return (
    <ThreeDPieChart
      data={data}
      total={total}
      formatValue={formatValue}
      donut={true}
      innerRadius={40}
    />
  );
};