// app/(tabs)/profile.tsx
import { Dialog } from '@/components/ui/Dialog';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { User } from '@/database/models/User';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { ThemedText } from '@/components/ui/ThemedText';

import { Setting } from '@/database/models/Setting';

interface ProfileData {
  displayName: string;
  email: string;
  phone: string;
  role: string;
  joinDate: string;
}

interface AppSettings {
  language: string;
  currency: string;
  darkMode: boolean;
  backupEnabled: boolean;
  smsAlerts: boolean;
  wifiOnlyBackup: boolean;
  weekStartDay: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colorScheme, setColorScheme } = useColorScheme();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const {user, logout, currentShop} = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    displayName: '',
    email: '',
    phone: '',
    role: 'Owner',
    joinDate: '',
  });
  const [settings, setSettings] = useState<AppSettings>({
    language: 'fr',
    currency: 'BIF',
    darkMode: colorScheme === 'dark',
    backupEnabled: true,
    smsAlerts: true,
    wifiOnlyBackup: true,
    weekStartDay: 1, // Monday
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    displayName: string;
    email: string;
    phone: string;
    password: string;
  }>({
    displayName: profile.displayName || '',
    email: profile.email || '',
    phone: profile.phone || '',
    password: '',
  });

  useEffect(() => {
    if (user) {
      setUserInfo({
        displayName: user.displayName || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
      });
    }
    
  }, [user]);




  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      

      // Load settings
      const settingsData = await database.get<Setting>('settings').query().fetch();
      const shopSettings = settingsData[0];

      if (user) {
        setProfile({
          displayName: user.displayName || 'User',
          email: user.email || '',
          phone: user.phone || '',
          role: 'Owner', // You might want to get this from membership
          joinDate: user.createdAt.toLocaleDateString('fr-BI'),
        });
      }

      if (shopSettings) {
        setSettings({
          language: shopSettings.language,
          currency: shopSettings.currency,
          darkMode: colorScheme === 'dark',
          backupEnabled: shopSettings.backupEnabled,
          smsAlerts: shopSettings.smsAlertsEnabled,
          wifiOnlyBackup: shopSettings.autoBackupWifiOnly,
          weekStartDay: shopSettings.weekStartDay,
        });
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };


  // regex to verify email 
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const isEmailValid = (email: string) => {
    return emailRegex.test(email);
  };


  const updateSettings = async () => {
    if (!currentShop) return;

    setSaving(true);
    try {
      const settingsData = await database.get<Setting>('settings')
        .query(Q.where('shop_id', currentShop.id))
        .fetch();
      
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
            record.updatedAt = new Date();
          });
        });
      }

      // Update app language
      i18n.changeLanguage(settings.language);
      
      // Update dark mode
      //console.log()

      setColorScheme(settings.darkMode ? 'dark' : 'light');

      Alert.alert('Success', 'Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const pickProfileImage = async () => {
    try {
      setImageUploading(true);
      
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // In a real app, you'd upload to your server and update user profile
        Alert.alert('Success', 'Profile image updated successfully');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to update profile image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleLogout =  () => {
   setOpen(!open)
  };

 

  const SettingRow = ({ 
    icon, 
    title, 
    subtitle, 
    action, 
    onPress ,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between py-4 border-b border-border dark:border-dark-border"
    >
      <View className="flex-row items-center flex-1">
        <View className="w-10 h-10 rounded-lg bg-brand/10 items-center justify-center mr-3">
          <Ionicons name={icon as any} size={20} color="#0ea5e9" />
        </View>
        <View className="flex-1">
          <ThemedText variant="default" size="base" className="font-medium">
            {title}
          </ThemedText>
          <ThemedText variant="muted" size="sm" className="mt-1">
              {subtitle}
            </ThemedText>
        </View>
      </View>
      {action}
    </TouchableOpacity>
  );

  const SwitchSetting = ({ 
    icon, 
    title, 
    subtitle, 
    value, 
    onValueChange 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View className="flex-row items-center justify-between py-4 border-b border-border dark:border-dark-border">
      <View className="flex-row items-center flex-1">
        <View className="w-10 h-10 rounded-lg bg-brand/10 items-center justify-center mr-3">
          <Ionicons name={icon as any} size={20} color="#0ea5e9" />
        </View>
        <View className="flex-1">
          <ThemedText variant="default" size="base" className="font-medium">
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText variant="muted" size="sm" className="mt-1">
              {subtitle}
            </ThemedText>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#cbd5e1', true: '#0ea5e9' }}
        thumbColor={value ? '#ffffff' : '#f8fafc'}
      />
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Profile & Settings" />
        <Loading />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title="Profile & Settings"
      />
      

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="p-4 gap-4">
          {/* Profile Header */}
          <Card variant="elevated">
            <CardContent className="p-6">
              <View className="items-center">
                {/* Profile Image */}
                <TouchableOpacity
                  onPress={pickProfileImage}
                  className="relative mb-4"
                >
                  <View className="w-24 h-24 rounded-full bg-surface-muted dark:bg-dark-surface-muted items-center justify-center border-4 border-surface dark:border-dark-surface">
                    {imageUploading ? (
                      <Ionicons name="refresh" size={32} color="#94a3b8" />
                    ) : (
                      <ThemedText variant="brand" size="2xl" className="font-bold">
                        {profile.displayName[0]?.toUpperCase()}
                      </ThemedText>
                    )}
                  </View>
                  <View className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-brand items-center justify-center border-2 border-surface dark:border-dark-surface">
                    <Ionicons name="camera" size={12} color="#ffffff" />
                  </View>
                </TouchableOpacity>

                {/* Profile Info */}
                <ThemedText variant="heading" size="xl" className="mb-1">
                  {profile.displayName}
                </ThemedText>
                <ThemedText variant="muted" size="base" className="mb-3">
                  {profile.role} • Joined {profile.joinDate}
                </ThemedText>

                {/* Shop Info */}
                {currentShop && (
                  <View className="bg-surface-soft dark:bg-dark-surface-soft rounded-xl p-4 w-full">
                    <View className="flex-row justify-between items-center">
                      <View>
                        <ThemedText variant="default" size="base" className="font-medium">
                          {currentShop.name}
                        </ThemedText>
                        <ThemedText variant="muted" size="sm">
                          {currentShop.location}
                        </ThemedText>
                      </View>
                      <Badge variant="success">
                        Active
                      </Badge>
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View className="flex-row gap-3 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => router.push('/(auth)/manage-shop')}
                    icon="business-outline"
                  >
                    {currentShop ? 'Switch Shop' : 'Create Shop'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {/* Edit profile */}}
                    icon="create-outline"
                  >
                    Edit Profile
                  </Button>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Account Information */}
          <UserInformation user={user ?? null} />
          

          {/* App Settings */}
          <Card variant="elevated">
            <CardHeader
              title="App Settings"
              subtitle="Customize your app experience"
            />
            <CardContent className="p-0">
              {/* Language */}
              <SettingRow
                icon="language-outline"
                title="Language"
                subtitle={settings.language === 'fr' ? 'Français' : 'Kirundi'}
                onPress={() => {
                  Alert.alert(
                    'Select Language',
                    'Choose your preferred language',
                    [
                      { text: 'Français', onPress: () => setSettings(prev => ({ ...prev, language: 'fr' })) },
                      { text: 'Kirundi', onPress: () => setSettings(prev => ({ ...prev, language: 'rn' })) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
                action={
                  <View className="flex-row items-center">
                    <ThemedText variant="muted" size="sm" className="mr-2">
                      {settings.language === 'fr' ? 'FR' : 'RN'}
                    </ThemedText>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                  </View>
                }
              />

              {/* Currency */}
              <SettingRow
                icon="cash-outline"
                title="Currency"
                subtitle="Primary currency for transactions"
                onPress={() => {
                  Alert.alert(
                    'Select Currency',
                    'Choose your primary currency',
                    [
                      { text: 'Burundi Franc (BIF)', onPress: () => setSettings(prev => ({ ...prev, currency: 'BIF' })) },
                      { text: 'US Dollar (USD)', onPress: () => setSettings(prev => ({ ...prev, currency: 'USD' })) },
                      { text: 'Euro (EUR)', onPress: () => setSettings(prev => ({ ...prev, currency: 'EUR' })) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
                action={
                  <View className="flex-row items-center">
                    <ThemedText variant="muted" size="sm" className="mr-2">
                      {settings.currency}
                    </ThemedText>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                  </View>
                }
              />

              {/* Week Start Day */}
              <SettingRow
                icon="calendar-outline"
                title="Week Starts On"
                subtitle="First day of the week for reports"
                onPress={() => {
                  Alert.alert(
                    'Week Start Day',
                    'Select the first day of your business week',
                    [
                      { text: 'Monday', onPress: () => setSettings(prev => ({ ...prev, weekStartDay: 1 })) },
                      { text: 'Sunday', onPress: () => setSettings(prev => ({ ...prev, weekStartDay: 0 })) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
                action={
                  <View className="flex-row items-center">
                    <ThemedText variant="muted" size="sm" className="mr-2">
                      {settings.weekStartDay === 1 ? 'Monday' : 'Sunday'}
                    </ThemedText>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                  </View>
                }
              />

              {/* Dark Mode */}
              <SwitchSetting
                icon="moon-outline"
                title="Dark Mode"
                subtitle="Use dark theme throughout the app"
                value={settings.darkMode}
                onValueChange={(value) => {
                  setSettings(prev => ({ ...prev, darkMode: value }))
                  setColorScheme(value ? 'dark' : 'light')
                }}
              />
            </CardContent>
          </Card>

          {/* Notifications & Backup */}
          <Card variant="elevated">
            <CardHeader
              title="Notifications & Backup"
              subtitle="Alerts and data management"
            />
            <CardContent className="p-0">
              <SwitchSetting
                icon="notifications-outline"
                title="SMS Alerts"
                subtitle="Receive low stock alerts via SMS"
                value={settings.smsAlerts}
                onValueChange={(value) => setSettings(prev => ({ ...prev, smsAlerts: value }))}
              />
              <SwitchSetting
                icon="cloud-upload-outline"
                title="Cloud Backup"
                subtitle="Automatically backup your data"
                value={settings.backupEnabled}
                onValueChange={(value) => setSettings(prev => ({ ...prev, backupEnabled: value }))}
              />
              <SwitchSetting
                icon="wifi-outline"
                title="Wi-Fi Only Backup"
                subtitle="Only backup when connected to Wi-Fi"
                value={settings.wifiOnlyBackup}
                onValueChange={(value) => setSettings(prev => ({ ...prev, wifiOnlyBackup: value }))}
              />
            </CardContent>
          </Card>

          {/* Support & Information */}
          <Card variant="elevated">
            <CardHeader
              title="Support & Information"
              subtitle="Get help and learn about the app"
            />
            <CardContent className="p-0">
              <SettingRow
                icon="help-circle-outline"
                title="Help & Support"
                subtitle="Get help with using the app"
                onPress={() => {/* Open help */}}
                action={<Ionicons name="chevron-forward" size={20} color="#64748b" />}
              />
              <SettingRow
                icon="document-text-outline"
                title="Terms & Privacy"
                subtitle="Read our terms and privacy policy"
                onPress={() => {/* Open terms */}}
                action={<Ionicons name="chevron-forward" size={20} color="#64748b" />}
              />
              <SettingRow
                icon="information-circle-outline"
                title="About StockMaster"
                subtitle={`Version 1.0.0 • Build 100`}
                onPress={() => {/* Open about */}}
                action={<Ionicons name="chevron-forward" size={20} color="#64748b" />}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <View className="gap-3">
            <Button
              variant="default"
              onPress={updateSettings}
              loading={saving}
              icon="save-outline"
            >
              Save Settings
            </Button>

            <Button
              variant="outline"
              onPress={() => router.push('/(auth)/create-shop')}
              icon="business-outline"
            >
              {currentShop ? 'Manage Shops' : 'Create First Shop'}
            </Button>

            <Button
              variant="destructive"
              onPress={handleLogout}
              icon="log-out-outline"
            >
              Logout
            </Button>
          </View>
        </View>
      </ScrollView>

      <Dialog
        visible={open}
        variant="warning"
        title="Sign out"
        description="Are you sure you want to sign out of your account?"
        confirmText="Sign out"
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={async() => {
          setOpen(false);
          await logout();
        }}
      />
    </View>
  );
}



const UserInformation = ({
  user = null
}: {
  user: User | null
}) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [password, setPassword] = useState('');
  const [isEdited, setIsEdited] = useState(false);
  const [isPhoneEdited, setIsPhoneEdited] = useState(false);
  const [isPasswordEdited, setIsPasswordEdited] = useState(false);
  const [isEmailEdited, setIsEmailEdited] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
  }, [user]);



  const handleSave = async () => {
   await database.write (async () => {
     const usr = await database.get<User>('users').find(user?.id || '');
     await usr.update(record => {
       if(isEdited) record.displayName = displayName;
       if(isEmailEdited) record.email = email;
       if(isPhoneEdited) record.phone = phone;
       if(isPasswordEdited) record.password = password;
     })

     setIsEdited(false);
     setIsEmailEdited(false);
     setIsPhoneEdited(false);
     setIsPasswordEdited(false);
   })
  };

  const handleChangeText = (field: string, value: string) => {
  // Update the correct field locally
  if (field === 'displayName') {
    setDisplayName(value);
    setIsEdited(true);
    
  };
  if (field === 'email') {
    setEmail(value);
    setIsEmailEdited(true);
  };
  if (field === 'phone') {
    setPhone(value);
    setIsPhoneEdited(true);
  };

  if (field === 'password') {
    setPassword(value);
    setIsPasswordEdited(true);
  };
};

  return (
    <Card variant="elevated">
      <CardHeader title="User Information" subtitle="Manage your account details" />
      <CardContent>
        {/* Name Row */}
        <View className="flex-row items-center flex-1 border-b border-b-border dark:border-b-dark-border mt-2 relative">
          <View className="w-10 h-10 rounded-lg bg-brand/10 items-center justify-center mr-3">
            <Ionicons name={`person-outline`} size={20} color="#0ea5e9" />
          </View>

          <View className="flex-1 mt-2 pr-8"> {/* pr-8 leaves space for tick */}
            <ThemedText
              variant="default"
              size="base"
              className="font-medium text-default dark:text-dark-default"
            >
              Full Name
            </ThemedText>
            <TextInput
              value={displayName}
              onChangeText={(text) => handleChangeText('displayName', text)}
              placeholder="John Doe"
              className="border-0 bg-transparent text-text-muted dark:text-dark-text-muted text-sm text-[18px]"
            />
          </View>

          {/* ✅ Tick Icon (only shows when edited) */}
          {isEdited && (
            <TouchableOpacity
              onPress={handleSave}
              className="absolute right-0 top-7" // position over input
            >
              <Ionicons name="checkmark-circle" size={22} color="#0ea5e9" />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row items-center flex-1 border-b border-b-border dark:border-b-dark-border mt-2 relative">
          <View className="w-10 h-10 rounded-lg bg-brand/10 items-center justify-center mr-3">
            <Ionicons name='mail-outline' size={20} color="#0ea5e9" />
          </View>

          <View className="flex-1 mt-2 pr-8"> {/* pr-8 leaves space for tick */}
            <ThemedText
              variant="default"
              size="base"
              className="font-medium text-default dark:text-dark-default"
            >
              Email
            </ThemedText>
            <TextInput
              value={email}
              onChangeText={(text) => handleChangeText('email', text)}
              placeholder="example.com"
              className="border-0 bg-transparent text-text-muted dark:text-dark-text-muted text-sm text-[18px]"
            />
          </View>

          {/* ✅ Tick Icon (only shows when edited) */}
          {isEmailEdited && (
            <TouchableOpacity
              onPress={handleSave}
              className="absolute right-0 top-7" // position over input
            >
              <Ionicons name="checkmark-circle" size={22} color="#0ea5e9" />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row items-center flex-1 border-b border-b-border dark:border-b-dark-border mt-2 relative">
          <View className="w-10 h-10 rounded-lg bg-brand/10 items-center justify-center mr-3">
            <Ionicons name='phone-landscape-outline' size={20} color="#0ea5e9" />
          </View>

          <View className="flex-1 mt-2 pr-8"> {/* pr-8 leaves space for tick */}
            <ThemedText
              variant="default"
              size="base"
              className="font-medium text-default dark:text-dark-default"
            >
              Phone
            </ThemedText>
            <TextInput
              value={phone}
              onChangeText={(text) => handleChangeText('phone', text)}
              placeholder="+257 000 000 000"
              className="border-0 bg-transparent text-text-muted dark:text-dark-text-muted text-sm text-[18px]"
            />
          </View>

          {/* ✅ Tick Icon (only shows when edited) */}
          {isPhoneEdited && (
            <TouchableOpacity
              onPress={handleSave}
              className="absolute right-0 top-7" // position over input
            >
              <Ionicons name="checkmark-circle" size={22} color="#0ea5e9" />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row items-center flex-1 border-b border-b-border dark:border-b-dark-border mt-2 relative">
          <View className="w-10 h-10 rounded-lg bg-brand/10 items-center justify-center mr-3">
            <Ionicons name='lock-closed-outline' size={20} color="#0ea5e9" />
          </View>

          <View className="flex-1 mt-2 pr-8"> 
            <ThemedText
              variant="default"
              size="base"
              className="font-medium text-default dark:text-dark-default"
            >
              Password
            </ThemedText>
            <TextInput
              value={password}
              secureTextEntry
              onChangeText={(text) => handleChangeText('password', text)}
              placeholder="********"
              className="border-0 bg-transparent text-text-muted dark:text-dark-text-muted text-sm text-[18px]"
            />
          </View>

          {/* ✅ Tick Icon (only shows when edited) */}
          {isPasswordEdited && (
            <TouchableOpacity
              onPress={handleSave}
              className="absolute right-0 top-7" // position over input
            >
              <Ionicons name="checkmark-circle" size={22} color="#0ea5e9" />
            </TouchableOpacity>
          )}
        </View>

        
      </CardContent>

      <CardFooter>
       <ThemedText variant="label" size="base" className="text-text-muted dark:text-dark-text-muted">
        This is your profile. You can update your information here. Please not that this information is public. and can be seen by other users.
       </ThemedText>
      </CardFooter>
    </Card>
  );
};

//export default UserInformation;