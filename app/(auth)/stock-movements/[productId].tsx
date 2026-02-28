// app/stock-movements/[productId].tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Modal,
  TextInput as RNTextInput
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from 'nativewind';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Models
import { Product } from '@/database/models/Product';
import { StockMovement, MovementType } from '@/database/models/StockMovement';

// Unit Conversion
import { getUnitInfo } from '@/utils/unitConversions';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';

// ============================================================================
// TYPES
// ============================================================================

interface MovementWithProduct {
  id: string;
  productId: string;
  productName: string;
  productUnit: string;
  quantity: number;
  movementType: MovementType;
  batchNumber?: string;
  expiryDate?: number;
  supplierId?: string;
  customerId?: string;
  referenceId?: string;
  notes?: string;
  recordedBy?: string;
  timestamp: number;
}

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'all';
type SortOrder = 'newest' | 'oldest' | 'largest' | 'smallest';

// ============================================================================
// CONSTANTS
// ============================================================================

const MOVEMENT_TYPE_CONFIG = {
  IN: {
    label: 'Entrée',
    icon: 'arrow-down-circle',
    color: '#22c55e',
    bgColor: 'bg-success/10',
    textColor: 'text-success',
    borderColor: 'border-success/20',
  },
  SALE: {
    label: 'Vente',
    icon: 'cart',
    color: '#0ea5e9',
    bgColor: 'bg-brand/10',
    textColor: 'text-brand',
    borderColor: 'border-brand/20',
  },
  ADJUSTMENT: {
    label: 'Ajustement',
    icon: 'sync',
    color: '#f59e0b',
    bgColor: 'bg-warning/10',
    textColor: 'text-warning',
    borderColor: 'border-warning/20',
  },
  TRANSFER_OUT: {
    label: 'Transfert sortant',
    icon: 'arrow-up-circle',
    color: '#ef4444',
    bgColor: 'bg-error/10',
    textColor: 'text-error',
    borderColor: 'border-error/20',
  },
  TRANSFER_IN: {
    label: 'Transfert entrant',
    icon: 'arrow-down-circle',
    color: '#8b5cf6',
    bgColor: 'bg-purple/10',
    textColor: 'text-purple',
    borderColor: 'border-purple/20',
  },
};

