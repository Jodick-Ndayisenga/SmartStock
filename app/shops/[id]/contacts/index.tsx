// app/shops/[id]/contacts/index.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Contact } from '@/database/models/Contact';
import { getContactsByShop } from '@/services/contactService';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import PremiumHeader from '@/components/layout/PremiumHeader';

export default function ContactListScreen() {
  const { id: shopId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tempSelectedContact, setTempSelectedContact } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  //console.log('shopId:', shopId);

  

  const selectFor = useLocalSearchParams().selectFor as string | undefined;

 


  useEffect(() => {
    loadContacts();
  }, [shopId]);

  const loadContacts = async () => {
    try {
        
      const contactRecords = await getContactsByShop(shopId);
      setContacts(contactRecords);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      Alert.alert('Error', 'Could not load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (contact: Contact) => {
    if (selectFor) {
      setTempSelectedContact(contact.id);
      router.back();
    } else {
      // Optional: navigate to detail later
      // router.push(`/shops/${shopId}/contacts/${contact.id}`);
    }
  };

  const renderContact = ({ item }: { item: Contact }) => {
    const isCustomer = item.role === 'customer' || item.role === 'client';
    const icon = isCustomer ? 'person' : 'business';
    const color = isCustomer ? '#3b82f6' : '#10b981'; // blue for customer, green for supplier

    return (
      <TouchableOpacity
        onPress={() => handleSelect(item)}
        className="p-4 bg-white dark:bg-dark-surface rounded-2xl mb-3 shadow-sm border border-border/30 dark:border-dark-border/30"
        activeOpacity={0.9}
      >
        <View className="flex-row items-center">
          {/* Role Icon */}
          <View 
            className="w-12 h-12 rounded-xl items-center justify-center mr-4"
            style={{ backgroundColor: `${color}20` }}
          >
            <Ionicons name={icon} size={24} color={color} />
          </View>

          {/* Contact Info */}
          <View className="flex-1">
            <ThemedText variant="default" size="lg" className="font-medium">
              {item.name}
            </ThemedText>
            <View className="flex-row items-center mt-1">
              <Ionicons 
                name={isCustomer ? 'call-outline' : 'call'} 
                size={14} 
                color="#64748b" 
                className="mr-1"
              />
              <ThemedText variant="muted" size="sm">
                {item.phone}
              </ThemedText>
            </View>
            <View className="flex-row items-center mt-1">
              <Ionicons 
                name={isCustomer ? 'person-circle' : 'business'} 
                size={14} 
                color={color} 
                className="mr-1"
              />
              <ThemedText 
                variant="muted" 
                size="sm"
                style={{ color }}
              >
                {isCustomer ? 'Customer' : 'Supplier'}
              </ThemedText>
            </View>
          </View>

          {/* Selection Indicator */}
          {selectFor && tempSelectedContact === item.id && (
            <View className="ml-2">
              <Ionicons name="checkmark-circle" size={28} color="#10b981" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader 
          title="Contacts" 
          showBackButton 
          subtitle={selectFor ? 'Tap a contact to select' : 'Your customers & suppliers'}
        />
        <View className="flex-1 items-center justify-center p-6">
          <ThemedText variant="muted">Loading your contacts...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title="Contacts" 
        showBackButton 
        subtitle={selectFor 
          ? 'Tap a contact to select' 
          : 'Manage your customers and suppliers'
        }
        action={
          !selectFor && (
            <Button
              variant="secondary"
              size="sm"
              icon="add"
              onPress={() => router.push(`/shops/${shopId}/contacts/add`)}
            >
              New
            </Button>
          )
        }
      />

      <View className="flex-1 py-4 px-2">
        {contacts.length === 0 ? (
          <View className="flex-1 items-center justify-center p-6">
            <View className="w-16 h-16 rounded-full bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mb-4">
              <Ionicons name="people-outline" size={32} color="#94a3b8" />
            </View>
            <ThemedText variant="heading" size="lg" className="text-center mb-2">
              No Contacts Yet
            </ThemedText>
            <ThemedText variant="muted" size="sm" className="text-center mb-6">
              {selectFor 
                ? 'You’ll need to add contacts first to select one.' 
                : 'Add your first customer or supplier to get started!'}
            </ThemedText>
            
          </View>
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={item => item.id}
            renderItem={renderContact}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
        <Button
            icon="add"
            onPress={() => router.push(`/shops/${shopId}/contacts/add`)}
            >
            Add Contacts
            </Button>
      </View>

    </View>
  );
}