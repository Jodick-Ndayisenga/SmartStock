// app/_layout.tsx
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import i18nConfig from "@/language/i18nextConfig";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import "@/app/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { ROUTES } from "@/constants/routes";
import { allowedProtectedPrefixes } from "@/constants/allowedPaths";
import { useStockNotifications } from '@/hooks/useStockNotifications';

function AppContent() {
  const { 
    user, 
    loading, 
    isFirstTime, 
    currentShop,
    isAuthenticated,
    sessionValidated,
    validateSession 
  } = useAuth();
  
  const router = useRouter();
  const segments = useSegments();

    useStockNotifications();
  
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [navigationInProgress, setNavigationInProgress] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);

  // Debug Log
  useEffect(() => {
    console.log("🔐 Auth State Update:", { 
      user: !!user, 
      isAuthenticated, 
      hasShop: !!currentShop,
      currentPath: segments.join('/')
    });
  }, [user, isAuthenticated, currentShop, segments]);

  // PHASE 1: Validate session
  useEffect(() => {
    const checkSession = async () => {
      if (!loading && !validationAttempted) {
        console.log("🔄 Validating session...");
        try {
          await validateSession();
        } catch (err) {
          console.error("❌ Session validation failed:", err);
        } finally {
          setValidationAttempted(true);
          setInitialCheckDone(true);
        }
      }
    };
    checkSession();
  }, [loading, validationAttempted]);

  // PHASE 2: Navigation Guard
  useEffect(() => {
    if (loading || !initialCheckDone || navigationInProgress) {
      return;
    }

    const navigateToRoute = async () => {
      setNavigationInProgress(true);
      
      try {
        const currentRouteGroup = segments[0] || '';
        const currentPath = segments.join('/');
        
        const isInAuthGroup = currentRouteGroup === '(auth)';
        //const isInTabsGroup = currentRouteGroup === '(tabs)';
        
        // Check if current path matches any allowed prefix
        const isAllowedRoute = allowedProtectedPrefixes.some(prefix => 
          currentPath === prefix || currentPath.startsWith(prefix + '/') || currentPath.startsWith(prefix)
        );

        //console.log("📍 Nav Check:", { currentPath, isInAuthGroup, isAllowedRoute });

        // --- CASE 1: First time user ---
        if (isFirstTime && !user) {
          if (!isInAuthGroup) {
            router.replace(ROUTES.AUTH.ONBOARDING);
          }
          return;
        }
        
        // --- CASE 2: Not authenticated ---
        if (!isAuthenticated || !user) {
          // If trying to access an allowed route but not auth, kick to login
          if (!isInAuthGroup) {
            router.replace(ROUTES.AUTH.LOGIN);
          }
          return;
        }
        
        // --- CASE 3: Authenticated but NO shop ---
        if (isAuthenticated && user && !currentShop) {
          // Allow create-shop, but force redirect if they are elsewhere
          if (currentPath !== 'create-shop' && !isAllowedRoute) {
             router.replace(ROUTES.PROTECTED.CREATE_SHOP);
          }
          return;
        }
        
        // --- CASE 4: Fully authenticated (User + Shop) ---
        if (isAuthenticated && user && currentShop) {
          
          // ✅ CRITICAL FIX HERE:
          // We only redirect to Tabs Home if:
          // 1. They are in the generic Auth group (login/register) AND not on an allowed sub-route
          // 2. OR they are at the root '/'
          
          const shouldRedirectToHome = 
            (isInAuthGroup && !isAllowedRoute) || 
            currentPath === '' || 
            currentPath === '/';

          if (shouldRedirectToHome) {
            //console.log("🟢 Redirecting to Tabs Home");
            router.replace(ROUTES.PROTECTED.TABS);
          } else {
            //console.log("✅ Staying on allowed route:", currentPath);
          }
          return;
        }

      } catch (error) {
        console.error("🚨 Navigation error:", error);
        router.replace(ROUTES.AUTH.LOGIN);
      } finally {
        setTimeout(() => setNavigationInProgress(false), 500);
      }
    };

    navigateToRoute();
  }, [user, loading, isFirstTime, currentShop, isAuthenticated, initialCheckDone, segments]);

  // Loading UI
  if (loading || !initialCheckDone) {
    const loadingMessage = !validationAttempted ? "Securing session..." : "Loading dashboard...";
    return (
      <View className="flex-1 items-center justify-center bg-surface-soft dark:bg-dark-surface-soft">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400 font-medium">{loadingMessage}</Text>
      </View>
    );
  }



  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-shop" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
  });

  useEffect(() => { i18nConfig.initializeI18Next(); }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-dark-surface">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">Loading resources...</Text>
      </View>
    );
  }

  return (
    <GluestackUIProvider mode="dark">
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </GluestackUIProvider>
  );
}