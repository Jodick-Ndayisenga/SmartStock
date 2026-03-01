// app/(auth)/register.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Input, PhoneInput } from '../../components/ui/Input';
import { useTheme } from '../../providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { registerUser } from '@/services/localAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MotiView, MotiText } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomDialog from '@/components/ui/CustomDialog';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/context/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  PressableCard,
} from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';

const { width } = Dimensions.get('window');

// EAC Countries Configuration
interface CountryCode {
  name: string;
  code: string;
  flag: string;
  minLength: number;
  maxLength: number;
}

const EAC_COUNTRIES: CountryCode[] = [
  { name: 'Burundi', code: '+257', flag: '🇧🇮', minLength: 8, maxLength: 9 },
  { name: 'Kenya', code: '+254', flag: '🇰🇪', minLength: 9, maxLength: 10 },
  { name: 'Tanzania', code: '+255', flag: '🇹🇿', minLength: 9, maxLength: 10 },
  { name: 'Uganda', code: '+256', flag: '🇺🇬', minLength: 9, maxLength: 10 },
  { name: 'Rwanda', code: '+250', flag: '🇷🇼', minLength: 9, maxLength: 10 },
  { name: 'DRC', code: '+243', flag: '🇨🇩', minLength: 9, maxLength: 10 },
  { name: 'South Sudan', code: '+211', flag: '🇸🇸', minLength: 9, maxLength: 10 },
];

