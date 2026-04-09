import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

export default function OnboardingWelcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const headlineFade = useRef(new Animated.Value(0)).current;
  const bodyFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headlineFade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.delay(600),
      Animated.timing(bodyFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 32) }]}>
      <View style={styles.centre}>
        <Animated.View style={{ opacity: headlineFade }}>
          <Text style={styles.line1}>Read less.</Text>
          <Text style={styles.line2}>Know more.</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.bottom, { opacity: bodyFade }]}>
        <Text style={styles.body}>Paprr gives you 3 articles a day. That's it.</Text>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push('/onboarding-how' as any)}
          activeOpacity={0.8}
          testID="get-started-button"
        >
          <Text style={styles.ctaText}>Get started</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  centre: {
    flex: 1,
    justifyContent: 'center',
  },
  line1: {
    fontSize: 48,
    fontFamily: 'CrimsonText_700Bold',
    color: Colors.text,
    lineHeight: 56,
    letterSpacing: -0.5,
  },
  line2: {
    fontSize: 48,
    fontFamily: 'CrimsonText_700Bold',
    color: Colors.textSecondary,
    lineHeight: 56,
    letterSpacing: -0.5,
  },
  bottom: {
    gap: 20,
  },
  body: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});
