import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crown, Sparkles, Bookmark, ThumbsUp, ThumbsDown, Loader } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { Article } from '@/types';

const CARD_COLORS = ['#E8DFF5', '#F5E6D3', '#E5F1F0', '#FCF4E9'] as const;

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (article.url && article.url !== '#') {
      try {
        await Linking.openURL(article.url);
      } catch (err) {
        console.log('[Today] Failed to open URL:', err);
      }
    }
  }, [onRead, article.id, article.url]);

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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Bookmark
              size={18}
              color={article.isSaved ? Colors.primary : 'rgba(0,0,0,0.35)'}
              fill={article.isSaved ? Colors.primary : 'transparent'}
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[styles.feedbackBtn, article.feedback === 'up' && styles.feedbackBtnActive]}
          >
            <ThumbsUp
              size={15}
              color={article.feedback === 'up' ? Colors.primary : 'rgba(0,0,0,0.3)'}
              fill={article.feedback === 'up' ? Colors.primary : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              onFeedback('down');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[styles.feedbackBtn, article.feedback === 'down' && styles.feedbackBtnActive]}
          >
            <ThumbsDown
              size={15}
              color={article.feedback === 'down' ? '#E05555' : 'rgba(0,0,0,0.3)'}
              fill={article.feedback === 'down' ? '#E05555' : 'transparent'}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.sparkButton, hasInsight && styles.sparkButtonActive]}
          onPress={() => {
            if (!isGenerating) {
              onGenerateInsight();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }}
          activeOpacity={0.7}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Sparkles size={18} color={Colors.primary} />
            </Animated.View>
          ) : (
            <Sparkles size={18} color={hasInsight ? Colors.white : Colors.text} fill={hasInsight ? Colors.white : 'transparent'} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
    insights,
    generatingInsightId,
  } = useApp();

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);



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
          <Text style={styles.topBarTitle}>Today</Text>
          <TouchableOpacity
            style={styles.crownButton}
            onPress={() => router.push('/premium' as any)}
            activeOpacity={0.7}
          >
            <Crown size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>


        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >


          <Text style={styles.sectionTitle}>Today's Featured</Text>

          <View style={styles.articlesSection}>
            {articlesLoading && dailyArticles.length === 0 ? (
              <>
                <ArticleSkeleton index={0} />
                <ArticleSkeleton index={1} />
                <ArticleSkeleton index={2} />
              </>
            ) : dailyArticles.length === 0 && !articlesLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No articles yet</Text>
                <Text style={styles.emptySubtitle}>
                  Pull down to refresh, or update your interests in Settings.
                </Text>
              </View>
            ) : (
              dailyArticles.map((article, idx) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  index={idx}
                  onSave={() => toggleSaveArticle(article.id)}
                  onRead={() => markArticleRead(article.id)}
                  onFeedback={(type) => feedbackArticle(article.id, type)}
                  onGenerateInsight={() => generateInsight(article.id)}
                  isGenerating={generatingInsightId === article.id}
                  hasInsight={insights.some(i => i.articleId === article.id)}
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
  crownButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  articleSummary: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.5)',
    lineHeight: 21,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  sparkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkButtonActive: {
    backgroundColor: Colors.primary,
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
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
