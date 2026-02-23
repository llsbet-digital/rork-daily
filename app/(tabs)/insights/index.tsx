import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Lightbulb, BookOpen } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { ArticleInsight } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const INSIGHT_CARD_WIDTH = SCREEN_WIDTH * 0.6;

const GRADIENT_SETS = [
  ['#F9EDF0', '#F5E0E4', '#F7EADF'],
  ['#F0E8F3', '#F5E2E6', '#F9EDE5'],
  ['#F5EADF', '#F7E4E0', '#F3E8F0'],
  ['#EDE8F5', '#F2E0EC', '#F7EAE4'],
] as const;

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const insightDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = today.getTime() - insightDay.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ArticleInsightBlock({ insight, index }: { insight: ArticleInsight; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const gradientColors = GRADIENT_SETS[index % GRADIENT_SETS.length];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.articleBlock,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.articleHeader}>
        <View style={styles.articleTitleRow}>
          <BookOpen size={14} color={Colors.primary} />
          <Text style={styles.articleTitle} numberOfLines={1}>{insight.articleTitle}</Text>
        </View>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>{insight.category}</Text>
        </View>
      </View>

      <LinearGradient
        colors={[...gradientColors]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.summaryCard}
      >
        <Text style={styles.summaryLabel}>Brief Summary</Text>
        <Text style={styles.summaryText}>{insight.summary}</Text>
        <Text style={styles.summaryTime}>
          {new Date(insight.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </Text>
      </LinearGradient>

      {insight.keyTakeaways.length > 0 && (
        <View style={styles.insightsSection}>
          <View style={styles.insightsSectionHeader}>
            <View style={styles.insightsSectionTitleRow}>
              <Lightbulb size={15} color={Colors.primary} />
              <Text style={styles.insightsSectionTitle}>Key Insights</Text>
            </View>
            <Text style={styles.insightsCount}>{insight.keyTakeaways.length} insights</Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={insight.keyTakeaways}
            keyExtractor={(_, i) => `${insight.id}_takeaway_${i}`}
            contentContainerStyle={styles.insightsScrollContent}
            renderItem={({ item, index: tIdx }) => (
              <View
                style={[
                  styles.insightChip,
                  { backgroundColor: `${gradientColors[tIdx % gradientColors.length]}40` },
                  { borderColor: `${gradientColors[tIdx % gradientColors.length]}90` },
                ]}
              >
                <View style={styles.insightChipContent}>
                  <Text style={styles.insightChipText}>{item}</Text>
                </View>
                <View style={styles.insightChipFooter}>
                  <Sparkles size={11} color={Colors.textSecondary} />
                  <Text style={styles.insightChipIndex}>Insight {tIdx + 1}</Text>
                </View>
              </View>
            )}
          />
        </View>
      )}
    </Animated.View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, insights } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const groupedInsights = useMemo(() => {
    const groups: { label: string; date: string; items: ArticleInsight[] }[] = [];
    const sorted = [...insights].sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );

    for (const insight of sorted) {
      const dayKey = new Date(insight.generatedAt).toISOString().split('T')[0];
      const existing = groups.find(g => g.date === dayKey);
      if (existing) {
        existing.items.push(insight);
      } else {
        groups.push({
          label: formatDayLabel(insight.generatedAt),
          date: dayKey,
          items: [insight],
        });
      }
    }
    return groups;
  }, [insights]);

  const getWeekDays = useCallback(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const days: { label: string; date: number; isToday: boolean; hasInsights: boolean }[] = [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dayKey = d.toISOString().split('T')[0];
      const hasInsights = insights.some(ins => ins.generatedAt.startsWith(dayKey));
      days.push({
        label: dayLabels[i],
        date: d.getDate(),
        isToday: i === dayOfWeek,
        hasInsights,
      });
    }
    return days;
  }, [insights]);

  const weekDays = getWeekDays();
  const initials = user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => router.push('/settings' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Insights</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.weekRow}>
          {weekDays.map((day) => (
            <View key={day.label} style={styles.weekDayItem}>
              <Text style={[styles.weekDayLabel, day.isToday && styles.weekDayLabelActive]}>{day.label}</Text>
              <View style={[styles.weekDayCircle, day.isToday && styles.weekDayCircleActive]}>
                <Text style={[styles.weekDayDate, day.isToday && styles.weekDayDateActive]}>{day.date}</Text>
              </View>
              {day.hasInsights && <View style={styles.weekDayDot} />}
            </View>
          ))}
        </View>

        {insights.length === 0 ? (
          <View style={styles.emptyContent}>
            <View style={styles.emptyIconCircle}>
              <Sparkles size={32} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No insights yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the sparkle button on any article card to generate AI-powered summaries and key takeaways
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {groupedInsights.map((group) => (
              <View key={group.date} style={styles.dayGroup}>
                <Text style={styles.dayLabel}>{group.label}</Text>
                {group.items.map((insight, idx) => (
                  <ArticleInsightBlock key={insight.id} insight={insight} index={idx} />
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  weekDayItem: {
    alignItems: 'center',
    gap: 6,
  },
  weekDayLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  weekDayLabelActive: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  weekDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayCircleActive: {
    backgroundColor: Colors.text,
  },
  weekDayDate: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  weekDayDateActive: {
    color: Colors.white,
    fontWeight: '700' as const,
  },
  weekDayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  dayGroup: {
    marginTop: 20,
  },
  dayLabel: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  articleBlock: {
    marginBottom: 28,
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  articleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  categoryPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 23,
    letterSpacing: -0.1,
  },
  summaryTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 14,
    textAlign: 'right' as const,
  },
  insightsSection: {
    marginTop: 0,
  },
  insightsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  insightsSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightsSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  insightsCount: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  insightsScrollContent: {
    gap: 10,
  },
  insightChip: {
    width: INSIGHT_CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    justifyContent: 'space-between',
  },
  insightChipContent: {
    flex: 1,
    marginBottom: 12,
  },
  insightChipText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  insightChipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  insightChipIndex: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
});
