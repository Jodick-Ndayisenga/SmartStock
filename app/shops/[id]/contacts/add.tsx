// app/shops/[id]/contacts/add.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { ThemedText } from '@/components/ui/ThemedText';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

// Database
import database from '@/database';
import { useAuth } from '@/context/AuthContext';
import { Contact } from '@/database/models/Contact';

type ContactRole = 'customer' | 'client' | 'supplier' | 'both';

interface RoleOption {
  value: ContactRole;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'customer',
    label: 'Customer',
    icon: 'people-outline',
    description: 'Regular customer who buys from you'
  },
  {
    value: 'client',
    label: 'Client',
    icon: 'person-outline',
    description: 'Client with special terms'
  },
  {
    value: 'supplier',
    label: 'Supplier',
    icon: 'cube-outline',
    description: 'Business that supplies you products'
  },
  {
    value: 'both',
    label: 'Both',
    icon: 'sync-outline',
    description: 'Acts as both customer and supplier'
  }
];

export default function NewContactScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const { colorScheme } = useColorScheme();
  const { currentShop } = useAuth();
  const isDark = colorScheme === 'dark';
  const isFromSale = params.from === 'sale';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    role: 'customer' as ContactRole,
    isDefaultAlertContact: false
  });

  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]{8,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !currentShop) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await database.write(async () => {
        await database.get<Contact>('contacts').create(contact => {
          contact.shopId = currentShop.id;
          contact.name = formData.name;
          contact.phone = formData.phone;
          contact.email = formData.email || '';
          contact.address = formData.address || '';
          contact.role = formData.role;
          contact.isDefaultAlertContact = formData.isDefaultAlertContact;
        });
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        '✅ Contact Created',
        `${formData.name} has been added to your contacts.`,
        [
          {
            text: 'Done',
            onPress: () => {
              if (isFromSale) {
                // Go back to sales screen with the new contact selected
                router.back();
              } else {
                router.back();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating contact:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('❌ Error', 'Failed to create contact. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: typeof formData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!currentShop) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader 
          title="New Contact" 
          showBackButton 
        />
        <View className="flex-1 items-center justify-center py-4 px-2">
          <View className="w-20 h-20 rounded-full bg-error-soft items-center justify-center mb-4">
            <Ionicons name="warning" size={32} color="#ef4444" />
          </View>
          <ThemedText variant="heading" size="lg" className="text-center mb-2">
            No Shop Found
          </ThemedText>
          <ThemedText variant="muted" size="base" className="text-center">
            You need to create a shop first before adding contacts
          </ThemedText>
          <Button
            variant="default"
            size="lg"
            onPress={() => router.push('/(auth)/create-shop')}
            className="mt-6"
          >
            Create Shop
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title="New Contact" 
        showBackButton 
        subtitle={isFromSale ? "Select a customer for this sale" : undefined}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        >
          {/* Header Card */}
          <Card variant="elevated" className="mb-6 overflow-hidden">
            <View className="h-24 bg-gradient-to-r from-brand/10 to-accent/10 items-center justify-center">
              <View className="w-16 h-16 rounded-full bg-surface dark:bg-dark-surface items-center justify-center shadow-soft">
                <Ionicons 
                  name="person-add" 
                  size={32} 
                  color={isDark ? '#38bdf8' : '#0ea5e9'} 
                />
              </View>
            </View>
            <CardContent className="p-4">
              <ThemedText variant="heading" size="lg" className="text-center">
                Add New Contact
              </ThemedText>
              <ThemedText variant="muted" size="sm" className="text-center mt-1">
                Enter the contact details below
              </ThemedText>
            </CardContent>
          </Card>

          {/* Contact Form */}
          <Card variant="elevated" className="mb-4">
            <CardContent className="p-4">
              {/* Name Input */}
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="person" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                  <ThemedText variant="label" className="ml-2 font-medium">
                    Full Name <ThemedText variant="error" size="sm">*</ThemedText>
                  </ThemedText>
                </View>
                <Input
                  placeholder="Enter contact name"
                  value={formData.name}
                  onChangeText={(value) => updateField('name', value)}
                  error={errors.name}
                  leftIcon="person-outline"
                  autoCapitalize="words"
                  className={errors.name ? 'border-error' : ''}
                />
              </View>

              {/* Phone Input */}
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="call" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                  <ThemedText variant="label" className="ml-2 font-medium">
                    Phone Number <ThemedText variant="error" size="sm">*</ThemedText>
                  </ThemedText>
                </View>
                <Input
                  placeholder="+257 XX XX XX XX"
                  value={formData.phone}
                  onChangeText={(value) => updateField('phone', value)}
                  error={errors.phone}
                  leftIcon="call-outline"
                  keyboardType="phone-pad"
                  className={errors.phone ? 'border-error' : ''}
                />
              </View>

              {/* Email Input */}
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="mail" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                  <ThemedText variant="label" className="ml-2 font-medium">
                    Email Address
                  </ThemedText>
                </View>
                <Input
                  placeholder="email@example.com"
                  value={formData.email}
                  onChangeText={(value) => updateField('email', value)}
                  error={errors.email}
                  leftIcon="mail-outline"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className={errors.email ? 'border-error' : ''}
                />
              </View>

              {/* Address Input */}
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="location" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                  <ThemedText variant="label" className="ml-2 font-medium">
                    Address
                  </ThemedText>
                </View>
                <Input
                  placeholder="Street, Avenue, BP..."
                  value={formData.address}
                  onChangeText={(value) => updateField('address', value)}
                  leftIcon="location-outline"
                  multiline
                  numberOfLines={2}
                  className="min-h-[80px]"
                />
              </View>
            </CardContent>
          </Card>

          {/* Role Selection */}
          <Card variant="elevated" className="mb-6">
            <CardHeader
              title="Contact Role"
              subtitle="How will you interact with this contact?"
            />
            <CardContent className="p-4">
              <View className="gap-3">
                {ROLE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateField('role', option.value);
                    }}
                    className={`
                      flex-row items-center p-4 rounded-xl border-2
                      ${formData.role === option.value
                        ? 'border-brand bg-brand-soft dark:border-dark-brand dark:bg-dark-brand-soft'
                        : 'border-border dark:border-dark-border bg-surface dark:bg-dark-surface'
                      }
                    `}
                  >
                    <View className={`
                      w-12 h-12 rounded-full items-center justify-center mr-3
                      ${formData.role === option.value
                        ? 'bg-brand dark:bg-dark-brand'
                        : 'bg-surface-soft dark:bg-dark-surface-soft'
                      }
                    `}>
                      <Ionicons 
                        name={option.icon} 
                        size={24} 
                        color={formData.role === option.value 
                          ? '#ffffff' 
                          : isDark ? '#94a3b8' : '#64748b'
                        } 
                      />
                    </View>
                    
                    <View className="flex-1">
                      <ThemedText 
                        variant="default" 
                        size="base" 
                        className="font-semibold mb-1"
                      >
                        {option.label}
                      </ThemedText>
                      <ThemedText variant="muted" size="sm">
                        {option.description}
                      </ThemedText>
                    </View>

                    {formData.role === option.value && (
                      <View className="w-6 h-6 rounded-full bg-brand dark:bg-dark-brand items-center justify-center">
                        <Ionicons name="checkmark" size={16} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </CardContent>
          </Card>

          {/* Alert Contact Option */}
          <Card variant="elevated" className="mb-6">
            <CardContent className="p-4">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateField('isDefaultAlertContact', !formData.isDefaultAlertContact);
                }}
                className="flex-row items-center"
              >
                <View className={`
                  w-6 h-6 rounded-md border-2 mr-3 items-center justify-center
                  ${formData.isDefaultAlertContact
                    ? 'bg-warning border-warning dark:bg-dark-warning dark:border-dark-warning'
                    : 'border-border dark:border-dark-border'
                  }
                `}>
                  {formData.isDefaultAlertContact && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
                </View>
                <View className="flex-1">
                  <ThemedText variant="default" size="base" className="font-medium">
                    Set as Default Alert Contact
                  </ThemedText>
                  <ThemedText variant="muted" size="sm">
                    This contact will receive low stock and expiry alerts
                  </ThemedText>
                </View>
                <Ionicons 
                  name="notifications-outline" 
                  size={24} 
                  color={formData.isDefaultAlertContact 
                    ? (isDark ? '#fbbf24' : '#f59e0b')
                    : (isDark ? '#94a3b8' : '#64748b')
                  } 
                />
              </TouchableOpacity>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <View className="mt-4">
            {isFromSale && (
              <View className="mb-4 p-4 bg-warning-soft dark:bg-dark-warning-soft rounded-xl flex-row items-center">
                <Ionicons 
                  name="information-circle" 
                  size={24} 
                  color={isDark ? '#fbbf24' : '#f59e0b'} 
                />
                <ThemedText className="flex-1 ml-3 text-warning dark:text-dark-warning">
                  This contact will be automatically selected for your sale
                </ThemedText>
              </View>
            )}

            <Button
              size="lg"
              onPress={handleSubmit}
              disabled={isSubmitting}
              icon={isSubmitting ? undefined : "checkmark-circle"}
              className="w-full"
            >
              {isSubmitting ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#ffffff" />
                  <ThemedText className="text-white ml-2">Creating...</ThemedText>
                </View>
              ) : (
                `Create Contact ${isFromSale ? '& Continue Sale' : ''}`
              )}
            </Button>

            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-3 py-3"
            >
              <ThemedText variant="muted" size="base" className="text-center">
                Cancel
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Missing CardHeader component - add this if not already exists
const CardHeader: React.FC<{
  title: string;
  subtitle?: string;
}> = ({ title, subtitle }) => (
  <View className="p-4 border-b border-border dark:border-dark-border">
    <ThemedText variant="heading" size="lg" className="font-bold">
      {title}
    </ThemedText>
    {subtitle && (
      <ThemedText variant="muted" size="sm" className="mt-1">
        {subtitle}
      </ThemedText>
    )}
  </View>
);