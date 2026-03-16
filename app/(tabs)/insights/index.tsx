import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react-native';
import { Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors, { CARD_COLORS } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { ArticleInsight } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const HORIZONTAL_PAD = 20;
const LEARNING_CARD_WIDTH = SCREEN_WIDTH * 0.6;


function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function ArticleInsightBlock({ insight, index }: { insight: ArticleInsight; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
          <Text style={styles.articleTitle} numberOfLines={1}>{insight.articleTitle}</Text>
        </View>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>{insight.category}</Text>
        </View>
      </View>

      <LinearGradient
        colors={[...CARD_COLORS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryBorderGradient}
      >
        <View style={styles.summaryCardInner}>
          <Text style={styles.summaryLabel}>Summary</Text>
          <Text style={styles.summaryText}>{insight.summary}</Text>

        </View>
      </LinearGradient>

      {insight.keyTakeaways.length > 0 && (
        <View style={styles.insightsSection}>
          <View style={styles.insightsSectionHeader}>
            <View style={styles.insightsSectionTitleRow}>
              <Text style={styles.insightsSectionTitle}>Key Learnings</Text>
            </View>
            <Text style={styles.insightsCount}>{insight.keyTakeaways.length} learnings</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.learningsRow}
          >
            {insight.keyTakeaways.map((item, tIdx) => (
              <LinearGradient
                key={`${insight.id}_takeaway_${tIdx}`}
                colors={[...CARD_COLORS]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.learningCardBorder}
              >
                <View style={styles.learningCardInner}>
                  <Text style={styles.learningCardText} numberOfLines={5}>{item}</Text>
                  <View style={styles.learningCardFooter}>
                    <Text style={styles.learningCardSource} numberOfLines={1}>{insight.articleTitle}</Text>
                  </View>
                </View>
              </LinearGradient>
            ))}
          </ScrollView>
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

  const [selectedDate, setSelectedDate] = useState<string>(() => getDateKey(new Date()));
  const [weekOffset, setWeekOffset] = useState<number>(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const todayKey = useMemo(() => getDateKey(new Date()), []);

  const weekDays = useMemo(() => {
    const today = new Date();
    const baseWeekStart = getWeekStart(today);
    const weekStart = new Date(baseWeekStart);
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days: { label: string; dateNum: number; dateKey: string; isToday: boolean; isSelected: boolean; hasInsights: boolean; isFuture: boolean }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dayKey = getDateKey(d);
      const hasInsights = insights.some(ins => ins.generatedAt.startsWith(dayKey));
      const isFuture = d.getTime() > new Date().setHours(23, 59, 59, 999);
      days.push({
        label: dayLabels[i],
        dateNum: d.getDate(),
        dateKey: dayKey,
        isToday: dayKey === todayKey,
        isSelected: dayKey === selectedDate,
        hasInsights,
        isFuture,
      });
    }
    return days;
  }, [weekOffset, insights, selectedDate, todayKey]);

  const currentMonthLabel = useMemo(() => {
    const today = new Date();
    const baseWeekStart = getWeekStart(today);
    const weekStart = new Date(baseWeekStart);
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);
    const midWeek = new Date(weekStart);
    midWeek.setDate(midWeek.getDate() + 3);
    return formatMonthYear(midWeek);
  }, [weekOffset]);

  const filteredInsights = useMemo(() => {
    return insights
      .filter(ins => ins.generatedAt.startsWith(selectedDate))
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }, [insights, selectedDate]);

  const handleDayPress = useCallback((dayKey: string, isFuture: boolean) => {
    if (isFuture) return;
    setSelectedDate(dayKey);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePrevWeek = useCallback(() => {
    setWeekOffset(prev => prev - 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleNextWeek = useCallback(() => {
    if (weekOffset >= 0) return;
    setWeekOffset(prev => prev + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [weekOffset]);

  const selectedDateLabel = useMemo(() => {
    if (selectedDate === todayKey) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (selectedDate === getDateKey(yesterday)) return 'Yesterday';
    const d = new Date(selectedDate + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, [selectedDate, todayKey]);

  const initials = user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Insights</Text>
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            activeOpacity={0.7}
          >
            <Settings size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekNavRow}>
          <TouchableOpacity onPress={handlePrevWeek} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{currentMonthLabel}</Text>
          <TouchableOpacity
            onPress={handleNextWeek}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={weekOffset >= 0}
          >
            <ChevronRight size={20} color={weekOffset >= 0 ? Colors.textMuted : Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {weekDays.map((day) => (
            <TouchableOpacity
              key={day.dateKey}
              style={styles.weekDayItem}
              onPress={() => handleDayPress(day.dateKey, day.isFuture)}
              activeOpacity={day.isFuture ? 1 : 0.6}
            >
              <Text style={[
                styles.weekDayLabel,
                day.isSelected && styles.weekDayLabelActive,
                day.isFuture && styles.weekDayLabelFuture,
              ]}>{day.label}</Text>
              <View style={[
                styles.weekDayCircle,
                day.isSelected && styles.weekDayCircleActive,
                day.isToday && !day.isSelected && styles.weekDayCircleToday,
              ]}>
                <Text style={[
                  styles.weekDayDate,
                  day.isSelected && styles.weekDayDateActive,
                  day.isToday && !day.isSelected && styles.weekDayDateToday,
                  day.isFuture && styles.weekDayDateFuture,
                ]}>{day.dateNum}</Text>
              </View>
              {day.hasInsights && !day.isSelected && <View style={styles.weekDayDot} />}
            </TouchableOpacity>
          ))}
        </View>

        {filteredInsights.length === 0 ? (
          <View style={styles.emptyContent}>
            <Image
              source={require('@/assets/images/insights-empty.png')}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>No insights for this day</Text>
            <Text style={styles.emptySubtitle}>
              Tap the sparkle button on any article card to extract key learnings and highlights
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.dayLabel}>{selectedDateLabel}</Text>
            {filteredInsights.map((insight, idx) => (
              <ArticleInsightBlock key={insight.id} insight={insight} index={idx} />
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
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1A1A1A',
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    fontFamily: 'CrimsonText_700Bold',
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  weekDayItem: {
    alignItems: 'center',
    gap: 6,
    minWidth: 40,
  },
  weekDayLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  weekDayLabelActive: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  weekDayLabelFuture: {
    opacity: 0.35,
  },
  weekDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayCircleActive: {
    backgroundColor: Colors.text,
  },
  weekDayCircleToday: {
    borderWidth: 1.5,
    borderColor: Colors.text,
  },
  weekDayDate: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  weekDayDateActive: {
    color: Colors.white,
    fontWeight: '700' as const,
  },
  weekDayDateToday: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  weekDayDateFuture: {
    opacity: 0.35,
  },
  weekDayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingBottom: 40,
    paddingTop: 8,
  },
  dayLabel: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 16,
    letterSpacing: -0.2,
    fontFamily: 'CrimsonText_700Bold',
  },
  articleBlock: {
    marginBottom: 32,
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
    fontFamily: 'CrimsonText_600SemiBold',
  },
  categoryPill: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  summaryBorderGradient: {
    borderRadius: 22,
    padding: 3,
    marginBottom: 20,
  },
  summaryCardInner: {
    backgroundColor: '#FAF8F5',
    borderRadius: 19,
    padding: 20,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(0,0,0,0.4)',
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

  insightsSection: {
    marginTop: 0,
  },
  insightsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  learningsRow: {
    gap: CARD_GAP,
    paddingRight: 20,
  },
  learningCardBorder: {
    width: LEARNING_CARD_WIDTH,
    borderRadius: 18,
    padding: 2.5,
    flexShrink: 0,
  },
  learningCardInner: {
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    padding: 14,
    minHeight: 140,
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
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 10,
  },
  learningCardSource: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyImage: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center' as const,
    fontFamily: 'CrimsonText_700Bold',
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
});
