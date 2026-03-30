import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, Link } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { NewsResource } from '@/types';

export default function OnboardingSources() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ interests: string }>();
  const { completeOnboarding, addResource } = useApp();

  const interests: string[] = params.interests ? JSON.parse(params.interests) : [];

  const [sources, setSources] = useState<Array<{ name: string; url: string }>>([]);
  const [nameValue, setNameValue] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addSource = useCallback(() => {
    const trimmedName = nameValue.trim();
    const trimmedUrl = urlValue.trim();
    if (!trimmedName || !trimmedUrl) return;
    const urlToAdd = trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`;
    setSources(prev => [...prev, { name: trimmedName, url: urlToAdd }]);
    setNameValue('');
    setUrlValue('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [nameValue, urlValue]);

  const removeSource = useCallback((index: number) => {
    setSources(prev => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleFinish = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await completeOnboarding(interests);
      for (const source of sources) {
        await addResource(source.name, source.url);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)' as any);
    } catch (e) {
      console.log('[Onboarding] Failed to complete:', e);
      setIsLoading(false);
    }
  }, [isLoading, interests, sources, completeOnboarding, addResource, router]);

  const canAdd = nameValue.trim().length > 0 && urlValue.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.sectionLabel}>ADD YOUR SOURCES</Text>
          <Text style={[styles.countLabel, sources.length > 0 && styles.countLabelActive]}>
            {sources.length} added
          </Text>
        </View>

        <Text style={styles.title}>Where do you read?</Text>
        <Text style={styles.subtitle}>
          Add the websites and blogs you trust. Paprr will find articles exclusively from your sources.
        </Text>

        <View style={styles.inputBlock}>
          <TextInput
            style={styles.input}
            placeholder="Source name (e.g. TechCrunch)"
            placeholderTextColor={Colors.textMuted}
            value={nameValue}
            onChangeText={setNameValue}
            autoCapitalize="words"
            returnKeyType="next"
          />
          <View style={styles.urlRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="URL (e.g. techcrunch.com)"
              placeholderTextColor={Colors.textMuted}
              value={urlValue}
              onChangeText={setUrlValue}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={canAdd ? addSource : undefined}
            />
            <TouchableOpacity
              style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
              onPress={addSource}
              disabled={!canAdd}
              activeOpacity={0.7}
            >
              <Plus size={18} color={'#1A1A1A'} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.sourcesList} showsVerticalScrollIndicator={false}>
          {sources.length === 0 ? (
            <View style={styles.emptyState}>
              <Link size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Add the sites you want to read from</Text>
            </View>
          ) : (
            sources.map((source, index) => (
              <View key={index} style={styles.sourceRow}>
                <View style={styles.sourceIcon}>
                  <Link size={14} color={Colors.textSecondary} />
                </View>
                <View style={styles.sourceInfo}>
                  <Text style={styles.sourceName}>{source.name}</Text>
                  <Text style={styles.sourceUrl} numberOfLines={1}>{source.url}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeSource(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.continueButton, (isLoading || sources.length === 0) && styles.continueButtonMuted]}
            onPress={handleFinish}
            activeOpacity={0.8}
            disabled={isLoading || sources.length === 0}
          >
            <Text style={styles.continueButtonText}>
              {isLoading ? 'Setting up...' : sources.length === 0 ? 'Add at least one source' : 'Get Started'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  countLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  countLabelActive: {
    color: '#1A1A1A',
    fontWeight: '600' as const,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    fontFamily: 'CrimsonText_700Bold',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  inputBlock: {
    gap: 10,
    marginBottom: 20,
  },
  urlRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.text,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  addButtonDisabled: {
    backgroundColor: '#E0E0DC',
    borderColor: Colors.border,
  },
  sourcesList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 14,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  sourceIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F0F0EC',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  sourceUrl: {
    fontSize: 13,
    color: Colors.textSecondary,
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
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  continueButtonMuted: {
    backgroundColor: '#D5D5D5',
  },
  continueButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
