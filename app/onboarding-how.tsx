import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

const steps = [
  {
    number: '01',
    title: 'Add Your Interests',
    description: "Type any topic that matters to you—from 'Swift development' to 'Climate tech'. Your feed, your rules.",
  },
  {
    number: '02',
    title: 'AI-Curated Reads',
    description: 'Get daily articles tailored to your exact interests, powered by AI that learns what matters to you.',
  },
  {
    number: '03',
    title: 'Save & Read Later',
    description: 'Free users can save up to 5 articles per week. Premium unlocks unlimited saves and offline reading.'
  },
];

export default function OnboardingHow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnims = React.useRef(steps.map(() => new Animated.Value(0))).current;
  const slideAnims = React.useRef(steps.map(() => new Animated.Value(40))).current;

  React.useEffect(() => {
    const animations = steps.map((_, i) =>
      Animated.parallel([
        Animated.timing(fadeAnims[i], {
          toValue: 1,
          duration: 600,
          delay: i * 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnims[i], {
          toValue: 0,
          duration: 600,
          delay: i * 200,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(100, animations).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}>
      <Text style={styles.sectionLabel}>HOW IT WORKS</Text>

      <View style={styles.stepsContainer}>
        {steps.map((step, i) => (
          <Animated.View
            key={step.number}
            style={[styles.step, { opacity: fadeAnims[i], transform: [{ translateY: slideAnims[i] }] }]}
          >
            <Text style={styles.stepNumber}>{step.number}</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => router.push('/onboarding-interests' as any)}
          activeOpacity={0.8}
          testID="next-button"
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: 60,
    marginTop: 20,
  },
  stepsContainer: {
    flex: 1,
    gap: 48,
  },
  step: {
    flexDirection: 'row',
    gap: 20,
  },
  stepNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
    minWidth: 36,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    fontFamily: 'CrimsonText_700Bold',
  },
  stepDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  backText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  nextButton: {
    backgroundColor: Colors.dark,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
