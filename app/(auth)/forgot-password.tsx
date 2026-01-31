// app/(auth)/forgot-password.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, TextInput } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { getUserByPhone, changePassword } from '@/services/localAuth';
const OTP_LENGTH = 6;

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [serverOtp , setServerOtp] = useState('')

  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Phone, 2: Code, 3: New password

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputs = React.useRef<(TextInput | null)[]>([]);

  const { isDark } = useTheme();
  const router = useRouter();

  /* ---------------- STEP 1 ---------------- */
  const handleSendCode = async () => {
    if (!phone.replace(/\D/g, '')) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setIsLoading(true);
    try {
      const {user, code} = await getUserByPhone(phone);
      if (!user) {
        throw new Error('User not found');
      }
      setServerOtp(code)

      setStep(2);
      Alert.alert('Code Sent', `A verification code has been sent to ${phone}.\n\n(Code: ${code})`);
    } catch {
      Alert.alert('Error', 'Phone number not found.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------- STEP 2 ---------------- */
  const handleVerifyCode = () => {
    if (code.length < OTP_LENGTH || code !== serverOtp) {
      Alert.alert('Error', 'Invalid verification code');
      return;
    }
    console.log("Code verified: ", code)

    // 🔐 Replace with real verification logic
    setStep(3);
  };

  /* ---------------- STEP 3 ---------------- */
  const handleResetPassword = async () => {
    if (!password || password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    console.log("Password reset to: ", password, " for phone: ", phone)

    const res = await changePassword(phone, password)

    console.log(res)

    // 🔐 Replace with real password update logic
    Alert.alert('Success', 'Password reset successfully', [
      {
        text: 'Sign In',
        onPress: () => router.replace('/(auth)/login'),
      },
    ]);
  };

  const handleOtpChange = (value: string, index: number) => {
  if (!/^\d?$/.test(value)) return;

  const newOtp = [...otp];
  newOtp[index] = value;
  setOtp(newOtp);

  if (value && index < OTP_LENGTH - 1) {
    inputs.current[index + 1]?.focus();
  }

  if (newOtp.every(digit => digit !== '')) {
    setCode(newOtp.join(''));
  }
};

const handleOtpBackspace = (index: number) => {
  console.log(otp[index], index)
  if (otp[index] === '' && index > 0) {
    inputs.current[index - 1]?.focus();
  }
};


  return (
    <ScrollView className={`flex-1 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}
    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
    >
      <View className="flex-1 px-6 py-12 justify-center">
        {/* Header */}
        <View className="items-center mb-12">
          <View className="w-20 h-20 rounded-2xl bg-brand/10 items-center justify-center mb-6">
            <Ionicons
              name="key-outline"
              size={32}
              color={isDark ? '#38bdf8' : '#0ea5e9'}
            />
          </View>

          <Text className={`text-3xl font-bold mb-3 ${isDark ? 'text-dark-text' : 'text-text'}`}>
            Reset Password
          </Text>

          <Text className={`text-base text-center ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}`}>
            {step === 1 && 'Enter your phone to receive a reset code'}
            {step === 2 && 'Enter the verification code sent to your phone'}
            {step === 3 && 'Create your new password'}
          </Text>
        </View>

        {/* STEP 1 */}
        {step === 1 && (
          <View>
            <Input
              label="Phone Number"
              placeholder="+257 79 12 34 56"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              className="mb-6"
            />
            <Button
              onPress={handleSendCode}
              loading={isLoading}
              size="lg"
              className="rounded-xl mb-6"
            >
              Send Verification Code
            </Button>
          </View>
        )}

      {/* STEP 2 */}
          {step === 2 && (
            <View className="items-center">
              <View className="flex-row justify-between w-full mb-8 px-4">
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputs.current[index] = ref;
                    }}

                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={({ nativeEvent }) => {
                      console.log(nativeEvent.key, index);
                      if (nativeEvent.key === 'Backspace') {
                        handleOtpBackspace(index);
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    className={`
                      w-14 h-16 rounded-sm text-center text-2xl font-semibold
                      ${isDark ? 'bg-dark-surface text-dark-text' : 'bg-surface text-text'}
                      border
                      ${digit ? 'border-brand' : isDark ? 'border-dark-border' : 'border-border'}
                    `}
                  />
                ))}
              </View>

              <Button
                onPress={handleVerifyCode}
                size="lg"
                className="rounded-xl mb-6 w-full"
                disabled={otp.some(d => d === '')}
              >
                Verify Code
              </Button>

              <Button
                variant="ghost"
                onPress={handleSendCode}
              >
                Resend Code
              </Button>
            </View>
          )}

        {/* STEP 3 */}
        {step === 3 && (
          <View>
            <Input
              label="New Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              className="mb-4"
            />
            <Input
              label="Confirm Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              className="mb-6"
            />
            <Button
              onPress={handleResetPassword}
              size="lg"
              className="rounded-xl mb-6"
            >
              Reset Password
            </Button>
          </View>
        )}

        {/* Back to Login */}
        <View className="items-center">
          <Link href="/(auth)/login" asChild>
            <Button variant="ghost">Back to Sign In</Button>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
