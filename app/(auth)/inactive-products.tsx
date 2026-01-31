// components/InactiveProductsModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import database from '@/database';
import { Product } from '@/database/models/Product';
import { Q } from '@nozbe/watermelondb';
import { useAuth } from '@/context/AuthContext';
import PremiumHeader from '@/components/layout/PremiumHeader';

const productCollections = database.get<Product>('products');


interface ProductItem {
  id: string;
  name: string;
  category: string;
  sku: string;
}

export default function InactiveProductsModal() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { currentShop } = useAuth();
  const router = useRouter();

  // Fetch inactive products
  const fetchInactiveProducts = async () => {
    if (!currentShop?.id) return;

    setLoading(true);
    setError(null);
    
    try {
      const inactiveProducts = await productCollections.query(
        Q.where('shop_id', currentShop.id),
        Q.where('is_active', false)
      ).fetch();


      const productList: ProductItem[] = inactiveProducts.map(product => ({
        id: product.id,
        name: product.name,
        category: product.category || 'Uncategorized',
        sku: product.sku || 'No SKU'
      }));

      setProducts(productList);
      setFilteredProducts(productList);
      console.log(`📦 Found ${productList.length} inactive products`);
    } catch (err) {
      console.error('Error fetching inactive products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  // Refresh products when modal becomes visible
  useEffect(() => {
    if (currentShop?.id) {
      fetchInactiveProducts();
    }
  }, [ currentShop]);

  const renderProductItem = ({ item }: { item: ProductItem }) => (
    <TouchableOpacity
      className="bg-surface-soft dark:bg-dark-surface-soft border-b border-border dark:border-dark-border py-4 px-3 active:bg-surface dark:active:bg-dark-surface"
      onPress={() => router.push(`/(auth)/edit-product/${item.id}`)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <ThemedText className="text-base font-inter-medium mb-1">
            {item.name}
          </ThemedText>
          <View className="flex-row flex-wrap gap-2">
            <ThemedText variant="caption" className="text-xs">
              {item.category}
            </ThemedText>
            {item.sku && item.sku !== 'No SKU' && (
              <ThemedText variant="brand" className="text-xs">
                SKU: {item.sku}
              </ThemedText>
            )}
          </View>
        </View>
        <ThemedText variant="accent" className="text-xs font-inter-medium">
          Customize
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View className="py-8 px-4 items-center">
      <ThemedText variant="success" className="text-center mb-2">
        No inactive products found
      </ThemedText>
      <ThemedText variant="success" className="text-center text-sm">
        {products.length === 0 
          ? "All products are active or no products exist yet"
          : "No products match your search"
        }
      </ThemedText>
    </View>
  );

  return (
    <ScrollView className="flex-1">
      <PremiumHeader 
        title="Inactive Products" 
        showBackButton
        searchable
        searchPlaceholder="Search products by name, category, or SKU..."
        onSearch={setSearchQuery}
        />
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        

        {/* Loading State */}
        {loading && (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" />
            <ThemedText className="mt-3">Loading products...</ThemedText>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View className="flex-1 justify-center items-center px-8">
            <ThemedText variant="error" className="text-center mb-4">
              {error}
            </ThemedText>
            <Button onPress={fetchInactiveProducts} variant="default">
              Try Again
            </Button>
          </View>
        )}

        {/* Products List */}
        {!loading && !error && (
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={filteredProducts.length === 0 ? { flex: 1 } : undefined}
            showsVerticalScrollIndicator={false}
            className="flex-1 bg-destructive-soft dark:bg-dark-destructive-soft"
          />
        )}

        {/* Footer Stats */}
        {!loading && !error && products.length > 0 && (
          <View className="border-t border-border dark:border-dark-border px-4 py-3 bg-surface-soft dark:bg-dark-surface-soft">
            <ThemedText variant="brand" className="text-xs text-center">
              Showing {filteredProducts.length} of {products.length} inactive products
            </ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}