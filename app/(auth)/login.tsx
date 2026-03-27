// app/(auth)/login.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Input, PhoneInput } from '../../components/ui/Input';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MotiView, MotiText } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ui/ThemedText';
import { useColorScheme } from 'nativewind';

const { width } = Dimensions.get('window');

// EAC Countries Configuration
interface CountryCode {
  name: string;
  code: string;
  flag: string;
}

const EAC_COUNTRIES: CountryCode[] = [
  { name: 'Burundi', code: '+257', flag: '🇧🇮' },
  { name: 'Kenya', code: '+254', flag: '🇰🇪' },
  { name: 'Tanzania', code: '+255', flag: '🇹🇿' },
  { name: 'Uganda', code: '+256', flag: '🇺🇬' },
  { name: 'Rwanda', code: '+250', flag: '🇷🇼' },
  { name: 'DRC', code: '+243', flag: '🇨🇩' },
  { name: 'South Sudan', code: '+211', flag: '🇸🇸' },
];

export default function LoginScreen() {
  const { login, isAuthenticated, loading: authLoading , selectedTheme} = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+257'); // Default Burundi
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const {colorScheme, setColorScheme} = useColorScheme();

    useEffect(() => {
    if (selectedTheme) {
      setColorScheme(selectedTheme);
    }
  }, [selectedTheme]);


  const isDark = colorScheme === 'dark';

  
  const router = useRouter();

  //console.log(isDark)

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 15,
        stiffness: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, authLoading]);

  const getSelectedCountry = () => 
    EAC_COUNTRIES.find(c => c.code === countryCode) || EAC_COUNTRIES[0];

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    const cleanedPhone = phone.replace(/\D/g, '');

    if (!cleanedPhone) {
      newErrors.phone = 'Phone number is required';
    } else if (cleanedPhone.length < 8) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setErrors({}); // Clear previous errors
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const cleanedPhone = phone.replace(/\D/g, '');
      const fullPhone = `${countryCode}${cleanedPhone}`;

      // Call context login function
      const result = await login(fullPhone, password);

      if (result?.status === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigation is handled by the AuthContext useEffect watching 'isAuthenticated'
      } else if (result?.status === 'invalid_password') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrors({ form: 'Incorrect password. Please try again.' });
      } else if (result?.status === 'user_not_found') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrors({ form: 'No account found with this number.' });
      } else {
        throw new Error('Login failed');
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors({ form: error.message || 'Connection error. Please check your internet.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    //setIsForgotModalVisible(true);
    //setResetEmail('');
    router.push('/forgot-password');
  };

  const submitResetRequest = () => {
    if (!resetEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    // TODO: Implement actual reset logic with your backend
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', `Password reset link sent to ${resetEmail}`);
    setIsForgotModalVisible(false);
  };

  if (authLoading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
        <ActivityIndicator size="large" color={isDark ? '#38bdf8' : '#0ea5e9'} />
        <Text className={`mt-4 ${isDark ? 'text-dark-text-muted' : 'text-text-muted'}`}>Loading Session...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
      {/* Background Gradient */}
      <LinearGradient
        colors={isDark ? 
          ['#0f172a', '#1e1b4b', '#0f172a'] : 
          ['#f8fafc', '#e0f2fe', '#f8fafc']
        }
        className="absolute inset-0"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
            className="flex-1 px-6 py-10 justify-center"
          >
            {/* Header Section */}
            <View className="items-center mb-8">
              <MotiView
                from={{ scale: 0.5, rotate: '-15deg' }}
                animate={{ scale: 1, rotate: '0deg' }}
                transition={{ type: 'spring', damping: 12 }}
                className="mb-6"
              >
                <LinearGradient
                  colors={isDark ? ['#38bdf8', '#818cf8'] : ['#0ea5e9', '#6366f1']}
                  className="w-24 h-24 rounded-3xl items-center justify-center"
                  style={{
                    shadowColor: isDark ? '#38bdf8' : '#0ea5e9',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.3,
                    shadowRadius: 24,
                    elevation: 12,
                  }}
                >
                  <Ionicons name="log-in" size={48} color="white" />
                </LinearGradient>
              </MotiView>

              <MotiText
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: 200 }}
                className={`text-4xl font-bold mb-2 ${
                  isDark ? 'text-dark-brand' : 'text-brand'
                }`}
              >
                SMARTSTOCK
              </MotiText>

              <MotiText
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 300 }}
                className={`text-base text-center ${
                  isDark ? 'text-dark-text-soft' : 'text-text-soft'
                }`}
              >
                Sign in to manage your business
              </MotiText>
            </View>

            {/* Login Card */}
            <MotiView
              from={{ opacity: 0, translateY: 30 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 400, type: 'spring' }}
            >
              <Card variant="elevated" className="mb-6 border border-border/50 dark:border-dark-border/50">
                <CardHeader>
                  <CardTitle>Account Details</CardTitle>
                  <CardDescription>Enter your registered phone number</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Country Selector */}
                  <View className="mb-2">
                    <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                      isDark ? 'text-dark-text-muted' : 'text-text-muted'
                    }`}>
                      Region
                    </Text>
                    
                    <TouchableOpacity
                      onPress={() => setIsCountryPickerOpen(!isCountryPickerOpen)}
                      activeOpacity={0.7}
                      className={`
                        flex-row items-center justify-between p-2 rounded-sm border
                        ${isDark ? 'bg-dark-surface-muted border-dark-border' : 'bg-surface-muted border-border'}
                      `}
                    >
                      <View className="flex-row items-center">
                        <Text className="text-2xl mr-3">{getSelectedCountry().flag}</Text>
                        <View>
                          <Text className={`font-semibold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                            {getSelectedCountry().name}
                          </Text>
                          <Text className={`text-xs ${isDark ? 'text-dark-text-muted' : 'text-text-muted'}`}>
                            {getSelectedCountry().code}
                          </Text>
                        </View>
                      </View>
                      <Ionicons 
                        name={isCountryPickerOpen ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={isDark ? '#94a3b8' : '#64748b'} 
                      />
                    </TouchableOpacity>

                    {isCountryPickerOpen && (
                      <MotiView
                        from={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 rounded-xl overflow-hidden border z-20"
                        style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}
                      >
                        <ScrollView style={{ maxHeight: 200 }}>
                          {EAC_COUNTRIES.map((country) => (
                            <TouchableOpacity
                              key={country.code}
                              onPress={() => {
                                setCountryCode(country.code);
                                setIsCountryPickerOpen(false);
                                setPhone(''); 
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }}
                              className={`
                                flex-row items-center p-3 border-b
                                ${isDark ? 'border-dark-border bg-dark-surface' : 'border-border bg-surface'}
                                ${countryCode === country.code ? 'bg-brand/10' : ''}
                              `}
                            >
                              <Text className="text-2xl mr-3">{country.flag}</Text>
                              <Text className={`font-medium flex-1 ${isDark ? 'text-dark-text' : 'text-text'}`}>
                                {country.name}
                              </Text>
                              {countryCode === country.code && (
                                <Ionicons name="checkmark-circle" size={24} color={isDark ? '#38bdf8' : '#0ea5e9'} />
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </MotiView>
                    )}
                  </View>

                  <PhoneInput
                    label="Phone Number"
                    placeholder="e.g., 69123456"
                    value={phone}
                    onChange={(text) => {
                      setPhone(text);
                      if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                    }}
                    error={errors.phone}
                    countryCode={countryCode}
                    //leftIcon="call-outline"
                  />

                  <Input
                    label="Password"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                    }}
                    error={errors.password}
                    secureTextEntry={!showPassword}
                    leftIcon="lock-closed-outline"
                    rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                    onRightIconPress={() => setShowPassword(!showPassword)}
                  />

                  <View className="flex-row justify-end mt-1">
                    <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                      <ThemedText variant="link" size="sm">
                        Forgot Password?
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  {errors.form && (
                    <View className={`p-3 rounded-xl flex-row items-center ${
                      isDark ? 'bg-error/10 border border-error/20' : 'bg-red-50 border border-red-100'
                    }`}>
                      <Ionicons name="alert-circle" size={20} color="#ef4444" />
                      <ThemedText variant="error" size="sm" className="ml-2 flex-1">
                        {errors.form}
                      </ThemedText>
                    </View>
                  )}
                </CardContent>

                <CardFooter className="pt-2">
                  <TouchableOpacity
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.9}
                    className="w-full"
                  >
                    <LinearGradient
                      colors={isDark ? ['#38bdf8', '#818cf8'] : ['#0ea5e9', '#6366f1']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="rounded-xl py-4 items-center shadow-lg"
                      style={{
                        shadowColor: isDark ? '#38bdf8' : '#0ea5e9',
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 6,
                      }}
                    >
                      {isLoading ? (
                        <View className="flex-row items-center">
                          <ActivityIndicator color="white" size="small" />
                          <ThemedText className="text-white font-semibold ml-2">Signing In...</ThemedText>
                        </View>
                      ) : (
                        <ThemedText className="text-white font-bold text-lg">Sign In</ThemedText>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </CardFooter>
              </Card>

              {/* Footer Links */}
              <View className="flex-row justify-center items-center mt-6">
                <ThemedText variant="muted" size="base">
                  Don't have an account?{' '}
                </ThemedText>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <ThemedText variant="link" size="base" className="font-bold">
                      Create Account
                    </ThemedText>
                  </TouchableOpacity>
                </Link>
              </View>
              
              {/* Biometric Hint */}
              <View className="flex-row justify-center items-center mt-8 opacity-60">
                <Ionicons 
                  name="shield-checkmark" 
                  size={16} 
                  color={isDark ? '#64748b' : '#94a3b8'} 
                />
                <ThemedText variant="muted" size="xs" className="ml-2">
                  Secure 256-bit Encrypted Connection
                </ThemedText>
              </View>
            </MotiView>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={isForgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsForgotModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-6">
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-sm rounded-3xl p-6 ${
              isDark ? 'bg-dark-surface' : 'bg-surface'
            }`}
          >
            <Card variant="outlined">
              <CardHeader className="items-center pb-2">
                <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${
                  isDark ? 'bg-brand/10' : 'bg-blue-50'
                }`}>
                  <Ionicons name="mail-unread-outline" size={32} color={isDark ? '#38bdf8' : '#0ea5e9'} />
                </View>
                <CardTitle className="text-center">Reset Password</CardTitle>
                <CardDescription className="text-center mt-2">
                  Enter your email address and we'll send you a link to reset your password.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-4">
                <Input
                  label="Email Address"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="mail-outline"
                />
              </CardContent>

              <CardFooter className="flex-row gap-3 pt-4">
                <TouchableOpacity
                  onPress={() => setIsForgotModalVisible(false)}
                  className="flex-1 py-3 rounded-xl border items-center"
                  style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}
                >
                  <ThemedText className="font-semibold">Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submitResetRequest}
                  className="flex-1 py-3 rounded-xl bg-brand items-center"
                >
                  <ThemedText className="text-white font-bold">Send Link</ThemedText>
                </TouchableOpacity>
              </CardFooter>
            </Card>
          </MotiView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}