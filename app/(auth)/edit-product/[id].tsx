// app/edit-product/[id].tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  View, 
  ScrollView, 
  Alert, 
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput as RNTextInput
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from 'nativewind';

// Models
import { Product, UnitType } from '@/database/models/Product';
import { StockMovement, MovementType } from '@/database/models/StockMovement';

import { 
  unitConverter,
  getUnitsByType,
  getUnitInfo,
} from '@/utils/unitConversions';

import {
  convertProductStock,
  calculateConversionMatrix,
  calculatePriceMetrics,
  suggestOptimalSellingUnit,
  getDefaultBaseUnit,
  getDefaultUnit,
  validateProductUnits,
  ProductUnits,
  ProductConversionMatrix,
  PriceConversionResult,
} from '@/utils/productUnitConversions';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { Switch } from '@/components/ui/Switch';
import { Select } from '@/components/ui/Select';

// ============================================================================
// ENHANCED TYPES
// ============================================================================

interface ProductFormData {
  // Basic Info
  name: string;
  sku: string;
  barcode: string;
  category: string;
  description: string;
  
  // Units
  unitType: UnitType;
  isWeighted: boolean;
  baseUnit: string;
  purchaseUnit: string;
  purchaseUnitSize: number;
  sellingUnit: string;
  
  // Pricing
  totalPurchaseCost: number;      // Total cost for current purchase
  sellingPrice: number;           // Price per selling unit
  wholesalePrice: number;         // Price per selling unit (wholesale)
  
  // Inventory
  stockQuantity: number;          // ALWAYS in base units
  lowStockThreshold: number;
  isActive: boolean;
  isPerishable: boolean;
  defaultExpiryDays: number;
  
  // Media
  imageUrl: string;
  imageThumbnailUrl: string;
}

interface ProfitAnalysis {
  perSellingUnit: {
    cost: number;
    revenue: number;
    profit: number;
    margin: number;
    markup: number;
  };
  perBaseUnit: {
    cost: number;
    revenue: number;
    profit: number;
    margin: number;
  };
  perPurchaseUnit: {
    cost: number;
    revenue: number;
    profit: number;
    margin: number;
  };
  breakEvenPoint: {
    units: number;
    revenue: number;
  };
  profitability: 'high' | 'medium' | 'low' | 'loss';
  recommendations: string[];
  stockValue: number;
  potentialRevenue: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const UNIT_TYPES = [
  { value: 'piece', label: '📦 Pièce', icon: 'cube-outline', description: 'Articles unitaires' },
  { value: 'weight', label: '⚖️ Poids', icon: 'scale-outline', description: 'kg, g, sacs...' },
  { value: 'volume', label: '🧴 Volume', icon: 'flask-outline', description: 'litres, bidons...' },
  { value: 'length', label: '📏 Longueur', icon: 'resize-outline', description: 'mètres, rouleaux...' },
  { value: 'pack', label: '📎 Paquet', icon: 'archive-outline', description: 'lots, cartons...' },
];

const CATEGORIES = [
  { value: 'food', label: '🍚 Aliments' },
  { value: 'drinks', label: '🧃 Boissons' },
  { value: 'clothing', label: '👕 Vêtements' },
  { value: 'electronics', label: '📱 Électronique' },
  { value: 'household', label: '🏠 Ménager' },
  { value: 'health', label: '💊 Santé' },
  { value: 'construction', label: '🔨 Construction' },
  { value: 'agriculture', label: '🌾 Agriculture' },
  { value: 'other', label: '📦 Autre' },
];

const PROFITABILITY_THRESHOLDS = {
  high: 50,
  medium: 20,
  low: 0,
  loss: -Infinity,
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const defaultFormData: ProductFormData = {
  name: '',
  sku: '',
  barcode: '',
  category: 'other',
  description: '',
  unitType: 'piece',
  isWeighted: false,
  baseUnit: 'piece',
  purchaseUnit: 'piece',
  purchaseUnitSize: 1,
  sellingUnit: 'piece',
  totalPurchaseCost: 0,
  sellingPrice: 0,
  wholesalePrice: 0,
  stockQuantity: 0,
  lowStockThreshold: 10,
  isActive: true,
  isPerishable: false,
  defaultExpiryDays: 0,
  imageUrl: '',
  imageThumbnailUrl: '',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const allProducts = database.get<Product>('products');
export default function EditProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { currentShop, user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const productId = params.id as string;
  const isNewProduct = productId === 'new';
  
  // Refs to prevent update loops
  const isUpdatingFromStock = useRef(false);
  const isUpdatingFromPurchase = useRef(false);
  
  
  // States
  const [loading, setLoading] = useState(!isNewProduct);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageUploading, setImageUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnitHelper, setShowUnitHelper] = useState(false);
  const [activeUnitTab, setActiveUnitTab] = useState<'purchase' | 'selling' | 'base'>('purchase');
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [showPriceCalculator, setShowPriceCalculator] = useState(false);
  const [unitValidation, setUnitValidation] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] });
  // Add this state near your other useState declarations
const [selectedUnitCategory, setSelectedUnitCategory] = useState<'all' | 'piece' | 'pack' | 'weight' | 'volume' | 'length'>('all');
// First, add state for showing/hiding base unit selector
const [showBaseUnitSelector, setShowBaseUnitSelector] = useState(false);



// update product to be active or deactive if formData.isActive is changed
useEffect(() => {
  if (product) {
    const updateActiveStatus = async () => {  
      try {
        await database.write(async () => {          
          await product.update(p => {
            p.isActive = formData.isActive;
          });
        });
      } catch (error) {
        console.error('Error updating product:', error);
      }
    };
    updateActiveStatus();
  }
}, [product, formData.isActive]);  



// Get available base units based on unit type
const getAvailableBaseUnits = useCallback(() => {
  switch (formData.unitType) {
    case 'weight':
      return [
        { value: 'kg', label: 'Kilogramme (kg) - Standard' },
        { value: 'g', label: 'Gramme (g)' },
        { value: 'mg', label: 'Milligramme (mg)' },
      ];
    case 'volume':
      return [
        { value: 'l', label: 'Litre (L) - Standard' },
        { value: 'ml', label: 'Millilitre (ml)' },
        { value: 'cl', label: 'Centilitre (cl)' },
      ];
    case 'length':
      return [
        { value: 'm', label: 'Mètre (m) - Standard' },
        { value: 'cm', label: 'Centimètre (cm)' },
        { value: 'mm', label: 'Millimètre (mm)' },
        { value: 'km', label: 'Kilomètre (km)' },
      ];
    case 'piece':
      return [
        { value: 'piece', label: 'Pièce - Standard' },
        { value: 'unite', label: 'Unité' },
      ];
    case 'pack':
      return [
        { value: 'piece', label: 'Pièce (base pour packs)' },
      ];
    default:
      return [{ value: 'piece', label: 'Pièce' }];
  }
}, [formData.unitType]);

// Validate base unit compatibility when changed
const handleBaseUnitChange = useCallback((newBaseUnit: string) => {
  const baseInfo = getUnitInfo(newBaseUnit);
  if (!baseInfo) return;

  // Check if new base unit is compatible with current unit type
  if (baseInfo.unitType !== formData.unitType && 
      !(formData.unitType === 'pack' && baseInfo.unitType === 'piece')) {
    Alert.alert(
      'Unité incompatible',
      `L'unité de base doit être du type ${formData.unitType === 'weight' ? 'poids' :
        formData.unitType === 'volume' ? 'volume' :
        formData.unitType === 'length' ? 'longueur' :
        formData.unitType === 'piece' ? 'pièce' : 'pack'}`,
      [{ text: 'OK' }]
    );
    return;
  }

  // Update base unit
  updateField('baseUnit', newBaseUnit);

  // Show warning if changing base unit might affect conversions
  if (formData.stockQuantity > 0) {
    Alert.alert(
      'Attention',
      'Changer l\'unité de base affectera la valeur de votre stock. Vérifiez les conversions après modification.',
      [{ text: 'Compris' }]
    );
  }
}, [formData.unitType, formData.stockQuantity]);

// Helper function to get filtered units based on selected category
const getFilteredSellingUnits = useCallback(() => {
  // Start with all units from piece and pack (always available)
  let units = [
    ...getUnitsByType('piece').map(u => ({ value: u.value, label: u.label })),
    ...getUnitsByType('pack').map(u => ({ value: u.value, label: u.label })),
    ...getUnitsByType('length').map(u => ({ value: u.value, label: u.label })),
    ...getUnitsByType('volume').map(u => ({ value: u.value, label: u.label })),
    ...getUnitsByType('weight').map(u => ({ value: u.value, label: u.label })),
  ];
  
  // Add the specific unit type if it's not piece/pack
  if (formData.unitType !== 'piece' && formData.unitType !== 'pack') {
    units = [
      ...units,
      ...getUnitsByType(formData.unitType).map(u => ({ value: u.value, label: u.label }))
    ];
  }
  
  // Filter by selected category
  if (selectedUnitCategory !== 'all') {
    units = units.filter(u => {
      const unitInfo = getUnitInfo(u.value);
      return unitInfo?.unitType === selectedUnitCategory;
    });
  }
  
  // Remove duplicates (in case a unit exists in both categories)
  const uniqueUnits = new Map();
  units.forEach(unit => uniqueUnits.set(unit.value, unit));
  
  return Array.from(uniqueUnits.values());
}, [formData.unitType, selectedUnitCategory]);

