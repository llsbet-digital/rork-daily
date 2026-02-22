import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, Tag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';

export default function OnboardingInterests() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();
  const [interests, setInterests] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const addInterest = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests(prev => [...prev, trimmed]);
      setInputValue('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [inputValue, interests]);

  const removeInterest = useCallback((interest: string) => {
    setInterests(prev => prev.filter(i => i !== interest));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleContinue = useCallback(async () => {
    if (interests.length >= 3) {
      await completeOnboarding(interests);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)' as any);
    }
  }, [interests, completeOnboarding, router]);

  const canContinue = interests.length >= 3;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>PERSONALIZE YOUR FEED</Text>
        <Text style={[styles.countLabel, canContinue && styles.countLabelActive]}>
          {interests.length} added
        </Text>
      </View>

      <Text style={styles.title}>What interests you?</Text>
      <Text style={styles.subtitle}>Add at least 3 topics to personalize your feed</Text>

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={addInterest}
          activeOpacity={0.7}
        >
          <Plus size={18} color={Colors.white} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="e.g. Swift development, Climate tech..."
          placeholderTextColor={Colors.textMuted}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={addInterest}
          returnKeyType="done"
          testID="interest-input"
        />
      </View>

      <ScrollView style={styles.tagsContainer} showsVerticalScrollIndicator={false}>
        {interests.length > 0 ? (
          <Animated.View style={[styles.tagsWrap, { transform: [{ scale: scaleAnim }] }]}>
            {interests.map((interest) => (
              <View key={interest} style={styles.tag}>
                <Text style={styles.tagText}>{interest}</Text>
                <TouchableOpacity
                  onPress={() => removeInterest(interest)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </Animated.View>
        ) : (
          <View style={styles.emptyState}>
            <Tag size={40} color={Colors.primaryMuted} />
            <Text style={styles.emptyText}>Start typing to add your interests</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          onPress={handleContinue}
          activeOpacity={canContinue ? 0.8 : 1}
          disabled={!canContinue}
          testID="continue-button"
        >
          <Text style={[styles.continueButtonText, !canContinue && styles.continueButtonTextDisabled]}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  countLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  countLabelActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 20,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 12,
  },
  tagsContainer: {
    flex: 1,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tagText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  backText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  continueButton: {
    backgroundColor: Colors.dark,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 36,
  },
  continueButtonDisabled: {
    backgroundColor: '#D5D5D5',
  },
  continueButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  continueButtonTextDisabled: {
    color: Colors.textMuted,
  },
});
