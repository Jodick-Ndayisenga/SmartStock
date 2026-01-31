// app/(tabs)/products.tsx
import database from '@/database';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  TouchableOpacity,
  View
} from 'react-native';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Button, FAB } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Loading } from '@/components/ui/Loading';
import { StockStatusBadge } from '@/components/ui/StockStatusBadge';
import { ThemedText } from '@/components/ui/ThemedText';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
;

// Models & Types
import { Product } from '@/database/models/Product';
import { StockMovement } from '@/database/models/StockMovement';

interface ProductWithStock extends Product {
  currentStock: number;
  stockValue: number;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'stock' | 'price' | 'recent';

export default function ProductsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low-stock' | 'out-of-stock' | 'perishable'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const { user, currentShop } = useAuth();

  useEffect(() => {
    loadProducts();

  }, [currentShop]);


  const loadProducts = async () => {
    try {
      setLoading(true);
      if (currentShop?.id) {
        // Get products as WatermelonDB Model instances
        const productsData = await database.get<Product>('products')
          .query(
            Q.where('shop_id', currentShop?.id),
            Q.where('is_active', true)
          )
          .fetch();

        // Convert to plain objects with actual data
        const productsWithStock: any = await Promise.all(
          productsData.map(async (productModel) => {
            // Extract raw data from the model
            const productData = {
              id: productModel.id,
              name: productModel.name,
              sku: productModel.sku,
              barcode: productModel.barcode,
              category: productModel.category,
              description: productModel.description,
              unitType: productModel.unitType,
              isWeighted: productModel.isWeighted,
              baseUnit: productModel.baseUnit,
              purchaseUnit: productModel.purchaseUnit,
              purchaseUnitSize: productModel.purchaseUnitSize,
              stockQuantity: productModel.stockQuantity,
              sellingUnit: productModel.sellingUnit,
              unitConversionFactor: productModel.unitConversionFactor,
              costPricePerBase: productModel.costPricePerBase,
              sellingPricePerBase: productModel.sellingPricePerBase,
              wholesalePricePerBase: productModel.wholesalePricePerBase,
              lowStockThreshold: productModel.lowStockThreshold,
              isActive: productModel.isActive,
              isPerishable: productModel.isPerishable,
              defaultExpiryDays: productModel.defaultExpiryDays,
              imageUrl: productModel.imageUrl,
              imageThumbnailUrl: productModel.imageThumbnailUrl,
              shopId: productModel.shopId,
              createdAt: productModel.createdAt,
              updatedAt: productModel.updatedAt,
            };

            // Calculate current stock
            //console.log(productData.stockQuantity)
            const stock = productData.stockQuantity ?? 0//await calculateProductStock(productModel.id);
            const stockValue = stock * productModel.sellingPricePerBase;
            
            return {
              ...productData,
              currentStock: stock,
              stockValue,
            };
          })
        );

        setProducts(productsWithStock);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  // print the movements of a product

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

  const getStockStatus = (stock: number, threshold: number = 10) => {
    if (stock === 0) return 'out-of-stock';
    if (stock <= threshold) return 'low-stock';
    return 'in-stock';
  };

  
  const filteredAndSortedProducts = products
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
          aValue = a.updatedAt.getTime();
          bValue = b.updatedAt.getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortAsc ? -1 : 1;
      if (aValue > bValue) return sortAsc ? 1 : -1;
      return 0;
    });

  // Statistics
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => 
    getStockStatus(p.currentStock, p.lowStockThreshold) === 'low-stock'
  ).length;
  const outOfStockCount = products.filter(p => 
    getStockStatus(p.currentStock, p.lowStockThreshold) === 'out-of-stock'
  ).length;
  const perishableCount = products.filter(p => p.isPerishable).length;
  const totalStockValue = products.reduce((sum, p) => sum + p.stockValue, 0);

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
        // Navigate to edit product screen
        router.push(`/edit-product/${product.id}`);
        break;
    }
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
            {product.name.length > 15 ? product.name.slice(0, 15)+"...": product.name}
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
              variant="outline"
              size="sm"
              onPress={() => handleQuickAction('sell', product)}
              className="flex-1"
            >
              <Ionicons name="cart-outline" size={14} />
            </Button>
           
            <Button
              variant="outline"
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

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title={t('products.title')} />
        <Loading />
      </View>
    );
  }

  if (!currentShop && !loading) {
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
        searchable = {true}
        searchPlaceholder={`${totalProducts} products • ₣${totalStockValue.toLocaleString()} total value`}
        showBackButton={true}
        //subtitle={`${totalProducts} products • ₣${totalStockValue.toLocaleString()} total value`}
      />

      <View className="flex-1">
        {/* Search and Controls */}
        {
          filteredAndSortedProducts.length > 0 && (
            <Card variant="elevated" className="mx-4 mt-4 mb-2">
          <CardContent className="p-4">
            {/* <SearchInput
              placeholder="Search products by name, SKU, or category..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
            /> */}
            
            {/* View Controls */}
            <View className="flex-row justify-between items-center mt-3">
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
                All ({totalProducts})
              </Button>
              <Button
                variant={filter === 'low-stock' ? 'warning' : 'outline'}
                size="sm"
                onPress={() => setFilter('low-stock')}
              >
                Low Stock ({lowStockCount})
              </Button>
              <Button
                variant={filter === 'out-of-stock' ? 'destructive' : 'outline'}
                size="sm"
                onPress={() => setFilter('out-of-stock')}
              >
                Out of Stock ({outOfStockCount})
              </Button>
              <Button
                variant={filter === 'perishable' ? 'success' : 'outline'}
                size="sm"
                onPress={() => setFilter('perishable')}
              >
                Perishable ({perishableCount})
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
          )
        }

        {/* Products List/Grid */}
        <FlatList
          data={filteredAndSortedProducts}
          keyExtractor={item => item.id}
          key={viewMode} // Force re-render when view mode changes
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
                  label: "Add First Product",
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
}

// Helper function for conditional classes
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}