const TIME_FILTERS = [
  { value: 'today', label: 'Aujourd\'hui' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'year', label: 'Cette année' },
  { value: 'all', label: 'Tout' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récent' },
  { value: 'oldest', label: 'Plus ancien' },
  { value: 'largest', label: 'Plus grande quantité' },
  { value: 'smallest', label: 'Plus petite quantité' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StockMovementsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { currentShop, user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const productId = params.productId as string;

  // States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<MovementWithProduct[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<MovementWithProduct[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MovementType | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [showFilters, setShowFilters] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    totalIn: 0,
    totalOut: 0,
    netChange: 0,
    totalValue: 0,
    averagePrice: 0,
    movementCount: 0,
  });

  // New movement modal
  const [showNewMovement, setShowNewMovement] = useState(false);
  const [newMovement, setNewMovement] = useState({
    type: 'IN' as MovementType,
    quantity: 1,
    notes: '',
    batchNumber: '',
    expiryDate: '',
  });

  // ==========================================================================
  // LOAD DATA
  // ==========================================================================

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load product
      const products = await database.get<Product>('products')
        .query(Q.where('id', productId))
        .fetch();

      if (products.length === 0) {
        throw new Error('Product not found');
      }

      const p = products[0];
      setProduct(p);

      // Load stock movements
      const movementsCollection = database.get<StockMovement>('stock_movements');
      const allMovements = await movementsCollection
        .query(
          Q.where('product_id', productId),
          Q.where('shop_id', currentShop?.id || ''),
          Q.sortBy('timestamp', Q.desc)
        )
        .fetch();

      // Transform movements with product info
      const transformedMovements: MovementWithProduct[] = allMovements.map(m => ({
        id: m.id,
        productId: m.productId,
        productName: p.name,
        productUnit: p.baseUnit,
        quantity: m.quantity,
        movementType: m.movementType,
        batchNumber: m.batchNumber,
        expiryDate: m.expiryDate,
        supplierId: m.supplierId,
        customerId: m.customerId,
        referenceId: m.referenceId,
        notes: m.notes,
        recordedBy: m.recordedBy,
        timestamp: m.timestamp,
      }));

      setMovements(transformedMovements);
      
      // Calculate stats
      calculateStats(transformedMovements, p);
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [productId, currentShop?.id]);

  // ==========================================================================
  // CALCULATE STATS
  // ==========================================================================

  const calculateStats = (movs: MovementWithProduct[], prod: Product) => {
    let totalIn = 0;
    let totalOut = 0;
    let totalValue = 0;

    movs.forEach(m => {
      if (m.movementType === 'IN' || m.movementType === 'TRANSFER_IN') {
        totalIn += Math.abs(m.quantity);
      } else if (m.movementType === 'SALE' || m.movementType === 'TRANSFER_OUT') {
        totalOut += Math.abs(m.quantity);
      } else if (m.movementType === 'ADJUSTMENT') {
        if (m.quantity > 0) totalIn += m.quantity;
        else totalOut += Math.abs(m.quantity);
      }
    });

    const netChange = totalIn - totalOut;
    const currentStockValue = (prod.stockQuantity || 0) * prod.costPricePerBase;
    const avgPrice = totalIn > 0 ? totalValue / totalIn : 0;

    setStats({
      totalIn,
      totalOut,
      netChange,
      totalValue: currentStockValue,
      averagePrice: avgPrice,
      movementCount: movs.length,
    });
  };

  // ==========================================================================
  // FILTER AND SORT MOVEMENTS
  // ==========================================================================

  const applyFilters = useCallback(() => {
    let filtered = [...movements];

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(m => m.movementType === selectedType);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.notes?.toLowerCase().includes(query) ||
        m.batchNumber?.toLowerCase().includes(query) ||
        m.referenceId?.toLowerCase().includes(query)
      );
    }

    // Filter by time
    if (timeFilter !== 'all') {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      switch (timeFilter) {
        case 'today':
          filtered = filtered.filter(m => m.timestamp > now - oneDay);
          break;
        case 'week':
          filtered = filtered.filter(m => m.timestamp > now - 7 * oneDay);
          break;
        case 'month':
          filtered = filtered.filter(m => m.timestamp > now - 30 * oneDay);
          break;
        case 'year':
          filtered = filtered.filter(m => m.timestamp > now - 365 * oneDay);
          break;
      }
    }

    // Sort
    switch (sortOrder) {
      case 'newest':
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'largest':
        filtered.sort((a, b) => Math.abs(b.quantity) - Math.abs(a.quantity));
        break;
      case 'smallest':
        filtered.sort((a, b) => Math.abs(a.quantity) - Math.abs(b.quantity));
        break;
    }

    setFilteredMovements(filtered);
  }, [movements, selectedType, searchQuery, timeFilter, sortOrder]);

  useEffect(() => {
    applyFilters();
  }, [movements, selectedType, searchQuery, timeFilter, sortOrder]);

  // ==========================================================================
  // CREATE NEW MOVEMENT
  // ==========================================================================

  const createMovement = async () => {
    if (!product || !currentShop || !user) return;

    if (newMovement.quantity <= 0) {
      Alert.alert('Erreur', 'La quantité doit être supérieure à 0');
      return;
    }

    // Check if enough stock for outgoing movements
    if ((newMovement.type === 'SALE' || newMovement.type === 'TRANSFER_OUT' || newMovement.type === 'ADJUSTMENT') && 
        newMovement.quantity > (product.stockQuantity || 0)) {
      Alert.alert(
        'Stock insuffisant',
        `Vous ne pouvez pas retirer ${newMovement.quantity} ${product.baseUnit} alors que le stock actuel est de ${product.stockQuantity} ${product.baseUnit}`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await database.write(async () => {
        // Create stock movement
        await database.get<StockMovement>('stock_movements').create(m => {
          m.productId = product.id;
          m.shopId = currentShop.id;
          m.quantity = newMovement.type === 'IN' ? newMovement.quantity : -newMovement.quantity;
          m.movementType = newMovement.type;
          m.batchNumber = newMovement.batchNumber || undefined;
          m.expiryDate = newMovement.expiryDate ? new Date(newMovement.expiryDate).getTime() : undefined;
          m.notes = newMovement.notes;
          m.recordedBy = user.id;
          m.timestamp = Date.now();
        });

        // Update product stock
        let newStockQuantity = product.stockQuantity || 0;
        if (newMovement.type === 'IN' || newMovement.type === 'TRANSFER_IN') {
          newStockQuantity += newMovement.quantity;
        } else {
          newStockQuantity -= newMovement.quantity;
        }

        await product.update(p => {
          p.stockQuantity = Math.max(0, newStockQuantity);
        });
      });

      // Reset form and refresh data
      setNewMovement({
        type: 'IN',
        quantity: 1,
        notes: '',
        batchNumber: '',
        expiryDate: '',
      });
      setShowNewMovement(false);
      loadData();

      Alert.alert('Succès', 'Mouvement de stock enregistré');
    } catch (error) {
      console.error('Error creating movement:', error);
      Alert.alert('Erreur', 'Impossible de créer le mouvement');
    }
  };

  // ==========================================================================
  // FORMAT HELPERS
  // ==========================================================================

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'dd MMM yyyy HH:mm', { locale: fr });
  };

  const formatQuantity = (quantity: number, unit: string) => {
    const absQuantity = Math.abs(quantity);
    return `${absQuantity.toFixed(2)} ${unit}`;
  };

  const formatCurrency = (value: number) => {
    return `${value.toFixed(2)} FBU`;
  };

  // ==========================================================================
  // RENDER MOVEMENT ITEM
  // ==========================================================================

  const renderMovementItem = ({ item }: { item: MovementWithProduct }) => {
    const config = MOVEMENT_TYPE_CONFIG[item.movementType];
    const isPositive = item.quantity > 0;
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          // Show movement details
          Alert.alert(
            'Détails du mouvement',
            `
            Type: ${config.label}
            Quantité: ${formatQuantity(item.quantity, item.productUnit)}
            Date: ${formatDate(item.timestamp)}
            ${item.batchNumber ? `Lot: ${item.batchNumber}` : ''}
            ${item.expiryDate ? `Expiration: ${formatDate(item.expiryDate)}` : ''}
            ${item.notes ? `Notes: ${item.notes}` : ''}
            ${item.referenceId ? `Réf: ${item.referenceId}` : ''}
            `,
            [{ text: 'OK' }]
          );
        }}
      >
        <Card className="mb-3">
          <CardContent className="p-4">
            {/* Header row */}
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-row items-center gap-2">
                <View className={`w-10 h-10 rounded-full ${config.bgColor} items-center justify-center`}>
                  <Ionicons name={config.icon as any} size={20} color={config.color} />
                </View>
                <View>
                  <ThemedText variant="default" size="sm" className="font-semibold">
                    {config.label}
                  </ThemedText>
                  <ThemedText variant="muted" size="xs">
                    {formatDate(item.timestamp)}
                  </ThemedText>
                </View>
              </View>
              
              {/* Quantity badge */}
              <View className={`
                px-3 py-1.5 rounded-full
                ${isPositive ? 'bg-success/10' : 'bg-error/10'}
              `}>
                <ThemedText 
                  variant={isPositive ? 'success' : 'error'} 
                  size="sm"
                  className="font-semibold"
                >
                  {isPositive ? '+' : '-'}{formatQuantity(item.quantity, item.productUnit)}
                </ThemedText>
              </View>
            </View>

            {/* Additional info */}
            {(item.batchNumber || item.referenceId || item.notes) && (
              <View className="mt-2 pt-2 border-t border-border dark:border-dark-border">
                {item.batchNumber && (
                  <View className="flex-row items-center gap-2 mb-1">
                    <Ionicons name="cube-outline" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                    <ThemedText variant="muted" size="xs">
                      Lot: {item.batchNumber}
                    </ThemedText>
                  </View>
                )}
                {item.referenceId && (
                  <View className="flex-row items-center gap-2 mb-1">
                    <Ionicons name="receipt-outline" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                    <ThemedText variant="muted" size="xs">
                      Réf: {item.referenceId}
                    </ThemedText>
                  </View>
                )}
                {item.notes && (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="document-text-outline" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                    <ThemedText variant="muted" size="xs" numberOfLines={1} className="flex-1">
                      {item.notes}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (loading) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Mouvements de stock" showBackButton />
        <Loading />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Erreur" showBackButton />
        <EmptyState
          icon="alert-circle-outline"
          title="Produit introuvable"
          description="Le produit n'existe pas"
          action={{ label: "Retour", onPress: () => router.back() }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader
        title={`Mouvements - ${product.name.length > 10 ? product.name.slice(0, 10) + '...' : product.name}`}
        showBackButton
        
      />

      {/* Product Summary Card */}
      <Card className="mx-4 mt-4">
        <CardContent className="p-4">
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-full bg-brand-soft dark:bg-dark-brand-soft items-center justify-center">
              <Ionicons name="cube-outline" size={24} color="#0ea5e9" />
            </View>
            <View className="flex-1">
              <ThemedText variant="heading" size="lg" className="font-semibold">
                {product.name}
              </ThemedText>
              <ThemedText variant="muted" size="sm">
                SKU: {product.sku || 'Non défini'}
              </ThemedText>
            </View>
            <View className="items-end">
              <ThemedText variant="default" size="lg" className="font-bold">
                {product.stockQuantity} {product.baseUnit}
              </ThemedText>
              <ThemedText variant="muted" size="xs">
                Stock actuel
              </ThemedText>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="px-4 mt-4"
        contentContainerStyle={{ gap: 12 }}
      >
        {/* Total In */}
        <View className="w-36 p-3 bg-success/10 rounded-xl border border-success/20">
          <Ionicons name="arrow-down-circle" size={20} color="#22c55e" />
          <ThemedText variant="success" size="lg" className="font-bold mt-2">
            {stats.totalIn.toFixed(1)}
          </ThemedText>
          <ThemedText variant="success" size="xs">
            Entrées
          </ThemedText>
        </View>

        {/* Total Out */}
        <View className="w-36 p-3 bg-error/10 rounded-xl border border-error/20">
          <Ionicons name="arrow-up-circle" size={20} color="#ef4444" />
          <ThemedText variant="error" size="lg" className="font-bold mt-2">
            {stats.totalOut.toFixed(1)}
          </ThemedText>
          <ThemedText variant="error" size="xs">
            Sorties
          </ThemedText>
        </View>

        {/* Net Change */}
        <View className={`w-36 p-3 rounded-xl border ${
          stats.netChange >= 0 
            ? 'bg-brand/10 border-brand/20' 
            : 'bg-warning/10 border-warning/20'
        }`}>
          <Ionicons 
            name={stats.netChange >= 0 ? 'trending-up' : 'trending-down'} 
            size={20} 
            color={stats.netChange >= 0 ? '#0ea5e9' : '#f59e0b'} 
          />
          <ThemedText 
            variant={stats.netChange >= 0 ? 'brand' : 'warning'} 
            size="lg" 
            className="font-bold mt-2"
          >
            {stats.netChange >= 0 ? '+' : ''}{stats.netChange.toFixed(1)}
          </ThemedText>
          <ThemedText variant={stats.netChange >= 0 ? 'brand' : 'warning'} size="xs">
            Variation
          </ThemedText>
        </View>

        {/* Stock Value */}
        <View className="w-36 p-3 bg-purple/10 rounded-xl border border-purple/20">
          <Ionicons name="cash" size={20} color="#8b5cf6" />
          <ThemedText variant="warning" size="lg" className="font-bold mt-2">
            {formatCurrency(stats.totalValue)}
          </ThemedText>
          <ThemedText variant="label" size="xs">
            Valeur stock
          </ThemedText>
        </View>
      </ScrollView>

      {/* Filters Bar */}
      <View className="px-4 mt-4">
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon="search-outline"
            />
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className={`w-10 h-10 rounded-xl items-center justify-center ${
              showFilters ? 'bg-brand' : 'bg-surface-muted dark:bg-dark-surface-muted'
            }`}
          >
            <Ionicons 
              name="options-outline" 
              size={20} 
              color={showFilters ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')} 
            />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View className="mt-3 p-3 bg-surface dark:bg-dark-surface rounded-xl border border-border dark:border-dark-border">
            {/* Movement Type Filter */}
            <View className="mb-3">
              <ThemedText variant="muted" size="xs" className="mb-2">
                Type de mouvement
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setSelectedType('all')}
                  className={`px-3 py-2 rounded-full border ${
                    selectedType === 'all'
                      ? 'bg-brand border-brand'
                      : 'bg-surface-muted dark:bg-dark-surface-muted border-border dark:border-dark-border'
                  }`}
                >
                  <ThemedText 
                    variant={selectedType === 'all' ? 'label' : 'default'} 
                    size="xs"
                  >
                    Tous
                  </ThemedText>
                </TouchableOpacity>
                {(Object.keys(MOVEMENT_TYPE_CONFIG) as MovementType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSelectedType(type)}
                    className={`px-3 py-2 rounded-full border flex-row items-center gap-1 ${
                      selectedType === type
                        ? 'bg-brand border-brand'
                        : 'bg-surface-muted dark:bg-dark-surface-muted border-border dark:border-dark-border'
                    }`}
                  >
                    <Ionicons 
                      name={MOVEMENT_TYPE_CONFIG[type].icon as any} 
                      size={14} 
                      color={selectedType === type ? '#ffffff' : MOVEMENT_TYPE_CONFIG[type].color} 
                    />
                    <ThemedText 
                      variant={selectedType === type ? 'label' : 'default'} 
                      size="xs"
                    >
                      {MOVEMENT_TYPE_CONFIG[type].label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Time Filter */}
            <View className="mb-3">
              <ThemedText variant="muted" size="xs" className="mb-2">
                Période
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {TIME_FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter.value}
                    onPress={() => setTimeFilter(filter.value as TimeFilter)}
                    className={`px-3 py-2 rounded-full border ${
                      timeFilter === filter.value
                        ? 'bg-brand border-brand'
                        : 'bg-surface-muted dark:bg-dark-surface-muted border-border dark:border-dark-border'
                    }`}
                  >
                    <ThemedText 
                      variant={timeFilter === filter.value ? 'label' : 'default'} 
                      size="xs"
                    >
                      {filter.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Sort Order */}
            <View>
              <ThemedText variant="muted" size="xs" className="mb-2">
                Trier par
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setSortOrder(option.value as SortOrder)}
                    className={`px-3 py-2 rounded-full border ${
                      sortOrder === option.value
                        ? 'bg-brand border-brand'
                        : 'bg-surface-muted dark:bg-dark-surface-muted border-border dark:border-dark-border'
                    }`}
                  >
                    <ThemedText 
                      variant={sortOrder === option.value ? 'label' : 'default'} 
                      size="xs"
                    >
                      {option.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      {/* Movements List */}
      <FlatList
        data={filteredMovements}
        renderItem={renderMovementItem}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="swap-horizontal-outline"
            title="Aucun mouvement"
            description="Aucun mouvement de stock trouvé pour ce produit"
            action={{
              label: "Nouveau mouvement",
              onPress: () => setShowNewMovement(true)
            }}
          />
        }
        ListFooterComponent={
          filteredMovements.length > 0 ? (
            <View className="items-center py-4">
              <ThemedText variant="muted" size="xs">
                {filteredMovements.length} mouvement(s) au total
              </ThemedText>
            </View>
          ) : null
        }
      />

      {/* New Movement Modal */}
      <Modal
        visible={showNewMovement}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewMovement(false)}
      >
        <View className="flex-1 bg-overlay">
          <View className="flex-1 mt-20 bg-surface dark:bg-dark-surface rounded-t-3xl">
            <View className="p-4 border-b border-border dark:border-dark-border">
              <View className="flex-row justify-between items-center">
                <ThemedText variant="heading" size="lg">
                  Nouveau mouvement
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setShowNewMovement(false)}
                  className="w-10 h-10 rounded-full bg-surface-muted dark:bg-dark-surface-muted items-center justify-center"
                >
                  <Ionicons name="close" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="p-4">
              {/* Movement Type Selection */}
              <View className="mb-4">
                <ThemedText variant="default" size="sm" className="font-medium mb-2">
                  Type de mouvement
                </ThemedText>
                <View className="flex-row flex-wrap gap-2">
                  {(Object.keys(MOVEMENT_TYPE_CONFIG) as MovementType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setNewMovement({ ...newMovement, type })}
                      className={`flex-1 min-w-[45%] p-3 rounded-lg border flex-row items-center gap-2 ${
                        newMovement.type === type
                          ? 'bg-brand border-brand'
                          : 'bg-surface-muted dark:bg-dark-surface-muted border-border dark:border-dark-border'
                      }`}
                    >
                      <Ionicons 
                        name={MOVEMENT_TYPE_CONFIG[type].icon as any} 
                        size={18} 
                        color={newMovement.type === type ? '#ffffff' : MOVEMENT_TYPE_CONFIG[type].color} 
                      />
                      <ThemedText 
                        variant={newMovement.type === type ? 'label' : 'default'} 
                        size="sm"
                      >
                        {MOVEMENT_TYPE_CONFIG[type].label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Quantity */}
              <View className="mb-4">
                <ThemedText variant="default" size="sm" className="font-medium mb-2">
                  Quantité ({product.baseUnit})
                </ThemedText>
                <View className="flex-row items-center gap-3">
                  <TouchableOpacity
                    onPress={() => setNewMovement({
                      ...newMovement,
                      quantity: Math.max(0.001, newMovement.quantity - 1)
                    })}
                    className="w-12 h-12 rounded-xl bg-surface-muted dark:bg-dark-surface-muted items-center justify-center"
                  >
                    <Ionicons name="remove" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
                  </TouchableOpacity>

                  <View className="flex-1">
                    <RNTextInput
                      value={newMovement.quantity.toString()}
                      onChangeText={(v) => {
                        const val = parseFloat(v);
                        if (!isNaN(val) && val >= 0) {
                          setNewMovement({ ...newMovement, quantity: val });
                        }
                      }}
                      keyboardType="numeric"
                      className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-center text-base"
                    />
                  </View>

                  <TouchableOpacity
                    onPress={() => setNewMovement({
                      ...newMovement,
                      quantity: newMovement.quantity + 1
                    })}
                    className="w-12 h-12 rounded-xl bg-surface-muted dark:bg-dark-surface-muted items-center justify-center"
                  >
                    <Ionicons name="add" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Batch Number (optional) */}
              <View className="mb-4">
                <Input
                  label="Numéro de lot (optionnel)"
                  placeholder="Ex: LOT-2024-001"
                  value={newMovement.batchNumber}
                  onChangeText={(v) => setNewMovement({ ...newMovement, batchNumber: v })}
                  leftIcon="cube-outline"
                />
              </View>

              {/* Expiry Date (optional) */}
              <View className="mb-4">
                <Input
                  label="Date d'expiration (optionnel)"
                  placeholder="YYYY-MM-DD"
                  value={newMovement.expiryDate}
                  onChangeText={(v) => setNewMovement({ ...newMovement, expiryDate: v })}
                  leftIcon="calendar-outline"
                />
              </View>

              {/* Notes (optional) */}
              <View className="mb-6">
                <Input
                  label="Notes (optionnel)"
                  placeholder="Informations complémentaires"
                  value={newMovement.notes}
                  onChangeText={(v) => setNewMovement({ ...newMovement, notes: v })}
                  leftIcon="document-text-outline"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                <Button
                  variant="outline"
                  onPress={() => setShowNewMovement(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="default"
                  onPress={createMovement}
                  className="flex-1"
                >
                  Enregistrer
                </Button>
              </View>

              {/* Stock Warning */}
              {(newMovement.type === 'SALE' || newMovement.type === 'TRANSFER_OUT' || newMovement.type === 'ADJUSTMENT') && 
                newMovement.quantity > (product.stockQuantity || 0) && (
                <View className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="warning" size={20} color="#ef4444" />
                    <ThemedText variant="error" size="sm" className="flex-1">
                      Stock insuffisant! Disponible: {product.stockQuantity} {product.baseUnit}
                    </ThemedText>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}