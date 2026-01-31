// app/(auth)/login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorPhone, setErrorPhone] = useState<string | null>(null);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  

  const { login } = useAuth();
  
  const { isDark } = useTheme();
  const router = useRouter();

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

const formatPhoneNumber = (phone: string) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '').slice(0, 8); // Burundi numbers are 8 digits max

  // Build formatted number step by step
  if (cleaned.length <= 2) {
    return cleaned;
  } else if (cleaned.length <= 5) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
  } else if (cleaned.length <= 8) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
  } else {
    return cleaned; // Just in case, though capped at 8 digits
  }
};


  const handleLogin = async () => {
    const { phone, password } = formData;

    // Validation
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length < 8) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(`+257${cleanedPhone}`, password);
      if(res && res.status === 'success') {
        router.replace('/(tabs)');
      }else if(res && res.status === 'invalid_password') {
        setErrorPassword('Invalid password');
      }else if(res && res.status === 'user_not_found') {
        setErrorPhone('User not found');
      }
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        'Invalid phone number or password. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-surface-soft dark:bg-dark-surface-soft'>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView 
        className={`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        

        {/* Login Form Section */}
        <View className="flex-1 px-2 pt-8 pb-6 -mt-6 bg-surface-soft dark:bg-dark-surface-soft">
          {/* Main Login Card */}
          <View className={`
            rounded-3xl p-8 mb-8 bg-card shadow-card
            ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
            border ${isDark ? 'border-dark-border/50' : 'border-border'}
          `}>
            <View className="items-center mb-8">
              <View className="w-16 h-16 rounded-full bg-brand/10 items-center justify-center mb-4">
                <Ionicons 
                  name="log-in-outline" 
                  size={28} 
                  color={isDark ? '#38bdf8' : '#0ea5e9'} 
                />
              </View>
              <Text className={`text-2xl font-bold ${isDark ? 'text-dark-text' : 'text-text'}`}>
                Sign In
              </Text>
              <Text className={`text-base text-center mt-2 ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                Enter your phone and password to continue
              </Text>
            </View>

            <View className="mb-4">
            <Text className="text-sm font-medium text-text-soft mb-2">
              Phone Number
            </Text>

            <View
              className={`
                flex-row items-center
              `}
            >
              {/* Country Code Section */}
              <View className="flex-row items-center pr-3 mr-3 border-r border-border">
                <View
                >
                  <Text className="text-base">🇧🇮</Text>
                </View>
                <Text
                  className={`text-base font-semibold ${isDark ? 'text-dark-text-soft' : 'text-text'}`}
                >
                  +257
                </Text>
              </View>

              {/* Input Field */}
              <Input
                placeholder="79 12 34 56"
                value={formData.phone}
                onChangeText={(value) => updateFormData('phone', formatPhoneNumber(value))}
                keyboardType="phone-pad"
                className="flex-1 rounded-[2px] border-0 bg-transparent text-base font-medium text-text dark:text-dark-text mt-3"
              />
            </View>
            {
              errorPhone && (
                <Text className="text-xs text-error">
                  {errorPhone}
                </Text>
              )
            }

            <Text
              className={`text-xs mt-2 text-text-muted dark:text-dark-text-muted`}
            >
              Enter your 8-digit Burundi phone number
            </Text>
          </View>


            {/* Password Input */}
            <View className="mb-6">
              <View className="relative">
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-10"
                >
                  <Ionicons 
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={22} 
                    color={isDark ? '#94a3b8' : '#64748b'} 
                  />
                </TouchableOpacity>
              </View>

              {
              errorPassword && (
                <Text className="text-xs text-error">
                  {errorPassword}
                </Text>
              )
            }
              
              {/* Remember Me & Forgot Password */}
              <View className="flex-row justify-between items-center mt-4">
                <TouchableOpacity
                  onPress={() => setRememberMe(!rememberMe)}
                  className="flex-row items-center"
                >
                  <View className={`
                    w-5 h-5 rounded border mr-2 items-center justify-center
                    ${rememberMe ? 'bg-brand border-brand dark:bg-dark-brand' : isDark ? 'dark:border-dark-border' : 'border-border'}
                  `}>
                    {rememberMe && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                  <Text className={`text-sm ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
                    Remember me
                  </Text>
                </TouchableOpacity>


                  <TouchableOpacity onPress={()=> router.push("/(auth)/forgot-password")}>
                    <Text className="text-brand text-sm font-semibold">
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>

              </View>
            </View>
            

            {/* Login Button */}
            <Button
              onPress={handleLogin}
              disabled={isLoading}
              loading={isLoading}
              size="lg"
              className="rounded-2xl shadow-button mb-4 text-white"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>

            
          </View>

          {/* Security Features Highlight */}

          {/* Register Section */}
          <View className="items-center">
            <View className={`
              rounded-2xl p-6 w-full items-center
              ${isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'}
              border ${isDark ? 'border-dark-border' : 'border-border'}
            `}>
              <Text className={`text-base mb-3 text-brand`}>
                Don't have an account?
              </Text>
              <Link href="/(auth)/register" asChild>
                <Button variant="secondary" size="lg" className="rounded-2xl w-full bg-surface-muted dark:bg-dark-surface-muted">
                  Create Business Account
                </Button>
              </Link>
            </View>
          </View>

          {/* Support Info */}
          <View className="items-center mt-8">
            <TouchableOpacity className="flex-row items-center">
              <Ionicons 
                name="help-circle-outline" 
                size={18} 
                color={isDark ? '#94a3b8' : '#64748b'} 
              />
              <Text className={`ml-2 text-sm ${isDark ? 'text-dark-text-muted' : 'text-text-muted'}`}>
                Need help? Contact Support
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}