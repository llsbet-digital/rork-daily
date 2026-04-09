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
import { Sparkles, Bookmark, ThumbsUp, ThumbsDown, X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors, { CARD_COLORS } from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { Article } from '@/types';
import { toDateString } from '@/lib/streak';

function ArticleCard({ article, onSave, onRead, onFeedback, onGenerateInsight, index, isGenerating, hasInsight, showTooltip, onDismissTooltip }: {
  article: Article;
  onSave: () => void;
  onRead: () => void;
  onFeedback: (type: 'up' | 'down') => void;
  onGenerateInsight: () => void;
  index: number;
  isGenerating: boolean;
  hasInsight: boolean;
  showTooltip?: boolean;
  onDismissTooltip?: () => void;
}) {
  const router = useRouter();
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

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const bgColor = CARD_COLORS[index % CARD_COLORS.length];

  const handlePress = useCallback(async () => {
    onRead();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (article.url && article.url !== '#' && article.url.startsWith('http')) {
      try {
        await WebBrowser.openBrowserAsync(article.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          controlsColor: '#1A1A1A',
          toolbarColor: '#FFFFFF',
        });
      } catch (err) {
        console.log('[Article] Failed to open in-app browser:', err);
        router.push({ pathname: '/article', params: { id: article.id } } as any);
      }
    } else {
      router.push({ pathname: '/article', params: { id: article.id } } as any);
    }
  }, [onRead, article.id, article.url, router]);

  return (
    <TouchableOpacity
      style={[styles.articleCard, { backgroundColor: bgColor }]}
      activeOpacity={0.85}
      onPress={handlePress}
    >
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
        <View>
          {showTooltip && (
            <View style={styles.tooltipContainer} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.tooltipPill}
                onPress={onDismissTooltip}
                activeOpacity={0.8}
              >
                <Text style={styles.tooltipText}>Tap to generate an insight</Text>
              </TouchableOpacity>
              <View style={styles.tooltipArrow} />
            </View>
          )}
          <TouchableOpacity
            style={[styles.sparkButton, hasInsight && styles.sparkButtonActive]}
            onPress={() => {
              if (!isGenerating) {
                onGenerateInsight();
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              onDismissTooltip?.();
            }}
            activeOpacity={0.7}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Sparkles size={16} color={'#1A1A1A'} />
              </Animated.View>
            ) : (
              <Sparkles size={16} color={hasInsight ? Colors.white : '#1A1A1A'} fill={hasInsight ? Colors.white : 'transparent'} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
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
      <View style={styles.doneCheckCircle}>
        <Check size={18} color="#1A1A1A" strokeWidth={2.5} />
      </View>

      <Text style={styles.doneTitle}>{headline}</Text>
      <Text style={styles.doneSubtitle}>You read what mattered today. See you tomorrow.</Text>

      <StreakDots readDays={readDays} />

      <View style={styles.recapList}>
        {articles.map(article => {
          const canSave = !article.isSaved && todaySavesUsed < maxDailySaves;
          return (
            <View key={article.id} style={styles.recapCard}>
              <View style={styles.recapCardContent}>
                <Text style={styles.recapSource}>{article.source}</Text>
                <Text style={styles.recapTitle} numberOfLines={2}>{article.title}</Text>
              </View>
              {article.isSaved ? (
                <Text style={styles.recapSavedLabel}>Saved</Text>
              ) : canSave ? (
                <TouchableOpacity
                  onPress={() => onSave(article.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.recapSaveBtn}>Save</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </View>

      {showInsight && (
        <DailyInsightCard
          text={dailyInsight!}
          isPremium={isPremium}
          currentStreak={currentStreak}
          onUnlockPro={onUnlockPro}
          fadeAnim={insightFade}
        />
      )}

      <Text style={styles.tomorrowNote}>Tomorrow's articles are ready at 7:00 am</Text>

      {!isPremium && (
        <View style={styles.upsellBlock}>
          <TouchableOpacity style={styles.upsellButton} onPress={onUnlockPro} activeOpacity={0.75}>
            <Text style={styles.upsellButtonText}>Unlock Pro</Text>
          </TouchableOpacity>
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
  const [showSparkleTooltip, setShowSparkleTooltip] = useState(false);

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

  useEffect(() => {
    if (dailyArticles.length > 0) {
      AsyncStorage.getItem('has_seen_sparkle_tooltip').then(val => {
        if (!val) setShowSparkleTooltip(true);
      });
    }
  }, [dailyArticles.length]);

  const dismissTooltip = useCallback(() => {
    setShowSparkleTooltip(false);
    AsyncStorage.setItem('has_seen_sparkle_tooltip', '1').catch(() => {});
  }, []);

  const handleGenerateInsight = useCallback(async (articleId: string) => {
    const result = await generateInsight(articleId);
    if (result === 'premium_required') {
      router.push('/premium' as any);
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
            ) : allRead ? (
              <DoneScreen
                articles={dailyArticles}
                currentStreak={currentStreak}
                readDays={readDays}
                isPremium={user?.isPremium ?? false}
                todaySavesUsed={todaySavesUsed}
                maxDailySaves={maxDailySaves}
                dailyInsight={dailyInsight?.text ?? null}
                onSave={toggleSaveArticle}
                onUnlockPro={() => router.push('/premium' as any)}
              />
            ) : (
              dailyArticles.map((article, idx) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  index={idx}
                  onSave={() => toggleSaveArticle(article.id)}
                  onRead={() => markArticleRead(article.id)}
                  onFeedback={(type) => feedbackArticle(article.id, type)}
                  onGenerateInsight={() => handleGenerateInsight(article.id)}
                  isGenerating={generatingInsightId === article.id}
                  hasInsight={insights.some(i => i.articleId === article.id)}
                  showTooltip={idx === 0 && showSparkleTooltip}
                  onDismissTooltip={dismissTooltip}
                />
              ))
            )}
          </View>

        </ScrollView>
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
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 4,
    fontFamily: 'CrimsonText_700Bold',
  },
  articlesSection: {
    paddingHorizontal: 20,
    gap: 16,
  },
  articleCard: {
    borderRadius: 20,
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
  sparkButtonActive: {
    backgroundColor: Colors.primary,
  },
  tooltipContainer: {
    position: 'absolute' as const,
    bottom: 48,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  tooltipPill: {
    backgroundColor: Colors.dark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tooltipText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.dark,
    marginRight: 14,
    alignSelf: 'flex-end' as const,
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
    paddingHorizontal: 20,
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
    marginHorizontal: 20,
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
    paddingHorizontal: 24,
  },
  doneCheckCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  doneTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    fontFamily: 'CrimsonText_700Bold',
    marginBottom: 8,
    lineHeight: 32,
  },
  doneSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 32,
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
    backgroundColor: '#3A3A3A',
  },
  recapList: {
    gap: 8,
    marginBottom: 28,
  },
  recapCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  recapCardContent: {
    flex: 1,
  },
  recapSource: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  recapTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  recapSavedLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
  recapSaveBtn: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  insightCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
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
  },
  upsellBlock: {
    alignItems: 'flex-start' as const,
    gap: 8,
  },
  upsellButton: {
    borderWidth: 1.5,
    borderColor: Colors.text,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  upsellButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  upsellNote: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
