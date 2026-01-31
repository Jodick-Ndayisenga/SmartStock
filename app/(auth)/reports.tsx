// app/(tabs)/reports.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  ScrollView, 
  Alert, 
  RefreshControl,
  TouchableOpacity,
  Share,
  useColorScheme,
  Animated
} from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { Dimensions } from 'react-native';
import database from '@/database';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Loading } from '@/components/ui/Loading';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import ChartCard from '@/components/charts/ChartCard';
import { useChartTheme } from '@/components/charts/useChartTheme';

// Models & Types
import { Product } from '@/database/models/Product';
import { StockMovement } from '@/database/models/StockMovement';
import { Shop } from '@/database/models/Shop';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

// Types
type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';
type ChartType = 'sales' | 'profit' | 'revenue' | 'volume';

interface ReportData {
  period: ReportPeriod;
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalSales: number;
  averageSale: number;
  profitMargin: number;
  topProducts: Array<{
    product: any;
    quantity: number;
    revenue: number;
    profit: number;
  }>;
  salesByDay: Array<{ date: string; revenue: number; profit: number; sales: number }>;
  stockAlerts: Array<{
    product: any;
    currentStock: number;
    threshold: number;
  }>;
  lowPerformanceProducts: Array<{
    product: any;
    quantity: number;
    revenue: number;
  }>;
  comparison: {
    previousRevenue: number;
    previousProfit: number;
    revenueChange: number;
    profitChange: number;
  };
}

