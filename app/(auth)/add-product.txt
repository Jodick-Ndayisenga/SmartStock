// app/(tabs)/add-product.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import database from "@/database";
import { Product, UnitType, WeightUnit, VolumeUnit, LengthUnit } from "@/database/models/Product";
import { Shop } from "@/database/models/Shop";
import PremiumHeader from "@/components/layout/PremiumHeader";
import { useLocalSearchParams, useRouter } from "expo-router";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Q } from "@nozbe/watermelondb";
import { useAuth } from "@/context/AuthContext";

// Components
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ThemedText } from "@/components/ui/ThemedText";
import { Select, PredefinedSelect } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { useColorScheme } from "nativewind";
import { StockMovement } from "@/database/models/StockMovement";

// -------------------------
// Constants & Units
// -------------------------
type AnyUnit = WeightUnit | VolumeUnit | LengthUnit | string;

const UNIT_TYPES = [
  { value: 'piece', label: 'Pièce', icon: 'cube-outline' },
  { value: 'weight', label: 'Poids', icon: 'scale-outline' },
  { value: 'volume', label: 'Volume', icon: 'flask-outline' },
  { value: 'length', label: 'Longueur', icon: 'resize-outline' },
  { value: 'pack', label: 'Paquet', icon: 'archive-outline' },
];

const WEIGHT_UNITS = [
  { value: 'kg', label: 'Kilogramme (kg)' },
  { value: 'g', label: 'Gramme (g)' },
  { value: 'mg', label: 'Milligramme (mg)' },
];

const VOLUME_UNITS = [
  { value: 'l', label: 'Litre (l)' },
  { value: 'ml', label: 'Millilitre (ml)' },
  { value: 'cl', label: 'Centilitre (cl)' },
];

const LENGTH_UNITS = [
  { value: 'm', label: 'Mètre (m)' },
  { value: 'cm', label: 'Centimètre (cm)' },
  { value: 'mm', label: 'Millimètre (mm)' },
];

const PIECE_UNITS = [
  { value: 'piece', label: 'Pièce' },
  { value: 'unit', label: 'Unité' },
  { value: 'item', label: 'Article' },
  { value: 'bottle', label: 'Bouteille' },
  { value: 'bag', label: 'Sac' },
  { value: 'sachet', label: 'Sachet' },
  { value: 'carton', label: 'Carton' },
  { value: 'box', label: 'Boîte' },
  { value: 'pack', label: 'Paquet' },
];

// Common product categories
const PRODUCT_CATEGORIES = [
  { value: 'food', label: 'Aliments', icon: 'fast-food-outline' },
  { value: 'drinks', label: 'Boissons', icon: 'wine-outline' },
  { value: 'cleaning', label: 'Produits de Nettoyage', icon: 'sparkles-outline' },
  { value: 'personal-care', label: 'Soins Personnels', icon: 'person-outline' },
  { value: 'electronics', label: 'Électronique', icon: 'hardware-chip-outline' },
  { value: 'clothing', label: 'Vêtements', icon: 'shirt-outline' },
  { value: 'stationery', label: 'Papeterie', icon: 'pencil-outline' },
  { value: 'household', label: 'Articles Ménagers', icon: 'home-outline' },
  { value: 'health', label: 'Santé & Pharmacie', icon: 'medical-outline' },
  { value: 'other', label: 'Autre', icon: 'grid-outline' },
];

// -------------------------
// Validation Schema
// -------------------------
const schema = z.object({
  name: z.string().min(1, { message: "validation.required" }),
  sku: z.string().min(1, { message: "validation.required" }),
  category: z.string().optional(),
  description: z.string().optional(),
  unitType: z.enum(["piece", "weight", "volume", "length", "pack"]),
  baseUnit: z.string().min(1, { message: "validation.required" }),
  purchaseUnit: z.string().min(1, { message: "validation.required" }),
  purchaseUnitSize: z
    .number()
    .positive({ message: "products.errors.invalidUnitSize" }),
  sellingUnit: z.string().min(1, { message: "validation.required" }),
  costPricePerBase: z.number().nonnegative({ message: "products.errors.invalidPrice" }),
  sellingPricePerBase: z.number().nonnegative({ message: "products.errors.invalidPrice" }),
  wholesalePricePerBase: z.number().nonnegative({ message: "products.errors.invalidPrice" }).optional(),
  lowStockThreshold: z.number().nonnegative(),
  isPerishable: z.boolean().optional(),
  defaultExpiryDays: z.number().nonnegative().optional(),
  imageUrl: z.string().optional(),
});

