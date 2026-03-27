// components/dashboard/CategoryDistributionWidget.tsx
import React from 'react';
import { View, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { Card, CardContent } from '@/components/ui/Card';
import { BaseWidget } from './BaseWidget';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { Product } from '@/database/models/Product';
import { PieChart } from 'react-native-gifted-charts';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { of } from '@nozbe/watermelondb/utils/rx';

const screenWidth = Dimensions.get('window').width;

interface CategoryData {
  categories: {
    name: string;
    value: number;
    color: string;
    productCount: number;
    stockValue: number;
    percentage: number;
  }[];
  total: number;
  totalProducts: number;
  totalValue: number;
  otherCount: number;
}

interface CategoryDistributionWidgetProps {
  className?: string;
  products?: Product[];
}

// Custom loading component
const LoadingComponent = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <View className="p-4">
      {/* Header skeleton */}
      <View className="flex-row justify-between items-center mb-6">
        <View className="h-6 w-40 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
        <View className="h-6 w-20 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
      </View>

      {/* Chart skeleton */}
      <View className="items-center mb-6">
        <View className="w-48 h-48 rounded-full bg-surface-soft dark:bg-dark-surface-soft animate-pulse" />
      </View>

      {/* Category items skeleton */}
      <View className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} className="flex-row items-center">
            <View className="w-4 h-4 rounded-full bg-surface-soft dark:bg-dark-surface-soft mr-3 animate-pulse" />
            <View className="flex-1">
              <View className="flex-row justify-between mb-1">
                <View className="h-4 w-24 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
                <View className="h-4 w-16 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
              </View>
              <View className="h-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full animate-pulse" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// Inner component with observable data