export default function ReportsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentShop, user } = useAuth();
  const colorScheme = useColorScheme();
  const theme = useChartTheme();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>('week');
  const [chartType, setChartType] = useState<ChartType>('revenue');
  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width - 48);

  // Date ranges for different periods
  const periodRanges = useMemo(() => {
    const now = new Date();
    return {
      today: {
        start: new Date(now.setHours(0, 0, 0, 0)),
        end: new Date(now.setHours(23, 59, 59, 999))
      },
      week: {
        start: startOfWeek(now),
        end: endOfWeek(now)
      },
      month: {
        start: startOfMonth(now),
        end: endOfMonth(now)
      },
      quarter: {
        start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
        end: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0, 23, 59, 59, 999)
      },
      year: {
        start: startOfYear(now),
        end: endOfYear(now)
      }
    };
  }, []);

  useEffect(() => {
    loadReportData();
  }, [period, currentShop]);

  const loadReportData = async () => {
    if (!currentShop) return;

    try {
      setLoading(true);
      
      const range = periodRanges[period];
      const previousRange = getPreviousRange(range, period);
      
      // Fetch current period data
      const currentData = await fetchPeriodData(currentShop.id, range);
      // Fetch previous period data for comparison
      const previousData = await fetchPeriodData(currentShop.id, previousRange);

      const comparison = {
        previousRevenue: previousData.totalRevenue,
        previousProfit: previousData.totalProfit,
        revenueChange: currentData.totalRevenue - previousData.totalRevenue,
        profitChange: currentData.totalProfit - previousData.totalProfit
      };

      setReportData({
        ...currentData,
        comparison,
        period
      });
      
    } catch (error) {
      console.error('Error loading report data:', error);
      Alert.alert('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getPreviousRange = (currentRange: { start: Date; end: Date }, period: ReportPeriod) => {
    const duration = currentRange.end.getTime() - currentRange.start.getTime();
    return {
      start: new Date(currentRange.start.getTime() - duration - 86400000), // Subtract one extra day
      end: new Date(currentRange.start.getTime() - 86400000) // End just before current period
    };
  };

  const fetchPeriodData = async (shopId: string, range: { start: Date; end: Date }) => {
    const salesMovements = await database.get<StockMovement>('stock_movements')
      .query(
        Q.where('shop_id', shopId),
        Q.where('movement_type', 'SALE'),
        Q.where('timestamp', Q.gte(range.start.getTime())),
        Q.where('timestamp', Q.lte(range.end.getTime()))
      )
      .fetch();

    const products = await database.get<Product>('products')
      .query(Q.where('shop_id', shopId))
      .fetch();

    // Calculate sales data
    return await calculateSalesData(salesMovements, products, range);
  };

  const calculateSalesData = async (
    salesMovements: StockMovement[], 
    products: Product[], 
    range: { start: Date; end: Date }
  ): Promise<Omit<ReportData, 'period' | 'comparison'>> => {
    const productSales = new Map();
    let totalRevenue = 0;
    let totalCost = 0;
    let totalSales = 0;

    // Process sales
    for (const sale of salesMovements) {
      const product = products.find(p => p.id === sale.productId);
      if (!product) continue;

      const revenue = sale.quantity * product.sellingPricePerBase;
      const cost = sale.quantity * product.costPricePerBase;
      const profit = revenue - cost;

      totalRevenue += revenue;
      totalCost += cost;
      totalSales += sale.quantity;

      if (productSales.has(product.id)) {
        const existing = productSales.get(product.id);
        productSales.set(product.id, {
          ...existing,
          quantity: existing.quantity + sale.quantity,
          revenue: existing.revenue + revenue,
          profit: existing.profit + profit
        });
      } else {
        productSales.set(product.id, {
          product: product._raw,
          quantity: sale.quantity,
          revenue,
          profit
        });
      }
    }

    // Get top products
    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Sales by day
    const salesByDayMap = new Map();
    const days = eachDayOfInterval({ start: range.start, end: range.end });
    
    days.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      salesByDayMap.set(dateKey, { date: dateKey, revenue: 0, profit: 0, sales: 0 });
    });

    salesMovements.forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      if (!product) return;

      const date = new Date(sale.timestamp);
      const dateKey = format(date, 'yyyy-MM-dd');
      const revenue = sale.quantity * product.sellingPricePerBase;
      const cost = sale.quantity * product.costPricePerBase;
      const profit = revenue - cost;

      const existing = salesByDayMap.get(dateKey) || { date: dateKey, revenue: 0, profit: 0, sales: 0 };
      salesByDayMap.set(dateKey, {
        date: dateKey,
        revenue: existing.revenue + revenue,
        profit: existing.profit + profit,
        sales: existing.sales + sale.quantity
      });
    });

    const salesByDay = Array.from(salesByDayMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    // Stock alerts
    const stockAlerts = await Promise.all(
      products.map(async (product) => {
        const stock = await calculateProductStock(product.id);
        return { 
          product: product._raw, 
          currentStock: stock, 
          threshold: product.lowStockThreshold || 10 
        };
      })
    ).then(results => results.filter(item => 
      item.currentStock <= item.threshold && item.currentStock > 0
    ));

    // Low performance products
    const lowPerformanceProducts = products
      .filter(product => !productSales.has(product.id))
      .slice(0, 5)
      .map(product => ({
        product: product._raw,
        quantity: 0,
        revenue: 0
      }));

    const profitMargin = totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue * 100 : 0;

    return {
      startDate: range.start,
      endDate: range.end,
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      totalSales,
      averageSale: totalSales > 0 ? totalRevenue / totalSales : 0,
      profitMargin,
      topProducts,
      salesByDay,
      stockAlerts,
      lowPerformanceProducts
    };
  };

  const calculateProductStock = async (productId: string): Promise<number> => {
    const movements = await database.get<StockMovement>('stock_movements')
      .query(Q.where('product_id', productId))
      .fetch();
    
    let stock = 0;
    movements.forEach(movement => {
      if (movement.movementType === 'IN') {
        stock += movement.quantity;
      } else if (movement.movementType === 'SALE') {
        stock -= movement.quantity;
      }
    });
    
    return stock;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReportData();
  };

  const shareReport = async () => {
    if (!reportData) return;

    try {
      const message = `
📊 Business Report - ${format(reportData.startDate, 'MMM dd, yyyy')} to ${format(reportData.endDate, 'MMM dd, yyyy')}

💰 Revenue: FBU ${reportData.totalRevenue.toLocaleString()}
💸 Cost: FBU ${reportData.totalCost.toLocaleString()}
🎯 Profit: FBU ${reportData.totalProfit.toLocaleString()}
📦 Total Sales: ${reportData.totalSales} units
📈 Profit Margin: ${reportData.profitMargin.toFixed(1)}%

Top Products:
${reportData.topProducts.map((item, index) => 
  `${index + 1}. ${item.product.name}: FBU ${item.revenue.toLocaleString()}`
).join('\n')}

Generated by GestioMagasin
      `.trim();

      await Share.share({
        message,
        title: 'Business Report'
      });
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  const getChartData = () => {
    if (!reportData) return [];

    return reportData.salesByDay.map(day => ({
      value: chartType === 'revenue' ? day.revenue : 
             chartType === 'profit' ? day.profit : 
             chartType === 'sales' ? day.sales : day.sales,
      label: format(parseISO(day.date), period === 'year' ? 'MMM' : 'dd'),
      labelTextStyle: { color: theme.muted, fontSize: 10 },
      frontColor: chartType === 'revenue' ? theme.brand : 
                 chartType === 'profit' ? theme.success : 
                 chartType === 'sales' ? theme.warning : theme.info
    }));
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `FBU ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `FBU ${(amount / 1000).toFixed(0)}K`;
    return `FBU ${amount.toLocaleString()}`;
  };

  const getTrendIcon = (change: number) => {
    return change >= 0 ? 'trending-up' : 'trending-down';
  };

  const getTrendColor = (change: number) => {
    return change >= 0 ? 'text-success' : 'text-error';
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title={t('reports.title')} />
        <Loading text="Generating report..." />
      </View>
    );
  }

  if (!currentShop) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title={t('reports.title')} />
        <EmptyState
          icon="analytics-outline"
          title="No Shop Found"
          description="Create a shop first to view reports"
          action={{
            label: "Create Shop",
            onPress: () => router.push('/(auth)/create-shop')
          }}
        />
      </View>
    );
  }

  if (!reportData) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title={t('reports.title')} />
        <EmptyState
          icon="analytics-outline"
          title="No Data Available"
          description="Start making sales to generate reports"
          action={{
            label: "Record First Sale",
            onPress: () => router.push('/(tabs)/sales')
          }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title={t('reports.title')}
        subtitle={`${format(reportData.startDate, 'MMM dd, yyyy')} - ${format(reportData.endDate, 'MMM dd, yyyy')}`}
        action={
          <Button variant="ghost" size="sm" onPress={shareReport} icon="share-outline">
            Share
          </Button>
        }
      />

      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="p-4">
          {/* Welcome Header */}
          <View className="mb-6">
            <ThemedText variant="heading" className="text-2xl font-bold mb-1">
              Analytics Report
            </ThemedText>
            <ThemedText variant="muted" className="text-base">
              {format(reportData.startDate, 'MMM dd, yyyy')} - {format(reportData.endDate, 'MMM dd, yyyy')}
            </ThemedText>
          </View>

          {/* Period Selector */}
          <Card className="mb-6 p-4">
            <View className="flex-row justify-between items-center">
              {(['today', 'week', 'month', 'quarter', 'year'] as ReportPeriod[]).map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  className={cn(
                    "px-4 py-2 rounded-full mx-1",
                    period === p ? "bg-brand dark:bg-dark-brand" : "bg-surface-soft dark:bg-dark-surface-soft"
                  )}
                >
                  <ThemedText
                    variant={period === p ? "inverse" : "muted"}
                    size="sm"
                    className="font-semibold"
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Key Metrics - Glass Cards like Dashboard */}
          <View className="flex-row flex-wrap justify-between gap-3 mb-6">
            {/* Revenue */}
            <Card className="flex-1 min-w-[48%] p-4 bg-white/70 dark:bg-dark-surface/70 backdrop-blur-sm border border-border/50 dark:border-dark-border/50">
              <View className="flex-row items-center justify-between">
                <View>
                  <ThemedText variant="muted" size="sm">Total Revenue</ThemedText>
                  <ThemedText variant="heading" size="lg" className="mt-1">
                    {formatCurrency(reportData.totalRevenue)}
                  </ThemedText>
                  <View className="flex-row items-center mt-1">
                    <Ionicons 
                      name={getTrendIcon(reportData.comparison.revenueChange)} 
                      size={16} 
                      color={reportData.comparison.revenueChange >= 0 ? '#22c55e' : '#ef4444'} 
                    />
                    <ThemedText 
                      variant={reportData.comparison.revenueChange >= 0 ? "success" : "error"} 
                      size="sm"
                      className="ml-1"
                    >
                      {formatCurrency(Math.abs(reportData.comparison.revenueChange))}
                    </ThemedText>
                  </View>
                </View>
                <View className="w-12 h-12 rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center">
                  <Ionicons name="cash-outline" size={24} color="#0ea5e9" />
                </View>
              </View>
            </Card>

            {/* Profit */}
            <Card className="flex-1 min-w-[48%] p-4 bg-white/70 dark:bg-dark-surface/70 backdrop-blur-sm border border-border/50 dark:border-dark-border/50">
              <View className="flex-row items-center justify-between">
                <View>
                  <ThemedText variant="muted" size="sm">Net Profit</ThemedText>
                  <ThemedText variant="heading" size="lg" className="mt-1">
                    {formatCurrency(reportData.totalProfit)}
                  </ThemedText>
                  <View className="flex-row items-center mt-1">
                    <Ionicons 
                      name={getTrendIcon(reportData.comparison.profitChange)} 
                      size={16} 
                      color={reportData.comparison.profitChange >= 0 ? '#22c55e' : '#ef4444'} 
                    />
                    <ThemedText 
                      variant={reportData.comparison.profitChange >= 0 ? "success" : "error"} 
                      size="sm"
                      className="ml-1"
                    >
                      {formatCurrency(Math.abs(reportData.comparison.profitChange))}
                    </ThemedText>
                  </View>
                </View>
                <View className="w-12 h-12 rounded-full bg-success/10 dark:bg-success/20 flex items-center justify-center">
                  <Ionicons name="trending-up-outline" size={24} color="#22c55e" />
                </View>
              </View>
            </Card>

            {/* Sales Count */}
            <Card className="flex-1 min-w-[48%] p-4 bg-white/70 dark:bg-dark-surface/70 backdrop-blur-sm border border-border/50 dark:border-dark-border/50 mt-3">
              <View className="flex-row items-center justify-between">
                <View>
                  <ThemedText variant="muted" size="sm">Units Sold</ThemedText>
                  <ThemedText variant="heading" size="lg" className="mt-1">
                    {reportData.totalSales}
                  </ThemedText>
                  <ThemedText variant="muted" size="sm" className="mt-1">
                    {reportData.averageSale > 0 ? `Avg: ${formatCurrency(reportData.averageSale)}` : 'No sales'}
                  </ThemedText>
                </View>
                <View className="w-12 h-12 rounded-full bg-warning/10 dark:bg-warning/20 flex items-center justify-center">
                  <Ionicons name="cart-outline" size={24} color="#f59e0b" />
                </View>
              </View>
            </Card>

            {/* Profit Margin */}
            <Card className="flex-1 min-w-[48%] p-4 bg-white/70 dark:bg-dark-surface/70 backdrop-blur-sm border border-border/50 dark:border-dark-border/50 mt-3">
              <View className="flex-row items-center justify-between">
                <View>
                  <ThemedText variant="muted" size="sm">Profit Margin</ThemedText>
                  <ThemedText variant="heading" size="lg" className="mt-1">
                    {reportData.profitMargin.toFixed(1)}%
                  </ThemedText>
                  <ThemedText variant="muted" size="sm" className="mt-1">
                    Efficiency
                  </ThemedText>
                </View>
                <View className="w-12 h-12 rounded-full bg-info/10 dark:bg-info/20 flex items-center justify-center">
                  <Ionicons name="analytics-outline" size={24} color="#8b5cf6" />
                </View>
              </View>
            </Card>
          </View>

          {/* Chart Section */}
          {reportData.salesByDay.length > 0 && (
            <ChartCard title="Performance Overview" subtitle="Track your business growth">
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row gap-2">
                    {(['revenue', 'profit', 'sales'] as ChartType[]).map(type => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setChartType(type)}
                        className={cn(
                          "px-3 py-1 rounded-full",
                          chartType === type 
                            ? "bg-brand dark:bg-dark-brand" 
                            : "bg-surface-soft dark:bg-dark-surface-soft border border-border dark:border-dark-border"
                        )}
                      >
                        <ThemedText 
                          variant={chartType === type ? "inverse" : "muted"}
                          size="sm"
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <BarChart
                  data={getChartData()}
                  barWidth={chartWidth / reportData.salesByDay.length - 8}
                  spacing={4}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: theme.muted, fontSize: 10 }}
                  noOfSections={4}
                  maxValue={Math.max(...getChartData().map(d => d.value)) * 1.2}
                  isAnimated
                  animationDuration={800}
                />
              </View>
            </ChartCard>
          )}

          {/* Top Products */}
          {reportData.topProducts.length > 0 && (
            <ChartCard title="Top Performing Products" subtitle="Your revenue drivers">
              <View className="space-y-3">
                {reportData.topProducts.map((item, index) => (
                  <View key={item.product.id} className="flex-row justify-between items-center py-2">
                    <View className="flex-row items-center flex-1">
                      <View className="w-6 h-6 rounded-full bg-brand/10 items-center justify-center mr-3">
                        <ThemedText variant="brand" size="sm">
                          {index + 1}
                        </ThemedText>
                      </View>
                      <View className="flex-1">
                        <ThemedText variant="subheading" size="base" numberOfLines={1}>
                          {item.product.name}
                        </ThemedText>
                        <ThemedText variant="muted" size="sm">
                          {item.quantity} units • {formatCurrency(item.revenue)}
                        </ThemedText>
                      </View>
                    </View>
                    <Badge variant="success" size="sm">
                      {formatCurrency(item.profit)}
                    </Badge>
                  </View>
                ))}
              </View>
            </ChartCard>
          )}

          {/* Stock Alerts */}
          {reportData.stockAlerts.length > 0 && (
            <ChartCard 
              title="Stock Alerts" 
              subtitle="Products needing attention"
              action={<Badge variant="warning">{reportData.stockAlerts.length}</Badge>}
            >
              <View className="space-y-3">
                {reportData.stockAlerts.map((alert) => (
                  <TouchableOpacity 
                    key={alert.product.id}
                    onPress={() => router.push(`/edit-product/${alert.product.id}`)}
                    className="flex-row justify-between items-center py-2"
                  >
                    <View className="flex-1">
                      <ThemedText variant="subheading" size="base">
                        {alert.product.name}
                      </ThemedText>
                      <ThemedText variant="muted" size="sm">
                        Only {alert.currentStock} units left • Threshold: {alert.threshold}
                      </ThemedText>
                    </View>
                    <Badge variant="warning" size="sm">
                      Low Stock
                    </Badge>
                  </TouchableOpacity>
                ))}
              </View>
            </ChartCard>
          )}

          {/* Quick Actions */}
          <View className="mt-6 mb-8">
            <View className="flex-row items-center justify-center mb-4">
              <View className="px-5 py-2 rounded-2xl bg-white/10 dark:bg-dark-surface/40 border border-white/20 dark:border-dark-border/30 shadow-lg shadow-brand/20 backdrop-blur-md">
                <ThemedText variant="brand" size="lg" className="font-extrabold text-center">
                  ⚡ Quick Actions ⚡
                </ThemedText>
              </View>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {[
                { title: "Add Stock", icon: "📥", color: "brand", onPress: () => router.push('/(tabs)/stock/purchase') },
                { title: "Sell", icon: "💸", color: "success", onPress: () => router.push('/(tabs)/sales') },
                { title: "Products", icon: "📦", color: "warning", onPress: () => router.push('/(tabs)/products') },
                { title: "Dashboard", icon: "📊", color: "info", onPress: () => router.push('/(tabs)') },
              ].map((action, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={action.onPress}
                  className={cn(
                    "w-[48%] mb-3 rounded-2xl py-5 flex items-center justify-center border-2",
                    "bg-surface dark:bg-dark-surface backdrop-blur-md",
                    action.color === "brand" ? "border-brand/40" :
                    action.color === "success" ? "border-success/40" :
                    action.color === "warning" ? "border-warning/40" :
                    "border-info/40"
                  )}
                  activeOpacity={0.8}
                >
                  {/* <Text className="text-2xl mb-2">{action.icon}</Text> */}
                  <ThemedText variant="brand" size="sm" className="text-center">
                    {action.icon}
                  </ThemedText>
                  <ThemedText variant="subheading" size="sm" className="text-center">
                    {action.title}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Helper function for conditional classes
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}