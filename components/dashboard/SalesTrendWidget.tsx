// components/dashboard/SalesTrendWidget.tsx
import React, { useMemo } from 'react';
import { View, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { BaseWidget } from './BaseWidget';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import Transaction from '@/database/models/Transaction';
import { formatCurrency } from '@/utils/dashboardUtils';
import { ThemedText } from '@/components/ui/ThemedText';
import { Card, CardContent } from '@/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
import { Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { of } from '@nozbe/watermelondb/utils/rx';

const screenWidth = Dimensions.get('window').width - 48; // Accounting for padding

interface TrendData {
  chartData: Array<{ value: number; dataPointText: string; label: string }>;
  total: number;
  average: number;
  growth: number;
  bestDay: { label: string; value: number; index: number };
  maxValue: number;
  minValue: number;
}

interface SalesTrendWidgetProps {
  className?: string;
  compact?: boolean;
  transactions?: Transaction[];
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

      {/* Stats row skeleton */}
      <View className="flex-row gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="filled" className="flex-1">
            <CardContent className="p-3">
              <View className="h-3 w-12 bg-surface-soft dark:bg-dark-surface-soft rounded mb-2 animate-pulse" />
              <View className="h-5 w-16 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </View>

      {/* Chart skeleton */}
      <View className="h-48 bg-surface-soft dark:bg-dark-surface-soft rounded-lg animate-pulse" />
    </View>
  );
};

// Inner component with observable data
const SalesTrendWidgetInner = ({ 
  transactions = [],
  compact = false,
  className 
}: SalesTrendWidgetProps) => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Calculate trend data from transactions
  const trendData = useMemo((): TrendData => {
    const now = Date.now();
    const chartData: Array<{ value: number; dataPointText: string; label: string }> = [];
    let total = 0;
    let maxValue = 0;
    let minValue = Infinity;
    let maxLabel = '';
    let maxIndex = 0;

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date).setHours(0, 0, 0, 0);
      const dayEnd = new Date(date).setHours(23, 59, 59, 999);
      
      const dayTransactions = transactions.filter(t => 
        t.transactionDate >= dayStart && t.transactionDate <= dayEnd
      );
      
      const dayTotal = dayTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
      total += dayTotal;
      
      // Format label (short day name)
      const label = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      chartData.push({
        value: dayTotal,
        dataPointText: formatCurrency(dayTotal).replace(/\.00$/, ''),
        label,
      });
      
      // Track best day
      if (dayTotal > maxValue) {
        maxValue = dayTotal;
        maxLabel = label;
        maxIndex = i;
      }
      
      if (dayTotal < minValue && dayTotal > 0) {
        minValue = dayTotal;
      }
    }

    // Calculate average (excluding zeros)
    const nonZeroDays = chartData.filter(d => d.value > 0).length;
    const average = nonZeroDays > 0 ? total / nonZeroDays : 0;

    // Calculate growth (compare last 3 days vs previous 3 days)
    const last3Days = chartData.slice(-3).reduce((sum, d) => sum + d.value, 0);
    const previous3Days = chartData.slice(0, 3).reduce((sum, d) => sum + d.value, 0);
    const growth = previous3Days > 0 
      ? ((last3Days - previous3Days) / previous3Days) * 100 
      : 0;

    return {
      chartData,
      total,
      average,
      growth,
      bestDay: { label: maxLabel, value: maxValue, index: maxIndex },
      maxValue,
      minValue: minValue === Infinity ? 0 : minValue,
    };
  }, [transactions]);

  const hasData = trendData.chartData.some(d => d.value > 0);

  // Get colors based on theme
  const brandColor = isDark ? '#38bdf8' : '#0ea5e9';
  const successColor = isDark ? '#4ade80' : '#22c55e';
  const warningColor = isDark ? '#fbbf24' : '#f59e0b';
  const errorColor = isDark ? '#f87171' : '#ef4444';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const surfaceSoft = isDark ? '#1e293b' : '#f8fafc';
  const surfaceMuted = isDark ? '#334155' : '#f1f5f9';

  // Compact version for dashboard
  if (compact) {
    return (
      <TouchableOpacity
        onPress={() => router.push('/sales')}
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
              Sales Trend
            </ThemedText>
            <Ionicons name="chevron-forward" size={20} color={mutedColor} />
          </View>

          <View className="flex-row items-center justify-between mb-3">
            <View>
              <ThemedText variant="muted" size="xs">7-Day Total</ThemedText>
              <ThemedText variant="heading" size="lg" className="font-bold text-brand">
                {formatCurrency(trendData.total)}
              </ThemedText>
            </View>
            
            {/* Growth indicator */}
            <View className={`flex-row items-center px-2 py-1 rounded-full ${
              trendData.growth > 0 ? 'bg-success/10' : 
              trendData.growth < 0 ? 'bg-error/10' : 
              'bg-surface-soft dark:bg-dark-surface-soft'
            }`}>
              <Ionicons 
                name={trendData.growth > 0 ? 'trending-up' : trendData.growth < 0 ? 'trending-down' : 'remove'} 
                size={14} 
                color={
                  trendData.growth > 0 ? successColor : 
                  trendData.growth < 0 ? errorColor : 
                  mutedColor
                } 
              />
              <ThemedText 
                size="xs" 
                className="ml-1 font-medium"
                style={{
                  color: trendData.growth > 0 ? successColor : 
                         trendData.growth < 0 ? errorColor : 
                         mutedColor
                }}
              >
                {trendData.growth > 0 ? '+' : ''}{trendData.growth.toFixed(1)}%
              </ThemedText>
            </View>
          </View>

          {/* Mini sparkline using Gifted Charts */}
          <View style={{ height: 50, marginTop: 5 }}>
            <LineChart
              data={trendData.chartData.map(d => ({ value: d.value }))}
              height={50}
              thickness={2}
              color={brandColor}
              hideDataPoints
              hideAxesAndRules
              hideYAxisText
              disableScroll
              initialSpacing={0}
              spacing={30}
              adjustToWidth
              areaChart
              startOpacity={0.3}
              endOpacity={0}
              startFillColor={brandColor}
              endFillColor={brandColor}
            />
          </View>

          {!hasData && (
            <View className="mt-2">
              <ThemedText variant="muted" size="xs" className="text-center">
                No sales data for last 7 days
              </ThemedText>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Full version with beautiful gradient chart
  return (
    <View className="p-4">

      {/* Stats Cards */}
      <View className="flex-row gap-3 mb-6">
        <Card variant="filled" className="flex-1">
          <CardContent className="p-3">
            <ThemedText variant="muted" size="xs">Total Sales</ThemedText>
            <ThemedText variant="label" size="base" className="font-bold text-brand">
              {formatCurrency(trendData.total)}
            </ThemedText>
          </CardContent>
        </Card>

        <Card variant="filled" className="flex-1">
          <CardContent className="p-3">
            <ThemedText variant="muted" size="xs">Daily Avg</ThemedText>
            <ThemedText variant="label" size="base" className="font-bold text-info">
              {formatCurrency(trendData.average)}
            </ThemedText>
          </CardContent>
        </Card>

        <Card variant="filled" className="flex-1">
          <CardContent className="p-3">
            <ThemedText variant="muted" size="xs">Best Day</ThemedText>
            <ThemedText variant="label" size="base" className="font-bold text-success">
              {formatCurrency(trendData.bestDay.value)}
            </ThemedText>
            <ThemedText variant="success" size="xs" className="absolute bottom-1 top-2 right-2">
              {trendData.bestDay.label}
            </ThemedText>
          </CardContent>
        </Card>
      </View>

      {/* Chart */}
      {hasData ? (
        <Card variant="elevated" className="mb-4 overflow-hidden">
          <CardContent className="p-0">
            <View style={{ padding: 16, paddingBottom: 8 }}>
              <LineChart
                data={trendData.chartData}
                height={200}
                width={screenWidth - 32}
                thickness={3}
                color={brandColor}
                dataPointsColor={brandColor}
                dataPointsRadius={4}
                dataPointsWidth={2}
                textColor={textColor}
                textFontSize={10}
                textShiftY={-8}
                textShiftX={-10}
                hideDataPoints={false}
                showVerticalLines
                verticalLinesColor={isDark ? '#334155' : '#e2e8f0'}
                verticalLinesThickness={1}
                verticalLinesStrokeDashArray={[5, 5]}
                xAxisColor={isDark ? '#475569' : '#cbd5e1'}
                yAxisColor={isDark ? '#475569' : '#cbd5e1'}
                yAxisTextStyle={{ color: mutedColor, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: mutedColor, fontSize: 10 }}
                initialSpacing={20}
                spacing={40}
                curved
                areaChart
                startFillColor={brandColor}
                endFillColor={brandColor}
                startOpacity={0.3}
                endOpacity={0}
                rulesColor={isDark ? '#334155' : '#e2e8f0'}
                rulesThickness={1}
                rulesType="solid"
                yAxisIndicesColor={mutedColor}
                yAxisIndicesWidth={1}
                formatYLabel={(value) => formatCurrency(parseFloat(value)).replace(/\.00$/, 'k')}
                pointerConfig={{
                  pointerStripHeight: 160,
                  pointerStripColor: brandColor,
                  pointerStripWidth: 1,
                  pointerColor: brandColor,
                  radius: 6,
                  pointerLabelWidth: 100,
                  pointerLabelHeight: 60,
                  pointerLabelComponent: (items: any[]) => {
                    const item = items[0];
                    return (
                      <View className="bg-surface dark:bg-dark-surface p-2 rounded-lg shadow-card border border-border dark:border-dark-border">
                        <ThemedText variant="muted" size="xs">{item.label}</ThemedText>
                        <ThemedText variant="heading" size="sm" className="font-bold text-brand">
                          {formatCurrency(item.value)}
                        </ThemedText>
                      </View>
                    );
                  },
                }}
                lineGradient
                lineGradientId="salesGradient"
                lineGradientComponent={() => (
                  <Defs>
                    <SvgLinearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={brandColor} />
                      <Stop offset="0.5" stopColor={successColor} />
                      <Stop offset="1" stopColor={warningColor} />
                    </SvgLinearGradient>
                  </Defs>
                )}
              />
            </View>

            {/* Reference lines for thresholds */}
            {trendData.average > 0 && (
              <View className="px-4 pb-2 flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-warning/30 mr-2" />
                <ThemedText variant="muted" size="xs">
                  Avg: {formatCurrency(trendData.average)}
                </ThemedText>
              </View>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card variant="filled" className="mb-4">
          <CardContent className="p-8 items-center justify-center">
            <Ionicons name="analytics-outline" size={48} color={isDark ? '#475569' : '#cbd5e1'} />
            <ThemedText variant="muted" size="sm" className="text-center mt-2">
              No sales data available for the last 7 days
            </ThemedText>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/sales')}
              className="mt-4 px-4 py-2 bg-brand rounded-lg flex-row items-center"
            >
              <Ionicons name="add-circle" size={16} color="#fff" />
              <ThemedText className="text-white ml-2">Record Your First Sale</ThemedText>
            </TouchableOpacity>
          </CardContent>
        </Card>
      )}

      {/* Daily breakdown */}
      {hasData && (
        <View>
          <ThemedText variant="heading" size="sm" className="font-semibold mb-2">
            Daily Breakdown
          </ThemedText>
          <View className="bg-surface-soft dark:bg-dark-surface-soft rounded-lg p-3">
            {trendData.chartData.map((item, index) => (
              <View key={index} className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border last:border-0">
                <View className="flex-row items-center">
                  <View 
                    className={`w-2 h-2 rounded-full mr-2 ${
                      index === trendData.bestDay.index ? 'bg-success' : 'bg-muted'
                    }`} 
                  />
                  <ThemedText size="sm">{item.label}</ThemedText>
                </View>
                <View className="flex-row items-center">
                  <ThemedText size="sm" className="font-medium mr-2">
                    {formatCurrency(item.value)}
                  </ThemedText>
                  {index > 0 && item.value > 0 && trendData.chartData[index-1].value > 0 && (
                    <Ionicons 
                      name={item.value > trendData.chartData[index-1].value ? 'trending-up' : 'trending-down'} 
                      size={14} 
                      color={item.value > trendData.chartData[index-1].value ? successColor : errorColor} 
                    />
                  )}
                </View>
              </View>
            ))}
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
        transactions: of([]), // or [],
      };
    }

    // Get last 7 days of transactions
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    return {
      transactions: database
        .get<Transaction>('transactions')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('transaction_date', Q.gte(weekAgo)),
          Q.sortBy('transaction_date', Q.desc)
        )
        .observe(),
    };
  }
);

const SalesTrendWidgetWithObservables = enhance(SalesTrendWidgetInner);

export function SalesTrendWidget({ className, compact = false }: { className?: string; compact?: boolean }) {
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

  if (compact) {
    return (
      <SalesTrendWidgetWithObservables 
        currentShop={currentShop} 
        compact={true}
        className={className}
      />
    );
  }

  return (
    <BaseWidget<{ hasData: boolean }>
      title="Last 7 Days Performance"
      fetchData={async () => ({ hasData: true })}
      refreshInterval={300000}
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
        <SalesTrendWidgetWithObservables 
          currentShop={currentShop} 
          compact={false}
        />
      )}
    </BaseWidget>
  );
}