// app/+not-found.tsx
import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import React from 'react';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page non trouvée', headerShown: false }} />
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <View className="items-center">
          <Text className="text-6xl font-bold text-gray-300">404</Text>
          <Text className="mt-4 text-2xl font-semibold text-gray-800">
            Page introuvable
          </Text>
          <Text className="mt-2 text-center text-gray-600 max-w-xs">
            Désolé, la page que vous cherchez n'existe pas ou a été déplacée.
          </Text>
          <Link href="/" className="mt-6">
            <View className="bg-blue-600 px-5 py-3 rounded-lg">
              <Text className="text-white font-medium">Retour à l'accueil</Text>
            </View>
          </Link>
        </View>
      </View>
    </>
  );
}