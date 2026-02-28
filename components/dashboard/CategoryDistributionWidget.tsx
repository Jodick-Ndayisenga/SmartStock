// components/dashboard/CategoryDistributionWidget.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { BaseWidget } from './BaseWidget';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { Product } from '@/database/models/Product';
import { CategoryPieChart } from '@/components/charts/ThreePieChartsVariation';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

interface CategoryData {
  categories: {
    name: string;
    value: number;
    color: string;
    productCount: number;
    stockValue: number;
  }[];
  total: number;
  totalProducts: number;
}

export function CategoryDistributionWidget({ className }: { className?: string }) {
  const router = useRouter();
  const { currentShop } = useAuth();

  const fetchCategoryData = async (): Promise<CategoryData> => {
    if (!currentShop) throw new Error('No shop selected');

    const products = await database.get<Product>('products')
      .query(Q.where('shop_id', currentShop.id))
      .fetch();

    const categoryMap = new Map<string, { 
      value: number; 
      productCount: number;
      stockValue: number;
    }>();

    products.forEach(p => {
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

    // Sort by value and take top 5
    const sortedCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, 5);

    const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];
    
    const categories = sortedCategories.map(([name, data], index) => ({
      name,
      value: data.value,
      color: colors[index % colors.length],
      productCount: data.productCount,
      stockValue: data.stockValue,
    }));

    const total = categories.reduce((sum, cat) => sum + cat.value, 0);
    const totalProducts = products.length;

    return {
      categories,
      total,
      totalProducts,
    };
  };

  // Custom loading component
  const LoadingComponent = () => (
    <View className="h-48 items-center justify-center">
      <View className="flex-row flex-wrap justify-center">
        {[1, 2, 3, 4, 5].map((i) => (
          <View 
            key={i} 
            className="w-10 h-10 rounded-full bg-surface-soft dark:bg-dark-surface-soft mx-1"
          />
        ))}
      </View>
      <ThemedText variant="muted" size="sm" className="mt-4">
        Analyzing categories...
      </ThemedText>
    </View>
  );

  // Custom error component
  const ErrorComponent = (error: Error, retry: () => void) => (
    <View className="h-48 items-center justify-center">
      <View className="w-16 h-16 rounded-full bg-error/10 items-center justify-center mb-3">
        <Ionicons name="grid-outline" size={32} color="#ef4444" />
      </View>
      <ThemedText variant="error" size="sm" className="text-center mb-2">
        Failed to load categories
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

  return (
    <BaseWidget<CategoryData>
      title="Top Categories by Stock"
      fetchData={fetchCategoryData}
      refreshInterval={600000} // 10 minutes
      loadingComponent={<LoadingComponent />}
      errorComponent={ErrorComponent}
      emptyComponent={
        <View className="h-48 items-center justify-center">
          <Ionicons name="pricetags-outline" size={48} color="#64748b" />
          <ThemedText variant="muted" size="sm" className="text-center mt-2">
            No categories found
          </ThemedText>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/add-product');
            }}
            className="mt-3 px-4 py-2 bg-brand rounded-lg flex-row items-center"
          >
            <Ionicons name="add" size={16} color="#fff" />
            <ThemedText className="text-white ml-2">Add Products</ThemedText>
          </TouchableOpacity>
        </View>
      }
      action={{
        label: 'Manage Categories',
        icon: 'arrow-forward',
        onPress: () => router.push('/products/categories'),
      }}
      className={className}
    >
      {(data) => (
        <View>
          <CategoryPieChart
            categories={data.categories.map(cat => ({
              name: cat.name,
              value: cat.value,
              color: cat.color,
            }))}
            formatValue={(value) => value.toString()}
          />

          {/* Category List */}
          <View className="mt-4 space-y-3">
            {data.categories.map((category, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/products?category=${encodeURIComponent(category.name)}`);
                }}
                className="flex-row items-center justify-between p-2 rounded-lg active:bg-surface-soft dark:active:bg-dark-surface-soft"
              >
                <View className="flex-row items-center flex-1">
                  <View 
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: category.color }}
                  />
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <ThemedText variant="default" size="sm" className="font-medium flex-1">
                        {category.name}
                      </ThemedText>
                      <ThemedText variant="default" size="sm" className="font-semibold ml-2">
                        {category.value} units
                      </ThemedText>
                    </View>
                    
                    {/* Progress bar */}
                    <View className="mt-1 h-1.5 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden">
                      <View 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${(category.value / data.total) * 100}%`,
                          backgroundColor: category.color 
                        }}
                      />
                    </View>

                    {/* Additional info */}
                    <View className="flex-row justify-between mt-1">
                      <ThemedText variant="muted" size="xs">
                        {category.productCount} product{category.productCount !== 1 ? 's' : ''}
                      </ThemedText>
                      <ThemedText variant="muted" size="xs">
                        {((category.value / data.total) * 100).toFixed(1)}% of stock
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <Ionicons 
                  name="chevron-forward" 
                  size={16} 
                  color="#64748b" 
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary */}
          <View className="mt-4 pt-3 border-t border-border dark:border-dark-border">
            <View className="flex-row justify-between">
              <View>
                <ThemedText variant="muted" size="xs">Total Products</ThemedText>
                <ThemedText variant="heading" size="base" className="font-bold">
                  {data.totalProducts}
                </ThemedText>
              </View>
              <View className="items-end">
                <ThemedText variant="muted" size="xs">Categories Shown</ThemedText>
                <ThemedText variant="heading" size="base" className="font-bold">
                  {data.categories.length} of {data.categories.length}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      )}
    </BaseWidget>
  );
}