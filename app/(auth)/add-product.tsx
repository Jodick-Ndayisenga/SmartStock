// app/(tabs)/add-product.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput as RNTextInput,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import database from "@/database";
import { Product, UnitType } from "@/database/models/Product";
import { Shop } from "@/database/models/Shop";
import PremiumHeader from "@/components/layout/PremiumHeader";
import { useLocalSearchParams, useRouter } from "expo-router";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Q } from "@nozbe/watermelondb";
import { useAuth } from "@/context/AuthContext";
import { BURUNDI_TEMPLATES } from "@/constants/templates";

// Components
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ThemedText } from "@/components/ui/ThemedText";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { useColorScheme } from "nativewind";
import { es } from "zod/v4/locales";

// -------------------------
// Constants & Templates for Burundi
// -------------------------

// Common Burundi units
const BURUNDI_UNITS = {
  weight: [
    { value: 'kg', label: 'Kilogramme (kg)' },
    { value: 'g', label: 'Gramme (g)' },
    { value: 'sac', label: 'Sac (50kg)' },
    { value: 'tonne', label: 'Tonne' },
  ],
  volume: [
    { value: 'l', label: 'Litre (l)' },
    { value: 'ml', label: 'Millilitre (ml)' },
    { value: 'bidon', label: 'Bidon (20L)' },
    { value: 'fût', label: 'Fût (200L)' },
  ],
  piece: [
    { value: 'piece', label: 'Pièce' },
    { value: 'unit', label: 'Unité' },
    { value: 'bottle', label: 'Bouteille' },
    { value: 'can', label: 'Canette' },
    { value: 'sachet', label: 'Sachet' },
    { value: 'carton', label: 'Carton' },
    { value: 'pack', label: 'Paquet' },
    { value: 'pair', label: 'Paire' },
    { value: 'tube', label: 'Tube' },
  ],
  length: [
    { value: 'm', label: 'Mètre (m)' },
    { value: 'cm', label: 'Centimètre (cm)' },
    { value: 'mm', label: 'Millimètre (mm)' },
    { value: 'rouleau', label: 'Rouleau' },
  ],
  pack: [
    { value: 'pack', label: 'Paquet' },
    { value: 'boite', label: 'Boîte' },
    { value: 'lot', label: 'Lot' },
  ]
};

const UNIT_TYPES = [
  { value: 'piece', label: 'Pièce', icon: 'cube-outline' },
  { value: 'weight', label: 'Poids', icon: 'scale-outline' },
  { value: 'volume', label: 'Volume', icon: 'flask-outline' },
  { value: 'length', label: 'Longueur', icon: 'resize-outline' },
  { value: 'pack', label: 'Paquet', icon: 'archive-outline' },
];

const PRODUCT_CATEGORIES = [
  { value: 'food', label: 'Aliments', icon: 'fast-food-outline' },
  { value: 'drinks', label: 'Boissons', icon: 'wine-outline' },
  { value: 'clothing', label: 'Vêtements', icon: 'shirt-outline' },
  { value: 'electronics', label: 'Électronique', icon: 'hardware-chip-outline' },
  { value: 'personal-care', label: 'Soins Personnels', icon: 'person-outline' },
  { value: 'health', label: 'Santé', icon: 'medical-outline' },
  { value: 'household', label: 'Ménager', icon: 'home-outline' },
  { value: 'other', label: 'Autre', icon: 'grid-outline' },
];

// -------------------------
// Validation Schema (Simplified)
// -------------------------
const quickSchema = z.object({
  name: z.string().min(1, { message: "validation.required" }),
  purchase_price: z.number().nonnegative({ message: "products.errors.invalidPrice" }),
  selling_price: z.number().nonnegative({ message: "products.errors.invalidPrice" }),
  unit: z.string().min(1, { message: "validation.required" }),
});

const advancedSchema = z.object({
  name: z.string().min(1, { message: "validation.required" }),
  sku: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  unitType: z.enum(["piece", "weight", "volume", "length", "pack"]),
  baseUnit: z.string().min(1, { message: "validation.required" }),
  purchaseUnit: z.string().min(1, { message: "validation.required" }),
  purchaseUnitSize: z.number().positive({ message: "products.errors.invalidUnitSize" }),
  sellingUnit: z.string().min(1, { message: "validation.required" }),
  costPricePerBase: z.number().nonnegative({ message: "products.errors.invalidPrice" }),
  sellingPricePerBase: z.number().nonnegative({ message: "products.errors.invalidPrice" }),
  lowStockThreshold: z.number().nonnegative(),
  isPerishable: z.boolean().optional(),
  defaultExpiryDays: z.number().nonnegative().optional(),
});

