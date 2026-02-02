// components/shop/ShopManager.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Components
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal as CustomModal } from '@/components/ui/Modal';

// Database & Models
import database from '@/database';
import { Shop } from '@/database/models/Shop';
import { Membership } from '@/database/models/Membership';
import { useAuth } from '@/context/AuthContext';

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
  createdAt: Date;
  updatedAt: Date;
}

interface CreateShopForm {
  name: string;
  location: string;
  phone: string;
  branchCode: string;
}

export default function ShopManager() {
  const { user, currentShop, switchShop } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shops, setShops] = useState<ShopWithDetails[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinShopCode, setJoinShopCode] = useState('');
  const [createForm, setCreateForm] = useState<CreateShopForm>({
    name: '',
    location: '',
    phone: '',
    branchCode: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Load shops data - FIXED DATA EXTRACTION
  const loadShops = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.log('No user ID available');
        return;
      }

      // Get all shops where user is a member
      const memberships = await database.get<Membership>('memberships')
        .query(Q.where('user_id', user.id))
        .fetch();

      //console.log(`Found ${memberships.length} memberships for user ${user.id}`);

      const shopDetails = await Promise.all(
        memberships.map(async (membership) => {
          try {
            // Get shop data - use find() instead of findAndObserve for simple data fetching
            const shop = await database.get<Shop>('shops').find(membership.shopId);
            
            // Extract the raw data we need from the shop model
            const shopData = {
              id: shop.id,
              name: shop.name,
              location: shop.location,
              phone: shop.phone,
              branchCode: shop.branchCode,
              ownerId: shop.ownerId,
              createdAt: shop.createdAt,
              updatedAt: shop.updatedAt,
            };

            // Get member count
            const allMembers = await database.get<Membership>('memberships')
              .query(Q.where('shop_id', membership.shopId))
              .fetch();
            
            // Get product count
            const productsCollection = database.get('products');
            const products = await productsCollection
              .query(
                Q.where('shop_id', membership.shopId),
                Q.where('is_active', true))
              .fetch();

            return {
              ...shopData,
              memberCount: allMembers.length,
              productCount: products.length,
              userRole: membership.role,
              isOwner: membership.role === 'owner'
            };
          } catch (error) {
            console.error('Error processing shop:', error);
            return null;
          }
        })
      );

      // Filter out any null results and set state
      const validShops = shopDetails.filter(Boolean) as ShopWithDetails[];
      //console.log(`Loaded ${validShops.length} valid shops`);
      setShops(validShops);
      
    } catch (error) {
      console.error('Error loading shops:', error);
      Alert.alert('Error', 'Failed to load shops');
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

  // Create new shop - FIXED with proper data extraction
  const handleCreateShop = async () => {
    if (!createForm.name.trim()) {
      Alert.alert('Error', 'Shop name is required');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      setSubmitting(true);
      
      await database.write(async () => {
        // Generate a unique branch code if not provided
        const finalBranchCode = createForm.branchCode.trim() || 
          `SHOP${Date.now().toString().slice(-6)}`;

        const shop = await database.get<Shop>('shops').create(shopRecord => {
          shopRecord.name = createForm.name.trim();
          shopRecord.location = createForm.location.trim();
          shopRecord.phone = createForm.phone.trim();
          shopRecord.branchCode = finalBranchCode;
          shopRecord.ownerId = user.id;
          shopRecord.createdAt = new Date();
          shopRecord.updatedAt = new Date();
        });

        // Create membership for owner
        await database.get<Membership>('memberships').create(membershipRecord => {
          membershipRecord.userId = user.id;
          membershipRecord.shopId = shop.id;
          membershipRecord.role = 'owner';
          membershipRecord.status = 'active';
          membershipRecord.joinedAt = Date.now();
          membershipRecord.createdAt = new Date();
          membershipRecord.updatedAt = new Date();
        });

        // Extract shop data for setting current shop
        const shopData = {
          id: shop.id,
          name: shop.name,
          location: shop.location,
          phone: shop.phone,
          branchCode: shop.branchCode,
          ownerId: shop.ownerId,
          createdAt: shop.createdAt,
          updatedAt: shop.updatedAt,
        };

        // Set as current shop
        //setCurrentShop(shopData);
        await switchShop(shop.id);

        Alert.alert('Success', `Shop "${createForm.name}" created successfully!`);
        setShowCreateModal(false);
        setCreateForm({ name: '', location: '', phone: '', branchCode: '' });
        loadShops();
        
        // Navigate to the new shop
        router.push('/(tabs)');
      });
      
    } catch (error) {
      console.error('Error creating shop:', error);
      Alert.alert('Error', 'Failed to create shop');
    } finally {
      setSubmitting(false);
    }
  };

  // Join existing shop - FIXED data extraction
  const handleJoinShop = async () => {
    if (!joinShopCode.trim()) {
      Alert.alert('Error', 'Please enter a shop code');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      setSubmitting(true);
      
      // Find shop by branch code
      const shops = await database.get<Shop>('shops')
        .query(Q.where('branch_code', joinShopCode.trim()))
        .fetch();

      if (shops.length === 0) {
        Alert.alert('Error', 'No shop found with this code');
        return;
      }

      const shop = shops[0];

      // Check if already a member
      const existingMembership = await database.get<Membership>('memberships')
        .query(
          Q.where('user_id', user.id),
          Q.where('shop_id', shop.id)
        )
        .fetch();

      if (existingMembership.length > 0) {
        Alert.alert('Info', 'You are already a member of this shop');
        setJoinShopCode('');
        return;
      }

      // Create membership
      await database.get<Membership>('memberships').create(membershipRecord => {
        membershipRecord.userId = user.id;
        membershipRecord.shopId = shop.id;
        membershipRecord.role = 'staff';
        membershipRecord.status = 'active';
        membershipRecord.joinedAt = Date.now();
        membershipRecord.createdAt = new Date();
        membershipRecord.updatedAt = new Date();
      });

      Alert.alert('Success', 'Successfully joined the shop!');
      setShowJoinModal(false);
      setJoinShopCode('');
      loadShops();
      
    } catch (error) {
      console.error('Error joining shop:', error);
      Alert.alert('Error', 'Failed to join shop');
    } finally {
      setSubmitting(false);
    }
  };

  // Switch current shop - FIXED with proper data extraction
  const handleSwitchShop = async (shop: ShopWithDetails) => {
    // Extract only the necessary shop data
    const shopData = {
      id: shop.id,
      name: shop.name,
      location: shop.location,
      phone: shop.phone,
      branchCode: shop.branchCode,
      ownerId: shop.ownerId,
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt,
    };
    
    await switchShop(shop.id);
   
    router.push({
      pathname: '/(auth)/create-shop',
      params: { id: shop.id }
    });
  };

  // Show shop actions
  const showShopActions = (shop: ShopWithDetails) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Switch to this Shop', 'View Details', 'Manage Members', shop.isOwner ? 'Delete Shop' : 'Leave Shop'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: shop.isOwner ? 4 : 3,
        },
        (buttonIndex) => {
          handleActionSelection(buttonIndex, shop);
        }
      );
    } else {
      // For Android, show a simple switch option for now
      handleSwitchShop(shop);
    }
  };

  const handleActionSelection = (buttonIndex: number, shop: ShopWithDetails) => {
    switch (buttonIndex) {
      case 1:
        handleSwitchShop(shop);
        break;
      case 2:
        // View Details - navigate to shop details page
        router.push({
          pathname: '/create-shop',
          params: { shopId: shop.id }
        });
        break;
      case 3:
        if (shop.isOwner) {
          // Manage Members - navigate to members page
          router.push({
            pathname: '/shop-members',
            params: { shopId: shop.id }
          });
        } else {
          handleLeaveShop(shop);
        }
        break;
      case 4:
        if (shop.isOwner) {
          handleDeleteShop(shop);
        }
        break;
    }
  };

  // Leave shop - FIXED data handling
  const handleLeaveShop = async (shop: ShopWithDetails) => {
    Alert.alert(
      'Leave Shop',
      `Are you sure you want to leave ${shop.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const memberships = await database.get<Membership>('memberships')
                .query(
                  Q.where('user_id', user?.id || ''),
                  Q.where('shop_id', shop.id)
                )
                .fetch();

              if (memberships.length > 0) {
                await database.write(async () => {
                  await memberships[0].markAsDeleted();
                });

                Alert.alert('Success', `You have left ${shop.name}`);
                loadShops();
                
                // If this was the current shop, switch to another one
                if (currentShop?.id === shop.id && shops.length > 1) {
                  const otherShop = shops.find(s => s.id !== shop.id);
                  if (otherShop) {
                    handleSwitchShop(otherShop);
                  }
                }
              }
            } catch (error) {
              console.error('Error leaving shop:', error);
              Alert.alert('Error', 'Failed to leave shop');
            }
          }
        }
      ]
    );
  };

  // Delete shop (owner only) - FIXED data handling
  const handleDeleteShop = async (shop: ShopWithDetails) => {
    if (!shop.isOwner) return;

    Alert.alert(
      'Delete Shop',
      `Are you sure you want to delete ${shop.name}? This will remove all products and data associated with this shop. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // First, get the actual shop model to delete
              const shopModel = await database.get<Shop>('shops').find(shop.id);
              
              await database.write(async () => {
                await shopModel.markAsDeleted();
              });

              Alert.alert('Success', 'Shop deleted successfully');
              loadShops();
              
              // If this was the current shop, switch to another one
              if (currentShop?.id === shop.id && shops.length > 1) {
                const otherShop = shops.find(s => s.id !== shop.id);
                if (otherShop) {
                  handleSwitchShop(otherShop);
                }
              }
            } catch (error) {
              console.error('Error deleting shop:', error);
              Alert.alert('Error', 'Failed to delete shop');
            }
          }
        }
      ]
    );
  };

  // Render shop card
  const ShopCard = ({ shop }: { shop: ShopWithDetails }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <ThemedText variant="subheading" size="lg" className="flex-1">
                {shop.name}
              </ThemedText>
              {currentShop?.id === shop.id && (
                <Badge variant="success" size="sm" className="ml-2">
                  Current
                </Badge>
              )}
            </View>
            
            {shop.branchCode && (
              <ThemedText variant="muted" size="sm" className="mb-1">
                Code: {shop.branchCode}
              </ThemedText>
            )}
            
            {shop.location && (
              <ThemedText variant="muted" size="sm" className="mb-1">
                📍 {shop.location}
              </ThemedText>
            )}
            
            {shop.phone && (
              <ThemedText variant="muted" size="sm">
                📞 {shop.phone}
              </ThemedText>
            )}
          </View>

          <TouchableOpacity
            onPress={() => showShopActions(shop)}
            className="p-2"
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between items-center pt-3 border-t border-border dark:border-dark-border">
          <View className="flex-row gap-4">
            <View className="items-center">
              <ThemedText variant="brand" size="sm" className="font-semibold">
                {shop.productCount}
              </ThemedText>
              <ThemedText variant="muted" size="xs">
                Products
              </ThemedText>
            </View>
            
            <View className="items-center">
              <ThemedText variant="brand" size="sm" className="font-semibold">
                {shop.memberCount}
              </ThemedText>
              <ThemedText variant="muted" size="xs">
                Members
              </ThemedText>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <Badge 
              variant={
                shop.userRole === 'owner' ? 'success' : 
                shop.userRole === 'manager' ? 'warning' : 'default'
              }
              size="sm"
            >
              {shop.userRole}
            </Badge>
            
            <Button
              onPress={() => router.push({
                pathname: '/(auth)/cash-account',
                params: { shopId: shop.id }
              })}
              variant="default"
              size="sm"
              icon='add'
            >
              add account 
            </Button>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View className="p-4">
        <Loading text="Loading shops..." />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="p-4 border-b border-border dark:border-dark-border">
        <ThemedText variant="heading" size="xl" className="mb-1">
          My Shops
        </ThemedText>
        <ThemedText variant="muted">
          Manage your shops and access levels
        </ThemedText>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="p-4">
          {/* Action Buttons */}
          <View className="flex-row gap-3 mb-6">
            <Button
              variant="default"
              onPress={() => router.push('/(auth)/create-shop')}
              icon="business-outline"
              className="flex-1"
            >
              Create New Shop
            </Button>
            
            <Button
              variant="outline"
              onPress={() => setShowJoinModal(true)}
              icon="person-add-outline"
              className="flex-1"
            >
              Join Shop
            </Button>
          </View>

          {/* Shops List */}
          {shops.length > 0 ? (
            shops.map(shop => (
              <ShopCard key={shop.id} shop={shop} />
            ))
          ) : (
            <EmptyState
              icon="storefront-outline"
              title="No Shops Found"
              description="Create your first shop or join an existing one to get started"
              action={{
                label: "Create First Shop",
                onPress: () => router.push('/(auth)/create-shop'),
              }}
            />
          )}

          {/* Info Section */}
          {shops.length > 0 && (
            <Card className="mt-6">
              <CardContent className="p-4">
                <ThemedText variant="subheading" size="base" className="mb-2">
                  💡 Shop Management Tips
                </ThemedText>
                <ThemedText variant="muted" size="sm" className="mb-1">
                  • Switch between shops to manage different locations
                </ThemedText>
                <ThemedText variant="muted" size="sm" className="mb-1">
                  • Owners can add staff members to help manage the shop
                </ThemedText>
                <ThemedText variant="muted" size="sm">
                  • Use branch codes to easily share shop access
                </ThemedText>
              </CardContent>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Join Shop Modal */}
      <CustomModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Join Existing Shop"
        action={{
          label: "Join Shop",
          onPress: handleJoinShop,
          variant: "default"
        }}
      >
        <View className="space-y-4">
          <Input
            label="Shop Branch Code"
            placeholder="Enter shop branch code"
            value={joinShopCode}
            onChangeText={setJoinShopCode}
          />
          
          <ThemedText variant="muted" size="sm">
            Ask the shop owner for their branch code to join their shop as staff.
          </ThemedText>
        </View>
      </CustomModal>

      {/* Loading overlay for submissions */}
      {submitting && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center">
          <Loading text={"Joining shop..."} />
        </View>
      )}
    </View>
  );
}