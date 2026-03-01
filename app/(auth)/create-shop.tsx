// app/(auth)/create-shop.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import database from '@/database';
import { useTranslation } from 'react-i18next';
import { Q } from '@nozbe/watermelondb';
import { Ionicons } from '@expo/vector-icons';
//import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import SeedModal from '@/components/SeedModal';
import CustomDialog from '@/components/ui/CustomDialog';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Loading } from '@/components/ui/Loading';
import { Badge } from '@/components/ui/Badge';

// Models
import { Shop } from '@/database/models/Shop';
import { Setting } from '@/database/models/Setting';
import { Membership } from '@/database/models/Membership';
import { CashAccount } from '@/database/models/CashAccount';
import { generateEnhancedUUID } from '@/utils/getModelId';

// Context
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper functions for generating branch codes and shop names
const generateBranchCode = (shopName: string = ''): string => {
  // Extract first 3 letters of shop name (uppercase) or use 'SHOP'
  const prefix = shopName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '') // Remove non-letters
    .slice(0, 3);
  
  const validPrefix = prefix.length >= 2 ? prefix : 'SHO';
  
  // Add random numbers and timestamp
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${validPrefix}-${timestamp}${random}`;
};

const generateShopNameSuggestion = (userName: string = ''): string => {
  const names = [
    `${userName.split(' ')[0]}'s Store`,
    `${userName.split(' ')[0]} Enterprise`,
    `${userName.split(' ')[0]} Shop`,
    'My Business',
    'Local Store',
    'Community Shop',
  ];
  
  // Pick a random suggestion
  return names[Math.floor(Math.random() * names.length)];
};

// const getLocation = async () => {
//   let { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         //setErrorMsg('Permission to access location was denied');
//         return '';
//       }else{
//         let Userlocation = await Location.getCurrentPositionAsync({});
//         console.log("📍 Current Location:", JSON.stringify(Userlocation));
//         return JSON.stringify(Userlocation) || '';
//       }
// };

