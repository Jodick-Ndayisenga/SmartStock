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
// add these imports (near other imports)
//import { seedShopProducts } from '@/utils/dbSeeds';
import SeedModal from '@/components/SeedModal';


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
import { generateEnhancedUUID } from '@/utils/getModelId';

// Context
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CreateShopScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const { user,   switchShop, removeShop } = useAuth();

  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    phone: '',
    branchCode: '',
    currency: 'BIF',
    language: 'fr',
    weekStartDay: 1, // Monday
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  // seeding state
const [showSeedModal, setShowSeedModal] = useState(false);


  // 🔍 Load shop if editing
  useEffect(() => {
    if (id) {
      loadShopForEdit(id);
    } else {
      setIsEditMode(false);
      setShopToDelete(null);
      // Reset form for create mode
      setFormData({
        name: '',
        location: '',
        phone: '',
        branchCode: '',
        currency: 'BIF',
        language: 'fr',
        weekStartDay: 1,
      });
    }
  }, [id]);

  const loadShopForEdit = async (shopId: string) => {
    try {
      setLoading(true);
      const shop = await database.get<Shop>('shops').find(shopId);
      
      // Extract the raw data from the shop model
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
      Alert.alert(t('common.error'), t('createShop.errors.shopNotFound'));
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = t('createShop.errors.shopNameRequired');
    if (!formData.location.trim()) newErrors.location = t('createShop.errors.locationRequired');
    if (formData.phone && !/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(formData.phone)) {
      newErrors.phone = t('createShop.errors.invalidPhone');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Handle CREATE or UPDATE
  const handleSaveShop = async () => {
    if (!validateForm()) return;
    if (!user) {
      Alert.alert(t('common.error'), t('createShop.errors.userNotFound'));
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

          Alert.alert(t('common.success'), t('createShop.success.updated'));
          router.back();
        } else {
          // ➕ CREATE new shop
          const shopId = generateEnhancedUUID();
          const branchCode = formData.branchCode.trim() || `SHOP${Date.now().toString().slice(-6)}`;

          const shop = await database.get<Shop>('shops').create(record => {
            record.shopId = shopId;
            record.name = formData.name.trim();
            record.shopId = shopId;
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

          //setCurrentShop(shop);
          switchShop(shop.id);

         
          setShowSeedModal(true);
        }
      });
    } catch (error) {
      console.error('Error saving shop:', error);
      Alert.alert(
        t('common.error'), 
        isEditMode ? t('createShop.errors.updateFailed') : t('createShop.errors.creationFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ Delete shop (with confirmation) - Only for owners
  const handleDeleteShop = () => {
    if (!shopToDelete || shopToDelete.ownerId !== user?.id) {
      Alert.alert(t('common.error'), t('createShop.errors.deleteNotAllowed'));
      return;
    }

    Alert.alert(
      t('createShop.deleteTitle'),
      t('createShop.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: confirmDeleteShop,
        },
      ]
    );
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


        console.log({
          "Deleting Found settings: ": settings.length,
          "Deleting Found memberships: ": memberships.length,
          "Deleting Found products: ": products.length,
          "Deleting Found stockMovements: ": stockMovements.length,
          "Deleting Found contacts: ": contacts.length
        })

        // Delete all related records
        await Promise.all([
          ...settings.map(s => s.destroyPermanently()),
          ...memberships.map(m => m.destroyPermanently()),
          ...products.map(p => p.destroyPermanently()),
          ...stockMovements.map(m => m.destroyPermanently()),
          ...contacts.map(c => c.destroyPermanently()),
          shopToDelete.destroyPermanently(),
        ]);
      });
      //setCurrentShop(null);


      await removeShop();

      await AsyncStorage.removeItem('@magasin_current_shop');
      await AsyncStorage.removeItem('@magasin_has_seeds');
      
      //Alert.alert(t('common.success'), t('createShop.success.deleted'));
      
      
      // If we deleted the current shop, navigate to shop list
      router.push('/(tabs)');
      
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert(t('common.error'), t('createShop.errors.deleteFailed'));
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
            {/* Welcome Card */}
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
                  onChangeText={(text) => updateFormData('name', text)}
                  error={errors.name}
                  autoFocus={!isEditMode}
                />

                <Input
                  label={t('createShop.location')}
                  placeholder={t('createShop.locationPlaceholder')}
                  value={formData.location}
                  onChangeText={(text) => updateFormData('location', text)}
                  error={errors.location}
                />

                <Input
                  label={t('createShop.phone')}
                  placeholder={t('createShop.phonePlaceholder')}
                  value={formData.phone}
                  onChangeText={(text) => updateFormData('phone', text)}
                  error={errors.phone}
                  keyboardType="phone-pad"
                />

                <Input
                  label={t('createShop.branchCode')}
                  placeholder={t('createShop.branchCodePlaceholder')}
                  value={formData.branchCode}
                  onChangeText={(text) => updateFormData('branchCode', text)}
                />
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
                            className="text-error"
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
                      {/* <Text className="text-lg mr-3">{feature.icon}</Text> */}
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

       {
        showSeedModal && (
           <SeedModal
          visible={showSeedModal}
          //progress={seedProgress}
          onClose={() => setShowSeedModal(false)}
          
        />
        )
       }


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
    </View>
  );
}