// Language Options
interface LanguageOption {
  id: 'ki' | 'en' | 'fr' | 'sw';
  label: string;
  nativeLabel: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { id: 'ki', label: 'Kirundi', nativeLabel: 'Ikirundi', flag: '🇧🇮' },
  { id: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { id: 'fr', label: 'Français', nativeLabel: 'Français', flag: '🇫🇷' },
  { id: 'sw', label: 'Kiswahili', nativeLabel: 'Kiswahili', flag: '🇹🇿' },
];

interface FormData {
  fullName: string;
  phone: string;
  password: string;
  confirmPassword: string;
  countryCode: string;
  theme: 'light' | 'dark' | 'system';
  language: 'ki' | 'en' | 'fr' | 'sw' | '';
}

export default function RegisterScreen() {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    countryCode: '+257',
    theme: 'system',
    language: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const { t, i18n } = useTranslation();
  const { setColorScheme } = useColorScheme();
  const { login, handleUserLogin } = useAuth();

  const { isDark } = useTheme();
  const router = useRouter();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
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

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: currentStep / 3,
      damping: 15,
      mass: 1,
      stiffness: 100,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  useEffect(() => {
    if (formData.language) {
      i18n.changeLanguage(formData.language);
    }
  }, [formData.language]);

  useEffect(() => {
    if (formData.theme) {
      setColorScheme(formData.theme);
    }
  }, [formData.theme]);

  const getSelectedCountry = () => 
    EAC_COUNTRIES.find(c => c.code === formData.countryCode) || EAC_COUNTRIES[0];

  const validateStep = (step: number): boolean => {
    const newErrors: {[key: string]: string} = {};
    const selectedCountry = getSelectedCountry();

    if (step === 1) {
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full name is required';
      } else if (formData.fullName.trim().length < 3) {
        newErrors.fullName = 'Name must be at least 3 characters';
      }

      const cleanedPhone = formData.phone.replace(/\D/g, '');
      
      if (!cleanedPhone) {
        newErrors.phone = 'Phone number is required';
      } else if (cleanedPhone.length < selectedCountry.minLength || cleanedPhone.length > selectedCountry.maxLength) {
        newErrors.phone = `Enter a valid ${selectedCountry.name} number (${selectedCountry.minLength}-${selectedCountry.maxLength} digits)`;
      }

      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (step === 2) {
      if (!formData.language) {
        newErrors.language = 'Please select your preferred language';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(prev => prev - 1);
    setErrors({});
  };

  const handleRegister = async () => {
    
    if (!validateStep(2)) {
      console.log("Validation failed, cannot submit form", errors); 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    console.log("Validation passed, proceeding with registration", errors); 

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        //throw new Error('Registration failed');

      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      //Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
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
    
    return {
      score,
      label: labels[score],
      color: colors[score],
    };
  };

  const passwordStrength = getPasswordStrength();

  const renderStepIndicator = () => (
    <Card variant="elevated" className="mb-6">
      <CardContent className="p-md">
        <View className="flex-row justify-between items-center mb-2">
          <CardDescription>Step {currentStep} of 3</CardDescription>
          <CardDescription>{Math.round((currentStep / 3) * 100)}% Complete</CardDescription>
        </View>

        <View className="h-2 bg-surface-muted dark:bg-dark-surface-muted rounded-full overflow-hidden">
          <Animated.View
            style={{
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }}
          >
            <LinearGradient
              colors={isDark ? ['#38bdf8', '#818cf8'] : ['#0ea5e9', '#6366f1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="h-2 rounded-full"
            />
          </Animated.View>
        </View>

        <View className="flex-row justify-between mt-4">
          {['Account', 'Preferences', 'Review'].map((step, index) => (
            <View key={step} className="items-center">
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  index + 1 < currentStep
                    ? 'bg-brand'
                    : index + 1 === currentStep
                    ? 'border-2 border-brand'
                    : 'bg-surface-muted dark:bg-dark-surface-muted'
                }`}
              >
                {index + 1 < currentStep ? (
                  <Ionicons name="checkmark" size={16} color="white" />
                ) : (
                  <CardDescription
                    className={`text-sm font-semibold ${
                      index + 1 === currentStep ? 'text-brand' : ''
                    }`}
                  >
                    {index + 1}
                  </CardDescription>
                )}
              </View>
              <CardDescription
                className={`text-xs mt-2 ${
                  index + 1 === currentStep ? 'text-brand font-medium' : ''
                }`}
              >
                {step}
              </CardDescription>
            </View>
          ))}
        </View>
      </CardContent>
    </Card>
  );

  const renderStep1 = () => (
    <MotiView
      from={{ opacity: 0, translateX: 20 }}
      animate={{ opacity: 1, translateX: 0 }}
      exit={{ opacity: 0, translateX: -20 }}
      transition={{ type: 'spring' }}
    >
      <Card variant="elevated" status={Object.keys(errors).length > 0 ? 'error' : 'default'}>
        <CardHeader title="Personal Information" />
        <CardContent>
          <View className="space-y-4">
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

            {/* Country Code Selector */}
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
                      <CardTitle size="base">{getSelectedCountry().name}</CardTitle>
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
                  from={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Card variant="outlined" className="max-h-64">
                    <ScrollView>
                      {EAC_COUNTRIES.map((country) => (
                        <PressableCard
                          key={country.code}
                          onPress={() => {
                            setFormData(prev => ({ 
                              ...prev, 
                              countryCode: country.code,
                              phone: '' 
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
                              <CardTitle size="base">{country.name}</CardTitle>
                              <CardDescription>
                                {country.code} • {country.minLength}-{country.maxLength} digits
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
                    </ScrollView>
                  </Card>
                </MotiView>
              )}
            </View>

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

            {formData.password && (
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
            )}

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, confirmPassword: text }));
                if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
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
  );

  const renderStep2 = () => (
    <MotiView
      from={{ opacity: 0, translateX: 20 }}
      animate={{ opacity: 1, translateX: 0 }}
      exit={{ opacity: 0, translateX: -20 }}
      transition={{ type: 'spring' }}
    >
      <Card variant="elevated" status={errors.language ? 'error' : 'default'}>
        <CardHeader title="Preferences" subtitle="Customize your experience" />
        <CardContent>
          <View className="space-y-6">
            {/* Theme Selection */}
            <View>
              <CardDescription className="mb-3">App Theme</CardDescription>
              <View className="flex-row gap-3">
                {[
                  { id: 'light', label: 'Light', icon: 'sunny-outline' },
                  { id: 'dark', label: 'Dark', icon: 'moon-outline' },
                  { id: 'system', label: 'System', icon: 'desktop-outline' },
                ].map((theme) => (
                  <PressableCard
                    key={theme.id}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, theme: theme.id as any }));
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    variant={'outlined'}
                    status={formData.theme === theme.id ? 'success' : 'brand'}
                    className="flex-1"
                  >
                    <CardContent className="p-md items-center">
                      <Ionicons
                        name={theme.icon as any}
                        size={28}
                        color={formData.theme === theme.id
                          ? (isDark ? '#38bdf8' : '#0ea5e9')
                          : (isDark ? '#64748b' : '#94a3b8')
                        }
                      />
                      <CardDescription
                        className={`text-sm font-medium mt-2 ${
                          formData.theme === theme.id ? 'text-brand' : ''
                        }`}
                      >
                        {theme.label}
                      </CardDescription>
                    </CardContent>
                  </PressableCard>
                ))}
              </View>
            </View>

            {/* Language Selection */}
            <View>
              <CardDescription className="mb-3">
                Preferred Language <Text className="text-error">*</Text>
              </CardDescription>
              
              <View className="flex-row flex-wrap gap-3">
                {LANGUAGES.map((lang) => (
                  <PressableCard
                    key={lang.id}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, language: lang.id }));
                      if (errors.language) setErrors(prev => ({ ...prev, language: '' }));
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    variant={'outlined'}
                    status={formData.language === lang.id ? 'success' : 'brand'}
                    //variant={formData.language === lang.id ? 'default' : 'outlined'}
                    className="w-[48%]"
                  >
                    <CardContent className="p-md flex-row items-center">
                      <Text className="text-3xl mr-3">{lang.flag}</Text>
                      <View>
                        <CardTitle size="sm" className={formData.language === lang.id ? 'text-brand' : ''}>
                          <ThemedText variant={formData.language === lang.id ? 'brand' : 'default'} size="base">{lang.nativeLabel}</ThemedText>
                        </CardTitle>
                        <CardDescription>{lang.label}</CardDescription>
                      </View>
                    </CardContent>
                  </PressableCard>
                ))}
              </View>
              
              {errors.language && (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text className="text-error text-sm ml-2">{errors.language}</Text>
                </View>
              )}
            </View>
          </View>
        </CardContent>
      </Card>
    </MotiView>
  );

  const renderStep3 = () => (
    <MotiView
      from={{ opacity: 0, translateX: 20 }}
      animate={{ opacity: 1, translateX: 0 }}
      exit={{ opacity: 0, translateX: -20 }}
      transition={{ type: 'spring' }}
    >
      <Card variant="elevated" status="brand">
        <CardHeader 
          title="Review Information" 
          subtitle="Please verify your details"
        />
        <CardContent>
          <View className="gap-4">
            <Card variant="outlined">
              <CardContent className="p-md">
                <View className="flex-row justify-between items-start">
                  <View>
                    <CardDescription className="mb-2">Account Details</CardDescription>
                    <CardTitle size="base">{formData.fullName}</CardTitle>
                    <CardDescription>
                      {getSelectedCountry().flag} {formData.countryCode} {formData.phone}
                    </CardDescription>
                  </View>
                  <TouchableOpacity onPress={() => setCurrentStep(1)}>
                    <Text className="text-brand text-sm">Edit</Text>
                  </TouchableOpacity>
                </View>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent className="p-md">
                <View className="flex-row justify-between items-start">
                  <View>
                    <CardDescription className="mb-2">Preferences</CardDescription>
                    <View className="flex-row items-center gap-4">
                      <View className="items-center">
                        <Ionicons
                          name={formData.theme === 'dark' ? 'moon' : formData.theme === 'light' ? 'sunny' : 'desktop'}
                          size={20}
                          color={isDark ? '#38bdf8' : '#0ea5e9'}
                        />
                        <CardDescription className="text-xs mt-1 capitalize">
                          {formData.theme}
                        </CardDescription>
                      </View>
                      <View className="items-center">
                        <Text className="text-2xl">
                          {LANGUAGES.find(l => l.id === formData.language)?.flag}
                        </Text>
                        <CardDescription className="text-xs mt-1">
                          {LANGUAGES.find(l => l.id === formData.language)?.label}
                        </CardDescription>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setCurrentStep(2)}>
                    <Text className="text-brand text-sm">Edit</Text>
                  </TouchableOpacity>
                </View>
              </CardContent>
            </Card>

            <PressableCard variant="outlined" className="mt-2">
              <CardContent className="p-md flex-row items-start">
                <View className="w-5 h-5 rounded-md border-2 border-brand bg-brand items-center justify-center mr-3 mt-0.5">
                  <Ionicons name="checkmark" size={14} color="white" />
                </View>
                <Text className="flex-1 text-sm text-text-soft dark:text-dark-text-soft">
                  I agree to the{' '}
                  <Text className="text-brand font-semibold">Terms of Service</Text> and{' '}
                  <Text className="text-brand font-semibold">Privacy Policy</Text>
                </Text>
              </CardContent>
            </PressableCard>
          </View>
        </CardContent>
      </Card>
    </MotiView>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
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
          className="flex-1"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
            className="flex-1 px-4 py-6"
          >
            {/* Header */}
            <View className="items-center mb-6">
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
                Customize your experience
              </MotiText>
            </View>

            {/* Progress Indicator Card */}
            {renderStepIndicator()}

            {/* Step Content */}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {/* Navigation Buttons */}
            <View className="flex-row gap-4 mt-6">
              {currentStep > 1 && (
                <TouchableOpacity
                  onPress={handleBack}
                  className="flex-1"
                  activeOpacity={0.7}
                >
                  <Card variant="outlined" className="items-center py-3">
                    <CardDescription className="font-semibold">Back</CardDescription>
                  </Card>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={currentStep === 3 ? handleRegister : handleNext}
                disabled={isLoading}
                className="flex-1"
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
                    <Text className="text-white font-semibold text-base">
                      {currentStep === 3 ? 'Create Account' : 'Continue'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View className="flex-row justify-center items-center mt-6">
              <CardDescription>Already have an account? </CardDescription>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-brand text-base font-semibold">Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Security Badge Card */}
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 400 }}
              className="mt-4"
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
        </ScrollView>
      </KeyboardAvoidingView>

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