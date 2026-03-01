// // app/(auth)/onboarding.tsx
// import React, { useRef, useState } from 'react';
// import { useTranslation } from 'react-i18next';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   Dimensions,
//   StatusBar,
//   ScrollView,
//   NativeSyntheticEvent,
//   NativeScrollEvent,
// } from 'react-native';
// import { Link, useRouter } from 'expo-router';
// import { useTheme } from '../../providers/ThemeProvider';
// import { Ionicons } from '@expo/vector-icons';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   interpolate,
//   Extrapolate,
//   runOnJS,
// } from 'react-native-reanimated';
// import { useAuth } from '@/context/AuthContext';

// const { width: SCREEN_WIDTH } = Dimensions.get('window');

// export default function OnboardingScreen() {
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const translateX = useSharedValue(0);
//   const { isDark } = useTheme();
//   const router = useRouter();
//   const scrollRef = useRef<ScrollView>(null);
//   const { t } = useTranslation();
//   const { skipOnboarding, completeOnboarding } = useAuth();


//   // Handle scroll for animation (dots + slide fade)
//   const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
//     translateX.value = event.nativeEvent.contentOffset.x;
//   };

//   // Update index when user stops swiping
//   const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
//     const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
//     setCurrentIndex(newIndex);
//   };

//   const navigateToAuth = async () => {
//   console.log('navigateToAuth called');
//   try {
//     // Update onboarding state first
//     await skipOnboardingPage();
//     console.log('Onboarding skipped, navigating to login...');
    
//     // Use replace to clear navigation stack
//     router.replace('/(auth)/login');
//   } catch (error) {
//     console.error('Error in navigateToAuth:', error);
//     // Fallback navigation
//     router.replace('/(auth)/login');
//   }
// };

//   const navigateToNext = () => {
//     if (currentIndex < 3) {
//       scrollRef.current?.scrollTo({
//         x: (currentIndex + 1) * SCREEN_WIDTH,
//         animated: true,
//       });
//     } else {
//       navigateToAuth();
//     }
//   };

//   const navigateToPrevious = () => {
//     if (currentIndex > 0) {
//       scrollRef.current?.scrollTo({
//         x: (currentIndex - 1) * SCREEN_WIDTH,
//         animated: true,
//       });
//     }
//   };

//   const skipOnboardingPage = async () => {
//   console.log('skipOnboardingPage called');
//   try {
//     await skipOnboarding();
//     console.log('skipOnboarding completed, now navigating...');
    
//     // Navigate immediately after updating state
//     router.replace('/(auth)/login');
//   } catch (error) {
//     console.error('Error in skipOnboardingPage:', error);
//     // Fallback
//     router.replace('/(auth)/login');
//   }
// };

//   const slides = [
//     { illustration: '📊', icon: '📦', color: '#0ea5e9' },
//     { illustration: '📈', icon: '💰', color: '#22c55e' },
//     { illustration: '⚡', icon: '📱', color: '#f59e0b' },
//     { illustration: '🇧🇮', icon: '🏪', color: '#dc2626' },
//   ];

//   return (
//     <View className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
//       <StatusBar
//         barStyle={isDark ? 'light-content' : 'dark-content'}
//         backgroundColor={isDark ? '#0f172a' : '#ffffff'}
//       />

//       {/* Skip Button */}
//       <TouchableOpacity
//         onPress={skipOnboardingPage}
//         className="absolute top-16 right-6 z-10 px-4 py-1 bg-brand rounded-full"
//       >
//         <Text
//           className={`text-[14px] font-medium text-brand-soft dark:text-dark-brand-soft`}
//         >
//           {t('common.skip')}
//         </Text>
//       </TouchableOpacity>

//       {/* Standard ScrollView with correct scroll handlers */}
//       <ScrollView
//         ref={scrollRef}
//         horizontal
//         pagingEnabled
//         showsHorizontalScrollIndicator={false}
//         onScroll={handleScroll}
//         onMomentumScrollEnd={handleMomentumScrollEnd}
//         scrollEventThrottle={16}
//         scrollEnabled={true}
//       >
//         {slides.map((slide, index) => (
//           <Slide
//             key={index}
//             index={index}
//             translateX={translateX}
//             title={t(`onboarding.slide${index + 1}.title`)}
//             description={t(`onboarding.slide${index + 1}.description`)}
//             illustration={slide.illustration}
//             icon={slide.icon}
//             color={slide.color}
//           />
//         ))}
//       </ScrollView>