// -------------------------
// Helpers: Unit conversion factor
// -------------------------
function getBasePerUnit(unit: string, baseUnit: string, unitType: UnitType, purchaseUnitSize = 1): number {
  if (unit === baseUnit) return 1;

  // Weight conversions
  if (unitType === "weight") {
    const map = {
      kg: { g: 1000, mg: 1_000_000 },
      g: { kg: 0.001, mg: 1000 },
      mg: { kg: 0.000001, g: 0.001 },
    } as Record<string, Record<string, number>>;

    if (map[unit] && map[unit][baseUnit] !== undefined) return map[unit][baseUnit];
    if (map[baseUnit] && map[baseUnit][unit] !== undefined) return 1 / map[baseUnit][unit];
  }

  // Volume conversions
  if (unitType === "volume") {
    const map = {
      l: { ml: 1000, cl: 100 },
      ml: { l: 0.001, cl: 0.1 },
      cl: { l: 0.01, ml: 10 },
    } as Record<string, Record<string, number>>;

    if (map[unit] && map[unit][baseUnit] !== undefined) return map[unit][baseUnit];
    if (map[baseUnit] && map[baseUnit][unit] !== undefined) return 1 / map[baseUnit][unit];
  }

  // Length conversions
  if (unitType === "length") {
    const map = {
      m: { cm: 100, mm: 1000 },
      cm: { m: 0.01, mm: 10 },
      mm: { m: 0.001, cm: 0.1 },
    } as Record<string, Record<string, number>>;

    if (map[unit] && map[unit][baseUnit] !== undefined) return map[unit][baseUnit];
    if (map[baseUnit] && map[baseUnit][unit] !== undefined) return 1 / map[baseUnit][unit];
  }

  return purchaseUnitSize || 1;
}

// -------------------------
// ProductForm Component
// -------------------------
interface ProductFormProps {
  product?: Product | null;
  onCancel?: () => void;
}

