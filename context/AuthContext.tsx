// context/AuthContext.tsx
import database from '@/database';
import { Membership } from '@/database/models/Membership';
import { Shop } from '@/database/models/Shop';
import { User } from '@/database/models/User';
import * as localAuth from '@/services/localAuth';
import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextValue {
  user: User | null;
  currentShop: Shop | null;
  memberships: Membership[];
  loading: boolean;
  isFirstTime: boolean;
  hasSeeds: Record<string, boolean>; // 👈 store shopId → boolean
  updateHasSeeds: (shopId: string, hasSeedValue: boolean) => Promise<void>; // ✅ changed signature
  login: (phone: string, password: string) => Promise<{ status: string } | undefined>;
  logout: () => Promise<void>;
  switchShop: (shopId: string) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  removeShop:() => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setCurrentShop: (shop: Shop) => void;
   // 👇 add these two:
  setUser: (user: User | null) => void;
  handleUserLogin: (user: User) => Promise<void>;
  hasSeedsForCurrentShop:  boolean;

  // SIMPLE Network check - Just these 3 properties
  isConnected: boolean; // Has WiFi or mobile data enabled
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown'; // Type of connection
  isWifi: boolean; // Is specifically connected via WiFi
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  USER_UID: '@magasin_user_uid',
  SHOP_ID: '@magasin_current_shop',
  FIRST_TIME: '@magasin_is_first_time',
  IS_FIRST_TIME: '@magasin_is_first_time',
  HAS_SEEDS : '@magasin_has_seeds'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [hasSeeds, setHasSeeds] = useState<Record<string, boolean>>({});

  // Simple network state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'wifi' | 'cellular' | 'none' | 'unknown'>('unknown');
  const [isWifi, setIsWifi] = useState(false);

  // SIMPLE Network check - No internet reachability test
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // Just check if device has network interface active
      setIsConnected(state.isConnected ?? false);
      
      // Check connection type
      const type = state.type;
      console.log("Connection type:", type);
      if (type === 'wifi' || type === 'cellular' || type === 'none') {
        setConnectionType(type);
      } else {
        setConnectionType('unknown');
      }
      
      // Check if specifically WiFi
      setIsWifi(state.type === 'wifi');
    });

    return () => unsubscribe();
  }, []);


  // In the init function, fix the logic:
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [savedUid, savedShopId, firstTimeFlag, savedHasSeeds] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER_UID),
          AsyncStorage.getItem(STORAGE_KEYS.SHOP_ID),
          AsyncStorage.getItem(STORAGE_KEYS.FIRST_TIME),
          AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEDS)
        ]);

        // Parse hasSeeds
        if (savedHasSeeds) {
          try {
            const parsed = JSON.parse(savedHasSeeds);
            setHasSeeds(parsed);
          } catch {
            setHasSeeds({});
          }
        }

        // Check if it's the first time
        // If FIRST_TIME doesn't exist in storage OR it's 'true', show onboarding
        const showOnboarding = !firstTimeFlag || firstTimeFlag === 'true';
        setIsFirstTime(showOnboarding);

        //console.log(savedShopId)
        // update shop using savedShopId

        if (savedShopId) {
          try {
            const shop = await database.collections.get<Shop>('shops').find(savedShopId);
            setCurrentShop(shop);
          } catch (err) {
            console.error('Failed to load saved shop:', err);
          }
        }
        
        console.log('Onboarding flag:', { 
          stored: firstTimeFlag, 
          showOnboarding,
          interpretation: showOnboarding ? 'SHOW onboarding' : 'SKIP onboarding'
        });

        // If it's the first time and no flag is set, initialize it
        if (!firstTimeFlag) {
          await AsyncStorage.setItem(STORAGE_KEYS.FIRST_TIME, 'true');
        }

        // If we should skip onboarding (user exists or onboarding completed), load user
        if (!showOnboarding && savedUid) {
          // Load user logic...
          const userCollection = database.collections.get<User>('users');
          const foundUsers = await userCollection.query(Q.where('firebase_uid', savedUid)).fetch();

          if (foundUsers.length > 0) {
            const localUser = foundUsers[0];
            setUser(localUser);
            // ... rest of user loading logic
          }
        }

      } catch (err) {
        console.error('Auth init failed:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);



  // 🔹 Login logic
  const login = async (phone: string, password: string) => {
    try {
      const user = await localAuth.loginUserLocal(phone, password);

      if (user.status === 'success' && user.user ) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_UID, user.user.firebaseUid);
      await AsyncStorage.setItem(STORAGE_KEYS.IS_FIRST_TIME, 'false');
      await handleUserLogin(user.user);

        return { status: 'success' }
        
      }
      else if(user.status === 'user_not_found') {
        return { status: 'user_not_found' }
      }else if(user.status === 'invalid_password') {
        return { status: 'invalid_password' }
      }else{
        return {status:"Error logging in"}
      }
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  // 🔹 Handle returning or created user
  const handleUserLogin = async (user: User) => {
    setUser(user);
    const membershipCollection = database.collections.get<Membership>('memberships');
    const userMemberships = await membershipCollection.query(Q.where('user_id', user.id)).fetch();
    setMemberships(userMemberships);

    if (userMemberships.length > 0) {
      const shop = await database.collections.get<Shop>('shops').find(userMemberships[0].shopId);
      setCurrentShop(shop);
      await AsyncStorage.setItem(STORAGE_KEYS.SHOP_ID, shop.id);
    }
  };

  // 🔹 Mark onboarding complete
  const completeOnboarding = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FIRST_TIME, 'false');
    setIsFirstTime(false);
    console.log('Onboarding completed');
  } catch (error) {
    console.error('Error completing onboarding:', error);
  }
};

  // 🔹 Logout
  const logout = async () => {
  try {
    setLoading(true);

    // Clear in-memory state
    setUser(null);
    setCurrentShop(null);
    setMemberships([]);

    // Clear persisted session data
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_UID,
      STORAGE_KEYS.SHOP_ID
    ]);

    // 🚫 DO NOT touch FIRST_TIME here
    // First-time onboarding should only run once per install

    router.replace('/(auth)/login');
  } catch (err) {
    console.error('Logout failed:', err);
  } finally {
    setLoading(false);
  }
};


  // 🔹 Switch shop
  const switchShop = async (shopId: string) => {
    const shop = await database.collections.get<Shop>('shops').find(shopId);
    setCurrentShop(shop);
    await AsyncStorage.setItem(STORAGE_KEYS.SHOP_ID, shopId);
  };

    // Add to AuthContext.tsx
    const skipOnboarding = async () => {
      try {
        // Mark onboarding as completed
        await AsyncStorage.setItem(STORAGE_KEYS.FIRST_TIME, 'false');
        setIsFirstTime(false);
        console.log('Onboarding skipped successfully');
      } catch (error) {
        console.error('Error skipping onboarding:', error);
      }
    };


  // update has seeds 

      const updateHasSeeds = async (shopId: string, hasSeedValue: boolean) => {
      // update state immutably
      const updated = { ...hasSeeds, [shopId]: hasSeedValue };
      setHasSeeds(updated);

      // persist
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEDS, JSON.stringify(updated));
    };

    const hasSeedsForCurrentShop = currentShop ? hasSeeds[currentShop.id] || false : false;

    const removeShop = async () => {
      setCurrentShop(null);
      await AsyncStorage.removeItem(STORAGE_KEYS.SHOP_ID);
    };



  return (
    <AuthContext.Provider
      value={{
        user,
        currentShop,
        memberships,
        loading,
        isFirstTime,
        hasSeeds,
        hasSeedsForCurrentShop,
        updateHasSeeds,
        login,
        logout,
        switchShop,
        completeOnboarding,
        setCurrentShop,
        setUser,
        handleUserLogin, // 👈 new
        removeShop,
        skipOnboarding, // when user skips onboarding page

        // Simple network properties
        isConnected,
        connectionType,
        isWifi,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
