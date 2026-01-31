// components/LanguageSwitcher.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LangCode } from '@/language/LanguageUtils';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Enhanced language data with flags and colors
const LANGUAGES = [
  {
    code: LangCode.ki,
    name: 'Kirundi',
    nativeName: 'Ikirundi',
    flag: '🇧🇮',
    color: '#dc2626',
    description: 'Ururimi rw\'igihugu'
  },
  {
    code: LangCode.fr,
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    color: '#0ea5e9',
    description: 'Langue internationale'
  },
  {
    code: LangCode.sw,
    name: 'Swahili',
    nativeName: 'Kiswahili',
    flag: '🇹🇿',
    color: '#22c55e',
    description: 'Lugha ya Kiafrika'
  },
  {
    code: LangCode.en,
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    color: '#f59e0b',
    description: 'International language'
  },
];

interface LanguageSwitcherProps {
  variant?: 'button' | 'inline' | 'fullscreen';
  onLanguageChange?: (languageCode: string) => void;
}

export default function LanguageSwitcher({ 
  variant = 'button',
  onLanguageChange 
}: LanguageSwitcherProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { i18n } = useTranslation();

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = async (languageCode: string) => {
    console.log('🔄 Changing language to:', languageCode);
    await i18n.changeLanguage(languageCode);
    setIsVisible(false);
    onLanguageChange?.(languageCode);
  };

  // Compact button variant - perfect for headers
  if (variant === 'button') {
    return (
      <SafeAreaView className='flex-1'>
        <TouchableOpacity
          onPress={() => setIsVisible(true)}
          className="flex-row items-center px-4 py-3 rounded-2xl border border-border dark:border-dark-border bg-surface-soft dark:bg-dark-surface-soft shadow-card active:opacity-70"
        >
          <Text className="text-2xl mr-3">{currentLanguage.flag}</Text>
          <View className="flex-1">
            <Text className="text-sm font-inter-medium text-text dark:text-dark-text">
              {currentLanguage.name}
            </Text>
            <Text className="text-xs text-text-soft dark:text-dark-text-soft">
              {currentLanguage.nativeName}
            </Text>
          </View>
          <Ionicons 
            name="chevron-down" 
            size={20} 
            className="text-text-muted dark:text-dark-text-muted" 
          />
        </TouchableOpacity>

        <LanguageModal 
          visible={isVisible}
          onClose={() => setIsVisible(false)}
          currentLanguage={currentLanguage.code}
          onLanguageSelect={changeLanguage}
        />
      </SafeAreaView>
    );
  }

  // Inline variant - perfect for settings screens
  if (variant === 'inline') {
    return (
      <View className="rounded-2xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface shadow-card">
        {LANGUAGES.map((language, index) => (
          <TouchableOpacity
            key={language.code}
            onPress={() => changeLanguage(language.code)}
            className={`
              flex-row items-center px-6 py-4 border-b border-border dark:border-dark-border
              ${index < LANGUAGES.length - 1 ? 'border-b' : 'border-b-0'}
              active:opacity-70
            `}
          >
            <View 
              className="w-12 h-12 rounded-xl items-center justify-center mr-4"
              style={{ backgroundColor: `${language.color}15` }}
            >
              <Text className="text-2xl">{language.flag}</Text>
            </View>
            
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text className="text-base font-inter-semibold text-text dark:text-dark-text">
                  {language.name}
                </Text>
                {currentLanguage.code === language.code && (
                  <View 
                    className="ml-2 px-2 py-1 rounded-full"
                    style={{ backgroundColor: `${language.color}15` }}
                  >
                    <Text 
                      className="text-xs font-inter-medium"
                      style={{ color: language.color }}
                    >
                      Current
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-sm text-text-soft dark:text-dark-text-soft">
                {language.nativeName}
              </Text>
              <Text className="text-xs mt-1 text-text-muted dark:text-dark-text-muted">
                {language.description}
              </Text>
            </View>

            {currentLanguage.code === language.code ? (
              <View 
                className="w-6 h-6 rounded-full items-center justify-center"
                style={{ backgroundColor: language.color }}
              >
                <Ionicons name="checkmark" size={16} color="white" />
              </View>
            ) : (
              <View className="w-6 h-6 rounded-full border-2 border-border dark:border-dark-border" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // Fullscreen modal variant - perfect for onboarding
  return (
    <>
      <TouchableOpacity
        onPress={() => setIsVisible(true)}
        className="flex-row items-center justify-center px-8 py-4 rounded-2xl bg-brand dark:bg-brand shadow-button active:opacity-80"
      >
        <Text className="text-xl mr-3 text-white">{currentLanguage.flag}</Text>
        <Text className="text-base font-inter-semibold text-white">
          Change Language
        </Text>
      </TouchableOpacity>

      <LanguageModal 
        visible={isVisible}
        onClose={() => setIsVisible(false)}
        currentLanguage={currentLanguage.code}
        onLanguageSelect={changeLanguage}
        fullScreen
      />
    </>
  );
}

// Language Modal Component
interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
  currentLanguage: string;
  onLanguageSelect: (code: string) => void;
  fullScreen?: boolean;
}

function LanguageModal({ 
  visible, 
  onClose, 
  currentLanguage, 
  onLanguageSelect,
  fullScreen = false 
}: LanguageModalProps) {
  const ModalContent = () => (
    <View className="flex-1 bg-surface dark:bg-dark-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border dark:border-dark-border">
        <Text className="text-2xl font-inter-bold text-text dark:text-dark-text">
          Select Language
        </Text>
        <TouchableOpacity
          onPress={onClose}
          className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
        >
          <Ionicons 
            name="close" 
            size={24} 
            className="text-text-muted dark:text-dark-text-muted"
          />
        </TouchableOpacity>
      </View>

      {/* Language Grid */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap justify-between">
          {LANGUAGES.map((language) => (
            <LanguageCard
              key={language.code}
              language={language}
              isSelected={currentLanguage === language.code}
              onSelect={() => onLanguageSelect(language.code)}
            />
          ))}
        </View>

        {/* Help Text */}
        <View className="mt-8 p-4 rounded-2xl bg-surface-soft dark:bg-dark-surface-soft border border-border dark:border-dark-border">
          <View className="flex-row items-start">
            <Ionicons 
              name="information-circle" 
              size={20} 
              className="text-brand dark:text-brand mt-0.5 mr-3"
            />
            <View className="flex-1">
              <Text className="text-sm font-inter-semibold text-text dark:text-dark-text">
                Language Settings
              </Text>
              <Text className="text-sm mt-1 text-text-soft dark:text-dark-text-soft">
                Your language preference will be saved and used across the app. 
                You can change it anytime from settings.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  if (fullScreen) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <ModalContent />
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ModalContent />
    </Modal>
  );
}

// Individual Language Card Component
interface LanguageCardProps {
  language: typeof LANGUAGES[0];
  isSelected: boolean;
  onSelect: () => void;
}

function LanguageCard({ language, isSelected, onSelect }: LanguageCardProps) {
  const cardWidth = (SCREEN_WIDTH - 72) / 2;

  return (
    <TouchableOpacity
      onPress={onSelect}
      style={{ width: cardWidth }}
      className={`
        mb-6 p-4 rounded-2xl border-2 bg-surface-soft dark:bg-dark-surface-soft
        ${isSelected 
          ? 'border-brand shadow-button' 
          : 'border-border dark:border-dark-border'
        }
        active:opacity-70
      `}
    >
      {/* Flag and Status */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-3xl">{language.flag}</Text>
        {isSelected && (
          <View 
            className="w-6 h-6 rounded-full items-center justify-center"
            style={{ backgroundColor: language.color }}
          >
            <Ionicons name="checkmark" size={14} color="white" />
          </View>
        )}
      </View>

      {/* Language Names */}
      <Text className="text-lg font-inter-semibold mb-1 text-text dark:text-dark-text">
        {language.name}
      </Text>
      <Text className="text-sm font-inter-medium mb-2 text-text-soft dark:text-dark-text-soft">
        {language.nativeName}
      </Text>

      {/* Description */}
      <Text className="text-xs text-text-muted dark:text-dark-text-muted">
        {language.description}
      </Text>

      {/* Selection Indicator */}
      <View 
        className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl ${
          isSelected ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundColor: language.color }}
      />
    </TouchableOpacity>
  );
}