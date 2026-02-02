// app/shops/[id]/contacts/add.tsx
import React, { useState } from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { createContact, ContactData } from '@/services/contactService';
import { useAuth } from '@/context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import PremiumHeader from '@/components/layout/PremiumHeader';

export default function AddContactScreen() {
  const { id: shopId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<'customer' | 'supplier'>('customer');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Name and phone are required');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setLoading(true);
      
      const contactData: ContactData = {
        shopId,
        name: name.trim(),
        phone: phone.trim(),
        role,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        isDefaultAlertContact: false,
      };

      await createContact(contactData);
      
      Alert.alert('Success', 'Contact created successfully');
      router.back();
    } catch (error: any) {
      console.error('Create contact error:', error);
      Alert.alert('Error', error.message || 'Failed to create contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
     <PremiumHeader title="Create Contact" showBackButton />
    <View className="flex-1  px-2">
      <Card variant="elevated">
        <CardHeader title="Add New Contact" />
        <CardContent className="gap-4">
          <View>
            <ThemedText variant="label" className="mb-1">Name *</ThemedText>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Full name"
            />
          </View>

          <View>
            <ThemedText variant="label" className="mb-1">Phone *</ThemedText>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View>
            <ThemedText variant="label" className="mb-1">Email</ThemedText>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              keyboardType="email-address"
            />
          </View>

          <View>
            <ThemedText variant="label" className="mb-1">Address</ThemedText>
            <Input
              value={address}
              onChangeText={setAddress}
              placeholder="Physical address"
            />
          </View>

          <View>
            <ThemedText variant="label" className="mb-1">Role</ThemedText>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setRole('customer')}
                className={`flex-1 p-3 rounded-lg border ${
                  role === 'customer'
                    ? 'border-brand bg-brand/10'
                    : 'border-border dark:border-dark-border'
                }`}
              >
                <ThemedText
                  variant={role === 'customer' ? 'brand' : 'default'}
                  className="text-center"
                >
                  Customer
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRole('supplier')}
                className={`flex-1 p-3 rounded-lg border ${
                  role === 'supplier'
                    ? 'border-brand bg-brand/10'
                    : 'border-border dark:border-dark-border'
                }`}
              >
                <ThemedText
                  variant={role === 'supplier' ? 'brand' : 'default'}
                  className="text-center"
                >
                  Supplier
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <Button
            onPress={handleSubmit}
            disabled={loading || !name.trim() || !phone.trim()}
            loading={loading}
          >
            Create Contact
          </Button>
        </CardContent>
      </Card>
    </View>
    </SafeAreaView>
     
  );
}