// app/(tabs)/products.tsx
import database from '@/database';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  TouchableOpacity,
  View
} from 'react-native';
import { withObservables } from '@nozbe/watermelondb/react';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Button, FAB } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StockStatusBadge } from '@/components/ui/StockStatusBadge';
import { ThemedText } from '@/components/ui/ThemedText';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

// Models & Types
import { Product } from '@/database/models/Product';
import { StockMovement } from '@/database/models/StockMovement';
import { of } from '@nozbe/watermelondb/utils/rx';

interface ProductWithStock extends Product {
  currentStock: number;
  stockValue: number;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'stock' | 'price' | 'recent';

// Inner component that receives observable data
const ProductsScreenInner = ({ 
  products = [],
  stockMovements = []
}: { 
  products?: Product[],
  stockMovements?: StockMovement[]
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentShop } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low-stock' | 'out-of-stock' | 'perishable'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


  // Update your interface to extend Product
interface ProductWithStock extends Product {
  currentStock: number;
  stockValue: number;
}

// In your ProductsScreenInner component
const productsWithStock = useMemo((): ProductWithStock[] => {
  // Create a map of stock movements per product
  const stockMap = new Map<string, number>();
  
  // Sort movements by timestamp to ensure correct order
  const sortedMovements = [...stockMovements].sort((a, b) => a.timestamp - b.timestamp);
  
  sortedMovements.forEach(movement => {
    const currentStock = stockMap.get(movement.productId) || 0;
    
    switch (movement.movementType) {
      case 'IN':
      case 'TRANSFER_IN':
        stockMap.set(movement.productId, currentStock + movement.quantity);
        break;
      case 'SALE':
      case 'TRANSFER_OUT':
        stockMap.set(movement.productId, currentStock - movement.quantity);
        break;
      case 'ADJUSTMENT':
        stockMap.set(movement.productId, currentStock + movement.quantity);
        break;
    }
  });

  // Return the actual Product instances with added computed properties
  return products
    .filter(product => product.isActive)
    .map(product => {
      const currentStock = stockMap.get(product.id) || 0;
      
      // Use Object.defineProperty to add read-only computed properties
      // that won't interfere with WatermelonDB's internals
      const productWithStock = product as ProductWithStock;
      
      // Add currentStock as a non-enumerable property
      Object.defineProperty(productWithStock, 'currentStock', {
        value: currentStock,
        writable: false,
        enumerable: false, // Hide from enumeration to avoid conflicts
        configurable: true,
      });
      
      // Add stockValue as a non-enumerable property
      Object.defineProperty(productWithStock, 'stockValue', {
        value: currentStock * product.sellingPricePerBase,
        writable: false,
        enumerable: false,
        configurable: true,
      });
      
      return productWithStock;
    });
}, [products, stockMovements]);

  const getStockStatus = (stock: number, threshold: number = 10) => {
    if (stock === 0) return 'out-of-stock';
    if (stock <= threshold) return 'low-stock';
    return 'in-stock';
  };

  const filteredAndSortedProducts = useMemo(() => {
    return productsWithStock
      .filter(product => {
        const matchesSearch = product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             product?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             product?.category?.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (filter === 'all') return matchesSearch;
        if (filter === 'low-stock') {
          const status = getStockStatus(product.currentStock, product.lowStockThreshold);
          return matchesSearch && status === 'low-stock';
        }
        if (filter === 'out-of-stock') {
          const status = getStockStatus(product.currentStock, product.lowStockThreshold);
          return matchesSearch && status === 'out-of-stock';
        }
        if (filter === 'perishable') {
          return matchesSearch && product.isPerishable;
        }
        return matchesSearch;
      })
      .sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'stock':
            aValue = a.currentStock;
            bValue = b.currentStock;
            break;
          case 'price':
            aValue = a.sellingPricePerBase;
            bValue = b.sellingPricePerBase;
            break;
          case 'recent':
            aValue = a.updatedAt?.getTime() || 0;
            bValue = b.updatedAt?.getTime() || 0;
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) return sortAsc ? -1 : 1;
        if (aValue > bValue) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [productsWithStock, searchQuery, filter, sortBy, sortAsc]);

  // Statistics
  const stats = useMemo(() => {
    const totalProducts = productsWithStock.length;
    const lowStockCount = productsWithStock.filter(p => 
      getStockStatus(p.currentStock, p.lowStockThreshold) === 'low-stock'
    ).length;
    const outOfStockCount = productsWithStock.filter(p => 
      getStockStatus(p.currentStock, p.lowStockThreshold) === 'out-of-stock'
    ).length;
    const perishableCount = productsWithStock.filter(p => p.isPerishable).length;
    const totalStockValue = productsWithStock.reduce((sum, p) => sum + p.stockValue, 0);

    return { totalProducts, lowStockCount, outOfStockCount, perishableCount, totalStockValue };
  }, [productsWithStock]);

  const handleQuickAction = (action: 'sell' | 'stock' | 'edit', product: ProductWithStock) => {
    switch (action) {
      case 'sell':
        router.push({
          pathname: '/(tabs)/sales',
          params: { productId: product.id }
        });
        break;
      case 'stock':
        router.push({
          pathname: '/(auth)/add-product',
          params: { productId: product.id }
        });
        break;
      case 'edit':
        router.push(`/edit-product/${product.id}`);
        break;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Force a re-fetch of the data
    await Promise.all([
      database.get<Product>('products').query().fetch(),
      database.get<StockMovement>('stock_movements').query().fetch(),
    ]);
    setRefreshing(false);
  };

  // Grid Item Component
  const ProductGridItem = ({ product }: { product: ProductWithStock }) => (
    <Card variant="elevated" className="m-1 flex-1 min-w-[48%]">
      <CardContent className="p-3">
        <View className="aspect-square rounded-lg bg-surface-muted dark:bg-dark-surface-muted mb-3 overflow-hidden">
          {product.imageUrl ? (
            <Image 
              source={{ uri: product.imageUrl }} 
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-surface-soft dark:bg-dark-surface-soft">
              <Ionicons name="cube-outline" size={32} color="#94a3b8" />
            </View>
          )}
        </View>

        {/* Product Info */}
        <View className="flex-1">
          <ThemedText 
            variant="subheading" 
            size="base" 
            numberOfLines={2}
            className="mb-1 leading-5"
          >
            {product.name.length > 15 ? product.name.slice(0, 15)+"..." : product.name}
          </ThemedText>
          
          {product.sku && (
            <ThemedText variant="muted" size="xs" className="mb-1 text-[12px] mt-1">
              SKU: {product.sku}
            </ThemedText>
          )}

          <ThemedText variant="brand" size="sm" className="mb-2 text-[16px] text-muted dark:text-dark-muted">
            FBU {product.sellingPricePerBase.toLocaleString()} / {product.sellingUnit}
          </ThemedText>

          {/* Stock Info */}
          <View className="flex-row justify-between items-center mb-3">
            <ThemedText variant="muted" size="sm">
              {product.currentStock} {product.sellingUnit}
            </ThemedText>
            <StockStatusBadge 
              status={getStockStatus(product.currentStock, product.lowStockThreshold)}
              size="sm"
            />
          </View>

          {/* Quick Actions */}
          <View className="flex-row gap-1">
            <Button
              variant="warning"
              size="sm"
              onPress={() => handleQuickAction('sell', product)}
              className="flex-1"
            >
              <Ionicons name="cart-outline" size={14} />
            </Button>
           
            <Button
              variant="secondary"
              size="sm"
              onPress={() => handleQuickAction('stock', product)}
              className="flex-1"
            >
              <Ionicons name="add-outline" size={14} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onPress={() => handleQuickAction('edit', product)}
              icon="pencil-outline"
            >
              Edit
            </Button>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  // List Item Component
  const ProductListItem = ({ product }: { product: ProductWithStock }) => (
    <Card variant="elevated" className="mx-4 my-2">
      <CardContent className="p-4">
        <View className="flex-row items-center">
          {/* Product Image */}
          <View className="w-16 h-16 rounded-lg bg-surface-muted dark:bg-dark-surface-muted mr-4 overflow-hidden">
            {product.imageUrl ? (
              <Image 
                source={{ uri: product.imageUrl }} 
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-surface-soft dark:bg-dark-surface-soft">
                <Ionicons name="cube-outline" size={20} color="#94a3b8" />
              </View>
            )}
          </View>

          {/* Product Details */}
          <View className="flex-1">
            <View className="flex-row justify-between items-start mb-1">
              <ThemedText 
                variant="subheading" 
                size="base" 
                numberOfLines={1}
                className="flex-1 mr-2"
              >
                {product.name}
              </ThemedText>
              <StockStatusBadge 
                status={getStockStatus(product.currentStock, product.lowStockThreshold)}
                size="sm"
              />
            </View>

            {product?.sku && (
              <ThemedText variant="muted" size="xs" className="mb-1 text-[12px]">
                SKU: {product.sku}
              </ThemedText>
            )}

            <View className="flex-row justify-between items-center">
              <ThemedText variant="brand" size="sm">
                FBU {product.sellingPricePerBase.toLocaleString()}
              </ThemedText>
              <ThemedText variant="muted" size="sm">
                {product.currentStock} {product.sellingUnit}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Extended Actions */}
        <View className="flex-row gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onPress={() => handleQuickAction('sell', product)}
            className="flex-1"
            icon="cart-outline"
          >
            Sell
          </Button>
          <Button
            variant="outline"
            size="sm"
            onPress={() => handleQuickAction('stock', product)}
            className="flex-1"
            icon="add-outline"
          >
            Stock
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => handleQuickAction('edit', product)}
            icon="pencil-outline"
          >
            Edit
          </Button>
        </View>
      </CardContent>
    </Card>
  );

  if (!currentShop) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title={t('products.title')} />
        <EmptyState
          icon="business-outline"
          title="No Shop Found"
          description="Create a shop first to manage products"
          action={{
            label: "Create Shop",
            onPress: () => router.push('/(auth)/create-shop')
          }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title={t('products.title')}
        searchable={true}
        searchPlaceholder={`${stats.totalProducts} products • ₣${stats.totalStockValue.toLocaleString()} total value`}
        showBackButton={true}
        onSearch={setSearchQuery}
      />

      <View className="flex-1">
        {/* Search and Controls */}
        {filteredAndSortedProducts.length > 0 && (
          <Card variant="elevated" className="mx-4 mt-4 mb-2">
            <CardContent className="p-4">
              {/* View Controls */}
              <View className="flex-row justify-between items-center">
                <View className="flex-row gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onPress={() => setViewMode('grid')}
                    icon="grid-outline"
                  >
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onPress={() => setViewMode('list')}
                    icon="list-outline"
                  >
                    List
                  </Button>
                </View>

                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setSortAsc(!sortAsc)}
                  icon={sortAsc ? "arrow-up-outline" : "arrow-down-outline"}
                  iconPosition="left"
                >
                  {sortBy === 'name' ? 'Name' : 
                   sortBy === 'stock' ? 'Stock' : 
                   sortBy === 'price' ? 'Price' : 'Recent'}
                </Button>
              </View>

              {/* Quick Filters */}
              <View className="flex-row flex-wrap gap-2 mt-3">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onPress={() => setFilter('all')}
                >
                  All ({stats.totalProducts})
                </Button>
                <Button
                  variant={filter === 'low-stock' ? 'warning' : 'outline'}
                  size="sm"
                  onPress={() => setFilter('low-stock')}
                >
                  Low Stock ({stats.lowStockCount})
                </Button>
                <Button
                  variant={filter === 'out-of-stock' ? 'destructive' : 'outline'}
                  size="sm"
                  onPress={() => setFilter('out-of-stock')}
                >
                  Out of Stock ({stats.outOfStockCount})
                </Button>
                <Button
                  variant={filter === 'perishable' ? 'success' : 'outline'}
                  size="sm"
                  onPress={() => setFilter('perishable')}
                >
                  Perishable ({stats.perishableCount})
                </Button>
              </View>

              {/* Sort Options */}
              <View className="flex-row flex-wrap gap-2 mt-3">
                <ThemedText variant="label" size="sm" className="mr-2">
                  Sort by:
                </ThemedText>
                {(['name', 'stock', 'price', 'recent'] as SortBy[]).map(option => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setSortBy(option)}
                    className={cn(
                      'px-3 py-1 rounded-full',
                      sortBy === option 
                        ? 'bg-brand/10 border border-brand/20' 
                        : 'bg-surface-soft dark:bg-dark-surface-soft border border-border dark:border-dark-border'
                    )}
                  >
                    <ThemedText 
                      variant={sortBy === option ? 'brand' : 'muted'}
                      size="sm"
                    >
                      {option === 'name' ? 'Name' : 
                       option === 'stock' ? 'Stock' : 
                       option === 'price' ? 'Price' : 'Recent'}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        {/* Products List/Grid */}
        <FlatList
          data={filteredAndSortedProducts}
          keyExtractor={item => item.id}
          key={viewMode}
          numColumns={viewMode === 'grid' ? 2 : 1}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: viewMode === 'grid' ? 8 : 0,
            paddingBottom: 100
          }}
          renderItem={({ item }) => 
            viewMode === 'grid' ? 
            <ProductGridItem product={item} /> : 
            <ProductListItem product={item} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No Products Found"
              description={
                filter !== 'all' 
                  ? `No products match the "${filter}" filter`
                  : searchQuery
                  ? `No products found for "${searchQuery}"`
                  : "Add your first product to get started"
              }
              action={
                filter === 'all' && !searchQuery ? {
                  label: "Add products from template",
                  onPress: () => router.push('/add-product')
                } : undefined
              }
              className="py-16"
            />
          }
        />
      </View>

      {/* Floating Action Button */}
      <FAB
        icon="add"
        position="bottom-right"
        onPress={() => router.push('/add-product')}
      >
        Add Product
      </FAB>
    </View>
  );
};

// Enhance with observables for real-time updates
const enhance = withObservables(
  ['currentShop'],
  ({ currentShop }: { currentShop: any }) => {
    if (!currentShop) {
      return {
        products: of([]), // or [],
        stockMovements: of([]), // or [],
      };
    }

    return {
      products: database
        .get<Product>('products')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('is_active', true)
        )
        .observe(),
      stockMovements: database
        .get<StockMovement>('stock_movements')
        .query(
          Q.where('shop_id', currentShop.id)
        )
        .observe(),
    };
  }
);

const ProductsScreenWithObservables = enhance(ProductsScreenInner);

// Main exported component
export default function ProductsScreen() {
  const { currentShop } = useAuth();

  if (!currentShop) {
    // Handle no shop case immediately without observables
    const router = useRouter();
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title={useTranslation().t('products.title')} />
        <EmptyState
          icon="business-outline"
          title="No Shop Found"
          description="Create a shop first to manage products"
          action={{
            label: "Create Shop",
            onPress: () => router.push('/(auth)/create-shop')
          }}
        />
      </View>
    );
  }

  return <ProductsScreenWithObservables currentShop={currentShop} />;
}

// Helper function for conditional classes
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}