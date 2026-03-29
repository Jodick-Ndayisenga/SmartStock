// // app/edit-product/[id].tsx
// import React, { useState } from 'react';
// import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
// import { useRouter, useLocalSearchParams } from 'expo-router';
// import { useAuth } from '@/context/AuthContext';

// // Components
// import PremiumHeader from '@/components/layout/PremiumHeader';
// import { Loading } from '@/components/ui/Loading';
// import { EmptyState } from '@/components/ui/EmptyState';
// import { Button } from '@/components/ui/Button';
// import { ProfitabilityBanner } from '@/components/edit-product/ProfitabilityBanner';
// import { ProductBasicInfo } from '@/components/edit-product/ProductBasicInfo';
// import { ProductUnits } from '@/components/edit-product/ProductUnits';
// import { ProductPricing } from '@/components/edit-product/ProductPricing';
// import { ProductStock } from '@/components/edit-product/ProductStock';
// import { ProductAdvanced } from '@/components/edit-product/ProductAdvanced';

// // Hook
// import { useProductForm } from '@/hooks/useProductForm';
// import { QuickActionsBar } from '@/components/edit-product/QuickActionBar';
// import { UnitSetupProgress } from '@/components/edit-product/UnitSetUpProgress';
// import { ProductFormActions } from '@/components/edit-product/ProductFormAction';
// import { UnitHelperModal } from '@/components/edit-product/UnitHelperModal';

// export default function EditProductScreen() {
//   const router = useRouter();
//   const params = useLocalSearchParams();
//   const { currentShop } = useAuth();

//   const productId = params.id as string;
//   const isNewProduct = productId === 'new';
//   const [showAdvanced, setShowAdvanced] = useState(false);

//   const {
//     // State
//     formData,
//     errors,
//     loading,
//     saving,
//     imageUploading,
//     hasUnsavedChanges,
//     showUnitHelper,
//     setShowUnitHelper,
//     activeUnitTab,
//     setActiveUnitTab,
//     purchaseQuantity,
//     showPriceCalculator,
//     setShowPriceCalculator,
//     unitValidation,
//     selectedUnitCategory,
//     setSelectedUnitCategory,
//     showBaseUnitSelector,
//     setShowBaseUnitSelector,
//     product,

//     // Computed
//     conversionMatrix,
//     priceMetrics,
//     profitAnalysis,
//     stockInPurchaseUnits,
//     stockInSellingUnits,
//     setupProgress,

//     // Actions
//     updateField,
//     handlePurchaseQuantityChange,
//     handleStockQuantityChange,
//     saveProduct,
//     handleDelete,
//     formatCurrency,
//     getAvailableBaseUnits,
//     handleBaseUnitChange,
//     getFilteredSellingUnits,
//     getCategoryCount,
//     getUnitSetupProgress,
//   } = useProductForm(productId, isNewProduct);

//   const generateSku = () => {
//     const prefix = formData.name.substring(0, 3).toUpperCase();
//     const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
//     const shopCode = currentShop?.name.substring(0, 2).toUpperCase() || 'XX';
//     return `${prefix}-${shopCode}-${random}`;
//   };

//   if (loading) {
//     return (
//       <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
//         <PremiumHeader title="Chargement..." showBackButton />
//         <Loading />
//       </View>
//     );
//   }

//   if (!isNewProduct && !product) {
//     return (
//       <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
//         <PremiumHeader title="Erreur" showBackButton />
//         <EmptyState
//           icon="alert-circle-outline"
//           title="Produit introuvable"
//           description="Le produit que vous cherchez n'existe pas"
//           action={{ label: "Retour", onPress: () => router.back() }}
//         />
//       </View>
//     );
//   }
//   return (
//     <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
//       <PremiumHeader
//         title={isNewProduct ? "Nouveau Produit" : "Modifier Produit"}
//         showBackButton
//         subtitle={`${isNewProduct ? "Créez un nouveau produit pour votre inventaire" : `Modification - ${product?.name}`}`}
//       />

//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         className="flex-1"
//       >
//         <ScrollView
//           className="flex-1"
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{ paddingBottom: 100 }}
//         >
//           <View className="py-4 px-1 gap-4">
//             {/* Profitability Banner */}
//             <ProfitabilityBanner
//               analysis={profitAnalysis}
//               sellingUnit={formData.sellingUnit}
//               formatCurrency={formatCurrency}
//               onPress={() => setShowUnitHelper(true)}
//             />

