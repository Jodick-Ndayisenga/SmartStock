import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  RefreshControl,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { ThemedText } from '@/components/ui/ThemedText';
import { EmptyState } from '@/components/ui/EmptyState';
import { TodayPerformanceWidget } from '@/components/dashboard/TodayPerformanceWidget';
import { RevenueDistributionWidget } from '@/components/dashboard/RevenueDistributionWidget';
import { SalesTrendWidget } from '@/components/dashboard/SalesTrendWidget';
import { StockHealthWidget } from '@/components/dashboard/StockHealthWidget';
import { CreditHealthWidget } from '@/components/dashboard/CreditHealthWidget';
import { QuickStatsWidget } from '@/components/dashboard/QuickStatsWidget';
import { CategoryDistributionWidget } from '@/components/dashboard/CategoryDistributionWidget';
import { PaymentMethodsWidget } from '@/components/dashboard/PaymentMethodsWidget';
import CustomDialog from '@/components/ui/CustomDialog';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useStockNotifications } from '@/hooks/useStockNotifications';
import { notificationService } from '@/services/notificationService';

export default function DashboardScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const { currentShop, user } = useAuth();
  const { showNotification } = useNotification();
  const isDark = colorScheme === 'dark';
  
  // Initialize stock notifications hook
  useStockNotifications();
  
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Create the animated event handler correctly
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [shopReady, setShopReady] = useState(!!currentShop);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  // Request notification permissions on mount
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  // Update shop ready state
  useEffect(() => {
    setShopReady(!!currentShop);
  }, [currentShop]);

  const requestNotificationPermissions = async () => {
    try {
      const initialized = await notificationService.initialize();
      setNotificationsEnabled(initialized);
      
      if (initialized) {
        console.log('✅ Notifications enabled');
        showNotification({
          type: 'success',
          title: 'Notifications Enabled',
          message: 'You will receive stock alerts when products are low or out of stock',
          duration: 3000,
        });
      } else {
        // Show custom dialog to ask for permissions
        setShowPermissionDialog(true);
      }
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await notificationService.initialize();
    setNotificationsEnabled(granted);
    setShowPermissionDialog(false);
    
    if (granted) {
      showNotification({
        type: 'success',
        title: 'Notifications Enabled',
        message: 'You will now receive stock alerts',
      });
    } else {
      // Show settings dialog
      setShowPermissionDialog(true);
    }
  };

  const handleOpenSettings = async () => {
    setShowPermissionDialog(false);
    await notificationService.openNotificationSettings();
  };

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    
    // Simulate refresh - the individual widgets will reload their data
    setTimeout(() => {
      setRefreshing(false);
      showNotification({
        type: 'success',
        title: 'Dashboard Updated',
        message: 'Latest data has been loaded',
      });
    }, 1000);
  }, []);

  // Quick actions with theme-aware gradients
  const quickActions = [
    {
      icon: 'add-circle',
      label: 'New Sale',
      gradient: isDark ? ['#16a34a', '#15803d'] : ['#22c55e', '#16a34a'],
      onPress: () => router.push('/(tabs)/sales'),
    },
    {
      icon: 'people',
      label: 'Add Customer',
      gradient: isDark ? ['#d97706', '#b45309'] : ['#f59e0b', '#d97706'],
      onPress: () => router.push(`/shops/${currentShop?.id}/contacts/add?type=customer`),
    },
    {
      icon: 'cube',
      label: 'Add Product',
      gradient: isDark ? ['#2563eb', '#1d4ed8'] : ['#3b82f6', '#2563eb'],
      onPress: () => router.push('/add-product'),
    },
    {
      icon: 'cash',
      label: 'Cash Flow',
      gradient: isDark ? ['#7c3aed', '#6d28d9'] : ['#8b5cf6', '#7c3aed'],
      onPress: () => router.push('/cash-flow'),
    },
  ];

  // No shop state
  if (!shopReady) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Dashboard" showBackButton={false} />
        <EmptyState
          icon="business-outline"
          title="No Shop Found"
          description="Create a shop first to start managing your inventory"
          action={{
            label: 'Create Shop',
            onPress: () => router.push('/(auth)/create-shop'),
          }}
        />
      </View>
    );
  }

  return (
    <>
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <Animated.View style={{ opacity: headerOpacity }}>
          <PremiumHeader
            title="HOME DASHBOARD"
            showBackButton={false}
          />
        </Animated.View>

        <Animated.ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor={isDark ? '#fff' : '#0ea5e9'}
              progressBackgroundColor={isDark ? '#1e293b' : '#ffffff'}
              colors={['#0ea5e9']}
            />
          }
        >
          <View className="py-4 px-2">
            {/* Welcome Message with spacing */}
            <View className="mb-8">
              <ThemedText variant="heading" size="3xl" className="font-bold">
                Welcome back, {user?.displayName?.split(' ')[0] || 'Shop Owner'} 👋
              </ThemedText>
              <ThemedText variant="muted" size="base">
                {currentShop?.name} • {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </ThemedText>
            </View>

            {/* Quick Actions with spacing */}
            <View className="flex-row flex-wrap justify-between mb-8">
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    action.onPress();
                  }}
                  className="w-[48%] mb-3"
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={action.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="p-4 rounded-2xl items-center"
                  >
                    <Ionicons name={action.icon as any} size={28} color="#fff" />
                    <ThemedText className="text-white font-medium mt-2">
                      {action.label}
                    </ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            {/* Today's Performance - Full width with spacing */}
            <View className="mb-8">
              <TodayPerformanceWidget />
            </View>

            {/* Quick Stats - 2x2 grid with spacing */}
            <View className="mb-8">
              <QuickStatsWidget />
            </View>

            {/* Row 1: Revenue Distribution + Sales Trend with proper gap */}
            <View className="flex-row flex-wrap mb-8">
              <View className="w-[100%] mr-[4%]">
                <RevenueDistributionWidget />
              </View>
              <View className="w-[100%] mt-4">
                <SalesTrendWidget />
              </View>
            </View>

            {/* Row 2: Payment Methods + Stock Health with proper gap */}
            <View className="flex-row flex-wrap mb-8 gap-4">
              {/* <View className="w-[100%] mr-[4%] mt-4">
                <PaymentMethodsWidget />
              </View> */}
              <View className="w-[100%]">
                <StockHealthWidget />
              </View>
            </View>

            {/* Credit Health - Full width with spacing */}
            <View className="mb-8">
              <CreditHealthWidget />
            </View>

            {/* Category Distribution - Full width with spacing */}
            <View className="mb-8">
              <CategoryDistributionWidget />
            </View>

            {/* Additional spacing for bottom navigation - increased for better scroll experience */}
            <View className="h-2" />
          </View>
        </Animated.ScrollView>
      </View>

      {/* Permission Dialog */}
      <CustomDialog
        visible={showPermissionDialog}
        title="Enable Notifications"
        description="Would you like to receive stock alerts for low and out of stock products? You'll be notified immediately when inventory needs attention."
        variant="info"
        icon="notifications-outline"
        showCancel={true}
        cancelLabel="Not Now"
        onCancel={() => setShowPermissionDialog(false)}
        actions={[
          {
            label: 'Enable',
            variant: 'default',
            onPress: handleEnableNotifications,
          },
        ]}
      />

      {/* Settings Dialog - shown if permission was denied */}
      <CustomDialog
        visible={showPermissionDialog && !notificationsEnabled && false}
        title="Permission Required"
        description="Please enable notifications in your device settings to receive stock alerts for low and out of stock products."
        variant="warning"
        icon="alert-circle-outline"
        showCancel={true}
        cancelLabel="Cancel"
        onCancel={() => setShowPermissionDialog(false)}
        actions={[
          {
            label: 'Open Settings',
            variant: 'default',
            onPress: handleOpenSettings,
          },
        ]}
      />
    </>
  );
}