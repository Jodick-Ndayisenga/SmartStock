// components/PremiumHeader.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StatusBar,
  TextInput,
  Dimensions,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PremiumHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showProfile?: boolean;
  transparent?: boolean;
  elevated?: boolean;
  pathname?: string;
  onMenuPress?: () => void;
  searchable?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  action?: React.ReactNode;
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
  searchable = false,
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

  // Auto-focus search when enabled
  useEffect(() => {
    if (searchable) {
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
    outputRange: [0, -10],
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
      '/(auth)/create-shop': 'Create Shop',
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

  // Gradient colors as tuples (fix for TypeScript error)
  const gradientColors: [string, string] = isDark 
    ? ['#38bdf8', '#818cf8'] 
    : ['#0ea5e9', '#6366f1'];

  return (
    <>
      <StatusBar
        animated={true}
        translucent={true}
        barStyle="light-content"
        backgroundColor="transparent"
      />

      <Animated.View
        style={{
          transform: [{ translateY: headerTranslateY }],
          opacity: headerOpacity,
        }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-b-3xl overflow-hidden pt-12"
          style={{
            shadowColor: isDark ? '#38bdf8' : '#0ea5e9',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View className="px-4 pb-5">
            {/* Main Header Row */}
            <View className="flex-row items-center justify-between">
              {/* Left Section */}
              <View className="flex-row items-center">
                {showBackButton ? (
                  <MotiView
                    from={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', delay: 100 }}
                  >
                    <TouchableOpacity
                      onPress={handleBackPress}
                      className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center active:opacity-70"
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-back" size={22} color="#ffffff" />
                    </TouchableOpacity>
                  </MotiView>
                ) : onMenuPress ? (
                  <MotiView
                    from={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', delay: 100 }}
                  >
                    <TouchableOpacity
                      onPress={onMenuPress}
                      className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center active:opacity-70"
                      activeOpacity={0.7}
                    >
                      <Ionicons name="menu-outline" size={22} color="#ffffff" />
                    </TouchableOpacity>
                  </MotiView>
                ) : (
                  <MotiView
                    from={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', delay: 100 }}
                    className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center"
                  >
                    <Ionicons name="cube-outline" size={22} color="#ffffff" />
                  </MotiView>
                )}

                <MotiView
                  from={{ translateX: -20, opacity: 0 }}
                  animate={{ translateX: 0, opacity: 1 }}
                  transition={{ type: 'spring', delay: 150 }}
                  className="ml-3"
                >
                  <Text className="text-white text-2xl font-bold tracking-tight">
                    {getHeaderTitle()}
                  </Text>
                  {subtitle && (
                    <Text className="text-white/80 text-sm mt-0.5">
                      {subtitle}
                    </Text>
                  )}
                </MotiView>
              </View>

              {/* Right Section */}
              <View className="flex-row items-center gap-2">
                {/* Live Badge for Dashboard */}
                {isDashboard && (
                  <MotiView
                    from={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 200 }}
                    className="px-2 py-1 rounded-full bg-white/20"
                  >
                    <Text className="text-white text-xs font-medium">LIVE</Text>
                  </MotiView>
                )}

                {/* Custom Action */}
                {action && (
                  <MotiView
                    from={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', delay: 250 }}
                  >
                    {action}
                  </MotiView>
                )}

                {/* Profile Button */}
                {showProfile && user && (
                  <MotiView
                    from={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', delay: 300 }}
                  >
                    <TouchableOpacity
                      onPress={handleProfilePress}
                      className="relative"
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={['#ffffff', '#f0f0f0']}
                        className="w-10 h-10 rounded-xl items-center justify-center"
                        style={{ borderRadius: 50 }}
                      >
                        {
                          user.imageUrl ? (
                            <Image
                              source={{ uri: user.imageUrl }}
                              className="w-10 h-10 rounded-full object-contain"
                              style={{borderRadius: 50}}
                            />
                          ) : (
                        <Text className="text-brand font-bold text-base">
                          {getInitials()}
                        </Text>
                          )
                        }
                      </LinearGradient>
                      <View className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-success border-2 border-white" />
                    </TouchableOpacity>
                  </MotiView>
                )}
              </View>
            </View>

            {/* Stats Bar - Dashboard Only */}
            {isDashboard && (
              <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 350 }}
                className="flex-row justify-between mt-5 gap-2"
              >
                {[
                  { 
                    icon: '📦', 
                    label: 'Products', 
                    value: displayStats.products?.toString() || '0',
                    trend: '+12%',
                  },
                  { 
                    icon: '💰', 
                    label: 'Sales', 
                    value: formatCurrency(displayStats.sales || 0),
                    trend: '+23%',
                  },
                  { 
                    icon: '📈', 
                    label: 'Revenue', 
                    value: formatCurrency(displayStats.revenue || 0),
                    trend: '+18%',
                  },
                ].map((stat, index) => (
                  <View 
                    key={index} 
                    className="flex-1 bg-white/15 rounded-2xl px-3 py-2.5 flex-row items-center"
                  >
                    <Text className="text-xl mr-2">{stat.icon}</Text>
                    <View className="flex-1">
                      <Text className="text-white/70 text-xs font-medium">
                        {stat.label}
                      </Text>
                      <View className="flex-row items-baseline">
                        <Text className="text-white text-sm font-bold mr-1">
                          {stat.value}
                        </Text>
                        <Text className="text-white/60 text-[10px]">
                          {stat.trend}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </MotiView>
            )}

            {/* Subtitle for non-dashboard */}
            {!isDashboard && subtitle && (
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 250 }}
                className="mt-3"
              >
                <Text className="text-white/80 text-sm">
                  {subtitle}
                </Text>
              </MotiView>
            )}
          </View>

          {/* Search Bar */}
          {searchable && (
            <MotiView
              from={{ opacity: 0, translateY: -10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 400 }}
              className="px-4 pb-4"
            >
              <View className="bg-white/95 dark:bg-dark-surface rounded-2xl flex-row items-center px-4 py-2.5 shadow-sm">
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={isDark ? '#94a3b8' : '#64748b'}
                />
                <TextInput
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  placeholder={searchPlaceholder || 'Search...'}
                  placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                  className="flex-1 ml-3 text-text dark:text-dark-text text-base font-medium"
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect={false}
                  selectionColor={isDark ? '#38bdf8' : '#0ea5e9'}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => handleSearchChange('')}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={isDark ? '#94a3b8' : '#64748b'}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            </MotiView>
          )}

          {/* Bottom Decorative Line */}
          <View className="h-0.5 bg-white/20 mx-4" />
        </LinearGradient>
      </Animated.View>
    </>
  );
}