// app/(tabs)/templates-products.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { useAuth } from '@/context/AuthContext';
import { BURUNDI_TEMPLATES } from '@/constants/templates';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

// Database
import database from '@/database';
import { Product } from '@/database/models/Product';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import CustomDialog from '@/components/ui/CustomDialog';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

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

const BATCH_SIZE = 30;

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const StatPill = ({
  value,
  label,
  color,
  isDark,
}: {
  value: number;
  label: string;
  color: [string, string];
  isDark: boolean;
}) => (
  <View className="flex-1 rounded-2xl overflow-hidden" style={{ minWidth: 72 }}>
    <LinearGradient
      colors={isDark
        ? [`${color[0]}18`, `${color[1]}0a`]
        : [`${color[0]}12`, `${color[1]}06`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="px-3 py-2.5 items-center border border-border dark:border-dark-border rounded-2xl"
    >
      <Text style={{ color: color[0] }} className="text-xl font-bold">
        {value}
      </Text>
      <Text className="text-text-muted dark:text-dark-text-muted text-xs mt-0.5 text-center">
        {label}
      </Text>
    </LinearGradient>
  </View>
);

const FilterChip = ({
  label,
  icon,
  selected,
  onPress,
  isDark,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
  isDark: boolean;
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
    {selected ? (
      <LinearGradient
        colors={isDark ? ['#38bdf8', '#818cf8'] : ['#0ea5e9', '#6366f1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center' }}
      >
        <Ionicons name={icon as any} size={13} color="white" style={{ marginRight: 4 }} />
        <Text className="text-white font-semibold text-xs">{label}</Text>
      </LinearGradient>
    ) : (
      <View className="flex-row items-center px-3 py-1.5 rounded-full bg-surface-muted dark:bg-dark-surface-muted border border-border dark:border-dark-border">
        <Ionicons name={icon as any} size={13} color={isDark ? '#64748b' : '#94a3b8'} style={{ marginRight: 4 }} />
        <Text className="text-text-muted dark:text-dark-text-muted text-xs">{label}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const SortTab = ({
  label,
  selected,
  onPress,
  isDark,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  isDark: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    className={`px-3 py-1 rounded-lg ${selected
      ? 'bg-brand-soft dark:bg-dark-brand-soft'
      : ''
    }`}
  >
    <Text
      className={`text-xs font-medium ${selected
        ? 'text-brand dark:text-dark-brand'
        : 'text-text-muted dark:text-dark-text-muted'
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// Status badge — no external Badge component needed
const StatusDot = ({ active }: { active: boolean }) => (
  <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${active ? 'bg-success dark:bg-dark-success' : 'bg-error dark:bg-dark-error'}`} />
);

const Tag = ({
  label,
  variant = 'default',
  isDark,
}: {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'brand' | 'default';
  isDark: boolean;
}) => {
  const styles: Record<string, { bg: string; text: string }> = {
    success: { bg: isDark ? 'bg-dark-success-soft' : 'bg-success-soft', text: isDark ? 'text-dark-success' : 'text-success' },
    warning: { bg: isDark ? 'bg-dark-warning-soft' : 'bg-warning-soft', text: isDark ? 'text-dark-warning' : 'text-warning' },
    error:   { bg: isDark ? 'bg-dark-error-soft'   : 'bg-error-soft',   text: isDark ? 'text-dark-error'   : 'text-error'   },
    brand:   { bg: isDark ? 'bg-dark-brand-soft'   : 'bg-brand-soft',   text: isDark ? 'text-dark-brand'   : 'text-brand'   },
    default: { bg: isDark ? 'bg-dark-surface-muted': 'bg-surface-muted', text: isDark ? 'text-dark-text-muted' : 'text-text-muted' },
  };
  const s = styles[variant];
  return (
    <View className={`px-2 py-0.5 rounded-md ${s.bg}`}>
      <Text className={`text-xs font-medium ${s.text}`}>{label}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// Product Card
// ─────────────────────────────────────────────

const ProductCard = React.memo(({
  item,
  isSelectMode,
  isSelected,
  onPress,
  onLongPress,
  onEdit,
  isDark,
}: {
  item: ProductWithTemplateInfo;
  isSelectMode: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onEdit: () => void;
  isDark: boolean;
}) => {
  const iconBg = item.templateColor ? `${item.templateColor}1a` : (isDark ? '#1e293b' : '#f1f5f9');
  const iconColor = item.templateColor || (isDark ? '#64748b' : '#94a3b8');

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.75}
    >
      <MotiView
        animate={{ scale: isSelected ? 0.985 : 1 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        <View
          className="mb-3 rounded-2xl overflow-hidden"
          style={{
            borderWidth: isSelected ? 2 : 1,
            borderColor: isSelected
              ? (isDark ? '#38bdf8' : '#0ea5e9')
              : (isDark ? '#475569' : '#e2e8f0'),
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            shadowColor: isSelected ? '#0ea5e9' : '#000',
            shadowOpacity: isSelected ? 0.18 : 0.05,
            shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
            shadowRadius: isSelected ? 12 : 4,
            elevation: isSelected ? 4 : 1,
          }}
        >
          <View className="p-4">
            <View className="flex-row items-start">

              {/* Icon */}
              <View
                style={{ backgroundColor: iconBg, borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
              >
                <Ionicons
                  name={(item.templateIcon as any) || 'cube-outline'}
                  size={22}
                  color={iconColor}
                />
              </View>

              {/* Content */}
              <View className="flex-1">
                {/* Name row */}
                <View className="flex-row items-center justify-between mb-1">
                  <Text
                    className="text-text dark:text-dark-text font-semibold text-base flex-1"
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>

                  {/* Select circle OR edit button */}
                  {isSelectMode ? (
                    <View
                      style={{
                        width: 22, height: 22, borderRadius: 11,
                        borderWidth: 2,
                        borderColor: isSelected ? (isDark ? '#38bdf8' : '#0ea5e9') : (isDark ? '#475569' : '#cbd5e1'),
                        backgroundColor: isSelected ? (isDark ? '#38bdf8' : '#0ea5e9') : 'transparent',
                        alignItems: 'center', justifyContent: 'center', marginLeft: 8,
                      }}
                    >
                      {isSelected && <Ionicons name="checkmark" size={13} color="white" />}
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={onEdit}
                      activeOpacity={0.7}
                      className="ml-2 p-1.5 rounded-lg bg-surface-muted dark:bg-dark-surface-muted"
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={15}
                        color={isDark ? '#94a3b8' : '#64748b'}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Meta row */}
                <View className="flex-row items-center mb-2">
                  <StatusDot active={item.isActive} />
                  <Text className={`text-xs mr-3 ${item.isActive ? 'text-success dark:text-dark-success' : 'text-error dark:text-dark-error'}`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Text>
                  {item.hasTemplate && (
                    <Text className="text-text-muted dark:text-dark-text-muted text-xs" numberOfLines={1}>
                      {item.templateName}
                    </Text>
                  )}
                  {!item.hasTemplate && (
                    <Text className="text-text-muted dark:text-dark-text-muted text-xs">Custom</Text>
                  )}
                  <Text className="text-text-muted dark:text-dark-text-muted text-xs ml-auto">
                    {item.createdAt.toLocaleDateString('fr-FR')}
                  </Text>
                </View>

                {/* Price row */}
                {(item.sellingPrice > 0 || item.costPrice > 0) && (
                  <View className="flex-row items-center mb-2">
                    {item.sellingPrice > 0 && (
                      <Text className="text-brand dark:text-dark-brand font-semibold text-sm mr-3">
                        {item.sellingPrice.toLocaleString()} FBU
                      </Text>
                    )}
                    {item.costPrice > 0 && (
                      <Text className="text-text-muted dark:text-dark-text-muted text-xs">
                        Cost: {item.costPrice.toLocaleString()}
                      </Text>
                    )}
                  </View>
                )}

                {/* Tags */}
                <View className="flex-row flex-wrap gap-1.5">
                  {item.isCustomized && (
                    <Tag label="Customized" variant="brand" isDark={isDark} />
                  )}
                  {item.stockQuantity > 0 && (
                    <Tag label={`Stock: ${item.stockQuantity}`} variant="warning" isDark={isDark} />
                  )}
                  {item.hasTemplate && (
                    <Tag label="Template" variant="default" isDark={isDark} />
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      </MotiView>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────

export default function TemplatesProductsScreen() {
  const router = useRouter();
  const { currentShop } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<ProductWithTemplateInfo[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('created');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog states (replacing Alert)
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchAction, setBatchAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Footer slide-up animation
  const footerAnim = useRef(new Animated.Value(80)).current;
  useEffect(() => {
    Animated.spring(footerAnim, {
      toValue: isSelectMode && selectedProducts.size > 0 ? 0 : 80,
      damping: 18, mass: 1, stiffness: 130, useNativeDriver: true,
    }).start();
  }, [isSelectMode, selectedProducts.size]);

  // Template lookup
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

  const checkIfCustomized = useCallback((product: Product): boolean => {
    if (product.costPricePerBase > 0) return true;
    if (product.sellingPricePerBase > 0) return true;
    if (product.stockQuantity && product.stockQuantity > 0) return true;
    if (product.lowStockThreshold !== 10) return true;
    if (product.category && product.category !== 'other') return true;
    if (product.description && product.description.trim().length > 0) return true;
    if (product.imageUrl && product.imageUrl.trim().length > 0) return true;
    return false;
  }, []);

  const processProductsBatch = useCallback(async (batch: Product[]): Promise<ProductWithTemplateInfo[]> => {
    return batch.map(product => {
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
        product,
        ...(templateInfo || {}),
      };
    });
  }, [templateLookup, checkIfCustomized]);

  const getTotalCount = useCallback(async () => {
    if (!currentShop) return 0;
    try {
      const count = await database.get<Product>('products')
        .query(Q.where('shop_id', currentShop.id))
        .fetchCount();
      setTotalCount(count);
      setHasMore(count > BATCH_SIZE);
      return count;
    } catch { return 0; }
  }, [currentShop]);

  const loadInitialBatch = useCallback(async () => {
    if (!currentShop) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    try {
      setLoading(true);
      setPage(1);
      await getTotalCount();
      const batch = await database.get<Product>('products')
        .query(Q.where('shop_id', currentShop.id), Q.take(BATCH_SIZE))
        .fetch();
      const processed = await processProductsBatch(batch);
      setProducts(processed);
      setHasMore(batch.length === BATCH_SIZE && totalCount > BATCH_SIZE);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setErrorMessage('Failed to load products');
        setShowErrorDialog(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentShop, getTotalCount, processProductsBatch, totalCount]);

  const loadMoreProducts = useCallback(async () => {
    if (!currentShop || !hasMore || loadingMore || loading || products.length >= totalCount) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const batch = await database.get<Product>('products')
        .query(Q.where('shop_id', currentShop.id), Q.skip((nextPage - 1) * BATCH_SIZE), Q.take(BATCH_SIZE))
        .fetch();
      if (batch.length === 0) { setHasMore(false); return; }
      const processed = await processProductsBatch(batch);
      setProducts(prev => [...prev, ...processed]);
      setPage(nextPage);
      setHasMore(batch.length === BATCH_SIZE && products.length + batch.length < totalCount);
    } catch { /* silent */ }
    finally { setLoadingMore(false); }
  }, [currentShop, page, hasMore, loadingMore, loading, products.length, totalCount, processProductsBatch]);

  const searchProducts = useCallback(async (query: string) => {
    if (!currentShop) return;
    try {
      setLoading(true);
      const results = await database.get<Product>('products')
        .query(Q.where('shop_id', currentShop.id), Q.where('name', Q.like(`%${query}%`)))
        .fetch();
      setProducts(await processProductsBatch(results));
      setHasMore(false);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [currentShop, processProductsBatch]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        searchProducts(searchQuery.trim());
      } else {
        loadInitialBatch();
      }
    }, 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  useEffect(() => {
    loadInitialBatch();
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInitialBatch();
  }, [loadInitialBatch]);

  // Filter + sort
  const filteredProducts = useMemo(() => {
    let list = [...products];
    switch (filter) {
      case 'active': list = list.filter(p => p.isActive); break;
      case 'inactive': list = list.filter(p => !p.isActive); break;
      case 'customized': list = list.filter(p => p.isCustomized); break;
      case 'withTemplate': list = list.filter(p => p.hasTemplate); break;
      case 'withoutTemplate': list = list.filter(p => !p.hasTemplate); break;
    }
    switch (sortBy) {
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'created': list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); break;
      case 'status': list.sort((a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1)); break;
      case 'price': list.sort((a, b) => b.sellingPrice - a.sellingPrice); break;
    }
    return list;
  }, [products, filter, sortBy]);

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => p.isActive).length,
    customized: products.filter(p => p.isCustomized).length,
    withTemplate: products.filter(p => p.hasTemplate).length,
  }), [products]);

  // Selection
  const toggleProductSelection = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProducts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAllProducts = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  }, [filteredProducts, selectedProducts.size]);

  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedProducts(new Set());
  }, []);

  // Batch ops
  const handleBatchActivate = useCallback(async () => {
    try {
      await database.write(async () => {
        await Promise.all(
          Array.from(selectedProducts).map(async id => {
            const p = products.find(p => p.id === id)?.product;
            if (p) await p.update(r => { r.isActive = true; });
          })
        );
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      exitSelectMode();
      loadInitialBatch();
    } catch {
      setErrorMessage('Failed to activate products');
      setShowErrorDialog(true);
    }
  }, [selectedProducts, products, exitSelectMode, loadInitialBatch]);

  const handleBatchDeactivate = useCallback(async () => {
    try {
      await database.write(async () => {
        await Promise.all(
          Array.from(selectedProducts).map(async id => {
            const p = products.find(p => p.id === id)?.product;
            if (p) await p.update(r => { r.isActive = false; });
          })
        );
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      exitSelectMode();
      loadInitialBatch();
    } catch {
      setErrorMessage('Failed to deactivate products');
      setShowErrorDialog(true);
    }
  }, [selectedProducts, products, exitSelectMode, loadInitialBatch]);

  const handleBatchDelete = useCallback(async () => {
    try {
      await database.write(async () => {
        await Promise.all(
          Array.from(selectedProducts).map(async id => {
            const p = products.find(p => p.id === id)?.product;
            if (p) await p.markAsDeleted();
          })
        );
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      exitSelectMode();
      loadInitialBatch();
    } catch {
      setErrorMessage('Failed to delete products');
      setShowErrorDialog(true);
    }
  }, [selectedProducts, products, exitSelectMode, loadInitialBatch]);

  const executeBatchAction = useCallback(async () => {
    setShowBatchDialog(false);
    if (!batchAction) return;
    if (batchAction === 'activate') await handleBatchActivate();
    else if (batchAction === 'deactivate') await handleBatchDeactivate();
    else if (batchAction === 'delete') await handleBatchDelete();
    setBatchAction(null);
  }, [batchAction, handleBatchActivate, handleBatchDeactivate, handleBatchDelete]);

  // Render item
  const renderProductItem = useCallback(({ item, index }: { item: ProductWithTemplateInfo; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: Math.min(index * 40, 300), type: 'spring', damping: 20 }}
    >
      <ProductCard
        item={item}
        isSelectMode={isSelectMode}
        isSelected={selectedProducts.has(item.id)}
        isDark={isDark}
        onPress={() => {
          if (isSelectMode) toggleProductSelection(item.id);
          else router.push(`/edit-product/${item.id}`);
        }}
        onLongPress={() => {
          setIsSelectMode(true);
          toggleProductSelection(item.id);
        }}
        onEdit={() => router.push(`/edit-product/${item.id}`)}
      />
    </MotiView>
  ), [isSelectMode, selectedProducts, isDark, toggleProductSelection, router]);

  const renderListFooter = useCallback(() =>
    loadingMore
      ? <View className="py-5 items-center"><ActivityIndicator size="small" color={isDark ? '#38bdf8' : '#0ea5e9'} /></View>
      : null
  , [loadingMore, isDark]);

  const renderEmptyState = useCallback(() => {
    if (loading) return <View className="py-12"><Loading /></View>;
    return (
      <EmptyState
        icon="cube-outline"
        title="No Products Found"
        description={
          searchQuery
            ? `No products matching "${searchQuery}"`
            : "You haven't added any products yet."
        }
        action={{
          label: searchQuery ? 'Clear Search' : 'Add Product',
          onPress: searchQuery
            ? () => setSearchQuery('')
            : () => router.push('/(auth)/add-product'),
        }}
      />
    );
  }, [loading, searchQuery, router]);

  // Config
  const filterOptions = [
    { value: 'all', label: 'All', icon: 'grid-outline' },
    { value: 'active', label: 'Active', icon: 'checkmark-circle-outline' },
    { value: 'inactive', label: 'Inactive', icon: 'pause-circle-outline' },
    { value: 'customized', label: 'Customized', icon: 'construct-outline' },
    { value: 'withTemplate', label: 'Template', icon: 'copy-outline' },
    { value: 'withoutTemplate', label: 'Custom', icon: 'cube-outline' },
  ];

  const sortOptions: { value: SortType; label: string }[] = [
    { value: 'created', label: 'Recent' },
    { value: 'name', label: 'A–Z' },
    { value: 'status', label: 'Status' },
    { value: 'price', label: 'Price' },
  ];

  // Batch dialog config
  const batchDialogConfig = useMemo(() => {
    if (!batchAction) return null;
    const cfg = {
      activate:   { title: 'Activate Products',   description: `Activate ${selectedProducts.size} selected product(s)?`,   variant: 'success' as const, icon: 'checkmark-circle', confirmLabel: 'Activate' },
      deactivate: { title: 'Deactivate Products', description: `Deactivate ${selectedProducts.size} selected product(s)?`, variant: 'warning' as const, icon: 'pause-circle',     confirmLabel: 'Deactivate' },
      delete:     { title: 'Delete Products',     description: `Permanently delete ${selectedProducts.size} product(s)? This cannot be undone.`, variant: 'error' as const, icon: 'trash', confirmLabel: 'Delete' },
    };
    return cfg[batchAction];
  }, [batchAction, selectedProducts.size]);

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface">

      {/* Header — no action prop */}
      <PremiumHeader title="My Products" showBackButton />

      {/* ── Stats Row ───────────────────────────── */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: 60, type: 'spring', damping: 18 }}
        className="px-4 pt-3 pb-2"
      >
        <View className="flex-row gap-2">
          <StatPill value={stats.total}        label="Total"     color={['#0ea5e9', '#38bdf8']} isDark={isDark} />
          <StatPill value={stats.active}       label="Active"    color={['#22c55e', '#4ade80']} isDark={isDark} />
          <StatPill value={stats.withTemplate} label="Templates" color={['#6366f1', '#818cf8']} isDark={isDark} />
          <StatPill value={stats.customized}   label="Custom"    color={['#f59e0b', '#fbbf24']} isDark={isDark} />
        </View>
      </MotiView>

      {/* ── Select Mode Bar ─────────────────────── */}
      {isSelectMode && (
        <MotiView
          from={{ opacity: 0, translateY: -6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="mx-4 mb-2 px-4 py-2.5 rounded-2xl flex-row items-center bg-brand-soft dark:bg-dark-brand-soft border border-brand/20"
        >
          <View className="flex-row items-center flex-1">
            <View className="w-2 h-2 rounded-full bg-brand dark:bg-dark-brand mr-2" />
            <Text className="text-brand dark:text-dark-brand text-sm font-semibold">
              {selectedProducts.size} selected
            </Text>
          </View>
          <TouchableOpacity onPress={selectAllProducts} activeOpacity={0.75} className="mr-4">
            <Text className="text-brand dark:text-dark-brand text-sm font-medium">
              {selectedProducts.size === filteredProducts.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={exitSelectMode} activeOpacity={0.75}>
            <Text className="text-text-muted dark:text-dark-text-muted text-sm">Cancel</Text>
          </TouchableOpacity>
        </MotiView>
      )}

      {/* ── Search + Filters ────────────────────── */}
      <View className="px-4 pb-3">
        {/* Search row */}
        <View className="flex-row gap-2 mb-3 items-center">
          <View className="flex-1">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon="search-outline"
            />
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.75}
            className="w-11 h-11 rounded-xl bg-surface dark:bg-dark-surface-soft border border-border dark:border-dark-border items-center justify-center"
          >
            {refreshing
              ? <ActivityIndicator size="small" color={isDark ? '#38bdf8' : '#0ea5e9'} />
              : <Ionicons name="refresh-outline" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
            }
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <View className="flex-row gap-2 pr-4">
            {filterOptions.map(opt => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                icon={opt.icon}
                selected={filter === opt.value}
                isDark={isDark}
                onPress={() => {
                  setFilter(opt.value as FilterType);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            ))}
          </View>
        </ScrollView>

        {/* Sort tabs */}
        <View className="flex-row items-center gap-1">
          <Text className="text-text-muted dark:text-dark-text-muted text-xs mr-1">Sort:</Text>
          {sortOptions.map(opt => (
            <SortTab
              key={opt.value}
              label={opt.label}
              selected={sortBy === opt.value}
              isDark={isDark}
              onPress={() => {
                setSortBy(opt.value);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          ))}
        </View>
      </View>

      {/* ── Product List ────────────────────────── */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: isSelectMode ? 120 : 100, flexGrow: 1 }}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderListFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#38bdf8' : '#0ea5e9'}
          />
        }
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.3}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        initialNumToRender={10}
        showsVerticalScrollIndicator={false}
      />

      {/* ── FAB ─────────────────────────────────── */}
      {!isSelectMode && (
        <MotiView
          from={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 16, delay: 200 }}
          className="absolute bottom-6 right-5"
        >
          <TouchableOpacity
            onPress={() => router.push('/(auth)/add-product')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isDark ? ['#38bdf8', '#818cf8'] : ['#0ea5e9', '#6366f1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 56, height: 56, borderRadius: 18,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: isDark ? '#38bdf8' : '#0ea5e9',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <Ionicons name="add" size={26} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>
      )}

      {/* ── Batch Action Footer ──────────────────── */}
      <Animated.View
        style={{ transform: [{ translateY: footerAnim }] }}
        className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-dark-surface border-t border-border dark:border-dark-border px-4 pt-3 pb-6"
      >
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => { setBatchAction('activate'); setShowBatchDialog(true); }}
            activeOpacity={0.8}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-success-soft dark:bg-dark-success-soft border border-success/20"
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={isDark ? '#4ade80' : '#22c55e'} />
            <Text className="text-success dark:text-dark-success font-semibold text-sm ml-1.5">Activate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setBatchAction('deactivate'); setShowBatchDialog(true); }}
            activeOpacity={0.8}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-warning-soft dark:bg-dark-warning-soft border border-warning/20"
          >
            <Ionicons name="pause-circle-outline" size={16} color={isDark ? '#fbbf24' : '#f59e0b'} />
            <Text className="text-warning dark:text-dark-warning font-semibold text-sm ml-1.5">Pause</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setBatchAction('delete'); setShowBatchDialog(true); }}
            activeOpacity={0.8}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-error-soft dark:bg-dark-error-soft border border-error/20"
          >
            <Ionicons name="trash-outline" size={16} color={isDark ? '#f87171' : '#ef4444'} />
            <Text className="text-error dark:text-dark-error font-semibold text-sm ml-1.5">Delete</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Dialogs ──────────────────────────────── */}
      {batchDialogConfig && (
        <CustomDialog
          visible={showBatchDialog}
          title={batchDialogConfig.title}
          description={batchDialogConfig.description}
          variant={batchDialogConfig.variant}
          icon={batchDialogConfig.icon}
          showCancel
          cancelLabel="Cancel"
          onCancel={() => { setShowBatchDialog(false); setBatchAction(null); }}
          actions={[{
            label: batchDialogConfig.confirmLabel,
            variant: batchAction === 'delete' ? 'destructive' : 'default',
            onPress: executeBatchAction,
          }]}
          onClose={() => { setShowBatchDialog(false); setBatchAction(null); }}
        />
      )}

      <CustomDialog
        visible={showErrorDialog}
        title="Something went wrong"
        description={errorMessage}
        variant="error"
        icon="alert-circle"
        actions={[{
          label: 'OK',
          variant: 'default',
          onPress: () => { setShowErrorDialog(false); setErrorMessage(''); },
        }]}
        onClose={() => { setShowErrorDialog(false); setErrorMessage(''); }}
      />
    </View>
  );
}