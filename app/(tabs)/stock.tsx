
// app/(tabs)/stock.tsx
import React, { useState, useMemo } from 'react';
import { 
  View, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { EmptyState } from '@/components/ui/EmptyState';
import { StockStatusBadge } from '@/components/ui/StockStatusBadge';
import { Badge } from '@/components/ui/Badge';
import { FAB } from '@/components/ui/Button';

// Models
import { Product } from '@/database/models/Product';
import { StockMovement } from '@/database/models/StockMovement';
import { useAuth } from '@/context/AuthContext';
import { of } from '@nozbe/watermelondb/utils/rx';

interface ProductStock extends Product {
  currentStock: number;
  stockValue: number;
  potentialRevenue: number;
  lastMovement?: number;
}

interface StockSummary {
  totalProducts: number;
  totalStockValue: number;
  totalPotentialRevenue: number;
  totalPotentialProfit: number;
  lowStockItems: number;
  outOfStockItems: number;
  perishableItems: number;
  highValueItems: number;
  criticalItems: number;
}

type StockFilter = 'all' | 'low-stock' | 'out-of-stock' | 'perishable' | 'high-value' | 'critical';
type SortBy = 'name' | 'stock' | 'value' | 'revenue' | 'profit' | 'recent';
type ViewMode = 'grid' | 'list';

// Inner component that receives observable data
const StockScreenInner = ({ 
  products = [],
  stockMovements = []
}: { 
  products?: Product[],
  stockMovements?: StockMovement[]
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentShop } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StockFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Define getStockStatus BEFORE using it
  const getStockStatus = (stock: number, threshold: number): 'in-stock' | 'low-stock' | 'out-of-stock' => {
    if (stock === 0) return 'out-of-stock';
    if (stock <= threshold) return 'low-stock';
    return 'in-stock';
  };

  // Calculate current stock for each product based on movements
  const productsWithStock = useMemo((): ProductStock[] => {
    // Create a map of stock movements per product
    const stockMap = new Map<string, number>();
    const lastMovementMap = new Map<string, number>();
    
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
      
      // Track last movement timestamp
      const existingLastMovement = lastMovementMap.get(movement.productId) || 0;
      if (movement.timestamp > existingLastMovement) {
        lastMovementMap.set(movement.productId, movement.timestamp);
      }
    });

    // Combine products with their current stock
    return products
      .filter(product => product.isActive)
      .map(product => {
        const currentStock = stockMap.get(product.id) || 0;
        
        // Add computed properties to the Product instance
        const productWithStock = product as ProductStock;
        
        // Use Object.defineProperty to add read-only properties
        Object.defineProperty(productWithStock, 'currentStock', {
          value: currentStock,
          writable: false,
          enumerable: true, // Make enumerable so it appears in loops
          configurable: true,
        });
        
        Object.defineProperty(productWithStock, 'stockValue', {
          value: currentStock * (product.costPricePerBase || 0),
          writable: false,
          enumerable: true,
          configurable: true,
        });
        
        Object.defineProperty(productWithStock, 'potentialRevenue', {
          value: currentStock * (product.sellingPricePerBase || 0),
          writable: false,
          enumerable: true,
          configurable: true,
        });
        
        Object.defineProperty(productWithStock, 'lastMovement', {
          value: lastMovementMap.get(product.id),
          writable: false,
          enumerable: true,
          configurable: true,
        });
        
        return productWithStock;
      });
  }, [products, stockMovements]);

  // Calculate summary statistics
  const summary = useMemo((): StockSummary => {
    let totalStockValue = 0;
    let totalPotentialRevenue = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    let perishableItems = 0;
    let highValueItems = 0;
    let criticalItems = 0;

    productsWithStock.forEach(product => {
      const currentStock = (product as ProductStock).currentStock;
      const stockValue = (product as ProductStock).stockValue;
      const potentialRevenue = (product as ProductStock).potentialRevenue;
      
      totalStockValue += stockValue;
      totalPotentialRevenue += potentialRevenue;
      
      const status = getStockStatus(currentStock, product.lowStockThreshold);
      if (status === 'out-of-stock') outOfStockItems++;
      if (status === 'low-stock') lowStockItems++;
      if (product.isPerishable) perishableItems++;
      if (stockValue > 100000) highValueItems++;
      if (status === 'out-of-stock' && product.isPerishable) criticalItems++;
    });

    return {
      totalProducts: productsWithStock.length,
      totalStockValue,
      totalPotentialRevenue,
      totalPotentialProfit: totalPotentialRevenue - totalStockValue,
      lowStockItems,
      outOfStockItems,
      perishableItems,
      highValueItems,
      criticalItems,
    };
  }, [productsWithStock]);

  const filteredProducts = useMemo(() => {
    return productsWithStock
      .filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             product.category?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const status = getStockStatus((product as ProductStock).currentStock, product.lowStockThreshold);
        
        switch (filter) {
          case 'all': return matchesSearch;
          case 'low-stock': return matchesSearch && status === 'low-stock';
          case 'out-of-stock': return matchesSearch && status === 'out-of-stock';
          case 'perishable': return matchesSearch && product.isPerishable;
          case 'high-value': return matchesSearch && (product as ProductStock).stockValue > 100000;
          case 'critical': return matchesSearch && status === 'out-of-stock' && product.isPerishable;
          default: return matchesSearch;
        }
      })
      .sort((a, b) => {
        const aStock = a as ProductStock;
        const bStock = b as ProductStock;
        
        switch (sortBy) {
          case 'stock':
            return aStock.currentStock - bStock.currentStock;
          case 'value':
            return bStock.stockValue - aStock.stockValue;
          case 'revenue':
            return bStock.potentialRevenue - aStock.potentialRevenue;
          case 'profit':
            return (bStock.potentialRevenue - bStock.stockValue) - (aStock.potentialRevenue - aStock.stockValue);
          case 'recent':
            return (bStock.lastMovement || 0) - (aStock.lastMovement || 0);
          case 'name':
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [productsWithStock, searchQuery, filter, sortBy]);

  const formatCurrency = (amount: number) => {
    return `FBU ${amount.toLocaleString('fr-FR')}`;
  };

  const formatStockValue = (value: number) => {
    if (value >= 1000000) {
      return `FBU ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `FBU ${(value / 1000).toFixed(0)}K`;
    }
    return formatCurrency(value);
  };

  const handleQuickAction = (action: 'add-stock' | 'adjust' | 'view' | 'sell', product: ProductStock) => {
    switch (action) {
      case 'sell':
        router.push(`/sales?productId=${product.id}`);
        break;
      case 'add-stock':
      case 'adjust':
      case 'view':
        router.push(`/edit-product/${product.id}`);
        break;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      database.get<Product>('products').query().fetch(),
      database.get<StockMovement>('stock_movements').query().fetch(),
    ]);
    setRefreshing(false);
  };

  const EnhancedStockSummaryCard = () => (
    <Card variant="elevated" className="mb-4 mx-2 mt-6">
      <CardHeader
        title="Stock Evaluation Summary"
        subtitle="Complete inventory analysis"
        action={
          <Badge variant={
            summary.criticalItems > 0 ? 'error' : 
            summary.outOfStockItems > 0 ? 'warning' : 'success'
          }>
            {summary.criticalItems > 0 ? 'Critical' : 
             summary.outOfStockItems > 0 ? 'Needs Attention' : 'Healthy'}
          </Badge>
        }
      />
      <CardContent className="p-4">
        {/* Top Row - Financial Overview */}
        <View className="flex-row flex-wrap justify-between mb-4">
          <View className="w-[48%] mb-3">
            <View className="bg-brand/10 rounded-sm p-2 items-center">
              <ThemedText variant="muted" size="sm" className="mb-1">
                Inventory Value
              </ThemedText>
              <ThemedText variant="brand" size="lg" className="font-bold text-center">
                {formatStockValue(summary.totalStockValue)}
              </ThemedText>
              <ThemedText variant="muted" size="xs" className="mt-1 text-center">
                Cost Basis
              </ThemedText>
            </View>
          </View>

          <View className="w-[48%] mb-3">
            <View className="bg-success/10 rounded-sm p-2 items-center">
              <ThemedText variant="muted" size="sm" className="mb-1">
                Potential Revenue
              </ThemedText>
              <ThemedText variant="success" size="lg" className="font-bold text-center">
                {formatStockValue(summary.totalPotentialRevenue)}
              </ThemedText>
              <ThemedText variant="muted" size="xs" className="mt-1 text-center">
                If all sold
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Middle Row - Profit & Products */}
        <View className="flex-row flex-wrap justify-between mb-4">
          <View className="w-[48%] mb-3">
            <View className="bg-warning/10 rounded-sm p-2 items-center">
              <ThemedText variant="muted" size="sm" className="mb-1">
                Potential Profit
              </ThemedText>
              <ThemedText variant="warning" size="lg" className="font-bold text-center">
                {formatStockValue(summary.totalPotentialProfit)}
              </ThemedText>
              <ThemedText variant="muted" size="xs" className="mt-1 text-center">
                Gross margin
              </ThemedText>
            </View>
          </View>

          <View className="w-[48%] mb-3 border border-text-muted/20 dark:border-dark-text-muted/20 rounded-sm">
            <View className="bg-info/10 rounded-sm p-2 items-center">
              <ThemedText variant="muted" size="sm" className="mb-1">
                Active Products
              </ThemedText>
              <ThemedText variant="warning" size="lg" className="font-bold">
                {summary.totalProducts}
              </ThemedText>
              <ThemedText variant="muted" size="xs" className="mt-1 text-center">
                In catalog
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Bottom Row - Status Overview */}
        <View className="flex-row flex-wrap justify-between">
          <View className="w-[32%]">
            <View className={`rounded-[0px] p-2 items-center ${
              summary.lowStockItems > 0 ? 'bg-warning/10' : 'bg-success/10'
            }`}>
              <ThemedText variant="muted" size="xs" className="mb-1">
                Low Stock
              </ThemedText>
              <ThemedText 
                variant={summary.lowStockItems > 0 ? 'warning' : 'success'} 
                size="base" 
                className="font-bold"
              >
                {summary.lowStockItems}
              </ThemedText>
            </View>
          </View>

          <View className="w-[32%]">
            <View className={`rounded-[0px] p-2 items-center ${
              summary.outOfStockItems > 0 ? 'bg-error/10' : 'bg-success/10'
            }`}>
              <ThemedText variant="muted" size="xs" className="mb-1">
                Out of Stock
              </ThemedText>
              <ThemedText 
                variant={summary.outOfStockItems > 0 ? 'error' : 'success'} 
                size="base" 
                className="font-bold"
              >
                {summary.outOfStockItems}
              </ThemedText>
            </View>
          </View>

          <View className="w-[32%]">
            <View className={`rounded-[0px] p-2 items-center ${
              summary.criticalItems > 0 ? 'bg-error/10' : 'bg-success/10'
            }`}>
              <ThemedText variant="muted" size="xs" className="mb-1">
                Critical
              </ThemedText>
              <ThemedText 
                variant={summary.criticalItems > 0 ? 'error' : 'success'} 
                size="base" 
                className="font-bold"
              >
                {summary.criticalItems}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Summary Stats Row */}
        <View className="flex-row justify-between mt-3 pt-3 border-t border-border dark:border-dark-border">
          <View className="items-center">
            <ThemedText variant="muted" size="xs">Perishable</ThemedText>
            <ThemedText variant="default" size="sm" className="font-semibold">
              {summary.perishableItems}
            </ThemedText>
          </View>
          <View className="items-center">
            <ThemedText variant="muted" size="xs">High Value</ThemedText>
            <ThemedText variant="default" size="sm" className="font-semibold">
              {summary.highValueItems}
            </ThemedText>
          </View>
          <View className="items-center">
            <ThemedText variant="muted" size="xs">Margin Avg</ThemedText>
            <ThemedText variant="default" size="sm" className="font-semibold">
              {summary.totalProducts > 0 && summary.totalStockValue > 0 ? 
                Math.round((summary.totalPotentialProfit / summary.totalStockValue) * 100) : 0}%
            </ThemedText>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  const StockListItem = ({ product }: { product: ProductStock }) => (
    <Card variant="elevated" className="mx-2 my-2">
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

            <ThemedText variant="muted" size="sm" className="mb-2">
              {product.category} • SKU: {product.sku || 'N/A'}
            </ThemedText>

            <View className="flex-row justify-between items-center">
              <View>
                <ThemedText variant="heading" size="base">
                  {product.currentStock} {product.sellingUnit}
                </ThemedText>
                <ThemedText variant="muted" size="sm">
                  Threshold: {product.lowStockThreshold}
                </ThemedText>
              </View>
              <ThemedText variant="heading" size="base">
                {formatCurrency(product.stockValue)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Extended Actions */}
        <View className="flex-row gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onPress={() => handleQuickAction('add-stock', product)}
            className="flex-1"
            icon="add-outline"
          >
            Add Stock
          </Button>
          <Button
            variant="warning"
            size="sm"
            onPress={() => handleQuickAction('sell', product)}
            className="flex-1"
            icon="cart-outline"
          >
            Sell
          </Button>
          
        </View>
      </CardContent>
    </Card>
  );

  const StockGridItem = ({ product }: { product: ProductStock }) => (
    <Card variant="elevated" className="m-1 flex-1 min-w-[48%]">
      <CardContent className="p-3">
        {/* Product Image */}
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
            variant="heading" 
            size="base" 
            numberOfLines={2}
            className="mb-1 leading-5"
          >
            {product.name}
          </ThemedText>
          
          <ThemedText variant="muted" size="xs" className="mb-2">
            {product.category}
          </ThemedText>

          {/* Stock Info */}
          <View className="flex-row justify-between items-center mb-2">
            <ThemedText variant="muted" size="sm">
              {product.currentStock} {product.sellingUnit}
            </ThemedText>
            <StockStatusBadge 
              status={getStockStatus(product.currentStock, product.lowStockThreshold)}
              size="sm"
            />
          </View>

          {/* Financial Info */}
          <View className="mb-2">
            <ThemedText variant="heading" size="sm">
              {formatCurrency(product.stockValue)}
            </ThemedText>
            <ThemedText variant="muted" size="xs">
              Profit: {formatCurrency(product.potentialRevenue - product.stockValue)}
            </ThemedText>
          </View>

          {/* Quick Actions */}
          <View className="flex-row gap-1">
            <Button
              variant="outline"
              size="sm"
              onPress={() => handleQuickAction('add-stock', product)}
              className="flex-1"
            >
              <Ionicons name="add-outline" size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onPress={() => handleQuickAction('view', product)}
              className="flex-1"
            >
              <Ionicons name="eye-outline" size={14} />
            </Button>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  if (!currentShop) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader 
          title={t('stock.title')}
          showBackButton
        />
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
        title={t('stock.title')}
        showBackButton
        searchable={true}
        searchPlaceholder="Search for items in stock"
        onSearch={setSearchQuery}
      />

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100,
          paddingHorizontal: 0
        }}
        ListHeaderComponent={
          currentShop && filteredProducts.length > 0 
            ? <EnhancedStockSummaryCard /> 
            : null // Return null instead of false
        }
        renderItem={({ item }) => 
          viewMode === 'grid' ? 
          <StockGridItem product={item as ProductStock} /> : 
          <StockListItem product={item as ProductStock} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="No Products Found"
            description={
              filter !== 'all' 
                ? `No products match the "${filter}" filter`
                : searchQuery
                ? `No products found for "${searchQuery}"`
                : "Add your first product to manage stock"
            }
            action={
              filter === 'all' && !searchQuery ? {
                label: "Add First Product",
                onPress: () => router.push('/edit-product/new')
              } : undefined
            }
            className="py-16"
          />
        }
      />

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

const StockScreenWithObservables = enhance(StockScreenInner);

// Main exported component
export default function StockScreen() {
  const { currentShop } = useAuth();
  return <StockScreenWithObservables currentShop={currentShop} />;
}