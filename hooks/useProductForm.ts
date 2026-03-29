// hooks/useProductForm.ts
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { useAuth } from '@/context/AuthContext';
import { Product} from '@/database/models/Product';
import { StockMovement, MovementType } from '@/database/models/StockMovement';
import { 
  getUnitInfo,
  getUnitsByType,
  UnitType,
} from '@/utils/unitConversions';
import {
  calculateConversionMatrix,
  calculatePriceMetrics,
  getDefaultBaseUnit,
  getDefaultUnit,
  validateProductUnits,
  ProductUnits,
  ProductConversionMatrix,
  PriceConversionResult,
} from '@/utils/productUnitConversions';

export interface ProductFormData {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  description: string;
  unitType: UnitType;
  isWeighted: boolean;
  baseUnit: string;
  purchaseUnit: string;
  purchaseUnitSize: number;
  sellingUnit: string;
  totalPurchaseCost: number;
  sellingPrice: number;
  wholesalePrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  isPerishable: boolean;
  defaultExpiryDays: number;
  imageUrl: string;
  imageThumbnailUrl: string;
}

export interface ProfitAnalysis {
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

export function useProductForm(productId: string, isNewProduct: boolean) {
  const router = useRouter();
  const { currentShop, user } = useAuth();
  
  const isUpdatingFromStock = useRef(false);
  const isUpdatingFromPurchase = useRef(false);
  
  const [loading, setLoading] = useState(!isNewProduct);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageUploading, setImageUploading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnitHelper, setShowUnitHelper] = useState(false);
  const [activeUnitTab, setActiveUnitTab] = useState<'purchase' | 'selling' | 'base'>('purchase');
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [showPriceCalculator, setShowPriceCalculator] = useState(false);
  const [unitValidation, setUnitValidation] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] });
  const [selectedUnitCategory, setSelectedUnitCategory] = useState<'all' | 'piece' | 'pack' | 'weight' | 'volume' | 'length'>('all');
  const [showBaseUnitSelector, setShowBaseUnitSelector] = useState(false);

  const productUnits = useMemo((): ProductUnits => ({
    unitType: formData.unitType,
    baseUnit: formData.baseUnit,
    purchaseUnit: formData.purchaseUnit,
    purchaseUnitSize: formData.purchaseUnitSize,
    sellingUnit: formData.sellingUnit,
  }), [formData.unitType, formData.baseUnit, formData.purchaseUnit, 
      formData.purchaseUnitSize, formData.sellingUnit]);

  const conversionMatrix = useMemo((): ProductConversionMatrix => {
    return calculateConversionMatrix(productUnits);
  }, [productUnits]);

  const priceMetrics = useMemo((): PriceConversionResult => {
    return calculatePriceMetrics(
      productUnits,
      formData.totalPurchaseCost,
      purchaseQuantity,
      formData.sellingPrice
    );
  }, [productUnits, formData.totalPurchaseCost, purchaseQuantity, formData.sellingPrice]);

  const profitAnalysis = useMemo((): ProfitAnalysis => {
    let costPerBaseUnit = priceMetrics.success ? priceMetrics.pricePerBaseUnit : 0;
    const stockQuantity = formData.stockQuantity || 0;
    
    if (product && stockQuantity > 0 && formData.stockQuantity > 0) {
      const existingCost = product.costPricePerBase;
      const newStockQuantity = Math.max(0, formData.stockQuantity - stockQuantity);
      
      if (newStockQuantity > 0 && priceMetrics.success) {
        costPerBaseUnit = (
          (stockQuantity * existingCost) + 
          (newStockQuantity * priceMetrics.pricePerBaseUnit)
        ) / formData.stockQuantity;
      } else {
        costPerBaseUnit = existingCost;
      }
    }

    const sellingUnitInfo = getUnitInfo(formData.sellingUnit);
    const baseUnitInfo = getUnitInfo(formData.baseUnit);
    const purchaseUnitInfo = getUnitInfo(formData.purchaseUnit);

    const baseUnitsPerSellingUnit = sellingUnitInfo?.base || 1;
    const baseUnitsPerPurchaseUnit = purchaseUnitInfo?.base || formData.purchaseUnitSize;

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

    const breakEvenUnits = profitPerSellingUnit > 0 
      ? (formData.totalPurchaseCost / profitPerSellingUnit) 
      : Infinity;
    const breakEvenRevenue = breakEvenUnits * formData.sellingPrice;

    const stockValue = formData.stockQuantity * costPerBaseUnit;
    const stockInSellingUnits = baseUnitsPerSellingUnit > 0 
      ? formData.stockQuantity / baseUnitsPerSellingUnit 
      : 0;
    const potentialRevenue = stockInSellingUnits * formData.sellingPrice;

    let profitability: 'high' | 'medium' | 'low' | 'loss';
    if (marginPercent >= 50) {
      profitability = 'high';
    } else if (marginPercent >= 20) {
      profitability = 'medium';
    } else if (marginPercent >= 0) {
      profitability = 'low';
    } else {
      profitability = 'loss';
    }

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

  useEffect(() => {
    const validation = validateProductUnits(productUnits);
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

  const updateField = useCallback(<K extends keyof ProductFormData>(
    field: K, 
    value: ProductFormData[K]
  ) => {
    setFormData(prev => {
      let newValue = value;

      if (typeof value === 'number') {
        if (field === 'purchaseUnitSize') {
          newValue = Math.max(0.001, value) as ProductFormData[K];
        } else {
          newValue = Math.max(0, value) as ProductFormData[K];
        }
      }

      const newData = { ...prev, [field]: newValue };

      if (field === 'unitType') {
        const unitType = value as UnitType;
        const baseUnit = getDefaultBaseUnit(unitType);
        const defaultUnit = getDefaultUnit(unitType);
        const defaultUnitInfo = getUnitInfo(defaultUnit);
        
        newData.baseUnit = baseUnit;
        newData.purchaseUnit = defaultUnit;
        newData.sellingUnit = defaultUnit;
        newData.purchaseUnitSize = defaultUnitInfo?.base || 1;
        newData.isWeighted = unitType === 'weight';
      }

      if (field === 'purchaseUnit') {
        const unitInfo = getUnitInfo(value as string);
        if (unitInfo) {
          newData.purchaseUnitSize = unitInfo.base;
        }
      }

      if (field === 'sellingUnit') {
        const oldUnitInfo = getUnitInfo(prev.sellingUnit);
        const newUnitInfo = getUnitInfo(value as string);
        
        if (oldUnitInfo && newUnitInfo && prev.sellingPrice > 0) {
          const priceInBase = prev.sellingPrice / oldUnitInfo.base;
          newData.sellingPrice = priceInBase * newUnitInfo.base;
          
          if (prev.wholesalePrice > 0) {
            const wholesaleInBase = prev.wholesalePrice / oldUnitInfo.base;
            newData.wholesalePrice = wholesaleInBase * newUnitInfo.base;
          }
        }
      }

      setHasUnsavedChanges(true);
      return newData;
    });

    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  }, [errors]);

  const handlePurchaseQuantityChange = useCallback((newQuantity: number) => {
    if (isUpdatingFromStock.current) return;
    isUpdatingFromPurchase.current = true;
    const validQuantity = Math.max(0.001, newQuantity);
    setPurchaseQuantity(validQuantity);
    const newStockQuantity = validQuantity * formData.purchaseUnitSize;
    setFormData(prev => ({
      ...prev,
      stockQuantity: newStockQuantity,
    }));
    isUpdatingFromPurchase.current = false;
  }, [formData.purchaseUnitSize]);

  const handleStockQuantityChange = useCallback((newStock: number) => {
    if (isUpdatingFromPurchase.current) return;
    isUpdatingFromStock.current = true;
    const validStock = Math.max(0, newStock);
    setFormData(prev => ({
      ...prev,
      stockQuantity: validStock,
    }));
    isUpdatingFromStock.current = false;
  }, []);

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

    if (!unitValidation.valid) {
      newErrors.units = unitValidation.errors[0];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  const generateSku = (name: string): string => {
    const prefix = name.substring(0, 3).toUpperCase();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const shopCode = currentShop?.name.substring(0, 2).toUpperCase() || 'XX';
    return `${prefix}-${shopCode}-${random}`;
  };

  const performSave = async () => {
    setSaving(true);
    try {
      const stockIncrease = formData.stockQuantity - (product?.stockQuantity || 0);

      const sellingUnitInfo = getUnitInfo(formData.sellingUnit);
      const basePerSellingUnit = sellingUnitInfo?.base || 1;
      
      const sellingPricePerBase = formData.sellingPrice / basePerSellingUnit;
      const wholesalePricePerBase = formData.wholesalePrice / basePerSellingUnit;

      let newStockCostPerBaseUnit = 0;
      if (purchaseQuantity > 0 && formData.totalPurchaseCost > 0) {
        const purchaseUnitInfo = getUnitInfo(formData.purchaseUnit);
        const basePerPurchaseUnit = purchaseUnitInfo?.base || formData.purchaseUnitSize;
        newStockCostPerBaseUnit = (formData.totalPurchaseCost / purchaseQuantity) / basePerPurchaseUnit;
      }

      await database.write(async () => {
        if (isNewProduct) {
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
            p.shopId = currentShop!.id;
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
          let newCostPerBase = product.costPricePerBase;
          const stockQuantity = product?.stockQuantity || 0;

          if (stockIncrease > 0 && newStockCostPerBaseUnit > 0) {
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

  const formatCurrency = (value: number): string => {
    return `${value.toFixed(2)} FBU`;
  };

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

  const handleBaseUnitChange = useCallback((newBaseUnit: string) => {
    const baseInfo = getUnitInfo(newBaseUnit);
    if (!baseInfo) return;

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

    updateField('baseUnit', newBaseUnit);

    if (formData.stockQuantity > 0) {
      Alert.alert(
        'Attention',
        'Changer l\'unité de base affectera la valeur de votre stock. Vérifiez les conversions après modification.',
        [{ text: 'Compris' }]
      );
    }
  }, [formData.unitType, formData.stockQuantity, updateField]);

  const getFilteredSellingUnits = useCallback(() => {
    let units = [
      ...getUnitsByType('piece').map(u => ({ value: u.value, label: u.label })),
      ...getUnitsByType('pack').map(u => ({ value: u.value, label: u.label })),
      ...getUnitsByType('length').map(u => ({ value: u.value, label: u.label })),
      ...getUnitsByType('volume').map(u => ({ value: u.value, label: u.label })),
      ...getUnitsByType('weight').map(u => ({ value: u.value, label: u.label })),
    ];
    
    if (formData.unitType !== 'piece' && formData.unitType !== 'pack') {
      units = [
        ...units,
        ...getUnitsByType(formData.unitType).map(u => ({ value: u.value, label: u.label }))
      ];
    }
    
    if (selectedUnitCategory !== 'all') {
      units = units.filter(u => {
        const unitInfo = getUnitInfo(u.value);
        return unitInfo?.unitType === selectedUnitCategory;
      });
    }
    
    const uniqueUnits = new Map();
    units.forEach(unit => uniqueUnits.set(unit.value, unit));
    
    return Array.from(uniqueUnits.values());
  }, [formData.unitType, selectedUnitCategory]);

  const getCategoryCount = (category: string) => {
    if (category === 'all') {
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
    
    const units = getUnitsByType(category as any);
    return units.length;
  };

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

  const setupProgress = useMemo(() => {
    const steps = getUnitSetupProgress();
    const completed = steps.filter(s => s.completed).length;
    return {
      total: steps.length,
      completed,
      percentage: Math.round((completed / steps.length) * 100),
    };
  }, [getUnitSetupProgress]);

  return {
    // State
    formData,
    errors,
    loading,
    saving,
    imageUploading,
    hasUnsavedChanges,
    showUnitHelper,
    setShowUnitHelper,
    activeUnitTab,
    setActiveUnitTab,
    purchaseQuantity,
    showPriceCalculator,
    setShowPriceCalculator,
    unitValidation,
    selectedUnitCategory,
    setSelectedUnitCategory,
    showBaseUnitSelector,
    setShowBaseUnitSelector,
    product,
    isNewProduct,
    
    // Computed
    productUnits,
    conversionMatrix,
    priceMetrics,
    profitAnalysis,
    stockInPurchaseUnits,
    stockInSellingUnits,
    setupProgress,
    
    // Actions
    updateField,
    handlePurchaseQuantityChange,
    handleStockQuantityChange,
    saveProduct,
    handleDelete,
    formatCurrency,
    getAvailableBaseUnits,
    handleBaseUnitChange,
    getFilteredSellingUnits,
    getCategoryCount,
    getUnitSetupProgress,
  };
}