function QuickAddForm({ onSubmit, shopId }: { onSubmit: (data: any) => void; shopId: string }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { colorScheme } = useColorScheme();
  
  const { control, handleSubmit, setValue, watch, formState } = useForm({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      name: '',
      purchase_price: 0,
      selling_price: 0,
      unit: 'piece',
    },
  });

  // Get the form validity
  const { isValid } = formState;

  const generateSKU = (name: string) => {
    const prefix = name.substring(0, 3).toUpperCase();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${random}`;
  };

  const handleQuickSubmit = async (data: any) => {
    setLoading(true);
    try {
      const sku = generateSKU(data.name);
      
      // Create simplified product
      const productData = {
        name: data.name.trim(),
        sku: sku,
        category: 'other',
        unitType: 'piece' as UnitType,
        baseUnit: data.unit,
        purchaseUnit: data.unit,
        purchaseUnitSize: 1,
        sellingUnit: data.unit,
        costPricePerBase: data.purchase_price,
        sellingPricePerBase: data.selling_price,
        wholesalePricePerBase: data.selling_price * 0.9, // 10% discount for wholesale
        lowStockThreshold: 10,
        isActive: false,
        shopId: shopId,
        stockQuantity: 0,
      };

      await onSubmit(productData);
    } catch (error) {
      console.error('Error creating product:', error);
      Alert.alert("Erreur", "Impossible d'ajouter le produit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="gap-4">
      <Card className="bg-success/10 border-success/20">
        <CardContent className="p-3">
          <View className="flex-row items-center">
            <Ionicons name="flash-outline" size={20} className="text-success mr-2" color = {`${colorScheme === 'dark' ? '#94a3b8' : '#64748b'}`}/>
            <ThemedText variant="success" size="sm" className="font-semibold">
              Ajout rapide - Remplissez seulement les champs essentiels
            </ThemedText>
          </View>
        </CardContent>
      </Card>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <Input
            label="Nom du produit *"
            placeholder="Ex: Sucre, Riz, T-shirt..."
            value={value}
            onChangeText={onChange}
            autoFocus
            error={error?.message}
          />
        )}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="purchase_price"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <Input
                label="Prix d'achat *"
                placeholder="0"
                value={value === 0 ? '' : String(value)}
                onChangeText={(v) => onChange(Number(v) || 0)}
                keyboardType="numeric"
                error={error?.message}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="selling_price"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <Input
                label="Prix de vente *"
                placeholder="0"
                value={value === 0 ? '' : String(value)}
                onChangeText={(v) => onChange(Number(v) || 0)}
                keyboardType="numeric"
                leftIcon="arrow-up-circle-outline"
                error={error?.message}
              />
            )}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="unit"
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <Select
            label="Unité *"
            value={value}
            onValueChange={onChange}
            options={[
              { value: 'piece', label: 'Pièce' },
              { value: 'kg', label: 'Kilogramme' },
              { value: 'l', label: 'Litre' },
              { value: 'sachet', label: 'Sachet' },
              { value: 'pack', label: 'Paquet' },
              { value: 'carton', label: 'Carton' },
            ]}
            error={error?.message}
          />
        )}
      />

      <View className="bg-info/10 p-3 rounded-lg">
        <ThemedText variant="label" size="sm">
          💡 Les autres informations (code barre, catégorie, etc.) peuvent être ajoutées plus tard.
        </ThemedText>
      </View>

      <Button
        onPress={handleSubmit(handleQuickSubmit)}
        loading={loading}
        disabled={!isValid || loading} // Disable if form is invalid or loading
        className="mt-4"
        size="lg"
      >
        <Ionicons name="add-circle-outline" size={20} className="mr-2" />
        Ajouter le produit
      </Button>
    </View>
  );
}

// -------------------------
// Bulk Import Modal
// -------------------------
function BulkImportModal({ visible, onClose, onImport }: any) {
  const [text, setText] = useState("");
  const [parsedProducts, setParsedProducts] = useState<any[]>([]);

  const parseText = () => {
    const lines = text.split('\n').filter(line => line.trim());
    const products = lines.map((line, index) => {
      const parts = line.split(',').map(p => p.trim());
      return {
        id: index,
        name: parts[0] || `Produit ${index + 1}`,
        purchase_price: Number(parts[1]) || 0,
        selling_price: Number(parts[2]) || 0,
        unit: parts[3] || 'piece',
      };
    });
    setParsedProducts(products);
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader 
          title="Importer plusieurs produits" 
          showBackButton 
        />
        
        <View className="p-4 flex-1">
          <Card className="mb-4">
            <CardContent className="p-4">
              <ThemedText variant="subheading" className="mb-3">
                Format d'importation
              </ThemedText>
              <ThemedText variant="muted" size="sm" className="mb-2">
                Entrez un produit par ligne avec le format:
              </ThemedText>
              <View className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                <ThemedText variant="default" size="sm" className="font-mono">
                  Nom, Prix d'achat, Prix de vente, Unité
                </ThemedText>
              </View>
              <ThemedText variant="muted" size="sm" className="mt-2">
                Exemple:
              </ThemedText>
              <View className="bg-gray-100 dark:bg-gray-800 p-3 rounded mt-1">
                <ThemedText variant="default" size="sm" className="font-mono">
                  Sucre, 1500, 2000, kg{'\n'}
                  Riz, 1200, 1800, kg{'\n'}
                  Huile, 3000, 4000, l
                </ThemedText>
              </View>
            </CardContent>
          </Card>

          <RNTextInput
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={8}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-base"
            placeholder="Collez ou tapez vos produits ici..."
            onBlur={parseText}
            
          />

          {parsedProducts.length > 0 && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <ThemedText variant="subheading" className="mb-2">
                  {parsedProducts.length} produits détectés
                </ThemedText>
                <FlatList
                  data={parsedProducts}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View className="flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <ThemedText variant="default" size="sm">{item.name}</ThemedText>
                      <ThemedText variant="muted" size="sm">
                        {item.purchase_price} → {item.selling_price} {item.unit}
                      </ThemedText>
                    </View>
                  )}
                />
              </CardContent>
            </Card>
          )}

          <View className="flex-row gap-3 mt-4">
            <Button variant="outline" onPress={onClose} className="flex-1">
              Annuler
            </Button>
            <Button 
              onPress={() => {
                onImport(parsedProducts);
                onClose();
              }}
              disabled={parsedProducts.length === 0}
              className="flex-1"
            >
              Importer ({parsedProducts.length})
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}


// -------------------------
// Template Selection Modal (Updated)
// -------------------------
function TemplateModal({ visible, onClose, onSelectTemplate, shopId }: any) {
  // get the color scheme to adjust text colors in badges
  const { colorScheme } = useColorScheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [templatesWithStatus, setTemplatesWithStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Check which templates have products already in database
  useEffect(() => {
    const checkExistingProducts = async () => {
      if (!visible || !shopId) return;
      
      setLoading(true);
      try {
        const productsCollection = database.get<Product>("products");
        
        // Get all existing products for this shop
        const existingProducts = await productsCollection
          .query(Q.where('shop_id', shopId))
          .fetch();
        
        // Create a set of existing product names (lowercase for case-insensitive comparison)
        const existingProductNames = new Set(
          existingProducts.map(p => p.name.toLowerCase().trim())
        );


        // Check each template for existing products
        const enhancedTemplates = BURUNDI_TEMPLATES.map(template => {
          // Check if ANY product in this template already exists
          const existingProductsInTemplate = template.products.filter((product: any) => 
            existingProductNames.has(product.name.toLowerCase().trim())
          );
          
          // Check if ALL products in this template already exist
          const allProductsExist = template.products.every((product: any) => 
            existingProductNames.has(product.name.toLowerCase().trim())
          );
          
          // Calculate how many products are new
          const newProductsCount = template.products.length - existingProductsInTemplate.length;
          
          return {
            ...template,
            existingProductsCount: existingProductsInTemplate.length,
            newProductsCount,
            allProductsExist,
            hasNewProducts: newProductsCount > 0,
            // Store the existing product names for reference
            existingProductNames: existingProductsInTemplate.map(p => p.name),
          };
        });

        setTemplatesWithStatus(enhancedTemplates);
      } catch (error) {
        console.error('Error checking existing products:', error);
      } finally {
        setLoading(false);
      }
    };

    checkExistingProducts();
  }, [visible, shopId]);

  // Filter templates based on search query and existence status
  const filteredTemplates = useMemo(() => {
    let templates = templatesWithStatus;

    // First, filter out templates where all products already exist
    templates = templates.filter(template => !template.allProductsExist);

    if (!searchQuery.trim()) return templates;
    
    const query = searchQuery.toLowerCase().trim();
    
    return templates.filter(template => {
      // Search in template name
      if (template.name.toLowerCase().includes(query)) return true;
      
      // Search in template description
      if (template.description && template.description.toLowerCase().includes(query)) return true;
      
      // Search in product names
      const hasMatchingProduct = template.products.some((product: any) => 
        product.name.toLowerCase().includes(query)
      );
      
      // Search in product categories
      const hasMatchingCategory = template.products.some((product: any) => 
        product.category && product.category.toLowerCase().includes(query)
      );
      
      return hasMatchingProduct || hasMatchingCategory;
    });
  }, [searchQuery, templatesWithStatus]);

  // Count total products in filtered templates
  const totalFilteredProducts = useMemo(() => {
    return filteredTemplates.reduce((total, template) => total + template.newProductsCount, 0);
  }, [filteredTemplates]);

  // Handle search from PremiumHeader
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(query.length > 0);
  };

  // Clear search and close modal
  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
  };

  // Handle template selection - THIS IS THE FIXED FUNCTION
  const handleTemplateSelect = (template: any) => {
    //console.log('Template selected:', template.name); // Debug log
    // Clear search first
    setSearchQuery('');
    setIsSearching(false);
    // Then call the original onSelectTemplate
    onSelectTemplate(template);
    // Close the modal
    onClose();
  };

  // Close modal
  const handleClose = () => {
    setSearchQuery('');
    setIsSearching(false);
    onClose();
  };

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide">
        <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
          <PremiumHeader title="Modèles de produits" showBackButton  />
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#94a3b8' : '#64748b'} />
            <ThemedText variant="muted" className="mt-4">
              Vérification des produits existants...
            </ThemedText>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader 
          title="Modèles de produits" 
          showBackButton 
          //onBackPress={handleClose}
          searchable={true}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher modèle, produit ou catégorie..."
          action={
            searchQuery ? (
              <TouchableOpacity 
                onPress={handleClearSearch} 
                className="ml-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={22} color={colorScheme === 'dark' ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            ) : null
          }
        />
        
        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="p-4">
            {/* Info Banner */}
            <Card className="mb-4 bg-info/10 border-info/20">
              <CardContent className="p-3">
                <View className="flex-row items-center">
                  <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                  <ThemedText variant="default" size="sm" className="ml-2 flex-1">
                    Seuls les modèles contenant des produits non encore ajoutés à votre magasin sont affichés.
                  </ThemedText>
                </View>
              </CardContent>
            </Card>

            {/* Search Summary */}
            {searchQuery ? (
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <ThemedText variant="default" size="base" className="font-semibold">
                    Résultats de recherche
                  </ThemedText>
                  <TouchableOpacity onPress={handleClearSearch}>
                    <ThemedText variant="muted" size="sm" className="underline">
                      Effacer
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                <View className="bg-brand/10 p-3 rounded-lg">
                  <ThemedText variant="default" size="sm">
                    <ThemedText variant="brand" size="sm" className="font-semibold">
                      {filteredTemplates.length}
                    </ThemedText> modèles disponibles ({totalFilteredProducts} nouveaux produits) pour "
                    <ThemedText variant="brand" size="sm" className="font-semibold">
                      {searchQuery}
                    </ThemedText>"
                  </ThemedText>
                </View>
              </View>
            ) : (
              <ThemedText variant="subheading" size="lg" className="mb-4">
                Choisissez un modèle pour votre magasin
              </ThemedText>
            )}
            
            {filteredTemplates.length === 0 ? (
              <View className="items-center justify-center py-16">
                <Ionicons 
                  name="checkmark-done-circle-outline" 
                  size={64} 
                  color={colorScheme === 'dark' ? '#475569' : '#94a3b8'} 
                  className="mb-4"
                />
                <ThemedText variant="subheading" size="base" className="text-center mb-2">
                  Tous les produits sont déjà ajoutés !
                </ThemedText>
                <ThemedText variant="muted" size="sm" className="text-center max-w-xs">
                  Tous les produits des modèles disponibles sont déjà dans votre inventaire. Vous pouvez créer des produits personnalisés ou importer en masse.
                </ThemedText>
                
                <View className="mt-8">
                  <ThemedText variant="default" size="sm" className="text-center mb-3">
                    Suggestions:
                  </ThemedText>
                  <View className="flex-row flex-wrap justify-center gap-2">
                    {['créer produit', 'importer', 'autre catégorie'].map((suggestion) => (
                      <TouchableOpacity
                        key={suggestion}
                        onPress={() => {
                          if (suggestion === 'créer produit') {
                            handleClose();
                          } else if (suggestion === 'importer') {
                            // Handle bulk import
                            handleClose();
                            // You might want to open bulk import modal here
                          }
                        }}
                        className="bg-surface-soft dark:bg-dark-surface-soft px-3 py-2 rounded-lg active:opacity-70"
                      >
                        <ThemedText variant="default" size="sm">{suggestion}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            ) : (
              <View className="gap-4 mb-4">
                {filteredTemplates.map((template) => {
                  // Filter products within template based on search query
                  const filteredProducts = searchQuery 
                    ? template.products.filter((product: any) => 
                        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                    : template.products.slice(0, 3); // Show only 3 products if not searching
                  
                  const showAllProducts = searchQuery && filteredProducts.length > 0;
                  const productsToShow = showAllProducts ? filteredProducts : template.products.slice(0, 3);

                  // Determine badge color based on how many new products
                  const badgeVariant = template.newProductsCount === template.products.length 
                    ? "success" 
                    : template.newProductsCount > 0 
                    ? "warning" 
                    : "default";

                  return (
                    <Card 
                      key={template.id}
                      className="border-l-4 mb-3"
                      style={{ borderLeftColor: template.color }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          console.log('✅ Template pressed:', template.name);
                          handleTemplateSelect(template);
                        }}
                        activeOpacity={0.85}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        className="w-full"
                      >
                        <CardContent className="p-4">
                          <View className="flex-row items-center">
                            <View 
                              className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                              style={{ backgroundColor: `${template.color}20` }}
                            >
                              <Ionicons name={template.icon as any} size={24} color={template.color} />
                            </View>
                            <View className="flex-1">
                              <ThemedText variant="subheading" size="base" className="font-semibold">
                                {template.name}
                              </ThemedText>
                              <View className="flex-row items-center mt-0.5">
                                <ThemedText variant="muted" size="sm">
                                  {template.products.length} produits
                                </ThemedText>
                                {template.existingProductsCount > 0 && (
                                  <View className="ml-2 bg-warning/10 px-2 py-0.5 rounded-full">
                                    <ThemedText variant="warning" size="xs" className="font-medium">
                                      {template.existingProductsCount} déjà ajouté{template.existingProductsCount > 1 ? 's' : ''}
                                    </ThemedText>
                                  </View>
                                )}
                              </View>
                              {template.description && (
                                <ThemedText variant="muted" size="xs" className="mt-1">
                                  {template.description}
                                </ThemedText>
                              )}
                            </View>
                            <View className="items-end">
                              <Badge variant={badgeVariant} size="sm" className="mb-2">
                                {template.newProductsCount} nouveau{template.newProductsCount > 1 ? 'x' : ''}
                              </Badge>
                              <Ionicons 
                                name="chevron-forward" 
                                size={20} 
                                color={colorScheme === 'dark' ? '#94a3b8' : '#64748b'} 
                              />
                            </View>
                          </View>
                          
                          {productsToShow.length > 0 && (
                            <View className="flex-row flex-wrap gap-2 mt-3">
                              {productsToShow.map((product: any, index: number) => {
                                const isMatch = searchQuery && product.name.toLowerCase().includes(searchQuery.toLowerCase());
                                const isExisting = template.existingProductNames?.includes(product.name);
                                
                                return (
                                  <Badge 
                                    key={`${template.id}-${index}`} 
                                    variant={isExisting ? "warning" : (isMatch ? "success" : "default")} 
                                    size="sm"
                                    className={isExisting ? "opacity-50" : ""}
                                  >
                                    {product.name}
                                    {isExisting && " ✓"}
                                  </Badge>
                                );
                              })}
                              {!searchQuery && template.products.length > 3 && (
                                <Badge variant="default" size="sm">
                                  +{template.products.length - 3} autres
                                </Badge>
                              )}
                              {searchQuery && filteredProducts.length > 3 && (
                                <Badge variant="success" size="sm">
                                  +{filteredProducts.length - 3} autre{filteredProducts.length - 3 > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </View>
                          )}
                        </CardContent>
                      </TouchableOpacity>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Quick stats at bottom when searching */}
        {searchQuery && filteredTemplates.length > 0 && (
          <View className="border-t border-border dark:border-dark-border bg-surface dark:bg-dark-surface p-4">
            <View className="flex-row justify-between items-center">
              <View>
                <ThemedText variant="muted" size="sm">Résumé</ThemedText>
                <ThemedText variant="default" size="base" className="font-semibold">
                  {filteredTemplates.length} modèles avec {totalFilteredProducts} nouveaux produits
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (filteredTemplates.length === 1) {
                    console.log('Auto-select template:', filteredTemplates[0].name); // Debug log
                    handleTemplateSelect(filteredTemplates[0]);
                  }
                }}
                disabled={filteredTemplates.length !== 1}
                className={`px-4 py-2 rounded-lg ${filteredTemplates.length === 1 ? 'bg-brand active:opacity-90' : 'bg-gray-300 dark:bg-gray-700'}`}
              >
                <ThemedText 
                  variant={filteredTemplates.length === 1 ? "default" : "muted"} 
                  size="sm"
                >
                  {filteredTemplates.length === 1 ? 'Utiliser ce modèle' : 'Sélectionnez un modèle'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}


// -------------------------
// Template Customizer Component (Simplified - Uses data from TemplateModal)
// -------------------------
function TemplateCustomizer({ template, onSave, onCancel }: any) {
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [customizingProduct, setCustomizingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { colorScheme } = useColorScheme();

  // Create a Set of existing product names for quick lookup
  const existingProductNamesSet = useMemo(() => {
    return new Set(template.existingProductNames?.map((name: string) => name.toLowerCase().trim()) || []);
  }, [template.existingProductNames]);

  //console.log(template?.existingProductCount, ' produits existent déjà dans ce modèle'); // Debug log

  // Filter out products that already exist in the database
  const availableProducts = useMemo(() => {
    return template.products.filter((product: any) => 
      !existingProductNamesSet.has(product.name.toLowerCase().trim())
    );
  }, [template.products, existingProductNamesSet]);

  // Filter products based on search query (only from available products)
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return availableProducts;

    const query = searchQuery.toLowerCase().trim();
    return availableProducts.filter((product: any) => 
      product.name.toLowerCase().includes(query) ||
      (product.sellingUnit && product.sellingUnit.toLowerCase().includes(query)) ||
      (product.baseUnit && product.baseUnit.toLowerCase().includes(query)) ||
      (product.purchaseUnit && product.purchaseUnit.toLowerCase().includes(query)) ||
      (product.category && product.category.toLowerCase().includes(query))
    );
  }, [searchQuery, availableProducts]);

  const toggleProduct = (index: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
  };

  const selectAll = () => {
    const allIndices = new Set(filteredProducts.map((_: any, index: number) => index));
    setSelectedProducts(allIndices);
  };

  const handleSave = () => {
    const productsToSave = Array.from(selectedProducts).map(index => availableProducts[index]);
    onSave(productsToSave);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  if (customizingProduct) {
    return (
      <AdvancedForm 
        initialValues={customizingProduct}
        onSubmit={(data: any) => {
          onSave([data]);
          setCustomizingProduct(null);
        }}
        onCancel={() => setCustomizingProduct(null)}
      />
    );
  }

  // Show message if no new products available
  if (availableProducts.length === 0) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader 
          title={template.name}
          showBackButton
          //onBackPress={onCancel}
        />
        <View className="flex-1 items-center justify-center p-4">
          <View className="w-20 h-20 rounded-full bg-success/10 items-center justify-center mb-4">
            <Ionicons name="checkmark-done-circle" size={40} color="#10B981" />
          </View>
          <ThemedText variant="heading" size="lg" className="text-center mb-2">
            Tous les produits existent déjà
          </ThemedText>
          <ThemedText variant="muted" size="base" className="text-center mb-8 max-w-xs">
            Tous les produits de ce modèle sont déjà dans votre inventaire.
          </ThemedText>
          
          <Button onPress={onCancel} className="w-1/2">
            Retour
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title={template.name}
        showBackButton
       //onBackPress={onCancel}
        searchable={true}
        onSearch={handleSearch}
        searchPlaceholder="Rechercher produit..."
      />
      
      <ScrollView className="p-4" keyboardShouldPersistTaps="handled">
        <Card className="mb-4">
          <CardContent className="p-4">
            <View className="flex-row items-center mb-3">
              <View 
                className="w-12 h-12 rounded-lg items-center justify-center mr-3"
                style={{ backgroundColor: `${template.color}20` }}
              >
                <Ionicons name={template.icon as any} size={28} color={template.color} />
              </View>
              <View className="flex-1">
                <ThemedText variant="heading" size="lg">
                  {template.name}
                </ThemedText>
                <View className="flex-row items-center">
                  <ThemedText variant="muted">
                    {availableProducts.length} nouveau{availableProducts.length > 1 ? 'x' : ''} produit{availableProducts.length > 1 ? 's' : ''} à ajouter
                  </ThemedText>
                  
                </View>
              </View>
            </View>
            
            <Button 
              variant="outline" 
              size="sm" 
              onPress={selectAll} 
              className="mb-4"
              disabled={filteredProducts.length === 0}
            >
              <Ionicons name="checkmark-done-outline" size={16} className="mr-2" />
              Tout sélectionner ({filteredProducts.length})
            </Button>
          </CardContent>
        </Card>

        {filteredProducts.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Ionicons name="search-outline" size={56} color={colorScheme === 'dark' ? '#475569' : '#94a3b8'} />
            <ThemedText variant="subheading" size="base" className="mt-3">
              Aucun produit trouvé
            </ThemedText>
            <ThemedText variant="muted" size="sm" className="text-center mt-1 max-w-xs">
              {searchQuery 
                ? `Aucun résultat pour "${searchQuery}"`
                : 'Aucun produit disponible'}
            </ThemedText>
          </View>
        ) : (
          <View className="gap-3 mb-12">
            {filteredProducts.map((product: any, index: number) => (
              <TouchableOpacity
                key={index}
                onPress={() => toggleProduct(index)}
                onLongPress={() => setCustomizingProduct(product)}
                activeOpacity={0.7}
              >
                <Card className={selectedProducts.has(index) ? 'bg-brand/10 border-brand/30' : ''}>
                  <CardContent className="p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <ThemedText variant="subheading" size="base">
                          {product.name}
                        </ThemedText>
                        <ThemedText variant="muted" size="sm">
                          Unité: {product.sellingUnit || product.unit || 'pièce'}
                        </ThemedText>
                        {product.category && (
                          <ThemedText variant="muted" size="xs" className="mt-1">
                            Catégorie: {product.category}
                          </ThemedText>
                        )}
                      </View>
                      <View className="flex-row items-center ml-3">
                        {selectedProducts.has(index) ? (
                          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        ) : (
                          <Ionicons name="ellipse-outline" size={24} color={colorScheme === 'dark' ? '#94a3b8' : '#64748b'} />
                        )}
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View className="p-4 border-t border-border dark:border-dark-border">
        <View className="flex-row gap-3">
          <Button variant="outline" onPress={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button 
            onPress={handleSave}
            disabled={selectedProducts.size === 0}
            className="flex-1"
          >
            Ajouter ({selectedProducts.size})
          </Button>
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------
// Advanced Form (Original with improvements)
// ------------------------------------------
function AdvancedForm({ initialValues, onSubmit, onCancel }: any) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [saving, setSaving] = useState(false);
  const [imageUrlLocal, setImageUrlLocal] = useState<string>("");

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(advancedSchema),
    defaultValues: initialValues || {
      name: '',
      sku: '',
      category: 'other',
      description: '',
      unitType: 'piece',
      baseUnit: 'piece',
      purchaseUnit: 'piece',
      purchaseUnitSize: 1,
      sellingUnit: 'piece',
      costPricePerBase: 0,
      sellingPricePerBase: 0,
      lowStockThreshold: 10,
      isPerishable: false,
      defaultExpiryDays: 0,
    },
  });

  const watchUnitType = watch("unitType");
  const unitsForType = BURUNDI_UNITS[watchUnitType] || BURUNDI_UNITS.piece;

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission requise", "Veuillez autoriser l'accès à la galerie");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUrlLocal(result.assets[0].uri);
    }
  };

  const generateSKU = (name: string) => {
    const prefix = name.substring(0, 3).toUpperCase();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${random}`;
  };

  const handleSave = async (data: any) => {
    setSaving(true);
    try {
      if (!data.sku) {
        data.sku = generateSKU(data.name);
      }
      
      await onSubmit({
        ...data,
        imageUrl: imageUrlLocal,
        imageThumbnailUrl: imageUrlLocal,
      });
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert("Erreur", "Impossible de sauvegarder le produit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
     

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        className="flex-1"
      >
        <ScrollView className="py-4 border-t border-border dark:border-dark-border" showsVerticalScrollIndicator={false}>
          {/* Quick Actions Bar */}
          <View className="flex-row gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onPress={pickImage}
              icon="camera-outline"
              iconPosition="left"
            >
              Photo
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onPress={() => {
                const name = watch("name");
                if (name) {
                  setValue("sku", generateSKU(name));
                }
              }}
              icon="barcode-outline"
              iconPosition="left"
            >
              Générer code
            </Button>
          </View>

          <View className="gap-4">
            {/* Basic Info */}
            <Card>
              <CardContent className="p-4 gap-4">
                <ThemedText variant="subheading" size="base">
                  Informations de base
                </ThemedText>

                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Nom du produit *"
                      placeholder="Nom du produit"
                      value={value}
                      onChangeText={onChange}
                      error={errors.name?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="sku"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Code produit (SKU)"
                      placeholder="Généré automatiquement"
                      value={value}
                      onChangeText={onChange}
                      leftIcon="barcode-outline"
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
                      label="Catégorie"
                      placeholder="Choisir une catégorie"
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* Unit Configuration */}
            <Card>
              <CardContent className="p-4 gap-4">
                <ThemedText variant="subheading" size="base">
                  Configuration des unités
                </ThemedText>

                <Controller
                  control={control}
                  name="unitType"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      options={UNIT_TYPES}
                      value={value}
                      onValueChange={onChange}
                      label="Type d'unité"
                      placeholder="Choisir le type"
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
                          label="Unité de base"
                          placeholder="Unité de base"
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
                          label="Unité de vente"
                          placeholder="Unité de vente"
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
                          label="Unité d'achat"
                          placeholder="Unité d'achat"
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
                          label="Taille d'achat"
                          placeholder="1"
                          value={String(value)}
                          onChangeText={(v) => onChange(Number(v) || 1)}
                          keyboardType="numeric"
                        />
                      )}
                    />
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardContent className="p-4 gap-4">
                <ThemedText variant="subheading" size="base">
                  Tarification
                </ThemedText>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name="costPricePerBase"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label="Prix d'achat (unité de base)"
                          placeholder="0"
                          value={String(value)}
                          onChangeText={(v) => onChange(Number(v) || 0)}
                          keyboardType="numeric"
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
                          label="Prix de vente (unité de base)"
                          placeholder="0"
                          value={String(value)}
                          onChangeText={(v) => onChange(Number(v) || 0)}
                          keyboardType="numeric"
                        />
                      )}
                    />
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
              <CardContent className="p-4 gap-4">
                <ThemedText variant="subheading" size="base">
                  Gestion de stock
                </ThemedText>

                <Controller
                  control={control}
                  name="lowStockThreshold"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Seuil d'alerte stock bas"
                      placeholder="10"
                      value={String(value)}
                      onChangeText={(v) => onChange(Number(v) || 0)}
                      keyboardType="numeric"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="description"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Description"
                      placeholder="Description optionnelle"
                      value={value}
                      onChangeText={onChange}
                      multiline
                      numberOfLines={3}
                    />
                  )}
                />
              </CardContent>
            </Card>
          </View>
        </ScrollView>

        <View className="p-4 border-t border-border dark:border-dark-border">
          <View className="flex-row gap-3">
            <Button variant="outline" onPress={onCancel} className="flex-1" disabled={saving}>
              Annuler
            </Button>
            <Button 
              onPress={handleSubmit(handleSave)} 
              className="flex-1" 
              loading={saving}
              disabled={saving}
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// -------------------------
// Main Component
// -------------------------
export default function AddProductScreen() {
  const router = useRouter();
  const { shopId: paramShopId } = useLocalSearchParams();
  const { currentShop } = useAuth();
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [mode, setMode] = useState<'quick' | 'advanced'>('quick');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [saving, setSaving] = useState(false);

  const productsCollection = database.get<Product>("products");
  const shopsCollection = database.get<Shop>("shops");

  const shopId = paramShopId || currentShop?.id;

  useEffect(() => {
    const loadShop = async () => {
      if (!shopId) return;
      try {
        const shopData = await shopsCollection.find(shopId as string);
        setShop(shopData);
      } catch (error) {
        console.error("Error loading shop:", error);
        router.back();
      }
    };
    loadShop();
  }, [shopId]);

  const saveProduct = async (productData: any) => {
    if (!shopId) {
      Alert.alert("Erreur", "Aucun magasin sélectionné");
      return;
    }

    setSaving(true);
    try {
      await database.write(async () => {
        await productsCollection.create((p) => {
          Object.assign(p, {
            ...productData,
            shopId: shopId as string,
            isActive: true,
            stockQuantity: 0,
            barcode: '',
            description: productData.description || '',
            wholesalePricePerBase: productData.wholesalePricePerBase || productData.sellingPricePerBase * 0.9,
          });
        });
      });

      Alert.alert("Succès", "Produit ajouté avec succès");
      router.back();
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Erreur", "Impossible d'ajouter le produit");
    } finally {
      setSaving(false);
    }
  };

  const saveMultipleProducts = async (products: any[]) => {
    if (!shopId || products.length === 0) return;

    setSaving(true);
    try {
      await database.write(async () => {
        for (const productData of products) {
          await productsCollection.create((p) => {
            Object.assign(p, {
              ...productData,
              shopId: shopId as string,
              isActive: true,
              stockQuantity: 0,
              sku: productData.sku || generateSKU(productData.name),
              category: productData.category || 'other',
              unitType: productData.unitType || 'piece',
              baseUnit: productData.baseUnit || productData.unit,
              purchaseUnit: productData.purchaseUnit || productData.unit,
              purchaseUnitSize: productData.purchaseUnitSize || 1,
              sellingUnit: productData.sellingUnit || productData.unit,
              wholesalePricePerBase: productData.sellingPricePerBase * 0.9,
            });
          });
        }
      });

      Alert.alert("Succès", `${products.length} produits ajoutés avec succès`);
      router.back();
    } catch (error) {
      console.error("Bulk save error:", error);
      Alert.alert("Erreur", "Impossible d'ajouter les produits");
    } finally {
      setSaving(false);
    }
  };

  const generateSKU = (name: string) => {
    const prefix = name.substring(0, 3).toUpperCase();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${random}`;
  };

  // Show template customizer if template selected
  if (selectedTemplate) {
    return (
      <TemplateCustomizer
        template={selectedTemplate}
        onSave={(products: any[]) => saveMultipleProducts(products)}
        onCancel={() => setSelectedTemplate(null)}
      />
    );
  }

  // Show loading if no shop
  if (!shopId) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-soft dark:bg-dark-surface-soft">
        <ThemedText variant="error">Aucun magasin sélectionné</ThemedText>
        <Button onPress={() => router.back()} className="mt-4">
          Retour
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title="Ajouter un produit" 
        showBackButton 
        
      />

      {/* Shop Banner */}
      {shop && (
        <Card className="mx-4 mt-4 bg-brand/5 border-brand/20">
          <CardContent className="p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="business" size={16} className="text-brand mr-2" color={isDark ? '#f8fafc' : '#0f172a'}/>
                <ThemedText variant="brand" size="sm">
                  Ajout à: {shop.name}
                </ThemedText>
              </View>
              <Badge variant="success">
                {mode === 'quick' ? 'Mode rapide' : 'Mode avancé'}
              </Badge>
            </View>
          </CardContent>
        </Card>
      )}


      {/* Quick Action Buttons */}
      <View className="flex-row px-4 py-3 gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onPress={() => setShowTemplates(true)}
          icon="copy-outline"
          className="flex-1"
        >
          Modèles
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onPress={() => setShowBulkImport(true)}
          icon="document-text-outline"
          className="flex-1"
        >
          Importer
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onPress={() => router.push('/(auth)/scan')}
          icon="camera-outline"
          iconPosition="right"
          className="flex-1"
        >
          Scanner
        </Button>
      </View>

      {/* Mode Tabs */}
      <View className="flex-row mx-4 mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        <TouchableOpacity
          className={`flex-1 py-3 rounded-md ${mode === 'quick' ? 'bg-white dark:bg-gray-700' : ''}`}
          onPress={() => setMode('quick')}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons 
              name="flash-outline" 
              size={18} 
              className={`mr-2 ${mode === 'quick' ? 'text-brand' : 'text-gray-500'}`} 
              color={`${colorScheme === 'dark' ? '#94a3b8' : '#64748b'}`}
            />
            <ThemedText 
              variant={mode === 'quick' ? 'default' : 'muted'} 
              className="font-semibold"
            >
              Rapide
            </ThemedText>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          className={`flex-1 py-3 rounded-md ${mode === 'advanced' ? 'bg-white dark:bg-gray-700' : ''}`}
          onPress={() => setMode('advanced')}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons 
              name="options-outline" 
              size={18} 
              className={`mr-2 ${mode === 'advanced' ? 'text-brand' : 'text-gray-500'}`} 
              color={`${colorScheme === 'dark' ? '#94a3b8' : '#64748b'}`}
            />
            <ThemedText 
              variant={mode === 'advanced' ? 'default' : 'muted'} 
              className="font-semibold"
            >
              Avancé
            </ThemedText>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Form */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        className="flex-1"
      >
        <ScrollView className="px-4" showsVerticalScrollIndicator={false}>
          {mode === 'quick' ? (
            <QuickAddForm onSubmit={saveProduct} shopId={shopId as string} />
          ) : (
            <AdvancedForm 
              onSubmit={saveProduct}
              onCancel={() => router.back()}
            />
          )}
          
          {/* Help Card */}
          <Card className="mt-4 mb-8">
            <CardContent className="p-4">
              <View className="flex-row items-start">
                <Ionicons name="help-circle-outline" size={24} className="text-info mr-3" color = {`${colorScheme === 'dark' ? '#94a3b8' : '#64748b'}`}/>
                <View className="flex-1">
                  <ThemedText variant="subheading" size="base" className="mb-1">
                    Conseil
                  </ThemedText>
                  <ThemedText variant="muted" size="sm">
                    {mode === 'quick' 
                      ? 'Utilisez le mode rapide pour ajouter rapidement vos produits. Vous pourrez ajouter plus de détails plus tard.'
                      : 'Le mode avancé vous permet de configurer toutes les options du produit. Idéal pour les produits complexes.'}
                  </ThemedText>
                </View>
              </View>
            </CardContent>
          </Card>


          {/* Adding a quick link to go to the customization screen  */}

          <View className="flex-row items-center">
            <Ionicons name="link" size={24} className="text-info mr-3" color = {`${colorScheme === 'dark' ? '#94a3b8' : '#64748b'}`}/>
            <ThemedText variant="muted" size="sm">
              Ajouter un produit en utilisant un modèle pré-rempli et personnalisable 
            </ThemedText>
          </View>
          <View className="mt-2 mb-8">
            <Button variant="warning" icon="arrow-forward-outline" onPress={() => router.push('/(auth)/templates-products')}>
              Personnaliser
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <TemplateModal
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={(template: any) => {
          setShowTemplates(false);
          setSelectedTemplate(template);
        }}
        shopId={shopId as string}
      />

      <BulkImportModal
        visible={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImport={(products: any[]) => saveMultipleProducts(products)}
      />
    </View>
  );
}