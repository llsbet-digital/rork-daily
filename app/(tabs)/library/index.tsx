import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bookmark, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { Article } from '@/types';

const CARD_COLORS = ['#E8DFF5', '#F5E6D3', '#E5F1F0', '#FCF4E9'] as const;

function LibraryArticleCard({ article, onSave, onFeedback, index }: {
  article: Article;
  onSave: () => void;
  onFeedback: (type: 'up' | 'down') => void;
  index: number;
}) {
  const router = useRouter();
  const bgColor = CARD_COLORS[index % CARD_COLORS.length];

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/article', params: { id: article.id } } as any);
  }, [article.id, router]);

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
              color={Colors.primary}
              fill={Colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.articleTitle}>{article.title}</Text>

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
              size={15}
              color={article.feedback === 'up' ? Colors.primary : 'rgba(0,0,0,0.3)'}
              fill={article.feedback === 'up' ? Colors.primary : 'transparent'}
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
              size={15}
              color={article.feedback === 'down' ? '#E05555' : 'rgba(0,0,0,0.3)'}
              fill={article.feedback === 'down' ? '#E05555' : 'transparent'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.arrowButton}>
          <ChevronRight size={20} color={Colors.text} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, savedArticles, toggleSaveArticle, feedbackArticle } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredArticles = React.useMemo(() => {
    if (!searchQuery.trim()) return savedArticles;
    const q = searchQuery.toLowerCase();
    return savedArticles.filter(a =>
      a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
  }, [savedArticles, searchQuery]);

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
          <Text style={styles.topBarTitle}>Library</Text>
          <View style={{ width: 38 }} />
        </View>

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
              />
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
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    fontFamily: 'CrimsonText_600SemiBold',
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
  articleTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    lineHeight: 30,
    letterSpacing: -0.3,
    fontFamily: 'CrimsonText_700Bold',
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
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto' as const,
  },

  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
