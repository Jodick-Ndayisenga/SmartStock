// components/dashboard/StockHealthWidget.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { Product } from '@/database/models/Product';
import { StockPieChart } from '@/components/charts/ThreePieChartsVariation';
import { BaseWidget } from './BaseWidget';
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { of } from '@nozbe/watermelondb/utils/rx';

interface StockData {
  total: number;
  healthy: number;
  lowStock: number;
  outOfStock: number;
  lowStockThreshold: number;
}

interface StockHealthWidgetProps {
  className?: string;
  products?: Product[];
}

// Custom loading component
const LoadingComponent = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <View className="p-4">
      {/* Chart skeleton */}
      <View className="items-center mb-6">
        <View className="w-48 h-48 rounded-full bg-surface-soft dark:bg-dark-surface-soft animate-pulse" />
      </View>

      {/* Legend skeleton */}
      <View className="flex-row justify-center gap-4">
        {[1, 2, 3].map((i) => (
          <View key={i} className="items-center">
            <View className="w-3 h-3 rounded-full bg-surface-soft dark:bg-dark-surface-soft mb-1 animate-pulse" />
            <View className="h-3 w-12 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
          </View>
        ))}
      </View>
    </View>
  );
};

// Inner component with observable data
const StockHealthWidgetInner = ({ 
  products = [],
  className 
}: StockHealthWidgetProps) => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const lowStockThreshold = 10;

  // Calculate stock metrics from active products only
  const calculateStockData = (): StockData => {
    // Filter to only active products
    const activeProducts = products.filter(p => p.isActive === true);
    
    const healthy = activeProducts.filter(p => (p.stockQuantity || 0) > lowStockThreshold).length;
    const lowStock = activeProducts.filter(p => {
      const stock = p.stockQuantity || 0;
      return stock > 0 && stock <= lowStockThreshold;
    }).length;
    const outOfStock = activeProducts.filter(p => !p.stockQuantity || p.stockQuantity === 0).length;

    return {
      total: activeProducts.length,
      healthy,
      lowStock,
      outOfStock,
      lowStockThreshold,
    };
  };

  const data = calculateStockData();
  const hasProducts = data.total > 0;

  // Colors from your theme
  const colors = {
    healthy: isDark ? '#4ade80' : '#22c55e',
    lowStock: isDark ? '#fbbf24' : '#f59e0b',
    outOfStock: isDark ? '#f87171' : '#ef4444',
    healthySoft: isDark ? '#1a4532' : '#dcfce7',
    lowStockSoft: isDark ? '#453209' : '#fef3c7',
    outOfStockSoft: isDark ? '#4c1d1d' : '#fee2e2',
  };

  if (!hasProducts) {
    return (
      <View className="p-8 items-center justify-center">
        <View className="w-24 h-24 rounded-full bg-surface-soft dark:bg-dark-surface-soft items-center justify-center mb-4">
          <Ionicons name="cube-outline" size={48} color={isDark ? '#475569' : '#94a3b8'} />
        </View>
        <ThemedText variant="muted" size="sm" className="text-center mb-2">
          No active products in inventory
        </ThemedText>
        <TouchableOpacity
          onPress={() => router.push('/add-product')}
          className="mt-2 px-4 py-2 bg-brand rounded-lg flex-row items-center"
        >
          <Ionicons name="add-circle" size={16} color="#fff" />
          <ThemedText className="text-white ml-2">Add Your First Product</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="p-4">
      {/* Stock Health Chart */}
      <StockPieChart
        healthy={data.healthy}
        lowStock={data.lowStock}
        outOfStock={data.outOfStock}
        formatValue={(value:number) => value.toString()}
      />

      {/* Legend with counts */}
      <View className="flex-row justify-around mt-4">
        <View className="items-center">
          <View className="flex-row items-center mb-1">
            <View className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: colors.healthy }} />
            <ThemedText variant="muted" size="xs">Healthy</ThemedText>
          </View>
          <ThemedText variant="heading" size="base" className="font-bold text-success">
            {data.healthy}
          </ThemedText>
        </View>

        <View className="items-center">
          <View className="flex-row items-center mb-1">
            <View className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: colors.lowStock }} />
            <ThemedText variant="muted" size="xs">Low Stock</ThemedText>
          </View>
          <ThemedText variant="heading" size="base" className="font-bold text-warning">
            {data.lowStock}
          </ThemedText>
        </View>

        <View className="items-center">
          <View className="flex-row items-center mb-1">
            <View className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: colors.outOfStock }} />
            <ThemedText variant="muted" size="xs">Out of Stock</ThemedText>
          </View>
          <ThemedText variant="heading" size="base" className="font-bold text-error">
            {data.outOfStock}
          </ThemedText>
        </View>
      </View>

      {/* Summary text */}
      <View className="mt-4 pt-4 border-t border-border dark:border-dark-border">
        <View className="flex-row justify-between items-center">
          <View>
            <ThemedText variant="muted" size="xs">Active Products</ThemedText>
            <ThemedText variant="heading" size="lg" className="font-bold text-brand">
              {data.total}
            </ThemedText>
          </View>
          
          {/* Health Score */}
          <View className="items-end">
            <ThemedText variant="muted" size="xs">Health Score</ThemedText>
            <View className="flex-row items-center">
              <ThemedText variant="heading" size="lg" className="font-bold text-brand">
                {((data.healthy / data.total) * 100).toFixed(0)}%
              </ThemedText>
              <Ionicons 
                name={
                  (data.healthy / data.total) > 0.7 ? 'happy-outline' :
                  (data.healthy / data.total) > 0.4 ? 'remove-circle' : 'sad-outline'
                } 
                size={20} 
                color={
                  (data.healthy / data.total) > 0.7 ? colors.healthy :
                  (data.healthy / data.total) > 0.4 ? colors.lowStock : colors.outOfStock
                } 
                style={{ marginLeft: 4 }}
              />
            </View>
          </View>
        </View>

        {/* Show inactive products count if any */}
        {products.length > data.total && (
          <View className="mt-2">
            <ThemedText variant="muted" size="xs">
              ({products.length - data.total} inactive product{products.length - data.total !== 1 ? 's' : ''} excluded)
            </ThemedText>
          </View>
        )}

        {/* Alert if low stock or out of stock */}
        {(data.lowStock > 0 || data.outOfStock > 0) && (
          <View className={`mt-3 p-2 rounded-lg flex-row items-center ${
            data.outOfStock > 0 ? 'bg-error/10' : 'bg-warning/10'
          }`}>
            <Ionicons 
              name={data.outOfStock > 0 ? 'alert-circle' : 'alert'} 
              size={16} 
              color={data.outOfStock > 0 ? colors.outOfStock : colors.lowStock} 
            />
            <ThemedText 
              variant={data.outOfStock > 0 ? 'error' : 'warning'} 
              size="xs" 
              className="ml-2 flex-1"
            >
              {data.outOfStock > 0 
                ? `${data.outOfStock} active product${data.outOfStock > 1 ? 's are' : ' is'} out of stock` 
                : `${data.lowStock} active product${data.lowStock > 1 ? 's are' : ' is'} running low`}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
};

// Enhance with observables - only observe active products
const enhance = withObservables(
  ['currentShop'],
  ({ currentShop }: { currentShop: any }) => {
    if (!currentShop) {
      return {
        products: of([]),// [],
      };
    }

    return {
      products: database
        .get<Product>('products')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('is_active', true) // Only fetch active products
        )
        .observe(),
    };
  }
);

const StockHealthWidgetWithObservables = enhance(StockHealthWidgetInner);

export function StockHealthWidget({ className }: { className?: string }) {
  const { currentShop } = useAuth();
  const router = useRouter();

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
      title="Stock Health"
      fetchData={async () => ({ hasData: true })}
      refreshInterval={600000} // 10 minutes
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
      action={{
        label: 'Manage Stock',
        icon: 'arrow-forward',
        onPress: () => router.push('/products'),
      }}
      className={className}
    >
      {() => (
        <StockHealthWidgetWithObservables currentShop={currentShop} />
      )}
    </BaseWidget>
  );
}