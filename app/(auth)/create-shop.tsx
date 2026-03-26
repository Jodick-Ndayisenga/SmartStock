// app/(auth)/create-shop.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import database from '@/database';
import { useTranslation } from 'react-i18next';
import { Q } from '@nozbe/watermelondb';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

// Components
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ThemedText, HeadingText, MutedText, CaptionText } from '@/components/ui/ThemedText';
import { Loading } from '@/components/ui/Loading';
import { Badge } from '@/components/ui/Badge';
import CustomDialog from '@/components/ui/CustomDialog';
import SeedModal from '@/components/SeedModal';

// Models
import { Shop } from '@/database/models/Shop';
import { Setting } from '@/database/models/Setting';
import { Membership } from '@/database/models/Membership';
import { CashAccount } from '@/database/models/CashAccount';
import { generateEnhancedUUID } from '@/utils/getModelId';

// Context
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const generateBranchCode = (shopName: string = ''): string => {
  const prefix = shopName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
  
  const validPrefix = prefix.length >= 2 ? prefix : 'SHO';
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
  return names[Math.floor(Math.random() * names.length)];
};

// Animated Option Selector Component
const OptionSelector = ({ options, value, onChange, label }: any) => {
  const [selectedIndex, setSelectedIndex] = useState(
    options.findIndex((opt: any) => opt.value === value)
  );

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    onChange(options[index].value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View>
      {label && (
        <ThemedText variant="label" size="sm" weight="medium" className="mb-2">
          {label}
        </ThemedText>
      )}
      <View className="flex-row gap-2">
        {options.map((option: any, index: number) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => handleSelect(index)}
            activeOpacity={0.7}
            className="flex-1"
          >
            <Animated.View
              style={{
                transform: [{
                  scale: selectedIndex === index ? 1.02 : 1
                }],
              }}
            >
              <LinearGradient
                colors={
                  selectedIndex === index
                    ? ['#0ea5e9', '#0284c7']
                    : ['#f1f5f9', '#e2e8f0']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 12 }}
                className="py-3 px-4 items-center justify-center"
              >
                <ThemedText
                  variant={selectedIndex === index ? "soft" : "muted"}
                  weight={selectedIndex === index ? "semibold" : "regular"}
                  className={selectedIndex === index ? "text-white" : ""}
                >
                  {option.label}
                </ThemedText>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description, delay }: any) => (
  <MotiView
    from={{ opacity: 0, translateX: -20 }}
    animate={{ opacity: 1, translateX: 0 }}
    transition={{ delay, type: 'spring' }}
    className="flex-row items-center mb-4"
  >
    <LinearGradient
      colors={['#0ea5e9', '#0284c7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 12 }}
      className="w-10 h-10 items-center justify-center mr-3"
    >
      <Ionicons name={icon} size={20} color="#fff" />
    </LinearGradient>
    <View className="flex-1">
      <ThemedText variant="default" size="base" weight="semibold">
        {title}
      </ThemedText>
      <CaptionText>{description}</CaptionText>
    </View>
  </MotiView>
);

// Stats Card for Edit Mode - Using elegant blue gradient
const EditStatsCard = ({ shop, onDelete }: any) => (
  <MotiView
    from={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: 'spring', delay: 200 }}
    className="mb-6"
  >
    <LinearGradient
      colors={['#1e293b', '#0f172a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 16 }}
      className="py-5 px-2"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Badge variant="info" className="bg-brand/20 self-start mb-2 border border-brand/30">
            <ThemedText variant="brand" size="xs" weight="medium">
              EDIT MODE
            </ThemedText>
          </Badge>
          <HeadingText size="lg" weight="bold" className="text-white">
            {shop?.name}
          </HeadingText>
          <MutedText className="text-white/70 mt-1">
            Branch: {shop?.branchCode}
          </MutedText>
          <MutedText className="text-white/50 text-xs mt-2">
            Created: {new Date(shop?.createdAt).toLocaleDateString()}
          </MutedText>
        </View>
        <TouchableOpacity
          onPress={onDelete}
          className="bg-red-500/20 p-2 rounded-lg border border-red-500/30"
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  </MotiView>
);

// Main Component
export default function CreateShopScreen() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId?: string }>();
  const { t } = useTranslation();
  const { user, switchShop, removeShop } = useAuth();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);
  
  // Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dialogAction, setDialogAction] = useState<{ onConfirm?: () => void }>({});

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    phone: '',
    branchCode: '',
    currency: 'BIF',
    language: 'fr',
    weekStartDay: 1,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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

  const suggestShopName = () => {
    if (user?.displayName) {
      const suggestion = generateShopNameSuggestion(user.displayName);
      setFormData(prev => ({ ...prev, name: suggestion }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  useEffect(() => {
    if (shopId) {
      loadShopForEdit(shopId);
    } else {
      setIsEditMode(false);
      setShopToDelete(null);
      
      const initialName = user?.displayName 
        ? generateShopNameSuggestion(user.displayName)
        : '';
      
      const initialCode = generateBranchCode(initialName);
      
      setFormData({
        name: initialName,
        location: '',
        phone: user?.phone || '',
        branchCode: initialCode,
        currency: 'BIF',
        language: 'fr',
        weekStartDay: 1,
      });
      setInitialLoading(false);
    }
  }, [shopId, user]);

  const loadShopForEdit = async (shopId: string) => {
    try {
      setInitialLoading(true);
      const shop = await database.get<Shop>('shops').find(shopId);
      
      const settings = await database
        .get<Setting>('settings')
        .query(Q.where('shop_id', shopId))
        .fetch();

      setIsEditMode(true);
      setShopToDelete(shop);

      const setting = settings[0];
      setFormData({
        name: shop.name,
        location: shop.location || '',
        phone: shop.phone || '',
        branchCode: shop.branchCode || '',
        currency: setting?.currency || 'BIF',
        language: setting?.language || 'fr',
        weekStartDay: setting?.weekStartDay ?? 1,
      });
    } catch (error) {
      console.error('Failed to load shop:', error);
      setErrorMessage('Failed to load shop');
      setShowErrorDialog(true);
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = 'Shop name is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.branchCode.trim()) newErrors.branchCode = 'Branch code is required';
    if (formData.phone && !/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
  };

  const handleSaveShop = async () => {
    if (!validateForm()) return;
    if (!user) {
      setErrorMessage('User not found');
      setShowErrorDialog(true);
      return;
    }

    setLoading(true);

    try {
      await database.write(async () => {
        if (isEditMode && shopToDelete) {
          // UPDATE existing shop
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
          }

          setShowSuccessDialog(true);
          setDialogAction({
            onConfirm: () => {
              setShowSuccessDialog(false);
              router.back();
            }
          });
        } else {
          // CREATE new shop
          const shopId = generateEnhancedUUID();
          const branchCode = formData.branchCode.trim() || generateBranchCode(formData.name);

          const shop = await database.get<Shop>('shops').create(record => {
            record._raw.id = shopId;
            record.name = formData.name.trim();
            record.ownerId = user.id;
            record.location = formData.location.trim();
            record.phone = formData.phone.trim() || undefined;
            record.branchCode = branchCode;
            record.createdAt = new Date();
            record.updatedAt = new Date();
          });

          await database.get<Setting>('settings').create(record => {
            record.shopId = shop.id;
            record.language = formData.language;
            record.currency = formData.currency;
            record.weekStartDay = formData.weekStartDay;
            record.backupEnabled = true;
            record.smsAlertsEnabled = true;
            record.autoBackupWifiOnly = true;
            record.createdAt = new Date();
            record.updatedAt = new Date();
          });

          await database.get<Membership>('memberships').create(record => {
            record.userId = user.id;
            record.shopId = shop.id;
            record.role = 'owner';
            record.status = 'active';
            record.joinedAt = Date.now();
            record.createdAt = new Date();
            record.updatedAt = new Date();
          });

          await createDefaultCashAccount(shop.id);
          await switchShop(shop.id);
          
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
        isEditMode ? 'Failed to update shop' : 'Failed to create shop'
      );
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShop = () => {
    if (!shopToDelete || shopToDelete.ownerId !== user?.id) {
      setErrorMessage('You don\'t have permission to delete this shop');
      setShowErrorDialog(true);
      return;
    }
    setShowDeleteDialog(true);
  };

  const confirmDeleteShop = async () => {
    if (!shopToDelete || shopToDelete.ownerId !== user?.id) return;
    
    setLoading(true);
    try {
      await database.write(async () => {
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
      setErrorMessage('Failed to delete shop');
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const updateFormData = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (initialLoading) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <Loading text={isEditMode ? "Loading shop..." : "Setting up..."} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      {/* Animated Header - Unified blue theme with subtle difference */}
      <LinearGradient
        colors={isEditMode ? ['#0f172a', '#1e293b'] : ['#0ea5e9', '#0284c7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-12 pb-6 px-2"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mb-4"
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <HeadingText size="3xl" weight="bold" className="text-white mb-1">
            {isEditMode ? 'Edit Shop' : 'Create New Shop'}
          </HeadingText>
          <MutedText className="text-white/80">
            {isEditMode 
              ? 'Update your shop information and preferences' 
              : 'Set up your business location and preferences'}
          </MutedText>
        </Animated.View>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 180 }}
        >
          <View className="py-4 px-2">
            {/* Edit Mode Stats Card */}
            {isEditMode && shopToDelete && (
              <EditStatsCard 
                shop={shopToDelete} 
                onDelete={handleDeleteShop}
              />
            )}

            {/* Welcome Card - Only for Create Mode */}
            {!isEditMode && (
              <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', delay: 200 }}
                className="mb-6"
              >
                <LinearGradient
                  colors={['rgba(14,165,233,0.1)', 'rgba(14,165,233,0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 16 }}
                  className="py-5 px-2"
                >
                  <View className="flex-row items-start">
                    <LinearGradient
                      colors={['#0ea5e9', '#0284c7']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ borderRadius: 12 }}
                      className="w-12 h-12 items-center justify-center mr-4"
                    >
                      <Ionicons name="rocket-outline" size={24} color="#fff" />
                    </LinearGradient>
                    <View className="flex-1">
                      <HeadingText size="base" weight="semibold" className="mb-1">
                        Welcome to SmartStock!
                      </HeadingText>
                      <MutedText size="sm">
                        Let's set up your shop. We'll help you get started quickly.
                      </MutedText>
                      
                      <View className="flex-row mt-4 gap-2">
                        <TouchableOpacity
                          onPress={suggestShopName}
                          className="flex-row items-center bg-surface dark:bg-dark-surface px-3 py-2 rounded-lg"
                        >
                          <Ionicons name="bulb-outline" size={16} color="#0ea5e9" />
                          <ThemedText variant="brand" size="xs" className="ml-1">
                            Suggest Name
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </MotiView>
            )}

            {/* Main Form Card */}
            <MotiView
              from={{ opacity: 0, translateY: 30 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: isEditMode ? 300 : 300 }}
            >
              <Card variant="elevated" className="mb-6">
                <CardHeader 
                  title={isEditMode ? "Shop Information" : "Basic Information"}
                  subtitle={isEditMode 
                    ? "Update your shop details" 
                    : "Tell us about your business"}
                />
                <CardContent className="gap-4">
                  <Input
                    label="Shop Name"
                    placeholder="Enter your shop name"
                    value={formData.name}
                    onChangeText={(text) => updateFormData('name', text)}
                    error={errors.name}
                    autoFocus={!isEditMode}
                    rightIcon={!isEditMode ? "bulb-outline" : undefined}
                    onRightIconPress={!isEditMode ? suggestShopName : undefined}
                  />

                  <Input
                    label="Location"
                    placeholder="Enter shop address"
                    value={formData.location}
                    onChangeText={(text) => updateFormData('location', text)}
                    error={errors.location}
                    rightIcon="location-outline"
                  />

                  <Input
                    label="Phone Number"
                    placeholder="Enter contact number"
                    value={formData.phone}
                    onChangeText={(text) => updateFormData('phone', text)}
                    error={errors.phone}
                    keyboardType="phone-pad"
                  />

                  <View>
                    <Input
                      label="Branch Code"
                      placeholder="Unique branch identifier"
                      value={formData.branchCode}
                      onChangeText={(text) => updateFormData('branchCode', text)}
                      error={errors.branchCode}
                      rightIcon="refresh-outline"
                      onRightIconPress={generateCodeFromName}
                    />
                    {!isEditMode && formData.name && (
                      <CaptionText className="mt-1">
                        Suggested: {generateBranchCode(formData.name)}
                      </CaptionText>
                    )}
                  </View>
                </CardContent>
              </Card>
            </MotiView>

            {/* Settings Card */}
            <MotiView
              from={{ opacity: 0, translateY: 30 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: isEditMode ? 400 : 400 }}
            >
              <Card variant="elevated" className="mb-6">
                <CardHeader 
                  title="Preferences"
                  subtitle="Customize your shop settings"
                />
                <CardContent className="gap-5">
                  <OptionSelector
                    label="Currency"
                    options={[
                      { value: 'BIF', label: 'BIF (₣)' },
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'EUR', label: 'EUR (€)' }
                    ]}
                    value={formData.currency}
                    onChange={(value: string) => updateFormData('currency', value)}
                  />

                  <OptionSelector
                    label="Language"
                    options={[
                      { value: 'fr', label: 'Français' },
                      { value: 'en', label: 'English' },
                      { value: 'rn', label: 'Kirundi' }
                    ]}
                    value={formData.language}
                    onChange={(value: string) => updateFormData('language', value)}
                  />

                  <OptionSelector
                    label="Week Start Day"
                    options={[
                      { value: 0, label: 'Sunday' },
                      { value: 1, label: 'Monday' }
                    ]}
                    value={formData.weekStartDay}
                    onChange={(value: number) => updateFormData('weekStartDay', value)}
                  />
                </CardContent>
              </Card>
            </MotiView>

            {/* Features Card - Only for Create Mode */}
            {!isEditMode && (
              <MotiView
                from={{ opacity: 0, translateY: 30 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 500 }}
              >
                <Card variant="elevated">
                  <CardHeader 
                    title="What You'll Get"
                    subtitle="Everything you need to manage your business"
                  />
                  <CardContent>
                    <FeatureCard
                      icon="cube-outline"
                      title="Inventory Management"
                      description="Track stock levels, set alerts, and manage products"
                      delay={600}
                    />
                    <FeatureCard
                      icon="cash-outline"
                      title="Sales & Transactions"
                      description="Record sales, track revenue, and manage payments"
                      delay={650}
                    />
                    <FeatureCard
                      icon="people-outline"
                      title="Staff Management"
                      description="Add team members and manage permissions"
                      delay={700}
                    />
                    <FeatureCard
                      icon="bar-chart-outline"
                      title="Analytics & Reports"
                      description="Get insights into your business performance"
                      delay={750}
                    />
                  </CardContent>
                </Card>
              </MotiView>
            )}
          </View>
        </ScrollView>

        {/* Fixed Action Buttons */}
        <Animated.View
          style={{
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            }],
          }}
          className="absolute bottom-0 left-0 right-0 p-6 bg-surface dark:bg-dark-surface border-t border-border"
        >
          {isEditMode ? (
            <View className="gap-3">
              <Button
                variant="default"
                size="lg"
                onPress={handleSaveShop}
                loading={loading}
                icon="save-outline"
              >
                Update Shop
              </Button>

              {shopToDelete?.ownerId === user?.id && (
                <Button
                  variant="destructive"
                  size="lg"
                  onPress={handleDeleteShop}
                  disabled={loading}
                  icon="trash-outline"
                >
                  Delete Shop
                </Button>
              )}
            </View>
          ) : (
            <Button
              variant="default"
              size="lg"
              onPress={handleSaveShop}
              loading={loading}
              disabled={!formData.name.trim() || !formData.location.trim()}
              icon="checkmark-circle-outline"
            >
              Create Shop
            </Button>
          )}
          
          <CaptionText align="center" className="mt-3">
            {isEditMode 
              ? 'Changes will be saved immediately' 
              : 'By creating a shop, you agree to our Terms of Service'}
          </CaptionText>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Modals */}
      {showSeedModal && (
        <SeedModal
          visible={showSeedModal}
          onClose={() => setShowSeedModal(false)}
        />
      )}

      <CustomDialog
        visible={showSuccessDialog}
        title={isEditMode ? "Success!" : "Shop Created!"}
        description={isEditMode 
          ? "Your shop has been updated successfully" 
          : "Your shop has been created! Let's add some products to get started."
        }
        variant="success"
        icon="checkmark-circle"
        actions={[
          {
            label: 'Continue',
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

      <CustomDialog
        visible={showErrorDialog}
        title="Oops!"
        description={errorMessage}
        variant="error"
        icon="alert-circle"
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

      <CustomDialog
        visible={showDeleteDialog}
        title="Delete Shop?"
        description="Are you sure you want to delete this shop? This action cannot be undone and will remove all associated data including products, transactions, and staff members."
        variant="error"
        icon="trash-outline"
        showCancel={true}
        cancelLabel="Cancel"
        onCancel={() => setShowDeleteDialog(false)}
        actions={[
          {
            label: 'Delete Permanently',
            variant: 'destructive',
            onPress: confirmDeleteShop,
          },
        ]}
        onClose={() => setShowDeleteDialog(false)}
      />
    </View>
  );
}