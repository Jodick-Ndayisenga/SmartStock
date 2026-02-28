// app/(tabs)/templates-products.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Alert,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { useAuth } from '@/context/AuthContext';
import { BURUNDI_TEMPLATES } from '@/constants/templates';
import { useColorScheme } from 'nativewind';

// Database
import database from '@/database';
import { Product } from '@/database/models/Product';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';

// Types
type ProductWithTemplateInfo = {
  id: string;
  name: string;
  templateId?: string;
  templateName?: string;
  templateIcon?: string;
  templateColor?: string;
  isActive: boolean;
  isCustomized: boolean;
  hasTemplate: boolean;
  category: string;
  sellingPrice: number;
  costPrice: number;
  stockQuantity: number;
  createdAt: Date;
  product: Product;
};

type FilterType = 'all' | 'active' | 'inactive' | 'customized' | 'withTemplate' | 'withoutTemplate';
type SortType = 'name' | 'created' | 'status' | 'price';

// Constants
const BATCH_SIZE = 30;

export default function TemplatesProductsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentShop } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // States
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<ProductWithTemplateInfo[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('created');
  const [batchAction, setBatchAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Build template lookup map for efficient matching (optional enrichment)
  const templateLookup = useMemo(() => {
    const lookup = new Map();
    BURUNDI_TEMPLATES.forEach(template => {
      template.products.forEach(product => {
        lookup.set(product.name.toLowerCase(), {
          templateId: template.id,
          templateName: template.name,
          templateIcon: template.icon,
          templateColor: template.color,
        });
      });
    });
    return lookup;
  }, []);

  // Check if product has been customized (has non-default values)
  const checkIfCustomized = useCallback((product: Product): boolean => {
    // Consider a product customized if it has any non-zero prices or stock
    if (product.costPricePerBase > 0) return true;
    if (product.sellingPricePerBase > 0) return true;
    if (product.stockQuantity && product.stockQuantity > 0) return true;
    if (product.lowStockThreshold !== 10) return true;
    if (product.category && product.category !== 'other') return true;
    if (product.description && product.description.trim().length > 0) return true;
    if (product.imageUrl && product.imageUrl.trim().length > 0) return true;
    
    return false;
  }, []);

  // Process batch of products (always show ALL products, optionally enrich with template data)
  const processProductsBatch = useCallback(async (productsBatch: Product[]): Promise<ProductWithTemplateInfo[]> => {
    return productsBatch.map(product => {
      // Check if this product matches any template (optional enrichment)
      const templateInfo = templateLookup.get(product.name.toLowerCase());
      
      return {
        id: product.id,
        name: product.name,
        isActive: product.isActive,
        isCustomized: checkIfCustomized(product),
        hasTemplate: !!templateInfo,
        category: product.category || 'other',
        sellingPrice: product.sellingPricePerBase || 0,
        costPrice: product.costPricePerBase || 0,
        stockQuantity: product.stockQuantity || 0,
        createdAt: new Date(product.createdAt || Date.now()),
        product: product,
        // Add template info if available (for display purposes)
        ...(templateInfo && {
          templateId: templateInfo.templateId,
          templateName: templateInfo.templateName,
          templateIcon: templateInfo.templateIcon,
          templateColor: templateInfo.templateColor,
        }),
      };
    });
  }, [templateLookup, checkIfCustomized]);

  // Get total count for pagination
  const getTotalCount = useCallback(async () => {
    if (!currentShop) return 0;
    
    try {
      const count = await database.get<Product>('products')
        .query(
          Q.where('shop_id', currentShop.id)
        )
        .fetchCount();
      
      setTotalCount(count);
      setHasMore(count > BATCH_SIZE);
      return count;
    } catch (error) {
      console.error('Error getting total count:', error);
      return 0;
    }
  }, [currentShop]);

  // Load initial batch
  const loadInitialBatch = useCallback(async () => {
    if (!currentShop) return;

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setPage(1);
      
      await getTotalCount();
      
      const batch = await database.get<Product>('products')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.take(BATCH_SIZE)
        )
        .fetch();

      const processedBatch = await processProductsBatch(batch);
      setProducts(processedBatch);
      setHasMore(batch.length === BATCH_SIZE && totalCount > BATCH_SIZE);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error loading initial batch:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentShop, getTotalCount, processProductsBatch, totalCount]);

  // Load more products (pagination)
  const loadMoreProducts = useCallback(async () => {
    if (!currentShop || !hasMore || loadingMore || loading || products.length >= totalCount) return;

    try {
      setLoadingMore(true);
      
      const nextPage = page + 1;
      const batch = await database.get<Product>('products')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.skip((nextPage - 1) * BATCH_SIZE),
          Q.take(BATCH_SIZE)
        )
        .fetch();

      if (batch.length === 0) {
        setHasMore(false);
        return;
      }

      const processedBatch = await processProductsBatch(batch);
      
      setProducts(prev => [...prev, ...processedBatch]);
      setPage(nextPage);
      setHasMore(batch.length === BATCH_SIZE && products.length + batch.length < totalCount);
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [currentShop, page, hasMore, loadingMore, loading, products.length, totalCount, processProductsBatch]);

  // Search products
  const searchProducts = useCallback(async (query: string) => {
    if (!currentShop) return;

    try {
      setLoading(true);
      
      const searchResults = await database.get<Product>('products')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('name', Q.like(`%${query}%`))
        )
        .fetch();

      const processedResults = await processProductsBatch(searchResults);
      setProducts(processedResults);
      setHasMore(false); // Disable pagination during search
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  }, [currentShop, processProductsBatch]);

  useEffect(() => {
  let timeoutId: NodeJS.Timeout | null = null;

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  timeoutId = setTimeout(() => {
    // Your code here
  }, 500);

  searchTimeoutRef.current = timeoutId;

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}, [searchQuery, debouncedSearch, searchProducts, loadInitialBatch]);

  // Initial load
  useEffect(() => {
    loadInitialBatch();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadInitialBatch]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInitialBatch();
  }, [loadInitialBatch]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Apply status filter
    if (filter !== 'all') {
      switch (filter) {
        case 'active':
          filtered = filtered.filter(p => p.isActive);
          break;
        case 'inactive':
          filtered = filtered.filter(p => !p.isActive);
          break;
        case 'customized':
          filtered = filtered.filter(p => p.isCustomized);
          break;
        case 'withTemplate':
          filtered = filtered.filter(p => p.hasTemplate);
          break;
        case 'withoutTemplate':
          filtered = filtered.filter(p => !p.hasTemplate);
          break;
      }
    }

    // Apply sorting
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'created':
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'status':
        filtered.sort((a, b) => {
          if (a.isActive === b.isActive) return 0;
          return a.isActive ? -1 : 1;
        });
        break;
      case 'price':
        filtered.sort((a, b) => b.sellingPrice - a.sellingPrice);
        break;
    }

    return filtered;
  }, [products, filter, sortBy]);

  // Quick stats
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => p.isActive).length;
    const customized = products.filter(p => p.isCustomized).length;
    const withTemplate = products.filter(p => p.hasTemplate).length;

    return { total, active, customized, withTemplate };
  }, [products]);

  // Handle product selection
  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(productId)) {
        newSelected.delete(productId);
      } else {
        newSelected.add(productId);
      }
      return newSelected;
    });
  }, []);

  const selectAllProducts = useCallback(() => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      const allIds = new Set(filteredProducts.map(p => p.id));
      setSelectedProducts(allIds);
    }
  }, [filteredProducts, selectedProducts.size]);

  // Batch actions
  const handleBatchActivate = useCallback(async () => {
    try {
      await database.write(async () => {
        const updates = Array.from(selectedProducts).map(async (productId) => {
          const product = products.find(p => p.id === productId)?.product;
          if (product) {
            await product.update(record => {
              record.isActive = true;
            });
          }
        });
        await Promise.all(updates);
      });

      Alert.alert('Success', `${selectedProducts.size} products activated`);
      setSelectedProducts(new Set());
      setIsSelectMode(false);
      loadInitialBatch();
    } catch (error) {
      console.error('Error activating products:', error);
      Alert.alert('Error', 'Failed to activate products');
    }
  }, [selectedProducts, products, loadInitialBatch]);

  const handleBatchDeactivate = useCallback(async () => {
    try {
      await database.write(async () => {
        const updates = Array.from(selectedProducts).map(async (productId) => {
          const product = products.find(p => p.id === productId)?.product;
          if (product) {
            await product.update(record => {
              record.isActive = false;
            });
          }
        });
        await Promise.all(updates);
      });

      Alert.alert('Success', `${selectedProducts.size} products deactivated`);
      setSelectedProducts(new Set());
      setIsSelectMode(false);
      loadInitialBatch();
    } catch (error) {
      console.error('Error deactivating products:', error);
      Alert.alert('Error', 'Failed to deactivate products');
    }
  }, [selectedProducts, products, loadInitialBatch]);

  const handleBatchDelete = useCallback(async () => {
    Alert.alert(
      'Confirm Delete',
      `Delete ${selectedProducts.size} products? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                const deletes = Array.from(selectedProducts).map(async (productId) => {
                  const product = products.find(p => p.id === productId)?.product;
                  if (product) {
                    await product.markAsDeleted();
                  }
                });
                await Promise.all(deletes);
              });

              Alert.alert('Success', `${selectedProducts.size} products deleted`);
              setSelectedProducts(new Set());
              setIsSelectMode(false);
              loadInitialBatch();
            } catch (error) {
              console.error('Error deleting products:', error);
              Alert.alert('Error', 'Failed to delete products');
            }
          }
        }
      ]
    );
  }, [selectedProducts, products, loadInitialBatch]);

  // Navigation
  const navigateToCustomize = useCallback((productId: string) => {
    router.push(`/edit-product/${productId}`);
  }, [router]);



  const navigateToAddFromTemplates = useCallback(() => {
    router.push('/(auth)/add-product');
  }, [router]);

  // Render product item
  const renderProductItem = useCallback(({ item }: { item: ProductWithTemplateInfo }) => {
    const isSelected = selectedProducts.has(item.id);

    return (
      <TouchableOpacity
        onPress={() => {
          if (isSelectMode) {
            toggleProductSelection(item.id);
          } else {
            navigateToCustomize(item.id);
          }
        }}
        onLongPress={() => {
          setIsSelectMode(true);
          toggleProductSelection(item.id);
        }}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <Card className={`mb-3 ${isSelected ? 'border-2 border-brand' : ''}`}>
          <CardContent className="p-4">
            <View className="flex-row items-start">
              {/* Icon - Show template icon if available, otherwise default product icon */}
              <View 
                className="w-10 h-10 rounded-lg items-center justify-center mr-3 mt-1"
                style={{ backgroundColor: item.templateColor ? `${item.templateColor}20` : '#94a3b820' }}
              >
                <Ionicons 
                  name={item.templateIcon ? (item.templateIcon as any) : 'cube-outline'} 
                  size={20} 
                  color={item.templateColor || '#94a3b8'} 
                />
              </View>

              {/* Product Info */}
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-1">
                  <ThemedText variant="subheading" size="base" className="font-semibold flex-1" numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  {isSelectMode && (
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ml-2 ${
                      isSelected 
                        ? 'bg-brand border-brand' 
                        : 'border-border dark:border-dark-border'
                    }`}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>
                  )}
                </View>

                <View className="flex-row items-center mb-2 flex-wrap">
                  {item.hasTemplate ? (
                    <>
                      <ThemedText variant="muted" size="xs">
                        From: {item.templateName}
                      </ThemedText>
                      <View className="w-1 h-1 rounded-full bg-gray-400 mx-2" />
                    </>
                  ) : (
                    <>
                      <Badge variant="default" size="sm" className="mr-2">
                        Custom Product
                      </Badge>
                    </>
                  )}
                  <ThemedText variant="muted" size="xs">
                    {item.createdAt.toLocaleDateString('fr-FR')}
                  </ThemedText>
                </View>

                {/* Price Info */}
                {(item.sellingPrice > 0 || item.costPrice > 0) && (
                  <View className="flex-row mb-2">
                    {item.sellingPrice > 0 && (
                      <ThemedText variant="default" size="sm" className="font-semibold text-brand mr-3">
                        {item.sellingPrice.toLocaleString()} FBU
                      </ThemedText>
                    )}
                    {item.costPrice > 0 && (
                      <ThemedText variant="muted" size="xs">
                        Cost: {item.costPrice.toLocaleString()} FBU
                      </ThemedText>
                    )}
                  </View>
                )}

                {/* Status Badges */}
                <View className="flex-row flex-wrap gap-2 mb-3">
                  <Badge variant={item.isActive ? "success" : "error"} size="sm">
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  
                  <Badge variant={item.isCustomized ? "success" : "default"} size="sm">
                    {item.isCustomized ? 'Customized' : 'Default'}
                  </Badge>

                  {item.stockQuantity > 0 && (
                    <Badge variant="warning" size="sm">
                      Stock: {item.stockQuantity}
                    </Badge>
                  )}

                  {item.hasTemplate && (
                    <Badge variant="outline" size="sm">
                      From Template
                    </Badge>
                  )}
                </View>

                {/* Quick Actions (only in normal mode) */}
                {!isSelectMode && (
                  <View className="flex-row gap-2">
                   
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => navigateToCustomize(item.id)}
                      icon="pencil-outline"
                      className="flex-1"
                    >
                      Edit this product
                    </Button>
                  </View>
                )}
              </View>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  }, [isSelectMode, selectedProducts, toggleProductSelection, navigateToCustomize]);

  // List footer
  const renderListFooter = useCallback(() => {
    if (!loadingMore) return null;
    
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }, [loadingMore]);

  // Empty state
  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View className="py-8">
          <Loading />
        </View>
      );
    }

    return (
      <EmptyState
        icon="cube-outline"
        title="No Products Found"
        description={
          searchQuery
            ? `No products matching "${searchQuery}"`
            : "You haven't added any products yet. Add your first product to get started."
        }
        action={{
          label: searchQuery ? "Clear Search" : "Add Product",
          onPress: searchQuery 
            ? () => {
                setSearchQuery('');
                loadInitialBatch();
              }
            : navigateToAddFromTemplates
        }}
      />
    );
  }, [loading, searchQuery, loadInitialBatch, navigateToAddFromTemplates]);

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All', icon: 'grid-outline' },
    { value: 'active', label: 'Active', icon: 'checkmark-circle-outline' },
    { value: 'inactive', label: 'Inactive', icon: 'pause-circle-outline' },
    { value: 'customized', label: 'Customized', icon: 'construct-outline' },
    { value: 'withTemplate', label: 'From Template', icon: 'copy-outline' },
    { value: 'withoutTemplate', label: 'Custom', icon: 'cube-outline' },
  ];

  // Sort options
  const sortOptions = [
    { value: 'created', label: 'Recent' },
    { value: 'name', label: 'Name' },
    { value: 'status', label: 'Status' },
    { value: 'price', label: 'Price' },
  ];

  // Batch action modal
  const renderBatchActionModal = useCallback(() => {
    if (!batchAction || selectedProducts.size === 0) return null;

    const actions = {
      activate: {
        title: 'Activate Products',
        description: `Activate ${selectedProducts.size} selected products?`,
        confirmText: 'Activate',
        action: handleBatchActivate,
        color: 'success' as const,
        icon: 'checkmark-circle' as const
      },
      deactivate: {
        title: 'Deactivate Products',
        description: `Deactivate ${selectedProducts.size} selected products?`,
        confirmText: 'Deactivate',
        action: handleBatchDeactivate,
        color: 'warning' as const,
        icon: 'pause-circle' as const
      },
      delete: {
        title: 'Delete Products',
        description: `Permanently delete ${selectedProducts.size} selected products? This cannot be undone.`,
        confirmText: 'Delete',
        action: handleBatchDelete,
        color: 'error' as const,
        icon: 'trash' as const
      }
    };

    const currentAction = actions[batchAction];

    return (
      <View className="absolute inset-0 bg-black/50 justify-center items-center z-50">
        <Card className="w-11/12 max-w-md">
          <CardContent className="p-6">
            <View className="items-center mb-4">
              <View className={`w-12 h-12 rounded-full bg-${currentAction.color}/10 items-center justify-center mb-3`}>
                <Ionicons 
                  name={currentAction.icon} 
                  size={24} 
                  color={
                    batchAction === 'activate' ? '#10B981' :
                    batchAction === 'deactivate' ? '#F59E0B' : '#EF4444'
                  } 
                />
              </View>
              <ThemedText variant="subheading" size="lg" className="text-center">
                {currentAction.title}
              </ThemedText>
              <ThemedText variant="muted" size="sm" className="text-center mt-2">
                {currentAction.description}
              </ThemedText>
            </View>

            <View className="flex-row gap-3">
              <Button
                variant="outline"
                onPress={() => setBatchAction(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant={batchAction === 'delete' ? 'destructive' : 'default'}
                onPress={() => {
                  currentAction.action();
                  setBatchAction(null);
                }}
                className="flex-1"
              >
                {currentAction.confirmText}
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>
    );
  }, [batchAction, selectedProducts.size, handleBatchActivate, handleBatchDeactivate, handleBatchDelete]);

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title="My Products"
        showBackButton
        action={
          isSelectMode ? (
            <View className="flex-row items-center gap-2">
              <TouchableOpacity onPress={selectAllProducts}>
                <ThemedText variant="brand" size="sm">
                  {selectedProducts.size === filteredProducts.length ? 'Deselect All' : 'Select All'}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setIsSelectMode(false);
                setSelectedProducts(new Set());
              }}>
                <ThemedText variant="muted" size="sm">
                  Cancel
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setIsSelectMode(true)}>
              <ThemedText variant="brand" size="sm">
                Select
              </ThemedText>
            </TouchableOpacity>
          )
        }
      />

      {/* Quick Stats */}
      <View className="px-4 py-3">
        <View className="flex-row gap-2">
          <Card className="flex-1">
            <CardContent className="p-3">
              <ThemedText variant="heading" size="lg" className="font-bold text-brand">
                {stats.total}
              </ThemedText>
              <ThemedText variant="muted" size="xs">
                Total Products
              </ThemedText>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-3">
              <ThemedText variant="heading" size="lg" className="font-bold text-green-600">
                {stats.active}
              </ThemedText>
              <ThemedText variant="muted" size="xs">
                Active
              </ThemedText>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-3">
              <ThemedText variant="heading" size="lg" className="font-bold text-purple-600">
                {stats.withTemplate}
              </ThemedText>
              <ThemedText variant="muted" size="xs">
                From Templates
              </ThemedText>
            </CardContent>
          </Card>
        </View>
      </View>

      {/* Search and Filters */}
      <View className="px-4 py-3 border-b border-border dark:border-dark-border bg-surface dark:bg-dark-surface">
        <View className="flex-row gap-3 mb-3">
          <View className="flex-1">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon="search-outline"
            />
          </View>
          
          <Button
            variant="outline"
            size="sm"
            onPress={onRefresh}
            loading={refreshing}
            icon="refresh-outline"
          >
            {""}
          </Button>
        </View>

        <View className="flex-row gap-2">
          <FlatList
            horizontal
            data={filterOptions}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setFilter(item.value as FilterType)}
                className={`px-3 py-2 rounded-full flex-row items-center mr-2 ${
                  filter === item.value
                    ? 'bg-brand'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <Ionicons 
                  name={item.icon as any} 
                  size={16} 
                  color={
                    filter === item.value
                      ? 'white'
                      : (isDark ? '#94a3b8' : '#64748b')
                  } 
                />
                <ThemedText
                  variant={filter === item.value ? "label" : "default"}
                  size="sm"
                  className="ml-1"
                >
                  {item.label}
                </ThemedText>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.value}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        {/* Sort Options */}
        <View className="flex-row justify-end mt-2">
          <View className="flex-row gap-2">
            {sortOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setSortBy(option.value as SortType)}
                className={`px-3 py-1 rounded-sm ${
                  sortBy === option.value
                    ? 'bg-brand/20'
                    : ''
                }`}
              >
                <ThemedText
                  variant={sortBy === option.value ? "brand" : "muted"}
                  size="xs"
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderListFooter}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={isDark ? '#fff' : '#000'}
          />
        }
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.3}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        initialNumToRender={10}
        showsVerticalScrollIndicator={false}
      />

      {/* Batch Actions Bar */}
      {isSelectMode && selectedProducts.size > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-dark-surface border-t border-border dark:border-dark-border p-4">
          <View className="flex-row justify-between items-center">
            <ThemedText variant="default" size="sm">
              {selectedProducts.size} selected
            </ThemedText>
            
            <View className="flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onPress={() => setBatchAction('activate')}
                icon="checkmark-circle-outline"
                disabled={selectedProducts.size === 0}
              >
                Activate
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onPress={() => setBatchAction('deactivate')}
                icon="pause-circle-outline"
                disabled={selectedProducts.size === 0}
              >
                Deactivate
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onPress={() => setBatchAction('delete')}
                icon="trash-outline"
                disabled={selectedProducts.size === 0}
              >
                Delete
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Add Products Button */}
      {!isSelectMode && (
        <TouchableOpacity
          onPress={navigateToAddFromTemplates}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-brand items-center justify-center shadow-lg"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Batch Action Modal */}
      {renderBatchActionModal()}
    </View>
  );
}