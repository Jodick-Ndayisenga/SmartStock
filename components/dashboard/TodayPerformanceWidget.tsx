// components/dashboard/TodayPerformanceWidget.tsx
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ui/ThemedText";
import { useAuth } from "@/context/AuthContext";
import database from "@/database";
import Transaction from "@/database/models/Transaction";
import { calculateTrend, formatCurrency } from "@/utils/dashboardUtils";
import { Ionicons } from "@expo/vector-icons";
import { Q } from "@nozbe/watermelondb";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { TouchableOpacity, View, Alert } from "react-native";
import { BaseWidget } from "./BaseWidget";
import { Product } from "@/database/models/Product";
import { useColorScheme } from 'nativewind';

interface TodayData {
  sales: number;
  yesterdaySales: number;
  transactionCount: number;
  averageValue: number;
  topCategory: string;
  profitMargin: number;
}

// Custom loading component with theme support
const LoadingComponent = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <View className="items-center justify-center py-8">
      <View className="flex-row items-center">
        <View className={`w-12 h-12 rounded-full ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'} mr-2`} />
        <View className={`w-12 h-12 rounded-full ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'} mr-2`} />
        <View className={`w-12 h-12 rounded-full ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'}`} />
      </View>
      <ThemedText variant="muted" size="sm" className="mt-4">
        Loading today's performance...
      </ThemedText>
    </View>
  );
};

// Custom error component with theme support
const ErrorComponent = (error: Error, retry: () => void) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <View className="items-center justify-center py-8">
      <View className={`w-16 h-16 rounded-full ${isDark ? 'bg-dark-error/10' : 'bg-error/10'} items-center justify-center mb-3`}>
        <Ionicons name="alert-circle" size={32} color="#ef4444" />
      </View>
      <ThemedText variant="error" size="sm" className="text-center mb-2">
        {error.message.includes("2030") || error.message.includes("future")
          ? "Your device date appears to be incorrect"
          : "Failed to load today's data"}
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
};

