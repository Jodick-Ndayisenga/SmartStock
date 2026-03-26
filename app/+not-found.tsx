// app/+not-found.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MotiView, MotiText } from 'moti';

// Components
import { ThemedText } from '@/components/ui/ThemedText';
import { useColorScheme } from 'nativewind';

const { width, height } = Dimensions.get('window');

export default function NotFoundScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animation values
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        // Floating animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(floatAnim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(floatAnim, {
              toValue: 0,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ),
        // Rotation animation
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ),
        // Bounce animation for emojis
        Animated.loop(
          Animated.sequence([
            Animated.timing(bounceAnim, {
              toValue: 1,
              duration: 500,
              easing: Easing.bounce,
              useNativeDriver: true,
            }),
            Animated.timing(bounceAnim, {
              toValue: 0,
              duration: 500,
              easing: Easing.bounce,
              useNativeDriver: true,
            }),
          ])
        ),
      ]),
    ]).start();
  }, []);

  const float = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg'],
  });

  const bounce = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -20, 0],
  });

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  };

  const handleGoHome = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.replace('/(tabs)');
    });
  };

  return (
    <LinearGradient
      colors={
        isDark 
          ? ['#1e293b', '#0f172a'] 
          : ['#f8fafc', '#f1f5f9']
      }
      className="flex-1"
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Animated background particles */}
      <View className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: isDark ? '#334155' : '#cbd5e1',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              transform: [
                { 
                  translateY: floatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.random() * 100 - 50],
                  }) 
                },
                {
                  scale: bounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.5],
                  }),
                },
              ],
              opacity: 0.3,
            }}
          />
        ))}
      </View>

      <Animated.View 
        style={{ 
          flex: 1,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
        className="items-center justify-center px-6"
      >
        {/* 404 Number with floating effect */}
        <Animated.View style={{ transform: [{ translateY: float }] }}>
          <View className="flex-row items-center justify-center">
            <MotiView
              from={{ opacity: 0, scale: 0, rotate: '0deg' }}
              animate={{ opacity: 1, scale: 1, rotate: '360deg' }}
              transition={{ 
                type: 'spring',
                delay: 200,
                duration: 1000,
              }}
            >
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                className="w-24 h-24 rounded-3xl items-center justify-center mr-2"
                style={{ transform: [{ rotate: '-5deg' }] }}
              >
                <ThemedText className="text-6xl font-bold text-white">4</ThemedText>
              </LinearGradient>
            </MotiView>

            <MotiView
              from={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: [1, 1.2, 1] }}
              transition={{ 
                type: 'spring',
                delay: 400,
                duration: 1000,
                loop: true,
              }}
            >
              <BlurView 
                intensity={40} 
                tint={isDark ? 'dark' : 'light'}
                className="w-28 h-28 rounded-3xl items-center justify-center mx-2 overflow-hidden"
              >
                <Animated.View style={{ transform: [{ rotate }] }}>
                  <Ionicons 
                    name="sad-outline" 
                    size={64} 
                    color={isDark ? '#f1f5f9' : '#0f172a'} 
                  />
                </Animated.View>
              </BlurView>
            </MotiView>

            <MotiView
              from={{ opacity: 0, scale: 0, rotate: '0deg' }}
              animate={{ opacity: 1, scale: 1, rotate: '360deg' }}
              transition={{ 
                type: 'spring',
                delay: 600,
                duration: 1000,
              }}
            >
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                className="w-24 h-24 rounded-3xl items-center justify-center ml-2"
                style={{ transform: [{ rotate: '5deg' }] }}
              >
                <ThemedText className="text-6xl font-bold text-white">4</ThemedText>
              </LinearGradient>
            </MotiView>
          </View>
        </Animated.View>

        {/* Title with animation */}
        <MotiText
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 800 }}
          className={`text-3xl font-bold mt-8 text-center ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          Oops! Page Not Found
        </MotiText>

        {/* Description with animation */}
        <MotiText
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 1000 }}
          className={`text-lg text-center mt-4 leading-6 ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}
        >
          The page you're looking for seems to have vanished into thin air! 
          It might have been moved, deleted, or never existed.
        </MotiText>

        {/* Fun emoji row */}
        <MotiView
          from={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1200, type: 'spring' }}
          className="flex-row gap-4 mt-8"
        >
          {['🔍', '🌙', '✨', '🚀', '💫'].map((emoji, index) => (
            <Animated.View
              key={index}
              style={{ transform: [{ translateY: bounce }] }}
            >
              <BlurView 
                intensity={30} 
                tint={isDark ? 'dark' : 'light'}
                className="w-12 h-12 rounded-2xl items-center justify-center overflow-hidden"
              >
                <ThemedText className="text-2xl">{emoji}</ThemedText>
              </BlurView>
            </Animated.View>
          ))}
        </MotiView>

        {/* Action buttons */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 1400 }}
          className="w-full mt-12 gap-4"
        >
          {/* Go Back Button */}
          <TouchableOpacity
            onPress={handleGoBack}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isDark ? ['#334155', '#1e293b'] : ['#ffffff', '#f8fafc']}
              className="rounded-2xl overflow-hidden border border-border dark:border-dark-border"
            >
              <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} className="px-8 py-4">
                <View className="flex-row items-center justify-center gap-2">
                  <Ionicons 
                    name="arrow-back" 
                    size={20} 
                    color={isDark ? '#f1f5f9' : '#0f172a'} 
                  />
                  <ThemedText 
                    className={`text-lg font-semibold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    Go Back
                  </ThemedText>
                </View>
              </BlurView>
            </LinearGradient>
          </TouchableOpacity>

          {/* Go Home Button */}
          <TouchableOpacity
            onPress={handleGoHome}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#0ea5e9', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-2xl overflow-hidden"
            >
              <BlurView intensity={20} tint="light" className="px-8 py-4">
                <View className="flex-row items-center justify-center gap-2">
                  <Ionicons name="home" size={20} color="#fff" />
                  <ThemedText className="text-lg font-semibold text-white">
                    Go Home
                  </ThemedText>
                </View>
              </BlurView>
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>

        {/* Help text */}
        <MotiText
          from={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1600 }}
          className={`text-sm text-center mt-8 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          Need help? Contact our support team
        </MotiText>
      </Animated.View>

      {/* Decorative elements */}
      <View className="absolute top-0 left-0 w-32 h-32 bg-brand/10 rounded-full -ml-16 -mt-16" />
      <View className="absolute bottom-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full -mr-24 -mb-24" />
      <View className="absolute top-1/2 right-0 w-24 h-24 bg-yellow-500/10 rounded-full" />
    </LinearGradient>
  );
}