
import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { StockStatusBadge } from '@/components/ui/StockStatusBadge';
import { SearchInput } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { FAB } from '@/components/ui/Button';

// Models
import { Product } from '@/database/models/Product';
import { StockMovement } from '@/database/models/StockMovement';
import { Shop } from '@/database/models/Shop';

interface ProductStock {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  lowStockThreshold: number;
  sellingPricePerBase: number;
  costPricePerBase: number;
  stockValue: number;
  potentialRevenue: number;
  unitType: string;
  baseUnit: string;
  sellingUnit: string;
  isPerishable: boolean;
  imageUrl?: string;
  lastMovement?: number;
  profitMargin: number;
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

export default function StockScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [summary, setSummary] = useState<StockSummary>({
    totalProducts: 0,
    totalStockValue: 0,
    totalPotentialRevenue: 0,
    totalPotentialProfit: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    perishableItems: 0,
    highValueItems: 0,
    criticalItems: 0,
  });
  const [filter, setFilter] = useState<StockFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    loadStockData();
  }, []);

  const loadStockData = async () => {
    try {
      setLoading(true);
      
      const shops = await database.get<Shop>('shops').query().fetch();
      const shop = shops[0] || null;
      setCurrentShop(shop);

      if (shop) {
        const { stockData, summaryData } = await getStockData(shop.id);
        setProducts(stockData);
        setSummary(summaryData);
      }
    } catch (error) {
      console.error('Error loading stock data:', error);
      Alert.alert('Error', 'Failed to load stock data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStockData = async (shopId: string) => {
    // Get all active products - FIXED: Use the actual stockQuantity field from products table
    const productsData = await database.get<Product>('products')
      .query(
        Q.where('shop_id', shopId),
        Q.where('is_active', true)
      )
      .fetch();

    const stockData: ProductStock[] = [];
    let totalStockValue = 0;
    let totalPotentialRevenue = 0;
    let totalPotentialProfit = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    let perishableItems = 0;
    let highValueItems = 0;
    let criticalItems = 0;

    for (const product of productsData) {
      // FIXED: Use the stock_quantity field directly from products table
      const currentStock = product.stockQuantity || 0;
      const stockValue = currentStock * (product.costPricePerBase || 0);
      const potentialRevenue = currentStock * (product.sellingPricePerBase || 0);
      const potentialProfit = potentialRevenue - stockValue;
      const profitMargin = product.costPricePerBase > 0 ? 
        ((product.sellingPricePerBase - product.costPricePerBase) / product.costPricePerBase) * 100 : 0;
      
      const lastMovement = await getLastMovementDate(product.id);

      const productStock: ProductStock = {
        id: product.id,
        name: product.name,
        sku: product.sku || 'N/A',
        category: product.category || 'Uncategorized',
        currentStock,
        lowStockThreshold: product.lowStockThreshold || 10,
        sellingPricePerBase: product.sellingPricePerBase || 0,
        costPricePerBase: product.costPricePerBase || 0,
        stockValue,
        potentialRevenue,
        profitMargin,
        unitType: product.unitType,
        baseUnit: product.baseUnit,
        sellingUnit: product.sellingUnit,
        isPerishable: product.isPerishable || false,
        imageUrl: product.imageUrl,
        lastMovement,
      };

      stockData.push(productStock);
      
      // Update summary calculations
      totalStockValue += stockValue;
      totalPotentialRevenue += potentialRevenue;
      totalPotentialProfit += potentialProfit;

      // Count categories
      const status = getStockStatus(currentStock, product.lowStockThreshold || 10);
      if (status === 'out-of-stock') outOfStockItems++;
      if (status === 'low-stock') lowStockItems++;
      if (product.isPerishable) perishableItems++;
      if (stockValue > 100000) highValueItems++; // Items worth more than 100,000 FBU
      if (status === 'out-of-stock' && product.isPerishable) criticalItems++;
    }

    // Apply sorting
    stockData.sort((a, b) => {
      switch (sortBy) {
        case 'stock':
          return a.currentStock - b.currentStock;
        case 'value':
          return b.stockValue - a.stockValue;
        case 'revenue':
          return b.potentialRevenue - a.potentialRevenue;
        case 'profit':
          return b.profitMargin - a.profitMargin;
        case 'recent':
          return (b.lastMovement || 0) - (a.lastMovement || 0);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    const summaryData: StockSummary = {
      totalProducts: stockData.length,
      totalStockValue,
      totalPotentialRevenue,
      totalPotentialProfit,
      lowStockItems,
      outOfStockItems,
      perishableItems,
      highValueItems,
      criticalItems,
    };

    return { stockData, summaryData };
  };

  // Keep this function for movement history, but use stock_quantity for current stock
  const getLastMovementDate = async (productId: string): Promise<number | undefined> => {
    try {
      const movements = await database.get<StockMovement>('stock_movements')
        .query(
          Q.where('product_id', productId),
          Q.sortBy('timestamp', Q.desc),
          Q.take(1)
        )
        .fetch();
      
      return movements[0]?.timestamp;
    } catch (error) {
      console.error('Error getting last movement:', error);
      return undefined;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStockData();
  };

  const getStockStatus = (stock: number, threshold: number) => {
    if (stock === 0) return 'out-of-stock';
    if (stock <= threshold) return 'low-stock';
    return 'in-stock';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const status = getStockStatus(product.currentStock, product.lowStockThreshold);
    
    switch (filter) {
      case 'all': return matchesSearch;
      case 'low-stock': return matchesSearch && status === 'low-stock';
      case 'out-of-stock': return matchesSearch && status === 'out-of-stock';
      case 'perishable': return matchesSearch && product.isPerishable;
      case 'high-value': return matchesSearch && product.stockValue > 100000;
      case 'critical': return matchesSearch && status === 'out-of-stock' && product.isPerishable;
      default: return matchesSearch;
    }
  });

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


  const EnhancedStockSummaryCard = () => (
    <Card variant="elevated" className="mb-4 mx-4">
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
            <View className="bg-brand/10 rounded-xl p-2 items-center">
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
            <View className="bg-success/10 rounded-xl p-2 items-center">
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
            <View className="bg-warning/10 rounded-xl p-2 items-center">
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

          <View className="w-[48%] mb-3 border border-text-muted/20 dark:border-dark-text-muted/20 rounded-xl">
            <View className="bg-info/10 rounded-xl p-2 items-center">
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
            <View className={`rounded-xl p-2 items-center ${
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
            <View className={`rounded-xl p-2 items-center ${
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
            <View className={`rounded-xl p-2 items-center ${
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
              {summary.totalProducts > 0 ? 
                Math.round(summary.totalPotentialProfit / summary.totalStockValue * 100) : 0}%
            </ThemedText>
          </View>
        </View>
      </CardContent>
    </Card>
  );

    const StockListItem = ({ product }: { product: ProductStock }) => (
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
            variant="outline"
            size="sm"
            onPress={() => handleQuickAction('adjust', product)}
            className="flex-1"
            icon="swap-vertical-outline"
          >
            Adjust
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => handleQuickAction('view', product)}
            icon="eye-outline"
          >Eye</Button>
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

    const QuickActions = () => (
    <Card variant="elevated" className="mx-4 mb-4 mt-2">
      <CardHeader
        title="Quick Actions"
        subtitle="Manage your inventory quickly"
      />
      <CardContent className="p-4">
        <View className="flex-row flex-wrap justify-between">
          <Button
            variant="outline"
            size="sm"
            onPress={() => router.push('/add-product')}
            icon="add-outline"
            className="w-[48%] mb-3"
          >
            Add Stock
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onPress={() => {/* Navigate to stock take */}}
            icon="clipboard-outline"
            className="w-[48%] mb-3"
          >
            Stock Take
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onPress={() => {/* Navigate to low stock report */}}
            icon="alert-circle-outline"
            className="w-[48%]"
          >
            Low Stock Report
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onPress={() => {/* Navigate to stock valuation */}}
            icon="bar-chart-outline"
            className="w-[48%]"
          >
            Stock Valuation
          </Button>
        </View>
      </CardContent>
    </Card>
  );


  // Update the handleQuickAction function
  const handleQuickAction = (action: 'add-stock' | 'adjust' | 'view', product: ProductStock) => {
    switch (action) {
      case 'add-stock':
        router.push(`/edit-product/${product.id}`);
        break;
      case 'adjust':
        router.push(`/edit-product/${product.id}`);
        break;
      case 'view':
        router.push(`/edit-product/${product.id}`);
        break;
    }
  };

  if(!currentShop?.id) {
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
    )
  }else{
      return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title={t('stock.title')}
        showBackButton
        searchable = {currentShop ? true : false}
        searchPlaceholder='Search for items in stock'
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
          paddingBottom: 100
        }}
        ListHeaderComponent={
          <>
            {/* Quick Actions */}
            {
              currentShop && (
                <QuickActions />
              )
            }
            
            {/* Enhanced Stock Summary */}
            {
              currentShop && filteredProducts?.length > 0 && (
                <EnhancedStockSummaryCard />
              )
            }

            {/* Filters and Search */}
            {/* <Card variant="elevated" className="mx-4 mb-4">
              <CardContent className="p-4">
                <SearchInput
                  placeholder="Search products by name, SKU, or category..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                />
              </CardContent>
            </Card> */}
          </>
        }
        renderItem={({ item }) => 
          viewMode === 'grid' ? 
          <StockGridItem product={item} /> : 
          <StockListItem product={item} />
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
        onPress={() => router.push('/edit-product/new')}
      >
        Add Product
      </FAB>
    </View>
  );
  }

}