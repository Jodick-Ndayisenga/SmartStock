// hooks/useRequireAuth.ts
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Q } from '@nozbe/watermelondb';
import database from '@/database';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/database/models/User';

const STORAGE_KEY_USER_UID = '@magasin_user_uid';

/**
 * Ensures we have a valid authenticated user.
 * Logic:
 * - If storage key exists → user is considered logged in.
 *   - If context user missing → fetch from WatermelonDB & update.
 * - If storage key missing → force logout & redirect to login.
 */
export function useRequireAuth() {
  const { user, handleUserLogin, logout } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUid = await AsyncStorage.getItem(STORAGE_KEY_USER_UID);

        // 🔹 Case 1: No saved UID → must log out
        if (!savedUid) {
          if (user) {
            await logout();
          } else {
            router.replace('/(auth)/login');
          }
          setChecking(false);
          return;
        }

        // 🔹 Case 2: UID exists but no user in context → fetch and restore
        if (!user) {
          const userCollection = database.collections.get<User>('users');
          const foundUsers = await userCollection
            .query(Q.where('firebase_uid', savedUid))
            .fetch();

          if (foundUsers.length > 0) {
            const localUser = foundUsers[0];
            await handleUserLogin(localUser); // ✅ restores user, memberships & shop
          } else {
            // UID exists in storage but not found in DB → logout
            await logout();
            setChecking(false);
            return;
          }
        }

        // ✅ Case 3: Everything fine → continue
      } catch (err) {
        console.error('Error checking auth state:', err);
        await logout();
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, []);

  return { checking };
}
