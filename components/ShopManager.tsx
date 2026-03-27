// components/shop/ShopManager.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  TextInput,
} from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

// Components
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText, HeadingText, MutedText, CaptionText } from '@/components/ui/ThemedText';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import CustomDialog from '@/components/ui/CustomDialog';

// Database & Models
import database from '@/database';
import { Shop } from '@/database/models/Shop';
import { Membership } from '@/database/models/Membership';
import { useAuth } from '@/context/AuthContext';
import { Product } from '@/database/models/Product';

const { width } = Dimensions.get('window');

// Types
interface ShopWithDetails {
  id: string;
  name: string;
  location?: string;
  phone?: string;
  branchCode?: string;
  ownerId: string;
  memberCount: number;
  productCount: number;
  userRole: string;
  isOwner: boolean;
}

// Animated Shop Card Component
const ShopCard = ({ shop, isCurrent, onPress, onLongPress, onViewDebtors, onViewAccounts }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isCurrent) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isCurrent]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getRoleColor = () => {
    switch (shop.userRole) {
      case 'owner':
        return ['#f59e0b', '#f97316'];
      case 'manager':
        return ['#3b82f6', '#06b6d4'];
      default:
        return ['#6b7280', '#4b5563'];
    }
  };

  const getRoleIcon = () => {
    switch (shop.userRole) {
      case 'owner':
        return 'star-outline';
      case 'manager':
        return 'shield-checkmark-outline';
      default:
        return 'person-outline';
    }
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        marginBottom: 16,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={() => onLongPress && onLongPress(shop)}
        delayLongPress={500}
      >
        <Card variant="elevated" className="overflow-hidden">
          <View className="p-5 relative">
            {/* Current Shop Glow Effect */}
            {isCurrent && (
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.15],
                  }),
                  backgroundColor: '#0ea5e9',
                  borderRadius: 12,
                }}
              />
            )}

            {/* Header Section */}
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1 flex-row items-center">
                <LinearGradient
                  colors={['#0ea5e9', '#0284c7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 12 }}
                  className="w-12 h-12 items-center justify-center mr-3"
                >
                  <Ionicons name="business-outline" size={24} color="#fff" />
                </LinearGradient>
                <View className="flex-1">
                  <View className="flex-row items-center flex-wrap">
                    <HeadingText size="lg" weight="bold" className="mr-2">
                      {shop.name}
                    </HeadingText>
                    {shop.branchCode && (
                      <Badge variant="outline" size="sm">
                        {shop.branchCode}
                      </Badge>
                    )}
                  </View>
                  {shop.location && (
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="location-outline" size={14} color="#64748b" />
                      <MutedText size="xs" className="ml-1">
                        {shop.location}
                      </MutedText>
                    </View>
                  )}
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                {isCurrent && (
                  <MotiView
                    from={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' }}
                  >
                    <Badge variant="success" size="sm">
                      Current
                    </Badge>
                  </MotiView>
                )}
                <TouchableOpacity
                  onPress={() => onPress && onPress(shop)}
                  className="p-2"
                >
                  <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Role Badge */}
            <View className="flex-row items-center mb-4">
              <LinearGradient
                colors={getRoleColor()}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 20 }}
                className="px-3 py-1.5 flex-row items-center"
              >
                <Ionicons name={getRoleIcon()} size={14} color="#fff" />
                <ThemedText variant="default" size="xs" weight="medium" className="text-white ml-1">
                  {shop.userRole.charAt(0).toUpperCase() + shop.userRole.slice(1)}
                </ThemedText>
              </LinearGradient>
            </View>

            {/* Stats Section */}
            <View className="flex-row justify-between items-center pt-4 border-t border-border dark:border-dark-border">
              <View className="flex-row gap-6">
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: 100 }}
                  className="items-center"
                >
                  <ThemedText variant="brand" size="lg" weight="bold">
                    {shop.productCount}
                  </ThemedText>
                  <CaptionText>Products</CaptionText>
                </MotiView>
                
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ delay: 200 }}
                  className="items-center"
                >
                  <ThemedText variant="brand" size="lg" weight="bold">
                    {shop.memberCount}
                  </ThemedText>
                  <CaptionText>Members</CaptionText>
                </MotiView>
              </View>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={onViewDebtors}
                  className="bg-brand/10 px-4 py-2 rounded-xl flex-row items-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="people-outline" size={16} color="#0ea5e9" />
                  <ThemedText variant="brand" size="sm" weight="medium" className="ml-1">
                    Debtors
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={onViewAccounts}
                  className="bg-brand px-4 py-2 rounded-xl flex-row items-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="wallet-outline" size={16} color="#fff" />
                  <ThemedText variant="default" size="sm" weight="medium" className="text-white ml-1">
                    Accounts
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Join Shop Modal
const JoinShopModal = ({ visible, onClose, onSubmit, loading }: any) => {
  const [branchCode, setBranchCode] = useState('');

  const handleSubmit = () => {
    if (!branchCode.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    onSubmit(branchCode);
  };

  return (
    <CustomDialog
      visible={visible}
      variant="success"
      title="Join Existing Shop"
      description="Enter the branch code to join as a staff member"
      icon="person-add-outline"
      onClose={onClose}
      actions={[
        {
          label: 'Cancel',
          onPress: onClose,
          variant: 'outline',
        },
        {
          label: 'Join Shop',
          onPress: handleSubmit,
          variant: 'default',
          disabled: !branchCode.trim() || loading,
        },
      ]}
    >
      <View className="gap-4 mt-2">
        <View>
          <ThemedText variant="label" size="sm" weight="medium" className="mb-2">
            Shop Branch Code *
          </ThemedText>
          <TextInput
            value={branchCode}
            onChangeText={setBranchCode}
            placeholder="Enter branch code (e.g., SHOP123456)"
            className="border border-border dark:border-dark-border rounded-xl px-4 py-3 text-text dark:text-dark-text text-center font-mono"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <MutedText size="xs" className="text-center">
          Ask the shop owner for their branch code to join their shop
        </MutedText>
      </View>
    </CustomDialog>
  );
};

// Tips Card Component
const TipsCard = () => {
  const tips = [
    { icon: 'sync-outline', text: 'Switch between shops to manage different locations' },
    { icon: 'people-outline', text: 'Owners can add staff members to help manage the shop' },
    { icon: 'qr-code-outline', text: 'Use branch codes to easily share shop access' },
    { icon: 'stats-chart-outline', text: 'Track performance metrics for each shop separately' },
  ];

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: 500 }}
      className="mt-6"
    >
      <Card variant="filled">
        <View className="p-5">
          <View className="flex-row items-center mb-3">
            <Ionicons name="bulb-outline" size={24} color="#0ea5e9" />
            <HeadingText size="base" weight="semibold" className="ml-2">
              Pro Tips
            </HeadingText>
          </View>
          
          <View className="gap-3">
            {tips.map((tip, index) => (
              <MotiView
                key={index}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ delay: 550 + index * 50 }}
                className="flex-row items-start"
              >
                <Ionicons name={tip.icon as any} size={18} color="#0ea5e9" className="mt-0.5" />
                <MutedText size="sm" className="flex-1 ml-2">
                  {tip.text}
                </MutedText>
              </MotiView>
            ))}
          </View>
        </View>
      </Card>
    </MotiView>
  );
};