const CategoryDistributionWidgetInner = ({ 
  products = [],
  className 
}: CategoryDistributionWidgetProps) => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Calculate category distribution from products
  const calculateCategoryData = (): CategoryData => {
    // Only consider active products
    const activeProducts = products.filter(p => p.isActive === true);
    
    const categoryMap = new Map<string, { 
      value: number; 
      productCount: number;
      stockValue: number;
    }>();

    activeProducts.forEach(p => {
      const category = p.category || 'Uncategorized';
      const stockQty = p.stockQuantity || 0;
      const stockValue = stockQty * p.costPricePerBase;
      
      if (categoryMap.has(category)) {
        const existing = categoryMap.get(category)!;
        categoryMap.set(category, {
          value: existing.value + stockQty,
          productCount: existing.productCount + 1,
          stockValue: existing.stockValue + stockValue,
        });
      } else {
        categoryMap.set(category, {
          value: stockQty,
          productCount: 1,
          stockValue,
        });
      }
    });

    // Sort by value and take top 5, group rest as "Others"
    const sortedCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1].value - a[1].value);

    const topCategories = sortedCategories.slice(0, 5);
    const otherCategories = sortedCategories.slice(5);

    const otherTotal = otherCategories.reduce((sum, [_, data]) => sum + data.value, 0);
    const otherProductCount = otherCategories.reduce((sum, [_, data]) => sum + data.productCount, 0);
    const otherStockValue = otherCategories.reduce((sum, [_, data]) => sum + data.stockValue, 0);

    // Colors from your theme
    const colors = [
      isDark ? '#38bdf8' : '#0ea5e9', // brand
      isDark ? '#4ade80' : '#22c55e', // success
      isDark ? '#fbbf24' : '#f59e0b', // warning
      isDark ? '#f87171' : '#ef4444', // error
      isDark ? '#c084fc' : '#a855f7', // purple
    ];
    
    const categories = topCategories.map(([name, data], index) => ({
      name,
      value: data.value,
      color: colors[index % colors.length],
      productCount: data.productCount,
      stockValue: data.stockValue,
      percentage: 0, // Will calculate after total
    }));

    // Add "Others" category if there are more than 5 categories
    if (otherCategories.length > 0) {
      categories.push({
        name: 'Others',
        value: otherTotal,
        color: isDark ? '#64748b' : '#94a3b8',
        productCount: otherProductCount,
        stockValue: otherStockValue,
        percentage: 0,
      });
    }

    const total = categories.reduce((sum, cat) => sum + cat.value, 0);
    const totalProducts = activeProducts.length;
    const totalValue = activeProducts.reduce((sum, p) => {
      const stockQty = p.stockQuantity || 0;
      return sum + (stockQty * p.costPricePerBase);
    }, 0);

    // Calculate percentages
    categories.forEach(cat => {
      cat.percentage = total > 0 ? (cat.value / total) * 100 : 0;
    });

    return {
      categories,
      total,
      totalProducts,
      totalValue,
      otherCount: otherCategories.length,
    };
  };

  const data = calculateCategoryData();
  const hasProducts = data.totalProducts > 0;

  // Colors
  const colors = {
    brand: isDark ? '#38bdf8' : '#0ea5e9',
    surface: isDark ? '#0f172a' : '#ffffff',
    surfaceSoft: isDark ? '#1e293b' : '#f8fafc',
    text: isDark ? '#f1f5f9' : '#0f172a',
    muted: isDark ? '#94a3b8' : '#64748b',
  };

  // Prepare pie chart data
  const pieData = data.categories.map(cat => ({
    value: cat.value,
    color: cat.color,
    text: `${cat.percentage.toFixed(1)}%`,
    label: cat.name,
    shiftTextX: cat.name.length > 10 ? -15 : -10,
    shiftTextY: -5,
  }));

  if (!hasProducts) {
    return (
      <View className="p-8 items-center justify-center">
        <View className="w-24 h-24 rounded-full bg-surface-soft dark:bg-dark-surface-soft items-center justify-center mb-4">
          <Ionicons name="pricetags-outline" size={48} color={colors.muted} />
        </View>
        <ThemedText variant="muted" size="sm" className="text-center mb-2">
          No products in inventory
        </ThemedText>
        <ThemedText variant="muted" size="xs" className="text-center mb-4">
          Add products to see category distribution
        </ThemedText>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/add-product');
          }}
          className="px-4 py-2 bg-brand rounded-lg flex-row items-center"
        >
          <Ionicons name="add-circle" size={16} color="#fff" />
          <ThemedText className="text-white ml-2">Add Your First Product</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="p-4">
      {/* Stats Cards */}
      <View className="flex-row gap-3 mb-6">
        <Card variant="filled" className="flex-1">
          <CardContent className="p-3">
            <View className="flex-row items-center mb-1">
              <View className="w-6 h-6 rounded-full bg-brand/10 items-center justify-center mr-2">
                <Ionicons name="cube" size={12} color={colors.brand} />
              </View>
              <ThemedText variant="muted" size="xs">Products</ThemedText>
            </View>
            <ThemedText variant="heading" size="lg" className="font-bold text-brand ml-8">
              {data.totalProducts}
            </ThemedText>
          </CardContent>
        </Card>

        <Card variant="filled" className="flex-1">
          <CardContent className="p-3">
            <View className="flex-row items-center mb-1">
              <View className="w-6 h-6 rounded-full bg-success/10 items-center justify-center mr-2">
                <Ionicons name="layers" size={12} color="#22c55e" />
              </View>
              <ThemedText variant="muted" size="xs">Categories</ThemedText>
            </View>
            <ThemedText variant="heading" size="lg" className="font-bold text-success ml-8">
              {data.categories.length}
            </ThemedText>
            {data.otherCount > 0 && (
              <ThemedText variant="muted" size="xs" className="ml-8">
                +{data.otherCount} more
              </ThemedText>
            )}
          </CardContent>
        </Card>
      </View>

      {/* Pie Chart */}
      {pieData.length > 0 ? (
        <Card variant="elevated" className="mb-6 overflow-hidden">
          <CardContent className="p-4 items-center">
            <View style={{ 
              backgroundColor: colors.surface,
              borderRadius: 200,
              padding: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.5 : 0.1,
              shadowRadius: 12,
              elevation: 8,
            }}>
              <PieChart
                data={pieData}
                donut
                radius={100}
                innerRadius={40}
                innerCircleColor={colors.surface}
                innerCircleBorderWidth={2}
                innerCircleBorderColor={isDark ? '#334155' : '#e2e8f0'}
                showText
                textColor={colors.text}
                textSize={12}
                //fontFamily="Inter-Medium"
                showTextBackground
                textBackgroundColor={isDark ? '#1e293b' : '#ffffff'}
                textBackgroundRadius={12}
                centerLabelComponent={() => (
                  <View className="items-center justify-center">
                    <ThemedText variant="heading" size="sm" className="font-bold text-brand">
                      {data.total}
                    </ThemedText>
                    <ThemedText variant="muted" size="xs">
                      units
                    </ThemedText>
                  </View>
                )}
              />
            </View>

            {/* Legend */}
            <View className="flex-row flex-wrap justify-center mt-4 gap-2">
              {data.categories.map((cat, index) => (
                <View key={index} className="flex-row items-center mx-1">
                  <View 
                    style={{ 
                      width: 10, 
                      height: 10, 
                      borderRadius: 5, 
                      backgroundColor: cat.color,
                      marginRight: 4,
                    }} 
                  />
                  <ThemedText size="xs" className="font-medium">
                    {cat.name}
                  </ThemedText>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      ) : null}

      {/* Category List */}
      <View className="space-y-3">
        {data.categories.map((category, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (category.name === 'Others') {
                router.push('/products');
              } else {
                router.push(`/products?category=${encodeURIComponent(category.name)}`);
              }
            }}
            className="active:opacity-70"
          >
            <View className="flex-row items-center">
              <View 
                className="w-4 h-4 rounded-full mr-3"
                style={{ backgroundColor: category.color }}
              />
              <View className="flex-1">
                <View className="flex-row justify-between items-center mb-1">
                  <View className="flex-row items-center flex-1">
                    <ThemedText variant="default" size="sm" className="font-medium" numberOfLines={1}>
                      {category.name}
                    </ThemedText>
                    {category.name === 'Others' && (
                      <View className="ml-2 px-1.5 py-0.5 bg-surface-soft dark:bg-dark-surface-soft rounded">
                        <ThemedText variant="muted" size="xs">{data.otherCount}</ThemedText>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center">
                    <ThemedText variant="default" size="sm" className="font-semibold mr-2">
                      {category.value} units
                    </ThemedText>
                    <Ionicons name="chevron-forward" size={14} color={colors.muted} />
                  </View>
                </View>
                
                {/* Progress bar */}
                <View className="h-1.5 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden">
                  <View 
                    className="h-full rounded-full"
                    style={{ 
                      width: `${category.percentage}%`,
                      backgroundColor: category.color 
                    }}
                  />
                </View>

                {/* Additional info */}
                <View className="flex-row justify-between mt-1">
                  <View className="flex-row items-center">
                    <Ionicons name="cube-outline" size={10} color={colors.muted} />
                    <ThemedText variant="muted" size="xs" className="ml-1">
                      {category.productCount} product{category.productCount !== 1 ? 's' : ''}
                    </ThemedText>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="cash-outline" size={10} color={colors.muted} />
                    <ThemedText variant="muted" size="xs" className="ml-1">
                      {formatCurrency(category.stockValue)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Footer */}
      <View className="mt-4 pt-3 border-t border-border dark:border-dark-border">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Ionicons name="pricetag" size={14} color={colors.brand} />
            <ThemedText variant="muted" size="xs" className="ml-1">
              Total Stock Value
            </ThemedText>
          </View>
          <ThemedText variant="heading" size="base" className="font-bold text-brand">
            {formatCurrency(data.totalValue)}
          </ThemedText>
        </View>
      </View>

      
    </View>
  );
};

// Helper function for currency formatting
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Enhance with observables - only active products
const enhance = withObservables(
  ['currentShop'],
  ({ currentShop }: { currentShop: any }) => {
    if (!currentShop) {
      return {
        products: of([]), // or [],
      };
    }

    return {
      products: database
        .get<Product>('products')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('is_active', true) // Only active products
        )
        .observe(),
    };
  }
);

const CategoryDistributionWidgetWithObservables = enhance(CategoryDistributionWidgetInner);

export function CategoryDistributionWidget({ className }: { className?: string }) {
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
      title="Category Distribution"
      fetchData={async () => ({ hasData: true })}
      refreshInterval={600000} // 10 minutes
      loadingComponent={<LoadingComponent />}
      errorComponent={(error, retry) => (
        <View className="items-center justify-center py-8">
          <View className="w-16 h-16 rounded-full bg-error/10 items-center justify-center mb-3">
            <Ionicons name="grid-outline" size={32} color="#ef4444" />
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
        <CategoryDistributionWidgetWithObservables currentShop={currentShop} />
      )}
    </BaseWidget>
  );
}