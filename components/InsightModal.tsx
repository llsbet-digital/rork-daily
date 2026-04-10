import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import Colors, { CARD_COLORS } from '@/constants/colors';
import { ArticleInsight } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.62;

interface InsightModalProps {
  insight: ArticleInsight;
  onDismiss: () => void;
}

export default function InsightModal({ insight, onDismiss }: InsightModalProps) {
  const translateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 600,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onDismiss);
  };

  return (
    <Modal transparent animationType="none" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Animated.View style={[styles.backdropInner, { opacity: backdropOpacity }]} />
      </Pressable>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.articleTitle} numberOfLines={2}>{insight.articleTitle}</Text>
          </View>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{insight.category}</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {/* Summary */}
          <LinearGradient
            colors={[...CARD_COLORS]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryGradient}
          >
            <View style={styles.summaryInner}>
              <Text style={styles.sectionLabel}>Summary</Text>
              <Text style={styles.summaryText}>{insight.summary}</Text>
            </View>
          </LinearGradient>

          {/* Key Learnings */}
          {insight.keyTakeaways.length > 0 && (
            <View style={styles.learningsSection}>
              <View style={styles.learningsHeader}>
                <Text style={styles.sectionLabel}>Key Learnings</Text>
                <Text style={styles.learningsCount}>{insight.keyTakeaways.length} learnings</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.learningsRow}
              >
                {insight.keyTakeaways.map((item, idx) => (
                  <LinearGradient
                    key={idx}
                    colors={[...CARD_COLORS]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.learningCardBorder}
                  >
                    <View style={styles.learningCardInner}>
                      <Text style={styles.learningCardText} numberOfLines={6}>{item}</Text>
                      <View style={styles.learningCardFooter}>
                        <Text style={styles.learningCardSource} numberOfLines={1}>{insight.articleTitle}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>

        {/* Done button */}
        <TouchableOpacity style={styles.doneBtn} onPress={dismiss} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '88%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 23,
    letterSpacing: -0.3,
    fontFamily: 'CrimsonText_700Bold',
  },
  categoryPill: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    flexShrink: 0,
    marginTop: 2,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(0,0,0,0.4)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 10,
  },
  summaryGradient: {
    borderRadius: 20,
    padding: 3,
    marginBottom: 24,
  },
  summaryInner: {
    backgroundColor: '#FAF8F5',
    borderRadius: 17,
    padding: 18,
  },
  summaryText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 23,
    letterSpacing: -0.1,
  },
  learningsSection: {
    marginBottom: 8,
  },
  learningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  learningsCount: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  learningsRow: {
    gap: 10,
    paddingRight: 4,
  },
  learningCardBorder: {
    width: CARD_WIDTH,
    borderRadius: 18,
    padding: 2.5,
    flexShrink: 0,
  },
  learningCardInner: {
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    padding: 14,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  learningCardText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
    letterSpacing: -0.1,
    flex: 1,
  },
  learningCardFooter: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 8,
  },
  learningCardSource: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  doneBtn: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1A1A1A',
  },
});
