// app/(auth)/create-shop.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import CustomDialog from '@/components/ui/CustomDialog';

// Models
import { Shop } from '@/database/models/Shop';
import { Setting } from '@/database/models/Setting';
import { Membership } from '@/database/models/Membership';
import { CashAccount } from '@/database/models/CashAccount';
import { generateEnhancedUUID } from '@/utils/getModelId';

// Context
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../providers/ThemeProvider';
import Transaction from '@/database/models/Transaction';
import { AccountTransaction } from '@/database/models/AccountTransaction';
import { Payment } from '@/database/models/Payment';
import { Product } from '@/database/models/Product';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const generateBranchCode = (shopName = ''): string => {
  const prefix = shopName.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  const validPrefix = prefix.length >= 2 ? prefix : 'SHO';
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${validPrefix}-${timestamp}${random}`;
};

const generateShopNameSuggestion = (userName = ''): string => {
  const first = userName.split(' ')[0];
  const names = [
    `${first}'s Store`, `${first} Enterprise`, `${first} Shop`,
    'My Business', 'Local Store', 'Community Shop',
  ];
  return names[Math.floor(Math.random() * names.length)];
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const SectionLabel = ({ children }: { children: string }) => (
  <Text className="text-text-muted dark:text-dark-text-muted text-xs font-semibold uppercase tracking-widest mb-3">
    {children}
  </Text>
);

