// hooks/useAuthRedirect.ts
import { useAuth } from "@/context/AuthContext";
import { router, usePathname } from "expo-router";
import { useEffect } from "react";

/**
 * The most efficient auth redirect hook for screens
 * Automatically redirects based on authentication state
 * 
 * @example
 * // Just drop this at the top of your screen component
 * useAuthRedirect();
 */
export function useAuthRedirect() {
  const { user, loading, currentShop, isFirstTime } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Get current route group
    const isOnAuthRoute = pathname.startsWith("/(auth)");
    const isOnShopSelection = pathname.startsWith("/(shop-selection)");
    const isOnTabs = pathname.startsWith("/(tabs)");
    const isOnNotFound = pathname === "/+not-found";

    // 1. No user → redirect to login/onboarding
    if (!user) {
      if (isOnAuthRoute || isOnNotFound) return; // Already on auth route
      router.replace(isFirstTime ? "/(auth)/onboarding" : "/(auth)/login");
      return;
    }

    // 2. Has user but no shop → redirect to shop selection
    if (user && !currentShop) {
      if (isOnShopSelection || isOnNotFound) return;
      router.replace("/select-shop");
      return;
    }

    // 3. Has user and shop → should be on tabs
    if (user && currentShop) {
      if (isOnTabs || isOnNotFound) return;
      // Redirect away from auth/shop-selection routes
      if (isOnAuthRoute || isOnShopSelection) {
        router.replace("/(tabs)");
      }
    }
  }, [user, loading, currentShop, isFirstTime, pathname]);
}