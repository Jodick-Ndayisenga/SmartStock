// app/(auth)/register.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Input, PhoneInput } from '../../components/ui/Input';
import { useTheme } from '../../providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { registerUser } from '@/services/localAuth';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MotiView, MotiText } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomDialog from '@/components/ui/CustomDialog';
import { useAuth } from '@/context/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  PressableCard,
} from '@/components/ui/Card';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const { width } = Dimensions.get('window');

interface CountryCode {
  name: string;
  code: string;
  flag: string;
  minLength: number;
  maxLength: number;
}

const EAC_COUNTRIES: CountryCode[] = [
  { name: 'Burundi',     code: '+257', flag: '🇧🇮', minLength: 8,  maxLength: 9  },
  { name: 'Kenya',       code: '+254', flag: '🇰🇪', minLength: 9,  maxLength: 10 },
  { name: 'Tanzania',    code: '+255', flag: '🇹🇿', minLength: 9,  maxLength: 10 },
  { name: 'Uganda',      code: '+256', flag: '🇺🇬', minLength: 9,  maxLength: 10 },
  { name: 'Rwanda',      code: '+250', flag: '🇷🇼', minLength: 9,  maxLength: 10 },
  { name: 'DRC',         code: '+243', flag: '🇨🇩', minLength: 9,  maxLength: 10 },
  { name: 'South Sudan', code: '+211', flag: '🇸🇸', minLength: 9,  maxLength: 10 },
];

interface FormData {
  fullName: string;
  phone: string;
  password: string;
  confirmPassword: string;
  countryCode: string;
}

