// components/dashboard/TodayPerformanceWidget.tsx
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ui/ThemedText";
import { useAuth } from "@/context/AuthContext";
import database from "@/database";
import Transaction from "@/database/models/Transaction";
import { calculateTrend, formatCurrency } from "@/utils/dashboardUtils";
import { Ionicons } from "@expo/vector-icons";
import { Q } from "@nozbe/watermelondb";
import { withObservables } from '@nozbe/watermelondb/react';
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
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
  totalProducts: number;
}

interface TodayPerformanceWidgetProps {
  className?: string;
  // Observable props
  todayTransactions?: Transaction[];
  yesterdayTransactions?: Transaction[];
  products?: Product[];
}

// Custom loading component with theme support
const LoadingComponent = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <View className="items-center justify-center py-8">
      <View className="flex-row items-center">
        <View className={`w-12 h-12 rounded-full ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'} mr-2 animate-pulse`} />
        <View className={`w-12 h-12 rounded-full ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'} mr-2 animate-pulse`} />
        <View className={`w-12 h-12 rounded-full ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'} animate-pulse`} />
      </View>
      <ThemedText variant="muted" size="sm" className="mt-4">
        Loading your dashboard...
      </ThemedText>
    </View>
  );
};

// Custom error component with theme support
const ErrorComponent = ({ error, retry, isDark }: { error: Error; retry: () => void; isDark: boolean }) => {
  return (
    <View className="items-center justify-center py-8">
      <View className={`w-16 h-16 rounded-full ${isDark ? 'bg-dark-error/10' : 'bg-error/10'} items-center justify-center mb-3`}>
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
  );
};

