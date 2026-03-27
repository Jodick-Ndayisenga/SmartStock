// app/(tabs)/profile.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  Alert,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Animated,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

// Components
import { ThemedText, MutedText, SuccessText } from '@/components/ui/ThemedText';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Badge } from '@/components/ui/Badge';
import CustomDialog from '@/components/ui/CustomDialog';

// Language Utilities
import { LangCode, availableLanguages, getNativeLanguageName } from '@/language/LanguageUtils';

// Context & Database
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import database from '@/database';
import { User } from '@/database/models/User';
import { Setting } from '@/database/models/Setting';
import { Q } from '@nozbe/watermelondb';

const { width, height } = Dimensions.get('window');

// Currency options
const CURRENCIES = [
  { code: 'BIF', name: 'Burundi Franc', symbol: '₣', locale: 'fr-BI' },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'fr-FR' },
];

// Modern Setting Row Component
const SettingRow = ({ icon, title, subtitle, onPress, action, isLast, variant = 'default' }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className={`flex-row items-center justify-between py-4 ${!isLast ? 'border-b border-border dark:border-dark-border' : ''}`}
  >
    <View className="flex-row items-center flex-1">
      <View className="w-12 h-12 rounded-2xl bg-brand/10 items-center justify-center mr-4">
        <Ionicons name={icon} size={22} color="#0ea5e9" />
      </View>
      <View className="flex-1">
        <ThemedText variant="default" size="base" weight="semibold">
          {title}
        </ThemedText>
        {subtitle && (
          <MutedText size="sm" className="mt-0.5">
            {subtitle}
          </MutedText>
        )}
      </View>
    </View>
    {action || <Ionicons name="chevron-forward" size={20} color="#94a3b8" />}
  </TouchableOpacity>
);

// Modern Switch Row Component
const SwitchRow = ({ icon, title, subtitle, value, onValueChange, isLast }: any) => (
  <View className={`flex-row items-center justify-between py-4 ${!isLast ? 'border-b border-border dark:border-dark-border' : ''}`}>
    <View className="flex-row items-center flex-1">
      <View className="w-12 h-12 rounded-2xl bg-brand/10 items-center justify-center mr-4">
        <Ionicons name={icon} size={22} color="#0ea5e9" />
      </View>
      <View className="flex-1">
        <ThemedText variant="default" size="base" weight="semibold">
          {title}
        </ThemedText>
        {subtitle && (
          <MutedText size="sm" className="mt-0.5">
            {subtitle}
          </MutedText>
        )}
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={(val) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onValueChange(val);
      }}
      trackColor={{ false: '#e2e8f0', true: '#0ea5e9' }}
      thumbColor={value ? '#ffffff' : '#f8fafc'}
      ios_backgroundColor="#e2e8f0"
    />
  </View>
);

// Stats Card Component
const StatsCard = ({ icon, label, value, trend, trendUp }: any) => (
  <MotiView
    from={{ opacity: 0, translateY: 30 }}
    animate={{ opacity: 1, translateY: 0 }}
    transition={{ type: 'timing', duration: 500, delay: 200 }}
    className="flex-1 mx-1"
  >
    <Card variant="elevated" className="p-4">
      <View className="flex-row items-center justify-between mb-2">
        <View className="w-10 h-10 rounded-xl bg-brand/10 items-center justify-center">
          <Ionicons name={icon} size={20} color="#0ea5e9" />
        </View>
        {trend && (
          <View className="flex-row items-center">
            <Ionicons
              name={trendUp ? "trending-up" : "trending-down"}
              size={14}
              color={trendUp ? "#22c55e" : "#ef4444"}
            />
            <ThemedText 
              variant={trendUp ? "success" : "error"} 
              size="xs" 
              weight="medium"
              className="ml-1"
            >
              {trend}%
            </ThemedText>
          </View>
        )}
      </View>
      <MutedText size="xs" className="mb-1">{label}</MutedText>
      <ThemedText size="xl" weight="bold">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </ThemedText>
    </Card>
  </MotiView>
);

