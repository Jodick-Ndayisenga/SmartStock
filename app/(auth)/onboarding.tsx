// app/(auth)/onboarding.tsx
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { useAuth } from '@/context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);
  const { isDark } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { t } = useTranslation();
  const { skipOnboarding, completeOnboarding } = useAuth();


  // Handle scroll for animation (dots + slide fade)
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    translateX.value = event.nativeEvent.contentOffset.x;
  };

  // Update index when user stops swiping
  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(newIndex);
  };

  const navigateToAuth = async () => {
  console.log('navigateToAuth called');
  try {
    // Update onboarding state first
    await skipOnboardingPage();
    console.log('Onboarding skipped, navigating to login...');
    
    // Use replace to clear navigation stack
    router.replace('/(auth)/login');
  } catch (error) {
    console.error('Error in navigateToAuth:', error);
    // Fallback navigation
    router.replace('/(auth)/login');
  }
};

  const navigateToNext = () => {
    if (currentIndex < 3) {
      scrollRef.current?.scrollTo({
        x: (currentIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      navigateToAuth();
    }
  };

  const navigateToPrevious = () => {
    if (currentIndex > 0) {
      scrollRef.current?.scrollTo({
        x: (currentIndex - 1) * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  const skipOnboardingPage = async () => {
  console.log('skipOnboardingPage called');
  try {
    await skipOnboarding();
    console.log('skipOnboarding completed, now navigating...');
    
    // Navigate immediately after updating state
    router.replace('/(auth)/login');
  } catch (error) {
    console.error('Error in skipOnboardingPage:', error);
    // Fallback
    router.replace('/(auth)/login');
  }
};

  const slides = [
    { illustration: '📊', icon: '📦', color: '#0ea5e9' },
    { illustration: '📈', icon: '💰', color: '#22c55e' },
    { illustration: '⚡', icon: '📱', color: '#f59e0b' },
    { illustration: '🇧🇮', icon: '🏪', color: '#dc2626' },
  ];

  return (
    <View className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#0f172a' : '#ffffff'}
      />

      {/* Skip Button */}
      <TouchableOpacity
        onPress={skipOnboardingPage}
        className="absolute top-16 right-6 z-10 px-4 py-1 bg-brand rounded-full"
      >
        <Text
          className={`text-[14px] font-medium text-brand-soft dark:text-dark-brand-soft`}
        >
          {t('common.skip')}
        </Text>
      </TouchableOpacity>

      {/* Standard ScrollView with correct scroll handlers */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        scrollEnabled={true}
      >
        {slides.map((slide, index) => (
          <Slide
            key={index}
            index={index}
            translateX={translateX}
            title={t(`onboarding.slide${index + 1}.title`)}
            description={t(`onboarding.slide${index + 1}.description`)}
            illustration={slide.illustration}
            icon={slide.icon}
            color={slide.color}
          />
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View className="absolute bottom-40 w-full items-center">
        <View className="flex-row items-center">
          {slides.map((_, i) => (
            <PaginationDot key={i} index={i} translateX={translateX} />
          ))}
        </View>
      </View>

      {/* Navigation Buttons */}
      <View className="absolute bottom-10 w-full px-6">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity
            onPress={navigateToPrevious}
            className={`flex-row items-center px-6 py-3 rounded-2xl ${
              currentIndex === 0 ? 'opacity-0' : 'opacity-100'
            }`}
            disabled={currentIndex === 0}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDark ? '#94a3b8' : '#64748b'}
            />
            <Text
              className={`ml-1 text-base font-medium ${
                isDark ? 'text-dark-text-soft' : 'text-text-soft'
              }`}
            >
              {t('common.back')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={navigateToNext}
            className="flex-row items-center px-8 py-3 rounded-[4px] bg-brand shadow-button"
          >
            <Text className="text-white text-base font-semibold mr-2">
              {currentIndex === slides.length - 1
                ? t('onboarding.getStarted')
                : t('common.next')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Slide Component
const Slide = ({
  index,
  translateX,
  title,
  description,
  illustration,
  icon,
  color,
}: {
  index: number;
  translateX: any;
  title: string;
  description: string;
  illustration: string;
  icon: string;
  color: string;
}) => {
  const { isDark } = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const opacity = interpolate(
      translateX.value,
      inputRange,
      [0, 1, 0],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      translateX.value,
      inputRange,
      [100, 0, 100],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1">
      <Animated.View
        style={animatedStyle}
        className="flex-1 items-center justify-center px-8"
      >
        <View
          className={`w-64 h-64 rounded-3xl items-center justify-center mb-12 ${
            isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'
          } shadow-card`}
        >
          <View
            className="w-48 h-48 rounded-2xl items-center justify-center mb-4"
            style={{ backgroundColor: `${color}15` }}
          >
            <Text className="text-6xl mb-2">{illustration}</Text>
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center absolute -top-2 -right-2"
              style={{ backgroundColor: color }}
            >
              <Text className="text-2xl">{icon}</Text>
            </View>
          </View>
        </View>

        <View className="items-center">
          <Text
            className="text-3xl font-bold text-center mb-6 leading-tight"
            style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
          >
            {title}
          </Text>
          <Text
            className={`text-lg text-center leading-7 px-4 ${
              isDark ? 'text-dark-text-soft' : 'text-text-soft'
            }`}
          >
            {description}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

// Pagination Dot
const PaginationDot = ({ index, translateX }: any) => {
  const { isDark } = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const scale = interpolate(
      translateX.value,
      inputRange,
      [0.8, 1.2, 0.8],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      translateX.value,
      inputRange,
      [0.4, 1, 0.4],
      Extrapolate.CLAMP
    );

    const width = interpolate(
      translateX.value,
      inputRange,
      [8, 24, 8],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
      width,
    };
  });

  return (
    <Animated.View
      style={animatedStyle}
      className={`h-2 rounded-full mx-1 ${
        isDark ? 'bg-dark-brand' : 'bg-brand'
      }`}
    />
  );
};