export default function CreateShopScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const { user, switchShop, removeShop } = useAuth();

  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  
  // Dialog states
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dialogAction, setDialogAction] = useState<{ onConfirm?: () => void }>({});

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    phone: user?.phone || '',
    branchCode: '',
    currency: 'BIF',
    language: 'fr',
    weekStartDay: 1, // Monday
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});



  // 📍 Request location permission and get current location
  // const getCurrentLocation = async () => {
  //   try {
  //     setIsGettingLocation(true);
  //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  //     const { status } = await Location.requestForegroundPermissionsAsync();
      
  //     if (status !== 'granted') {
  //       setShowLocationDialog(true);
  //       return;
  //     }

  //     const location = await Location.getCurrentPositionAsync({
  //       accuracy: Location.Accuracy.High,
  //     });

  //     // Get address details
  //     const [address] = await Location.reverseGeocodeAsync({
  //       latitude: location.coords.latitude,
  //       longitude: location.coords.longitude,
  //     });

  //     if (address) {
  //       const locationString = address 
  //         ? [
  //             address.street,
  //             address.city,
  //             address.region,
  //             address.country,
  //           ].filter(Boolean).join(', ')
  //         : `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
        
  //       setFormData(prev => ({ ...prev, location: locationString }));
  //       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  //     }
  //   } catch (error) {
  //     console.error('Location error:', error);
  //     setErrorMessage('Failed to get your location. Please enter manually.');
  //     setShowErrorDialog(true);
  //   } finally {
  //     setIsGettingLocation(false);
  //   }
  // };

  // 🏷️ Generate branch code from shop name
  const generateCodeFromName = () => {
    if (formData.name.trim()) {
      const newCode = generateBranchCode(formData.name);
      setFormData(prev => ({ ...prev, branchCode: newCode }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setErrorMessage('Please enter a shop name first to generate branch code');
      setShowErrorDialog(true);
    }
  };

  // 💡 Suggest shop name based on user's name
  const suggestShopName = () => {
    if (user?.displayName) {
      const suggestion = generateShopNameSuggestion(user.displayName);
      setFormData(prev => ({ ...prev, name: suggestion }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // 🔍 Load shop if editing
  useEffect(() => {
    if (id) {
      loadShopForEdit(id);
    } else {
      setIsEditMode(false);
      setShopToDelete(null);
      
      // Auto-suggest shop name on new form
      const initialName = user?.displayName 
        ? generateShopNameSuggestion(user.displayName)
        : '';
      
      // Auto-generate branch code
      const initialCode = generateBranchCode(initialName);
      
      setFormData({
        name: initialName,
        location:'' ,
        phone: user?.phone || '',
        branchCode: initialCode,
        currency: 'BIF',
        language: 'fr',
        weekStartDay: 1,
      });
    }
  }, [id, user]);

  const loadShopForEdit = async (shopId: string) => {
    try {
      setLoading(true);
      const shop = await database.get<Shop>('shops').find(shopId);
      
      const shopData = {
        id: shop.id,
        name: shop.name,
        location: shop.location || '',
        phone: shop.phone || '',
        branchCode: shop.branchCode || '',
        ownerId: shop.ownerId,
        createdAt: shop.createdAt,
        updatedAt: shop.updatedAt,
      };

      const settings = await database
        .get<Setting>('settings')
        .query(Q.where('shop_id', shopId))
        .fetch();

      setIsEditMode(true);
      setShopToDelete(shop);

      const setting = settings[0];
      setFormData({
        name: shopData.name,
        location: shopData.location || '',
        phone: shopData.phone || '',
        branchCode: shopData.branchCode || '',
        currency: setting?.currency || 'BIF',
        language: setting?.language || 'fr',
        weekStartDay: setting?.weekStartDay ?? 1,
      });
    } catch (error) {
      console.error('Failed to load shop:', error);
      setErrorMessage(t('createShop.errors.shopNotFound'));
      setShowErrorDialog(true);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = t('createShop.errors.shopNameRequired');
    if (!formData.location.trim()) newErrors.location = t('createShop.errors.locationRequired');
    if (!formData.branchCode.trim()) newErrors.branchCode = 'Branch code is required';
    if (formData.phone && !/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(formData.phone)) {
      newErrors.phone = t('createShop.errors.invalidPhone');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 💰 Create default cash account for the shop
  const createDefaultCashAccount = async (shopId: string) => {
    const cashAccountId = generateEnhancedUUID();
    
    await database.get<CashAccount>('cash_accounts').create(record => {
      record._raw.id = cashAccountId;
      record.shopId = shopId;
      record.name = 'MAIN CASH ACCOUNT';
      record.type = 'cash';
      record.currentBalance = 0;
      record.openingBalance = 0;
      record.currency = formData.currency;
      record.isActive = true;
      record.isDefault = true;
      record.notes = 'Default cash account';
    });

    console.log('✅ Default cash account created for shop:', shopId);
  };

  // ✅ Handle CREATE or UPDATE
  const handleSaveShop = async () => {
    if (!validateForm()) return;
    if (!user) {
      setErrorMessage(t('createShop.errors.userNotFound'));
      setShowErrorDialog(true);
      return;
    }

    setLoading(true);

    try {
      await database.write(async () => {
        if (isEditMode && shopToDelete) {
          // 🔁 UPDATE existing shop & settings
          await shopToDelete.update(record => {
            record.name = formData.name.trim();
            record.location = formData.location.trim();
            record.phone = formData.phone.trim() || undefined;
            record.branchCode = formData.branchCode.trim() || undefined;
            record.updatedAt = new Date();
          });

          const settings = await database
            .get<Setting>('settings')
            .query(Q.where('shop_id', shopToDelete.id))
            .fetch();
          
          if (settings[0]) {
            await settings[0].update(record => {
              record.currency = formData.currency;
              record.language = formData.language;
              record.weekStartDay = formData.weekStartDay;
              record.updatedAt = new Date();
            });
          } else {
            // Create settings if they don't exist
            await database.get<Setting>('settings').create(record => {
              record.shopId = shopToDelete.id;
              record.language = formData.language;
              record.currency = formData.currency;
              record.weekStartDay = formData.weekStartDay;
              record.backupEnabled = true;
              record.smsAlertsEnabled = true;
              record.autoBackupWifiOnly = true;
              record.createdAt = new Date();
              record.updatedAt = new Date();
            });
          }

          setShowSuccessDialog(true);
          setDialogAction({
            onConfirm: () => {
              setShowSuccessDialog(false);
              router.back();
            }
          });
        } else {
          // ➕ CREATE new shop
          const shopId = generateEnhancedUUID();
          const branchCode = formData.branchCode.trim() || generateBranchCode(formData.name);

          const shop = await database.get<Shop>('shops').create(record => {
            record._raw.id = shopId;
            record.name = formData.name.trim();
            record.ownerId = user.id;
            record.location = formData.location.trim();
            record.phone = formData.phone.trim() || undefined;
            record.branchCode = branchCode;
          });

          // Create default settings
          await database.get<Setting>('settings').create(record => {
            record.shopId = shop.id;
            record.language = formData.language;
            record.currency = formData.currency;
            record.weekStartDay = formData.weekStartDay;
            record.backupEnabled = true;
            record.smsAlertsEnabled = true;
            record.autoBackupWifiOnly = true;
          });

          // Create owner membership
          await database.get<Membership>('memberships').create(record => {
            record.userId = user.id;
            record.shopId = shop.id;
            record.role = 'owner';
            record.status = 'active';
            record.joinedAt = Date.now();
          });

          // 💰 Create default cash account
          await createDefaultCashAccount(shop.id);

          switchShop(shop.id);
          
          setShowSuccessDialog(true);
          setDialogAction({
            onConfirm: () => {
              setShowSuccessDialog(false);
              setShowSeedModal(true);
            }
          });
        }
      });
    } catch (error) {
      console.error('Error saving shop:', error);
      setErrorMessage(
        isEditMode 
          ? t('createShop.errors.updateFailed') 
          : t('createShop.errors.creationFailed')
      );
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ Delete shop (with confirmation) - Only for owners
  const handleDeleteShop = () => {
    if (!shopToDelete || shopToDelete.ownerId !== user?.id) {
      setErrorMessage(t('createShop.errors.deleteNotAllowed'));
      setShowErrorDialog(true);
      return;
    }

    setShowLocationDialog(true);
    setDialogAction({
      onConfirm: confirmDeleteShop
    });
  };

  const confirmDeleteShop = async () => {
    if (!shopToDelete || shopToDelete.ownerId !== user?.id) return;
    
    setLoading(true);
    try {
      await database.write(async () => {
        // Delete related data first
        const settings = await database.get<Setting>('settings')
          .query(Q.where('shop_id', shopToDelete.id))
          .fetch();
        
        const memberships = await database.get<Membership>('memberships')
          .query(Q.where('shop_id', shopToDelete.id))
          .fetch();

        const products = await database.get('products')
          .query(Q.where('shop_id', shopToDelete.id))
          .fetch();

        const stockMovements = await database.get('stock_movements')
          .query(Q.where('shop_id', shopToDelete.id))
          .fetch();

        const contacts = await database.get('contacts')
          .query(Q.where('shop_id', shopToDelete.id))
          .fetch();

        const cashAccounts = await database.get<CashAccount>('cash_accounts')
          .query(Q.where('shop_id', shopToDelete.id))
          .fetch();

        console.log({
          "Deleting Found settings: ": settings.length,
          "Deleting Found memberships: ": memberships.length,
          "Deleting Found products: ": products.length,
          "Deleting Found stockMovements: ": stockMovements.length,
          "Deleting Found contacts: ": contacts.length,
          "Deleting Found cashAccounts: ": cashAccounts.length
        });

        // Delete all related records
        await Promise.all([
          ...settings.map(s => s.destroyPermanently()),
          ...memberships.map(m => m.destroyPermanently()),
          ...products.map(p => p.destroyPermanently()),
          ...stockMovements.map(m => m.destroyPermanently()),
          ...contacts.map(c => c.destroyPermanently()),
          ...cashAccounts.map(c => c.destroyPermanently()),
          shopToDelete.destroyPermanently(),
        ]);
      });

      await removeShop();
      await AsyncStorage.removeItem('@magasin_current_shop');
      await AsyncStorage.removeItem('@magasin_has_seeds');
      
      setShowSuccessDialog(true);
      setDialogAction({
        onConfirm: () => {
          setShowSuccessDialog(false);
          router.push('/(tabs)');
        }
      });
      
    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage(t('createShop.errors.deleteFailed'));
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (loading && !isEditMode && !id) {
    return (
      <View className="flex-1 bg-surface dark:bg-dark-surface">
        <PremiumHeader title={t('createShop.title')} showBackButton={true} />
        <Loading text={t('createShop.creatingShop')} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft py-2">
      <PremiumHeader
        title={isEditMode ? t('createShop.editTitle') : t('createShop.title')}
        showBackButton={true}
        showProfile={true}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: isEditMode ? 160 : 100 }}
        >
          <View className="p-4 mb-6">
            {/* Welcome Card with Quick Actions */}
            {!isEditMode && (
              <Card className="mb-6 bg-brand/5 border-brand/20">
                <CardContent className="p-4">
                  <View className="flex-row items-start">
                    <Ionicons name="storefront-outline" size={24} color="#0ea5e9" className="mr-3 mt-1" />
                    <View className="flex-1">
                      <ThemedText variant="brand" size="lg" className="font-semibold mb-1">
                        {t('createShop.welcomeTitle')}
                      </ThemedText>
                      <ThemedText variant="muted">
                        {t('createShop.welcomeDescription')}
                      </ThemedText>
                      
                      {/* Quick Action Buttons */}
                      <View className="flex-row mt-3 gap-2">
                        <TouchableOpacity
                          onPress={suggestShopName}
                          className="flex-row items-center bg-surface-soft dark:bg-dark-surface-soft px-3 py-2 rounded-lg"
                        >
                          <Ionicons name="bulb-outline" size={16} color="#0ea5e9" />
                          <ThemedText variant="brand" size="xs" className="ml-1">
                            Suggest Name
                          </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                          //onPress={getCurrentLocation}
                          disabled={isGettingLocation}
                          className="flex-row items-center bg-surface-soft dark:bg-dark-surface-soft px-3 py-2 rounded-lg"
                        >
                          <Ionicons 
                            name={isGettingLocation ? "locate" : "location-outline"} 
                            size={16} 
                            color="#0ea5e9" 
                          />
                          <ThemedText variant="brand" size="xs" className="ml-1">
                            {isGettingLocation ? 'Getting...' : 'Get Location'}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </CardContent>
              </Card>
            )}

            {/* Edit Mode Badge */}
            {isEditMode && (
              <Card className="mb-6 bg-warning/5 border-warning/20">
                <CardContent className="p-4">
                  <View className="flex-row items-center">
                    <Badge variant="warning" className="mr-3">
                      {t('createShop.editMode')}
                    </Badge>
                    <ThemedText variant="muted" size="sm">
                      {t('createShop.editDescription')}
                    </ThemedText>
                  </View>
                </CardContent>
              </Card>
            )}

            {/* Shop Information Form */}
            <Card className="mb-6">
              <CardHeader 
                title={t('createShop.shopInfo')}
                subtitle={t('createShop.shopInfoDescription')}
              />
              <CardContent className="space-y-4">
                <Input
                  label={t('createShop.shopName')}
                  placeholder={t('createShop.shopNamePlaceholder')}
                  value={formData.name}
                  onChangeText={(text) => {
                    updateFormData('name', text);
                  }}
                  error={errors.name}
                  autoFocus={!isEditMode}
                  rightIcon="bulb-outline"
                  onRightIconPress={suggestShopName}
                />

                <View>
                  <Input
                    label={t('createShop.location')}
                    placeholder={t('createShop.locationPlaceholder')}
                    value={formData.location}
                    onChangeText={(text) => updateFormData('location', text)}
                    error={errors.location}
                    rightIcon={isGettingLocation ? "locate" : "location-outline"}
                   // onRightIconPress={getCurrentLocation}
                    //rightIconDisabled={isGettingLocation}
                  />
                  {isGettingLocation && (
                    <ThemedText variant="muted" size="xs" className="mt-1">
                      Getting your current location...
                    </ThemedText>
                  )}
                </View>

                <Input
                  label={t('createShop.phone')}
                  placeholder={t('createShop.phonePlaceholder')}
                  value={formData.phone}
                  onChangeText={(text) => updateFormData('phone', text)}
                  error={errors.phone}
                  keyboardType="phone-pad"
                />

                <View>
                  <Input
                    label={t('createShop.branchCode')}
                    placeholder={t('createShop.branchCodePlaceholder')}
                    value={formData.branchCode}
                    onChangeText={(text) => updateFormData('branchCode', text)}
                    error={errors.branchCode}
                    rightIcon="refresh-outline"
                    onRightIconPress={generateCodeFromName}
                  />
                  <ThemedText variant="muted" size="xs" className="mt-1">
                    {formData.name 
                      ? `Suggested: ${generateBranchCode(formData.name)}` 
                      : 'Enter a name to get branch code suggestions'}
                  </ThemedText>
                </View>
              </CardContent>
            </Card>

            {/* Settings Card */}
            <Card className="mb-6">
              <CardHeader 
                title={t('createShop.settings')}
                subtitle={t('createShop.settingsDescription')}
              />
              <CardContent className="gap-4">
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <ThemedText variant="label" size="sm" className="mb-2">
                      {t('createShop.currency')}
                    </ThemedText>
                    <View className="flex-row border border-border rounded-base overflow-hidden">
                      {['BIF', 'USD', 'EUR'].map((currency) => (
                        <TouchableOpacity
                          key={currency}
                          onPress={() => updateFormData('currency', currency)}
                          className={`
                            flex-1 py-3 items-center justify-center
                            ${formData.currency === currency 
                              ? 'bg-brand border-brand' 
                              : 'bg-surface-soft border-border'}
                          `}
                        >
                          <ThemedText 
                            variant={formData.currency === currency ? "soft" : "label"}
                            size="sm"
                          >
                            {currency}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View className="flex-1">
                    <ThemedText variant="label" size="sm" className="mb-2">
                      {t('createShop.language')}
                    </ThemedText>
                    <View className="flex-row border border-border rounded-base overflow-hidden">
                      {[
                        { value: 'fr', label: 'Français' },
                        { value: 'en', label: 'English' },
                        { value: 'rn', label: 'Kirundi' }
                      ].map((lang) => (
                        <TouchableOpacity
                          key={lang.value}
                          onPress={() => updateFormData('language', lang.value)}
                          className={`
                            flex-1 py-3 items-center justify-center
                            ${formData.language === lang.value 
                              ? 'bg-brand border-brand' 
                              : 'bg-surface-soft border-border'}
                          `}
                        >
                          <ThemedText 
                            variant={formData.language === lang.value ? "soft" : "label"}
                            size="sm"
                            className="text-center"
                          >
                            {lang.label}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View>
                  <ThemedText variant="label" size="sm" className="mb-2">
                    {t('createShop.weekStart')}
                  </ThemedText>
                  <View className="flex-row border border-border rounded-base overflow-hidden">
                    {[
                      { value: 0, label: t('createShop.sunday') },
                      { value: 1, label: t('createShop.monday') }
                    ].map((day) => (
                      <TouchableOpacity
                        key={day.value}
                        onPress={() => updateFormData('weekStartDay', day.value.toString())}
                        className={`
                          flex-1 py-3 items-center justify-center
                          ${formData.weekStartDay === day.value 
                            ? 'bg-brand border-brand' 
                            : 'bg-surface-soft border-border'}
                        `}
                      >
                        <ThemedText 
                          variant={formData.weekStartDay === day.value ? "soft" : "label"}
                          size="sm"
                        >
                          {day.label}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Features Card - Only show for new shops */}
            {!isEditMode && (
              <Card className="mb-6">
                <CardHeader 
                  title={t('createShop.featuresTitle')}
                  subtitle={t('createShop.featuresDescription')}
                />
                <CardContent>
                  {[
                    { icon: '📦', text: t('createShop.feature1') },
                    { icon: '💰', text: t('createShop.feature2') },
                    { icon: '📊', text: t('createShop.feature3') },
                    { icon: '🌐', text: t('createShop.feature4') },
                  ].map((feature, index) => (
                    <View key={index} className="flex-row items-center mb-3 last:mb-0">
                      <ThemedText variant="muted" size="sm" className="flex-1">
                        {feature.text}
                      </ThemedText>
                    </View>
                  ))}
                </CardContent>
              </Card>
            )}
          </View>
        </ScrollView>

        {showSeedModal && (
          <SeedModal
            visible={showSeedModal}
            onClose={() => setShowSeedModal(false)}
          />
        )}

        {/* Fixed Action Buttons */}
        <View className="absolute bottom-0 left-0 right-0 p-6 bg-surface dark:bg-dark-surface border-t border-border">
          {isEditMode ? (
            <View className="gap-3">
              <Button
                variant="default"
                size="lg"
                onPress={handleSaveShop}
                disabled={loading}
                className="shadow-button"
              >
                {loading ? t('common.saving') : t('createShop.updateButton')}
              </Button>

              {shopToDelete?.ownerId === user?.id && (
                <Button
                  variant="destructive"
                  size="lg"
                  onPress={handleDeleteShop}
                  disabled={loading}
                  iconPosition='left'
                  icon='trash'
                >
                  {loading ? t('common.deleting') : t('createShop.deleteButton')}
                </Button>
              )}
            </View>
          ) : (
            <Button
              variant="default"
              size="lg"
              onPress={handleSaveShop}
              disabled={loading || !formData.name.trim() || !formData.location.trim()}
              className="shadow-button"
            >
              {loading ? t('common.creating') : t('createShop.createButton')}
            </Button>
          )}

          <ThemedText variant="muted" size="sm" className="text-center mt-3">
            {t('createShop.termsNotice')}
          </ThemedText>
        </View>
      </KeyboardAvoidingView>

      {/* Location Permission Dialog */}
      <CustomDialog
        visible={showLocationDialog && !dialogAction.onConfirm}
        title="Location Permission"
        description="We need your location to auto-fill your shop address. Would you like to enable location access?"
        variant="info"
        icon="location-outline"
        showCancel={true}
        cancelLabel="Enter Manually"
        onCancel={() => setShowLocationDialog(false)}
        actions={[
          {
            label: 'Enable Location',
            variant: 'default',
            onPress: () => {
              setShowLocationDialog(false);
              //getCurrentLocation();
            },
          },
        ]}
        onClose={() => setShowLocationDialog(false)}
      />

      {/* Delete Confirmation Dialog */}
      <CustomDialog
        visible={showLocationDialog && dialogAction.onConfirm !== undefined}
        title={t('createShop.deleteTitle')}
        description={t('createShop.deleteConfirm')}
        variant="error"
        icon="trash-outline"
        showCancel={true}
        cancelLabel={t('common.cancel')}
        onCancel={() => {
          setShowLocationDialog(false);
          setDialogAction({});
        }}
        actions={[
          {
            label: t('common.delete'),
            variant: 'destructive',
            onPress: async () => {
              setShowLocationDialog(false);
              await dialogAction.onConfirm?.();
              setDialogAction({});
            },
          },
        ]}
        onClose={() => {
          setShowLocationDialog(false);
          setDialogAction({});
        }}
      />

      {/* Success Dialog */}
      <CustomDialog
        visible={showSuccessDialog}
        title={isEditMode ? t('common.success') : t('createShop.success.created')}
        description={isEditMode 
          ? t('createShop.success.updated') 
          : t('createShop.success.createdDescription')
        }
        variant="success"
        icon="checkmark-circle"
        showCancel={false}
        actions={[
          {
            label: 'OK',
            variant: 'default',
            onPress: () => {
              setShowSuccessDialog(false);
              dialogAction.onConfirm?.();
              setDialogAction({});
            },
          },
        ]}
        onClose={() => {
          setShowSuccessDialog(false);
          dialogAction.onConfirm?.();
          setDialogAction({});
        }}
      />

      {/* Error Dialog */}
      <CustomDialog
        visible={showErrorDialog}
        title={t('common.error')}
        description={errorMessage}
        variant="error"
        icon="alert-circle"
        showCancel={false}
        actions={[
          {
            label: 'OK',
            variant: 'default',
            onPress: () => {
              setShowErrorDialog(false);
              setErrorMessage('');
            },
          },
        ]}
        onClose={() => {
          setShowErrorDialog(false);
          setErrorMessage('');
        }}
      />
    </View>
  );
}