// Main Component
export default function ShopManager() {
  const { user, currentShop, switchShop, clearInvalidSession, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shops, setShops] = useState<ShopWithDetails[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedShop, setSelectedShop] = useState<ShopWithDetails | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const loadShops = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        return;
      }

      const memberships = await database.get<Membership>('memberships')
        .query(Q.where('user_id', user.id))
        .fetch();

      const shopDetails = await Promise.all(
        memberships.map(async (membership) => {
          try {
            const shop = await database.get<Shop>('shops').find(membership.shopId);
            
            const allMembers = await database.get<Membership>('memberships')
              .query(Q.where('shop_id', membership.shopId))
              .fetch();
            
            const products = await database.get<Product>('products')
              .query(
                Q.where('shop_id', membership.shopId),
                Q.where('is_active', true))
              .fetch();

            return {
              id: shop.id,
              name: shop.name,
              location: shop.location,
              phone: shop.phone,
              branchCode: shop.branchCode,
              ownerId: shop.ownerId,
              memberCount: allMembers.length,
              productCount: products.length,
              userRole: membership.role,
              isOwner: membership.role === 'owner',
            };
          } catch (error) {
            console.error('Error processing shop:', error);
            return null;
          }
        })
      );

      const validShops = shopDetails.filter(Boolean) as ShopWithDetails[];
      setShops(validShops);
      
    } catch (error) {
      console.error('Error loading shops:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadShops();
  };

  const handleJoinShop = async (branchCode: string) => {
    if (!user?.id) return;

    try {
      setSubmitting(true);
      
      const shops = await database.get<Shop>('shops')
        .query(Q.where('branch_code', branchCode.trim()))
        .fetch();

      if (shops.length === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      const shop = shops[0];

      const existingMembership = await database.get<Membership>('memberships')
        .query(
          Q.where('user_id', user.id),
          Q.where('shop_id', shop.id)
        )
        .fetch();

      if (existingMembership.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setShowJoinModal(false);
        return;
      }

      await database.write(async () => {
        await database.get<Membership>('memberships').create(membershipRecord => {
          membershipRecord.userId = user.id;
          membershipRecord.shopId = shop.id;
          membershipRecord.role = 'staff';
          membershipRecord.status = 'active';
          membershipRecord.joinedAt = Date.now();
        });
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowJoinModal(false);
      loadShops();
      
    } catch (error) {
      console.error('Error joining shop:', error);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Delete all data associated with a shop using destroyPermanently
   */

    const deleteAllShopData = async (shopId: string) => {
    const tables = [
      'transactions',
      'payments',
      'account_transactions',
      'cash_accounts',
      'contacts',
      'products',
      'stock_movements',
      'expense_categories',
      'memberships',
    ];

    try {
      // 1. Fetch all records first (outside write)
      const allRecords: any[] = [];

      for (const tableName of tables) {
        try {
          const collection = database.get(tableName);
          const records = await collection
            .query(Q.where('shop_id', shopId))
            .fetch();

          if (records.length > 0) {
            console.log(`Found ${records.length} in ${tableName}`);
            allRecords.push(...records);
          }
        } catch (error) {
          console.error(`Error fetching ${tableName}:`, error);
        }
      }

      // 2. Delete everything in ONE batch
      await database.write(async () => {
        await database.batch(
          ...allRecords.map(record => record.prepareDestroyPermanently())
        );
      });

      console.log(`Deleted ${allRecords.length} total records`);

      // 3. Cleanup session
      await clearInvalidSession();

      // ⚠️ Avoid immediate logout crash
      setTimeout(() => {
        logout();
      }, 0);

    } catch (error) {
      console.error('Error deleting shop data:', error);
    }
  };

  const handleDeleteShop = async (shop: ShopWithDetails) => {
    if (!shop.isOwner) {
      return;
    }

    setDeleting(true);
    try {
      // First, get the shop model
      const shopModel = await database.get<Shop>('shops').find(shop.id);
      
      if (!shopModel) {
        throw new Error('Shop not found');
      }
      
      // Delete all related data
      await deleteAllShopData(shop.id);
      
      // Finally, delete the shop itself
      await database.write(async () => {
        await shopModel.destroyPermanently();
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Refresh shop list
      await loadShops();
      
      // Switch to another shop if current shop was deleted
      if (currentShop?.id === shop.id) {
        const otherShops = shops.filter(s => s.id !== shop.id);
        if (otherShops.length > 0) {
          await switchShop(otherShops[0].id);
        }
      }
      
      setShowDeleteConfirm(false);
      setShowActionSheet(false);
      setSelectedShop(null);
    } catch (error) {
      console.error('Error deleting shop:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleSwitchShop = async (shop: ShopWithDetails) => {
    await switchShop(shop.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/create-shop',
      params: { id: shop.id }
    });
  };

  const showShopActions = (shop: ShopWithDetails) => {
    setSelectedShop(shop);
    setShowActionSheet(true);
  };

  const handleLeaveShop = async (shop: ShopWithDetails) => {
    if (!user?.id) return;

    try {
      const memberships = await database.get<Membership>('memberships')
        .query(
          Q.where('user_id', user.id),
          Q.where('shop_id', shop.id)
        )
        .fetch();

      if (memberships.length > 0) {
        await database.write(async () => {
          await memberships[0].destroyPermanently();
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadShops();
        
        if (currentShop?.id === shop.id && shops.length > 1) {
          const otherShop = shops.find(s => s.id !== shop.id);
          if (otherShop) {
            await switchShop(otherShop.id);
          }
        }
        
        setShowActionSheet(false);
      }
    } catch (error) {
      console.error('Error leaving shop:', error);
    }
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <Loading text="Loading your shops..." />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />
        }
      >
        <View className="py-4 px-2">
          {/* Action Buttons */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 200 }}
            className="flex-row gap-3 mb-6"
          >
            <TouchableOpacity
              onPress={() => router.push('/create-shop')}
              className="flex-1 rounded-2xl py-4 flex-row items-center justify-center overflow-hidden"
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0ea5e9', '#0284c7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
              <ThemedText variant="default" weight="semibold" className="text-white ml-2">
                Create New Shop
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowJoinModal(true)}
              className="flex-1 bg-surface dark:bg-dark-surface rounded-2xl py-4 flex-row items-center justify-center border border-border dark:border-dark-border"
              activeOpacity={0.7}
            >
              <Ionicons name="person-add-outline" size={24} color="#0ea5e9" />
              <ThemedText variant="brand" weight="semibold" className="ml-2">
                Join Shop
              </ThemedText>
            </TouchableOpacity>
          </MotiView>

          {/* Shops List */}
          {shops.length > 0 ? (
            shops.map((shop, index) => (
              <MotiView
                key={shop.id}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ delay: 300 + index * 100 }}
              >
                <ShopCard
                  shop={shop}
                  isCurrent={currentShop?.id === shop.id}
                  onPress={showShopActions}
                  onLongPress={() => handleSwitchShop(shop)}
                  onViewDebtors={() => router.push(`/shops/${shop.id}/debtors`)}
                  onViewAccounts={() => router.push({
                    pathname: '/cash-account',
                    params: { shopId: shop.id }
                  })}
                />
              </MotiView>
            ))
          ) : (
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 300 }}
            >
              <EmptyState
                icon="storefront-outline"
                title="No Shops Found"
                description="Create your first shop or join an existing one to get started"
                action={{
                  label: "Create First Shop",
                  onPress: () => router.push('/create-shop'),
                }}
              />
            </MotiView>
          )}

          {/* Tips Section */}
          {shops.length > 0 && <TipsCard />}
        </View>
      </Animated.ScrollView>

      <JoinShopModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSubmit={handleJoinShop}
        loading={submitting}
      />

      {/* Action Sheet Dialog */}
      {selectedShop && (
        <CustomDialog
          visible={showActionSheet}
          variant={selectedShop.userRole === 'owner' ? 'warning' : 'info'}
          title={selectedShop.name}
          description={`Manage ${selectedShop.name} - ${selectedShop.userRole.charAt(0).toUpperCase() + selectedShop.userRole.slice(1)} Access`}
          icon="business-outline"
          onClose={() => {
            setShowActionSheet(false);
            setSelectedShop(null);
          }}
          actions={[
            {
              label: 'Switch Shop',
              onPress: () => {
                handleSwitchShop(selectedShop);
                setShowActionSheet(false);
              },
              variant: 'default',
            },
            {
              label: 'Edit Shop',
              onPress: () => {
                router.push({
                  pathname: '/create-shop',
                  params: { shopId: selectedShop.id }
                });
                setShowActionSheet(false);
              },
              variant: 'outline',
            },
            !selectedShop.isOwner && {
              label: 'Leave Shop',
              onPress: () => {
                setShowActionSheet(false);
                handleLeaveShop(selectedShop);
              },
              variant: 'destructive',
            },
            selectedShop.isOwner && {
              label: 'Delete Shop',
              onPress: () => {
                setShowActionSheet(false);
                setShowDeleteConfirm(true);
              },
              variant: 'destructive',
            },
          ].filter(Boolean) as any}
          buttonColumn={true}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {selectedShop && (
        <CustomDialog
          visible={showDeleteConfirm}
          variant="error"
          title={`Delete ${selectedShop.name}?`}
          description={`This will permanently delete:\n\n• All products and stock movements\n• All transactions and payments\n• All accounts and account transactions\n• All customers and contacts\n• All expense categories\n• All memberships\n\nThis action cannot be undone!`}
          icon="trash-outline"
          onClose={() => setShowDeleteConfirm(false)}
          actions={[
            {
              label: 'Cancel',
              onPress: () => setShowDeleteConfirm(false),
              variant: 'outline',
            },
            {
              label: 'DELETE',
              onPress: () => handleDeleteShop(selectedShop),
              variant: 'destructive',
              disabled: deleting,
            },
          ]}
          buttonColumn={false}
          loading={deleting}
        />
      )}
    </View>
  );
}