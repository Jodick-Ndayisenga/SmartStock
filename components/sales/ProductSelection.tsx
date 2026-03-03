// components/sales/ProductSelection.tsx
import React from 'react';
import { View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { EmptyState } from '@/components/ui/EmptyState';
import { StockStatusBadge } from '@/components/ui/StockStatusBadge';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Product } from '@/database/models/Product';
import { ViewMode } from '@/types/sales';

interface ProductSelectionProps {
  products: Product[];
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectProduct: (product: Product) => void;
  getProductStockStatus: (product: Product) => 'in-stock' | 'low-stock' | 'out-of-stock';
}

export default function ProductSelection({
  products,
  categories,
  selectedCategory,
  setSelectedCategory,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  onSelectProduct,
  getProductStockStatus,
}: ProductSelectionProps) {
  const router = useRouter();

  if (products.length === 0) {
    return (
      <Card variant="elevated" className="mb-4 bg-surface dark:bg-dark-surface">
        <CardContent className="p-2">
          <EmptyState
            icon={searchQuery ? "search-outline" : "cube-outline"}
            title={searchQuery ? "No Results Found" : "No Products Yet"}
            description={searchQuery 
              ? `No products matching "${searchQuery}"`
              : 'Add products to start selling in your shop'}
            action={
              searchQuery
                ? [
                    {
                      label: "Clear Search",
                      variant: "outline",
                      size: "lg",
                      icon: "refresh",
                      onPress: () => setSearchQuery(''),
                    },
                    {
                      label: `Create "${searchQuery}"`,
                      variant: "default",
                      size: "lg",
                      icon: "add-circle",
                      onPress: () => router.push(`/add-product?name=${encodeURIComponent(searchQuery)}`),
                    },
                  ]
                : [
                    {
                      label: "Add Your First Product",
                      variant: "default",
                      size: "lg",
                      icon: "add-circle",
                      onPress: () => router.push('/add-product'),
                    },
                  ]
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="mb-4 bg-surface dark:bg-dark-surface">
      <CardContent className="p-2">
        {categories.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="mb-4 -ml-4 pl-4"
          >
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(null);
                }}
                className={`px-4 py-2 rounded-full ${
                  !selectedCategory 
                    ? 'bg-brand dark:bg-dark-brand' 
                    : 'bg-surface-soft dark:bg-dark-surface-soft'
                }`}
              >
                <ThemedText 
                  size="sm" 
                  className={!selectedCategory ? 'text-white' : ''}
                >
                  All
                </ThemedText>
              </TouchableOpacity>
              {categories.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(category);
                  }}
                  className={`px-4 py-2 rounded-full ${
                    selectedCategory === category
                      ? 'bg-brand dark:bg-dark-brand'
                      : 'bg-surface-soft dark:bg-dark-surface-soft'
                  }`}
                >
                  <ThemedText 
                    size="sm" 
                    className={selectedCategory === category ? 'text-white' : ''}
                  >
                    {category}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <View className="mt-2">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <ThemedText variant="label" className="font-semibold">
                Available Products
              </ThemedText>
              <ThemedText variant="muted" size="sm">
                {products.length} product{products.length !== 1 ? 's' : ''}
                {selectedCategory ? ` in ${selectedCategory}` : ''}
              </ThemedText>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setViewMode(viewMode === 'grid' ? 'list' : 'grid');
                }}
                className="p-2 rounded-lg bg-surface-soft dark:bg-dark-surface-soft"
              >
                <Ionicons 
                  name={viewMode === 'grid' ? 'list' : 'grid'} 
                  size={20} 
                  color="#64748b" 
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/add-product')}
                className="flex-row items-center gap-1 p-2 bg-brand/10 dark:bg-dark-brand/20 rounded-lg"
              >
                <Ionicons name="add" size={18} color="#3b82f6" />
                <ThemedText variant="brand" size="sm" className="font-medium">
                  New
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {viewMode === 'grid' ? (
            <View className="flex-row flex-wrap">
              {products.map((product, index) => (
                <TouchableOpacity
                  key={product.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelectProduct(product);
                  }}
                  className={`
                    w-[48%] 
                    ${index % 2 === 0 ? 'mr-[4%]' : ''} 
                    mb-4
                    bg-surface dark:bg-dark-surface 
                    rounded-xl 
                    border border-border dark:border-dark-border 
                    p-3 
                    active:scale-[0.98]
                  `}
                >
                  <View className="w-full h-32 rounded-lg bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mb-3 overflow-hidden">
                    {product.imageUrl ? (
                      <Image
                        source={{ uri: product.imageUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                        <Ionicons name="cube-outline" size={32} color="#64748b" />
                      </View>
                    )}
                    <View className="absolute top-2 right-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full">
                      <StockStatusBadge
                        status={getProductStockStatus(product)}
                        size="sm"
                      />
                    </View>
                  </View>
                  <View>
                    <ThemedText 
                      variant="default" 
                      size="base" 
                      className="font-semibold mb-1"
                      numberOfLines={1}
                    >
                      {product.name}
                    </ThemedText>
                    <ThemedText variant="muted" size="sm" className="mb-1">
                      Stock: {(product.baseUnit === "piece" || product.baseUnit === "unite") 
                        ? product.stockQuantity ?? 0 
                        : product.formattedCurrentStock}
                    </ThemedText>
                    <ThemedText variant="heading" size="base" className="text-success font-bold">
                      ₣{product.sellingPricePerBase}
                      <ThemedText variant="muted" size="xs">
                        /{product.sellingUnit || product.baseUnit}
                      </ThemedText>
                    </ThemedText>
                    {product.category && (
                      <View className="mt-2">
                        <View className="px-2 py-1 bg-surface-soft dark:bg-dark-surface-soft rounded-full self-start">
                          <ThemedText variant="muted" size="xs">
                            {product.category}
                          </ThemedText>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="gap-2">
              {products.map(product => (
                <TouchableOpacity
                  key={product.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelectProduct(product);
                  }}
                  className="flex-row items-center p-3 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border active:scale-[0.98]"
                >
                  <View className="w-12 h-12 rounded-lg bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mr-3 overflow-hidden">
                    {product.imageUrl ? (
                      <Image
                        source={{ uri: product.imageUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                        <Ionicons name="cube-outline" size={20} color="#64748b" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1">
                    <ThemedText variant="default" size="base" className="font-medium mb-1">
                      {product.name}
                    </ThemedText>
                    <View className="flex-row items-center gap-3">
                      <ThemedText variant="muted" size="sm">
                        Stock: {product.formattedCurrentStock}
                      </ThemedText>
                      <View className="w-1 h-1 rounded-full bg-border dark:bg-dark-border" />
                      <ThemedText variant="muted" size="sm">
                        ₣{product.sellingPricePerBase}/{product.sellingUnit || product.baseUnit}
                      </ThemedText>
                    </View>
                    {product.category && (
                      <View className="mt-1">
                        <View className="px-2 py-1 bg-surface-soft dark:bg-dark-surface-soft rounded-full self-start">
                          <ThemedText variant="muted" size="xs">
                            {product.category}
                          </ThemedText>
                        </View>
                      </View>
                    )}
                  </View>
                  <View className="items-end">
                    <StockStatusBadge
                      status={getProductStockStatus(product)}
                      size="sm"
                    />
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color="#64748b" 
                      className="mt-2"
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </CardContent>
    </Card>
  );
}