// Custom empty state component with theme support
const EmptyComponent = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  
  return (
    <View className="items-center justify-center py-8">
      <View className={`w-16 h-16 rounded-full ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'} items-center justify-center mb-3`}>
        <Ionicons name="cart-outline" size={32} color="#64748b" />
      </View>
      <ThemedText variant="muted" size="sm" className="text-center mb-2">
        No sales recorded today
      </ThemedText>
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/sales')}
        className="mt-2 px-4 py-2 bg-brand rounded-lg flex-row items-center"
      >
        <Ionicons name="add-circle" size={16} color="#fff" />
        <ThemedText className="text-white ml-2">Record Sale</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

export function TodayPerformanceWidget({ className }: { className?: string }) {
  const { currentShop } = useAuth();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [systemTimeWarning, setSystemTimeWarning] = useState(false);

  // Check if system time is reasonable
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    if (currentYear > 2025 || currentYear < 2024) {
      setSystemTimeWarning(true);
      console.warn(`Warning: System date (${new Date().toISOString()}) appears incorrect`);
    }
  }, []);

  const fetchTodayData = async (): Promise<TodayData> => {
    if (!currentShop) throw new Error("No shop selected");

    // Check for unreasonable dates
    const currentYear = new Date().getFullYear();
    if (currentYear > 2025) {
      throw new Error("Device date appears to be set to the future. Please check your system date settings.");
    }

    // FIXED: Get current date with timezone handling
    const now = new Date();
    
    // Create UTC dates to avoid timezone issues
    const startOfDay = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ));
    
    const startOfYesterday = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 1,
      0, 0, 0, 0
    ));
    
    const endOfYesterday = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 1,
      23, 59, 59, 999
    ));

    console.log("Date Debug:", {
      now: now.toISOString(),
      nowUTC: now.toUTCString(),
      startOfDay: startOfDay.toISOString(),
      startOfDayTimestamp: startOfDay.getTime(),
      startOfYesterday: startOfYesterday.toISOString(),
      startOfYesterdayTimestamp: startOfYesterday.getTime(),
      endOfYesterday: endOfYesterday.toISOString(),
      endOfYesterdayTimestamp: endOfYesterday.getTime(),
    });

    const [todayTransactions, yesterdayTransactions, products] = await Promise.all([
      database
        .get<Transaction>("transactions")
        .query(
          Q.where("shop_id", currentShop.id),
          Q.where("transaction_date", Q.gte(startOfDay.getTime())),
        )
        .fetch(),
      database
        .get<Transaction>("transactions")
        .query(
          Q.where("shop_id", currentShop.id),
          Q.where("transaction_date", Q.gte(startOfYesterday.getTime())),
          Q.where("transaction_date", Q.lte(endOfYesterday.getTime())),
        )
        .fetch(),
      database.get<Product>("products")
        .query(Q.where("shop_id", currentShop.id))
        .fetch(),
    ]);

    console.log("Transaction counts:", {
      today: todayTransactions.length,
      yesterday: yesterdayTransactions.length,
    });

    const todaySales = todayTransactions.reduce(
      (sum, t) => sum + t.totalAmount,
      0,
    );
    const yesterdaySales = yesterdayTransactions.reduce(
      (sum, t) => sum + t.totalAmount,
      0,
    );

    // Get top selling category from today's transactions
    // You'll need to implement this based on your actual data structure
    const topCategory = "General";

    // Calculate profit margin
    const totalCost = products.reduce((sum, p) => sum + ((p.stockQuantity || 0) * p.costPricePerBase), 0);
    const totalRevenue = todayTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    return {
      sales: todaySales,
      yesterdaySales,
      transactionCount: todayTransactions.length,
      averageValue:
        todayTransactions.length > 0
          ? todaySales / todayTransactions.length
          : 0,
      topCategory,
      profitMargin,
    };
  };

  const trend = (data: TodayData) => {
    const diff = calculateTrend(data.sales, data.yesterdaySales);
    if (diff > 5) {
      return {
        icon: "trending-up",
        color: "#22c55e",
        bgColor: isDark ? "bg-success/20" : "bg-success/10",
        text: `+${diff.toFixed(1)}% vs yesterday`,
      };
    } else if (diff > 0) {
      return {
        icon: "trending-up",
        color: "#22c55e",
        bgColor: isDark ? "bg-success/20" : "bg-success/10",
        text: `+${diff.toFixed(1)}%`,
      };
    } else if (diff < -5) {
      return {
        icon: "trending-down",
        color: "#ef4444",
        bgColor: isDark ? "bg-error/20" : "bg-error/10",
        text: `${diff.toFixed(1)}% vs yesterday`,
      };
    } else if (diff < 0) {
      return {
        icon: "trending-down",
        color: "#ef4444",
        bgColor: isDark ? "bg-error/20" : "bg-error/10",
        text: `${diff.toFixed(1)}%`,
      };
    }
    return {
      icon: "remove",
      color: "#64748b",
      bgColor: isDark ? "bg-dark-surface-soft" : "bg-surface-soft",
      text: "Same as yesterday",
    };
  };

  return (
    <BaseWidget<TodayData>
      title="Today's Performance"
      fetchData={fetchTodayData}
      refreshInterval={300000} // 5 minutes
      loadingComponent={<LoadingComponent />}
      errorComponent={ErrorComponent}
      emptyComponent={<EmptyComponent />}
      action={{
        label: "View Details",
        icon: "arrow-forward",
        onPress: () => router.push("/sales"),
      }}
      className={className}
    >
      {(data) => {
        const trendData = trend(data);
        const hasSales = data.sales > 0;

        return (
          <LinearGradient
            colors={isDark 
              ? ['#1e293b', '#0f172a'] 
              : ['#ffffff', '#f8fafc']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-xl overflow-hidden p-3"
          >
            {/* System Time Warning - Show if date is off */}
            {systemTimeWarning && (
              <View className="mb-3 p-2 bg-warning/20 rounded-lg">
                <View className="flex-row items-center">
                  <Ionicons name="warning" size={16} color="#f59e0b" />
                  <ThemedText variant="warning" size="xs" className="ml-1 flex-1">
                    Device date appears incorrect ({new Date().getFullYear()})
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Trend Badge */}
            <View className="flex-row justify-between items-center mb-4">
              <View className={`px-3 py-1 rounded-full ${trendData.bgColor} overflow-hidden`}>
                <View className="flex-row items-center">
                  <Ionicons
                    name={trendData.icon as any}
                    size={14}
                    color={trendData.color}
                  />
                  <ThemedText
                    style={{ color: trendData.color }}
                    size="xs"
                    className="ml-1 font-medium"
                  >
                    {trendData.text}
                  </ThemedText>
                </View>
              </View>

              {!hasSales && (
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/sales')}
                  className="flex-row items-center"
                >
                  <Ionicons name="add-circle" size={18} color="#0ea5e9" />
                  <ThemedText variant="brand" size="xs" className="ml-1">
                    New Sale
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {/* Main Stats */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <ThemedText variant="muted" size="sm">
                  Total Sales
                </ThemedText>
                <View className="flex-row items-baseline flex-wrap">
                  <ThemedText
                    variant="heading"
                    size="3xl"
                    className={`font-bold ${hasSales ? 'text-brand' : 'text-muted'}`}
                  >
                    {formatCurrency(data.sales)}
                  </ThemedText>
                  {data.transactionCount > 0 && (
                    <ThemedText variant="muted" size="xs" className="ml-2">
                      / {data.transactionCount} {data.transactionCount === 1 ? 'sale' : 'sales'}
                    </ThemedText>
                  )}
                </View>
              </View>
              
              {/* Icon Circle */}
              <View className={`w-16 h-16 rounded-full ${
                hasSales 
                  ? 'bg-brand/20' 
                  : isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'
              } items-center justify-center`}>
                <Ionicons 
                  name={hasSales ? "cart" : "cart-outline"} 
                  size={32} 
                  color={hasSales ? "#0ea5e9" : "#64748b"} 
                />
              </View>
            </View>

            {/* Additional Metrics */}
            {hasSales && (
              <View className="flex-row justify-between mt-4 pt-4 border-t border-border dark:border-dark-border">
                <View className="flex-1">
                  <ThemedText variant="muted" size="xs">
                    Avg. Transaction
                  </ThemedText>
                  <ThemedText
                    variant="heading"
                    size="base"
                    className="font-semibold"
                  >
                    {formatCurrency(data.averageValue)}
                  </ThemedText>
                </View>
                
                <View className="flex-1 items-center">
                  <ThemedText variant="muted" size="xs">
                    Top Category
                  </ThemedText>
                  <ThemedText
                    variant="heading"
                    size="base"
                    className="font-semibold text-center"
                    numberOfLines={1}
                  >
                    {data.topCategory}
                  </ThemedText>
                </View>
                
                <View className="flex-1 items-end">
                  <ThemedText variant="muted" size="xs">
                    Profit Margin
                  </ThemedText>
                  <ThemedText
                    variant="heading"
                    size="base"
                    className={`font-semibold ${
                      data.profitMargin > 20 
                        ? 'text-success' 
                        : data.profitMargin > 10 
                        ? 'text-warning' 
                        : 'text-error'
                    }`}
                  >
                    {data.profitMargin.toFixed(1)}%
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Quick Actions for No Sales */}
            {!hasSales && data.transactionCount === 0 && (
              <View className="mt-4 pt-4 border-t border-border dark:border-dark-border">
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/sales')}
                  className="flex-row items-center justify-center py-2 bg-brand/10 rounded-lg"
                >
                  <Ionicons name="add-circle" size={20} color="#0ea5e9" />
                  <ThemedText variant="brand" size="sm" className="ml-2 font-medium">
                    Start Recording Sales
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        );
      }}
    </BaseWidget>
  );
}