export default function RegisterScreen() {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    countryCode: '+257',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const { login, handleUserLogin } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 15,
        mass: 1,
        stiffness: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getSelectedCountry = () =>
    EAC_COUNTRIES.find(c => c.code === formData.countryCode) || EAC_COUNTRIES[0];

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    const selectedCountry = getSelectedCountry();

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = 'Name must be at least 3 characters';
    }

    const cleanedPhone = formData.phone.replace(/\D/g, '');
    if (!cleanedPhone) {
      newErrors.phone = 'Phone number is required';
    } else if (
      cleanedPhone.length < selectedCountry.minLength ||
      cleanedPhone.length > selectedCountry.maxLength
    ) {
      newErrors.phone = `Enter a valid ${selectedCountry.name} number (${selectedCountry.minLength}–${selectedCountry.maxLength} digits)`;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);

    try {
      const cleanedPhone = formData.phone.replace(/\D/g, '');
      const fullPhone = `${formData.countryCode}${cleanedPhone}`;

      const res = await registerUser({
        displayName: formData.fullName,
        phone: fullPhone,
        password: formData.password,
      });

      if (res.phone && res.password) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const answer = await login(res.phone, formData.password);

        if (answer?.status === 'success') {
          await handleUserLogin(res);
          router.replace('/(tabs)');
        }
      } else {
        setShowErrorDialog(true);
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (): { score: number; label: string; color: string } => {
    const password = formData.password;
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    score = Math.min(4, Math.floor(score / 1.25));

    const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#22c55e'];

    return { score, label: labels[score], color: colors[score] };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
      <LinearGradient
        colors={
          isDark
            ? ['#0f172a', '#1e1b4b', '#0f172a']
            : ['#f8fafc', '#e0f2fe', '#f8fafc']
        }
        className="absolute inset-0"
      />

      {/* KeyboardAwareScrollView handles Android keyboard scroll automatically */}
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid={true}
        extraScrollHeight={24}
        keyboardShouldPersistTaps="handled"
        enableAutomaticScroll={true}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
          className="flex-1 px-4 py-6"
        >
          {/* Header */}
          <View className="items-center mb-8">
            <MotiView
              from={{ scale: 0.5, rotate: '-10deg' }}
              animate={{ scale: 1, rotate: '0deg' }}
              transition={{ type: 'spring', damping: 12 }}
              className="mb-4"
            >
              <LinearGradient
                colors={isDark ? ['#38bdf8', '#818cf8'] : ['#0ea5e9', '#6366f1']}
                className="w-20 h-20 rounded-2xl items-center justify-center"
                style={{
                  shadowColor: isDark ? '#38bdf8' : '#0ea5e9',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                <Ionicons name="person-add" size={40} color="white" />
              </LinearGradient>
            </MotiView>

            <MotiText
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 100 }}
              className="text-3xl font-bold text-text dark:text-dark-text"
            >
              Create Account
            </MotiText>

            <MotiText
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 200 }}
              className="text-base mt-2 text-center text-text-soft dark:text-dark-text-soft"
            >
              Fill in your details to get started
            </MotiText>
          </View>

          {/* Form Card */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 100 }}
          >
            <Card variant="elevated" status={Object.keys(errors).length > 0 ? 'error' : 'default'}>
              <CardHeader title="Personal Information" />
              <CardContent>
                <View className="space-y-4">

                  {/* Full Name */}
                  <Input
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, fullName: text }));
                      if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                    }}
                    error={errors.fullName}
                    leftIcon="person-outline"
                    required
                    showRequiredIndicator
                  />

                  {/* Country Picker */}
                  <View>
                    <CardDescription className="mb-2">
                      Country Region <Text className="text-error">*</Text>
                    </CardDescription>

                    <PressableCard
                      onPress={() => setIsCountryPickerOpen(!isCountryPickerOpen)}
                      variant="outlined"
                      className="mb-2"
                    >
                      <CardContent className="p-md flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Text className="text-2xl mr-3">{getSelectedCountry().flag}</Text>
                          <View>
                            <Text className="text-text dark:text-dark-text font-medium">
                              {getSelectedCountry().name}
                            </Text>
                            <CardDescription>{getSelectedCountry().code}</CardDescription>
                          </View>
                        </View>
                        <Ionicons
                          name={isCountryPickerOpen ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={isDark ? '#94a3b8' : '#64748b'}
                        />
                      </CardContent>
                    </PressableCard>

                    {isCountryPickerOpen && (
                      <MotiView
                        from={{ opacity: 0, translateY: -8 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'spring', damping: 18 }}
                      >
                        <Card variant="outlined" className="max-h-64 overflow-hidden">
                          {EAC_COUNTRIES.map((country) => (
                            <PressableCard
                              key={country.code}
                              onPress={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  countryCode: country.code,
                                  phone: '',
                                }));
                                setIsCountryPickerOpen(false);
                                setErrors(prev => ({ ...prev, phone: '' }));
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }}
                              variant={formData.countryCode === country.code ? 'filled' : 'default'}
                              className="border-b border-border dark:border-dark-border"
                            >
                              <CardContent className="p-md flex-row items-center">
                                <Text className="text-2xl mr-3">{country.flag}</Text>
                                <View className="flex-1">
                                  <Text className="text-text dark:text-dark-text font-medium">
                                    {country.name}
                                  </Text>
                                  <CardDescription>
                                    {country.code} • {country.minLength}–{country.maxLength} digits
                                  </CardDescription>
                                </View>
                                {formData.countryCode === country.code && (
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={24}
                                    color={isDark ? '#38bdf8' : '#0ea5e9'}
                                  />
                                )}
                              </CardContent>
                            </PressableCard>
                          ))}
                        </Card>
                      </MotiView>
                    )}
                  </View>

                  {/* Phone */}
                  <PhoneInput
                    label={`Phone Number (${getSelectedCountry().code})`}
                    value={formData.phone}
                    onChange={(text) => {
                      setFormData(prev => ({ ...prev, phone: text }));
                      if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                    }}
                    error={errors.phone}
                    required
                    showRequiredIndicator
                    countryCode={getSelectedCountry().code}
                  />

                  {/* Password */}
                  <Input
                    label="Password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, password: text }));
                      if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                    }}
                    error={errors.password}
                    leftIcon="lock-closed-outline"
                    rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    onRightIconPress={() => setShowPassword(!showPassword)}
                    secureTextEntry={!showPassword}
                    required
                    showRequiredIndicator
                  />

                  {/* Password Strength */}
                  {formData.password ? (
                    <View className="px-2">
                      <View className="flex-row gap-1 mb-1">
                        {[1, 2, 3, 4].map((i) => (
                          <View
                            key={i}
                            className={`flex-1 h-1 rounded-full ${
                              i <= passwordStrength.score
                                ? passwordStrength.score >= 3
                                  ? 'bg-success'
                                  : passwordStrength.score === 2
                                  ? 'bg-warning'
                                  : 'bg-error'
                                : 'bg-border dark:bg-dark-border'
                            }`}
                          />
                        ))}
                      </View>
                      <Text style={{ color: passwordStrength.color }} className="text-xs">
                        {passwordStrength.label} password
                      </Text>
                    </View>
                  ) : null}

                  {/* Confirm Password */}
                  <Input
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, confirmPassword: text }));
                      if (errors.confirmPassword)
                        setErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }}
                    error={errors.confirmPassword}
                    leftIcon="shield-checkmark-outline"
                    rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    secureTextEntry={!showConfirmPassword}
                    required
                    showRequiredIndicator
                  />

                </View>
              </CardContent>
            </Card>
          </MotiView>

          {/* Register Button */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={isLoading}
            className="mt-6"
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isDark ? ['#38bdf8', '#818cf8'] : ['#0ea5e9', '#6366f1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="rounded-xl py-4 items-center"
              style={{
                shadowColor: isDark ? '#38bdf8' : '#0ea5e9',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 5,
              }}
            >
              {isLoading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white font-semibold ml-2">Creating...</Text>
                </View>
              ) : (
                <Text className="text-white font-semibold text-base">Create Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Login Link */}
          <View className="flex-row justify-center items-center mt-6">
            <CardDescription>Already have an account? </CardDescription>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-brand text-base font-semibold">Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Security Badge */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 400 }}
            className="mt-4 mb-4"
          >
            <Card variant="outlined" className="py-2">
              <CardContent className="flex-row justify-center items-center">
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={isDark ? '#64748b' : '#94a3b8'}
                />
                <CardDescription className="text-xs ml-1">
                  End-to-end encrypted • 256-bit secure
                </CardDescription>
              </CardContent>
            </Card>
          </MotiView>

        </Animated.View>
      </KeyboardAwareScrollView>

      <CustomDialog
        visible={showErrorDialog}
        title="Registration Error"
        description="Something went wrong. Please check your connection and try again."
        variant="error"
        icon="alert-circle-outline"
        onClose={() => setShowErrorDialog(false)}
        showCancel={false}
      />
    </SafeAreaView>
  );
}
