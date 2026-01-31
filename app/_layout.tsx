// // app/_layout.tsx
// import { AuthProvider, useAuth } from "@/context/AuthContext";
// import i18nConfig from "@/language/i18nextConfig";
// import { ThemeProvider } from "@/providers/ThemeProvider";
// import { useFonts } from "expo-font";
// import {  Stack, useRouter } from "expo-router";
// import React, { useEffect } from "react";
// import { ActivityIndicator, View } from "react-native";
// //import { seedShopProducts } from "@/utils/dbSeeds";
// import "@/app/global.css";
// import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
// import "./global.css";

// function RootNavigation() {
//   const router = useRouter();
//   const { user, loading, isFirstTime, hasSeeds, currentShop } = useAuth();
//   React.useEffect(() => {
//     const addSeedsProducts = async () => {
//       if (!hasSeeds && user && currentShop) {
//         console.log(hasSeeds);
//       }
//     };

//     addSeedsProducts();
//   }, [hasSeeds, user]);

//   React.useEffect(() => {
//     if (loading) return;

//     if (!user && isFirstTime) {
//       router.replace("/(auth)/onboarding");
//     } else if (!user) {
//       router.replace("/(auth)/login");
//     } else {
//       router.replace("/(tabs)");
//     }
//   }, [user, loading, isFirstTime]);


//   if (loading) {
//     return (
//       <GluestackUIProvider mode="dark">
//         <View className="flex-1 items-center justify-center bg-surface-soft dark:bg-dark-surface-soft">
//           <ActivityIndicator size="large" />
//         </View>
//       </GluestackUIProvider>
//     );
//   }

//   return (
//     <Stack screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="(auth)" />
//       <Stack.Screen name="(tabs)" />
//       <Stack.Screen name="+not-found" />
//     </Stack>
//   );
// }

// export default function RootLayout() {
//   const [fontsLoaded, fontError] = useFonts({
//     "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
//     "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
//     "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
//     "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
//   });

//   // Initialize i18n once when app starts
//   useEffect(() => {
//     i18nConfig.initializeI18Next();
//   }, []);

//   if (!fontsLoaded && !fontError) {
//     return (
//       <View className="flex-1 items-center justify-center bg-white">
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   return (
//     <ThemeProvider>
//       <AuthProvider>
//         <RootNavigation />
//       </AuthProvider>
//     </ThemeProvider>
//   );
// }


// app/_layout.tsx
import { AuthProvider, useAuth } from "@/context/AuthContext";
import i18nConfig from "@/language/i18nextConfig";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "@/app/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "./global.css";

// ✅ Move navigation logic to a separate component
function AppContent() {
  const { user, loading, isFirstTime, hasSeedsForCurrentShop, currentShop } = useAuth();
  const router = useRouter();
  //console.log(currentShop)

  // ✅ Seed products only once per shop
  React.useEffect(() => {
    const handleSeedProducts = async () => {
      if (!hasSeedsForCurrentShop && user && currentShop) {
        try {
          // Import dynamically to avoid circular dependencies
          const { seedShopProducts } = await import("@/utils/dbSeeds");
          await seedShopProducts(currentShop.id);
          //await updateHasSeeds(currentShop.id, true);
        } catch (error) {
          console.error("Failed to seed products:", error);
        }
      }
    };

    handleSeedProducts();
  }, [hasSeedsForCurrentShop, user, currentShop]);

   // Navigation logic
  React.useEffect(() => {
    if (loading) return;

    // ✅ Force navigation based on auth state
    if (isFirstTime && !user) {
      router.replace("/(auth)/onboarding");
      return;
    }
    
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }
    
    if (user && !currentShop) {
      router.replace("/select-shop");
      return;
    }
    
    if (user && currentShop) {
      router.replace("/(tabs)");
      return;
    }
  }, [user, loading, isFirstTime, currentShop]);

  // ✅ Show loading indicator during auth initialization
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-soft dark:bg-dark-surface-soft">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
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

  // Initialize i18n
  useEffect(() => {
    i18nConfig.initializeI18Next();
  }, []);

  // Font loading
  if (!fontsLoaded && !fontError) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ✅ Wrap providers correctly
  return (
    <GluestackUIProvider mode="dark">
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </GluestackUIProvider>
  );
}