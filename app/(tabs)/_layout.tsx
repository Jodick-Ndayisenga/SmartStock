// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import FloatingTabBar from '../../components/FloatingTabBar';
import { View } from 'react-native';

export default function TabLayout() {
  const { isDark } = useTheme();

  // ✅ NO NEED for ProtectedRoute here.
  // If the user reaches this file, app/_layout.tsx has already verified 
  // they are Authenticated AND have a Shop.

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
      <Tabs
        tabBar={props => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="products" options={{ title: 'Products' }} />
        <Tabs.Screen name="stock" options={{ title: 'Stock' }} />
        <Tabs.Screen name="sales" options={{ title: 'Sales' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </View>
  );
}