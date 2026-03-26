// app/(auth)/forgot-password.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Animated,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Input, PhoneInput } from '../../components/ui/Input';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '../../components/ui/Card';
import { useTheme } from '../../providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MotiView, MotiText } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserByPhone, changePassword } from '@/services/localAuth';
import { notificationService } from '@/services/notificationService';

const { width } = Dimensions.get('window');

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

type Step = 'phone' | 'otp' | 'new_password' | 'success';

export default function ForgotPasswordScreen() {
  const { isDark } = useTheme();
  const [step, setStep] = useState<Step>('phone');
  
  // Form State
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+257');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);

  // Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const inputsRef = useRef<any[]>([]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 15, stiffness: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const getSelectedCountry = () => 
    EAC_COUNTRIES.find(c => c.code === countryCode) || EAC_COUNTRIES[0];

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 'otp' || step === 'new_password') {
      setStep('phone');
      setErrors({});
      setOtp(['', '', '', '', '', '']);
    } else {
      router.back();
    }
  };

  // --- Step 1: Send OTP ---
  const handleSendOtp = async () => {
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length < 8) {
      setErrors({ phone: 'Please enter a valid phone number' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setErrors({});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const fullPhone = `${countryCode}${cleanedPhone}`;
      const result = await getUserByPhone(fullPhone);
      
      if (result && result.user) {
        setGeneratedOtp(result.code); 
        console.log(`🔐 DEBUG OTP: ${result.code}`);
        
        // Send OTP as notification
        await notificationService.sendLocalNotification({
          variant: 'info',
          title: 'Password Reset Code',
          message: `Your verification code is: ${result.code}`,
          data: { type: 'password_reset', otp: result.code },
          channelId: 'default',
          priority: 'high',
        });
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStep('otp');
      } else {
        throw new Error('No account found with this number.');
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors({ form: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Step 2: Verify OTP ---
  const handleVerifyOtp = () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setErrors({ otp: 'Enter all 6 digits' });
      return;
    }

    if (enteredOtp === generatedOtp) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('new_password');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors({ otp: 'Incorrect code. Try again.' });
      setOtp(['', '', '', '', '', '']); 
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    
    if (text && index < 5) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Auto-focus next input
      const nextInput = inputsRef.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }

    if (newOtp.every(d => d !== '')) {
      handleVerifyOtp();
    }
  };

  // --- Step 3: Reset Password ---
  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setErrors({ password: 'Min 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;
      await changePassword(fullPhone, newPassword);
      setStep('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setErrors({ form: 'Failed to reset. Try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Helpers ---
  
  const renderHeader = (title: string, subtitle: string, icon: keyof typeof Ionicons.glyphMap) => (
    <View className="items-center mb-6">
      <MotiView
        from={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        className="mb-4"
      >
        <View className={`w-16 h-16 rounded-full items-center justify-center ${isDark ? 'bg-brand/20' : 'bg-blue-50'}`}>
          <Ionicons name={icon} size={32} color={isDark ? '#38bdf8' : '#0ea5e9'} />
        </View>
      </MotiView>
      <MotiText
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        className={`text-2xl font-bold mb-1 ${isDark ? 'text-dark-text' : 'text-text'}`}
      >
        {title}
      </MotiText>
      <MotiText
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 100 }}
        className={`text-sm text-center px-4 ${isDark ? 'text-dark-text-muted' : 'text-text-muted'}`}
      >
        {subtitle}
      </MotiText>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
      {/* Background */}
      <LinearGradient
        colors={isDark ? ['#0f172a', '#1e1b4b'] : ['#f8fafc', '#e0f2fe']}
        className="absolute inset-0"
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="flex-1 px-6 py-8">
            
            {/* Top Bar with Back Arrow */}
            <View className="flex-row items-center mb-8">
              <TouchableOpacity 
                onPress={handleBack} 
                activeOpacity={0.7}
                className={`p-2 rounded-full mr-4 ${isDark ? 'bg-dark-surface-muted' : 'bg-white shadow-sm'}`}
              >
                <Ionicons 
                  name="arrow-back" 
                  size={24} 
                  color={isDark ? '#94a3b8' : '#475569'} 
                />
              </TouchableOpacity>
              <Text className={`text-lg font-semibold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                {step === 'success' ? 'Success' : 'Recovery'}
              </Text>
            </View>

            {/* Main Content Card */}
            {step !== 'success' ? (
              <Card variant="elevated" className="border border-border/50 dark:border-dark-border/50 overflow-hidden">
                <CardContent className="pt-6">
                  
                  {/* STEP 1: PHONE */}
                  {step === 'phone' && (
                    <MotiView
                      key="step-phone"
                      from={{ opacity: 0, translateX: 20 }}
                      animate={{ opacity: 1, translateX: 0 }}
                      exit={{ opacity: 0, translateX: -20 }}
                      transition={{ type: 'spring' }}
                    >
                      {renderHeader("Forgot Password?", "Enter your phone number to receive a verification code.", "lock-closed-outline")}
                      
                      <View className="mt-4 space-y-4">
                        {/* Country Picker Trigger */}
                        <TouchableOpacity
                          onPress={() => setIsCountryPickerOpen(!isCountryPickerOpen)}
                          activeOpacity={0.7}
                          className={`flex-row items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-dark-surface-muted border-dark-border' : 'bg-surface-muted border-border'}`}
                        >
                          <View className="flex-row items-center">
                            <Text className="text-xl mr-2">{getSelectedCountry().flag}</Text>
                            <View>
                              <Text className={`font-medium ${isDark ? 'text-dark-text' : 'text-text'}`}>{getSelectedCountry().name}</Text>
                              <Text className={`text-xs ${isDark ? 'text-dark-text-muted' : 'text-text-muted'}`}>{getSelectedCountry().code}</Text>
                            </View>
                          </View>
                          <Ionicons name="chevron-down" size={20} color="#94a3b8" />
                        </TouchableOpacity>

                        {/* Country Dropdown */}
                        {isCountryPickerOpen && (
                          <MotiView
                            from={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-2 rounded-xl border overflow-hidden z-20"
                            style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}
                          >
                            <ScrollView style={{ maxHeight: 150 }}>
                              {EAC_COUNTRIES.map((c) => (
                                <TouchableOpacity
                                  key={c.code}
                                  onPress={() => { 
                                    setCountryCode(c.code); 
                                    setIsCountryPickerOpen(false); 
                                    setPhone(''); 
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  }}
                                  className={`flex-row items-center p-3 border-b ${isDark ? 'border-dark-border bg-dark-surface' : 'border-border bg-white'} ${countryCode === c.code ? 'bg-brand/10' : ''}`}
                                >
                                  <Text className="text-xl mr-3">{c.flag}</Text>
                                  <Text className={`flex-1 ${isDark ? 'text-dark-text' : 'text-text'}`}>{c.name}</Text>
                                  {countryCode === c.code && <Ionicons name="checkmark" color={isDark ? '#38bdf8' : '#0ea5e9'} />}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </MotiView>
                        )}

                        <PhoneInput
                          label="Phone Number"
                          placeholder="e.g., 69123456"
                          value={phone}
                          onChange={(t) => { setPhone(t); if(errors.phone) setErrors(prev => ({...prev, phone: ''})); }}
                          error={errors.phone}
                          countryCode={countryCode}
                        />

                        {errors.form && (
                          <View className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex-row items-center">
                            <Ionicons name="alert-circle" size={18} color="#ef4444" />
                            <Text className="ml-2 text-sm text-red-600 dark:text-red-400">{errors.form}</Text>
                          </View>
                        )}
                        
                        {generatedOtp && (
                          <View className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded mt-2">
                            <Text className="text-xs text-center text-yellow-700 dark:text-yellow-400">Demo OTP: {generatedOtp}</Text>
                          </View>
                        )}

                        <TouchableOpacity
                          onPress={handleSendOtp}
                          disabled={isLoading}
                          className="mt-4 w-full"
                          activeOpacity={0.9}
                        >
                          <LinearGradient
                            colors={['#0ea5e9', '#6366f1']}
                            className="py-4 rounded-xl items-center shadow-md"
                          >
                            {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Send Code</Text>}
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </MotiView>
                  )}


                  {step === 'otp' && (
                    <MotiView
                      key="step-otp"
                      from={{ opacity: 0, translateX: 20 }}
                      animate={{ opacity: 1, translateX: 0 }}
                      transition={{ type: 'spring' }}
                    >
                      {renderHeader("Verification", `Enter the 6-digit code sent to ${countryCode} ${phone}`, "shield-checkmark-outline")}
                      
                      <View className="mt-6 items-center">
                        <View className="flex-row gap-3 justify-center w-full">
                          {otp.map((digit, idx) => (
                            <TextInput
                              key={idx}
                              ref={(ref) => {
                                if (ref) inputsRef.current[idx] = ref;
                              }}
                              value={digit}
                              onChangeText={(t) => handleOtpChange(t, idx)}
                              keyboardType="number-pad"
                              maxLength={1}
                              autoFocus={idx === 0}
                              className={`w-[45px] h-[55px] text-center text-2xl font-bold rounded-xl border ${
                                isDark 
                                  ? 'bg-dark-surface-muted border-dark-border text-dark-text' 
                                  : 'bg-surface-muted border-border text-text'
                              }`}
                              onKeyPress={({ nativeEvent }) => {
                                if (nativeEvent.key === 'Backspace' && !digit && idx > 0) {
                                  const prevInput = inputsRef.current[idx - 1];
                                  prevInput?.focus();
                                }
                              }}
                            />
                          ))}
                        </View>
                        {errors.otp && (
                          <View className="flex-row items-center mt-3">
                            <Ionicons name="alert-circle" size={16} color="#ef4444" />
                            <Text className="ml-1 text-sm text-red-500">{errors.otp}</Text>
                          </View>
                        )}
                        
                        <TouchableOpacity 
                          onPress={() => { 
                            Haptics.impactAsync(); 
                            // Add resend logic here
                          }} 
                          className="mt-6"
                        >
                          <Text className={`text-sm font-medium ${isDark ? 'text-brand' : 'text-blue-600'}`}>Resend Code</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleVerifyOtp}
                          className="mt-8 w-full"
                          activeOpacity={0.9}
                        >
                          <LinearGradient colors={['#0ea5e9', '#6366f1']} className="py-4 rounded-xl items-center shadow-md">
                            <Text className="text-white font-bold text-lg">Verify</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </MotiView>
                  )}

                  {/* STEP 3: NEW PASSWORD */}
                  {step === 'new_password' && (
                    <MotiView
                      key="step-pwd"
                      from={{ opacity: 0, translateX: 20 }}
                      animate={{ opacity: 1, translateX: 0 }}
                      transition={{ type: 'spring' }}
                    >
                      {renderHeader("Reset Password", "Create a new strong password for your account.", "key-outline")}
                      
                      <View className="mt-4 space-y-4">
                        <Input
                          label="New Password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChangeText={(t) => { setNewPassword(t); if(errors.password) setErrors(prev => ({...prev, password: ''})); }}
                          secureTextEntry={!showPassword}
                          leftIcon="lock-closed-outline"
                          rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                          onRightIconPress={() => setShowPassword(!showPassword)}
                          error={errors.password}
                        />
                        <Input
                          label="Confirm Password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChangeText={(t) => { setConfirmPassword(t); if(errors.confirm) setErrors(prev => ({...prev, confirm: ''})); }}
                          secureTextEntry={!showPassword}
                          leftIcon="lock-closed-outline"
                          error={errors.confirm}
                        />

                        {errors.form && (
                          <View className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex-row items-center">
                            <Ionicons name="alert-circle" size={18} color="#ef4444" />
                            <Text className="ml-2 text-sm text-red-600 dark:text-red-400">{errors.form}</Text>
                          </View>
                        )}

                        <TouchableOpacity
                          onPress={handleResetPassword}
                          disabled={isLoading}
                          className="mt-6 w-full"
                          activeOpacity={0.9}
                        >
                          <LinearGradient colors={['#0ea5e9', '#6366f1']} className="py-4 rounded-xl items-center shadow-md">
                            {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Reset Password</Text>}
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </MotiView>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* SUCCESS STATE */
              <MotiView
                key="step-success"
                from={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="items-center justify-center flex-1 py-10"
              >
                <View className="w-24 h-24 rounded-full bg-green-500 items-center justify-center mb-6 shadow-lg shadow-green-500/30">
                  <Ionicons name="checkmark" size={48} color="white" />
                </View>
                <Text className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Password Reset!</Text>
                <Text className={`text-center mb-8 px-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Your password has been successfully updated. You can now log in with your new credentials.
                </Text>
                <TouchableOpacity
                  onPress={() => router.replace('/(auth)/login')}
                  className="w-full max-w-xs"
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={['#0ea5e9', '#6366f1']} className="py-4 rounded-xl items-center shadow-md">
                    <Text className="text-white font-bold text-lg">Back to Login</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </MotiView>
            )}
            
            {/* Footer Help */}
            {step !== 'success' && (
              <View className="mt-8 items-center">
                <Text className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Remember your password?{' '}
                  <Text 
                    onPress={() => router.replace('/(auth)/login')}
                    className={`font-bold ${isDark ? 'text-brand' : 'text-blue-600'}`}
                  >
                    Sign In
                  </Text>
                </Text>
              </View>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}