// app/adjust-stock/[id].tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { withObservables } from '@nozbe/watermelondb/react';
import { of } from '@nozbe/watermelondb/utils/rx';
import { Q } from '@nozbe/watermelondb';
import { Ionicons } from '@expo/vector-icons';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ThemedText } from '@/components/ui/ThemedText';

// Context & DB
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { Product } from '@/database/models/Product';
import { StockMovement } from '@/database/models/StockMovement';
import { Contact } from '@/database/models/Contact';

// Types
type AdjustmentType = 'IN' | 'OUT' | 'CORRECTION';
type AdjustmentReason =
  | 'purchase'
  | 'sale'
  | 'damage'
  | 'return'
  | 'count_correction'
  | 'other';

interface AdjustStockScreenProps {
  product: Product | null;
  suppliers: Contact[];
}

function AdjustStockScreen({ product, suppliers }: AdjustStockScreenProps) {
  const router = useRouter();
  const { currentShop, user } = useAuth();

  // State: Stock Adjustment
  const [loading, setLoading] = useState(true);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<AdjustmentReason>('purchase');
  const [notes, setNotes] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Contact | null>(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // State: Price Updates (NEW)
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [newWholesalePrice, setNewWholesalePrice] = useState('');

  // Modal State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');


  // Calculations
  const numericQty = parseFloat(quantity) || 0;
  const numericSellPrice = parseFloat(newSellingPrice) || 0;
  const numericWholePrice = parseFloat(newWholesalePrice) || 0;
  
  const calculatedNewStock = useMemo(() => {
    if (!product) return 0;
    const current = product.stockQuantity || 0;
    
    if (adjustmentType === 'CORRECTION') {
      return numericQty;
    }
    if (adjustmentType === 'IN') {
      return current + numericQty;
    }
    return Math.max(0, current - numericQty);
  }, [product, adjustmentType, numericQty]);

  const estimatedValueChange = useMemo(() => {
    if (!product || !numericQty) return 0;
    return numericQty * (product.costPricePerBase || 0);
  }, [product, numericQty]);

  const isLowStock = calculatedNewStock <= (product?.lowStockThreshold || 0);
  const isOutOfStock = calculatedNewStock === 0;

  useEffect(() => {
    if (product !== undefined && product !== null) {
      setLoading(false);
    }
  }, [product]);

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
    (s.phone && s.phone.includes(supplierSearchQuery))
  );

  const handleSubmit = async () => {
    if (!product || !currentShop || !user) return;

    const qty = parseFloat(quantity);
    const hasQtyChange = quantity && !isNaN(qty) && qty > 0;
    const hasSellPriceChange = newSellingPrice && !isNaN(numericSellPrice) && numericSellPrice >= 0;
    const hasWholePriceChange = newWholesalePrice && !isNaN(numericWholePrice) && numericWholePrice >= 0;

    if (!hasQtyChange && !hasSellPriceChange && !hasWholePriceChange) {
      Alert.alert('Info', 'Veuillez entrer une quantité ou modifier un prix.');
      return;
    }

    if (adjustmentType === 'OUT' && hasQtyChange && qty > (product.stockQuantity || 0)) {
      Alert.alert(
        'Stock Insuffisant',
        `Le stock actuel est de ${product.stockQuantity} ${product.baseUnit}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await database.write(async () => {
        // 1. Handle Stock Movement (if quantity changed)
        if (hasQtyChange) {
          let finalQuantity = 0;
          let movementType: 'IN' | 'OUT' | 'ADJUSTMENT' = 'ADJUSTMENT';

          if (adjustmentType === 'CORRECTION') {
            const diff = qty - (product.stockQuantity || 0);
            finalQuantity = diff;
            movementType = diff >= 0 ? 'IN' : 'OUT';
            
            if (diff === 0 && !hasSellPriceChange && !hasWholePriceChange) {
              // If only correction to same value and no price change, skip everything
              setSubmitting(false);
              Alert.alert('Info', 'Aucune modification détectée.');
              return;
            }
          } else {
            finalQuantity = adjustmentType === 'IN' ? qty : -qty;
            movementType = adjustmentType === 'IN' ? 'IN' : 'OUT';
          }

          if (finalQuantity !== 0 || adjustmentType === 'CORRECTION') {
             await database.get<StockMovement>('stock_movements').create((m) => {
              m.productId = product.id;
              m.shopId = currentShop.id;
              m.quantity = finalQuantity;
              m.movementType = adjustmentType === "IN" ? "IN" : "ADJUSTMENT";
              m.referenceId = `ADJ-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
              m.notes = `[${reason.toUpperCase()}] ${notes || 'Ajustement manuel'}${batchNumber ? ` | Lot: ${batchNumber}` : ''}`;
              m.recordedBy = user.id;
              m.timestamp = Date.now();
              if (selectedSupplier) m.supplierId = selectedSupplier.id;
              if (batchNumber) m.batchNumber = batchNumber;
            });
          }

          // Update Product Stock
          await product.update((p) => {
            p.stockQuantity = calculatedNewStock;
            if(p.sellingPricePerBase !== numericSellPrice && numericSellPrice > 0) p.sellingPricePerBase = numericSellPrice;
            if(p.wholesalePricePerBase !== numericWholePrice && numericWholePrice > 0) p.wholesalePricePerBase = numericWholePrice;
          });
        }
      });

      let successMessage = 'Mise à jour réussie.';
      if (hasQtyChange) successMessage += `\nNouveau stock: ${calculatedNewStock} ${product.baseUnit}`;
      if (hasSellPriceChange) successMessage += `\nNouveau prix de vente: ${numericSellPrice} F`;
      if (hasWholePriceChange) successMessage += `\nNouveau prix de gros: ${numericWholePrice} F`;
      
      Alert.alert('Succès', successMessage, [{ text: 'OK', onPress: () => router.back() }]);

    } catch (error) {
      console.error('Adjustment error:', error);
      Alert.alert('Erreur', "Une erreur est survenue lors de la mise à jour.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !product) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Ajuster le stock" showBackButton />
        <View className="flex-1 items-center justify-center">
          <Ionicons name="hourglass-outline" size={48} color="#94a3b8" />
          <ThemedText variant="muted" className="mt-4">Chargement...</ThemedText>
        </View>
      </View>
    );
  }

  const getStatusColor = () => {
    if (isOutOfStock) return 'text-error';
    if (isLowStock) return 'text-warning';
    return 'text-success';
  };
  
  const getStatusBg = () => {
    if (isOutOfStock) return 'bg-error/10 border-error/20';
    if (isLowStock) return 'bg-warning/10 border-warning/20';
    return 'bg-success/10 border-success/20';
  };

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title="Gérer Produit" 
        subtitle={product.name} 
        showBackButton 
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          
          {/* 1. Current Stock Status Card */}
          <View className="px-2 pt-4">
            <Card variant="elevated" className={`border-l-4 ${isOutOfStock ? 'border-l-error' : isLowStock ? 'border-l-warning' : 'border-l-success'}`}>
              <CardContent className="items-center py-6">
                <ThemedText variant="muted" size="lg" className="uppercase tracking-wide">
                  Stock Actuel
                </ThemedText>
                
                <View className="items-center p-4 bg-transparent">
                  <ThemedText
                    variant="brand"
                    size="4xl"
                    className="font-bold text-brand"
                  >
                    {product?.stockQuantity || 0} {(product?.baseUnit === "unite" || product?.baseUnit === "piece") ? product?.sellingUnit : product?.baseUnit}
                  </ThemedText>
                  <View className={`mt-3 px-3 py-1 rounded-full border ${getStatusBg()}`}>
                  <ThemedText variant={isOutOfStock ? 'error' : isLowStock ? 'warning' : 'success'} size="xs" className="font-medium">
                    {isOutOfStock ? 'Rupture de stock' : isLowStock ? 'Stock faible' : 'En stock'}
                  </ThemedText>
                </View>
                  {/* <ThemedText variant="muted" size="xs">
                    En {product?.purchaseUnit}:{" "}
                    {(
                      (product?.stockQuantity || 0) /
                      (product?.unitConversionFactor || 1)
                    ).toFixed(2)}
                  </ThemedText> */}
                </View>
              </CardContent>
            </Card>
          </View>

          {/* 2. Adjustment Form */}
          <View className="px-2 mt-4">
            <Card variant="outlined">
              <CardHeader>
                <CardTitle>Ajustement de Stock</CardTitle>
                <CardDescription>Gérez les entrées, sorties et corrections</CardDescription>
              </CardHeader>
              <CardContent className="gap-4">
                
                <Select
                  label="Type d'opération"
                  value={adjustmentType}
                  onValueChange={(v) => {
                    setAdjustmentType(v as AdjustmentType);
                    setQuantity('');
                    if (v === 'OUT') setReason('damage');
                    if (v === 'IN') setReason('purchase');
                    if (v === 'CORRECTION') setReason('count_correction');
                  }}
                  options={[
                    { value: 'IN', label: '➕ Entrée de stock' },
                    { value: 'OUT', label: '➖ Sortie de stock' },
                    { value: 'CORRECTION', label: '✏️ Correction totale' },
                  ]}
                />

                <Input
                  label={
                    adjustmentType === 'CORRECTION'
                      ? `Nouveau stock total (${product.baseUnit})`
                      : `Quantité (${product.baseUnit})`
                  }
                  placeholder="0.00"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                  leftIcon="cube-outline"
                />

                {quantity && !isNaN(numericQty) && (
                  <View className="bg-surface-muted dark:bg-dark-surface-muted p-3 rounded-lg flex-row justify-between items-center">
                    <View>
                      <ThemedText variant="muted" size="xs">Nouveau Total</ThemedText>
                      <ThemedText variant="default" size="sm" className="font-bold">
                        {calculatedNewStock.toFixed(2)} {product?.baseUnit}
                      </ThemedText>
                    </View>
                    {adjustmentType === 'IN' && (
                      <View className="items-end">
                        <ThemedText variant="muted" size="xs">Valeur Ajoutée</ThemedText>
                        <ThemedText variant="success" size="sm" className="font-bold">
                          +{estimatedValueChange.toLocaleString('fr-FR', { style: 'currency', currency: 'BIF' })}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                )}

                <Select
                  label="Motif"
                  value={reason}
                  onValueChange={(v) => setReason(v as AdjustmentReason)}
                  options={[
                    { value: 'purchase', label: '📦 Achat' },
                    { value: 'damage', label: '⚠️ Perte / Casse' },
                    { value: 'count_correction', label: '📊 Inventaire' },
                    { value: 'other', label: '📝 Autre' },
                  ]}
                />

                {adjustmentType === 'IN' && reason === 'purchase' && (
                  <TouchableOpacity
                    onPress={() => setShowSupplierModal(true)}
                    className="flex-row items-center justify-between p-3 border border-border dark:border-dark-border rounded-xl bg-surface dark:bg-dark-surface"
                  >
                    <View className="flex-row items-center flex-1">
                      <Ionicons name="business-outline" size={20} color={selectedSupplier ? '#0ea5e9' : '#94a3b8'} style={{ marginRight: 10 }} />
                      <ThemedText variant={selectedSupplier ? 'default' : 'muted'}>
                        {selectedSupplier ? selectedSupplier.name : 'Sélectionner un fournisseur'}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                )}

                {adjustmentType === 'IN' && (
                  <Input
                    label="Numéro de Lot"
                    placeholder="Ex: LOT-2024"
                    value={batchNumber}
                    onChangeText={setBatchNumber}
                    leftIcon="pricetag-outline"
                  />
                )}

                <Input
                  label="Notes"
                  placeholder="Détails..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={2}
                  leftIcon="document-text-outline"
                />
              </CardContent>
            </Card>
          </View>

          {/* 3. Update Selling Price Card (NEW) */}
          <View className="px-4 mt-4">
            <Card variant="outlined" status="brand">
              
              <CardHeader
                title="Mettre à jour Prix de Vente"
                subtitle={`Actuel: ${product?.sellingPricePerBase.toLocaleString('fr-FR')} F / ${product.baseUnit}`}
              />
              <CardContent>
                <Input
                  label="Nouveau Prix de Vente Unitaire"
                  placeholder={`Ex: ${product?.costPricePerBase ? ( product?.costPricePerBase * 1.4).toFixed(2) : '0.00'}`}
                  value={newSellingPrice}
                  onChangeText={setNewSellingPrice}
                  keyboardType="decimal-pad"
                  leftIcon="cash-outline"
                />
                {newSellingPrice && !isNaN(numericSellPrice) && (
                  <ThemedText variant={numericSellPrice > product?.sellingPricePerBase ? 'success' : 'warning'} size="xs" className="mt-2">
                    {numericSellPrice > product?.sellingPricePerBase ? '↑ Augmentation' : '↓ Diminution'} de {(numericSellPrice - product.sellingPricePerBase).toLocaleString('fr-FR')} F
                  </ThemedText>
                )}

                {/* Quick Markup Buttons */}
              <View className="mt-3">
                <ThemedText variant="muted" size="xs" className="mb-2">
                  Marge sur prix d'achat ({product?.costPricePerBase.toLocaleString('fr-FR')} F)
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {[2, 5, 10, 15, 20, 25, 30, 50].map(percent => {
                      const markupPrice = product?.costPricePerBase * (1 + percent / 100);
                      const isSelected = Math.abs(numericSellPrice - markupPrice) < 0.01;
                      return (
                        <TouchableOpacity
                          key={percent}
                          onPress={() => setNewSellingPrice(markupPrice.toFixed(2))}
                          className={`px-3 py-2 rounded-lg items-center min-w-[60px] ${
                            isSelected
                              ? 'bg-brand'
                              : 'bg-surface-soft dark:bg-dark-surface-soft border border-border dark:border-dark-border'
                          }`}
                        >
                          <ThemedText
                            size="xs"
                            className={`font-bold ${isSelected ? 'text-white' : ''}`}
                          >
                            +{percent}%
                          </ThemedText>
                          <ThemedText
                            size="xs"
                            className={isSelected ? 'text-white/80' : ''}
                            variant={isSelected ? undefined : 'muted'}
                          >
                            {markupPrice.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}F
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
              </CardContent>
            </Card>
          </View>

          {/* 4. Update Wholesale Price Card (NEW) */}
          <View className="px-4 mt-4 mb-6">
            <Card variant="outlined" status="success">
             <CardHeader
                title="Mettre à jour Prix de Gros"
                subtitle={`Actuel: ${product?.wholesalePricePerBase?.toLocaleString('fr-FR')} F / ${product.baseUnit}`}
              />
              <CardContent>
                <Input
                  label="Nouveau Prix de Gros Unitaire"
                  placeholder={`Ex: ${product?.sellingPricePerBase ? (product?.sellingPricePerBase * 0.95).toFixed(2) : '0.00'}`}
                  value={newWholesalePrice}
                  onChangeText={setNewWholesalePrice}
                  keyboardType="decimal-pad"
                  leftIcon="cart-outline"
                />
                 {newWholesalePrice && !isNaN(numericWholePrice) && (
                  <ThemedText variant={numericWholePrice > product?.wholesalePricePerBase ? 'success' : 'warning'} size="xs" className="mt-2">
                    {numericWholePrice > product?.wholesalePricePerBase ? '↑ Augmentation' : '↓ Diminution'} de {(numericWholePrice - product?.wholesalePricePerBase).toLocaleString('fr-FR')} F
                  </ThemedText>
                )}
                {/* Quick Discount Buttons */}
              <View className="mt-3">
                <ThemedText variant="muted" size="xs" className="mb-2">
                  Remise sur prix de vente ({product?.sellingPricePerBase.toLocaleString('fr-FR')} F)
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {[2, 5, 10, 15, 20, 25, 30].map(percent => {
                      const discountedPrice = product?.sellingPricePerBase * (1 - percent / 100);
                      const isSelected = Math.abs(numericWholePrice - discountedPrice) < 0.01;
                      return (
                        <TouchableOpacity
                          key={percent}
                          onPress={() => setNewWholesalePrice(discountedPrice.toFixed(2))}
                          className={`px-3 py-2 rounded-lg items-center min-w-[60px] ${
                            isSelected
                              ? 'bg-success'
                              : 'bg-surface-soft dark:bg-dark-surface-soft border border-border dark:border-dark-border'
                          }`}
                        >
                          <ThemedText
                            size="xs"
                            className={`font-bold ${isSelected ? 'text-white' : ''}`}
                          >
                            -{percent}%
                          </ThemedText>
                          <ThemedText
                            size="xs"
                            className={isSelected ? 'text-white/80' : ''}
                            variant={isSelected ? undefined : 'muted'}
                          >
                            {discountedPrice.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}F
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
              </CardContent>
            </Card>
          </View>

          {/* Global Actions */}
          <View className="px-4 pb-8">
            <Button
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              size="lg"
              className="w-full shadow-lg"
            >
              Enregistrer les modifications
            </Button>
            <Button
              variant="ghost"
              onPress={() => router.back()}
              className="w-full mt-2"
              disabled={submitting}
            >
              Annuler
            </Button>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Supplier Modal (Unchanged) */}
      <Modal
        visible={showSupplierModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSupplierModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface dark:bg-dark-surface rounded-t-3xl h-[70%] flex-col">
            <View className="p-4 border-b border-border dark:border-dark-border flex-row items-center justify-between">
              <ThemedText variant="heading" size="lg">Fournisseurs</ThemedText>
              <TouchableOpacity onPress={() => setShowSupplierModal(false)}>
                <Ionicons name="close" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <View className="p-4">
              <Input
                placeholder="Rechercher..."
                value={supplierSearchQuery}
                onChangeText={setSupplierSearchQuery}
                leftIcon="search-outline"
                autoFocus
              />
            </View>
            <ScrollView className="flex-1 px-4 pb-4">
              {filteredSuppliers.map((sup) => (
                <TouchableOpacity
                  key={sup.id}
                  onPress={() => {
                    setSelectedSupplier(sup);
                    setShowSupplierModal(false);
                  }}
                  className={`p-4 mb-3 rounded-xl border flex-row items-center ${
                    selectedSupplier?.id === sup.id
                      ? 'bg-brand/10 border-brand'
                      : 'bg-white dark:bg-dark-surface border-border'
                  }`}
                >
                  <View className="w-10 h-10 rounded-full bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mr-3">
                    <Ionicons name="business" size={20} color="#64748b" />
                  </View>
                  <View className="flex-1">
                    <ThemedText variant="default" className="font-semibold">{sup.name}</ThemedText>
                    {sup.phone && <ThemedText variant="muted" size="xs">{sup.phone}</ThemedText>}
                  </View>
                  {selectedSupplier?.id === sup.id && <Ionicons name="checkmark-circle" size={24} color="#0ea5e9" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Data Enhancement ---
const enhance = withObservables(
  ['productId', 'currentShop'],
  ({ productId, currentShop }: { productId: string; currentShop: any }) => {
    if (!currentShop) {
      return { product: of(null), suppliers: of([]) };
    }
    return {
      product: database.get<Product>('products').findAndObserve(productId),
      suppliers: database.get<Contact>('contacts')
        .query(Q.where('shop_id', currentShop.id), Q.or(Q.where('role', 'supplier'), Q.where('role', 'both')), Q.sortBy('name', Q.asc))
        .observe(),
    };
  }
);

export default function AdjustStockScreenWrapper() {
  const { id: productId } = useLocalSearchParams();
  const { currentShop } = useAuth();
  const router = useRouter();

  if (!currentShop) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Erreur" showBackButton />
        <View className="flex-1 items-center justify-center p-6">
          <ThemedText variant="muted" className="text-center">Aucune boutique active.</ThemedText>
          <Button onPress={() => router.back()} className="mt-4">Retour</Button>
        </View>
      </View>
    );
  }

  const EnhancedComponent = enhance(AdjustStockScreen);
  return <EnhancedComponent productId={productId as string} currentShop={currentShop} />;
}