//             {/* Product Basic Info */}
//             <ProductBasicInfo
//               formData={formData}
//               updateField={updateField}
//               imageUploading={imageUploading}
//               generateSku={generateSku}
//               productId={productId}
//             />

//             {/* Quick Actions Bar */}
//             <QuickActionsBar
//               showAdvanced={showAdvanced}
//               setShowAdvanced={setShowAdvanced}
//               isNewProduct={isNewProduct}
//               productId={productId}
//               onViewMovements={() => router.push(`/stock-movements/${productId}`)}
//             />

//             {/* Units Section */}
//             <ProductUnits
//               formData={formData}
//               updateField={updateField}
//               conversionMatrix={conversionMatrix}
//               selectedUnitCategory={selectedUnitCategory}
//               setSelectedUnitCategory={setSelectedUnitCategory}
//               showBaseUnitSelector={showBaseUnitSelector}
//               setShowBaseUnitSelector={setShowBaseUnitSelector}
//               getAvailableBaseUnits={getAvailableBaseUnits}
//               handleBaseUnitChange={handleBaseUnitChange}
//               getFilteredSellingUnits={getFilteredSellingUnits}
//               getCategoryCount={getCategoryCount}
//               productId={productId}
//             />

//             {/* Pricing Section */}
//             <ProductPricing
//               formData={formData}
//               updateField={updateField}
//               purchaseQuantity={purchaseQuantity}
//               handlePurchaseQuantityChange={handlePurchaseQuantityChange}
//               priceMetrics={priceMetrics}
//               profitAnalysis={profitAnalysis}
//               formatCurrency={formatCurrency}
//               showPriceCalculator={showPriceCalculator}
//               setShowPriceCalculator={setShowPriceCalculator}
//               productId={productId}
//             />

//           <ProductStock
//             formData={formData}
//             stockInPurchaseUnits={stockInPurchaseUnits}
//             stockInSellingUnits={stockInSellingUnits}
//             profitAnalysis={profitAnalysis}
//             formatCurrency={formatCurrency}
//             productId={productId}  // ← ADD THIS LINE
//           />

//             {/* Advanced Settings (conditional) */}
//             {showAdvanced && (
//               <ProductAdvanced
//                 formData={formData}
//                 updateField={updateField}
//                 isNewProduct={isNewProduct}
//                 onDelete={handleDelete}
//                 //productId={productId}
//               />
//             )}

//             {/* Unit Setup Progress Guide */}
//             <UnitSetupProgress
//               setupProgress={setupProgress}
//               getUnitSetupProgress={getUnitSetupProgress}
//               unitValidation={unitValidation}
//               formData={formData}
//               onShowBaseUnitSelector={() => setShowBaseUnitSelector(true)}
//               //productId={productId}
//             />

//             {/* Help Button */}
//             <Button
//               onPress={() => setShowUnitHelper(true)}
//               variant="warning"
//               icon="help-circle-outline"
//             >
//               Besoin d'aide avec les unités ?
//             </Button>

//             {/* Form Actions */}
//             <ProductFormActions
//               saving={saving}
//               isNewProduct={isNewProduct}
//               hasUnsavedChanges={hasUnsavedChanges}
//               unitValidationValid={unitValidation.valid}
//               onCancel={() => router.back()}
//               onSave={saveProduct}
//             />
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>

//       {/* Unit Helper Modal */}
//       <UnitHelperModal
//         visible={showUnitHelper}
//         onClose={() => setShowUnitHelper(false)}
//         formData={formData}
//         conversionMatrix={conversionMatrix}
//         stockInPurchaseUnits={stockInPurchaseUnits}
//         stockInSellingUnits={stockInSellingUnits}
//         activeUnitTab={activeUnitTab}
//         setActiveUnitTab={setActiveUnitTab}
//         formatCurrency={formatCurrency}
//         updateField={updateField}
//       />
//     </View>
//   );
// }
// app/edit-product/[id].tsx
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

// Components
import { ProductAdvanced } from "@/components/edit-product/ProductAdvanced";
import { ProductBasicInfo } from "@/components/edit-product/ProductBasicInfo";
import { ProductPricing } from "@/components/edit-product/ProductPricing";
import { ProductStock } from "@/components/edit-product/ProductStock";
import { ProductUnits } from "@/components/edit-product/ProductUnits";
import { ProfitabilityBanner } from "@/components/edit-product/ProfitabilityBanner";
import PremiumHeader from "@/components/layout/PremiumHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { ThemedText } from "@/components/ui/ThemedText";