// Edit Profile Modal with Image Picker
const EditProfileModal = ({ visible, onClose, user, onUpdate, onImageUpdate }: any) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'We need access to your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setImageLoading(true);
        await onImageUpdate(result.assets[0].uri);
        setImageLoading(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      setImageLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    await onUpdate({ displayName, email, phone });
    setLoading(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', opacity: fadeAnim }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [height, 0],
              }),
            }],
          }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View className="bg-white dark:bg-dark-surface rounded-t-3xl p-6">
              <View className="items-center mb-6">
                <View className="w-12 h-1 rounded-full bg-gray-300 dark:bg-gray-700 mb-4" />
                <ThemedText size="xl" weight="bold">Edit Profile</ThemedText>
              </View>

              {/* Profile Image Section */}
              <View className="items-center mb-6">
                <TouchableOpacity onPress={handlePickImage} disabled={imageLoading}>
                  <View className="relative">
                    <View className="w-24 h-24 rounded-full border-4 border-brand bg-brand/10 overflow-hidden">
                      {user?.imageUrl ? (
                        <Image source={{ uri: user.imageUrl }} className="w-full h-full" resizeMode="cover" />
                      ) : (
                        <View className="w-full h-full items-center justify-center">
                          <ThemedText size="3xl" weight="bold" className="text-brand">
                            {displayName?.[0]?.toUpperCase() || 'U'}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand items-center justify-center border-2 border-white">
                      {imageLoading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Ionicons name="camera" size={16} color="white" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                <MutedText size="xs" className="mt-2">Tap to change profile picture</MutedText>
              </View>

              {/* Form Fields */}
              <View className="gap-4">
                <View>
                  <ThemedText variant="label" size="sm" weight="medium" className="mb-2">Full Name</ThemedText>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    className="border border-border dark:border-dark-border rounded-xl px-4 py-3 text-text dark:text-dark-text"
                    placeholder="Enter your name"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View>
                  <ThemedText variant="label" size="sm" weight="medium" className="mb-2">Email</ThemedText>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    className="border border-border dark:border-dark-border rounded-xl px-4 py-3 text-text dark:text-dark-text"
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View>
                  <ThemedText variant="label" size="sm" weight="medium" className="mb-2">Phone</ThemedText>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    className="border border-border dark:border-dark-border rounded-xl px-4 py-3 text-text dark:text-dark-text"
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              {/* Buttons */}
              <View className="flex-row gap-3 mt-8">
                <Button variant="outline" onPress={onClose} className="flex-1">Cancel</Button>
                <Button variant="default" onPress={handleSave} loading={loading} className="flex-1">Save Changes</Button>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Language Dialog
const LanguageDialog = ({ visible, onClose, currentLanguage, onSelectLanguage }: any) => (
  <CustomDialog
    visible={visible}
    variant="info"
    title="Select Language"
    description="Choose your preferred language"
    icon="language-outline"
    onClose={onClose}
  >
    <View className="gap-2 mt-2">
      {availableLanguages.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          onPress={() => { onSelectLanguage(lang.code); onClose(); }}
          className={`p-4 rounded-xl border ${currentLanguage === lang.code ? 'border-brand bg-brand/10' : 'border-border dark:border-dark-border'}`}
        >
          <ThemedText variant={currentLanguage === lang.code ? 'brand' : 'default'} weight={currentLanguage === lang.code ? 'semibold' : 'regular'}>
            {lang.nativeName} ({lang.name})
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  </CustomDialog>
);

// Currency Dialog
const CurrencyDialog = ({ visible, onClose, currentCurrency, onSelectCurrency }: any) => (
  <CustomDialog
    visible={visible}
    variant="info"
    title="Select Currency"
    description="Choose your primary currency for transactions"
    icon="cash-outline"
    onClose={onClose}
  >
    <View className="gap-2 mt-2">
      {CURRENCIES.map((currency) => (
        <TouchableOpacity
          key={currency.code}
          onPress={() => { onSelectCurrency(currency.code); onClose(); }}
          className={`p-4 rounded-xl border flex-row justify-between items-center ${currentCurrency === currency.code ? 'border-brand bg-brand/10' : 'border-border dark:border-dark-border'}`}
        >
          <View>
            <ThemedText variant={currentCurrency === currency.code ? 'brand' : 'default'} weight={currentCurrency === currency.code ? 'semibold' : 'regular'}>
              {currency.name}
            </ThemedText>
            <MutedText size="xs" className="mt-0.5">{currency.symbol}</MutedText>
          </View>
          {currentCurrency === currency.code && <Ionicons name="checkmark-circle" size={20} color="#0ea5e9" />}
        </TouchableOpacity>
      ))}
    </View>
  </CustomDialog>
);

// Week Start Dialog
const WeekStartDialog = ({ visible, onClose, currentWeekStart, onSelectWeekStart }: any) => {
  const weekOptions = [
    { value: 1, label: 'Monday', icon: 'calendar' },
    { value: 0, label: 'Sunday', icon: 'calendar' },
  ];

  return (
    <CustomDialog
      visible={visible}
      variant="info"
      title="Week Start Day"
      description="Select the first day of your business week"
      icon="calendar-outline"
      onClose={onClose}
    >
      <View className="gap-2 mt-2">
        {weekOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => { onSelectWeekStart(option.value); onClose(); }}
            className={`p-4 rounded-xl border flex-row justify-between items-center ${currentWeekStart === option.value ? 'border-brand bg-brand/10' : 'border-border dark:border-dark-border'}`}
          >
            <ThemedText variant={currentWeekStart === option.value ? 'brand' : 'default'} weight={currentWeekStart === option.value ? 'semibold' : 'regular'}>
              {option.label}
            </ThemedText>
            {currentWeekStart === option.value && <Ionicons name="checkmark-circle" size={20} color="#0ea5e9" />}
          </TouchableOpacity>
        ))}
      </View>
    </CustomDialog>
  );
};

// Main Profile Screen Component
export default function ProfileScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { colorScheme, setColorScheme } = useColorScheme();
  const { user, logout, currentShop, clearInvalidSession, setUserTheme } = useAuth();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [languageDialogVisible, setLanguageDialogVisible] = useState(false);
  const [currencyDialogVisible, setCurrencyDialogVisible] = useState(false);
  const [weekStartDialogVisible, setWeekStartDialogVisible] = useState(false);
  
  const [profileStats, setProfileStats] = useState({
    products: 0,
    sales: 0,
    profit: 0,
  });
  
  const [settings, setSettings] = useState({
    language: 'en' as LangCode,
    currency: 'BIF',
    darkMode: colorScheme === 'dark',
    backupEnabled: true,
    smsAlerts: true,
    wifiOnlyBackup: true,
    weekStartDay: 1,
  });

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProfileData();
    loadStats();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const settingsData = await database.get<Setting>('settings').query().fetch();
      const shopSettings = settingsData[0];

      if (shopSettings) {
        setSettings({
          language: (shopSettings.language as LangCode) || 'en',
          currency: shopSettings.currency || 'BIF',
          darkMode: colorScheme === 'dark',
          backupEnabled: shopSettings.backupEnabled,
          smsAlerts: shopSettings.smsAlertsEnabled,
          wifiOnlyBackup: shopSettings.autoBackupWifiOnly,
          weekStartDay: shopSettings.weekStartDay || 1,
        });
        i18n.changeLanguage(shopSettings.language || 'en');
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    // TODO: Replace with actual data from WatermelonDB
    setTimeout(() => {
      setProfileStats({ products: 234, sales: 1289, profit: 45230 });
    }, 500);
  };

  const handleUpdateUser = async (data: any) => {
    try {
      await database.write(async () => {
        const usr = await database.get<User>('users').find(user?.id || '');
        await usr.update(record => {
          if (data.displayName) record.displayName = data.displayName;
          if (data.email) record.email = data.email;
          if (data.phone) record.phone = data.phone;
        });
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showNotification({ type: 'success', title: 'Profile Updated', message: 'Your profile has been updated' });
    } catch (error) {
      showNotification({ type: 'error', title: 'Update Failed', message: 'Failed to update profile' });
    }
  };

  const handleUpdateImage = async (imageUri: string) => {
    try {
      await database.write(async () => {
        const usr = await database.get<User>('users').find(user?.id || '');
        if (usr) {
          await usr.update(record => { record.imageUrl = imageUri; });
        }
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showNotification({ type: 'success', title: 'Profile Image Updated', message: 'Your profile image has been updated' });
    } catch (error) {
      showNotification({ type: 'error', title: 'Update Failed', message: 'Failed to update profile image' });
    }
  };

  const updateSettings = async () => {
    if (!currentShop) return;
    setSaving(true);
    try {
      const settingsData = await database.get<Setting>('settings').query(Q.where('shop_id', currentShop.id)).fetch();
      const shopSettings = settingsData[0];
      if (shopSettings) {
        await database.write(async () => {
          await shopSettings.update(record => {
            record.language = settings.language;
            record.currency = settings.currency;
            record.backupEnabled = settings.backupEnabled;
            record.smsAlertsEnabled = settings.smsAlerts;
            record.autoBackupWifiOnly = settings.wifiOnlyBackup;
            record.weekStartDay = settings.weekStartDay;
          });
        });
      }

      setColorScheme(settings.darkMode ? 'dark' : 'light');
      setUserTheme(settings.darkMode ? 'dark' : 'light');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showNotification({ type: 'success', title: 'Settings Saved', message: 'Your preferences have been updated' });
    } catch (error) {
      showNotification({ type: 'error', title: 'Update Failed', message: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLogoutDialogVisible(false);
    await clearInvalidSession();
    await logout();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <StatusBar barStyle="light-content" />
        <Loading />
      </View>
    );
  }

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [280, 120],
    extrapolate: 'clamp',
  });

  const avatarScale = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.7],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [100, 150],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const displayName = user?.displayName || 'User';
  const userInitial = displayName?.[0]?.toUpperCase() || 'U';

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <StatusBar barStyle="light-content" />

      {/* Animated Header */}
      <Animated.View style={{ height: headerHeight, position: 'relative' }}>
        <LinearGradient
          colors={['#0ea5e9', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', width: '100%', height: '100%', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
        />
        
        <Animated.View style={{ position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: titleOpacity }}>
          <ThemedText size="xl" weight="bold" className="text-white">Profile</ThemedText>
          <IconButton icon="settings-outline" onPress={() => setEditModalVisible(true)} variant="ghost" iconColor="#fff" size="sm" />
        </Animated.View>

        <Animated.View style={{ position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center', transform: [{ scale: avatarScale }] }}>
          <TouchableOpacity onPress={() => setEditModalVisible(true)} activeOpacity={0.8}>
            <View className="w-28 h-28 rounded-full border-4 border-white bg-white/20 shadow-2xl overflow-hidden">
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="w-full h-full items-center justify-center bg-white/30">
                  <ThemedText size="3xl" weight="bold" className="text-white">{userInitial}</ThemedText>
                </View>
              )}
            </View>
            <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white items-center justify-center border-2 border-white shadow-md">
              <Ionicons name="camera" size={16} color="#0ea5e9" />
            </View>
          </TouchableOpacity>

          <Animated.View style={{ opacity: titleOpacity }}>
            <ThemedText size="xl" weight="bold" className="text-white mt-3 text-center">{displayName}</ThemedText>
            <View className="flex-row items-center justify-center mt-1">
              <Badge variant="success" className="bg-white/20">
                <SuccessText size="xs" className="text-white">Active</SuccessText>
              </Badge>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
      >
        <View className="px-2 gap-4">
          {/* Stats Section */}
          <View className="flex-row">
            <StatsCard icon="cube-outline" label="Total Products" value={profileStats.products} trend="+12" trendUp />
            <StatsCard icon="cart-outline" label="Total Sales" value={profileStats.sales} trend="+8" trendUp />
            <StatsCard icon="trending-up-outline" label="Profit" value={`₣${profileStats.profit.toLocaleString()}`} trend="+23" trendUp />
          </View>

          {/* Shop Info Card */}
          {currentShop && (
            <MotiView 
              from={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ type: 'spring', delay: 300 }}
            >
              <Card variant="elevated" className="overflow-hidden">
                <LinearGradient 
                  colors={['#0ea5e9', '#6366f1']} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 1 }} 
                  className="px-4 py-3" // Very compact padding
                >
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className="text-white/70 mb-0.5">ACTIVE SHOP</Text>
                      <ThemedText size="sm" weight="bold" className="text-white">{currentShop.name}</ThemedText>
                      {currentShop.location && (
                        <Text className="text-white/60 mt-0.5">{currentShop.location}</Text>
                      )}
                    </View>
                    <TouchableOpacity 
                      onPress={() => router.push('/(auth)/manage-shop')}
                      className="bg-white/20 px-3 py-1.5 rounded-lg"
                    >
                      <ThemedText size="xs" weight="medium" className="text-white">Manage</ThemedText>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </Card>
            </MotiView>
          )}

          {/* App Settings */}
          <MotiView from={{ opacity: 0, translateY: 30 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 400 }}>
            <Card variant="elevated">
              <CardHeader title="App Settings" subtitle="Customize your experience" />
              <CardContent className="p-0">
                <SettingRow icon="language-outline" title="Language" subtitle={getNativeLanguageName(settings.language)} onPress={() => setLanguageDialogVisible(true)} action={<MutedText size="sm">{settings.language.toUpperCase()}</MutedText>} />
                <SettingRow icon="cash-outline" title="Currency" subtitle={`${CURRENCIES.find(c => c.code === settings.currency)?.name}`} onPress={() => setCurrencyDialogVisible(true)} action={<MutedText size="sm">{settings.currency}</MutedText>} />
                <SettingRow icon="calendar-outline" title="Week Starts On" subtitle={settings.weekStartDay === 1 ? 'Monday' : 'Sunday'} onPress={() => setWeekStartDialogVisible(true)} action={<MutedText size="sm">{settings.weekStartDay === 1 ? 'Mon' : 'Sun'}</MutedText>} />
                <SwitchRow icon="moon-outline" title="Dark Mode" subtitle="Use dark theme throughout the app" value={settings.darkMode} onValueChange={(value:boolean) => { setSettings(prev => ({ ...prev, darkMode: value })); setColorScheme(value ? 'dark' : 'light'); }} isLast />
              </CardContent>
            </Card>
          </MotiView>

          {/* Notifications & Backup */}
          <MotiView from={{ opacity: 0, translateY: 30 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 500 }}>
            <Card variant="elevated">
              <CardHeader title="Notifications & Backup" subtitle="Manage your alerts and data" />
              <CardContent className="p-0">
                <SwitchRow icon="notifications-outline" title="SMS Alerts" subtitle="Receive low stock alerts" value={settings.smsAlerts} onValueChange={(value: boolean) => setSettings(prev => ({ ...prev, smsAlerts: value }))} />
                <SwitchRow icon="cloud-upload-outline" title="Cloud Backup" subtitle="Auto backup your data" value={settings.backupEnabled} onValueChange={(value: boolean) => setSettings(prev => ({ ...prev, backupEnabled: value }))} />
                <SwitchRow icon="wifi-outline" title="Wi-Fi Only Backup" subtitle="Backup on Wi-Fi only" value={settings.wifiOnlyBackup} onValueChange={(value: boolean) => setSettings(prev => ({ ...prev, wifiOnlyBackup: value }))} isLast />
              </CardContent>
            </Card>
          </MotiView>

          {/* Support Section */}
          <MotiView from={{ opacity: 0, translateY: 30 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 600 }}>
            <Card variant="elevated">
              <CardHeader title="Support & Information" subtitle="Need help? We're here for you" />
              <CardContent className="p-0">
                <SettingRow icon="help-circle-outline" title="Help & Support" subtitle="FAQs and contact support" onPress={() => {}} />
                <SettingRow icon="document-text-outline" title="Terms & Privacy" subtitle="Read our terms and policies" onPress={() => {}} />
                <SettingRow icon="information-circle-outline" title="About StockMaster" subtitle="Version 1.0.0 • Build 100" onPress={() => {}} isLast />
              </CardContent>
            </Card>
          </MotiView>

          {/* Action Buttons */}
          <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', delay: 700 }} className="gap-3 mt-2">
            <Button variant="default" onPress={updateSettings} loading={saving} icon="save-outline" size="lg">Save Settings</Button>
            <Button variant="destructive" onPress={() => setLogoutDialogVisible(true)} icon="log-out-outline" size="lg">Logout</Button>
          </MotiView>
        </View>
      </Animated.ScrollView>

      {/* Dialogs */}
      <EditProfileModal visible={editModalVisible} onClose={() => setEditModalVisible(false)} user={user} onUpdate={handleUpdateUser} onImageUpdate={handleUpdateImage} />
      <LanguageDialog visible={languageDialogVisible} onClose={() => setLanguageDialogVisible(false)} currentLanguage={settings.language} onSelectLanguage={(lang: LangCode) => { setSettings(prev => ({ ...prev, language: lang })); i18n.changeLanguage(lang); }} />
      <CurrencyDialog visible={currencyDialogVisible} onClose={() => setCurrencyDialogVisible(false)} currentCurrency={settings.currency} onSelectCurrency={(currency: string) => setSettings(prev => ({ ...prev, currency }))} />
      <WeekStartDialog visible={weekStartDialogVisible} onClose={() => setWeekStartDialogVisible(false)} currentWeekStart={settings.weekStartDay} onSelectWeekStart={(day: number) => setSettings(prev => ({ ...prev, weekStartDay: day }))} />
      <CustomDialog visible={logoutDialogVisible} variant="warning" title="Sign Out" description="Are you sure you want to sign out of your account?" actions={[{ label: 'Cancel', onPress: () => setLogoutDialogVisible(false), variant: 'outline' }, { label: 'Sign Out', onPress: handleLogout, variant: 'destructive' }]} onClose={() => setLogoutDialogVisible(false)} />
    </View>
  );
}