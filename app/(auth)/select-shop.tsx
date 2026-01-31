// app/(auth)/select-shop.tsx
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import database from '@/database';
import { Shop } from '@/database/models/Shop';
import { useAuth } from "@/context/AuthContext";
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Separate ShopCard component to avoid hook errors
const ShopCard = ({ 
  shop, 
  index, 
  isSelected, 
  onSelect,
  isDark 
}: { 
  shop: Shop; 
  index: number; 
  isSelected: boolean; 
  onSelect: (shop: Shop) => void;
  isDark: boolean;
}) => {
  const scaleAnim = useState(new Animated.Value(1))[0];
  const shopColors = [
    { primary: '#0ea5e9', secondary: '#e0f2fe', icon: '🏪' },
    { primary: '#22c55e', secondary: '#dcfce7', icon: '🛒' },
    { primary: '#f59e0b', secondary: '#fef3c7', icon: '📦' },
    { primary: '#8b5cf6', secondary: '#ede9fe', icon: '💰' },
    { primary: '#ef4444', secondary: '#fee2e2', icon: '🏬' },
    { primary: '#06b6d4', secondary: '#cffafe', icon: '🛍️' },
  ];
  
  const colorSet = shopColors[index % shopColors.length];

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        shadowColor: isDark ? '#000' : colorSet.primary,
        shadowOffset: { width: 0, height: isSelected ? 8 : 4 },
        shadowOpacity: isSelected ? 0.3 : 0.15,
        shadowRadius: isSelected ? 16 : 8,
        elevation: isSelected ? 8 : 4,
      }}
    >
      <TouchableOpacity
        onPress={() => onSelect(shop)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        className={`
          relative overflow-hidden
          rounded-3xl p-6 mb-6
          ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
          border-2 ${isSelected 
            ? isDark ? 'border-dark-brand' : 'border-brand' 
            : isDark ? 'border-dark-border' : 'border-border'
          }
        `}
      >
        {/* Background decorative element */}
        <View 
          className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-10"
          style={{ backgroundColor: colorSet.primary }}
        />
        
        {/* Selected indicator */}
        {isSelected && (
          <View className="absolute top-4 right-4 z-10">
            <View className="w-8 h-8 rounded-full bg-brand dark:bg-dark-brand items-center justify-center">
              <Feather name="check" size={18} color="white" />
            </View>
          </View>
        )}

        <View className="flex-row items-start">
          {/* Shop Icon/Emoji */}
          <View 
            className="w-20 h-20 rounded-2xl items-center justify-center mr-4"
            style={{ backgroundColor: isDark ? `${colorSet.primary}20` : colorSet.secondary }}
          >
            <Text className="text-3xl">{colorSet.icon}</Text>
          </View>

          <View className="flex-1">
            {/* Shop Name */}
            <Text 
              className="text-2xl font-bold mb-2"
              style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
            >
              {shop.name}
            </Text>

            {/* Branch Code Badge */}
            {shop.branchCode && (
              <View className="flex-row items-center mb-3">
                <View 
                  className="px-3 py-1 rounded-full mr-2"
                  style={{ backgroundColor: isDark ? `${colorSet.primary}30` : colorSet.secondary }}
                >
                  <Text 
                    className="text-xs font-semibold"
                    style={{ color: colorSet.primary }}
                  >
                    {shop.branchCode}
                  </Text>
                </View>
                <Text className="text-sm text-text-muted dark:text-dark-text-muted">
                  Branch Code
                </Text>
              </View>
            )}

            {/* Shop Details */}
            <View className="space-y-2">
              <View className="flex-row items-center">
                <Ionicons 
                  name="location-outline" 
                  size={16} 
                  color={isDark ? '#94a3b8' : '#64748b'} 
                />
                <Text className="ml-2 text-sm text-text-soft dark:text-dark-text-soft">
                  {shop.location || 'No address provided'}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Ionicons 
                  name="call-outline" 
                  size={16} 
                  color={isDark ? '#94a3b8' : '#64748b'} 
                />
                <Text className="ml-2 text-sm text-text-soft dark:text-dark-text-soft">
                  {shop.phone || 'No phone number'}
                </Text>
              </View>
            </View>

            {/* Select Button */}
            <TouchableOpacity
              onPress={() => onSelect(shop)}
              className={`
                mt-4 py-3 rounded-xl items-center justify-center
                ${isSelected 
                  ? isDark ? 'bg-dark-brand' : 'bg-brand' 
                  : isDark ? 'bg-dark-surface-muted' : 'bg-surface-muted'
                }
              `}
            >
              <Text className={`
                font-semibold text-base
                ${isSelected ? 'text-white' : isDark ? 'text-dark-text-soft' : 'text-text-soft'}
              `}>
                {isSelected ? 'Entering Shop...' : 'Select Shop'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Decorative bottom border */}
        <View 
          className="absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl"
          style={{ backgroundColor: isSelected ? colorSet.primary : 'transparent' }}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SelectShopScreen() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setCurrentShop, user } = useAuth();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  const isDark = colorScheme === 'dark';

  useEffect(() => {
    loadShops();
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadShops = async () => {
    try {
      setIsLoading(true);
      const allShops = await database.get<Shop>('shops').query().fetch();
      setShops(allShops);
    } catch (error) {
      console.error('Failed to load shops', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectShop = async (shop: Shop) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedShopId(shop.id);
    
    // Visual feedback before navigation
    await new Promise(resolve => setTimeout(resolve, 150));
    
    setCurrentShop(shop);
    router.replace('/(tabs)');
  };

  if (isLoading) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'} items-center justify-center`}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
          className="items-center"
        >
          <View className="w-20 h-20 rounded-2xl bg-brand-soft dark:bg-dark-brand-soft items-center justify-center mb-6">
            <MaterialCommunityIcons 
              name="store" 
              size={36} 
              color={isDark ? '#38bdf8' : '#0ea5e9'} 
            />
          </View>
          <Text className={`text-xl font-bold mb-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
            Loading your shops...
          </Text>
          <Text className={`text-base ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
            Getting everything ready for you
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface-soft'}`}>
      {/* Animated Header */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
        className="px-6 pt-8 pb-4"
      >
        {/* User Welcome */}
        <View className="flex-row items-center mb-6">
          <View className="w-14 h-14 rounded-2xl bg-brand-soft dark:bg-dark-brand-soft items-center justify-center mr-4">
            <Ionicons 
              name="person" 
              size={24} 
              color={isDark ? '#38bdf8' : '#0ea5e9'} 
            />
          </View>
          <View>
            <Text className={`text-2xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
              Welcome back!
            </Text>
            <Text className={`text-base ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
              {user?.displayName || 'Business Owner'}
            </Text>
          </View>
        </View>

        {/* Main Title Section */}
        <View className="mb-6">
          <Text className={`text-4xl font-bold mb-3 ${isDark ? 'text-dark-text' : 'text-text'}`}>
            Select Your Shop 🏪
          </Text>
          <Text className={`text-lg ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
            Choose a shop to manage inventory, sales, and analytics
          </Text>
        </View>

        {/* Stats Cards - Fixed width issue */}
        <View className="flex-row justify-between w-full mb-6">
          {/* Total Shops Card */}
          <View className={`
            w-[48%] rounded-2xl p-5
            ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
            border ${isDark ? 'border-dark-border' : 'border-border'}
          `}>
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-3">
                <Feather name="grid" size={20} color={isDark ? '#60a5fa' : '#3b82f6'} />
              </View>
              <Text className={`text-2xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                {shops.length}
              </Text>
            </View>
            <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
              Total Shops
            </Text>
          </View>

          {/* Active Status Card */}
          <View className={`
            w-[48%] rounded-2xl p-5
            ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
            border ${isDark ? 'border-dark-border' : 'border-border'}
          `}>
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 items-center justify-center mr-3">
                <Feather name="activity" size={20} color={isDark ? '#4ade80' : '#22c55e'} />
              </View>
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                <Text className={`text-lg font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                  Active
                </Text>
              </View>
            </View>
            <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
              All shops ready
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Shop List */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
        className="flex-1 px-6"
      >
        {shops.length > 0 ? (
          <>
            <Text className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
              Your Shops ({shops.length})
            </Text>
            <FlatList
              data={shops}
              renderItem={({ item, index }) => (
                <ShopCard
                  shop={item}
                  index={index}
                  isSelected={selectedShopId === item.id}
                  onSelect={handleSelectShop}
                  isDark={isDark}
                />
              )}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
              decelerationRate="fast"
              snapToAlignment="center"
            />
          </>
        ) : (
          <View className="flex-1 items-center justify-center">
            <View className="w-48 h-48 rounded-full bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mb-8">
              <MaterialCommunityIcons 
                name="store-off-outline" 
                size={80} 
                color={isDark ? '#64748b' : '#94a3b8'} 
              />
            </View>
            <Text className={`text-2xl font-bold mb-3 text-center ${isDark ? 'text-dark-text' : 'text-text'}`}>
              No Shops Yet
            </Text>
            <Text className={`text-base text-center mb-8 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
              Create your first shop to start managing inventory and sales
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Floating Action Button for New Shop */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
        className="absolute bottom-8 right-6 z-10"
      >
        <Link href="/(auth)/create-shop" asChild>
          <TouchableOpacity
            className={`
              w-16 h-16 rounded-2xl items-center justify-center
              shadow-lg shadow-black/20
              ${isDark ? 'bg-dark-brand' : 'bg-brand'}
              border-2 ${isDark ? 'border-dark-border' : 'border-white/20'}
            `}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          >
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        </Link>
      </Animated.View>

      {/* Bottom Gradient Overlay */}
      <View className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface-soft/90 to-transparent dark:from-dark-surface/90 pointer-events-none" />

      {/* Background Pattern */}
      {!isDark && (
        <View className="absolute inset-0 pointer-events-none opacity-5">
          <Image
            source={require('@/assets/images/mon_magasin.png')}
            className="w-full h-full"
            resizeMode="repeat"
          />
        </View>
      )}
    </SafeAreaView>
  );
}