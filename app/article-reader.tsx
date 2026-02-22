import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ExternalLink, Bookmark, Star, Clock, Globe } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';

export default function ArticleReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { articles, savedArticles, toggleSaveArticle, rateArticle } = useApp();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const article = articles.find(a => a.id === id) || savedArticles.find(a => a.id === id);

  const handleOpenExternal = useCallback(async () => {
    if (article?.url && article.url !== '#') {
      try {
        await Linking.openURL(article.url);
      } catch (err) {
        console.log('[ArticleReader] Failed to open URL:', err);
      }
    }
  }, [article?.url]);

  const handleSave = useCallback(() => {
    if (!id) return;
    toggleSaveArticle(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [id, toggleSaveArticle]);

  const handleRate = useCallback((rating: number) => {
    if (!id) return;
    rateArticle(id, rating);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [id, rateArticle]);

  if (!article) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <X size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Article not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 16 : insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={20} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Bookmark
                size={20}
                color={article.isSaved ? Colors.primary : Colors.textSecondary}
                fill={article.isSaved ? Colors.primary : 'transparent'}
              />
            </TouchableOpacity>
            {article.url && article.url !== '#' && (
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={handleOpenExternal}
                activeOpacity={0.7}
              >
                <ExternalLink size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {article.imageUrl ? (
            <Image source={{ uri: article.imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]} />
          )}

          <View style={styles.body}>
            <Text style={styles.category}>{article.category}</Text>
            <Text style={styles.title}>{article.title}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Globe size={14} color={Colors.textMuted} />
                <Text style={styles.metaText}>{article.source}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Clock size={14} color={Colors.textMuted} />
                <Text style={styles.metaText}>{article.readTime} min read</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.summaryLabel}>Summary</Text>
            <Text style={styles.summary}>{article.summary}</Text>

            {article.url && article.url !== '#' && (
              <TouchableOpacity
                style={styles.readFullBtn}
                onPress={handleOpenExternal}
                activeOpacity={0.7}
              >
                <ExternalLink size={16} color={Colors.white} />
                <Text style={styles.readFullText}>Read full article</Text>
              </TouchableOpacity>
            )}

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Rate this article</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => handleRate(star)}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    activeOpacity={0.7}
                  >
                    <Star
                      size={28}
                      color={article.rating && star <= article.rating ? Colors.primary : Colors.border}
                      fill={article.rating && star <= article.rating ? Colors.primary : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroImage: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.inputBackground,
  },
  heroPlaceholder: {
    backgroundColor: Colors.primaryLight,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  category: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    lineHeight: 34,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    marginHorizontal: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 12,
  },
  summary: {
    fontSize: 17,
    color: Colors.text,
    lineHeight: 28,
    marginBottom: 24,
  },
  readFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 28,
  },
  readFullText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 12,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
