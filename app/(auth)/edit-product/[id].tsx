// app/edit-product/[id].tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  Alert, 
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import database from '@/database';  
import { Q } from '@nozbe/watermelondb';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { useAuth } from '@/context/AuthContext';

// CONVERSION METHODS
import { 
  convertUnits, 
  getConversionFactor, 
  isConversionSupported,
  getUnitType ,
  AnyUnit
} from '@/utils/unitConversions';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { Switch } from '@/components/ui/Switch';

// Models
import { Product, UnitType } from '@/database/models/Product';
import { is } from 'zod/v4/locales';
import { StockMovement } from '@/database/models/StockMovement';

interface ProductFormData {
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
  unitConversionFactor: number;
  costPricePerBase: number;
  sellingPricePerBase: number;
  wholesalePricePerBase: number;
  lowStockThreshold: number;
  isActive: boolean;
  isPerishable: boolean;
  defaultExpiryDays: number;
  imageUrl: string;
  imageThumbnailUrl: string;
  stockQuantity: number; // This will be in BASE UNITS for the form
  stockQuantityInPurchaseUnits: number; // For display/input in purchase units
}

const unitOptions = {
  piece: ['piece', 'pack', 'box', 'case', 'carton'],
  weight: ['kg', 'g', 'mg', 'lb', 'oz'],
  volume: ['l', 'ml', 'cl', 'gal', 'fl oz'],
  length: ['m', 'cm', 'mm', 'ft', 'in'],
  pack: ['pack', 'box', 'case', 'carton', 'bundle']
};

const categoryOptions = [
  'Food & Groceries',
  'Beverages',
  'Household',
  'Personal Care',
  'Stationery',
  'Electronics',
  'Clothing',
  'Hardware',
  'Pharmaceuticals',
  'Other'
];


// Default form data for new products
const defaultFormData: ProductFormData = {
  name: '',
  sku: '',
  barcode: '',
  category: 'Other',
  description: '',
  unitType: 'piece',
  isWeighted: false,
  baseUnit: 'piece',
  purchaseUnit: 'piece',
  purchaseUnitSize: 1,
  sellingUnit: 'piece',
  unitConversionFactor: 1,
  costPricePerBase: 0,
  sellingPricePerBase: 0,
  wholesalePricePerBase: 0,
  lowStockThreshold: 10,
  isActive: true,
  isPerishable: false,
  defaultExpiryDays: 0,
  imageUrl: '',
  imageThumbnailUrl: '',
  stockQuantity: 0,
  stockQuantityInPurchaseUnits: 0,
};

