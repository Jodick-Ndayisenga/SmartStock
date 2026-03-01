// components/ProtectedRoute.tsx
import { useAuth } from "@/context/AuthContext";
import { Redirect, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireShop?: boolean;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireShop = true,
  requireAuth = true,
  fallback
}) => {
  const { 
    user, 
    loading, 
    isAuthenticated, 
    currentShop,
    sessionValidated 
  } = useAuth();
  
  const segments = useSegments();
  const [checking, setChecking] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    console.log("🛡️ ProtectedRoute Check:", {
      requireAuth,
      requireShop,
      isAuthenticated,
      hasUser: !!user,
      hasShop: !!currentShop,
      sessionValidated,
      currentPath: segments.join('/')
    });

    if (!loading) {
      // Check if access should be granted
      const hasAccess = (() => {
        // If auth is required
        if (requireAuth) {
          if (!isAuthenticated || !user) return false;
          
          // If shop is required
          if (requireShop && !currentShop) return false;
        }
        
        return true;
      })();

      setAccessGranted(hasAccess);
      setChecking(false);
    }
  }, [user, loading, isAuthenticated, currentShop, requireAuth, requireShop, sessionValidated]);

  // Show loading state
  if (loading || checking) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-soft dark:bg-dark-surface-soft">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">
          Verifying access...
        </Text>
      </View>
    );
  }

  // Access denied - redirect based on reason
  if (!accessGranted) {
    console.log("🚫 Access denied, redirecting...");
    
    if (!isAuthenticated || !user) {
      return <Redirect href="/(auth)/login" />;
    }
    
    if (requireShop && !currentShop) {
      return <Redirect href="/create-shop" />;
    }
    
    // Custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Default fallback
    return <Redirect href="/(auth)/login" />;
  }

  // Access granted
  console.log("✅ Access granted to protected route");
  return <>{children}</>;
};