//       {/* Pagination Dots */}
//       <View className="absolute bottom-40 w-full items-center">
//         <View className="flex-row items-center">
//           {slides.map((_, i) => (
//             <PaginationDot key={i} index={i} translateX={translateX} />
//           ))}
//         </View>
//       </View>

//       {/* Navigation Buttons */}
//       <View className="absolute bottom-10 w-full px-6">
//         <View className="flex-row justify-between items-center">
//           <TouchableOpacity
//             onPress={navigateToPrevious}
//             className={`flex-row items-center px-6 py-3 rounded-2xl ${
//               currentIndex === 0 ? 'opacity-0' : 'opacity-100'
//             }`}
//             disabled={currentIndex === 0}
//           >
//             <Ionicons
//               name="chevron-back"
//               size={20}
//               color={isDark ? '#94a3b8' : '#64748b'}
//             />
//             <Text
//               className={`ml-1 text-base font-medium ${
//                 isDark ? 'text-dark-text-soft' : 'text-text-soft'
//               }`}
//             >
//               {t('common.back')}
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             onPress={navigateToNext}
//             className="flex-row items-center px-8 py-3 rounded-[4px] bg-brand shadow-button"
//           >
//             <Text className="text-white text-base font-semibold mr-2">
//               {currentIndex === slides.length - 1
//                 ? t('onboarding.getStarted')
//                 : t('common.next')}
//             </Text>
//             <Ionicons name="chevron-forward" size={20} color="white" />
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   );
// }

// // Slide Component
// const Slide = ({
//   index,
//   translateX,
//   title,
//   description,
//   illustration,
//   icon,
//   color,
// }: {
//   index: number;
//   translateX: any;
//   title: string;
//   description: string;
//   illustration: string;
//   icon: string;
//   color: string;
// }) => {
//   const { isDark } = useTheme();

//   const animatedStyle = useAnimatedStyle(() => {
//     const inputRange = [
//       (index - 1) * SCREEN_WIDTH,
//       index * SCREEN_WIDTH,
//       (index + 1) * SCREEN_WIDTH,
//     ];

//     const opacity = interpolate(
//       translateX.value,
//       inputRange,
//       [0, 1, 0],
//       Extrapolate.CLAMP
//     );

//     const translateY = interpolate(
//       translateX.value,
//       inputRange,
//       [100, 0, 100],
//       Extrapolate.CLAMP
//     );

//     return {
//       opacity,
//       transform: [{ translateY }],
//     };
//   });

//   return (
//     <View style={{ width: SCREEN_WIDTH }} className="flex-1">
//       <Animated.View
//         style={animatedStyle}
//         className="flex-1 items-center justify-center px-8"
//       >
//         <View
//           className={`w-64 h-64 rounded-3xl items-center justify-center mb-12 ${
//             isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'
//           } shadow-card`}
//         >
//           <View
//             className="w-48 h-48 rounded-2xl items-center justify-center mb-4"
//             style={{ backgroundColor: `${color}15` }}
//           >
//             <Text className="text-6xl mb-2">{illustration}</Text>
//             <View
//               className="w-16 h-16 rounded-2xl items-center justify-center absolute -top-2 -right-2"
//               style={{ backgroundColor: color }}
//             >
//               <Text className="text-2xl">{icon}</Text>
//             </View>
//           </View>
//         </View>

//         <View className="items-center">
//           <Text
//             className="text-3xl font-bold text-center mb-6 leading-tight"
//             style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
//           >
//             {title}
//           </Text>
//           <Text
//             className={`text-lg text-center leading-7 px-4 ${
//               isDark ? 'text-dark-text-soft' : 'text-text-soft'
//             }`}
//           >
//             {description}
//           </Text>
//         </View>
//       </Animated.View>
//     </View>
//   );
// };

// // Pagination Dot
// const PaginationDot = ({ index, translateX }: any) => {
//   const { isDark } = useTheme();

//   const animatedStyle = useAnimatedStyle(() => {
//     const inputRange = [
//       (index - 1) * SCREEN_WIDTH,
//       index * SCREEN_WIDTH,
//       (index + 1) * SCREEN_WIDTH,
//     ];

//     const scale = interpolate(
//       translateX.value,
//       inputRange,
//       [0.8, 1.2, 0.8],
//       Extrapolate.CLAMP
//     );

//     const opacity = interpolate(
//       translateX.value,
//       inputRange,
//       [0.4, 1, 0.4],
//       Extrapolate.CLAMP
//     );

