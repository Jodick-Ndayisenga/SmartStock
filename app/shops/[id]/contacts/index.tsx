// app/shops/[id]/contacts/index.tsx
import React, { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, FlatList, TouchableOpacity, View, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Contact } from '@/database/models/Contact';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import PremiumHeader from '@/components/layout/PremiumHeader';
import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import database from '@/database';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';

interface ContactListScreenProps {
  contacts: Contact[];
  shopId: string;  // This will come from the wrapper component, not from observables
  selectFor?: string;
}

function ContactListScreen({ contacts, shopId, selectFor }: ContactListScreenProps) {
  const router = useRouter();
  const { tempSelectedContact, setTempSelectedContact } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleSelect = useCallback((contact: Contact) => {
    if (selectFor) {
      setTempSelectedContact(contact.id);
      router.back();
    } else {
      // Navigate to contact details/edit page
      router.push(`/shops/${shopId}/contacts/${contact.id}`);
    }
  }, [selectFor, setTempSelectedContact, router, shopId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // The contacts will automatically update due to observable
    // We just need to simulate refresh for UX
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderContact = useCallback(({ item }: { item: Contact }) => {
    const isCustomer = item.role === 'customer' || item.role === 'client';
    const isSupplier = item.role === 'supplier';
    const icon = isCustomer ? 'person' : isSupplier ? 'business' : 'people';
    const color = isCustomer ? '#3b82f6' : isSupplier ? '#10b981' : '#8b5cf6';

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
            {item.phone && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="call-outline" size={14} color="#64748b" />
                <ThemedText variant="muted" size="sm" className="ml-1">
                  {item.phone}
                </ThemedText>
              </View>
            )}
            {item.email && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="mail-outline" size={14} color="#64748b" />
                <ThemedText variant="muted" size="sm" className="ml-1">
                  {item.email}
                </ThemedText>
              </View>
            )}
            <View className="flex-row items-center mt-1">
              <Ionicons 
                name={isCustomer ? 'person-circle' : isSupplier ? 'business' : 'people-circle'} 
                size={14} 
                color={color} 
              />
              <ThemedText 
                variant="muted" 
                size="sm"
                className="ml-1"
                style={{ color }}
              >
                {isCustomer ? 'Customer' : isSupplier ? 'Supplier' : 'Client'}
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
  }, [handleSelect, selectFor, tempSelectedContact]);

  // Loading state
  if (!contacts) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader 
          title="Contacts" 
          showBackButton 
          subtitle={selectFor ? 'Tap a contact to select' : 'Your customers & suppliers'}
        />
        <Loading />
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
      />

      <View className="flex-1 py-4 px-2">
        {contacts.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No Contacts Yet"
            description={selectFor 
              ? 'You\'ll need to add contacts first to select one.' 
              : 'Add your first customer or supplier to get started!'}
            action={!selectFor ? {
              label: 'Add Contact',
              onPress: () => router.push(`/shops/${shopId}/contacts/add`)
            } : undefined}
          />
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={item => item.id}
            renderItem={renderContact}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#3b82f6']}
                tintColor="#3b82f6"
              />
            }
          />
        )}
        
        {!selectFor && (
          <Button
            icon="add"
            onPress={() => router.push(`/shops/${shopId}/contacts/add`)}
            className="mt-4"
          >
            Add Contact
          </Button>
        )}
      </View>
    </View>
  );
}

// Create the enhanced component with observables
const EnhancedContactList = withObservables(
  ['shopId', 'selectFor'],
  ({ shopId, selectFor }: { shopId: string; selectFor?: string }) => {
    // Build the query based on whether we're selecting for sale
    if (selectFor === 'sale') {
      // If selecting for sale, only show customers and clients
      return {
        contacts: database.get<Contact>('contacts').query(
          Q.where('shop_id', shopId),
          Q.or(
            Q.where('role', 'customer'),
            Q.where('role', 'client'),
            Q.where('role', 'both')
          )
        ).observe(),
      };
    } else {
      // Otherwise show all active contacts (customers, suppliers, clients)
      return {
        contacts: database.get<Contact>('contacts').query(
          Q.where('shop_id', shopId)
        ).observe(),
      };
    }
  }
)(ContactListScreen);

// Wrapper component that provides the shopId and selectFor props
export default function ContactListScreenWrapper() {
  const { id: shopId } = useLocalSearchParams<{ id: string }>();
  const { selectFor } = useLocalSearchParams<{ selectFor?: string }>();
  const router = useRouter();
  
  // Check if shop exists and handle empty state
  if (!shopId) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Contacts" showBackButton />
        <EmptyState
          icon="business-outline"
          title="No Shop Found"
          description="Please select a shop first"
          action={{
            label: "Go Back",
            onPress: () => router.back(),
          }}
        />
      </View>
    );
  }

  // Pass shopId and selectFor as props to the enhanced component
  return <EnhancedContactList shopId={shopId} selectFor={selectFor} />;
}