// Hook
import { ProductFormActions } from "@/components/edit-product/ProductFormAction";
import { QuickActionsBar } from "@/components/edit-product/QuickActionBar";
import { UnitHelperModal } from "@/components/edit-product/UnitHelperModal";
import { UnitSetupProgress } from "@/components/edit-product/UnitSetUpProgress";
import { useProductForm } from "@/hooks/useProductForm";

export default function EditProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentShop } = useAuth();

  const productId = params.id as string;
  const isNewProduct = productId === "new";
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Modal state - shows first for existing products
  const [showActionModal, setShowActionModal] = useState(!isNewProduct); // Show modal for existing products

  const {
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

    // Computed
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
  } = useProductForm(productId, isNewProduct);

  const generateSku = () => {
    const prefix = formData.name.substring(0, 3).toUpperCase();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const shopCode = currentShop?.name.substring(0, 2).toUpperCase() || "XX";
    return `${prefix}-${shopCode}-${random}`;
  };

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
      {/* Action Selection Modal - Shows FIRST for existing products */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center py-6 px-4">
          <View className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <View className="p-6 pb-4">
              <View className="w-16 h-16 rounded-full bg-brand/10 items-center justify-center self-center mb-4">
                <Ionicons name="create-outline" size={32} color="#0ea5e9" />
              </View>
              <ThemedText
                variant="heading"
                size="xl"
                className="text-center mb-2"
              >
                Que voulez-vous modifier ?
              </ThemedText>
              <ThemedText variant="muted" size="sm" className="text-center">
                Choisissez le type de modification que vous souhaitez effectuer
                sur {product?.name || "ce produit"}
              </ThemedText>
            </View>

            {/* Button 1: Adjust Stock */}
            <View className="px-6 mb-3">
              <Button
                size="lg"
                icon={"cube-outline"}
                onPress={() => {
                  setShowActionModal(false);
                  router.push(`/adjust-stock/${productId}`);
                  console.log(
                    "📦 Adjust stock - Navigate to stock adjustment page",
                  );
                }}
              >
                Ajuster le "STOCK"
              </Button>

              {/* Advantages list for Button 1 */}
              <View className="mt-3">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <ThemedText variant="muted" size="xs" className="ml-2">
                    Ajouter du stock (achats, retours fournisseurs)
                  </ThemedText>
                </View>
                <View className="flex-row items-center mb-1">
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <ThemedText variant="muted" size="xs" className="ml-2">
                    Retirer du stock (ventes, produits endommagés)
                  </ThemedText>
                </View>

                
              </View>
            </View>

            {/* Button 2: Edit Product Info */}
            <View className="px-6 mb-3 mt-4">
              <Button
                icon="document-text-outline"
                iconPosition="left"
                onPress={() => {
                  setShowActionModal(false);
                  console.log("📝 Edit product info - Stay on edit page");
                }}
                variant="warning"
              >
                Modifier les informations
              </Button>

              {/* Advantages list for Button 1 */}
              <View className="mt-3">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <ThemedText variant="muted" size="xs" className="ml-2">
                    Modifier le nom, SKU et code-barres
                  </ThemedText>
                </View>
                  <View className="flex-row items-center mb-1">
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <ThemedText variant="muted" size="xs" className="ml-2">
                    Corriger les quantités après inventaire
                  </ThemedText>
                </View>
                <View className="flex-row items-center mb-1">
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <ThemedText variant="muted" size="xs" className="ml-2">
                    Changer le prix de vente et d'achat
                  </ThemedText>
                </View>
                <View className="flex-row items-center mb-1">
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <ThemedText variant="muted" size="xs" className="ml-2">
                    Configurer les unités (base, vente, achat)
                  </ThemedText>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <ThemedText variant="muted" size="xs" className="ml-2">
                    Mettre à jour la catégorie et la description
                  </ThemedText>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <ThemedText variant="muted" size="xs" className="ml-2">
                    Ajouter des numéros de lot et dates d'expiration
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Additional Info Box */}
            <View className="mx-6 mb-4 p-3 bg-brand/5 rounded-md border border-brand/20">
              <View className="flex-row items-center mb-2">
                <Ionicons name="information-circle" size={16} color="#0ea5e9" />
                <ThemedText
                  variant="brand"
                  size="xs"
                  className="font-semibold ml-1"
                >
                  Information importante
                </ThemedText>
              </View>
              <ThemedText variant="muted" size="xs" className="leading-5">
                • La modification des informations et l'ajustement du stock sont
                deux actions séparées • Les modifications de prix n'affectent
                pas les mouvements de stock existants • Chaque ajustement de
                stock crée une trace dans l'historique des mouvements
              </ThemedText>
            </View>



            {/* Cancel Button */}
            <View className="px-6 pb-6">
              <Button variant="destructive" onPress={() => {
                  setShowActionModal(false);
                  router.back();
                }} className="mb-3">
                Annuler
              </Button>
            </View>
          </View>
        </View>
      </Modal>
      {/* Main Content - Only visible after modal is closed */}
      <PremiumHeader
        title={isNewProduct ? "Nouveau Produit" : "Modifier Produit"}
        showBackButton
        subtitle={`${isNewProduct ? "Créez un nouveau produit pour votre inventaire" : `Modification - ${product?.name}`}`}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="py-4 px-1 gap-4">
            {/* Profitability Banner */}
            <ProfitabilityBanner
              analysis={profitAnalysis}
              sellingUnit={formData.sellingUnit}
              formatCurrency={formatCurrency}
              onPress={() => setShowUnitHelper(true)}
            />

            {/* Product Basic Info */}
            <ProductBasicInfo
              formData={formData}
              updateField={updateField}
              imageUploading={imageUploading}
              generateSku={generateSku}
              productId={productId}
            />

            {/* Quick Actions Bar */}
            <QuickActionsBar
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              isNewProduct={isNewProduct}
              productId={productId}
              onViewMovements={() =>
                router.push(`/stock-movements/${productId}`)
              }
            />

            {/* Units Section */}
            <ProductUnits
              formData={formData}
              updateField={updateField}
              conversionMatrix={conversionMatrix}
              selectedUnitCategory={selectedUnitCategory}
              setSelectedUnitCategory={setSelectedUnitCategory}
              showBaseUnitSelector={showBaseUnitSelector}
              setShowBaseUnitSelector={setShowBaseUnitSelector}
              getAvailableBaseUnits={getAvailableBaseUnits}
              handleBaseUnitChange={handleBaseUnitChange}
              getFilteredSellingUnits={getFilteredSellingUnits}
              getCategoryCount={getCategoryCount}
              productId={productId}
            />

            {/* Pricing Section */}
            <ProductPricing
              formData={formData}
              updateField={updateField}
              purchaseQuantity={purchaseQuantity}
              handlePurchaseQuantityChange={handlePurchaseQuantityChange}
              priceMetrics={priceMetrics}
              profitAnalysis={profitAnalysis}
              formatCurrency={formatCurrency}
              showPriceCalculator={showPriceCalculator}
              setShowPriceCalculator={setShowPriceCalculator}
              productId={productId}
            />

            <ProductStock
              formData={formData}
              stockInPurchaseUnits={stockInPurchaseUnits}
              stockInSellingUnits={stockInSellingUnits}
              profitAnalysis={profitAnalysis}
              formatCurrency={formatCurrency}
              productId={productId}
            />

            {/* Advanced Settings (conditional) */}
            {showAdvanced && (
              <ProductAdvanced
                formData={formData}
                updateField={updateField}
                isNewProduct={isNewProduct}
                onDelete={handleDelete}
              />
            )}

            {/* Unit Setup Progress Guide */}
            <UnitSetupProgress
              setupProgress={setupProgress}
              getUnitSetupProgress={getUnitSetupProgress}
              unitValidation={unitValidation}
              formData={formData}
              onShowBaseUnitSelector={() => setShowBaseUnitSelector(true)}
            />

            {/* Help Button */}
            <Button
              onPress={() => setShowUnitHelper(true)}
              variant="warning"
              icon="help-circle-outline"
            >
              Besoin d'aide avec les unités ?
            </Button>

            {/* Form Actions */}
            <ProductFormActions
              saving={saving}
              isNewProduct={isNewProduct}
              hasUnsavedChanges={hasUnsavedChanges}
              unitValidationValid={unitValidation.valid}
              onCancel={() => router.back()}
              onSave={saveProduct}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Unit Helper Modal */}
      <UnitHelperModal
        visible={showUnitHelper}
        onClose={() => setShowUnitHelper(false)}
        formData={formData}
        conversionMatrix={conversionMatrix}
        stockInPurchaseUnits={stockInPurchaseUnits}
        stockInSellingUnits={stockInSellingUnits}
        activeUnitTab={activeUnitTab}
        setActiveUnitTab={setActiveUnitTab}
        formatCurrency={formatCurrency}
        updateField={updateField}
      />
    </View>
  );
}
