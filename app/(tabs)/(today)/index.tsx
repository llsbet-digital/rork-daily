import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crown, Bookmark, Star, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { Article } from '@/types';

function ArticleCard({ article, onSave, onRate, onRead }: {
  article: Article;
  onSave: () => void;
  onRate: (rating: number) => void;
  onRead: () => void;
}) {
  const handlePress = useCallback(() => {
    onRead();
    if (article.url && article.url !== '#') {
      Linking.openURL(article.url).catch(err => {
        console.log('[Article] Failed to open URL:', err);
      });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onRead, article.url]);

  return (
    <TouchableOpacity
      style={styles.articleCard}
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <View style={styles.articleContent}>
        <Text style={styles.articleCategory}>{article.category}</Text>
        <Text style={styles.articleTitle} numberOfLines={2}>{article.title}</Text>
        <Text style={styles.articleSummary} numberOfLines={2}>{article.summary}</Text>
        <View style={styles.articleMeta}>
          <Text style={styles.articleSource}>{article.source}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.articleTime}>{article.readTime} min</Text>
          {article.url && article.url !== '#' && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <ExternalLink size={11} color={Colors.textMuted} />
            </>
          )}
        </View>

        {article.isRead && (
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => {
                  onRate(star);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Star
                  size={16}
                  color={article.rating && star <= article.rating ? Colors.primary : Colors.textMuted}
                  fill={article.rating && star <= article.rating ? Colors.primary : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <View style={styles.articleImageContainer}>
        {article.imageUrl ? (
          <Image source={{ uri: article.imageUrl }} style={styles.articleImage} />
        ) : (
          <View style={[styles.articleImage, styles.articleImagePlaceholder]} />
        )}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => {
            onSave();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Bookmark
            size={16}
            color={article.isSaved ? Colors.primary : Colors.textMuted}
            fill={article.isSaved ? Colors.primary : 'transparent'}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function ArticleSkeleton() {
  const pulseAnim = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[styles.articleCard, { opacity: pulseAnim }]}>
      <View style={styles.articleContent}>
        <View style={styles.skeletonCategory} />
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSummary} />
        <View style={styles.skeletonMeta} />
      </View>
      <View style={styles.articleImageContainer}>
        <View style={[styles.articleImage, styles.articleImagePlaceholder]} />
      </View>
    </Animated.View>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    user,
    dailyArticles,
    todayReadsCompleted,
    maxDailyReads,
    markArticleRead,
    toggleSaveArticle,
    rateArticle,
    articlesLoading,
    refreshArticles,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshArticles();
    } finally {
      setRefreshing(false);
    }
  }, [refreshArticles]);

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Your {maxDailyReads} reads for today</Text>
              <Text style={styles.progressIndicator}>{todayReadsCompleted}/{maxDailyReads}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${maxDailyReads > 0 ? (todayReadsCompleted / maxDailyReads) * 100 : 0}%` }]} />
            </View>
          </View>

          {user?.interests && user.interests.length > 0 && (
            <View style={styles.interestTags}>
              {user.interests.map((interest) => (
                <View key={interest} style={styles.interestTag}>
                  <Text style={styles.interestTagText}>{interest}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.articlesSection}>
            {articlesLoading && dailyArticles.length === 0 ? (
              <>
                <ArticleSkeleton />
                <ArticleSkeleton />
                <ArticleSkeleton />
              </>
            ) : dailyArticles.length === 0 && !articlesLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No articles yet</Text>
                <Text style={styles.emptySubtitle}>
                  Pull down to refresh, or update your interests in Settings.
                </Text>
              </View>
            ) : (
              dailyArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onSave={() => toggleSaveArticle(article.id)}
                  onRate={(rating) => rateArticle(article.id, rating)}
                  onRead={() => markArticleRead(article.id)}
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

  progressSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  progressIndicator: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.text,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  interestTag: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  interestTagText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  articlesSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  articleCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  articleContent: {
    flex: 1,
  },
  articleCategory: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  articleTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  articleSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 8,
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  articleSource: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  metaDot: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  articleTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  articleImageContainer: {
    alignItems: 'center',
    gap: 8,
  },
  articleImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.inputBackground,
  },
  articleImagePlaceholder: {
    backgroundColor: Colors.primaryLight,
  },
  saveButton: {
    padding: 4,
  },
  skeletonCategory: {
    width: 60,
    height: 10,
    borderRadius: 4,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  skeletonTitle: {
    width: '90%',
    height: 16,
    borderRadius: 4,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  skeletonSummary: {
    width: '75%',
    height: 12,
    borderRadius: 4,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  skeletonMeta: {
    width: '50%',
    height: 10,
    borderRadius: 4,
    backgroundColor: Colors.border,
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