export default function EditProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { currentShop, user } = useAuth();
  const [liveStockValue, setLiveStockValue] = useState(0);
  
  const productId = params.id as string;
  const isNewProduct = productId === 'new';
  
  const [loading, setLoading] = useState(!isNewProduct);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [imageUploading, setImageUploading] = useState(false);
  const [takingPhoto, setTakingPhoto] = useState(false);

  useEffect(() => {
    if (isNewProduct) {
      setFormData(defaultFormData);
    }
  }, [formData]);

  useEffect(() => {
    if (!isNewProduct) {
      loadProduct();
    } else {
      setLoading(false);
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);

      if (productId && currentShop) {
        const products = await database.get<Product>('products')
          .query(Q.where('id', productId))
          .fetch();
        
        if (products.length === 0) {
          throw new Error('Product not found');
        }

        setProduct(products[0]);
        const productData = products[0];
        
        // Calculate stock in purchase units for display
        const stockQuantityInPurchaseUnits = productData.purchaseUnitSize > 0 
          ? (productData.stockQuantity || 0) / productData.purchaseUnitSize 
          : 0;
        
        // Populate form with product data
        setFormData({
          name: productData.name || '',
          sku: productData.sku || '',
          barcode: productData.barcode || '',
          category: productData.category || 'Other',
          description: productData.description || '',
          unitType: productData.unitType || 'piece',
          isWeighted: productData.isWeighted || false,
          baseUnit: productData.baseUnit || 'piece',
          purchaseUnit: productData.purchaseUnit || 'piece',
          purchaseUnitSize: productData.purchaseUnitSize || 1,
          sellingUnit: productData.sellingUnit || 'piece',
          unitConversionFactor: productData.unitConversionFactor || 1,
          costPricePerBase: productData.costPricePerBase || 0,
          sellingPricePerBase: productData.sellingPricePerBase || 0,
          wholesalePricePerBase: productData.wholesalePricePerBase || 0,
          lowStockThreshold: productData.lowStockThreshold || 10,
          isActive: productData.isActive ?? true,
          isPerishable: productData.isPerishable || false,
          defaultExpiryDays: productData.defaultExpiryDays || 0,
          imageUrl: productData.imageUrl || '',
          imageThumbnailUrl: productData.imageThumbnailUrl || '',
          stockQuantity: productData.stockQuantity || 0, // Store in base units
          stockQuantityInPurchaseUnits, // For display in purchase units
        });
      }
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product data');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };

      if(field.trim() === 'baseUnit' && formData.baseUnit !== value) {
        
        const isChangeable = isConversionSupported(formData.baseUnit as AnyUnit, value as AnyUnit);
        if(!isChangeable) {
          console.log(`Conversion from ${formData.baseUnit} to ${value} is not supported`);
        }else{
          try {
            const newStockQuantity = convertUnits(formData.baseUnit as AnyUnit, value as AnyUnit, newFormData.stockQuantity);
            newFormData.stockQuantity = newStockQuantity;
            
          } catch (error) {
            console.log(error)
            
          }
          //const newStockQuantityInPurchaseUnits = convertUnits(prevBase as AnyUnit, value as AnyUnit, newFormData.stockQuantityInPurchaseUnits);
          
        }

        return newFormData;
      }
      
      return newFormData;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (formData.costPricePerBase < 0) {
      newErrors.costPricePerBase = 'Cost price cannot be negative';
    }

    if (formData.sellingPricePerBase < 0) {
      newErrors.sellingPricePerBase = 'Selling price cannot be negative';
    }

    if (formData.lowStockThreshold < 0) {
      newErrors.lowStockThreshold = 'Low stock threshold cannot be negative';
    }

    if (formData.stockQuantity < 0) {
      newErrors.stockQuantity = 'Stock quantity cannot be negative';
    }

    if (formData.purchaseUnitSize <= 0) {
      newErrors.purchaseUnitSize = 'Purchase unit size must be greater than 0';
    }

    if (formData.unitConversionFactor <= 0) {
      newErrors.unitConversionFactor = 'Unit conversion factor must be greater than 0';
    }

    if ((formData.purchaseUnit === formData.sellingUnit) && formData.costPricePerBase > formData.sellingPricePerBase) {
      newErrors.sellingPricePerBase = 'Selling price should be higher than cost price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    try {
      setImageUploading(true);
      
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageSave(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setImageUploading(false);
    }
  };

  const takePhoto = async () => {
    try {
      setTakingPhoto(true);
      
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Sorry, we need camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageSave(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setTakingPhoto(false);
    }
  };

  const handleImageSave = async (imageUri: string) => {
    try {
      const fileName = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
      const imagesDir = new Directory(Paths.document, 'images');

      // Create directory if it doesn't exist
      const exists = await imagesDir.exists;
      if (!exists) {
        await imagesDir.create({ intermediates: true });
      }
  
      // Prepare source & destination files
      const sourceFile = new File(imageUri);
      const destFile = new File(imagesDir, fileName);

      // If the file already exists, reuse it
      const fileAlreadyExists = await destFile.exists;
      if (fileAlreadyExists) {
        console.log('⚠️ File already exists, reusing:', destFile.uri);
        updateFormData('imageUrl', destFile.uri);
        updateFormData('imageThumbnailUrl', destFile.uri);
        return;
      }

      // Copy new image
      await sourceFile.copy(destFile);
      const savedUri = destFile.uri;

      updateFormData('imageUrl', savedUri);
      updateFormData('imageThumbnailUrl', savedUri);

    } catch (error) {
      console.error('Error saving image:', error);
      throw error;
    }
  };

  const calculateProfitMargin = () => {
    if (formData.costPricePerBase === 0) return 0;
    const isSupported = isConversionSupported(formData.purchaseUnit as AnyUnit, formData.sellingUnit as AnyUnit);
    if (!isSupported) return;

    if(formData.purchaseUnit !== formData.sellingUnit){
      const vonvertedUnits = convertUnits(formData.purchaseUnit as AnyUnit, formData.sellingUnit as AnyUnit, formData.purchaseUnitSize);
      //console.log("Vonverted units: ",vonvertedUnits)
      const perUnit = formData.costPricePerBase * formData.purchaseUnitSize / vonvertedUnits;
      //console.log("Per unit: ",perUnit)
      return ((formData.sellingPricePerBase - perUnit) / perUnit) * 100;
      
      //return ((perUnit - formData.costPricePerBase) / formData.costPricePerBase) * 100;
    }


    return ((formData.sellingPricePerBase - formData.costPricePerBase) / formData.costPricePerBase) * 100;
  };

  const calculateProfit = () => {
    const isSUpported = isConversionSupported(formData.purchaseUnit as AnyUnit, formData.sellingUnit as AnyUnit);
    if (!isSUpported) return;
    if(formData.purchaseUnit !== formData.sellingUnit){
      const convertedUnits = convertUnits(formData.purchaseUnit as AnyUnit, formData.sellingUnit as AnyUnit, formData.purchaseUnitSize);
      const perUnit = formData.costPricePerBase * formData.purchaseUnitSize / convertedUnits;
      return (formData.sellingPricePerBase - perUnit);
    }else{
      return ( formData.sellingPricePerBase - formData.costPricePerBase);
    }
  };

  const saveProduct = async () => {
  if (!validateForm() || !currentShop) return;
  if (imageUploading) {
    Alert.alert('Please wait', 'Image is being uploaded, please wait...');
    return;
  }

  setSaving(true);
  try {
    const stockIncrease = formData.stockQuantity - (product?.stockQuantity || 0);

    if (isNewProduct) {
      // Create new product
      await database.write(async () => {
        const newProduct = await database.get<Product>('products').create(product => {
          product.name = formData.name.trim();
          product.sku = formData.sku.trim();
          product.barcode = formData.barcode.trim();
          product.category = formData.category;
          product.description = formData.description.trim();
          product.unitType = formData.unitType;
          product.isWeighted = formData.isWeighted;
          product.baseUnit = formData.baseUnit;
          product.purchaseUnit = formData.purchaseUnit;
          product.purchaseUnitSize = formData.purchaseUnitSize;
          product.sellingUnit = formData.sellingUnit;
          product.unitConversionFactor = formData.unitConversionFactor;
          product.costPricePerBase = formData.costPricePerBase;
          product.sellingPricePerBase = formData.sellingPricePerBase;
          product.wholesalePricePerBase = formData.wholesalePricePerBase;
          product.lowStockThreshold = formData.lowStockThreshold;
          product.isActive = formData.isActive;
          product.isPerishable = formData.isPerishable;
          product.defaultExpiryDays = formData.defaultExpiryDays;
          product.imageUrl = formData.imageUrl;
          product.imageThumbnailUrl = formData.imageThumbnailUrl;
          product.stockQuantity = formData.stockQuantity; // base units
          product.shopId = currentShop.id;
        });

        // ✅ If stock was added on creation, record as 'IN' movement
        if (formData.stockQuantity > 0) {
          await database.get<StockMovement>('stock_movements').create(movement => {
            movement.productId = newProduct.id;
            movement.shopId = currentShop.id;
            movement.quantity = formData.stockQuantity; // already in base units
            movement.movementType = 'IN';
            movement.notes = 'Initial stock added during product creation';
            movement.recordedBy = user?.id;
            movement.timestamp = Date.now();
          });
        }
      });

      Alert.alert('Success', 'Product created successfully!');
      router.back();

    } else if (product) {
      // Update existing product
      await database.write(async () => {
        await product.update(record => {
          record.name = formData.name.trim();
          record.sku = formData.sku.trim();
          record.barcode = formData.barcode.trim();
          record.category = formData.category;
          record.description = formData.description.trim();
          record.unitType = formData.unitType;
          record.isWeighted = formData.isWeighted;
          record.baseUnit = formData.baseUnit;
          record.purchaseUnit = formData.purchaseUnit;
          record.purchaseUnitSize = formData.purchaseUnitSize;
          record.sellingUnit = formData.sellingUnit;
          record.unitConversionFactor = formData.unitConversionFactor;
          record.costPricePerBase = formData.costPricePerBase;
          record.sellingPricePerBase = formData.sellingPricePerBase;
          record.wholesalePricePerBase = formData.wholesalePricePerBase;
          record.lowStockThreshold = formData.lowStockThreshold;
          record.isActive = formData.isActive;
          record.isPerishable = formData.isPerishable;
          record.defaultExpiryDays = formData.defaultExpiryDays;
          record.imageUrl = formData.imageUrl;
          record.imageThumbnailUrl = formData.imageThumbnailUrl;
          record.stockQuantity = formData.stockQuantity; // base units
        });

        // ✅ If stock increased, record the delta as 'IN' movement
        if (stockIncrease > 0) {
          await database.get<StockMovement>('stock_movements').create(movement => {
            movement.productId = product.id;
            movement.shopId = currentShop.id;
            movement.quantity = stockIncrease;
            movement.movementType = 'IN';
            movement.notes = 'Stock added via product edit';
            movement.recordedBy = user?.id;
            movement.timestamp = Date.now();
          });
        }
      });

      Alert.alert('Success', 'Product updated successfully!');
      router.push('/(tabs)/products');
    }
  } catch (error) {
    console.error('Error saving product:', error);
    Alert.alert('Error', `Failed to ${isNewProduct ? 'create' : 'update'} product`);
  } finally {
    setSaving(false);
  }
};

  const deleteProduct = () => {
    if (isNewProduct) {
      router.back();
      return;
    }

    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                await product?.markAsDeleted();
              });
              
              Alert.alert(
                'Success',
                'Product deleted successfully!',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };



  // Calculate current stock in selling units for display
  const getCurrentStockInSellingUnits = () => {
    if (formData.sellingUnit === formData.baseUnit) {
      return formData.stockQuantity;
    }
    //return formData.stockQuantity / formData.unitConversionFactor;
    return convertUnits(formData.baseUnit as AnyUnit, formData.sellingUnit as AnyUnit, formData.stockQuantity);

  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title={isNewProduct ? "Add Product" : "Edit Product"} showBackButton />
        <Loading />
      </View>
    );
  }

  if (!isNewProduct && !product) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Edit Product" showBackButton />
        <EmptyState
          icon="cube-outline"
          title="Product Not Found"
          description="The product you're trying to edit doesn't exist"
          action={{
            label: "Back to Products",
            onPress: () => router.back()
          }}
        />
      </View>
    );
  }

  const profitMargin = calculateProfitMargin();
  const profit = calculateProfit();
  const currentStockInSellingUnits = getCurrentStockInSellingUnits();

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title={isNewProduct ? "Add New Product" : "Edit Product"}
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
            {/* Product Image */}
            <Card variant="elevated">
              <CardHeader
                title="Product Image"
                subtitle="Add a photo to help identify this product"
              />
              <CardContent className="p-4">
                <View className="items-center">
                  <View className="w-32 h-32 rounded-2xl bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mb-4 overflow-hidden border-2 border-dashed border-border dark:border-dark-border">
                    {formData.imageUrl ? (
                      <Image 
                        source={{ uri: formData.imageUrl }} 
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="camera-outline" size={40} color="#94a3b8" />
                    )}
                  </View>
                  
                  <View className="flex-row gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={pickImage}
                      loading={imageUploading}
                      icon="image-outline"
                    >
                      Gallery
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={takePhoto}
                      loading={takingPhoto}
                      icon="camera-outline"
                    >
                      Camera
                    </Button>
                    {formData.imageUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => {
                          updateFormData('imageUrl', '');
                          updateFormData('imageThumbnailUrl', '');
                        }}
                        icon="trash-outline"
                      >
                        Delete
                      </Button>
                    )}
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card variant="elevated">
              <CardHeader
                title="Basic Information"
                subtitle="Core details about your product"
              />
              <CardContent className="p-4 space-y-4">
                <Input
                  label="Product Name *"
                  placeholder="Enter product name"
                  value={formData.name}
                  onChangeText={(value) => updateFormData('name', value)}
                  error={errors.name}
                />

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      label="SKU"
                      placeholder="Product SKU"
                      value={formData.sku}
                      onChangeText={(value) => updateFormData('sku', value)}
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Barcode"
                      placeholder="Barcode number"
                      value={formData.barcode}
                      onChangeText={(value) => updateFormData('barcode', value)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View>
                  <ThemedText variant="label" className="mb-2">
                    Category
                  </ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row flex-wrap gap-2">
                      {categoryOptions.map(category => (
                        <TouchableOpacity
                          key={category}
                          onPress={() => updateFormData('category', category)}
                          className={`
                            px-4 py-2 rounded-full border-2
                            ${formData.category === category
                              ? 'border-brand dark:border-dark-brand bg-brand/10'
                              : 'border-border dark:border-dark-border bg-surface-soft dark:bg-dark-surface-soft'
                            }
                          `}
                        >
                          <ThemedText
                            variant={formData.category === category ? 'brand' : 'default'}
                            size="sm"
                          >
                            {category}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <Input
                  label="Description"
                  placeholder="Product description (optional)"
                  value={formData.description}
                  onChangeText={(value) => updateFormData('description', value)}
                  multiline
                  numberOfLines={3}
                />
              </CardContent>
            </Card>

            {/* Unit & Measurement */}
            <Card variant="elevated">
              <CardHeader
                title="Unit & Measurement"
                subtitle="How this product is measured and sold"
              />
              <CardContent className="p-4 gap-4">
                <View>
                  <ThemedText variant="label" className="mb-2">
                    Unit Type
                  </ThemedText>
                  <View className="flex-row flex-wrap gap-2">
                    {(['piece', 'weight', 'volume', 'length', 'pack'] as UnitType[]).map(type => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => {
                          updateFormData('unitType', type);
                          // Set default units when type changes
                          const defaultUnit = unitOptions[type][0];
                          updateFormData('baseUnit', defaultUnit);
                          updateFormData('sellingUnit', defaultUnit);
                          updateFormData('purchaseUnit', defaultUnit);
                        }}
                        className={`
                          px-2 py-1 rounded-full border-2
                          ${formData.unitType === type
                            ? 'border-brand dark:border-dark-brand bg-brand/10'
                            : 'border-border dark:border-dark-border bg-surface-soft dark:bg-dark-surface-soft'
                          }
                        `}
                      >
                        <ThemedText
                          variant={formData.unitType === type ? 'brand' : 'default'}
                          size="sm"
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="flex-row gap-3 border-t border-t-border dark:border-t-dark-border pt-4">
                  <View className="flex-1">
                    <ThemedText variant="label" className="mb-2">
                      Base Unit
                    </ThemedText>
                    <View className="flex-row flex-wrap gap-2">
                      {unitOptions[formData.unitType].map(unit => (
                        <TouchableOpacity
                          key={unit}
                          onPress={() => updateFormData('baseUnit', unit)}
                          className={`
                            px-3 py-1 rounded-full border
                            ${formData.baseUnit === unit
                              ? 'border-brand dark:border-dark-brand bg-brand/10'
                              : 'border-border dark:border-dark-border bg-surface-soft dark:bg-dark-surface-soft'
                            }
                          `}
                        >
                          <ThemedText
                            variant={formData.baseUnit === unit ? 'brand' : 'default'}
                            size="sm"
                          >
                            {unit}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View className="flex-col gap-1 border-t border-t-border dark:border-t-dark-border pt-4">
                  <View className="flex-1">
                    <ThemedText variant="label" className="mb-2">
                      Purchase Unit
                    </ThemedText>
                    <View className="flex-row flex-wrap gap-2">
                      {unitOptions[formData.unitType].map(unit => (
                        <TouchableOpacity
                          key={unit}
                          onPress={() => updateFormData('purchaseUnit', unit)}
                          className={`
                            px-3 py-1 rounded-full border
                            ${formData.purchaseUnit === unit
                              ? 'border-brand dark:border-dark-brand bg-brand/10'
                              : 'border-border dark:border-dark-border bg-surface-soft dark:bg-dark-surface-soft'
                            }
                          `}
                        >
                          <ThemedText
                            variant={formData.purchaseUnit === unit ? 'brand' : 'default'}
                            size="sm"
                          >
                            {unit}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View className="flex-1 mt-2">
                    <Input
                      label={`How many ${formData.purchaseUnit}* did you buy ?`}
                      placeholder="1"
                      value={formData.purchaseUnitSize.toString()}
                      onChangeText={(value) => updateFormData('purchaseUnitSize', parseFloat(value) || 1)}
                      keyboardType="numeric"
                      error={errors.purchaseUnitSize}
                    />
                  </View>
                </View>

                <View className="flex-col gap-1 border-t border-t-border dark:border-t-dark-border pt-4">
                  <View className="flex-1">
                    <ThemedText variant="label" className="mb-2">
                      {`In what unit will you be selling these ${formData.name} ?`}
                    </ThemedText>
                    <View className="flex-row flex-wrap gap-2">
                      {unitOptions[formData.unitType].map(unit => (
                        <TouchableOpacity
                          key={unit}
                          onPress={() => updateFormData('sellingUnit', unit)}
                          className={`
                            px-3 py-1 rounded-full border
                            ${formData.sellingUnit === unit
                              ? 'border-brand dark:border-dark-brand bg-brand/10'
                              : 'border-border dark:border-dark-border bg-surface-soft dark:bg-dark-surface-soft'
                            }
                          `}
                        >
                          <ThemedText
                            variant={formData.sellingUnit === unit ? 'brand' : 'default'}
                            size="sm"
                          >
                            {unit}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {/* <View className="flex-1 mt-2">
                    <Input
                      label={`How many ${formData.sellingUnit} in 1 ${formData.baseUnit}?`}
                      placeholder="1"
                      value={formData.unitConversionFactor.toString()}
                      onChangeText={(value) => updateFormData('unitConversionFactor', parseFloat(value) || 1)}
                      keyboardType="numeric"
                      error={errors.unitConversionFactor}
                    />
                  </View> */}
                </View>

                <View className="flex-row justify-between items-center border-t border-t-border dark:border-t-dark-border pt-4">
                  <View>
                    <ThemedText variant="default" size="base" className="font-medium">
                      Weighted Product
                    </ThemedText>
                    <ThemedText variant="muted" size="sm">
                      This product is sold by weight
                    </ThemedText>
                  </View>
                  <Switch
                    checked={formData.isWeighted}
                    onChange={(value) => updateFormData('isWeighted', value)}
                  />
                </View>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card variant="elevated">
              <CardHeader
                title="Pricing"
                subtitle={`Prices (Purchase Unit, Selling Unit, Wholesale Unit)`}
              />
              <CardContent className="p-4 gap-4">
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      label={`Cost Price per ${formData.purchaseUnit} *`}
                      placeholder="0.00"
                      value={formData.costPricePerBase.toString()}
                      onChangeText={(value) => updateFormData('costPricePerBase', parseFloat(value) || 0)}
                      keyboardType="numeric"
                      error={errors.costPricePerBase}
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label={`Selling Price per ${formData.sellingUnit} *`}
                      placeholder="0.00"
                      value={formData.sellingPricePerBase.toString()}
                      onChangeText={(value) => updateFormData('sellingPricePerBase', parseFloat(value) || 0)}
                      keyboardType="numeric"
                      error={errors.sellingPricePerBase}
                    />
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      label={`Wholesale Price per ${formData.sellingUnit}`}
                      placeholder="0.00"
                      value={formData.wholesalePricePerBase.toString()}
                      onChangeText={(value) => updateFormData('wholesalePricePerBase', parseFloat(value) || 0)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Profit Calculation */}
                <Card variant="filled">
                  <CardContent className="p-3">
                    <View className="flex-row justify-between items-center">
                      <View>
                        <ThemedText variant="muted" size="sm">
                          Profit per {formData.sellingUnit}
                        </ThemedText>
                        <ThemedText 
                          variant={profit >= 0 ? 'success' : 'error'} 
                          size="lg"
                          className="font-semibold"
                        >
                          FBU {profit?.toFixed(2)}
                        </ThemedText>
                      </View>
                      <View className="items-end">
                        <ThemedText variant="muted" size="sm">
                          Margin
                        </ThemedText>
                        <ThemedText 
                          variant={profitMargin >= 0 ? 'success' : 'error'} 
                          size="lg"
                          className="font-semibold"
                        >
                          {profitMargin?.toFixed(1)}%
                        </ThemedText>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            {/* Inventory Settings */}
            <Card variant="elevated">
              <CardHeader
                title="Inventory Settings"
                subtitle="Stock management and alerts"
              />
              <CardContent className="p-4 gap-4">
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      label={`Current Stock (in ${formData.baseUnit})`}
                      placeholder="0"
                      value={formData.stockQuantity.toString()}
                      onChangeText={(value) => updateFormData('stockQuantity', parseFloat(value) || 0)}
                      keyboardType="numeric"
                      error={errors.stockQuantity}
                    />
                    <ThemedText variant="muted" size="xs" className="mt-1">
                      {formData.stockQuantity} {formData.baseUnit} total • {currentStockInSellingUnits.toFixed(2)} {formData.sellingUnit} available for sale
                    </ThemedText>
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Low Stock Threshold"
                      placeholder="10"
                      value={formData.lowStockThreshold.toString()}
                      onChangeText={(value) => updateFormData('lowStockThreshold', parseInt(value) || 10)}
                      keyboardType="numeric"
                      error={errors.lowStockThreshold}
                    />
                    <ThemedText variant="muted" size="xs" className="mt-1">
                      Alert when stock reaches this level in {formData.baseUnit}
                    </ThemedText>
                  </View>
                </View>

                <View className="flex-row justify-between items-center">
                  <View>
                    <ThemedText variant="default" size="base" className="font-medium">
                      Active Product
                    </ThemedText>
                    <ThemedText variant="muted" size="sm">
                      Show this product in sales and reports
                    </ThemedText>
                  </View>
                  <Switch
                    checked={formData.isActive}
                    onChange={(value) => updateFormData('isActive', value)}
                  />
                </View>

                <View className="flex-row justify-between items-center">
                  <View>
                    <ThemedText variant="default" size="base" className="font-medium">
                      Perishable Product
                    </ThemedText>
                    <ThemedText variant="muted" size="sm">
                      This product can expire
                    </ThemedText>
                  </View>
                  <Switch
                    checked={formData.isPerishable}
                    onChange={(value) => updateFormData('isPerishable', value)}
                  />
                </View>

                {formData.isPerishable && (
                  <Input
                    label="Default Expiry Days"
                    placeholder="0"
                    value={formData.defaultExpiryDays.toString()}
                    onChangeText={(value) => updateFormData('defaultExpiryDays', parseInt(value) || 0)}
                    keyboardType="numeric"
                  />
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <Button
                variant="outline"
                onPress={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onPress={saveProduct}
                loading={saving}
                className="flex-1"
              >
                {isNewProduct ? 'Create Product' : 'Save Changes'}
              </Button>
            </View>

            {/* Danger Zone - Only show for existing products */}
            {!isNewProduct && (
              <Card variant="elevated" className="border-error/20">
                <CardHeader
                  title="Danger Zone"
                  subtitle="Irreversible actions"
                  className="text-error"
                />
                <CardContent className="p-4">
                  <Button
                    variant="destructive"
                    onPress={deleteProduct}
                    icon="trash-outline"
                  >
                    Delete Product
                  </Button>
                </CardContent>
              </Card>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}