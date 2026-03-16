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
import { ArrowLeft, Plus, X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SUGGESTION_ROWS: string[][] = [
  ['Artificial Intelligence', 'Blockchain', 'Climate Tech', 'Data Science', 'Cybersecurity', 'Robotics'],
  ['UX Design', 'Product Management', 'Remote Work', 'Startups', 'Venture Capital', 'Growth Hacking'],
  ['Machine Learning', 'Web Development', 'Mobile Apps', 'Cloud Computing', 'DevOps', 'APIs'],
  ['Psychology', 'Neuroscience', 'Health & Wellness', 'Fitness', 'Nutrition', 'Mental Health'],
  ['Sustainability', 'Space Tech', 'Biotech', 'Quantum Computing', 'AR/VR', 'IoT'],
  ['Leadership', 'Productivity', 'Career Growth', 'Public Speaking', 'Networking', 'Freelancing'],
  ['Fintech', 'Crypto', 'E-commerce', 'SaaS', 'Marketing', 'Branding'],
  ['Travel', 'Photography', 'Writing', 'Music', 'Film', 'Architecture'],
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

  const estimatedRowWidth = items.reduce((acc, item) => acc + item.length * 9 + BADGE_PADDING_H * 2 + ROW_ITEM_GAP, 0);

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
        if (finished) {
          createAnimation();
        }
      });
    };

    createAnimation();

    return () => {
      if (animRef.current) {
        animRef.current.stop();
      }
    };
  }, [direction, estimatedRowWidth]);

  return (
    <View style={rowStyles.container}>
      <Animated.View
        style={[
          rowStyles.row,
          { transform: [{ translateX: scrollAnim }] },
        ]}
      >
        {tripled.map((item, index) => {
          const isSelected = selectedInterests.includes(item);
          return (
            <TouchableOpacity
              key={`${item}-${index}`}
              style={[
                rowStyles.badge,
                isSelected && rowStyles.badgeSelected,
              ]}
              onPress={() => onToggle(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  rowStyles.badgeText,
                  isSelected && rowStyles.badgeTextSelected,
                ]}
                numberOfLines={1}
              >
                {item}
              </Text>
              {isSelected && (
                <Check size={14} color={Colors.white} strokeWidth={3} />
              )}
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
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  badgeSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1A1A1A',
  },
  badgeTextSelected: {
    color: Colors.white,
  },
});

export default function ManageInterestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateInterests } = useApp();
  const [interests, setInterests] = useState<string[]>(user?.interests ?? []);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleInterest = useCallback((item: string) => {
    setInterests(prev => {
      if (prev.includes(item)) {
        return prev.filter(i => i !== item);
      }
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

  const handleSave = useCallback(async () => {
    if (interests.length < 3) return;
    setIsSaving(true);
    try {
      await updateInterests(interests);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      console.log('[ManageInterests] Save error:', e);
    } finally {
      setIsSaving(false);
    }
  }, [interests, updateInterests, router]);

  const hasChanges = JSON.stringify(interests.sort()) !== JSON.stringify((user?.interests ?? []).sort());

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Interests</Text>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!hasChanges || interests.length < 3) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          activeOpacity={hasChanges && interests.length >= 3 ? 0.7 : 1}
          disabled={!hasChanges || interests.length < 3 || isSaving}
        >
          <Text
            style={[
              styles.saveButtonText,
              (!hasChanges || interests.length < 3) && styles.saveButtonTextDisabled,
            ]}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.scrollingArea, { opacity: fadeAnim }]}>
        <View style={styles.gradientOverlayLeft} />
        <View style={styles.gradientOverlayRight} />
        {SUGGESTION_ROWS.map((row, index) => (
          <ScrollingRow
            key={index}
            items={row}
            direction={index % 2 === 0 ? 'left' : 'right'}
            selectedInterests={interests}
            onToggle={toggleInterest}
          />
        ))}
      </Animated.View>

      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.selectedHeader}>
          <Text style={styles.selectedTitle}>Selected</Text>
          <Text style={[styles.selectedCount, interests.length >= 3 && styles.selectedCountActive]}>
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
          <Text style={styles.emptyHint}>Tap badges above or type below to add topics</Text>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="What topics are you interested in?"
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
            <Plus size={18} color={inputValue.trim() ? Colors.white : Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {interests.length < 3 && interests.length > 0 && (
          <Text style={styles.minHint}>Add {3 - interests.length} more to save</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    fontFamily: 'CrimsonText_700Bold',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.border,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  saveButtonTextDisabled: {
    color: Colors.textMuted,
  },
  scrollingArea: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingVertical: 10,
  },
  gradientOverlayLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 40,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  gradientOverlayRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    zIndex: 10,
    backgroundColor: 'transparent',
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
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  selectedCount: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  selectedCountActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    maxHeight: 100,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  selectedTagText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500' as const,
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7F5',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 14,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: Colors.border,
  },
  minHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
});