const OptionPill = ({
  label,
  selected,
  onPress,
  isDark,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  isDark: boolean;
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75} className="flex-1">
    {selected ? (
      <LinearGradient
        colors={isDark ? ['#38bdf8', '#0ea5e9'] : ['#0ea5e9', '#0284c7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
      >
        <Text className="text-white font-semibold text-sm">{label}</Text>
      </LinearGradient>
    ) : (
      <View
        className="py-2.5 items-center rounded-[10px] bg-surface-muted dark:bg-dark-surface-muted border border-border dark:border-dark-border"
      >
        <Text className="text-text-soft dark:text-dark-text-soft text-sm">{label}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const OptionSelector = ({
  options,
  value,
  onChange,
  label,
  isDark,
}: {
  options: { value: string | number; label: string }[];
  value: string | number;
  onChange: (v: any) => void;
  label?: string;
  isDark: boolean;
}) => (
  <View>
    {label && <SectionLabel>{label}</SectionLabel>}
    <View className="flex-row gap-2">
      {options.map((opt) => (
        <OptionPill
          key={String(opt.value)}
          label={opt.label}
          selected={opt.value === value}
          isDark={isDark}
          onPress={() => {
            onChange(opt.value);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />
      ))}
    </View>
  </View>
);

const FeatureRow = ({
  icon,
  title,
  description,
  delay,
  isDark,
}: {
  icon: string;
  title: string;
  description: string;
  delay: number;
  isDark: boolean;
}) => (
  <MotiView
    from={{ opacity: 0, translateX: -16 }}
    animate={{ opacity: 1, translateX: 0 }}
    transition={{ delay, type: 'spring', damping: 18 }}
    className="flex-row items-center mb-4"
  >
    <LinearGradient
      colors={isDark ? ['#38bdf8', '#0ea5e9'] : ['#0ea5e9', '#0284c7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
    >
      <Ionicons name={icon as any} size={18} color="#fff" />
    </LinearGradient>
    <View className="flex-1">
      <Text className="text-text dark:text-dark-text font-semibold text-sm">{title}</Text>
      <Text className="text-text-muted dark:text-dark-text-muted text-xs mt-0.5">{description}</Text>
    </View>
  </MotiView>
);

// Divider with label
const Divider = ({ label }: { label: string }) => (
  <View className="flex-row items-center gap-3 my-2">
    <View className="flex-1 h-px bg-border dark:bg-dark-border" />
    <Text className="text-text-muted dark:text-dark-text-muted text-xs uppercase tracking-widest">{label}</Text>
    <View className="flex-1 h-px bg-border dark:bg-dark-border" />
  </View>
);

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────

export default function CreateShopScreen() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId?: string }>();
  const { user, switchShop, removeShop, clearInvalidSession, logout } = useAuth();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [shopToEdit, setShopToEdit] = useState<Shop | null>(null);


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
  const footerAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(footerAnim, { toValue: 0, damping: 16, mass: 1, stiffness: 120, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (shopId) {
      loadShopForEdit(shopId);
    } else {
      setIsEditMode(false);
      setShopToEdit(null);
      const initialName = user?.displayName ? generateShopNameSuggestion(user.displayName) : '';
      setFormData({
        name: initialName,
        location: '',
        phone: user?.phone || '',
        branchCode: generateBranchCode(initialName),
        currency: 'BIF',
        language: 'fr',
        weekStartDay: 1,
      });
      setInitialLoading(false);
    }
  }, [shopId, user]);

  const loadShopForEdit = async (id: string) => {
    try {
      setInitialLoading(true);
      const shop = await database.get<Shop>('shops').find(id);
      const settings = await database.get<Setting>('settings').query(Q.where('shop_id', id)).fetch();
      const setting = settings[0];

      setIsEditMode(true);
      setShopToEdit(shop);
      setFormData({
        name: shop.name,
        location: shop.location || '',
        phone: shop.phone || '',
        branchCode: shop.branchCode || '',
        currency: setting?.currency || 'BIF',
        language: setting?.language || 'fr',
        weekStartDay: setting?.weekStartDay ?? 1,
      });
    } catch {
      setErrorMessage('Failed to load shop');
      setShowErrorDialog(true);
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const updateField = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: { [k: string]: string } = {};
    if (!formData.name.trim()) e.name = 'Shop name is required';
    if (!formData.location.trim()) e.location = 'Location is required';
    if (!formData.branchCode.trim()) e.branchCode = 'Branch code is required';
    if (formData.phone && !/^[+\d\s\-().]+$/.test(formData.phone)) e.phone = 'Invalid phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const regenerateCode = () => {
    if (!formData.name.trim()) {
      setErrorMessage('Enter a shop name first to generate a branch code');
      setShowErrorDialog(true);
      return;
    }
    updateField('branchCode', generateBranchCode(formData.name));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const suggestName = () => {
    if (user?.displayName) {
      const name = generateShopNameSuggestion(user.displayName);
      updateField('name', name);
      updateField('branchCode', generateBranchCode(name));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSave = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!user) { setErrorMessage('User not found'); setShowErrorDialog(true); return; }

    setLoading(true);
    try {
      await database.write(async () => {
        if (isEditMode && shopToEdit) {
          await shopToEdit.update(r => {
            r.name = formData.name.trim();
            r.location = formData.location.trim();
            r.phone = formData.phone.trim() || undefined;
            r.branchCode = formData.branchCode.trim() || undefined;
          });
          const settings = await database.get<Setting>('settings').query(Q.where('shop_id', shopToEdit.id)).fetch();
          if (settings[0]) {
            await settings[0].update(r => {
              r.currency = formData.currency;
              r.language = formData.language;
              r.weekStartDay = formData.weekStartDay;
            });
          }
          setDialogAction({ onConfirm: () => { setShowSuccessDialog(false); router.back(); } });
        } else {
          const shopId = generateEnhancedUUID();
          const branchCode = formData.branchCode.trim() || generateBranchCode(formData.name);
          const shop = await database.get<Shop>('shops').create(r => {
            r._raw.id = shopId;
            r.name = formData.name.trim();
            r.ownerId = user.id;
            r.location = formData.location.trim();
            r.phone = formData.phone.trim() || undefined;
            r.branchCode = branchCode;
          });
          await database.get<Setting>('settings').create(r => {
            r.shopId = shop.id;
            r.language = formData.language;
            r.currency = formData.currency;
            r.weekStartDay = formData.weekStartDay;
            r.backupEnabled = true;
            r.smsAlertsEnabled = true;
            r.autoBackupWifiOnly = true;
          });
          await database.get<Membership>('memberships').create(r => {
            r.userId = user.id;
            r.shopId = shop.id;
            r.role = 'owner';
            r.status = 'active';
            r.joinedAt = Date.now();
          });
          const cashId = generateEnhancedUUID();
          await database.get<CashAccount>('cash_accounts').create(r => {
            r._raw.id = cashId;
            r.shopId = shop.id;
            r.name = 'MAIN CASH ACCOUNT';
            r.type = 'cash';
            r.currentBalance = 0;
            r.openingBalance = 0;
            r.currency = formData.currency;
            r.isActive = true;
            r.isDefault = true;
          });
          await switchShop(shop.id);
          setDialogAction({ onConfirm: () => { setShowSuccessDialog(false)} });
        }
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessDialog(true);
    } catch {
      setErrorMessage(isEditMode ? 'Failed to update shop' : 'Failed to create shop');
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!shopToEdit || shopToEdit.ownerId !== user?.id) {
      setErrorMessage("You don't have permission to delete this shop");
      setShowErrorDialog(true);
      return;
    }
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!shopToEdit || shopToEdit.ownerId !== user?.id) return;

    setLoading(true);

    try {
      await database.write(async () => {
        const settings = await database.get<Setting>('settings').query(Q.where('shop_id', shopToEdit.id)).fetch();
        const memberships = await database.get<Membership>('memberships').query(Q.where('shop_id', shopToEdit.id)).fetch();
        const products = await database.get('products').query(Q.where('shop_id', shopToEdit.id)).fetch();
        const stockMovements = await database.get('stock_movements').query(Q.where('shop_id', shopToEdit.id)).fetch();
        const contacts = await database.get('contacts').query(Q.where('shop_id', shopToEdit.id)).fetch();
        const cashAccounts = await database.get<CashAccount>('cash_accounts').query(Q.where('shop_id', shopToEdit.id)).fetch();
        const transactions = await database.get<Transaction>('transactions').query(Q.where('shop_id', shopToEdit.id)).fetch();
        const accountTransactions = await database.get<AccountTransaction>('account_transactions').query(Q.where('shop_id', shopToEdit.id)).fetch();
        const payments = await database.get<Payment>('payments').query(Q.where('shop_id', shopToEdit.id)).fetch();

        await database.batch(
          ...settings.map(s => s.prepareDestroyPermanently()),
          ...memberships.map(m => m.prepareDestroyPermanently()),
          ...products.map(p => p.prepareDestroyPermanently()),
          ...stockMovements.map(m => m.prepareDestroyPermanently()),
          ...contacts.map(c => c.prepareDestroyPermanently()),
          ...cashAccounts.map(c => c.prepareDestroyPermanently()),
          ...transactions.map(t => t.prepareDestroyPermanently()),
          ...accountTransactions.map(t => t.prepareDestroyPermanently()),
          ...payments.map(p => p.prepareDestroyPermanently()),
          shopToEdit.prepareDestroyPermanently(),
        );
      });

      await removeShop();
      await AsyncStorage.removeItem('@magasin_current_shop');
      await AsyncStorage.removeItem('@magasin_has_seeds');

      setDialogAction({
        onConfirm: () => {
          setShowSuccessDialog(false);
          router.push('/(tabs)');
        }
      });

      setShowSuccessDialog(true);

      await clearInvalidSession();
      await logout();

    } catch {
      setErrorMessage('Failed to delete shop');
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  if (initialLoading) {
    return (
      <View className="flex-1 bg-surface dark:bg-dark-surface items-center justify-center">
        <Loading text={isEditMode ? 'Loading shop...' : 'Setting up...'} />
      </View>
    );
  }

  // ─── Derived ──────────────────────────────
  const isOwner = shopToEdit?.ownerId === user?.id;
  const canSave = formData.name.trim().length > 0 && formData.location.trim().length > 0;

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'}`}>

      {/* Background gradient */}
      <LinearGradient
        colors={isDark ? ['#0f172a', '#1e1b4b', '#0f172a'] : ['#f8fafc', '#e0f2fe', '#f8fafc']}
        className="absolute inset-0"
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 160 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim }}>

           <View className="px-4 pt-4 pb-8">
  
            {/* Top row */}
            <View className="flex-row items-center justify-between gap-4">
              
              {/* Left */}
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-surface-muted items-center justify-center"
              >
                <Ionicons name="arrow-back" size={20} />
              </TouchableOpacity>

              {/* Center */}
              <View className="flex-row items-center gap-4 flex-1 mx-3">
                <View className="flex-shrink">
                  <MotiText className="text-2xl font-bold text-brand dark:text-dark-brand">
                    {isEditMode ? 'Edit Shop' : 'Create New Shop'}
                  </MotiText>
                  <MotiText className="text-sm text-text-muted dark:text-dark-text-muted">
                    {isEditMode ? 'Update your shop details' : 'Create a new shop'}
                  </MotiText>
                </View>
              </View>

              {/* Right */}
              {isEditMode && isOwner && (
                <TouchableOpacity
                  onPress={handleDelete}
                  className="w-10 h-10 rounded-full items-center justify-center"
                >
                  <Ionicons name="trash-outline" size={18} />
                </TouchableOpacity>
              )}
            </View>

            {/* Meta strip (separate row!) */}
            {isEditMode && shopToEdit && (
              <MotiView className="mt-4 flex-row items-center gap-3 px-3 py-2 rounded-xl">
                <View className="w-2 h-2 rounded-full" />
                <Text className="flex-1 text-xs">
                  {shopToEdit.branchCode} • {shopToEdit.name}
                </Text>
                <Text className="text-xs">
                  {new Date(shopToEdit.createdAt).toLocaleDateString()}
                </Text>
              </MotiView>
            )}
          </View>
            

            {/* ── Shop Information Card ─────────────── */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: isEditMode ? 260 : 320, type: 'spring', damping: 18 }}
              className="mx-4 mb-4"
            >
              <Card variant="elevated">
                <CardContent className="p-md gap-4">
                  <View className="flex-row justify-between items-center gap-2 mb-4">
                    <SectionLabel>Shop Details</SectionLabel>
                    <TouchableOpacity
                        onPress={suggestName}
                        activeOpacity={0.75}
                        className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface dark:bg-dark-surface-soft border border-border dark:border-dark-border"
                      >
                        <Ionicons name="bulb-outline" size={14} color={isDark ? '#38bdf8' : '#0ea5e9'} />
                        <Text className="text-brand dark:text-dark-brand text-xs font-medium">Suggest Name</Text>
                      </TouchableOpacity>
                  </View>
                  
                  <Input
                    label="Shop Name"
                    placeholder="e.g. Agateka Shop"
                    value={formData.name}
                    onChangeText={(t) => updateField('name', t)}
                    error={errors.name}
                    leftIcon="storefront-outline"
                    autoFocus={!isEditMode}
                    required
                    showRequiredIndicator
                  />

                  <Input
                    label="Location / Address"
                    placeholder="e.g. Bujumbura, Rohero"
                    value={formData.location}
                    onChangeText={(t) => updateField('location', t)}
                    error={errors.location}
                    leftIcon="location-outline"
                    required
                    showRequiredIndicator
                  />

                  <Input
                    label="Phone Number"
                    placeholder="e.g. +257 79 000 000"
                    value={formData.phone}
                    onChangeText={(t) => updateField('phone', t)}
                    error={errors.phone}
                    leftIcon="call-outline"
                    keyboardType="phone-pad"
                  />

                  <Input
                    label="Branch Code"
                    placeholder="e.g. SHO-12345"
                    value={formData.branchCode}
                    onChangeText={(t) => updateField('branchCode', t)}
                    error={errors.branchCode}
                    leftIcon="barcode-outline"
                    rightIcon="refresh-outline"
                    onRightIconPress={regenerateCode}
                    required
                    showRequiredIndicator
                  />

                  {!isEditMode && formData.name.trim() && (
                    <View className="flex-row items-center gap-2 -mt-2 px-1">
                      <Ionicons name="information-circle-outline" size={13} color={isDark ? '#94a3b8' : '#64748b'} />
                      <Text className="text-text-muted dark:text-dark-text-muted text-xs">
                        Suggested: {generateBranchCode(formData.name)}
                      </Text>
                    </View>
                  )}
                </CardContent>
              </Card>
            </MotiView>

            {/* ── Preferences Card ─────────────────── */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: isEditMode ? 340 : 420, type: 'spring', damping: 18 }}
              className="mx-4 mb-6"
            >
              <Card variant="elevated">
                <CardContent className="p-md gap-5">
                  <SectionLabel>Preferences</SectionLabel>

                  <OptionSelector
                    label="Currency"
                    options={[
                      { value: 'BIF', label: 'BIF ₣' },
                      { value: 'USD', label: 'USD $' },
                      { value: 'EUR', label: 'EUR €' },
                    ]}
                    value={formData.currency}
                    onChange={(v: string) => updateField('currency', v)}
                    isDark={isDark}
                  />

                  <OptionSelector
                    label="Language"
                    options={[
                      { value: 'fr', label: 'Français' },
                      { value: 'en', label: 'English' },
                      { value: 'rn', label: 'Kirundi' },
                    ]}
                    value={formData.language}
                    onChange={(v: string) => updateField('language', v)}
                    isDark={isDark}
                  />

                  <OptionSelector
                    label="Week Starts On"
                    options={[
                      { value: 0, label: 'Sunday' },
                      { value: 1, label: 'Monday' },
                    ]}
                    value={formData.weekStartDay}
                    onChange={(v: number) => updateField('weekStartDay', v)}
                    isDark={isDark}
                  />
                </CardContent>
              </Card>
            </MotiView>

            {/* ── Create Mode Welcome ───────────────── */}
            {!isEditMode && (
              <MotiView
                from={{ opacity: 0, translateY: 16 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: 200, type: 'spring', damping: 18 }}
                className="mx-4 mb-5"
              >
                <View
                  className="rounded-2xl overflow-hidden border border-border dark:border-dark-border"
                  style={{
                    shadowColor: isDark ? '#38bdf8' : '#0ea5e9',
                    shadowOpacity: 0.08,
                    shadowOffset: { width: 0, height: 4 },
                    shadowRadius: 12,
                    elevation: 3,
                  }}
                >
                  <LinearGradient
                    colors={isDark
                      ? ['rgba(56,189,248,0.08)', 'rgba(129,140,248,0.04)']
                      : ['rgba(14,165,233,0.07)', 'rgba(99,102,241,0.04)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="p-4"
                  >
                   
                    <Divider label="included" />

                    <View className="mt-3 gap-0 p-2">
                      <FeatureRow icon="cube-outline" title="Inventory Management" description="Track stock levels and product alerts" delay={300} isDark={isDark} />
                      <FeatureRow icon="cash-outline" title="Sales & Transactions" description="Record sales and manage payments" delay={350} isDark={isDark} />
                      <FeatureRow icon="people-outline" title="Staff Management" description="Add team members and set permissions" delay={400} isDark={isDark} />
                      <FeatureRow icon="bar-chart-outline" title="Analytics & Reports" description="Insights into your business performance" delay={450} isDark={isDark} />
                    </View>
                  </LinearGradient>
                </View>
              </MotiView>
            )}

          </Animated.View>
        </ScrollView>

        {/* ── Fixed Footer ─────────────────────── */}
        <Animated.View
          style={{ transform: [{ translateY: footerAnim }] }}
          className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-dark-surface border-t border-border dark:border-dark-border px-4 pt-3 pb-6"
        >
          {/* Primary action */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading || !canSave}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={
                !canSave
                  ? [isDark ? '#334155' : '#e2e8f0', isDark ? '#334155' : '#e2e8f0']
                  : isDark
                  ? ['#38bdf8', '#818cf8']
                  : ['#0ea5e9', '#6366f1']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                shadowColor: canSave ? (isDark ? '#38bdf8' : '#0ea5e9') : 'transparent',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.28,
                shadowRadius: 12,
                elevation: canSave ? 5 : 0,
              }}
            >
              {loading ? (
                <>
                  <Ionicons name="hourglass-outline" size={18} color="white" style={{ marginRight: 8 }} />
                  <Text className="text-white font-semibold text-base">
                    {isEditMode ? 'Saving...' : 'Creating...'}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name={isEditMode ? 'save-outline' : 'checkmark-circle-outline'}
                    size={18}
                    color={!canSave ? (isDark ? '#64748b' : '#94a3b8') : 'white'}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{ color: !canSave ? (isDark ? '#64748b' : '#94a3b8') : 'white' }}
                    className="font-semibold text-base"
                  >
                    {isEditMode ? 'Save Changes' : 'Create Shop'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Delete button — edit mode only */}
          {isEditMode && isOwner && (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={loading}
              activeOpacity={0.8}
              className="mt-2 py-3 items-center flex-row justify-center gap-2"
            >
              <Ionicons name="trash-outline" size={16} color={isDark ? '#f87171' : '#ef4444'} />
              <Text className="text-error dark:text-dark-error text-sm font-medium">
                Delete Shop
              </Text>
            </TouchableOpacity>
          )}

          <Text className="text-center text-text-muted dark:text-dark-text-muted text-xs mt-2">
            {isEditMode
              ? 'Changes are saved immediately'
              : 'By creating a shop you agree to our Terms of Service'}
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* ── Modals & Dialogs ─────────────────── */}
      {/* {showSeedModal && (
        <SeedModal visible={showSeedModal} onClose={() => setShowSeedModal(false)} />
      )} */}

      <CustomDialog
        visible={showSuccessDialog}
        title={isEditMode ? 'Shop Updated!' : 'Shop Created!'}
        description={
          isEditMode
            ? 'Your shop has been updated successfully.'
            : "Your shop is ready! Let's add some products to get started."
        }
        variant="success"
        icon="checkmark-circle"
        actions={[{
          label: 'Continue',
          variant: 'default',
          onPress: () => { setShowSuccessDialog(false); router.push('/(tabs)/products'); },
        }]}
        onClose={() => { setShowSuccessDialog(false); dialogAction.onConfirm?.(); setDialogAction({}); }}
      />

      <CustomDialog
        visible={showErrorDialog}
        title="Something went wrong"
        description={errorMessage}
        variant="error"
        icon="alert-circle"
        actions={[{
          label: 'OK',
          variant: 'default',
          onPress: () => { setShowErrorDialog(false); setErrorMessage(''); },
        }]}
        onClose={() => { setShowErrorDialog(false); setErrorMessage(''); }}
      />

      <CustomDialog
        visible={showDeleteDialog}
        title="Delete this shop?"
        description="This will permanently remove all products, transactions, staff, and data associated with this shop. This cannot be undone."
        variant="error"
        icon="trash-outline"
        showCancel
        cancelLabel="Cancel"
        onCancel={() => setShowDeleteDialog(false)}
        actions={[{
          label: 'Delete Permanently',
          variant: 'destructive',
          onPress: confirmDelete,
        }]}
        onClose={() => setShowDeleteDialog(false)}
      />
    </SafeAreaView>
  );
}