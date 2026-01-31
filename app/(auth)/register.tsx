// app/(auth)/register.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { registerUser } from '@/services/localAuth';
import { useAuth } from '@/context/AuthContext';
//import bcrypt from 'react-native-bcrypt';



export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessType: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { login } = useAuth();

  const { isDark } = useTheme();
  const router = useRouter();

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    const { fullName, email, password, confirmPassword, businessName , phone} = formData;

    // Validation
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }


    if (!phone.replace(/\D/g, '')) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      //await new Promise(resolve => setTimeout(resolve, 2000));

      // Create user
     const res=  await registerUser({displayName:fullName,phone,password});
      
      if(res.phone && res.password){
        await login(res.phone, res.password);
        router.replace('/(tabs)');
      }else{
        Alert.alert(
        'Registration Failed',
        'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView 
        className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section with Background */}
        <View className={`pt-12 pb-8 px-6 ${isDark ? 'bg-dark-surface-soft' : 'bg-brand/5'}`}>
          <View className="items-center">
            {/* App Logo/Icon */}
            <View className="w-20 h-20 rounded-2xl bg-brand items-center justify-center mb-4 shadow-lg">
              <Ionicons name="cube" size={32} color="white" />
            </View>
            
            <Text className={`text-3xl font-inter-bold font-bold mb-2 ${isDark ? 'text-dark-text' : 'text-text'}`}>
              Mon Magasin
            </Text>
            <Text className={`text-lg text-center ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
              Create your business account
            </Text>
          </View>
        </View>

        {/* Form Section */}
        <View className="px-6 py-8">
          {/* Progress Steps */}
          <View className="flex-row justify-between items-center mb-8">
            {[1, 2, 3].map((step) => (
              <View key={step} className="items-center flex-1">
                <View className={`
                  w-8 h-8 rounded-full items-center justify-center
                  ${step === 1 ? 'bg-brand' : isDark ? 'bg-dark-border' : 'bg-border'}
                `}>
                  <Text className={`text-sm font-semibold ${
                    step === 1 ? 'text-white' : isDark ? 'text-dark-text-muted' : 'text-text-muted'
                  }`}>
                    {step}
                  </Text>
                </View>
                <Text className={`text-xs mt-2 ${
                  step === 1 
                    ? 'text-brand font-semibold' 
                    : isDark ? 'text-dark-text-muted' : 'text-text-muted'
                }`}>
                  {step === 1 ? 'Account' : step === 2 ? 'Business' : 'Complete'}
                </Text>
              </View>
            ))}
            <View className={`absolute top-4 left-8 right-8 h-0.5 -z-10 ${
              isDark ? 'bg-dark-border' : 'bg-border'
            }`} />
          </View>

          {/* Personal Information Card */}
          {
            currentStep === 1 && (
                <View className={`
            rounded-2xl p-6 mb-6 shadow-card
            ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
            border ${isDark ? 'border-dark-border' : 'border-border'}
          `}>
            <View className="flex-row items-center mb-4">
              <Ionicons 
                name="person-circle-outline" 
                size={24} 
                color={isDark ? '#38bdf8' : '#0ea5e9'} 
              />
              <Text className={`text-lg font-semibold ml-3 ${
                isDark ? 'text-dark-text' : 'text-text'
              }`}>
                Personal Information
              </Text>
            </View>

            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChangeText={(value) => updateFormData('fullName', value)}
              className="mb-4"
            />

            {/* <Input
              label="Email Address"
              placeholder="your.email@example.com"
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              className="mb-4"
            /> */}



            

            <Input
              label="Phone Number (Optional)"
              placeholder="+257 XX XX XX XX"
              value={formData.phone}
              onChangeText={(value) => updateFormData('phone', value)}
              keyboardType="phone-pad"
              className="mb-4"
            />

            <View>
            

            <View className="relative">
              <Input
                label="Password"
                placeholder="Create a strong password"
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
                secureTextEntry={!showPassword}
                className="mb-4"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-10"
              >
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={isDark ? '#94a3b8' : '#64748b'} 
                />
              </TouchableOpacity>
            </View>

            <View className="relative">
              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(value) => updateFormData('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
                className="mb-4"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-10"
              >
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={isDark ? '#94a3b8' : '#64748b'} 
                />
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicator */}
            {formData.password && (
              <View className="mt-2">
                <View className="flex-row mb-1">
                  {[1, 2, 3, 4].map((index) => (
                    <View
                      key={index}
                      className={`flex-1 h-1 rounded-full mx-1 ${
                        index <= Math.min(Math.floor(formData.password.length / 2), 4)
                          ? formData.password.length >= 8 
                            ? 'bg-success' 
                            : formData.password.length >= 6 
                            ? 'bg-warning' 
                            : 'bg-error'
                          : isDark ? 'bg-dark-border' : 'bg-border'
                      }`}
                    />
                  ))}
                </View>
                <Text className={`text-xs ${
                  formData.password.length >= 8 
                    ? 'text-success' 
                    : formData.password.length >= 6 
                    ? 'text-warning' 
                    : 'text-error'
                }`}>
                  {formData.password.length >= 8 
                    ? 'Strong password' 
                    : formData.password.length >= 6 
                    ? 'Moderate password' 
                    : 'Weak password'
                  }
                </Text>
              </View>
            )}
          </View>
          </View>
            )
          }

          {/* Business Information Card */}
          {
            currentStep === 2 && (
                <View className={`
            rounded-2xl p-6 mb-6 shadow-card
            ${isDark ? 'bg-dark-surface-soft' : 'bg-surface'}
            border ${isDark ? 'border-dark-border' : 'border-border'}
          `}>
            <View className="flex-row items-center mb-4">
              <Ionicons 
                name="business-outline" 
                size={24} 
                color={isDark ? '#38bdf8' : '#0ea5e9'} 
              />
              <Text className={`text-lg font-semibold ml-3 ${
                isDark ? 'text-dark-text' : 'text-text'
              }`}>
                Business Information
              </Text>
            </View>

            <Input
              label="Business Name"
              placeholder="Enter your business name"
              value={formData.businessName}
              onChangeText={(value) => updateFormData('businessName', value)}
              className="mb-4"
            />

            <View className="mb-4">
              <Text className="text-sm font-medium text-text-soft mb-2">
                Business Type
              </Text>
              <View className="flex-row flex-wrap -mx-1">
                {['Retail Shop', 'Supermarket', 'Wholesale', 'Restaurant', 'Other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => updateFormData('businessType', type)}
                    className={`
                      px-3 py-2 rounded-lg mx-1 mb-2 border
                      ${formData.businessType === type 
                        ? 'bg-brand/10 border-brand' 
                        : isDark ? 'bg-dark-surface border-dark-border' : 'bg-surface-soft border-border'
                      }
                    `}
                  >
                    <Text className={`
                      text-sm font-medium
                      ${formData.businessType === type 
                        ? 'text-brand' 
                        : isDark ? 'text-dark-text' : 'text-text'
                      }
                    `}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
            )
          }

          

          {/* Register Button */}
          <Button
            onPress={handleRegister}
            disabled={isLoading}
            loading={isLoading}
            size="lg"
            className="rounded-xl shadow-button mb-6"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>

          {/* Terms and Conditions */}
          <Text className={`text-center text-sm mb-6 ${
            isDark ? 'text-dark-text-muted' : 'text-text-muted'
          }`}>
            By creating an account, you agree to our{' '}
            <Text className="text-brand font-semibold">Terms of Service</Text>{' '}
            and{' '}
            <Text className="text-brand font-semibold">Privacy Policy</Text>
          </Text>

          {/* Login Link */}
          <View className="flex-row justify-center items-center">
            <Text className={`text-base ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-brand text-base font-semibold">
                  Sign In
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View className="h-8" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}