export default function ProductForm({ product, onCancel }: ProductFormProps) {
  const { t } = useTranslation();
  const isEditing = !!product;
  const router = useRouter();
  const { shopId: paramShopId } = useLocalSearchParams();
  const { currentShop } = useAuth();
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  // FIX: Use currentShop.id if paramShopId is undefined
  const shopId = paramShopId || currentShop?.id;

  // WatermelonDB collections
  const productsCollection = database.get<Product>("products");
  const shopsCollection = database.get<Shop>("shops");

  // Image state
  const [imageUrlLocal, setImageUrlLocal] = useState<string | undefined>(product?.imageUrl || "");
  const [saving, setSaving] = useState(false);
  const [shop, setShop] = useState<Shop | null>(null);

  // Load shop data
  useEffect(() => {
    const loadShop = async () => {
      if (!shopId) {
        Alert.alert(t("common.error"), "No shop selected. Please select a shop first.");
        router.back();
        return;
      }

      try {
        const shopData = await shopsCollection.find(shopId as string);
        setShop(shopData);
      } catch (error) {
        console.error("Error loading shop:", error);
        Alert.alert(t("common.error"), "Shop not found. Please select a valid shop.");
        router.back();
      }
    };

    loadShop();
  }, [shopId]);

  // Form default values
  const defaultValues = {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    category: product?.category ?? "other",
    description: product?.description ?? "",
    unitType: (product?.unitType as UnitType) ?? "piece",
    baseUnit: product?.baseUnit ?? "piece",
    purchaseUnit: product?.purchaseUnit ?? "piece",
    purchaseUnitSize: product?.purchaseUnitSize ?? 1,
    sellingUnit: product?.sellingUnit ?? "piece",
    costPricePerBase: product?.costPricePerBase ?? 0,
    sellingPricePerBase: product?.sellingPricePerBase ?? 0,
    wholesalePricePerBase: product?.wholesalePricePerBase ?? 0,
    lowStockThreshold: product?.lowStockThreshold ?? 10,
    isPerishable: product?.isPerishable ?? false,
    defaultExpiryDays: product?.defaultExpiryDays ?? 0,
    imageUrl: product?.imageUrl ?? "",
  };

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // Watch form values for live preview
  const watchUnitType = watch("unitType");
  const watchBaseUnit = watch("baseUnit");
  const watchPurchaseUnit = watch("purchaseUnit");
  const watchPurchaseUnitSize = watch("purchaseUnitSize");
  const watchSellingUnit = watch("sellingUnit");
  const watchCostPricePerBase = watch("costPricePerBase");
  const watchSellingPricePerBase = watch("sellingPricePerBase");
  const watchWholesalePricePerBase = watch("wholesalePricePerBase");

  // Get available units for current unit type
  const getUnitsForType = (type: UnitType) => {
    switch (type) {
      case "weight":
        return WEIGHT_UNITS;
      case "volume":
        return VOLUME_UNITS;
      case "length":
        return LENGTH_UNITS;
      default:
        return PIECE_UNITS;
    }
  };

  // When unitType changes, ensure units are valid
  useEffect(() => {
    const units = getUnitsForType(watchUnitType);
    if (!units.find(u => u.value === watchBaseUnit)) setValue("baseUnit", units[0]?.value || "piece");
    if (!units.find(u => u.value === watchPurchaseUnit)) setValue("purchaseUnit", units[0]?.value || "piece");
    if (!units.find(u => u.value === watchSellingUnit)) setValue("sellingUnit", units[0]?.value || "piece");
  }, [watchUnitType]);

  // Image picker
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("products.imagePermissionTitle"), t("products.imagePermissionMessage"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUrlLocal(uri);
      setValue("imageUrl", uri);
    }
  };

  const removeImage = () => {
    setImageUrlLocal("");
    setValue("imageUrl", "");
  };

  // Auto-generate SKU
  const generateSku = (nameStr: string) => {
    const base = nameStr.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "PRD";
    const suffix = Date.now().toString().slice(-4);
    return `${base}-${suffix}`;
  };

  // Derived preview calculations
  const basePerPurchase = useMemo(
    () => getBasePerUnit(watchPurchaseUnit, watchBaseUnit, watchUnitType as UnitType, Number(watchPurchaseUnitSize)),
    [watchPurchaseUnit, watchBaseUnit, watchUnitType, watchPurchaseUnitSize]
  );

  const basePerSelling = useMemo(
    () => getBasePerUnit(watchSellingUnit, watchBaseUnit, watchUnitType as UnitType, Number(watchPurchaseUnitSize)),
    [watchSellingUnit, watchBaseUnit, watchUnitType, watchPurchaseUnitSize]
  );

  const costPerSelling = useMemo(() => {
    return Number(watchCostPricePerBase) * basePerSelling;
  }, [watchCostPricePerBase, basePerSelling]);

  const sellingPerSelling = useMemo(() => {
    return Number(watchSellingPricePerBase) * basePerSelling;
  }, [watchSellingPricePerBase, basePerSelling]);

  const marginPerSelling = useMemo(() => {
    return sellingPerSelling - costPerSelling;
  }, [sellingPerSelling, costPerSelling]);

  const marginPercentage = useMemo(() => {
    return costPerSelling > 0 ? (marginPerSelling / costPerSelling) * 100 : 0;
  }, [marginPerSelling, costPerSelling]);

  // Check duplicate SKU
  const checkDuplicateSKU = async (sku: string) => {
    const found = await productsCollection.query(Q.where("sku", sku)).fetch();
    if (found.length > 0) {
      if (!product || (product && product.sku !== sku)) {
        return true;
      }
    }
    return false;
  };

  // Submit handler
  const onSubmit = async (values: any) => {
    if (!shopId) {
      Alert.alert(t("common.error"), "No shop selected. Please select a shop first.");
      return;
    }

    setSaving(true);
    try {
      let finalSku = values.sku || generateSku(values.name);

      const isDuplicate = await checkDuplicateSKU(finalSku);
      if (isDuplicate) {
        Alert.alert(t("common.error"), t("products.errors.duplicateSku"));
        setSaving(false);
        return;
      }

      // FIX: Use the shop we already loaded
      if (!shop) {
        Alert.alert(t("common.error"), t("createShop.errors.shopNotFound"));
        setSaving(false);
        router.push("/(auth)/create-shop");
        return;
      }

      const dataToWrite: Partial<Product> = {
        name: values.name.trim(),
        sku: finalSku.trim(),
        category: values.category?.trim() || "other",
        description: values.description?.trim() ?? "",
        unitType: values.unitType as UnitType,
        baseUnit: values.baseUnit as AnyUnit,
        purchaseUnit: values.purchaseUnit as AnyUnit,
        purchaseUnitSize: Number(values.purchaseUnitSize),
        sellingUnit: values.sellingUnit as AnyUnit,
        costPricePerBase: Number(values.costPricePerBase),
        sellingPricePerBase: Number(values.sellingPricePerBase),
        wholesalePricePerBase: Number(values.wholesalePricePerBase ?? 0),
        lowStockThreshold: Number(values.lowStockThreshold ?? 10),
        isPerishable: Boolean(values.isPerishable ?? false),
        defaultExpiryDays: Number(values.defaultExpiryDays ?? 0),
        imageUrl: values.imageUrl ?? imageUrlLocal,
        imageThumbnailUrl: values.imageUrl ?? imageUrlLocal,
        shopId: shopId as string,
        isActive: false,
      };

      await database.write(async () => {
        if (isEditing && product) {
          await product.update((p) => {
            Object.assign(p, dataToWrite);
          });
        } else {
          await productsCollection.create((p) => {
            Object.assign(p, dataToWrite);
          });

         
        }
      });

      Alert.alert(t("common.success"), isEditing ? t("products.updatedSuccessfully") : t("products.createdSuccessfully"));
      
      if (onCancel) {
        onCancel();
      } else {
        router.back();
      }
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert(t("common.error"), t("products.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const unitsForType = getUnitsForType(watchUnitType as UnitType);

  if (!shopId) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title={isEditing ? t("products.editProduct") : t("products.addProduct")} showBackButton />
        <View className="flex-1 items-center justify-center p-4">
          <ThemedText variant="error" size="lg" className="text-center">
            No shop selected. Please select a shop first.
          </ThemedText>
          <Button onPress={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title={isEditing ? t("products.editProduct") : t("products.addProduct")} 
        showBackButton 
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        className="flex-1"
      >
        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View className="p-4 gap-4">
            {/* Shop Info Banner */}
            {shop && (
              <Card className="bg-brand/5 border-brand/20">
                <CardContent className="p-3">
                  <View className="flex-row items-center">
                    <Ionicons name="business" size={16} className="text-brand mr-2" color= {isDark ? "white" : "black"} />
                    <ThemedText variant="brand" size="sm">
                      Adding product to: {shop.name}
                    </ThemedText>
                  </View>
                  
                </CardContent>
              </Card>
            )}

            {
              shop && (
                <Button
                  size="sm"
                  className="mt-2"
                  variant="outline"
                  onPress={()=>router.push("/(auth)/inactive-products")}
                  
                  >
                    Select From Templates
                  </Button>
              )
            }

            {/* Image Upload Section */}
            <Card>
              <CardContent className="p-4">
                <ThemedText variant="subheading" size="base" className="mb-3">
                  {t("products.addPhoto")}
                </ThemedText>
                
                <TouchableOpacity
                  onPress={pickImage}
                  className="w-32 h-32 self-center rounded-lg border-2 border-dashed border-border dark:border-dark-border items-center justify-center mb-3"
                >
                  {imageUrlLocal ? (
                    <View className="relative">
                      <Image 
                        source={{ uri: imageUrlLocal }} 
                        className="w-32 h-32 rounded-lg" 
                        resizeMode="cover" 
                      />
                      <TouchableOpacity 
                        onPress={removeImage}
                        className="absolute -top-2 -right-2 bg-error rounded-full p-1"
                      >
                        <Ionicons name="close" size={16} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View className="items-center">
                      <Ionicons name="camera" size={32} className="text-text-muted dark:text-dark-text-muted" color= {isDark ? "white" : "black"} />
                      <ThemedText variant="muted" size="sm" className="mt-2 text-center">
                        Ajouter une photo
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <ThemedText variant="subheading" size="base" className="mb-2">
                  Informations de base
                </ThemedText>

                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label={t("products.name")}
                      placeholder={t("products.namePlaceholder")}
                      value={value}
                      onChangeText={onChange}
                      error={errors.name?.message && t(errors.name.message)}
                      required
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="sku"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label={t("products.sku")}
                      placeholder={t("products.skuPlaceholder")}
                      value={value}
                      onChangeText={onChange}
                      error={errors.sku?.message && t(errors.sku.message)}
                      required
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="category"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      options={PRODUCT_CATEGORIES}
                      value={value}
                      onValueChange={onChange}
                      label={t("products.category")}
                      placeholder="Choisir une catégorie"
                      searchable
                      leftIcon="grid-outline"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="description"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label={t("products.description")}
                      placeholder={t("products.descriptionPlaceholder")}
                      value={value}
                      onChangeText={onChange}
                      multiline
                      numberOfLines={3}
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* Unit Configuration */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <ThemedText variant="subheading" size="base" className="mb-2">
                  Configuration des unités
                </ThemedText>

                <View className="bg-warning/10 border border-warning/20 rounded-base p-3 mb-3">
                  <View className="flex-row items-start">
                    <Ionicons name="information-circle" size={16} className="text-warning mr-2 mt-0.5" />
                    <ThemedText variant="warning" size="sm" className="flex-1">
                      💡 <ThemedText variant="warning" size="sm" className="font-semibold">Exemple:</ThemedText> Si vous achetez 30 paquets de 12 cahiers, choisissez "Paquet" comme unité d'achat et entrez "12" comme taille.
                    </ThemedText>
                  </View>
                </View>

                <Controller
                  control={control}
                  name="unitType"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      options={UNIT_TYPES}
                      value={value}
                      onValueChange={onChange}
                      label={t("products.unitType")}
                      placeholder="Choisir le type d'unité"
                      leftIcon="cube-outline"
                    />
                  )}
                />

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="baseUnit"
                      render={({ field: { onChange, value } }) => (
                        <Select
                          options={unitsForType}
                          value={value}
                          onValueChange={onChange}
                          label={t("products.baseUnit")}
                          placeholder="Unité de base"
                          error={errors.baseUnit?.message && t(errors.baseUnit.message)}
                        />
                      )}
                    />
                  </View>

                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="sellingUnit"
                      render={({ field: { onChange, value } }) => (
                        <Select
                          options={unitsForType}
                          value={value}
                          onValueChange={onChange}
                          label={t("products.sellingUnit")}
                          placeholder="Unité de vente"
                          error={errors.sellingUnit?.message && t(errors.sellingUnit.message)}
                        />
                      )}
                    />
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="purchaseUnit"
                      render={({ field: { onChange, value } }) => (
                        <Select
                          options={unitsForType}
                          value={value}
                          onValueChange={onChange}
                          label={t("products.purchaseUnit")}
                          placeholder="Unité d'achat"
                          error={errors.purchaseUnit?.message && t(errors.purchaseUnit.message)}
                        />
                      )}
                    />
                  </View>

                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="purchaseUnitSize"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label={`${t("products.purchaseUnitSize")} (en ${watchBaseUnit})`}
                          placeholder="1"
                          value={String(value)}
                          onChangeText={(v) => onChange(Number(v))}
                          keyboardType="numeric"
                          error={errors.purchaseUnitSize?.message && t(errors.purchaseUnitSize.message)}
                        />
                      )}
                    />
                  </View>
                </View>

                {/* Purchase Unit Explanation */}
                {watchPurchaseUnitSize > 1 && (
                  <View className="bg-success/10 border border-success/20 rounded-base p-3">
                    <ThemedText variant="success" size="sm">
                      ✅ <ThemedText variant="success" size="sm" className="font-semibold">Compris:</ThemedText> 1 {watchPurchaseUnit} = {watchPurchaseUnitSize} {watchBaseUnit}
                    </ThemedText>
                  </View>
                )}
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <ThemedText variant="subheading" size="base" className="mb-2">
                  Tarification
                </ThemedText>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="costPricePerBase"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label={`${t("products.costPrice")} (${watchBaseUnit})`}
                          placeholder="0"
                          value={String(value)}
                          onChangeText={(v) => onChange(Number(v))}
                          keyboardType="numeric"
                          error={errors.costPricePerBase?.message && t(errors.costPricePerBase.message)}
                        />
                      )}
                    />
                  </View>

                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="sellingPricePerBase"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label={`${t("products.sellingPrice")} (${watchBaseUnit})`}
                          placeholder="0"
                          value={String(value)}
                          onChangeText={(v) => onChange(Number(v))}
                          keyboardType="numeric"
                          error={errors.sellingPricePerBase?.message && t(errors.sellingPricePerBase.message)}
                        />
                      )}
                    />
                  </View>
                </View>

                <Controller
                  control={control}
                  name="wholesalePricePerBase"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label={t("products.wholesalePrice")}
                      placeholder="0"
                      value={String(value || 0)}
                      onChangeText={(v) => onChange(Number(v))}
                      keyboardType="numeric"
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* Inventory Settings */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <ThemedText variant="subheading" size="base" className="mb-2">
                  Paramètres de stock
                </ThemedText>

                <Controller
                  control={control}
                  name="lowStockThreshold"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label={t("products.lowStockThreshold")}
                      placeholder="10"
                      value={String(value)}
                      onChangeText={(v) => onChange(Number(v))}
                      keyboardType="numeric"
                    />
                  )}
                />

                <View className="flex-row items-center justify-between">
                  <ThemedText variant="default" size="base">
                    {t("products.isPerishable")}
                  </ThemedText>
                  <Controller
                    control={control}
                    name="isPerishable"
                    render={({ field: { value, onChange } }) => (
                      <TouchableOpacity 
                        onPress={() => onChange(!value)}
                        className={`w-12 h-6 rounded-full p-1 ${value ? 'bg-brand' : 'bg-border'}`}
                      >
                        <View className={`w-4 h-4 rounded-full bg-white transform ${value ? 'translate-x-6' : 'translate-x-0'}`} />
                      </TouchableOpacity>
                    )}
                  />
                </View>

                {watch("isPerishable") && (
                  <Controller
                    control={control}
                    name="defaultExpiryDays"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="Durée de conservation (jours)"
                        placeholder="30"
                        value={String(value || 0)}
                        onChangeText={(v) => onChange(Number(v))}
                        keyboardType="numeric"
                      />
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Preview Card */}
            <Card className="bg-brand/5 border-brand/20">
              <CardContent className="p-4">
                <ThemedText variant="subheading" size="base" className="mb-3 text-brand">
                  Aperçu des calculs
                </ThemedText>
                
                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <ThemedText variant="muted" size="sm">Conversion d'unités:</ThemedText>
                    <ThemedText variant="default" size="sm">1 {watchPurchaseUnit} = {basePerPurchase} {watchBaseUnit}</ThemedText>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <ThemedText variant="muted" size="sm">Coût par {watchSellingUnit}:</ThemedText>
                    <ThemedText variant="default" size="sm">₣{costPerSelling.toFixed(2)}</ThemedText>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <ThemedText variant="muted" size="sm">Prix de vente par {watchSellingUnit}:</ThemedText>
                    <ThemedText variant="default" size="sm">₣{sellingPerSelling.toFixed(2)}</ThemedText>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <ThemedText variant="muted" size="sm">Marge par {watchSellingUnit}:</ThemedText>
                    <ThemedText variant={marginPerSelling >= 0 ? "success" : "error"} size="sm">
                      ₣{marginPerSelling.toFixed(2)} ({marginPercentage.toFixed(1)}%)
                    </ThemedText>
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>

        {/* Fixed Action Buttons */}
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-surface dark:bg-dark-surface border-t border-border dark:border-dark-border">
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              onPress={() => (onCancel ? onCancel() : router.back())}
              className="flex-1"
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            
            <Button
              variant="default"
              onPress={handleSubmit((vals) => {
                if (!vals.sku) vals.sku = generateSku(vals.name);
                onSubmit(vals);
              })}
              className="flex-1"
              disabled={saving}
              loading={saving}
            >
              {saving ? t("common.saving") : isEditing ? t("common.update") : t("common.save")}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}