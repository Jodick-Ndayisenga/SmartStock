// components/dashboard/RevenueDistributionWidget.tsx
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import database from "@/database";
import { CashAccount } from "@/database/models/CashAccount";
import { formatCurrency } from "@/utils/dashboardUtils";
import { Q } from "@nozbe/watermelondb";
import { withObservables } from '@nozbe/watermelondb/react';
import React from "react";
import { View, TouchableOpacity, Dimensions } from "react-native";
import { ThemedText } from "@/components/ui/ThemedText";
import { Card, CardContent } from "@/components/ui/Card";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from 'nativewind';
import { BaseWidget } from "./BaseWidget";
import { PieChart } from "react-native-gifted-charts";
import { of } from "@nozbe/watermelondb/utils/rx";

const screenWidth = Dimensions.get('window').width;

interface RevenueData {
  cash: number;
  bank: number;
  mobile: number;
  receivables: number;
  total: number;
}

interface RevenueDistributionWidgetProps {
  className?: string;
  cashAccounts?: CashAccount[];
}

// Custom loading component
const LoadingComponent = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <View className="p-4">
      {/* Header skeleton */}
      <View className="flex-row justify-between items-center mb-6">
        <View className="h-6 w-32 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
        <View className="h-6 w-20 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
      </View>

      {/* Chart skeleton */}
      <View className="items-center mb-6">
        <View className="w-64 h-64 rounded-full bg-surface-soft dark:bg-dark-surface-soft animate-pulse" />
      </View>

      {/* Legend skeleton */}
      <View className="flex-row flex-wrap gap-3">
        {[1, 2, 3, 4].map((i) => (
          <View key={i} className="flex-1 min-w-[48%] flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-surface-soft dark:bg-dark-surface-soft mr-2 animate-pulse" />
            <View className="flex-1">
              <View className="h-3 w-16 bg-surface-soft dark:bg-dark-surface-soft rounded mb-1 animate-pulse" />
              <View className="h-4 w-20 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// Inner component with observable data
const RevenueDistributionWidgetInner = ({ 
  cashAccounts = [],
  className 
}: RevenueDistributionWidgetProps) => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Calculate revenue distribution from cash accounts
  const calculateRevenue = (): RevenueData => {
    const cash = cashAccounts
      .filter(a => a.type === 'cash')
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    const bank = cashAccounts
      .filter(a => a.type === 'bank_account')
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    const mobile = cashAccounts
      .filter(a => a.type === 'mobile_money')
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    const receivables = cashAccounts
      .filter(a => a.type === 'receivable')
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    return {
      cash,
      bank,
      mobile,
      receivables,
      total: cash + bank + mobile + receivables,
    };
  };

  const data = calculateRevenue();
  const hasData = data.total > 0;

  // Colors from your theme
  const colors = {
    cash: isDark ? '#4ade80' : '#22c55e',
    bank: isDark ? '#60a5fa' : '#3b82f6',
    mobile: isDark ? '#fbbf24' : '#f59e0b',
    receivables: isDark ? '#f87171' : '#ef4444',
    surface: isDark ? '#0f172a' : '#ffffff',
    surfaceSoft: isDark ? '#1e293b' : '#f8fafc',
    text: isDark ? '#f1f5f9' : '#0f172a',
    muted: isDark ? '#94a3b8' : '#64748b',
    brand: isDark ? '#38bdf8' : '#0ea5e9',
  };

  // Prepare data for pie chart
  const pieData = [
    {
      value: data.cash,
      color: colors.cash,
      text: data.total > 0 ? `${((data.cash / data.total) * 100).toFixed(1)}%` : '0%',
      label: 'Cash',
      icon: 'cash',
      gradientCenterColor: isDark ? '#1a4532' : '#dcfce7',
      shiftTextX: -10,
      shiftTextY: -5,
    },
    {
      value: data.bank,
      color: colors.bank,
      text: data.total > 0 ? `${((data.bank / data.total) * 100).toFixed(1)}%` : '0%',
      label: 'Bank',
      icon: 'business',
      gradientCenterColor: isDark ? '#1e3a5c' : '#dbeafe',
      shiftTextX: 10,
      shiftTextY: -5,
    },
    {
      value: data.mobile,
      color: colors.mobile,
      text: data.total > 0 ? `${((data.mobile / data.total) * 100).toFixed(1)}%` : '0%',
      label: 'Mobile',
      icon: 'phone-portrait',
      gradientCenterColor: isDark ? '#453209' : '#fef3c7',
      shiftTextX: -10,
      shiftTextY: 5,
    },
    {
      value: data.receivables,
      color: colors.receivables,
      text: data.total > 0 ? `${((data.receivables / data.total) * 100).toFixed(1)}%` : '0%',
      label: 'Receivables',
      icon: 'time',
      gradientCenterColor: isDark ? '#4c1d1d' : '#fee2e2',
      shiftTextX: 10,
      shiftTextY: 5,
    },
  ].filter(item => item.value > 0); // Only show segments with values

  // If no data, show empty state
  if (!hasData || pieData.length === 0) {
    return (
      <View className="p-4">
        <Card variant="filled" className="mb-6">
          <CardContent className="p-4">
            <View className="flex-row justify-between items-center">
              <View>
                <ThemedText variant="muted" size="xs">Total Revenue</ThemedText>
                <ThemedText variant="heading" size="xl" className="font-bold text-muted">
                  {formatCurrency(0)}
                </ThemedText>
              </View>
              <View className={`w-12 h-12 rounded-full ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'} items-center justify-center`}>
                <Ionicons name="stats-chart" size={24} color={colors.muted} />
              </View>
            </View>
          </CardContent>
        </Card>

        <View className="items-center justify-center py-8">
          <View className="w-64 h-64 rounded-full bg-surface-soft dark:bg-dark-surface-soft items-center justify-center">
            <Ionicons name="pie-chart-outline" size={64} color={colors.muted} />
          </View>
          <ThemedText variant="muted" size="sm" className="text-center mt-4">
            No revenue data available
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="text-center mt-1">
            Add cash accounts to see distribution
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View className="p-0">

      {/* Beautiful 3D Donut Chart */}
      <Card variant="elevated" className="overflow-hidden">
        <CardContent className="p-0 items-center">
          <View style={{ 
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderRadius: 200,
            padding: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.5 : 0.1,
            shadowRadius: 12,
            elevation: 8,
          }}>
            <PieChart
              data={pieData}
              donut
              isThreeD
              showText
              textColor={colors.text}
              textSize={14}
              //fontFamily="Inter-Medium"
              radius={150}
              innerRadius={70}
              innerCircleColor={colors.surface}
              innerCircleBorderWidth={3}
              innerCircleBorderColor={isDark ? '#334155' : '#e2e8f0'}
              showTextBackground
              textBackgroundColor={isDark ? '#1e293b' : '#ffffff'}
              textBackgroundRadius={22}
              centerLabelComponent={() => (
                <View className="items-center justify-start">
                  <ThemedText variant="heading" size="sm" className="font-bold text-brand">
                    {pieData.length === 1 ? '100%' : 'Total'}
                  </ThemedText>
                  <ThemedText variant="muted" size="xs">
                    {formatCurrency(data.total).length > 10 
                      ? formatCurrency(data.total).substring(0, 8) + '...'
                      : formatCurrency(data.total)
                    }
                  </ThemedText>
                </View>
              )}
              strokeWidth={2}
              strokeColor={isDark ? '#1e293b' : '#ffffff'}
              shiftInnerCenterX={-5}
              shiftInnerCenterY={-8}
              tiltAngle={isDark ? '30deg' : '20deg'}
             
            />
          </View>

          {/* Chart Legend */}
          <View className="flex-row flex-wrap justify-center mt-4 gap-3">
            {pieData.map((item, index) => (
              <View key={index} className="flex-row items-center mx-2">
                <View 
                  style={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: 6, 
                    backgroundColor: item.color,
                    marginRight: 6,
                    shadowColor: item.color,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  }} 
                />
                <ThemedText size="xs" className="font-medium">
                  {item.label}
                </ThemedText>
              </View>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* Distribution Cards */}
      <View className="flex-row flex-wrap gap-3">
        {pieData.map((item, index) => {
          const percentage = ((item.value / data.total) * 100).toFixed(1);
          const isPositive = percentage > '0';
          
          return (
            <Card key={index} variant="filled" className="flex-1 min-w-[48%]">
              <CardContent className="p-0">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <View 
                      className="w-8 h-8 rounded-full items-center justify-center mr-2"
                      style={{ backgroundColor: `${item.color}20` }}
                    >
                      <Ionicons name={item.icon as any} size={16} color={item.color} />
                    </View>
                    <ThemedText variant="muted" size="xs">{item.label}</ThemedText>
                  </View>
                  <View className={`px-2 py-1 rounded-full ${isPositive ? 'bg-success/10' : 'bg-surface-soft'}`}>
                    <ThemedText 
                      size="xs" 
                      className="font-medium"
                      style={{ color: isPositive ? item.color : colors.muted }}
                    >
                      {percentage}%
                    </ThemedText>
                  </View>
                </View>
                <ThemedText variant="label" size="base" className="font-bold ml-10">
                  {formatCurrency(item.value)}
                </ThemedText>
              </CardContent>
            </Card>
          );
        })}
      </View>
    </View>
  );
};

// Enhance with observables
const enhance = withObservables(
  ['currentShop'],
  ({ currentShop }: { currentShop: any }) => {
    if (!currentShop) {
      return {
        cashAccounts: of([]), // or [],
      };
    }

    return {
      cashAccounts: database
        .get<CashAccount>('cash_accounts')
        .query(
          Q.where('shop_id', currentShop.id)
        )
        .observe(),
    };
  }
);

const RevenueDistributionWidgetWithObservables = enhance(RevenueDistributionWidgetInner);

export function RevenueDistributionWidget({ className }: { className?: string }) {
  const { currentShop } = useAuth();

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
      title="Revenue Distribution"
      fetchData={async () => ({ hasData: true })}
      refreshInterval={600000}
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
      className={className}
    >
      {() => (
        <RevenueDistributionWidgetWithObservables currentShop={currentShop} />
      )}
    </BaseWidget>
  );
}