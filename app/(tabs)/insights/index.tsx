import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Lightbulb } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { ArticleInsight } from '@/types';

const CARD_COLORS = ['#E8DFF5', '#F5E6D3', '#E5F1F0', '#FCF4E9'] as const;

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

function InsightCard({ insight, index }: { insight: ArticleInsight; index: number }) {
  const bgColor = CARD_COLORS[index % CARD_COLORS.length];
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.insightCard,
        { backgroundColor: bgColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Sparkles size={12} color={Colors.primary} />
          <Text style={styles.categoryText}>{insight.category}</Text>
        </View>
        <Text style={styles.timeText}>
          {new Date(insight.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </Text>
      </View>

      <Text style={styles.insightTitle} numberOfLines={2}>{insight.articleTitle}</Text>
      <Text style={styles.insightSummary}>{insight.summary}</Text>

      {insight.keyTakeaways.length > 0 && (
        <View style={styles.takeawaysSection}>
          <View style={styles.takeawaysHeader}>
            <Lightbulb size={14} color="rgba(0,0,0,0.5)" />
            <Text style={styles.takeawaysLabel}>Key Takeaways</Text>
          </View>
          {insight.keyTakeaways.map((takeaway, i) => (
            <View key={i} style={styles.takeawayRow}>
              <View style={styles.takeawayDot} />
              <Text style={styles.takeawayText}>{takeaway}</Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, insights } = useApp();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

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
                  <InsightCard key={insight.id} insight={insight} index={idx} />
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
    marginTop: 16,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  insightCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(0,0,0,0.55)',
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.35)',
    fontWeight: '500' as const,
  },
  insightTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  insightSummary: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.6)',
    lineHeight: 21,
    marginBottom: 16,
  },
  takeawaysSection: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
  },
  takeawaysHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  takeawaysLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(0,0,0,0.5)',
  },
  takeawayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  takeawayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  takeawayText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
    flex: 1,
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
    textAlign: 'center',
    lineHeight: 22,
  },
});
