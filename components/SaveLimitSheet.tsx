import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { Bookmark } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Article } from '@/types';

interface SaveLimitSheetProps {
  article: Article;
  onUnlockPro: () => void;
  onDismiss: () => void;
}

export default function SaveLimitSheet({ article, onUnlockPro, onDismiss }: SaveLimitSheetProps) {
  const translateY = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 400,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onDismiss);
  };

  return (
    <Modal transparent animationType="none" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Animated.View style={[styles.backdropInner, { opacity: backdropOpacity }]} />
      </Pressable>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />

        <View style={styles.iconWrap}>
          <Bookmark size={22} color="#1A1A1A" fill={Colors.primary} />
        </View>

        <Text style={styles.headline}>You've used your free save today.</Text>
        <Text style={styles.body}>
          Pro users save up to 3 articles a day and build a knowledge base that grows with them.
        </Text>

        <View style={styles.articleCard}>
          <Text style={styles.articleSource}>{article.source}</Text>
          <Text style={styles.articleTitle} numberOfLines={2}>{article.title}</Text>
          <Text style={styles.articleHint}>Save this with Pro →</Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={onUnlockPro} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Unlock Pro</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ghostBtn} onPress={dismiss} activeOpacity={0.7}>
          <Text style={styles.ghostBtnText}>Not now</Text>
        </TouchableOpacity>

        <Text style={styles.pricing}>€3.99/month · cancel anytime</Text>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 24,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headline: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: 'CrimsonText_700Bold',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
  },
  articleCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  articleSource: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 10,
  },
  articleHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  primaryBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ghostBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  ghostBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  pricing: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