// Get counts for each category
const getCategoryCount = (category: string) => {
  if (category === 'all') {
    // Count all available units
    const allUnits = new Set([
      ...getUnitsByType('piece').map(u => u.value),
      ...getUnitsByType('pack').map(u => u.value),
      ...getUnitsByType('length').map(u => u.value),
      ...getUnitsByType('volume').map(u => u.value),
      ...getUnitsByType('weight').map(u => u.value),
      ...(formData.unitType !== 'piece' && formData.unitType !== 'pack' 
        ? getUnitsByType(formData.unitType).map(u => u.value) 
        : [])
    ]);
    return allUnits.size;
  }
  
  // Count by specific category
  const units = getUnitsByType(category as any);
  return units.length;
};

  // ==========================================================================
  // DERIVED VALUES FROM PRODUCT MODEL
  // ==========================================================================

  const productUnits = useMemo((): ProductUnits => ({
    unitType: formData.unitType,
    baseUnit: formData.baseUnit,
    purchaseUnit: formData.purchaseUnit,
    purchaseUnitSize: formData.purchaseUnitSize,
    sellingUnit: formData.sellingUnit,
  }), [formData.unitType, formData.baseUnit, formData.purchaseUnit, 
      formData.purchaseUnitSize, formData.sellingUnit]);

  // ==========================================================================
  // CONVERSION MATRIX
  // ==========================================================================

  const conversionMatrix = useMemo((): ProductConversionMatrix => {
    return calculateConversionMatrix(productUnits);
  }, [productUnits]);

  // ==========================================================================
  // PRICE METRICS
  // ==========================================================================

  const priceMetrics = useMemo((): PriceConversionResult => {
    return calculatePriceMetrics(
      productUnits,
      formData.totalPurchaseCost,
      purchaseQuantity,
      formData.sellingPrice
    );
  }, [productUnits, formData.totalPurchaseCost, purchaseQuantity, formData.sellingPrice]);

  // ==========================================================================
  // PROFIT ANALYSIS
  // ==========================================================================

  const profitAnalysis = useMemo((): ProfitAnalysis => {
    // Get cost per base unit from price metrics or existing product
    let costPerBaseUnit = priceMetrics.success ? priceMetrics.pricePerBaseUnit : 0;

    const stockQuantity = formData.stockQuantity || 0;
    
    // If product exists and has stock, use weighted average
    if (product && stockQuantity > 0 && formData.stockQuantity > 0) {
      const existingCost = product.costPricePerBase;
      const newStockQuantity = Math.max(0, formData.stockQuantity - stockQuantity);
      
      if (newStockQuantity > 0 && priceMetrics.success) {
        // Weighted average
        costPerBaseUnit = (
          (stockQuantity * existingCost) + 
          (newStockQuantity * priceMetrics.pricePerBaseUnit)
        ) / formData.stockQuantity;
      } else {
        costPerBaseUnit = existingCost;
      }
    }

    // Get unit info for display
    const sellingUnitInfo = getUnitInfo(formData.sellingUnit);
    const baseUnitInfo = getUnitInfo(formData.baseUnit);
    const purchaseUnitInfo = getUnitInfo(formData.purchaseUnit);

    const baseUnitsPerSellingUnit = sellingUnitInfo?.base || 1;
    const baseUnitsPerPurchaseUnit = purchaseUnitInfo?.base || formData.purchaseUnitSize;

    // Calculate costs per unit
    const costPerSellingUnit = costPerBaseUnit * baseUnitsPerSellingUnit;
    const profitPerSellingUnit = formData.sellingPrice - costPerSellingUnit;
    const marginPercent = costPerSellingUnit > 0 
      ? (profitPerSellingUnit / costPerSellingUnit) * 100 
      : 0;

    const costPerPurchaseUnit = costPerBaseUnit * baseUnitsPerPurchaseUnit;
    const revenuePerPurchaseUnit = formData.sellingPrice * (baseUnitsPerPurchaseUnit / baseUnitsPerSellingUnit);
    const profitPerPurchaseUnit = revenuePerPurchaseUnit - costPerPurchaseUnit;
    const marginPerPurchaseUnit = costPerPurchaseUnit > 0 
      ? (profitPerPurchaseUnit / costPerPurchaseUnit) * 100 
      : 0;

    // Break-even point
    const breakEvenUnits = profitPerSellingUnit > 0 
      ? (formData.totalPurchaseCost / profitPerSellingUnit) 
      : Infinity;
    const breakEvenRevenue = breakEvenUnits * formData.sellingPrice;

    // Stock value and potential revenue
    const stockValue = formData.stockQuantity * costPerBaseUnit;
    const stockInSellingUnits = baseUnitsPerSellingUnit > 0 
      ? formData.stockQuantity / baseUnitsPerSellingUnit 
      : 0;
    const potentialRevenue = stockInSellingUnits * formData.sellingPrice;

    // Profitability classification
    let profitability: 'high' | 'medium' | 'low' | 'loss';
    if (marginPercent >= PROFITABILITY_THRESHOLDS.high) {
      profitability = 'high';
    } else if (marginPercent >= PROFITABILITY_THRESHOLDS.medium) {
      profitability = 'medium';
    } else if (marginPercent >= PROFITABILITY_THRESHOLDS.low) {
      profitability = 'low';
    } else {
      profitability = 'loss';
    }

    // Recommendations
    const recommendations: string[] = [];

    if (marginPercent < 0) {
      recommendations.push('⚠️ Produit vendu à perte - Augmentez le prix de vente');
    } else if (marginPercent < 20) {
      recommendations.push('📉 Marge faible - Envisagez d\'augmenter le prix ou réduire le coût');
    } else if (marginPercent > 100) {
      recommendations.push('💰 Très bonne marge !');
    }

    if (formData.wholesalePrice > 0 && formData.wholesalePrice < formData.sellingPrice * 0.9) {
      recommendations.push('🤝 Bon prix de gros - Encouragez les achats en volume');
    }

    if (breakEvenUnits !== Infinity && stockInSellingUnits < breakEvenUnits && stockInSellingUnits > 0) {
      recommendations.push(`📊 Stock insuffisant pour atteindre le seuil de rentabilité (${Math.ceil(breakEvenUnits)} ${formData.sellingUnit} nécessaire)`);
    }

    if (!unitValidation.valid) {
      recommendations.push(`⚠️ Problème d'unités: ${unitValidation.errors[0]}`);
    }

    return {
      perSellingUnit: {
        cost: costPerSellingUnit,
        revenue: formData.sellingPrice,
        profit: profitPerSellingUnit,
        margin: marginPercent,
        markup: costPerSellingUnit > 0 
          ? ((formData.sellingPrice - costPerSellingUnit) / costPerSellingUnit) * 100 
          : 0,
      },
      perBaseUnit: {
        cost: costPerBaseUnit,
        revenue: formData.sellingPrice / baseUnitsPerSellingUnit,
        profit: (formData.sellingPrice / baseUnitsPerSellingUnit) - costPerBaseUnit,
        margin: costPerBaseUnit > 0 
          ? (((formData.sellingPrice / baseUnitsPerSellingUnit) - costPerBaseUnit) / costPerBaseUnit) * 100 
          : 0,
      },
      perPurchaseUnit: {
        cost: costPerPurchaseUnit,
        revenue: revenuePerPurchaseUnit,
        profit: profitPerPurchaseUnit,
        margin: marginPerPurchaseUnit,
      },
      breakEvenPoint: {
        units: breakEvenUnits,
        revenue: breakEvenRevenue,
      },
      profitability,
      recommendations,
      stockValue,
      potentialRevenue,
    };
  }, [formData, product, priceMetrics, unitValidation]);

  // ==========================================================================
  // DERIVED VALUES
  // ==========================================================================

  const stockInPurchaseUnits = useMemo(() => {
    return formData.purchaseUnitSize > 0 
      ? formData.stockQuantity / formData.purchaseUnitSize 
      : 0;
  }, [formData.stockQuantity, formData.purchaseUnitSize]);

  const stockInSellingUnits = useMemo(() => {
    const sellingUnitInfo = getUnitInfo(formData.sellingUnit);
    const basePerSelling = sellingUnitInfo?.base || 1;
    return basePerSelling > 0 ? formData.stockQuantity / basePerSelling : 0;
  }, [formData.stockQuantity, formData.sellingUnit]);

  // ==========================================================================
  // SYNC PURCHASE QUANTITY WITH STOCK
  // ==========================================================================

  useEffect(() => {
    if (isUpdatingFromPurchase.current) return;
    
    isUpdatingFromStock.current = true;
    
    if (formData.purchaseUnitSize > 0) {
      const newPurchaseQuantity = formData.stockQuantity / formData.purchaseUnitSize;
      if (Math.abs(newPurchaseQuantity - purchaseQuantity) > 0.001) {
        setPurchaseQuantity(newPurchaseQuantity);
      }
    }
    
    isUpdatingFromStock.current = false;
  }, [formData.stockQuantity, formData.purchaseUnitSize]);

  // ==========================================================================
  // VALIDATE UNITS WHEN THEY CHANGE
  // ==========================================================================

  useEffect(() => {
    const validation = validateProductUnits(productUnits);
   //console.log(validation)
    setUnitValidation(validation);
    
    if (!validation.valid && !errors.units) {
      setErrors(prev => ({ ...prev, units: validation.errors[0] }));
    } else if (validation.valid && errors.units) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.units;
        return newErrors;
      });
    }
  }, [productUnits]);

  // ==========================================================================
  // LOAD PRODUCT DATA
  // ==========================================================================

  useEffect(() => {
    if (!isNewProduct) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const products = await database.get<Product>('products')
        .query(Q.where('id', productId))
        .fetch();

      if (products.length === 0) {
        throw new Error('Product not found');
      }

      const p = products[0];
      setProduct(p);

      const stockQuantity = p?.stockQuantity || 0;

      // Calculate total purchase cost from stock and cost price
      const totalPurchaseCost = stockQuantity * p.costPricePerBase;

      setFormData({
        name: p.name || '',
        sku: p.sku || '',
        barcode: p.barcode || '',
        category: p.category || 'other',
        description: p.description || '',
        unitType: p.unitType,
        isWeighted: p.isWeighted || false,
        baseUnit: p.baseUnit,
        purchaseUnit: p.purchaseUnit,
        purchaseUnitSize: p.purchaseUnitSize || 1,
        sellingUnit: p.sellingUnit,
        totalPurchaseCost: totalPurchaseCost || 0,
        sellingPrice: p.sellingPricePerBase * (getUnitInfo(p.sellingUnit)?.base || 1),
        wholesalePrice: p.wholesalePricePerBase * (getUnitInfo(p.sellingUnit)?.base || 1),
        stockQuantity: p.stockQuantity || 0,
        lowStockThreshold: p.lowStockThreshold || 10,
        isActive: p.isActive ?? true,
        isPerishable: p.isPerishable || false,
        defaultExpiryDays: p.defaultExpiryDays || 0,
        imageUrl: p.imageUrl || '',
        imageThumbnailUrl: p.imageThumbnailUrl || '',
      });

      // Set purchase quantity based on stock
      if (stockQuantity > 0 && p.purchaseUnitSize > 0) {
        setPurchaseQuantity(stockQuantity / p.purchaseUnitSize);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Erreur', 'Impossible de charger le produit');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // FIELD UPDATE
  // ==========================================================================

  const updateField = useCallback(<K extends keyof ProductFormData>(
    field: K, 
    value: ProductFormData[K]
  ) => {
    setFormData(prev => {
      let newValue = value;

      // Ensure positive numbers
      if (typeof value === 'number') {
        if (field === 'purchaseUnitSize') {
          newValue = Math.max(0.001, value) as ProductFormData[K];
        } else {
          newValue = Math.max(0, value) as ProductFormData[K];
        }
      }

      const newData = { ...prev, [field]: newValue };

      // ========== WHEN UNIT TYPE CHANGES ==========
      if (field === 'unitType') {
        const unitType = value as UnitType;
        
        // Set appropriate base unit
        const baseUnit = getDefaultBaseUnit(unitType);
        const defaultUnit = getDefaultUnit(unitType);
        const defaultUnitInfo = getUnitInfo(defaultUnit);
        
        newData.baseUnit = baseUnit;
        newData.purchaseUnit = defaultUnit;
        newData.sellingUnit = defaultUnit;
        newData.purchaseUnitSize = defaultUnitInfo?.base || 1;
        newData.isWeighted = unitType === 'weight';
      }

      // ========== WHEN PURCHASE UNIT CHANGES ==========
      if (field === 'purchaseUnit') {
        const unitInfo = getUnitInfo(value as string);
        if (unitInfo) {
          newData.purchaseUnitSize = unitInfo.base;
        }
      }

      // ========== WHEN SELLING UNIT CHANGES ==========
      if (field === 'sellingUnit') {
        // Adjust selling price to maintain same value in base units
        const oldUnitInfo = getUnitInfo(prev.sellingUnit);
        const newUnitInfo = getUnitInfo(value as string);
        
        if (oldUnitInfo && newUnitInfo && prev.sellingPrice > 0) {
          // Convert price from old unit to new unit
          const priceInBase = prev.sellingPrice / oldUnitInfo.base;
          newData.sellingPrice = priceInBase * newUnitInfo.base;
          
          // Also adjust wholesale price if set
          if (prev.wholesalePrice > 0) {
            const wholesaleInBase = prev.wholesalePrice / oldUnitInfo.base;
            newData.wholesalePrice = wholesaleInBase * newUnitInfo.base;
          }
        }
      }

      setHasUnsavedChanges(true);
      return newData;
    });

    // Clear error for this field
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  }, [errors]);

  // ==========================================================================
  // HANDLE PURCHASE QUANTITY CHANGE
  // ==========================================================================

  const handlePurchaseQuantityChange = useCallback((newQuantity: number) => {
    if (isUpdatingFromStock.current) return;

    isUpdatingFromPurchase.current = true;

    const validQuantity = Math.max(0.001, newQuantity);
    setPurchaseQuantity(validQuantity);

    // Update stock quantity based on purchase quantity
    const newStockQuantity = validQuantity * formData.purchaseUnitSize;

    setFormData(prev => ({
      ...prev,
      stockQuantity: newStockQuantity,
    }));

    isUpdatingFromPurchase.current = false;
  }, [formData.purchaseUnitSize]);

  // ==========================================================================
  // HANDLE STOCK QUANTITY CHANGE
  // ==========================================================================

  const handleStockQuantityChange = useCallback((newStock: number) => {
    if (isUpdatingFromPurchase.current) return;

    isUpdatingFromStock.current = true;

    const validStock = Math.max(0, newStock);

    setFormData(prev => ({
      ...prev,
      stockQuantity: validStock,
    }));

    // Purchase quantity will update via useEffect
    isUpdatingFromStock.current = false;
  }, []);

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Le nom du produit est requis';
    }

    if (formData.totalPurchaseCost < 0) {
      newErrors.totalPurchaseCost = 'Le prix ne peut pas être négatif';
    }

    if (formData.sellingPrice < 0) {
      newErrors.sellingPrice = 'Le prix ne peut pas être négatif';
    }

    if (formData.stockQuantity < 0) {
      newErrors.stockQuantity = 'Le stock ne peut pas être négatif';
    }

    if (formData.purchaseUnitSize < 0.001) {
      newErrors.purchaseUnitSize = 'La taille doit être supérieure à 0';
    }

    // Validate unit compatibility
    if (!unitValidation.valid) {
      newErrors.units = unitValidation.errors[0];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==========================================================================
  // IMAGE HANDLING
  // ==========================================================================

  const handleImagePick = async () => {
    try {
      setImageUploading(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à vos photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateField('imageUrl', result.assets[0].uri);
        updateField('imageThumbnailUrl', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image pick error:', error);
      Alert.alert('Erreur', 'Impossible de choisir l\'image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setImageUploading(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à la caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateField('imageUrl', result.assets[0].uri);
        updateField('imageThumbnailUrl', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    } finally {
      setImageUploading(false);
    }
  };

  // ==========================================================================
  // CREATE STOCK MOVEMENT
  // ==========================================================================

  const createStockMovement = async (
    productId: string,
    type: MovementType,
    quantity: number,
    notes?: string
  ) => {
    if (!currentShop || !user) return;

    await database.get<StockMovement>('stock_movements').create(m => {
      m.productId = productId;
      m.shopId = currentShop.id;
      m.quantity = quantity;
      m.movementType = type;
      m.notes = notes || `${type === 'IN' ? 'Achat' : type === 'SALE' ? 'Vente' : 'Ajustement'} de stock`;
      m.recordedBy = user.id;
      m.timestamp = Date.now();
    });
  };

  // ==========================================================================
  // SAVE PRODUCT
  // ==========================================================================

  const generateSku = (name: string): string => {
    const prefix = name.substring(0, 3).toUpperCase();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const shopCode = currentShop?.name.substring(0, 2).toUpperCase() || 'XX';
    return `${prefix}-${shopCode}-${random}`;
  };

  const saveProduct = async () => {
    if (!validateForm() || !currentShop) return;

    if (profitAnalysis.profitability === 'loss' && formData.stockQuantity > 0) {
      Alert.alert(
        '⚠️ Vente à perte',
        'Ce produit sera vendu à perte. Voulez-vous continuer ?',
        [
          { text: 'Vérifier les prix', style: 'cancel' },
          { text: 'Continuer', onPress: () => performSave() }
        ]
      );
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    setSaving(true);
    try {
      const stockIncrease = formData.stockQuantity - (product?.stockQuantity || 0);

      // Calculate prices per base unit
      const sellingUnitInfo = getUnitInfo(formData.sellingUnit);
      const basePerSellingUnit = sellingUnitInfo?.base || 1;
      
      const sellingPricePerBase = formData.sellingPrice / basePerSellingUnit;
      const wholesalePricePerBase = formData.wholesalePrice / basePerSellingUnit;

      // Calculate cost per base unit for NEW stock
      let newStockCostPerBaseUnit = 0;
      if (purchaseQuantity > 0 && formData.totalPurchaseCost > 0) {
        const purchaseUnitInfo = getUnitInfo(formData.purchaseUnit);
        const basePerPurchaseUnit = purchaseUnitInfo?.base || formData.purchaseUnitSize;
        newStockCostPerBaseUnit = (formData.totalPurchaseCost / purchaseQuantity) / basePerPurchaseUnit;
      }

      await database.write(async () => {
        if (isNewProduct) {
          // For new products, cost per base unit is simply calculated
          const costPerBaseUnit = newStockCostPerBaseUnit;

          const newProduct = await database.get<Product>('products').create(p => {
            p.name = formData.name.trim();
            p.sku = formData.sku || generateSku(formData.name);
            p.barcode = formData.barcode;
            p.category = formData.category;
            p.description = formData.description;
            p.unitType = formData.unitType;
            p.isWeighted = formData.isWeighted;
            p.baseUnit = formData.baseUnit;
            p.purchaseUnit = formData.purchaseUnit;
            p.purchaseUnitSize = formData.purchaseUnitSize;
            p.sellingUnit = formData.sellingUnit;
            p.unitConversionFactor = conversionMatrix.purchaseToSelling.conversionFactor;
            p.costPricePerBase = costPerBaseUnit;
            p.sellingPricePerBase = sellingPricePerBase;
            p.wholesalePricePerBase = wholesalePricePerBase;
            p.lowStockThreshold = formData.lowStockThreshold;
            p.isActive = formData.isActive;
            p.isPerishable = formData.isPerishable;
            p.defaultExpiryDays = formData.defaultExpiryDays;
            p.imageUrl = formData.imageUrl;
            p.imageThumbnailUrl = formData.imageThumbnailUrl;
            p.stockQuantity = formData.stockQuantity;
            p.shopId = currentShop.id;
          });

          if (formData.stockQuantity > 0) {
            await createStockMovement(
              newProduct.id,
              'IN',
              formData.stockQuantity,
              `Achat de ${purchaseQuantity.toFixed(2)} ${formData.purchaseUnit} (${formData.stockQuantity} ${formData.baseUnit})`
            );
          }

          Alert.alert('Succès', 'Produit créé avec succès !');

        } else if (product) {
          // For existing products, calculate weighted average cost
          let newCostPerBase = product.costPricePerBase;

          const stockQuantity = product?.stockQuantity || 0;

          if (stockIncrease > 0 && newStockCostPerBaseUnit > 0) {
            // New stock added - calculate weighted average
            const totalCost = (stockQuantity * product.costPricePerBase) +
                            (stockIncrease * newStockCostPerBaseUnit);
            const totalQuantity = stockQuantity + stockIncrease;
            newCostPerBase = totalCost / totalQuantity;
          }

          await product.update(p => {
            p.name = formData.name.trim();
            p.sku = formData.sku;
            p.barcode = formData.barcode;
            p.category = formData.category;
            p.description = formData.description;
            p.unitType = formData.unitType;
            p.isWeighted = formData.isWeighted;
            p.baseUnit = formData.baseUnit;
            p.purchaseUnit = formData.purchaseUnit;
            p.purchaseUnitSize = formData.purchaseUnitSize;
            p.sellingUnit = formData.sellingUnit;
            p.unitConversionFactor = conversionMatrix.purchaseToSelling.conversionFactor;
            p.costPricePerBase = newCostPerBase;
            p.sellingPricePerBase = sellingPricePerBase;
            p.wholesalePricePerBase = wholesalePricePerBase;
            p.lowStockThreshold = formData.lowStockThreshold;
            p.isActive = formData.isActive;
            p.isPerishable = formData.isPerishable;
            p.defaultExpiryDays = formData.defaultExpiryDays;
            p.imageUrl = formData.imageUrl;
            p.imageThumbnailUrl = formData.imageThumbnailUrl;
            p.stockQuantity = formData.stockQuantity;
          });

          if (stockIncrease > 0) {
            await createStockMovement(
              product.id,
              'IN',
              stockIncrease,
              `Achat de ${(stockIncrease / formData.purchaseUnitSize).toFixed(2)} ${formData.purchaseUnit} (${stockIncrease} ${formData.baseUnit})`
            );
          } else if (stockIncrease < 0) {
            await createStockMovement(
              product.id,
              'ADJUSTMENT',
              stockIncrease,
              `Ajustement de stock: ${stockIncrease} ${formData.baseUnit}`
            );
          }

          Alert.alert('Succès', 'Produit mis à jour avec succès !');
        }
      });

      router.back();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le produit');
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================================
  // DELETE PRODUCT
  // ==========================================================================

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le produit',
      'Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                await product?.markAsDeleted();
              });
              Alert.alert('Succès', 'Produit supprimé');
              router.back();
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le produit');
            }
          }
        }
      ]
    );
  };

  // ==========================================================================
  // FORMAT HELPERS
  // ==========================================================================

  const formatCurrency = (value: number): string => {
    return `${value.toFixed(2)} FBU`;
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // First, add this helper function to check what's been completed
const getUnitSetupProgress = useCallback(() => {
  const steps = [
    {
      id: 'unitType',
      label: 'Type d\'unité',
      completed: !!formData.unitType,
      current: formData.unitType,
      icon: formData.unitType === 'piece' ? 'cube-outline' :
             formData.unitType === 'weight' ? 'scale-outline' :
             formData.unitType === 'volume' ? 'flask-outline' :
             formData.unitType === 'length' ? 'resize-outline' : 'archive-outline',
      color: formData.unitType === 'piece' ? '#0ea5e9' :
             formData.unitType === 'weight' ? '#22c55e' :
             formData.unitType === 'volume' ? '#8b5cf6' :
             formData.unitType === 'length' ? '#f59e0b' : '#dc2626',
    },
    {
      id: 'baseUnit',
      label: 'Unité de base',
      completed: !!formData.baseUnit,
      current: getUnitInfo(formData.baseUnit)?.label || formData.baseUnit,
      icon: 'cube-outline',
    },
    {
      id: 'purchaseUnit',
      label: 'Unité d\'achat',
      completed: !!formData.purchaseUnit,
      current: getUnitInfo(formData.purchaseUnit)?.label || formData.purchaseUnit,
      icon: 'arrow-down-circle-outline',
    },
    {
      id: 'purchaseUnitSize',
      label: 'Taille unité d\'achat',
      completed: formData.purchaseUnitSize > 0,
      current: `${formData.purchaseUnitSize} ${formData.baseUnit}${formData.purchaseUnitSize > 1 ? 's' : ''} par ${formData.purchaseUnit}`,
      icon: 'swap-horizontal-outline',
    },
    {
      id: 'sellingUnit',
      label: 'Unité de vente',
      completed: !!formData.sellingUnit,
      current: getUnitInfo(formData.sellingUnit)?.label || formData.sellingUnit,
      icon: 'arrow-up-circle-outline',
    },
    
    {
      id: 'purchaseCost',
      label: 'Coût total d\'achat',
      completed: formData.totalPurchaseCost > 0,
      current: formData.totalPurchaseCost > 0 ? formatCurrency(formData.totalPurchaseCost) : 'Non défini',
      icon: 'cash-outline',
    },
    {
      id: 'sellingPrice',
      label: 'Prix de vente',
      completed: formData.sellingPrice > 0,
      current: formData.sellingPrice > 0 ? `${formatCurrency(formData.sellingPrice)} / ${formData.sellingUnit}` : 'Non défini',
      icon: 'arrow-up-circle-outline',
    },
    {
      id: 'stock',
      label: 'Stock',
      completed: formData?.stockQuantity > 0,
      current: `${formData.stockQuantity} ${formData.baseUnit} (${stockInSellingUnits.toFixed(2)} ${formData.sellingUnit})`,
      icon: 'cube-outline',
    },
  ];
  
  return steps;
}, [formData, stockInSellingUnits]);

// Calculate overall progress
const setupProgress = useMemo(() => {
  const steps = getUnitSetupProgress();
  const completed = steps.filter(s => s.completed).length;
  return {
    total: steps.length,
    completed,
    percentage: Math.round((completed / steps.length) * 100),
  };
}, [getUnitSetupProgress]);

  if (loading) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Chargement..." showBackButton />
        <Loading />
      </View>
    );
  }

  if (!isNewProduct && !product) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Erreur" showBackButton />
        <EmptyState
          icon="alert-circle-outline"
          title="Produit introuvable"
          description="Le produit que vous cherchez n'existe pas"
          action={{ label: "Retour", onPress: () => router.back() }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader
        title={isNewProduct ? "Nouveau Produit" : "Modifier Produit"}
        showBackButton
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="p-4 gap-4">
            {/* ========== PROFITABILITY BANNER ========== */}
            <TouchableOpacity onPress={() => setShowUnitHelper(true)} activeOpacity={0.9}>
              <Card className={`
                ${profitAnalysis.profitability === 'high' ? 'bg-success-soft dark:bg-dark-success-soft border-success/20' : ''}
                ${profitAnalysis.profitability === 'medium' ? 'bg-brand-soft dark:bg-dark-brand-soft border-brand/20' : ''}
                ${profitAnalysis.profitability === 'low' ? 'bg-warning-soft dark:bg-dark-warning-soft border-warning/20' : ''}
                ${profitAnalysis.profitability === 'loss' ? 'bg-error-soft dark:bg-dark-error-soft border-error/20' : ''}
              `}>
                <CardContent className="p-4">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <View className={`
                        w-10 h-10 rounded-full items-center justify-center
                        ${profitAnalysis.profitability === 'high' ? 'bg-success/20' : ''}
                        ${profitAnalysis.profitability === 'medium' ? 'bg-brand/20' : ''}
                        ${profitAnalysis.profitability === 'low' ? 'bg-warning/20' : ''}
                        ${profitAnalysis.profitability === 'loss' ? 'bg-error/20' : ''}
                      `}>
                        <Ionicons
                          name={
                            profitAnalysis.profitability === 'high' ? 'trending-up' :
                            profitAnalysis.profitability === 'medium' ? 'stats-chart' :
                            profitAnalysis.profitability === 'low' ? 'alert-circle' :
                            'warning'
                          }
                          size={24}
                          color={
                            profitAnalysis.profitability === 'high' ? '#22c55e' :
                            profitAnalysis.profitability === 'medium' ? '#0ea5e9' :
                            profitAnalysis.profitability === 'low' ? '#f59e0b' :
                            '#ef4444'
                          }
                        />
                      </View>
                      <View>
                        <ThemedText variant="default" size="sm" className="text-text dark:text-dark-text">
                          Marge: {profitAnalysis.perSellingUnit.margin.toFixed(1)}%
                        </ThemedText>
                        <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">
                          Bénéfice: {formatCurrency(profitAnalysis.perSellingUnit.profit)} / {formData.sellingUnit}
                        </ThemedText>
                      </View>
                    </View>
                    <View className={`
                      px-3 py-1.5 rounded-full
                      ${profitAnalysis.profitability === 'high' ? 'bg-success/10 border border-success/20' : ''}
                      ${profitAnalysis.profitability === 'medium' ? 'bg-brand/10 border border-brand/20' : ''}
                      ${profitAnalysis.profitability === 'low' ? 'bg-warning/10 border border-warning/20' : ''}
                      ${profitAnalysis.profitability === 'loss' ? 'bg-error/10 border border-error/20' : ''}
                    `}>
                      <ThemedText
                        variant={
                          profitAnalysis.profitability === 'high' ? 'success' :
                          profitAnalysis.profitability === 'medium' ? 'brand' :
                          profitAnalysis.profitability === 'low' ? 'warning' :
                          'error'
                        }
                        size="xs"
                        className="font-semibold"
                      >
                        {profitAnalysis.profitability === 'high' ? 'Excellent' :
                         profitAnalysis.profitability === 'medium' ? 'Bon' :
                         profitAnalysis.profitability === 'low' ? 'Faible' :
                         'Perte'}
                      </ThemedText>
                    </View>
                  </View>

                  {profitAnalysis.recommendations.length > 0 && (
                    <View className="mt-3 pt-3 border-t border-border dark:border-dark-border">
                      {profitAnalysis.recommendations.map((rec, index) => (
                        <ThemedText key={index} variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted mb-1">
                          • {rec}
                        </ThemedText>
                      ))}
                    </View>
                  )}
                </CardContent>
              </Card>
            </TouchableOpacity>

            {/* ========== IMAGE SECTION ========== */}
            <Card>
              <CardContent className="p-4">
                <View className="items-center">
                  <View className="w-32 h-32 rounded-xl bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mb-4 overflow-hidden border-2 border-dashed border-border-strong dark:border-dark-border-strong">
                    {imageUploading ? (
                      <ActivityIndicator size="large" color="#0ea5e9" />
                    ) : formData.imageUrl ? (
                      <Image
                        source={{ uri: formData.imageUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="items-center">
                        <Ionicons name="camera-outline" size={40} color={isDark ? '#475569' : '#94a3b8'} />
                        <ThemedText variant="muted" size="xs" className="mt-2">Ajouter une photo</ThemedText>
                      </View>
                    )}
                  </View>

                  <View className="flex-row gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={handleImagePick}
                      disabled={imageUploading}
                      icon="image-outline"
                    >
                      Galerie
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={handleTakePhoto}
                      disabled={imageUploading}
                      icon="camera-outline"
                    >
                      Photo
                    </Button>
                    {formData.imageUrl && (
                      <TouchableOpacity
                        onPress={() => {
                          updateField('imageUrl', '');
                          updateField('imageThumbnailUrl', '');
                        }}
                        className="flex items-center justify-center"
                      >
                        <Ionicons name="trash-outline" size={24} color="#f77373" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* ========== QUICK ACTIONS BAR ========== */}
            <View className="flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onPress={() => setShowAdvanced(!showAdvanced)}
                icon={showAdvanced ? "chevron-up-outline" : "chevron-down-outline"}
                className="flex-1"
              >
                {showAdvanced ? "Masquer avancé" : "Voir options avancées"}
              </Button>
              {!isNewProduct && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => router.push(`/stock-movements/${productId}`)}
                  icon="swap-horizontal-outline"
                >
                  Mouvements
                </Button>
              )}
            </View>

            {/* ========== BASIC INFO ========== */}
            <Card>
              <CardContent className="p-4 gap-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-8 h-8 rounded-full bg-brand-soft dark:bg-dark-brand-soft items-center justify-center">
                    <Ionicons name="information-circle" size={18} color="#0ea5e9" />
                  </View>
                  <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
                    Informations de base
                  </ThemedText>
                </View>

                <Input
                  label="Nom du produit *"
                  placeholder="Ex: Sucre, Riz, T-shirt..."
                  value={formData.name}
                  onChangeText={(v) => updateField('name', v)}
                  error={errors.name}
                  leftIcon="cube-outline"
                  autoFocus
                />

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      label="Code (SKU)"
                      placeholder="Généré automatiquement"
                      value={formData.sku}
                      onChangeText={(v) => updateField('sku', v)}
                      leftIcon="barcode-outline"
                      rightIcon={!formData.sku ? "refresh-outline" : undefined}
                      onRightIconPress={() => {
                        if (formData.name) {
                          updateField('sku', generateSku(formData.name));
                        } else {
                          Alert.alert('Info', 'Entrez d\'abord le nom du produit');
                        }
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Select
                      label="Catégorie"
                      placeholder="Choisir"
                      value={formData.category}
                      onValueChange={(v) => updateField('category', v)}
                      options={CATEGORIES}
                    />
                  </View>
                </View>

                <Input
                  label="Code-barres (optionnel)"
                  placeholder="Scanner ou saisir"
                  value={formData.barcode}
                  onChangeText={(v) => updateField('barcode', v)}
                  leftIcon="scan-outline"
                />
              </CardContent>
            </Card>

            {/* ========== UNITS & PRICING ========== */}
            <Card>
              <CardContent className="p-4 gap-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-8 h-8 rounded-full bg-success-soft dark:bg-dark-success-soft items-center justify-center">
                    <Ionicons name="scale-outline" size={18} color="#22c55e" />
                  </View>
                  <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
                    Unités et prix
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => setShowUnitHelper(true)}
                    className="ml-auto"
                  >
                    <Ionicons name="help-circle-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                  </TouchableOpacity>
                </View>

                <Select
                  label="Type d'unité"
                  value={formData.unitType}
                  onValueChange={(v) => updateField('unitType', v as UnitType)}
                  options={UNIT_TYPES}
                />

                {/* Base Unit - Now Editable */}
                <View className="mt-2">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2">
                      <View className="w-6 h-6 rounded-full bg-accent-soft dark:bg-dark-accent-soft items-center justify-center">
                        <Ionicons name="cube-outline" size={14} color="#dc2626" />
                      </View>
                      <ThemedText variant="default" size="sm" className="text-text dark:text-dark-text font-medium">
                        Unité de base
                      </ThemedText>
                    </View>
                    
                    {/* Edit/Save toggle */}
                    <TouchableOpacity
                      onPress={() => setShowBaseUnitSelector(!showBaseUnitSelector)}
                      className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-surface-muted dark:bg-dark-surface-muted"
                    >
                      <Ionicons 
                        name={showBaseUnitSelector ? "checkmark" : "pencil"} 
                        size={14} 
                        color={isDark ? '#94a3b8' : '#64748b'} 
                      />
                      <ThemedText variant="muted" size="xs">
                        {showBaseUnitSelector ? 'Confirmer' : 'Modifier'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  {!showBaseUnitSelector ? (
                    // Read-only view with nice styling
                    <TouchableOpacity
                      onPress={() => setShowBaseUnitSelector(true)}
                      className="flex-row items-center justify-between p-2 bg-surface-muted dark:bg-dark-surface-muted rounded-md border border-border dark:border-dark-border"
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-brand-soft dark:bg-dark-brand-soft items-center justify-center">
                          <Ionicons name="cube" size={20} color="#0ea5e9" />
                        </View>
                        <View>
                          <ThemedText variant="default" size="lg" className="font-semibold text-text dark:text-dark-text">
                            {getUnitInfo(formData.baseUnit)?.label || formData.baseUnit}
                          </ThemedText>
                          <ThemedText variant="muted" size="xs">
                            {formData.unitType === 'weight' ? 'Base: Kilogramme' :
                            formData.unitType === 'volume' ? 'Base: Litre' :
                            formData.unitType === 'length' ? 'Base: Mètre' :
                            formData.unitType === 'piece' ? 'Base: Pièce' :
                            'Base: Pièce (pour packs)'}
                          </ThemedText>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <View className="px-2 py-1 bg-surface dark:bg-dark-surface rounded-full">
                          <ThemedText variant="brand" size="xs" className="font-mono">
                            1 {formData.baseUnit}
                          </ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={isDark ? '#475569' : '#94a3b8'} />
                      </View>
                    </TouchableOpacity>
                  ) : (
                    // Edit mode with unit selector
                    <View className="p-4 bg-surface-muted dark:bg-dark-surface-muted rounded-xl border-2 border-brand/30">
                      {/* Info banner */}
                      <View className="flex-row items-center gap-2 mb-4 p-3 bg-info-soft dark:bg-dark-info-soft rounded-lg">
                        <Ionicons name="information-circle" size={20} color="#0ea5e9" />
                        <ThemedText variant="muted" size="xs" className="flex-1">
                          L'unité de base est l'unité fondamentale dans laquelle le stock est stocké. 
                          Toutes les conversions sont basées sur cette unité.
                        </ThemedText>
                      </View>

                      {/* Unit type indicator */}
                      <View className="flex-row items-center gap-2 mb-3">
                        <View className="px-3 py-1 rounded-full bg-surface dark:bg-dark-surface">
                          <ThemedText variant="brand" size="xs" className="font-semibold">
                            {formData.unitType === 'weight' ? '⚖️ Poids' :
                            formData.unitType === 'volume' ? '🧴 Volume' :
                            formData.unitType === 'length' ? '📏 Longueur' :
                            formData.unitType === 'piece' ? '📦 Pièce' : '📎 Pack'}
                          </ThemedText>
                        </View>
                        <ThemedText variant="muted" size="xs">
                          {formData.unitType === 'pack' 
                            ? 'Les packs utilisent la pièce comme base' 
                            : 'Choisissez l\'unité fondamentale'}
                        </ThemedText>
                      </View>

                      {/* Base unit selector with radio-style options */}
                      <View className="gap-2">
                        {getAvailableBaseUnits().map((unit) => {
                          const unitInfo = getUnitInfo(unit.value);
                          const isSelected = formData.baseUnit === unit.value;
                          const isRecommended = unit.value === (
                            formData.unitType === 'weight' ? 'kg' :
                            formData.unitType === 'volume' ? 'l' :
                            formData.unitType === 'length' ? 'm' :
                            formData.unitType === 'piece' ? 'piece' : 'piece'
                          );

                          return (
                            <TouchableOpacity
                              key={unit.value}
                              onPress={() => handleBaseUnitChange(unit.value)}
                              className={`flex-row items-center p-3 rounded-lg border ${
                                isSelected 
                                  ? 'bg-brand/10 border-brand' 
                                  : 'bg-surface dark:bg-dark-surface border-border dark:border-dark-border'
                              }`}
                            >
                              {/* Radio indicator */}
                              <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                                isSelected 
                                  ? 'border-brand' 
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {isSelected && (
                                  <View className="w-3 h-3 rounded-full bg-brand" />
                                )}
                              </View>

                              {/* Unit info */}
                              <View className="flex-1">
                                <View className="flex-row items-center gap-2">
                                  <ThemedText 
                                    variant={isSelected ? 'brand' : 'default'} 
                                    size="sm"
                                    className={isSelected ? 'font-semibold' : ''}
                                  >
                                    {unit.label}
                                  </ThemedText>
                                  {isRecommended && (
                                    <View className="px-2 py-0.5 bg-success/10 rounded-full">
                                      <ThemedText variant="success" size="xs" className="font-medium">
                                        Recommandé
                                      </ThemedText>
                                    </View>
                                  )}
                                </View>
                                
                                <ThemedText variant="muted" size="xs" className="mt-1">
                                  {unitInfo?.description || `1 ${unit.value} = 1 ${formData.baseUnit}`}
                                </ThemedText>
                              </View>

                              {/* Checkmark for selected */}
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={20} color="#0ea5e9" />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Warning for pack type */}
                      {formData.unitType === 'pack' && (
                        <View className="mt-4 p-3 bg-warning-soft dark:bg-dark-warning-soft rounded-lg">
                          <View className="flex-row items-center gap-2">
                            <Ionicons name="warning-outline" size={18} color="#f59e0b" />
                            <ThemedText variant="warning" size="xs" className="flex-1">
                              Les packs utilisent toujours la pièce comme unité de base. 
                              La taille du pack est définie par le nombre de pièces qu'il contient.
                            </ThemedText>
                          </View>
                        </View>
                      )}

                      {/* Action buttons */}
                      <View className="flex-row gap-3 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={() => setShowBaseUnitSelector(false)}
                          className="flex-1"
                        >
                          Annuler
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onPress={() => setShowBaseUnitSelector(false)}
                          className="flex-1"
                        >
                          Confirmer
                        </Button>
                      </View>
                    </View>
                  )}
                </View>

                {/* Purchase Unit */}
                <View className="flex-row gap-3 mt-2">
                  <View className="flex-1">
                    <Select
                      label="Unité d'achat"
                      value={formData.purchaseUnit}
                      onValueChange={(v) => updateField('purchaseUnit', v)}
                      options={getUnitsByType(formData.unitType).map(u => ({ value: u.value, label: u.label }))}
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label={`Quantité en ${formData.baseUnit}`}
                      value={`${formData.purchaseUnitSize} ${formData.baseUnit}${formData.purchaseUnitSize > 1 ? 's' : ''}`}
                      editable={false}
                      leftIcon="swap-horizontal-outline"
                      className="bg-surface-muted dark:bg-dark-surface-muted"
                      readOnly
                      disabled
                    />
                  </View>
                </View>

                {/* Purchase Unit Size (Manual override) */}
                <View className="bg-surface-muted dark:bg-dark-surface-muted p-3 rounded-lg">
                  <ThemedText variant="muted" size="xs" className="mb-2">
                    Ajustement manuel (si différent de la valeur par défaut)
                  </ThemedText>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1">
                      <Input
                        label={`Nombre de ${formData.baseUnit}${formData.purchaseUnitSize > 1 ? 's' : ''} par ${formData.purchaseUnit}`}
                        placeholder={String(getUnitInfo(formData.purchaseUnit)?.base || 1)}
                        value={String(formData.purchaseUnitSize)}
                        onChangeText={(v) => {
                          const newSize = parseFloat(v) || 0.001;
                          updateField('purchaseUnitSize', newSize);
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        const defaultSize = getUnitInfo(formData.purchaseUnit)?.base || 1;
                        updateField('purchaseUnitSize', defaultSize);
                      }}
                      className="p-2"
                    >
                      <Ionicons name="refresh" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Selling Unit Section - Redesigned */}
                <View className="mt-4">
                  {/* Header with title and category selector */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 rounded-full bg-brand-soft dark:bg-dark-brand-soft items-center justify-center">
                        <Ionicons name="pricetag-outline" size={16} color="#0ea5e9" />
                      </View>
                      <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
                        Unité de vente
                      </ThemedText>
                    </View>
                    
                    {/* "All" toggle button */}
                    <TouchableOpacity
                      onPress={() => setSelectedUnitCategory('all')}
                      className={`px-4 py-2 rounded-full flex-row items-center gap-2 ${
                        selectedUnitCategory === 'all' 
                          ? 'bg-brand' 
                          : 'bg-surface-muted dark:bg-dark-surface-muted'
                      }`}
                    >
                      <Ionicons 
                        name="apps-outline" 
                        size={16} 
                        color={selectedUnitCategory === 'all' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')} 
                      />
                      <ThemedText 
                        variant={selectedUnitCategory === 'all' ? 'label' : 'default'} 
                        size="sm"
                        className={selectedUnitCategory === 'all' ? 'text-white' : ''}
                      >
                        Tous ({getCategoryCount('all')})
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  {/* Category filter chips - Horizontal scroll */}
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    className="pb-3"
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {/* Pack category chip */}
                    <TouchableOpacity
                      onPress={() => setSelectedUnitCategory('pack')}
                      className={`flex-row items-center px-4 py-2.5 rounded-full border ${
                        selectedUnitCategory === 'pack'
                          ? 'bg-brand border-brand'
                          : 'bg-surface dark:bg-dark-surface border-border dark:border-dark-border'
                      }`}
                    >
                      <Ionicons 
                        name="archive-outline" 
                        size={16} 
                        color={selectedUnitCategory === 'pack' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')} 
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText 
                        variant={selectedUnitCategory === 'pack' ? 'label' : 'default'} 
                        size="sm"
                        className={selectedUnitCategory === 'pack' ? 'text-white' : ''}
                      >
                        Packs / Lots ({getCategoryCount('pack')})
                      </ThemedText>
                    </TouchableOpacity>

                    {/* Piece category chip */}
                    <TouchableOpacity
                      onPress={() => setSelectedUnitCategory('piece')}
                      className={`flex-row items-center px-4 py-2.5 rounded-full border ${
                        selectedUnitCategory === 'piece'
                          ? 'bg-brand border-brand'
                          : 'bg-surface dark:bg-dark-surface border-border dark:border-dark-border'
                      }`}
                    >
                      <Ionicons 
                        name="cube-outline" 
                        size={16} 
                        color={selectedUnitCategory === 'piece' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')} 
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText 
                        variant={selectedUnitCategory === 'piece' ? 'label' : 'default'} 
                        size="sm"
                        className={selectedUnitCategory === 'piece' ? 'text-white' : ''}
                      >
                        Pièces ({getCategoryCount('piece')})
                      </ThemedText>
                    </TouchableOpacity>

                    {/* Weight category chip */}
                    <TouchableOpacity
                      onPress={() => setSelectedUnitCategory('weight')}
                      className={`flex-row items-center px-4 py-2.5 rounded-full border ${
                        selectedUnitCategory === 'weight'
                          ? 'bg-brand border-brand'
                          : 'bg-surface dark:bg-dark-surface border-border dark:border-dark-border'
                      }`}
                    >
                      <Ionicons 
                        name="scale-outline" 
                        size={16} 
                        color={selectedUnitCategory === 'weight' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')} 
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText 
                        variant={selectedUnitCategory === 'weight' ? 'label' : 'default'} 
                        size="sm"
                        className={selectedUnitCategory === 'weight' ? 'text-white' : ''}
                      >
                        Poids ({getCategoryCount('weight')})
                      </ThemedText>
                    </TouchableOpacity>

                    {/* Volume category chip */}
                    <TouchableOpacity
                      onPress={() => setSelectedUnitCategory('volume')}
                      className={`flex-row items-center px-4 py-2.5 rounded-full border ${
                        selectedUnitCategory === 'volume'
                          ? 'bg-brand border-brand'
                          : 'bg-surface dark:bg-dark-surface border-border dark:border-dark-border'
                      }`}
                    >
                      <Ionicons 
                        name="flask-outline" 
                        size={16} 
                        color={selectedUnitCategory === 'volume' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')} 
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText 
                        variant={selectedUnitCategory === 'volume' ? 'label' : 'default'} 
                        size="sm"
                        className={selectedUnitCategory === 'volume' ? 'text-white' : ''}
                      >
                        Volume ({getCategoryCount('volume')})
                      </ThemedText>
                    </TouchableOpacity>

                    {/* Length category chip */}
                    <TouchableOpacity
                      onPress={() => setSelectedUnitCategory('length')}
                      className={`flex-row items-center px-4 py-2.5 rounded-full border ${
                        selectedUnitCategory === 'length'
                          ? 'bg-brand border-brand'
                          : 'bg-surface dark:bg-dark-surface border-border dark:border-dark-border'
                      }`}
                    >
                      <Ionicons 
                        name="resize-outline" 
                        size={16} 
                        color={selectedUnitCategory === 'length' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')} 
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText 
                        variant={selectedUnitCategory === 'length' ? 'label' : 'default'} 
                        size="sm"
                        className={selectedUnitCategory === 'length' ? 'text-white' : ''}
                      >
                        Longueur ({getCategoryCount('length')})
                      </ThemedText>
                    </TouchableOpacity>
                      
                  </ScrollView>

                  {/* Unit selector with filtered options */}
                  <View className="flex-row gap-3 mt-2">
                    <View className="flex-1">
                      <Select
                        label="Choisir une unité"
                        value={formData.sellingUnit}
                        onValueChange={(v) => updateField('sellingUnit', v)}
                        options={getFilteredSellingUnits()}
                        placeholder={selectedUnitCategory === 'all' 
                          ? "Toutes les unités..." 
                          : `Unités de ${selectedUnitCategory === 'piece' ? 'pièces' : 
                                        selectedUnitCategory === 'pack' ? 'packs' :
                                        selectedUnitCategory === 'weight' ? 'poids' :
                                        selectedUnitCategory === 'volume' ? 'volume' : 'longueur'}...`}
                        leftIcon="arrow-up-circle-outline"
                      />
                      
                      {/* Show count of filtered results */}
                      <ThemedText variant="muted" size="xs" className="mt-1 ml-1">
                        {getFilteredSellingUnits().length} unité(s) disponible(s)
                      </ThemedText>
                    </View>
                    
                    <View className="flex-1">
                      <Input
                        label={`Équivalent en ${formData.baseUnit}`}
                        value={`1 ${formData.sellingUnit} = ${getUnitInfo(formData.sellingUnit)?.base || 1} ${formData.baseUnit}`}
                        editable={false}
                        leftIcon="swap-horizontal-outline"
                        className="bg-surface-muted dark:bg-dark-surface-muted"
                      />
                    </View>
                  </View>

                  {/* Quick pick suggestions - Show popular units for the selected category */}
                  {selectedUnitCategory !== 'all' && (
                    <View className="mt-3">
                      <ThemedText variant="muted" size="xs" className="mb-2">
                        Suggestions rapides:
                      </ThemedText>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {getFilteredSellingUnits().slice(0, 5).map((unit) => (
                          <TouchableOpacity
                            key={unit.value}
                            onPress={() => updateField('sellingUnit', unit.value)}
                            className={`px-3 py-1.5 rounded-full border ${
                              formData.sellingUnit === unit.value
                                ? 'bg-brand border-brand'
                                : 'bg-surface-muted dark:bg-dark-surface-muted border-border dark:border-dark-border'
                            }`}
                          >
                            <ThemedText 
                              variant={formData.sellingUnit === unit.value ? 'label' : 'default'} 
                              size="xs"
                              className={formData.sellingUnit === unit.value ? 'text-white' : ''}
                            >
                              {unit.label}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                

                {/* Show conversion between purchase and selling units if different */}
                {formData.sellingUnit !== formData.purchaseUnit && (
                  <View className="bg-surface-muted dark:bg-dark-surface-muted p-3 rounded-sm">
                    <View className="flex-row justify-between items-center">
                      <ThemedText variant="muted" size="xs">Conversion achat → vente:</ThemedText>
                      <ThemedText variant="default" size="sm" className="font-semibold">
                        1 {formData.purchaseUnit} = {conversionMatrix.purchaseToSelling.value.toFixed(2)} {formData.sellingUnit}
                      </ThemedText>
                    </View>
                    <View className="flex-row justify-between items-center mt-1">
                      <ThemedText variant="muted" size="xs">Conversion vente → achat:</ThemedText>
                      <ThemedText variant="default" size="sm" className="font-semibold">
                        1 {formData.sellingUnit} = {conversionMatrix.sellingToPurchase.value.toFixed(2)} {formData.purchaseUnit}
                      </ThemedText>
                    </View>
                  </View>
                )}

                <View className="h-px bg-border dark:bg-dark-border my-2" />

                {/* Purchase Calculator */}
                <View className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <Input
                      label={`Prix total pour ${purchaseQuantity.toFixed(2)} ${formData.purchaseUnit}${purchaseQuantity > 1 ? 's' : ''}`}
                      placeholder="0"
                      value={String(formData.totalPurchaseCost)}
                      onChangeText={(v) => updateField('totalPurchaseCost', parseFloat(v) || 0)}
                      keyboardType="numeric"
                      leftIcon="cash-outline"
                    />
                  </View>
                </View>

                {/* Purchase Quantity Controls */}
                <View className="bg-surface-muted dark:bg-dark-surface-muted p-3 rounded-lg">
                  <ThemedText variant="muted" size="sm" className="mb-2">
                    Quantité achetée ({formData.purchaseUnit})
                  </ThemedText>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() => handlePurchaseQuantityChange(purchaseQuantity - 1)}
                      disabled={purchaseQuantity <= 0.001}
                      className="w-10 h-10 rounded-lg bg-surface dark:bg-dark-surface items-center justify-center"
                    >
                      <Ionicons name="remove" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                    </TouchableOpacity>

                    <View className="flex-1">
                      <RNTextInput
                        value={purchaseQuantity.toFixed(2)}
                        onChangeText={(v) => {
                          const val = parseFloat(v);
                          if (!isNaN(val)) {
                            handlePurchaseQuantityChange(val);
                          }
                        }}
                        keyboardType="numeric"
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-center text-base"
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() => handlePurchaseQuantityChange(purchaseQuantity + 1)}
                      className="w-10 h-10 rounded-lg bg-surface dark:bg-dark-surface items-center justify-center"
                    >
                      <Ionicons name="add" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Price per unit summary */}
                <View className="bg-surface-muted dark:bg-dark-surface-muted p-3 rounded-lg">
                  <View className="flex-row justify-between items-center mb-1">
                    <ThemedText variant="muted" size="xs">Prix par {formData.purchaseUnit}:</ThemedText>
                    <ThemedText variant="default" size="sm" className="font-semibold">
                      {formatCurrency(purchaseQuantity > 0 ? formData.totalPurchaseCost / purchaseQuantity : 0)}
                    </ThemedText>
                  </View>
                  <View className="flex-row justify-between items-center mb-1">
                    <ThemedText variant="muted" size="xs">Prix par {formData.baseUnit}:</ThemedText>
                    <ThemedText variant="default" size="sm">
                      {priceMetrics.success ? formatCurrency(priceMetrics.pricePerBaseUnit) : '0 FBU'}
                    </ThemedText>
                  </View>
                  <View className="flex-row justify-between items-center pt-1 border-t border-border dark:border-dark-border">
                    <ThemedText variant="muted" size="xs">Prix de vente par {formData.sellingUnit}:</ThemedText>
                    <ThemedText variant="brand" size="sm" className="font-bold">
                      {formatCurrency(formData.sellingPrice)}
                    </ThemedText>
                  </View>
                </View>

                {/* Selling Price */}
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      label={`Prix de vente / ${formData.sellingUnit}`}
                      placeholder="0"
                      value={String(formData.sellingPrice)}
                      onChangeText={(v) => updateField('sellingPrice', parseFloat(v) || 0)}
                      keyboardType="numeric"
                      leftIcon="arrow-up-circle-outline"
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Marge bénéficiaire"
                      value={`${profitAnalysis.perSellingUnit.margin.toFixed(1)}%`}
                      editable={false}
                      leftIcon="trending-up-outline"
                    />
                  </View>
                </View>

                {/* Price Calculator Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setShowPriceCalculator(true)}
                  icon="calculator-outline"
                >
                  Calculateur de prix
                </Button>
              </CardContent>
            </Card>

            {/* ========== PRICE CALCULATOR MODAL ========== */}
            <Modal
              visible={showPriceCalculator}
              transparent
              animationType="slide"
              onRequestClose={() => setShowPriceCalculator(false)}
            >
              <View className="flex-1 bg-overlay">
                <View className="flex-1 mt-20 bg-surface dark:bg-dark-surface rounded-t-3xl">
                  <View className="p-4 border-b border-border dark:border-dark-border">
                    <View className="flex-row justify-between items-center">
                      <ThemedText variant="heading" size="lg" className="text-text dark:text-dark-text">
                        Calculateur de prix
                      </ThemedText>
                      <TouchableOpacity
                        onPress={() => setShowPriceCalculator(false)}
                        className="w-10 h-10 rounded-full bg-surface-muted dark:bg-dark-surface-muted items-center justify-center"
                      >
                        <Ionicons name="close" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView className="p-4">
                    <Card>
                      <CardContent className="p-4">
                        <ThemedText variant="subheading" size="sm" className="mb-4">
                          Calculer le prix de vente à partir de la marge souhaitée
                        </ThemedText>

                        <View className="mb-4">
                          <ThemedText variant="muted" size="sm" className="mb-2">
                            Coût par {formData.sellingUnit}
                          </ThemedText>
                          <Input
                            value={formatCurrency(profitAnalysis.perSellingUnit.cost)}
                            editable={false}
                            leftIcon="cash-outline"
                          />
                        </View>

                        <View className="mb-4">
                          <ThemedText variant="muted" size="sm" className="mb-2">
                            Marge souhaitée (%)
                          </ThemedText>
                          <View className="flex-row gap-3">
                            {[20, 30, 50, 100].map((margin) => (
                              <TouchableOpacity
                                key={margin}
                                onPress={() => {
                                  const cost = profitAnalysis.perSellingUnit.cost;
                                  const price = cost * (1 + margin / 100);
                                  updateField('sellingPrice', price);
                                }}
                                className="flex-1 py-2 bg-surface-muted dark:bg-dark-surface-muted rounded-lg items-center"
                              >
                                <ThemedText variant="default" size="sm">{margin}%</ThemedText>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>

                        <View className="mb-4">
                          <ThemedText variant="muted" size="sm" className="mb-2">
                            Prix recommandés
                          </ThemedText>
                          {[20, 30, 50, 100].map((margin) => {
                            const cost = profitAnalysis.perSellingUnit.cost;
                            const price = cost * (1 + margin / 100);
                            return (
                              <TouchableOpacity
                                key={margin}
                                onPress={() => updateField('sellingPrice', price)}
                                className="flex-row justify-between items-center p-3 border-b border-border dark:border-dark-border"
                              >
                                <ThemedText variant="default">Marge {margin}%</ThemedText>
                                <ThemedText variant="brand" className="font-semibold">
                                  {formatCurrency(price)}
                                </ThemedText>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <Button
                          onPress={() => setShowPriceCalculator(false)}
                        >
                          Fermer
                        </Button>
                      </CardContent>
                    </Card>
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* ========== UNIT HELPER MODAL ========== */}
            <Modal
              visible={showUnitHelper}
              transparent
              animationType="slide"
              onRequestClose={() => setShowUnitHelper(false)}
            >
              <View className="flex-1 bg-overlay">
                <View className="flex-1 mt-20 bg-surface dark:bg-dark-surface rounded-t-3xl">
                  <View className="p-4 border-b border-border dark:border-dark-border">
                    <View className="flex-row justify-between items-center">
                      <ThemedText variant="heading" size="lg" className="text-text dark:text-dark-text">
                        Convertisseur d'unités
                      </ThemedText>
                      <TouchableOpacity
                        onPress={() => setShowUnitHelper(false)}
                        className="w-10 h-10 rounded-full bg-surface-muted dark:bg-dark-surface-muted items-center justify-center"
                      >
                        <Ionicons name="close" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView className="p-4">
                    {/* Unit Tabs */}
                    <View className="flex-row gap-2 mb-6">
                      {[
                        { key: 'purchase', label: 'Achat', icon: 'arrow-down-circle' },
                        { key: 'selling', label: 'Vente', icon: 'arrow-up-circle' },
                        { key: 'base', label: 'Base', icon: 'cube' }
                      ].map((tab) => (
                        <TouchableOpacity
                          key={tab.key}
                          onPress={() => setActiveUnitTab(tab.key as any)}
                          className={`flex-1 py-3 rounded-lg flex-row items-center justify-center gap-2 ${
                            activeUnitTab === tab.key
                              ? 'bg-brand'
                              : 'bg-surface-muted dark:bg-dark-surface-muted'
                          }`}
                        >
                          <Ionicons
                            name={tab.icon as any}
                            size={18}
                            color={activeUnitTab === tab.key ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')}
                          />
                          <ThemedText
                            variant={activeUnitTab === tab.key ? 'label' : 'muted'}
                            size="sm"
                          >
                            {tab.label}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Conversion Matrix */}
                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <ThemedText variant="subheading" size="sm" className="text-text dark:text-dark-text mb-4">
                          Facteurs de conversion
                        </ThemedText>

                        <View className="gap-3">
                          <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                            <ThemedText variant="muted" className="text-text-muted dark:text-dark-text-muted">
                              1 {formData.purchaseUnit} (achat) =
                            </ThemedText>
                            <ThemedText variant="default" className="text-text dark:text-dark-text font-semibold">
                              {formData.purchaseUnitSize} {formData.baseUnit}
                            </ThemedText>
                          </View>

                          <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                            <ThemedText variant="muted" className="text-text-muted dark:text-dark-text-muted">
                              1 {formData.sellingUnit} (vente) =
                            </ThemedText>
                            <ThemedText variant="default" className="text-text dark:text-dark-text font-semibold">
                              {getUnitInfo(formData.sellingUnit)?.base || 1} {formData.baseUnit}
                            </ThemedText>
                          </View>

                          <View className="flex-row justify-between items-center py-2 bg-surface-muted dark:bg-dark-surface-muted p-3 rounded-lg mt-2">
                            <ThemedText variant="default" className="text-text dark:text-dark-text font-medium">
                              1 {formData.purchaseUnit} =
                            </ThemedText>
                            <ThemedText variant="brand" size="lg" className="font-bold">
                              {conversionMatrix.purchaseToSelling.value.toFixed(2)} {formData.sellingUnit}
                            </ThemedText>
                          </View>
                        </View>
                      </CardContent>
                    </Card>

                    {/* Stock in different units */}
                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <ThemedText variant="subheading" size="sm" className="text-text dark:text-dark-text mb-4">
                          Stock dans différentes unités
                        </ThemedText>

                        <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                          <ThemedText variant="muted" className="text-text-muted dark:text-dark-text-muted">
                            En {formData.baseUnit} (base):
                          </ThemedText>
                          <ThemedText variant="default" className="text-text dark:text-dark-text">
                            {formData.stockQuantity.toFixed(2)} {formData.baseUnit}
                          </ThemedText>
                        </View>

                        <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                          <ThemedText variant="muted" className="text-text-muted dark:text-dark-text-muted">
                            En {formData.purchaseUnit}:
                          </ThemedText>
                          <ThemedText variant="default" className="text-text dark:text-dark-text">
                            {stockInPurchaseUnits.toFixed(2)} {formData.purchaseUnit}
                          </ThemedText>
                        </View>

                        <View className="flex-row justify-between items-center py-2">
                          <ThemedText variant="muted" className="text-text-muted dark:text-dark-text-muted">
                            En {formData.sellingUnit}:
                          </ThemedText>
                          <ThemedText variant="default" className="text-text dark:text-dark-text">
                            {stockInSellingUnits.toFixed(2)} {formData.sellingUnit}
                          </ThemedText>
                        </View>
                      </CardContent>
                    </Card>

                    {/* Unit suggestions */}
                    <Card>
                      <CardContent className="p-4">
                        <ThemedText variant="subheading" size="sm" className="text-text dark:text-dark-text mb-4">
                          Unités recommandées
                        </ThemedText>

                        {getUnitsByType(formData.unitType).map((unit) => {
                          if (unit.value === formData.sellingUnit) return null;

                          const conversion = unitConverter.convert(formData.sellingUnit, unit.value, formData.sellingPrice);
                          const priceInUnit = conversion.success ? conversion.value : 0;

                          return (
                            <TouchableOpacity
                              key={unit.value}
                              onPress={() => {
                                updateField('sellingUnit', unit.value);
                                setShowUnitHelper(false);
                              }}
                              className="flex-row justify-between items-center p-3 rounded-lg mb-2 bg-surface-muted dark:bg-dark-surface-muted"
                            >
                              <View>
                                <ThemedText variant="default" size="sm" className="text-text dark:text-dark-text">
                                  {unit.label}
                                </ThemedText>
                                <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">
                                  1 {unit.value} = {unit.base} {formData.baseUnit}
                                </ThemedText>
                              </View>
                              <View className="items-end">
                                <ThemedText variant="brand" size="sm" className="font-semibold">
                                  {formatCurrency(priceInUnit)}
                                </ThemedText>
                                <ThemedText variant="muted" size="xs">
                                  par unité
                                </ThemedText>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* ========== STOCK SECTION ========== */}
            <Card>
              <CardContent className="p-4 gap-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-8 h-8 rounded-full bg-info-soft dark:bg-dark-info-soft items-center justify-center">
                    <Ionicons name="cube-outline" size={18} color="#0ea5e9" />
                  </View>
                  <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
                    Gestion de stock
                  </ThemedText>
                </View>

                {/* Stock in different units */}
                <View className="bg-surface-muted dark:bg-dark-surface-muted p-4 rounded-lg">
                  <View className="flex-row justify-between items-center mb-3">
                    <ThemedText variant="default" size="sm" className="font-medium">
                      Stock actuel
                    </ThemedText>
                    <View className={`
                      px-2 py-1 rounded-full
                      ${formData.stockQuantity === 0 ? 'bg-error/10' :
                        formData.stockQuantity <= formData.lowStockThreshold ? 'bg-warning/10' :
                        'bg-success/10'}
                    `}>
                      <ThemedText
                        variant={
                          formData.stockQuantity === 0 ? 'error' :
                          formData.stockQuantity <= formData.lowStockThreshold ? 'warning' :
                          'success'
                        }
                        size="xs"
                      >
                        {formData.stockQuantity === 0 ? 'Rupture' :
                         formData.stockQuantity <= formData.lowStockThreshold ? 'Stock bas' :
                         'En stock'}
                      </ThemedText>
                    </View>
                  </View>

                  <View className="flex-row justify-between items-center mb-2">
                    <ThemedText variant="muted" size="xs">En {formData.purchaseUnit}s:</ThemedText>
                    <ThemedText variant="default" size="sm">
                      {stockInPurchaseUnits.toFixed(2)} {formData.purchaseUnit}
                    </ThemedText>
                  </View>

                  <View className="flex-row justify-between items-center mb-2">
                    <ThemedText variant="muted" size="xs">En {formData.baseUnit}:</ThemedText>
                    <ThemedText variant="default" size="sm" className="font-semibold">
                      {formData.stockQuantity.toFixed(2)} {formData.baseUnit}
                    </ThemedText>
                  </View>

                  <View className="flex-row justify-between items-center">
                    <ThemedText variant="muted" size="xs">En {formData.sellingUnit}s:</ThemedText>
                    <ThemedText variant="default" size="sm">
                      {stockInSellingUnits.toFixed(2)} {formData.sellingUnit}
                    </ThemedText>
                  </View>
                </View>

                {/* Stock Input in Base Units */}
                <Input
                  label={`Stock (en ${formData.baseUnit})`}
                  placeholder="0"
                  value={String(formData.stockQuantity)}
                  onChangeText={(v) => handleStockQuantityChange(parseFloat(v) || 0)}
                  keyboardType="numeric"
                  leftIcon="cube-outline"
                />

                {/* Stock Value Summary */}
                <View className="bg-surface-muted dark:bg-dark-surface-muted p-4 rounded-lg">
                  <View className="flex-row justify-between items-center mb-2">
                    <ThemedText variant="muted" size="xs">Valeur du stock (coût):</ThemedText>
                    <ThemedText variant="default" size="sm" className="font-semibold">
                      {formatCurrency(profitAnalysis.stockValue)}
                    </ThemedText>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <ThemedText variant="muted" size="xs">Revenu potentiel:</ThemedText>
                    <ThemedText variant="success" size="sm" className="font-semibold">
                      {formatCurrency(profitAnalysis.potentialRevenue)}
                    </ThemedText>
                  </View>
                </View>

                {/* Low Stock Threshold */}
                <Input
                  label="Seuil d'alerte stock bas"
                  placeholder="10"
                  value={String(formData.lowStockThreshold)}
                  onChangeText={(v) => updateField('lowStockThreshold', parseInt(v) || 10)}
                  keyboardType="numeric"
                  leftIcon="alert-circle-outline"
                />
              </CardContent>
            </Card>

            {/* ========== WHOLESALE PRICE ========== */}
            <Card>
              <CardContent className="p-4 gap-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-8 h-8 rounded-full bg-accent-soft dark:bg-dark-accent-soft items-center justify-center">
                    <Ionicons name="people-outline" size={18} color="#dc2626" />
                  </View>
                  <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
                    Prix de gros
                  </ThemedText>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      label={`Prix de gros / ${formData.sellingUnit}`}
                      placeholder="0"
                      value={String(formData.wholesalePrice)}
                      onChangeText={(v) => updateField('wholesalePrice', parseFloat(v) || 0)}
                      keyboardType="numeric"
                      leftIcon="people-outline"
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Remise"
                      value={formData.sellingPrice > 0
                        ? `${((1 - formData.wholesalePrice / formData.sellingPrice) * 100).toFixed(1)}%`
                        : '0%'}
                      editable={false}
                      leftIcon="pricetag-outline"
                    />
                  </View>
                </View>

                <View className="flex-row gap-2">
                  {[5, 10, 15, 20].map((discount) => (
                    <TouchableOpacity
                      key={discount}
                      onPress={() => {
                        const wholesale = formData.sellingPrice * (1 - discount / 100);
                        updateField('wholesalePrice', Math.round(wholesale * 100) / 100);
                      }}
                      className="flex-1 py-2 bg-surface-muted dark:bg-dark-surface-muted rounded-lg items-center"
                    >
                      <ThemedText variant="default" size="sm">{discount}%</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </CardContent>
            </Card>

            {/* ========== ADVANCED SETTINGS ========== */}
            {showAdvanced && (
              <>
                <Card>
                  <CardContent className="p-4 gap-4">
                    <View className="flex-row items-center gap-2 mb-2">
                      <View className="w-8 h-8 rounded-full bg-accent-soft dark:bg-dark-accent-soft items-center justify-center">
                        <Ionicons name="settings-outline" size={18} color="#dc2626" />
                      </View>
                      <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
                        Paramètres avancés
                      </ThemedText>
                    </View>

                    <View className="flex-row items-center justify-between py-2">
                      <View>
                        <ThemedText variant="default" size="sm" className="text-text dark:text-dark-text">
                          Produit actif
                        </ThemedText>
                        <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">
                          Visible dans les ventes
                        </ThemedText>
                      </View>
                      <Switch
                        checked={formData.isActive}
                        onChange={(v: boolean) => updateField('isActive', v)}
                      />
                    </View>

                    <View className="flex-row items-center justify-between py-2">
                      <View>
                        <ThemedText variant="default" size="sm" className="text-text dark:text-dark-text">
                          Produit périssable
                        </ThemedText>
                        <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">
                          A une date d'expiration
                        </ThemedText>
                      </View>
                      <Switch
                        checked={formData.isPerishable}
                        onChange={(v: boolean) => updateField('isPerishable', v)}
                      />
                    </View>

                    {formData.isPerishable && (
                      <Input
                        label="Durée de conservation (jours)"
                        placeholder="30"
                        value={String(formData.defaultExpiryDays)}
                        onChangeText={(v) => updateField('defaultExpiryDays', parseInt(v) || 0)}
                        keyboardType="numeric"
                        leftIcon="calendar-outline"
                      />
                    )}

                    <Input
                      label="Description"
                      placeholder="Description optionnelle du produit"
                      value={formData.description}
                      onChangeText={(v) => updateField('description', v)}
                      multiline
                      numberOfLines={3}
                      leftIcon="document-text-outline"
                    />
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                {!isNewProduct && (
                  <Card className="border-2 border-error/20">
                    <CardContent className="p-4">
                      <View className="flex-row items-center gap-2 mb-4">
                        <View className="w-8 h-8 rounded-full bg-error-soft dark:bg-dark-error-soft items-center justify-center">
                          <Ionicons name="warning-outline" size={18} color="#ef4444" />
                        </View>
                        <ThemedText variant="error" size="base" className="font-semibold">
                          Zone dangereuse
                        </ThemedText>
                      </View>

                      <Button
                        variant="destructive"
                        onPress={handleDelete}
                        icon="trash-outline"
                      >
                        Supprimer le produit
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ========== SAVE BUTTONS ========== */}
            <View className="flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onPress={() => {
                  if (hasUnsavedChanges) {
                    Alert.alert(
                      'Annuler',
                      'Voulez-vous vraiment annuler ? Les modifications seront perdues.',
                      [
                        { text: 'Continuer', style: 'cancel' },
                        { text: 'Annuler', onPress: () => router.back() }
                      ]
                    );
                  } else {
                    router.back();
                  }
                }}
                className="flex-1"
              >
                Annuler
              </Button>

              <Button
                variant="default"
                onPress={saveProduct}
                loading={saving}
                className="flex-1"
                disabled={!unitValidation.valid}
              >
                {saving ? 'Sauvegarde...' : (isNewProduct ? 'Créer' : 'Enregistrer')}
              </Button>
            </View>
            {/* ========== UNIT SETUP PROGRESS & VALIDATION GUIDE ========== */}
            <Card className="mt-4 border-2 border-brand/20">
              <CardContent className="p-4">
                {/* Header with progress */}
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full bg-brand-soft dark:bg-dark-brand-soft items-center justify-center">
                      <Ionicons name="checkmark-done-circle" size={18} color="#0ea5e9" />
                    </View>
                    <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
                      Configuration
                    </ThemedText>
                  </View>
                  
                  {/* Progress badge */}
                  <View className="flex-row items-center gap-2">
                    <View className="px-3 py-1.5 bg-surface-muted dark:bg-dark-surface-muted rounded-full">
                      <ThemedText variant="brand" size="xs" className="font-semibold">
                        {setupProgress.completed}/{setupProgress.total} complété
                      </ThemedText>
                    </View>
                    <View className="w-16 h-2 bg-surface-muted dark:bg-dark-surface-muted rounded-full overflow-hidden">
                      <View 
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${setupProgress.percentage}%` }}
                      />
                    </View>
                  </View>
                </View>

                {/* Step-by-step guide */}
                <View className="gap-3">
                  {getUnitSetupProgress().map((step, index) => {
                    const hasError = unitValidation.errors.some(e => 
                      e.toLowerCase().includes(step.id.toLowerCase()) ||
                      e.toLowerCase().includes(step.label.toLowerCase())
                    );
                    
                    return (
                      <View key={step.id} className="flex-row items-start gap-3">
                        {/* Step number with status indicator */}
                        <View className="items-center">
                          <View className={`
                            w-8 h-8 rounded-full items-center justify-center
                            ${step.completed ? 'bg-success/20' : hasError ? 'bg-error/20' : 'bg-surface-muted dark:bg-dark-surface-muted'}
                          `}>
                            <Ionicons 
                              name={step.completed ? 'checkmark' : hasError ? 'alert' : step.icon}
                              size={16}
                              color={
                                step.completed ? '#22c55e' : 
                                hasError ? '#ef4444' : 
                                isDark ? '#94a3b8' : '#64748b'
                              }
                            />
                          </View>
                          {index < getUnitSetupProgress().length - 1 && (
                            <View className={`
                              w-0.5 h-8 mt-1
                              ${step.completed ? 'bg-success/30' : 'bg-surface-muted dark:bg-dark-surface-muted'}
                            `} />
                          )}
                        </View>

                        {/* Step content */}
                        <View className="flex-1 pb-4">
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-2">
                              <ThemedText 
                                variant="default" 
                                size="sm" 
                                className={`
                                  font-medium
                                  ${step.completed ? 'text-success' : 
                                    hasError ? 'text-error' : 'text-text dark:text-dark-text'}
                                `}
                              >
                                {step.label}
                              </ThemedText>
                              {step.completed && (
                                <View className="px-2 py-0.5 bg-success/10 rounded-full">
                                  <ThemedText variant="success" size="xs" className="font-medium">
                                    Complété
                                  </ThemedText>
                                </View>
                              )}
                              {hasError && !step.completed && (
                                <View className="px-2 py-0.5 bg-error/10 rounded-full">
                                  <ThemedText variant="error" size="xs" className="font-medium">
                                    À corriger
                                  </ThemedText>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Current value */}
                          <View className="flex-row items-center gap-2 mt-1">
                            <Ionicons 
                              name="information-circle-outline" 
                              size={14} 
                              color={isDark ? '#475569' : '#94a3b8'} 
                            />
                            <ThemedText variant="muted" size="xs" className="flex-1">
                              {step.current}
                            </ThemedText>
                          </View>

                          {/* Specific error message for this step */}
                          {hasError && !step.completed && (
                            <View className="mt-2 p-2 bg-error/10 rounded-lg">
                              <ThemedText variant="error" size="xs" className="font-medium">
                                {unitValidation.errors.find(e => 
                                  e.toLowerCase().includes(step.id.toLowerCase()) ||
                                  e.toLowerCase().includes(step.label.toLowerCase())
                                )}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Validation summary */}
                {!unitValidation.valid && (
                  <View className="mt-4 p-4 bg-error/10 border border-error/20 rounded-lg">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Ionicons name="alert-circle" size={20} color="#ef4444" />
                      <ThemedText variant="error" size="sm" className="font-semibold">
                        Problèmes à résoudre
                      </ThemedText>
                    </View>
                    
                    {/* List all errors */}
                    {unitValidation.errors.map((error, index) => (
                      <View key={index} className="flex-row items-start gap-2 mb-2">
                        <Ionicons name="close-circle" size={16} color="#ef4444" style={{ marginTop: 2 }} />
                        <ThemedText variant="error" size="xs" className="flex-1">
                          {error}
                        </ThemedText>
                      </View>
                    ))}

                    {/* Quick fix suggestions */}
                    <View className="mt-3 p-3 bg-info-soft dark:bg-dark-info-soft rounded-lg">
                      {
                        unitValidation.errors.length > 0 && (
                          <View className="flex-row items-center gap-2 mb-2">
                            <Ionicons name="bulb-outline" size={16} color="#0ea5e9" />
                            <ThemedText variant="brand" size="xs" className="font-medium">
                              Suggestions
                            </ThemedText>
                          </View>
                        )
                      }
                      
                      {unitValidation.errors.map((error, index) => {
                        if (error.includes('type') && !formData.unitType) {
                          return (
                            <ThemedText key={index} variant="muted" size="xs" className="mb-1 ml-2">
                              • Sélectionnez d'abord le type d'unité (pièce, poids, volume, etc.)
                            </ThemedText>
                          );
                        }
                        if (error.includes('base') && !formData.baseUnit) {
                          return (
                            <ThemedText key={index} variant="muted" size="xs" className="mb-1 ml-2">
                              • Choisissez l'unité de base (kg pour poids, L pour volume, etc.)
                            </ThemedText>
                          );
                        }
                        if (error.includes('purchase') && !formData.purchaseUnit) {
                          return (
                            <ThemedText key={index} variant="muted" size="xs" className="mb-1 ml-2">
                              • Sélectionnez l'unité d'achat (comment vous achetez le produit)
                            </ThemedText>
                          );
                        }
                        if (error.includes('selling') && !formData.sellingUnit) {
                          return (
                            <ThemedText key={index} variant="muted" size="xs" className="mb-1 ml-2">
                              • Sélectionnez l'unité de vente (comment vous vendez le produit)
                            </ThemedText>
                          );
                        }
                        if (error.includes('size') && formData.purchaseUnitSize <= 0) {
                          return (
                            <ThemedText key={index} variant="muted" size="xs" className="mb-1 ml-2">
                              • Vérifiez la taille de l'unité d'achat (nombre de {formData.baseUnit} par {formData.purchaseUnit})
                            </ThemedText>
                          );
                        }
                        return null;
                      })}
                    </View>
                  </View>
                )}

                {/* Success message when everything is valid */}
                {unitValidation.valid && (
                  <View className="mt-4 p-4 bg-success/10 border border-success/20 rounded-lg">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                      <View className="flex-1">
                        <ThemedText variant="success" size="sm" className="font-semibold">
                          Configuration complète !
                        </ThemedText>
                        <ThemedText variant="success" size="xs" className="opacity-80">
                          Toutes les unités sont correctement configurées. Vous pouvez enregistrer le produit.
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                )}

                {/* Quick actions based on current state */}
                <View className="flex-row gap-2 mt-4">
                  {!formData.unitType && (
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        // Scroll to unit type selector
                        // You might want to add a ref to scroll to it
                      }}
                      icon="arrow-up-outline"
                      className="flex-1"
                    >
                      Commencer par le type d'unité
                    </Button>
                  )}
                  
                  {formData.unitType && !formData.baseUnit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => setShowBaseUnitSelector(true)}
                      icon="cube-outline"
                      className="flex-1"
                    >
                      Choisir l'unité de base
                    </Button>
                  )}
                  
                  {formData.baseUnit && !formData.purchaseUnit && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon="arrow-down-circle-outline"
                      className="flex-1"
                    >
                      Sélectionner unité d'achat
                    </Button>
                  )}
                  
                  {formData.purchaseUnit && !formData.sellingUnit && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon="arrow-up-circle-outline"
                      className="flex-1"
                    >
                      Sélectionner unité de vente
                    </Button>
                  )}
                </View>

              </CardContent>
            </Card>

            <Button onPress={() => setShowUnitHelper(true)} variant="warning" icon='help-circle-outline'>
              Besoin d'aide avec les unités ?
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}