// app/(auth)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';


export default function AuthLayout() {
  const { isDark } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: isDark ? 'bg-dark-surface' : 'bg-surface',
        },
        headerTintColor: isDark ? 'text-dark-text' : 'text-text',
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: isDark ? 'bg-dark-surface' : 'bg-surface',
        },
      }}
    >
      <Stack.Screen 
        name="onboarding" 
        options={{ 
          title: 'On Boarding',
          headerBackTitle: ' ',
        }} 
      />
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'Welcome Back',
          headerBackTitle: ' ',
        }} 
      />
      <Stack.Screen 
        name="register" 
        options={{ 
          title: 'Create Account',
          headerBackTitle: ' ',
        }} 
      />
    </Stack>
  );
}