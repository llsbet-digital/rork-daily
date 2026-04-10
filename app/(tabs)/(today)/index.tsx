import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Bookmark, ThumbsUp, ThumbsDown, X } from 'lucide-react-native';
import InsightModal from '@/components/InsightModal';
import { ArticleInsight } from '@/types';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors, { CARD_COLORS } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { Article } from '@/types';
import { toDateString } from '@/lib/streak';
import SaveLimitSheet from '@/components/SaveLimitSheet';

function ArticleCard({ article, onSave, onRead, onFeedback, onGenerateInsight, index, isGenerating, hasInsight }: {
  article: Article;
  onSave: () => void;
  onRead: () => void;
  onFeedback: (type: 'up' | 'down') => void;
  onGenerateInsight: () => void;
  index: number;
  isGenerating: boolean;
  hasInsight: boolean;
}) {
  const router = useRouter();
  const bgColor = CARD_COLORS[index % CARD_COLORS.length];
  const spinAnim = React.useRef(new Animated.Value(0)).current;

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
    onRead();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/article', params: { id: article.id } } as any);
  }, [onRead, article.id, router]);

  return (
    <View style={[styles.articleCard, { backgroundColor: bgColor }]}>
      <TouchableOpacity activeOpacity={0.85} onPress={handlePress} style={styles.cardPressable}>
        <View style={styles.cardTopRow}>
          <Text style={styles.articleCategory}>{article.category}</Text>
          <View style={styles.cardTopRight}>
            <TouchableOpacity
              onPress={() => {
                onSave();
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Bookmark
                size={18}
                color={article.isSaved ? '#1A1A1A' : 'rgba(0,0,0,0.35)'}
                fill={article.isSaved ? Colors.primary : 'transparent'}
                strokeWidth={article.isSaved ? 2 : 1.5}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.articleTitle}>{article.title}</Text>
        <Text style={styles.articleSummary} numberOfLines={3}>{article.summary}</Text>

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

function StreakDots({ readDays }: { readDays: string[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return toDateString(d);
  });
  const readSet = new Set(readDays);
  return (
    <View style={styles.dotsRow}>
      {days.map(day => (
        <View key={day} style={[styles.dot, readSet.has(day) ? styles.dotFilled : styles.dotEmpty]} />
      ))}
    </View>
  );
}

function DailyInsightCard({
  text,
  isPremium,
  currentStreak,
  onUnlockPro,
  fadeAnim,
}: {
  text: string;
  isPremium: boolean;
  currentStreak: number;
  onUnlockPro: () => void;
  fadeAnim: Animated.Value;
}) {
  const blurred = !isPremium && currentStreak >= 3;

  return (
    <Animated.View style={[styles.insightCard, { opacity: fadeAnim }]}>
      <Text style={styles.insightLabel}>Today's reflection</Text>
      {blurred ? (
        <View style={styles.insightBlurContainer}>
          <Text style={styles.insightText}>{text}</Text>
          <BlurView intensity={14} tint="light" style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={styles.insightUnlockRow} onPress={onUnlockPro} activeOpacity={0.7}>
            <Text style={styles.insightUnlockLink}>Unlock with Pro →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.insightText}>{text}</Text>
      )}
    </Animated.View>
  );
}

function DoneScreen({
  articles,
  currentStreak,
  readDays,
  isPremium,
  todaySavesUsed,
  maxDailySaves,
  dailyInsight,
  onSave,
  onUnlockPro,
}: {
  articles: Article[];
  currentStreak: number;
  readDays: string[];
  isPremium: boolean;
  todaySavesUsed: number;
  maxDailySaves: number;
  dailyInsight: string | null;
  onSave: (id: string) => void;
  onUnlockPro: () => void;
}) {
  const headline =
    currentStreak === 1 ? "That's your reading done." :
    currentStreak === 3 ? 'Day 3. Still here.' :
    currentStreak === 7 ? 'Seven days of reading intentionally.' :
    'Done for today. Well read.';

  const screenFade = useRef(new Animated.Value(0)).current;
  const insightFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenFade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Insight fades in 200ms after screen completes
      if (dailyInsight && (isPremium || currentStreak >= 3)) {
        Animated.timing(insightFade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    });
  }, []);

  // If insight arrives after mount (async), fade it in then too
  useEffect(() => {
    if (dailyInsight && (isPremium || currentStreak >= 3)) {
      Animated.timing(insightFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [dailyInsight]);

  const showInsight = !!dailyInsight && (isPremium || currentStreak >= 3);

  return (
    <Animated.View style={[styles.doneContainer, { opacity: screenFade }]}>
      <Text style={styles.doneTitle}>{headline}</Text>
      <Text style={styles.doneSubtitle}>Tomorrow's articles are ready at 7:00 am.</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recapScroll}
        style={styles.recapScrollView}
      >
        {articles.map((article, idx) => {
          const canSave = !article.isSaved && todaySavesUsed < maxDailySaves;
          const bgColor = CARD_COLORS[idx % CARD_COLORS.length];
          return (
            <View key={article.id} style={[styles.recapCard, { backgroundColor: bgColor }]}>
              <View style={styles.recapCardTop}>
                <View style={styles.recapCategoryPill}>
                  <Text style={styles.recapCategoryText} numberOfLines={1}>{article.category}</Text>
                </View>
                {canSave || article.isSaved ? (
                  <TouchableOpacity
                    style={styles.recapBookmarkBtn}
                    onPress={() => !article.isSaved && onSave(article.id)}
                    activeOpacity={article.isSaved ? 1 : 0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Bookmark
                      size={16}
                      color={article.isSaved ? '#1A1A1A' : 'rgba(0,0,0,0.4)'}
                      fill={article.isSaved ? Colors.primary : 'transparent'}
                      strokeWidth={article.isSaved ? 2 : 1.5}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.recapCardBottom}>
                <Text style={styles.recapTitle} numberOfLines={3}>{article.title}</Text>
                <Text style={styles.recapSource} numberOfLines={1}>{article.source}</Text>
                <Text style={styles.recapReadTime}>{article.readTime} min read</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {showInsight && (
        <DailyInsightCard
          text={dailyInsight!}
          isPremium={isPremium}
          currentStreak={currentStreak}
          onUnlockPro={onUnlockPro}
          fadeAnim={insightFade}
        />
      )}

      {!isPremium && (
        <View style={styles.upsellBlock}>
          <TouchableOpacity style={styles.upsellButton} onPress={onUnlockPro} activeOpacity={0.75}>
            <Text style={styles.upsellButtonText}>Unlock Pro</Text>
          </TouchableOpacity>
          <Text style={styles.upsellNote}>Read more and save more.</Text>
          <Text style={styles.upsellNote}>€3.99/month · cancel anytime</Text>
        </View>
      )}
    </Animated.View>
  );
}

function ArticleSkeleton({ index }: { index: number }) {
  const pulseAnim = React.useRef(new Animated.Value(0.3)).current;
  const bgColor = CARD_COLORS[index % CARD_COLORS.length];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[styles.articleCard, { backgroundColor: bgColor, opacity: pulseAnim }]}>
      <View style={styles.skeletonCategory} />
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonSummary} />
      <View style={{ height: 30 }} />
      <View style={styles.skeletonMeta} />
    </Animated.View>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    user,
    dailyArticles,
    markArticleRead,
    toggleSaveArticle,
    feedbackArticle,
    articlesLoading,
    generateInsight,
    generateDailyInsight,
    insights,
    generatingInsightId,
    dailyInsight,
    resources,
    currentStreak,
    readDays,
    graceActive,
    dismissGrace,
    todaySavesUsed,
    maxDailySaves,
  } = useApp();

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [saveLimitArticle, setSaveLimitArticle] = useState<Article | null>(null);
  const [insightToShow, setInsightToShow] = useState<ArticleInsight | null>(null);

  const allRead = dailyArticles.length > 0 && dailyArticles.every(a => a.isRead);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Trigger daily insight generation silently when all articles are read
  useEffect(() => {
    if (allRead) {
      generateDailyInsight(dailyArticles);
    }
  }, [allRead]);

  const SAVE_LIMIT_DISMISSED_KEY = 'save_limit_dismissed_date';

  const handleSaveWithLimit = useCallback(async (article: Article) => {
    if (currentStreak < 3) return; // Suppress on day 1-2
    const today = toDateString(new Date());
    const dismissed = await AsyncStorage.getItem(SAVE_LIMIT_DISMISSED_KEY);
    if (dismissed === today) return; // Already dismissed today
    setSaveLimitArticle(article);
  }, [currentStreak]);

  const handleSaveLimitDismiss = useCallback(async () => {
    const today = toDateString(new Date());
    await AsyncStorage.setItem(SAVE_LIMIT_DISMISSED_KEY, today);
    setSaveLimitArticle(null);
  }, []);

  const handleSaveLimitUnlockPro = useCallback(() => {
    setSaveLimitArticle(null);
    router.push('/premium' as any);
  }, [router]);

  const handleGenerateInsight = useCallback(async (articleId: string) => {
    const result = await generateInsight(articleId);
    if (result === 'premium_required') {
      router.push('/premium' as any);
    } else if (result) {
      setInsightToShow(result);
    }
  }, [generateInsight, router]);



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
          <Text style={styles.topBarTitle}>Today</Text>
          <View style={{ width: 22 }} />
        </View>


        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {graceActive && (
            <View style={styles.graceBanner}>
              <Text style={styles.graceText}>
                Life happens. Your streak paused — start a new one today.
              </Text>
              <TouchableOpacity onPress={dismissGrace} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {allRead && resources && resources.length > 0 && dailyArticles.length > 0 ? (
            <DoneScreen
              articles={dailyArticles}
              currentStreak={currentStreak}
              readDays={readDays}
              isPremium={user?.isPremium ?? false}
              todaySavesUsed={todaySavesUsed}
              maxDailySaves={maxDailySaves}
              dailyInsight={dailyInsight?.text ?? null}
              onSave={id => toggleSaveArticle(id, handleSaveWithLimit)}
              onUnlockPro={() => router.push('/premium' as any)}
            />
          ) : (
            <View style={styles.articlesSection}>
              {articlesLoading && dailyArticles.length === 0 ? (
                <>
                  <ArticleSkeleton index={0} />
                  <ArticleSkeleton index={1} />
                  <ArticleSkeleton index={2} />
                </>
              ) : !resources || resources.length === 0 ? (
                <View style={styles.emptyState}>
                  <Image
                    source={require('@/assets/images/Resources.png')}
                    style={styles.emptyImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.emptyTitle}>No sources added</Text>
                  <Text style={styles.emptySubtitle}>
                    Add your favorite websites and blogs so Paprr knows where to find your articles.
                  </Text>
                  <TouchableOpacity
                    style={styles.addSourcesButton}
                    onPress={() => router.push('/manage-resources' as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addSourcesButtonText}>Add Sources</Text>
                  </TouchableOpacity>
                </View>
              ) : dailyArticles.length === 0 && !articlesLoading ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No articles yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Pull down to refresh, or update your sources in Settings.
                  </Text>
                </View>
              ) : (
                dailyArticles.map((article, idx) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    index={idx}
                    onSave={() => toggleSaveArticle(article.id, handleSaveWithLimit)}
                    onRead={() => markArticleRead(article.id)}
                    onFeedback={(type) => feedbackArticle(article.id, type)}
                    onGenerateInsight={() => handleGenerateInsight(article.id)}
                    isGenerating={generatingInsightId === article.id}
                    hasInsight={insights.some(i => i.articleId === article.id)}
                  />
                ))
              )}
            </View>
          )}

        </ScrollView>
      </Animated.View>

      {saveLimitArticle && (
        <SaveLimitSheet
          article={saveLimitArticle}
          onUnlockPro={handleSaveLimitUnlockPro}
          onDismiss={handleSaveLimitDismiss}
        />
      )}

      {insightToShow && (
        <InsightModal
          insight={insightToShow}
          onDismiss={() => setInsightToShow(null)}
        />
      )}
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
    paddingHorizontal: 16,
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

  scrollContent: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
    fontFamily: 'CrimsonText_700Bold',
  },
  articlesSection: {
    paddingHorizontal: 16,
    gap: 16,
  },
  articleCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardPressable: {
    padding: 22,
    minHeight: 200,
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

  articleTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
    lineHeight: 24,
    letterSpacing: -0.3,
    fontFamily: 'CrimsonText_700Bold',
  },
  articleSummary: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.5)',
    lineHeight: 23,
    marginBottom: 20,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto' as const,
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
  skeletonCategory: {
    width: 80,
    height: 14,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginBottom: 12,
  },
  skeletonTitle: {
    width: '80%',
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginBottom: 10,
  },
  skeletonSummary: {
    width: '65%',
    height: 14,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginBottom: 20,
  },
  skeletonMeta: {
    width: '40%',
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    fontFamily: 'CrimsonText_700Bold',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 4,
  },
  addSourcesButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  addSourcesButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  graceBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderWarm,
  },
  graceText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  // ── Done screen ──────────────────────────────────────
  doneContainer: {
    paddingTop: 40,
    paddingBottom: 48,
  },
  doneTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    fontFamily: 'CrimsonText_700Bold',
    marginBottom: 8,
    lineHeight: 32,
    paddingHorizontal: 16,
  },
  doneSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  dotsRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 32,
    alignSelf: 'flex-start' as const,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotFilled: {
    backgroundColor: Colors.primary,
  },
  dotEmpty: {
    backgroundColor: Colors.border,
  },
  recapScrollView: {
    marginBottom: 28,
  },
  recapScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  recapCard: {
    width: 160,
    height: 220,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between' as const,
  },
  recapCardTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  recapCategoryPill: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 1,
    marginRight: 6,
  },
  recapCategoryText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(0,0,0,0.5)',
    letterSpacing: 0.3,
  },
  recapBookmarkBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recapCardBottom: {
    gap: 4,
  },
  recapTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 20,
    letterSpacing: -0.2,
    fontFamily: 'CrimsonText_700Bold',
    marginBottom: 4,
  },
  recapSource: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.45)',
  },
  recapReadTime: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.35)',
  },
  insightCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  insightLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  insightText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 23,
  },
  insightBlurContainer: {
    borderRadius: 8,
    overflow: 'hidden' as const,
  },
  insightUnlockRow: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  insightUnlockLink: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#7C3AED',
  },
  tomorrowNote: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 36,
    paddingHorizontal: 16,
  },
  upsellBlock: {
    gap: 6,
    paddingHorizontal: 16,
  },
  upsellButton: {
    borderWidth: 1.5,
    borderColor: Colors.text,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
    marginBottom: 2,
  },
  upsellButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  upsellNote: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
