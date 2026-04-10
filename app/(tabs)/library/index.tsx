import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  BookmarkMinus,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors, { CARD_COLORS } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { Article, ArticleInsight } from '@/types';
import InsightModal from '@/components/InsightModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const HORIZONTAL_PAD = 20;
const LEARNING_CARD_WIDTH = SCREEN_WIDTH * 0.6;

// ─── Insights helpers ────────────────────────────────────────────────────────

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

// ─── ArticleInsightBlock ──────────────────────────────────────────────────────

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
        insightStyles.articleBlock,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={insightStyles.articleHeader}>
        <View style={insightStyles.articleTitleRow}>
          <Text style={insightStyles.articleTitle} numberOfLines={1}>{insight.articleTitle}</Text>
        </View>
        <View style={insightStyles.categoryPill}>
          <Text style={insightStyles.categoryPillText}>{insight.category}</Text>
        </View>
      </View>

      <LinearGradient
        colors={[...CARD_COLORS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={insightStyles.summaryBorderGradient}
      >
        <View style={insightStyles.summaryCardInner}>
          <Text style={insightStyles.summaryLabel}>Summary</Text>
          <Text style={insightStyles.summaryText}>{insight.summary}</Text>
        </View>
      </LinearGradient>

      {insight.keyTakeaways.length > 0 && (
        <View style={insightStyles.insightsSection}>
          <View style={insightStyles.insightsSectionHeader}>
            <View style={insightStyles.insightsSectionTitleRow}>
              <Text style={insightStyles.insightsSectionTitle}>Key Learnings</Text>
            </View>
            <Text style={insightStyles.insightsCount}>{insight.keyTakeaways.length} learnings</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={insightStyles.learningsRow}
          >
            {insight.keyTakeaways.map((item, tIdx) => (
              <LinearGradient
                key={`${insight.id}_takeaway_${tIdx}`}
                colors={[...CARD_COLORS]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={insightStyles.learningCardBorder}
              >
                <View style={insightStyles.learningCardInner}>
                  <Text style={insightStyles.learningCardText} numberOfLines={5}>{item}</Text>
                  <View style={insightStyles.learningCardFooter}>
                    <Text style={insightStyles.learningCardSource} numberOfLines={1}>{insight.articleTitle}</Text>
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

// ─── InsightsSegment ──────────────────────────────────────────────────────────

function InsightsSegment() {
  const { insights } = useApp();
  const [selectedDate, setSelectedDate] = useState<string>(() => getDateKey(new Date()));
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const todayKey = useMemo(() => getDateKey(new Date()), []);

  const weekDays = useMemo(() => {
    const today = new Date();
    const baseWeekStart = getWeekStart(today);
    const weekStart = new Date(baseWeekStart);
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days: {
      label: string;
      dateNum: number;
      dateKey: string;
      isToday: boolean;
      isSelected: boolean;
      hasInsights: boolean;
      isFuture: boolean;
    }[] = [];

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

  return (
    <View style={{ flex: 1 }}>
      <View style={insightStyles.weekNavRow}>
        <TouchableOpacity onPress={handlePrevWeek} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={insightStyles.monthLabel}>{currentMonthLabel}</Text>
        <TouchableOpacity
          onPress={handleNextWeek}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={weekOffset >= 0}
        >
          <ChevronRight size={20} color={weekOffset >= 0 ? Colors.textMuted : Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={insightStyles.weekRow}>
        {weekDays.map((day) => (
          <TouchableOpacity
            key={day.dateKey}
            style={insightStyles.weekDayItem}
            onPress={() => handleDayPress(day.dateKey, day.isFuture)}
            activeOpacity={day.isFuture ? 1 : 0.6}
          >
            <Text style={[
              insightStyles.weekDayLabel,
              day.isSelected && insightStyles.weekDayLabelActive,
              day.isFuture && insightStyles.weekDayLabelFuture,
            ]}>{day.label}</Text>
            <View style={[
              insightStyles.weekDayCircle,
              day.isSelected && insightStyles.weekDayCircleActive,
              day.isToday && !day.isSelected && insightStyles.weekDayCircleToday,
            ]}>
              <Text style={[
                insightStyles.weekDayDate,
                day.isSelected && insightStyles.weekDayDateActive,
                day.isToday && !day.isSelected && insightStyles.weekDayDateToday,
                day.isFuture && insightStyles.weekDayDateFuture,
              ]}>{day.dateNum}</Text>
            </View>
            {day.hasInsights && !day.isSelected && <View style={insightStyles.weekDayDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {filteredInsights.length === 0 ? (
        <View style={insightStyles.emptyContent}>
          <Image
            source={require('@/assets/images/insights-empty.png')}
            style={insightStyles.emptyImage}
            resizeMode="contain"
          />
          <Text style={insightStyles.emptyTitle}>No insights for this day</Text>
          <Text style={insightStyles.emptySubtitle}>
            Tap the sparkle button on any article card to extract key learnings and highlights
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={insightStyles.scrollContent}
        >
          <Text style={insightStyles.dayLabel}>{selectedDateLabel}</Text>
          {filteredInsights.map((insight, idx) => (
            <ArticleInsightBlock key={insight.id} insight={insight} index={idx} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── LibraryArticleCard ───────────────────────────────────────────────────────

function LibraryArticleCard({ article, onSave, onFeedback, onGenerateInsight, index, isGenerating, hasInsight }: {
  article: Article;
  onSave: () => void;
  onFeedback: (type: 'up' | 'down') => void;
  onGenerateInsight: () => void;
  index: number;
  isGenerating: boolean;
  hasInsight: boolean;
}) {
  const router = useRouter();
  const bgColor = CARD_COLORS[index % CARD_COLORS.length];
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isGenerating) {
      const loop = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
      );
      loop.start();
      return () => loop.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [isGenerating]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/article', params: { id: article.id } } as any);
  }, [article.id, router]);

  return (
    <View style={[styles.articleCard, { backgroundColor: bgColor }]}>
      <TouchableOpacity activeOpacity={0.85} onPress={handlePress} style={styles.cardPressable}>
        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.articleCategory}>{article.category}</Text>
            {article.source ? (
              <Text style={styles.articleSource}>{article.source}</Text>
            ) : null}
          </View>
          <View style={styles.cardTopRight}>
            <TouchableOpacity
              onPress={() => {
                onSave();
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <BookmarkMinus size={18} color={'#1A1A1A'} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.articleTitle}>{article.title}</Text>

        {article.publishedAt ? (
          <Text style={styles.articleDate}>
            {(() => {
              const days = Math.floor((Date.now() - new Date(article.publishedAt).getTime()) / 86400000);
              if (days === 0) return 'Today';
              if (days === 1) return '1 day ago';
              if (days < 30) return `${days} days ago`;
              return new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            })()}
          </Text>
        ) : null}

        <View style={styles.cardBottom}>
          <View style={styles.feedbackRow}>
            <TouchableOpacity
              onPress={() => {
                onFeedback('up');
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[styles.feedbackBtn, article.feedback === 'up' && styles.feedbackBtnActive]}
            >
              <ThumbsUp
                size={16}
                color={article.feedback === 'up' ? '#1A1A1A' : 'rgba(0,0,0,0.3)'}
                fill={article.feedback === 'up' ? '#1A1A1A' : 'transparent'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onFeedback('down');
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[styles.feedbackBtn, article.feedback === 'down' && styles.feedbackBtnActive]}
            >
              <ThumbsDown
                size={16}
                color={article.feedback === 'down' ? '#E05555' : 'rgba(0,0,0,0.3)'}
                fill={article.feedback === 'down' ? '#E05555' : 'transparent'}
              />
            </TouchableOpacity>
          </View>
          {!hasInsight && (
            <TouchableOpacity
              style={styles.sparkButton}
              onPress={() => {
                if (!isGenerating) {
                  onGenerateInsight();
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
              }}
              activeOpacity={0.7}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Sparkles size={16} color="#1A1A1A" />
                </Animated.View>
              ) : (
                <Sparkles size={16} color="#1A1A1A" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {hasInsight && (
        <TouchableOpacity
          style={styles.insightEdition}
          onPress={() => {
            onGenerateInsight();
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.insightEditionText}>View insights</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── LibraryScreen ────────────────────────────────────────────────────────────

type Segment = 'saved' | 'insights';

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, savedArticles, toggleSaveArticle, feedbackArticle, generateInsight, generatingInsightId, insights } = useApp();
  const [segment, setSegment] = useState<Segment>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [insightToShow, setInsightToShow] = useState<ArticleInsight | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return savedArticles;
    const q = searchQuery.toLowerCase();
    return savedArticles.filter(a =>
      a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
  }, [savedArticles, searchQuery]);

  const initials = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : 'U';

  const handleSegment = useCallback((seg: Segment) => {
    setSegment(seg);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleGenerateInsight = useCallback(async (articleId: string) => {
    const result = await generateInsight(articleId);
    if (result === 'premium_required') {
      router.push('/premium' as any);
    } else if (result) {
      setInsightToShow(result);
    }
  }, [generateInsight, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Library</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Segmented control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentTab, segment === 'saved' && styles.segmentTabActive]}
            onPress={() => handleSegment('saved')}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentLabel, segment === 'saved' && styles.segmentLabelActive]}>
              Saved
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentTab, segment === 'insights' && styles.segmentTabActive]}
            onPress={() => handleSegment('insights')}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentLabel, segment === 'insights' && styles.segmentLabelActive]}>
              Insights
            </Text>
          </TouchableOpacity>
        </View>

        {/* Saved segment */}
        {segment === 'saved' && (
          <>
            <View style={styles.searchContainer}>
              <Search size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search saved articles"
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {filteredArticles.length === 0 ? (
              <View style={styles.emptyState}>
                <Image
                  source={require('@/assets/images/library-empty.png')}
                  style={styles.emptyImage}
                  resizeMode="contain"
                />
                <Text style={styles.emptyTitle}>No Saved Articles</Text>
                <Text style={styles.emptySubtitle}>
                  Articles you save will appear here.{'\n'}Tap the bookmark icon on any article.
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {filteredArticles.map((article, idx) => (
                  <LibraryArticleCard
                    key={article.id}
                    article={article}
                    index={idx}
                    onSave={() => toggleSaveArticle(article.id)}
                    onFeedback={(type) => feedbackArticle(article.id, type)}
                    onGenerateInsight={() => handleGenerateInsight(article.id)}
                    isGenerating={generatingInsightId === article.id}
                    hasInsight={insights.some(i => i.articleId === article.id)}
                  />
                ))}
              </ScrollView>
            )}
          </>
        )}

        {/* Insights segment */}
        {segment === 'insights' && <InsightsSegment />}
      </Animated.View>

      {insightToShow && (
        <InsightModal
          insight={insightToShow}
          onDismiss={() => setInsightToShow(null)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    backgroundColor: '#DCE876',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
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
  segmentedControl: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: 16,
    backgroundColor: Colors.inputBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    padding: 3,
  },
  segmentTab: {
    paddingVertical: 6,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 17,
  },
  segmentTabActive: {
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  segmentLabelActive: {
    fontWeight: '600' as const,
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  emptyState: {
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
    fontFamily: 'CrimsonText_700Bold',
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  articleCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardPressable: {
    padding: 22,
    minHeight: 170,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  articleCategory: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(0,0,0,0.55)',
  },
  articleSource: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  articleDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    lineHeight: 24,
    letterSpacing: -0.3,
    fontFamily: 'CrimsonText_700Bold',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackBtnActive: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto' as const,
  },
  sparkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightEdition: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    paddingVertical: 13,
    alignItems: 'center',
  },
  insightEditionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    letterSpacing: -0.1,
  },
});

const insightStyles = StyleSheet.create({
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
    backgroundColor: '#1A1A1A',
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
