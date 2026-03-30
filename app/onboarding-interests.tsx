import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

const SUGGESTION_ROWS: string[][] = [
  ['Artificial Intelligence', 'Blockchain', 'Climate Tech', 'Data Science', 'Cybersecurity', 'Robotics'],
  ['UX Design', 'Product Management', 'Remote Work', 'Startups', 'Venture Capital', 'Growth Hacking'],
  ['Machine Learning', 'Web Development', 'Mobile Apps', 'Cloud Computing', 'DevOps', 'APIs'],
  ['Psychology', 'Neuroscience', 'Health & Wellness', 'Fitness', 'Nutrition', 'Mental Health'],
  ['Sustainability', 'Space Tech', 'Biotech', 'Quantum Computing', 'AR/VR', 'IoT'],
  ['Leadership', 'Productivity', 'Career Growth', 'Public Speaking', 'Networking', 'Freelancing'],
  ['Fintech', 'Crypto', 'E-commerce', 'SaaS', 'Marketing', 'Branding'],
];

const ROW_ITEM_GAP = 10;
const BADGE_PADDING_H = 20;
const BADGE_HEIGHT = 44;

function ScrollingRow({ items, direction, selectedInterests, onToggle }: {
  items: string[];
  direction: 'left' | 'right';
  selectedInterests: string[];
  onToggle: (item: string) => void;
}) {
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const tripled = [...items, ...items, ...items];
  const estimatedRowWidth = items.reduce(
    (acc, item) => acc + item.length * 9 + BADGE_PADDING_H * 2 + ROW_ITEM_GAP,
    0
  );

  useEffect(() => {
    const startVal = direction === 'left' ? 0 : -estimatedRowWidth;
    const endVal = direction === 'left' ? -estimatedRowWidth : 0;
    scrollAnim.setValue(startVal);
    const duration = estimatedRowWidth * 35;
    const createAnimation = () => {
      scrollAnim.setValue(startVal);
      animRef.current = Animated.timing(scrollAnim, {
        toValue: endVal,
        duration,
        useNativeDriver: true,
        isInteraction: false,
      });
      animRef.current.start(({ finished }) => {
        if (finished) createAnimation();
      });
    };
    createAnimation();
    return () => {
      if (animRef.current) animRef.current.stop();
    };
  }, [direction, estimatedRowWidth]);

  return (
    <View style={rowStyles.container}>
      <Animated.View style={[rowStyles.row, { transform: [{ translateX: scrollAnim }] }]}>
        {tripled.map((item, index) => {
          const isSelected = selectedInterests.includes(item);
          return (
            <TouchableOpacity
              key={`${item}-${index}`}
              style={[rowStyles.badge, isSelected && rowStyles.badgeSelected]}
              onPress={() => onToggle(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[rowStyles.badgeText, isSelected && rowStyles.badgeTextSelected]}
                numberOfLines={1}
              >
                {item}
              </Text>
              {isSelected && <Check size={14} color={Colors.dark} strokeWidth={3} />}
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: ROW_ITEM_GAP,
  },
  badge: {
    height: BADGE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: BADGE_PADDING_H,
    borderRadius: 22,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.dark,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  badgeTextSelected: {
    color: Colors.dark,
  },
});

export default function OnboardingInterests() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [interests, setInterests] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const toggleInterest = useCallback((item: string) => {
    setInterests(prev => {
      if (prev.includes(item)) return prev.filter(i => i !== item);
      return [...prev, item];
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const addCustomInterest = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests(prev => [...prev, trimmed]);
      setInputValue('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [inputValue, interests]);

  const removeInterest = useCallback((interest: string) => {
    setInterests(prev => prev.filter(i => i !== interest));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleContinue = useCallback(() => {
    if (interests.length >= 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: '/onboarding-sources', params: { interests: JSON.stringify(interests) } } as any);
    }
  }, [interests, router]);

  const canContinue = interests.length >= 3;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.titleSection}>
        <Text style={styles.title}>What interests you?</Text>
        <Text style={styles.subtitle}>Tap topics or type your own. Add at least 3.</Text>
      </View>

      <View style={styles.scrollingArea}>
        {SUGGESTION_ROWS.map((row, index) => (
          <ScrollingRow
            key={index}
            items={row}
            direction={index % 2 === 0 ? 'left' : 'right'}
            selectedInterests={interests}
            onToggle={toggleInterest}
          />
        ))}
      </View>

      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.selectedHeader}>
          <Text style={styles.selectedTitle}>Selected</Text>
          <Text style={[styles.selectedCount, canContinue && styles.selectedCountActive]}>
            {interests.length} topic{interests.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {interests.length > 0 ? (
          <View style={styles.selectedTags}>
            {interests.map((interest) => (
              <View key={interest} style={styles.selectedTag}>
                <Text style={styles.selectedTagText}>{interest}</Text>
                <TouchableOpacity
                  onPress={() => removeInterest(interest)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyHint}>Tap a topic above or type your own below</Text>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a custom topic..."
            placeholderTextColor={Colors.textMuted}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={addCustomInterest}
            returnKeyType="done"
            testID="interest-input"
          />
          <TouchableOpacity
            style={[styles.addButton, !inputValue.trim() && styles.addButtonDisabled]}
            onPress={addCustomInterest}
            activeOpacity={0.7}
            disabled={!inputValue.trim()}
          >
            <Plus size={18} color={inputValue.trim() ? '#1A1A1A' : Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          onPress={handleContinue}
          activeOpacity={canContinue ? 0.8 : 1}
          disabled={!canContinue}
          testID="continue-button"
        >
          <Text style={[styles.continueButtonText, !canContinue && styles.continueButtonTextDisabled]}>
            {canContinue ? 'Continue' : `Add ${3 - interests.length} more to continue`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backRow}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  titleSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
    fontFamily: 'CrimsonText_700Bold',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  scrollingArea: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingVertical: 10,
  },
  bottomSection: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  selectedCount: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  selectedCountActive: {
    color: '#1A1A1A',
    fontWeight: '600' as const,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
    maxHeight: 80,
    overflow: 'hidden',
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  selectedTagText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500' as const,
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 12,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  addButtonDisabled: {
    backgroundColor: Colors.border,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  continueButtonDisabled: {
    backgroundColor: Colors.border,
    borderColor: Colors.border,
  },
  continueButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  continueButtonTextDisabled: {
    color: Colors.textMuted,
  },
  backRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
