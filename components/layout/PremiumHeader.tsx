// components/PremiumHeader.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StatusBar,
  TextInput,
} from 'react-native';
import { useRouter} from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PremiumHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showProfile?: boolean;
  transparent?: boolean;
  elevated?: boolean;
  pathname ?: string
  onMenuPress?: () => void;
  searchable?: boolean; // 👈 NEW
  onSearch?: (query: string) => void; // 👈 NEW
  searchPlaceholder?: string; // 👈 NEW (optional)
  // add actions 
  action?:React.ReactNode
  stats?: {
    products?: number;
    sales?: number;
    revenue?: number;
  };
}

export default function PremiumHeader({
  title,
  subtitle,
  showBackButton = false,
  showProfile = true,
  transparent = false,
  elevated = true,
  pathname = '',
  onMenuPress,
  searchable = false, // 👈 default false
  onSearch,
  searchPlaceholder,
  action,
  stats,
}: PremiumHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [scrollY] = useState(new Animated.Value(0));
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  // Auto-focus search when searchable & mounted (optional)
  useEffect(() => {
    if (searchable) {
      // Delay focus to avoid Android keyboard race condition
      const focusTimeout = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(focusTimeout);
    }
  }, [searchable]);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [transparent ? 0.95 : 1, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  const getInitials = () => {
    if (user?.displayName) {
      const names = user.displayName.split(' ');
      return names.map(n => n.charAt(0).toUpperCase()).join('');
    }
    return 'NA';
  };

  const getHeaderTitle = () => {
    if (title) return title;
    const routeTitles: { [key: string]: string } = {
      '/(tabs)': t('dashboard.title'),
      '/(tabs)/index': t('dashboard.title'),
      '/(tabs)/products': t('products.title'),
      '/(tabs)/stock': t('stock.title'),
      '/(tabs)/sales': t('sales.title'),
      '/(tabs)/profile': t('profile.title'),
      '/(auth)/create-shop': t('createShop.title'),
    };
    return routeTitles[pathname] || 'StockMaster';
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleProfilePress = () => {
    router.push('/(tabs)/profile');
  };

  const handleNotificationPress = () => {
    // router.push('/(tabs)/notifications');
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    onSearch?.(text);
  };

  const displayStats = stats || {
    products: 156,
    sales: 125000,
    revenue: 2800000,
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `₣${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `₣${(amount / 1000).toFixed(0)}K`;
    return `₣${amount}`;
  };

  const isDashboard = pathname === '/(tabs)/index' || pathname === '/(tabs)' || pathname === '/';
  const bgColorHex = isDark ? '#38bdf8' : '#0ea5e9';

  return (
    <>
      <StatusBar
        animated={true}
        translucent={true}
        barStyle='light-content'
        backgroundColor={bgColorHex}
      />

      <Animated.View
        style={{
          backgroundColor: bgColorHex,
          paddingTop: insets.top,
          transform: [
            { translateY: headerTranslateY },
            { scale: headerScale },
          ],
          opacity: headerOpacity,
        }}
        className="overflow-hidden z-50 rounded-b-[10px]"
      >
        <View className={`
          pb-4 px-4
          ${transparent 
            ? 'bg-surface/95 dark:bg-dark-surface/95' 
            : 'bg-brand dark:bg-dark-brand'
          }
          ${elevated ? 'shadow-card' : ''}
          border-b-[${searchable ? '2' : '0'}px] border-b border-border/60 dark:border-dark-border/60
        `}>
          

          {/* 📌 Regular Header (title/buttons) — only if not searching */}
          <View className="flex-row items-center justify-between">
              {/* Left Section - Back Button & Title */}
              <View className="flex-row items-center flex-1">
                {showBackButton ? (
                  <TouchableOpacity
                    onPress={handleBackPress}
                    className="w-10 h-10 rounded-xl bg-surface-soft items-center justify-center mr-3 active:opacity-70 border border-border"
                  >
                    <Ionicons 
                      name="chevron-back" 
                      size={20} 
                      color='#475569'
                    />
                  </TouchableOpacity>
                ) : onMenuPress ? (
                  <TouchableOpacity
                    onPress={onMenuPress}
                    className="w-10 h-10 rounded-xl bg-surface-soft dark:bg-dark-surface-soft items-center justify-center mr-3 active:opacity-70 border border-border dark:border-dark-border"
                  >
                    <Ionicons 
                      name="menu-outline" 
                      size={20} 
                      color='#475569'
                    />
                  </TouchableOpacity>
                ) : (
                  <View className="w-10 h-10 rounded-xl bg-brand/10 items-center justify-center mr-3 border border-brand/20">
                    <Ionicons 
                      name="cube-outline" 
                      size={20} 
                      color={isDark ? '#38bdf8' : '#0ea5e9'} 
                    />
                  </View>
                )}

                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-xl font-inter-bold text-white mr-2 font-bold">
                      {getHeaderTitle()}
                    </Text>
                    {isDashboard && (
                      <View className="px-2 py-1 rounded-full bg-white">
                        <Text className="text-xs font-inter-medium text-success dark:text-dark-success">
                          {t('common.live')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Right Section - Actions */}
              <View className="flex-row items-center gap-2">
                <TouchableOpacity 
                  onPress={handleNotificationPress}
                  className="relative w-10 h-10 rounded-xl bg-surface-soft items-center justify-center active:opacity-70 border border-border"
                >
                  <Ionicons 
                    name="notifications-outline" 
                    size={18} 
                    color='#475569' 
                  />
                  <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-error border-2 border-surface items-center justify-center">
                    <Text className="text-[9px] font-inter-bold text-white">3</Text>
                  </View>
                </TouchableOpacity>
                {
                  action && (
                    <View>
                      {
                        action
                      }
                    </View>
                  )
                }

                {showProfile && user && (
                  <TouchableOpacity onPress={handleProfilePress} className="relative">
                    <View className="w-10 h-10 rounded-xl bg-brand items-center justify-center border-2 border-surface shadow-button">
                      <Text className="text-white font-inter-bold text-base">
                        {getInitials()}
                      </Text>
                    </View>
                    <View className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-success border-2 border-surface" />
                  </TouchableOpacity>
                )}

                {showProfile && !user && (
                  <TouchableOpacity
                    onPress={handleProfilePress}
                    className="px-3 py-2 rounded-lg bg-brand items-center justify-center"
                  >
                    <Text className="text-white font-inter-medium text-sm">
                      {t('common.login')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

          {/* Quick Stats Bar - Only on Dashboard & not searching */}
          {isDashboard  && (
            <Animated.View 
              style={{ opacity: headerOpacity }}
              className="flex-row justify-between items-center mt-4 px-1"
            >
              {[
                { icon: '📦', label: t('dashboard.products'), value: displayStats.products?.toString() || '0', trend: '+12%', color: 'text-brand dark:text-dark-brand' },
                { icon: '💰', label: t('dashboard.sales'), value: formatCurrency(displayStats.sales || 0), trend: '+23%', color: 'text-success dark:text-dark-success' },
                { icon: '📈', label: t('dashboard.revenue'), value: formatCurrency(displayStats.revenue || 0), trend: '+18%', color: 'text-warning dark:text-dark-warning' },
              ].map((stat, index) => (
                <View 
                  key={index} 
                  className="flex-row items-center bg-surface-soft dark:bg-dark-surface-soft rounded-lg px-3 py-2 flex-1 mx-1 border border-border dark:border-dark-border"
                >
                  <Text className="text-base mr-2">{stat.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-xs font-inter-medium text-text-muted dark:text-dark-text-muted">
                      {stat.label}
                    </Text>
                    <View className="flex-row items-baseline">
                      <Text className={`text-sm font-inter-bold ${stat.color} mr-1`}>
                        {stat.value}
                      </Text>
                      <Text className="text-xs font-inter-medium text-success dark:text-dark-success">
                        {stat.trend}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Custom Subtitle */}
          {!isDashboard  && subtitle && (
            <View className="mt-3">
              <Text className="text-sm font-inter-medium text-text-soft dark:text-dark-text-soft">
                {subtitle}
              </Text>
            </View>
          )}
        </View>
        {/* 🔍 Search Bar (if enabled) */}
          {searchable ? (
            <View className="flex-row items-center px-4 pb-2 mt-4">
              <View className="flex-1 flex-row items-center bg-surface rounded-[5px] px-4 border border-border">
                <Ionicons
                  name="search"
                  size={18}
                  color={isDark ? '#94a3b8' : '#64748b'}
                  className="mr-2"
                />
                <TextInput
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  placeholder={searchPlaceholder || t('common.search')}
                  placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                  className="flex-1 text-text font-inter-medium text-base"
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect={false}
                  selectionColor={isDark ? '#38bdf8' : '#0ea5e9'}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => handleSearchChange('')}>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={isDark ? '#64748b' : '#94a3b8'}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

        <LinearGradient
          colors={['transparent', '#e2e8f0', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="h-px w-full"
        />
      </Animated.View>
    </>
  );
}