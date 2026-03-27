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
  hasSeeds: Record<string, boolean>;
  updateHasSeeds: (shopId: string, hasSeedValue: boolean) => Promise<void>;
  login: (phone: string, password: string) => Promise<{ status: string } | undefined>;
  logout: () => Promise<void>;
  switchShop: (shopId: string) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  removeShop: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setCurrentShop: (shop: Shop) => void;
  setUser: (user: User | null) => void;
  handleUserLogin: (user: User) => Promise<void>;
  hasSeedsForCurrentShop: boolean;
  
  // NEW: Authentication control properties
  isAuthenticated: boolean;
  sessionValidated: boolean;
  validateSession: () => Promise<boolean>;
  clearInvalidSession: () => Promise<void>;

  // Temporary contact selection
  tempSelectedContact: string | null;
  setTempSelectedContact: (id: string | null) => void;

  // Network check
  isConnected: boolean;
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
  isWifi: boolean;

  selectedTheme: 'light' | 'dark';
  setUserTheme: (theme: 'light' | 'dark') => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  USER_UID: '@magasin_user_uid',
  SHOP_ID: '@magasin_current_shop',
  FIRST_TIME: '@magasin_is_first_time',
  IS_FIRST_TIME: '@magasin_is_first_time',
  HAS_SEEDS: '@magasin_has_seeds',
  SESSION_EXPIRY: '@magasin_session_expiry', // NEW
  // add theme in storage
  USER_THEME: '@magasin_user_theme'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [hasSeeds, setHasSeeds] = useState<Record<string, boolean>>({});
  const [tempSelectedContact, setTempSelectedContact] = useState<string | null>(null);
  
  // NEW: Session validation state
  const [sessionValidated, setSessionValidated] = useState(false);
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null);

  // Network state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'wifi' | 'cellular' | 'none' | 'unknown'>('unknown');
  const [isWifi, setIsWifi] = useState(false);

  // Theme state
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('light');

  // Computed property for authentication status
  const isAuthenticated = !!user && sessionValidated;

  // Network check
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      const type = state.type;
      if (type === 'wifi' || type === 'cellular' || type === 'none') {
        setConnectionType(type);
      } else {
        setConnectionType('unknown');
      }
      setIsWifi(state.type === 'wifi');
    });

    return () => unsubscribe();
  }, []);

  // Clear temp selection on shop change
  useEffect(() => {
    if (currentShop) {
      setTempSelectedContact(null);
    }
  }, [currentShop]);

  // NEW: Session validation function
  const validateSession = async (): Promise<boolean> => {
    try {
      // Check if we have a saved user
      const savedUid = await AsyncStorage.getItem(STORAGE_KEYS.USER_UID);
      if (!savedUid) {
        setSessionValidated(false);
        return false;
      }

      // Check session expiry
      const expiry = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_EXPIRY);
      if (expiry) {
        const expiryTime = parseInt(expiry);
        setSessionExpiry(expiryTime);
        
        if (Date.now() > expiryTime) {
          console.log('Session expired');
          await clearInvalidSession();
          setSessionValidated(false);
          return false;
        }
      }

      // Verify user still exists in database
      if (user) {
        const userExists = await database.collections
          .get<User>('users')
          .find(user.id)
          .catch(() => null);

        if (!userExists) {
          console.log('Session invalid: User no longer exists');
          await clearInvalidSession();
          setSessionValidated(false);
          return false;
        }
      }

      setSessionValidated(true);
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      setSessionValidated(false);
      return false;
    }
  };

  // NEW: Clear invalid session
  const clearInvalidSession = async () => {
    setUser(null);
    setCurrentShop(null);
    setMemberships([]);
    setSessionValidated(false);
    setSessionExpiry(null);
    
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_UID,
      STORAGE_KEYS.SHOP_ID,
      STORAGE_KEYS.SESSION_EXPIRY
    ]);
  };

  // Enhanced init function with session validation
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [savedUid, savedShopId, firstTimeFlag, savedHasSeeds, savedExpiry, savedTheme] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER_UID),
          AsyncStorage.getItem(STORAGE_KEYS.SHOP_ID),
          AsyncStorage.getItem(STORAGE_KEYS.FIRST_TIME),
          AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEDS),
          AsyncStorage.getItem(STORAGE_KEYS.SESSION_EXPIRY),
          AsyncStorage.getItem(STORAGE_KEYS.USER_THEME)
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

        // Set session expiry if exists
        if (savedExpiry) {
          setSessionExpiry(parseInt(savedExpiry));
        }

        // Check if it's the first time
        const showOnboarding = !firstTimeFlag || firstTimeFlag === 'true';
        setIsFirstTime(showOnboarding);

        // Load shop if exists
        if (savedShopId) {
          try {
            const shop = await database.collections.get<Shop>('shops').find(savedShopId);
            setCurrentShop(shop);
          } catch (err) {
            console.error('Failed to load saved shop:', err);
          }
        }

        // Set theme
        if (typeof savedTheme === 'string' && savedTheme) {
          setSelectedTheme(savedTheme as 'light' | 'dark');
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

        // If we should skip onboarding, load user and validate session
        if (!showOnboarding && savedUid) {
          const userCollection = database.collections.get<User>('users');
          const foundUsers = await userCollection.query(Q.where('firebase_uid', savedUid)).fetch();

          if (foundUsers.length > 0) {
            const localUser = foundUsers[0];
            setUser(localUser);
            
            // Validate session after setting user
            await validateSession();
            
            // Load memberships
            const membershipCollection = database.collections.get<Membership>('memberships');
            const userMemberships = await membershipCollection.query(Q.where('user_id', localUser.id)).fetch();
            setMemberships(userMemberships);
          } else {
            // User not found in DB, clear invalid session
            await clearInvalidSession();
          }
        } else {
          // No saved user, session is invalid
          setSessionValidated(false);
        }

      } catch (err) {
        console.error('Auth init failed:', err);
        await clearInvalidSession();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Enhanced login logic with session expiry
  const login = async (phone: string, password: string) => {
    try {
      const result = await localAuth.loginUserLocal(phone, password);

      if (result.status === 'success' && result.user) {
        // Set session expiry (7 days from now)
        const expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000);
        await AsyncStorage.setItem(STORAGE_KEYS.SESSION_EXPIRY, expiryTime.toString());
        setSessionExpiry(expiryTime);
        
        await AsyncStorage.setItem(STORAGE_KEYS.USER_UID, result.user.firebaseUid);
        await AsyncStorage.setItem(STORAGE_KEYS.IS_FIRST_TIME, 'false');
        await handleUserLogin(result.user);
        
        // Validate session after login
        await validateSession();

        return { status: 'success', success:true };
      } else if (result.status === 'user_not_found') {
        return { status: 'user_not_found' };
      } else if (result.status === 'invalid_password') {
        return { status: 'invalid_password' };
      } else {
        return { status: "Error logging in" };
      }
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };


  const setUserTheme = async (theme: 'light' | 'dark') => {
    setSelectedTheme(theme);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_THEME, theme);
  }

  // 🔹 Handle returning or created user
  const handleUserLogin = async (user: User) => {
    setUser(user);
    const membershipCollection = database.collections.get<Membership>('memberships');
    const userMemberships = await membershipCollection.query(Q.where('user_id', user.id)).fetch();
  
    if (userMemberships.length > 0) {
      setMemberships(userMemberships);
      const shop = await database.collections.get<Shop>('shops').find(userMemberships[0].shopId);
      setCurrentShop(shop);
      await AsyncStorage.setItem(STORAGE_KEYS.SHOP_ID, shop.id);
    }
    
    setSessionValidated(true);
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

  // Enhanced logout
  const logout = async () => {
    try {
      setLoading(true);

      // Clear in-memory state
      setUser(null);
      setCurrentShop(null);
      setMemberships([]);
      setSessionValidated(false);
      setSessionExpiry(null);

      // Clear persisted session data
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_UID,
        STORAGE_KEYS.SHOP_ID,
        STORAGE_KEYS.SESSION_EXPIRY
      ]);

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

  // 🔹 Skip onboarding
  const skipOnboarding = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_TIME, 'false');
      setIsFirstTime(false);
      console.log('Onboarding skipped successfully');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  // Update has seeds
  const updateHasSeeds = async (shopId: string, hasSeedValue: boolean) => {
    const updated = { ...hasSeeds, [shopId]: hasSeedValue };
    setHasSeeds(updated);
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
        handleUserLogin,
        removeShop,
        skipOnboarding,
        
        // NEW: Authentication control values
        isAuthenticated,
        sessionValidated,
        validateSession,
        clearInvalidSession,

        // Network properties
        isConnected,
        connectionType,
        isWifi,
        
        // Temporary contact
        tempSelectedContact,
        setTempSelectedContact,

        selectedTheme,
        setUserTheme
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