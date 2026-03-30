import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ExternalLink, Bookmark, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';

const ACCENT_COLORS = ['#E8DFF5', '#F5E6D3', '#E5F1F0', '#FCF4E9'] as const;

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dailyArticles, savedArticles, toggleSaveArticle, markArticleRead } = useApp();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const article = [...dailyArticles, ...(savedArticles || [])].find(a => a.id === id);

  useEffect(() => {
    if (article) {
      markArticleRead(article.id);
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenExternal = useCallback(async () => {
    if (article?.url && article.url !== '#') {
      try {
        await Linking.openURL(article.url);
      } catch (err) {
        console.log('[Article] Failed to open URL:', err);
      }
    }
  }, [article?.url]);

  const handleSave = useCallback(() => {
    if (article) {
      void toggleSaveArticle(article.id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [article, toggleSaveArticle]);

  if (!article) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Article not found</Text>
        </View>
      </View>
    );
  }

  const colorIndex = dailyArticles.findIndex(a => a.id === article.id);
  const accentColor = ACCENT_COLORS[(colorIndex >= 0 ? colorIndex : 0) % ACCENT_COLORS.length];

  const paragraphs = article.content
    ? article.content.split(/\n\n|\n/).filter(p => p.trim().length > 0)
    : [];

  return (
    <View style={styles.container}>
      <View style={[styles.heroSection, { backgroundColor: accentColor, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleSave} style={styles.headerActionBtn} activeOpacity={0.7}>
              <Bookmark
                size={20}
                color={article.isSaved ? Colors.primary : Colors.text}
                fill={article.isSaved ? Colors.primary : 'transparent'}
              />
            </TouchableOpacity>
            {article.url && article.url !== '#' && (
              <TouchableOpacity onPress={handleOpenExternal} style={styles.headerActionBtn} activeOpacity={0.7}>
                <ExternalLink size={20} color={Colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Animated.View style={[styles.heroContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.categoryLabel}>{article.category}</Text>
          <Text style={styles.heroTitle}>{article.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.sourceText}>{article.source}</Text>
            <View style={styles.metaDot} />
            <View style={styles.readTimeRow}>
              <Clock size={13} color="rgba(0,0,0,0.45)" />
              <Text style={styles.readTimeText}>{article.readTime} min read</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.summaryText}>{article.summary}</Text>

          <View style={styles.divider} />

          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph, idx) => (
              <Text key={idx} style={styles.bodyText}>{paragraph}</Text>
            ))
          ) : (
            <Text style={styles.bodyText}>{article.summary}</Text>
          )}

          {article.url && article.url !== '#' && (
            <TouchableOpacity style={styles.sourceButton} onPress={handleOpenExternal} activeOpacity={0.8}>
              <ExternalLink size={16} color={Colors.white} />
              <Text style={styles.sourceButtonText}>Read original article</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroSection: {
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(0,0,0,0.5)',
    letterSpacing: 1,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 34,
    letterSpacing: -0.4,
    fontFamily: 'CrimsonText_700Bold',
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(0,0,0,0.55)',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginHorizontal: 8,
  },
  readTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTimeText: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.45)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
  },
  summaryText: {
    fontSize: 17,
    fontWeight: '500' as const,
    color: Colors.text,
    lineHeight: 26,
    letterSpacing: -0.1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 22,
  },
  bodyText: {
    fontSize: 16,
    color: 'rgba(26,26,26,0.82)',
    lineHeight: 26,
    marginBottom: 18,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.text,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 12,
  },
  sourceButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