// Inner component that receives observable data
const TodayPerformanceWidgetInner = ({ 
  className,
  todayTransactions = [],
  yesterdayTransactions = [],
  products = []
}: TodayPerformanceWidgetProps) => {
  const { currentShop } = useAuth();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [systemTimeWarning, setSystemTimeWarning] = useState(false);

  // Check for unreasonable dates
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    if (currentYear > new Date().getFullYear() + 5 || currentYear < 2020) {
      setSystemTimeWarning(true);
      console.warn(`Warning: System date (${new Date().toISOString()}) appears incorrect`);
    } else {
      setSystemTimeWarning(false);
    }
  }, []);

  // Calculate metrics from observable data
  const calculateMetrics = (): TodayData => {
    const todaySales = todayTransactions.reduce(
      (sum, t) => sum + t.totalAmount,
      0,
    );
    const yesterdaySales = yesterdayTransactions.reduce(
      (sum, t) => sum + t.totalAmount,
      0,
    );

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
      topCategory: "General", // You can enhance this later
      profitMargin,
      totalProducts: products.length,
    };
  };

  const data = calculateMetrics();
  const hasSales = data.sales > 0;
  const hasProducts = data.totalProducts > 0;
  const isBrandNewAccount = data.totalProducts === 0 && data.transactionCount === 0;

  const trend = () => {
    // Don't show trend if no sales
    if (data.sales === 0 && data.yesterdaySales === 0) {
      return {
        icon: "remove",
        color: "#64748b",
        bgColor: isDark ? "bg-dark-surface-soft" : "bg-surface-soft",
        text: "No sales data",
      };
    }

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

  const trendData = trend();

  // If brand new account, show zeros but keep the same layout
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
      {/* System Time Warning */}
      {systemTimeWarning && (
        <View className="mb-3 p-2 bg-warning/20 rounded-lg">
          <View className="flex-row items-center">
            <Ionicons name="warning" size={16} color="#f59e0b" />
            <ThemedText variant="warning" size="xs" className="ml-1 flex-1">
              Your device date appears to be incorrect. Please check your system settings.
            </ThemedText>
          </View>
        </View>
      )}

      {/* Trend Badge - Always show, even if zero */}
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

        {/* Quick action for new sales - only if has products but no sales */}
        {hasProducts && !hasSales && (
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

      {/* Main Stats - Always show with proper formatting */}
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
          {/* Subtle hint for new accounts */}
          {isBrandNewAccount && (
            <ThemedText variant="muted" size="xs" className="mt-1">
              Add products to get started
            </ThemedText>
          )}
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

      {/* Additional Metrics - Show if has sales OR if has products (to show structure) */}
      {(hasSales || hasProducts) && (
        <View className="flex-row justify-between mt-4 pt-4 border-t border-border dark:border-dark-border">
          <View className="flex-1">
            <ThemedText variant="muted" size="xs">
              Avg. Transaction
            </ThemedText>
            <ThemedText
              variant="heading"
              size="base"
              className={`font-semibold ${!hasSales && 'text-muted'}`}
            >
              {hasSales ? formatCurrency(data.averageValue) : '---'}
            </ThemedText>
          </View>
          
          <View className="flex-1 items-center">
            <ThemedText variant="muted" size="xs">
              Products
            </ThemedText>
            <ThemedText
              variant="heading"
              size="base"
              className="font-semibold text-center"
            >
              {data.totalProducts}
            </ThemedText>
          </View>
          
          <View className="flex-1 items-end">
            <ThemedText variant="muted" size="xs">
              Margin
            </ThemedText>
            <ThemedText
              variant="heading"
              size="base"
              className={`font-semibold ${
                !hasSales 
                  ? 'text-muted'
                  : data.profitMargin > 20 
                  ? 'text-success' 
                  : data.profitMargin > 10 
                  ? 'text-warning' 
                  : 'text-error'
              }`}
            >
              {hasSales ? `${data.profitMargin.toFixed(1)}%` : '---'}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Subtle product count for new accounts */}
      {isBrandNewAccount && (
        <View className="mt-4 pt-3 border-t border-border dark:border-dark-border">
          <View className="flex-row items-center justify-center">
            <Ionicons name="cube-outline" size={16} color="#64748b" />
            <ThemedText variant="muted" size="xs" className="ml-1">
              Add your first products to start tracking sales
            </ThemedText>
          </View>
        </View>
      )}
    </LinearGradient>
  );
};

// Enhance with observables for real-time updates
const enhance = withObservables(
  ['currentShop'], 
  ({ currentShop }: { currentShop: any }) => {
    if (!currentShop) {
      return {
        todayTransactions: [],
        yesterdayTransactions: [],
        products: [],
      };
    }

    // Get current date with timezone handling
    const now = new Date();
    
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

    return {
      todayTransactions: database
        .get<Transaction>("transactions")
        .query(
          Q.where("shop_id", currentShop.id),
          Q.where("transaction_date", Q.gte(startOfDay.getTime())),
        )
        .observe(),
      yesterdayTransactions: database
        .get<Transaction>("transactions")
        .query(
          Q.where("shop_id", currentShop.id),
          Q.where("transaction_date", Q.gte(startOfYesterday.getTime())),
          Q.where("transaction_date", Q.lte(endOfYesterday.getTime())),
        )
        .observe(),
      products: database
        .get<Product>("products")
        .query(Q.where("shop_id", currentShop.id))
        .observe(),
    };
  }
);

const TodayPerformanceWidgetWithObservables = enhance(TodayPerformanceWidgetInner);

export function TodayPerformanceWidget({ className }: { className?: string }) {
  const { currentShop } = useAuth();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // This is a wrapper that uses BaseWidget for loading/error states
  // but delegates the actual rendering to the observable-enhanced inner component
  const fetchData = async (): Promise<{ hasData: boolean }> => {
    if (!currentShop) throw new Error("No shop selected");
    
    // We don't actually need to fetch anything here since the observables handle it
    // This just tells BaseWidget we have data
    return { hasData: true };
  };

  return (
    <BaseWidget<{ hasData: boolean }>
      title="Today's Performance"
      fetchData={fetchData}
      refreshInterval={300000} // 5 minutes (kept for compatibility)
      loadingComponent={<LoadingComponent />}
      errorComponent={(error, retry) => (
        <ErrorComponent error={error} retry={retry} isDark={isDark} />
      )}
      emptyComponent={null}
      action={{
        label: "View All",
        icon: "arrow-forward",
        onPress: () => router.push("/sales"),
      }}
      className={className}
    >
      {() => currentShop ? (
        <TodayPerformanceWidgetWithObservables currentShop={currentShop} />
      ) : (
        <View className="items-center justify-center py-8">
          <ThemedText variant="muted">No shop selected</ThemedText>
        </View>
      )}
    </BaseWidget>
  );
}