//     const width = interpolate(
//       translateX.value,
//       inputRange,
//       [8, 24, 8],
//       Extrapolate.CLAMP
//     );

//     return {
//       transform: [{ scale }],
//       opacity,
//       width,
//     };
//   });

//   return (
//     <Animated.View
//       style={animatedStyle}
//       className={`h-2 rounded-full mx-1 ${
//         isDark ? 'bg-dark-brand' : 'bg-brand'
//       }`}
//     />
//   );
// };

// app/(auth)/onboarding.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
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
import { useAuth } from '@/context/AuthContext';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  illustration: React.ReactNode;
  color: string;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const { skipOnboarding, completeOnboarding, isFirstTime } = useAuth();
  const flatListRef = useRef<any>(null);
  
  // Animation values
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Create stunning gradient backgrounds for each slide
  const slides: OnboardingSlide[] = [
    {
      id: '1',
      title: 'Welcome to\nStockMaster Pro',
      description: 'Your complete business management solution that grows with you',
      icon: 'rocket',
      gradient: isDark ? ['#1e293b', '#0f172a'] : ['#4158D0', '#C850C0'],
      color: isDark ? '#38bdf8' : '#4158D0',
      illustration: (
        <MotiView
          from={{ scale: 0.8, rotate: '0deg' }}
          animate={{ scale: 1, rotate: '360deg' }}
          transition={{ 
            type: 'spring',
            duration: 2000,
            loop: true,
          }}
          className="items-center justify-center"
        >
          <View className="w-40 h-40 rounded-full bg-brand-soft dark:bg-dark-brand-soft items-center justify-center">
            <Ionicons name="rocket" size={80} color={isDark ? '#38bdf8' : '#4158D0'} />
          </View>
        </MotiView>
      ),
    },
    {
      id: '2',
      title: 'Track Inventory\nin Real-Time',
      description: 'Never miss a sale with intelligent stock tracking and alerts',
      icon: 'cube',
      gradient: isDark ? ['#334155', '#1e293b'] : ['#FA8BFF', '#2BD2FF'],
      color: isDark ? '#4ade80' : '#FA8BFF',
      illustration: (
        <MotiView
          from={{ translateY: 0 }}
          animate={{ translateY: [-10, 10, -10] }}
          transition={{ 
            type: 'timing',
            duration: 3000,
            loop: true,
          }}
          className="items-center justify-center"
        >
          <View className="relative">
            <View className="absolute -top-10 -left-10 w-20 h-20 bg-success-soft dark:bg-dark-success-soft rounded-full" />
            <View className="absolute -bottom-5 -right-5 w-16 h-16 bg-success-soft dark:bg-dark-success-soft rounded-full" />
            <Ionicons name="cube" size={90} color={isDark ? '#4ade80' : '#FA8BFF'} />
          </View>
        </MotiView>
      ),
    },
    {
      id: '3',
      title: 'Manage Sales &\nCredit Smartly',
      description: 'Powerful tools to track sales, credit, and customer relationships',
      icon: 'card',
      gradient: isDark ? ['#4c1d1d', '#7f1d1d'] : ['#FF9A8B', '#FF6A88'],
      color: isDark ? '#f87171' : '#FF9A8B',
      illustration: (
        <View className="flex-row gap-4">
          {[1, 2, 3].map((i) => (
            <MotiView
              key={i}
              from={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                delay: i * 200,
                type: 'spring',
              }}
            >
              <View className="w-16 h-24 bg-error-soft dark:bg-dark-error-soft rounded-2xl items-center justify-center">
                <Ionicons name="card" size={30} color={isDark ? '#f87171' : '#FF9A8B'} />
              </View>
            </MotiView>
          ))}
        </View>
      ),
    },
    {
      id: '4',
      title: 'Beautiful Analytics\n& Insights',
      description: 'Make data-driven decisions with beautiful charts and reports',
      icon: 'stats-chart',
      gradient: isDark ? ['#1a4532', '#14532d'] : ['#43E97B', '#38F9D7'],
      color: isDark ? '#4ade80' : '#43E97B',
      illustration: (
        <View className="flex-row items-end gap-2">
          {[40, 70, 50, 90, 60].map((height, i) => (
            <MotiView
              key={i}
              from={{ height: 0 }}
              animate={{ height }}
              transition={{ 
                delay: i * 100,
                type: 'spring',
                loop: true,
                repeatReverse: true,
              }}
            >
              <View 
                style={{ height }} 
                className="w-6 bg-success dark:bg-dark-success rounded-t-lg"
              />
            </MotiView>
          ))}
        </View>
      ),
    },
    {
      id: '5',
      title: 'Ready to Transform\nYour Business?',
      description: 'Join thousands of successful businesses using StockMaster Pro',
      icon: 'heart',
      gradient: isDark ? ['#7f1d1d', '#4c1d1d'] : ['#FF512F', '#DD2476'],
      color: isDark ? '#f87171' : '#FF512F',
      illustration: (
        <MotiView
          from={{ scale: 1 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ 
            duration: 1000,
            loop: true,
          }}
        >
          <View className="w-40 h-40 bg-accent-soft dark:bg-dark-accent-soft rounded-full items-center justify-center">
            <Ionicons name="heart" size={80} color={isDark ? '#f87171' : '#FF512F'} />
          </View>
        </MotiView>
      ),
    },
  ];

  // Auto scroll animation
  useEffect(() => {
    const timer = setInterval(() => {
      if (currentIndex < slides.length - 1) {
        handleNext();
      }
    }, 4000);
    
    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    }
  };


  console.log( "🚀 ~ file: onboarding.tsx:30 ~ Onboarding ~ isFirstTime: ",isFirstTime)

  const handleSkip = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0.8,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      await skipOnboarding();
      router.replace('/(auth)/login');
    });
  };

  const handleGetStarted = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.8,
          useNativeDriver: true,
        }),
      ]).start(async () => {
        await completeOnboarding;
        router.replace('/(auth)/login');
      });
    });
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [50, 0, 50],
      extrapolate: 'clamp',
    });

    // Text color based on theme
    const textColor = isDark ? 'text-dark-text' : 'text-text';
    const textMutedColor = isDark ? 'text-dark-text-muted' : 'text-text-muted';

    return (
      <Animated.View 
        style={[
          { width, opacity, transform: [{ scale }, { translateY }] },
        ]}
        className="items-center justify-center px-8"
      >
        {/* Floating particles background */}
        <View className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <MotiView
              key={i}
              from={{ 
                translateX: Math.random() * width,
                translateY: Math.random() * height,
                scale: 0,
              }}
              animate={{ 
                translateX: Math.random() * width,
                translateY: Math.random() * height,
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 3000 + Math.random() * 2000,
                loop: true,
                repeatReverse: false,
              }}
            >
              <View 
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
              />
            </MotiView>
          ))}
        </View>

        {/* Main illustration */}
        <MotiView
          from={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: index * 100 }}
          className="mb-12"
        >
          {item.illustration}
        </MotiView>

        {/* Title */}
        <MotiText
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200 }}
          className={`text-4xl font-bold text-center mb-4 ${
            isDark ? 'text-dark-text' : 'text-text'
          }`}
          style={{ 
            textShadowColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)', 
            textShadowOffset: { width: 2, height: 2 }, 
            textShadowRadius: 4 
          }}
        >
          {item.title}
        </MotiText>

        {/* Description */}
        <MotiText
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 300 }}
          className={`text-lg text-center leading-6 ${
            isDark ? 'text-dark-text-soft' : 'text-text-soft'
          }`}
        >
          {item.description}
        </MotiText>

        {/* Animated dots for current slide */}
        <MotiView
          from={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 400 }}
          className="flex-row gap-2 mt-8"
        >
          {slides.map((_, i) => (
            <MotiView
              key={i}
              animate={{ 
                width: i === index ? 24 : 8,
                opacity: i === index ? 1 : 0.5,
              }}
              transition={{ type: 'spring' }}
              className={`h-2 rounded-full ${
                isDark ? 'bg-dark-brand' : 'bg-white'
              }`}
              style={i === index ? {} : { backgroundColor: isDark ? '#38bdf8' : 'rgba(255,255,255,0.5)' }}
            />
          ))}
        </MotiView>
      </Animated.View>
    );
  };

  return (
    <Animated.View 
      style={[
        { flex: 1, opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        { backgroundColor: isDark ? '#0f172a' : '#ffffff' }
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Animated gradient background */}
      <LinearGradient
        colors={slides[currentIndex].gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
        style={{ opacity: isDark ? 0.8 : 1 }}
      >
        {/* Animated overlay pattern */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          className="absolute inset-0"
        >
          <View className="flex-1">
            {[...Array(10)].map((_, i) => (
              <MotiView
                key={i}
                animate={{ 
                  rotate: ['0deg', '360deg'],
                  translateX: [0, 50, 0],
                }}
                transition={{
                  duration: 20000,
                  loop: true,
                }}
                className="absolute"
                style={{
                  top: i * 100,
                  left: i * 50,
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                }}
              />
            ))}
          </View>
        </MotiView>
      </LinearGradient>

      {/* Skip button with blur effect */}
      {currentIndex < slides.length - 1 && (
        <BlurView 
          intensity={isDark ? 20 : 30} 
          tint={isDark ? 'dark' : 'light'}
          className="absolute top-12 right-6 rounded-full overflow-hidden z-10"
        >
          <TouchableOpacity
            onPress={handleSkip}
            className="px-6 py-3"
          >
            <ThemedText className={isDark ? 'text-dark-text' : 'text-white font-medium'}>
              Skip
            </ThemedText>
          </TouchableOpacity>
        </BlurView>
      )}

      {/* Main content */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        scrollEventThrottle={16}
        className="flex-1"
      />

      {/* Bottom section with dynamic buttons */}
      <View className="absolute bottom-0 left-0 right-0 p-8">
        <MotiView
          animate={{ 
            translateY: currentIndex === slides.length - 1 ? 0 : 100,
            opacity: currentIndex === slides.length - 1 ? 1 : 0,
          }}
          transition={{ type: 'spring' }}
        >
          {/* Get Started Button with animation */}
          <TouchableOpacity
            onPress={handleGetStarted}
            activeOpacity={0.9}
          >
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <LinearGradient
                colors={isDark ? ['#1e293b', '#0f172a'] : ['#ffffff', '#f8fafc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl overflow-hidden shadow-card"
              >
                <BlurView 
                  intensity={isDark ? 10 : 20} 
                  tint={isDark ? 'dark' : 'light'} 
                  className="px-8 py-5"
                >
                  <View className="flex-row items-center justify-center gap-2">
                    <ThemedText 
                      className={`text-lg font-bold ${
                        isDark ? 'text-dark-text' : ''
                      }`}
                      style={{ color: isDark ? '#38bdf8' : slides[currentIndex].color }}
                    >
                      Get Started
                    </ThemedText>
                    <Ionicons 
                      name="arrow-forward" 
                      size={20} 
                      color={isDark ? '#38bdf8' : slides[currentIndex].color} 
                    />
                  </View>
                </BlurView>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>

          {/* Already have account */}
          <TouchableOpacity 
            onPress={handleSkip}
            className="mt-4"
          >
            <BlurView 
              intensity={isDark ? 10 : 20} 
              tint={isDark ? 'dark' : 'light'} 
              className="rounded-xl overflow-hidden"
            >
              <View className="px-6 py-3">
                <ThemedText className={`text-center ${
                  isDark ? 'text-dark-text-soft' : 'text-white/90'
                }`}>
                  Already have an account? Sign In
                </ThemedText>
              </View>
            </BlurView>
          </TouchableOpacity>
        </MotiView>

        {/* Next button for non-last slides */}
        {currentIndex < slides.length - 1 && (
          <MotiView
            animate={{ 
              translateY: currentIndex < slides.length - 1 ? 0 : 100,
              opacity: currentIndex < slides.length - 1 ? 1 : 0,
            }}
            transition={{ type: 'spring' }}
          >
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <BlurView 
                intensity={isDark ? 20 : 30} 
                tint={isDark ? 'dark' : 'light'} 
                className="rounded-2xl overflow-hidden"
              >
                <View className="px-8 py-4 flex-row items-center justify-center gap-2">
                  <ThemedText className={`font-semibold text-lg ${
                    isDark ? 'text-dark-text' : 'text-white'
                  }`}>
                    Next
                  </ThemedText>
                  <MotiView
                    animate={{ translateX: [0, 5, 0] }}
                    transition={{ 
                      duration: 1000,
                      loop: true,
                    }}
                  >
                    <Ionicons 
                      name="arrow-forward" 
                      size={20} 
                      color={isDark ? '#f1f5f9' : '#fff'} 
                    />
                  </MotiView>
                </View>
              </BlurView>
            </TouchableOpacity>
          </MotiView>
        )}
      </View>

      {/* Decorative elements */}
      <View className={`absolute top-0 left-0 w-32 h-32 rounded-full -ml-16 -mt-16 ${
        isDark ? 'bg-dark-surface-muted' : 'bg-white/10'
      }`} />
      <View className={`absolute bottom-0 right-0 w-48 h-48 rounded-full -mr-24 -mb-24 ${
        isDark ? 'bg-dark-surface-muted' : 'bg-white/10'
      }`} />
    </Animated.View>
  );
}