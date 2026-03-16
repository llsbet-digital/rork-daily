import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Trash2, Link } from 'lucide-react-native';
import { Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';

export default function ManageResourcesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resources, addResource, removeResource } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();

    if (!trimmedName) {
      Alert.alert('Missing Name', 'Please enter a name for this source.');
      return;
    }
    if (!trimmedUrl) {
      Alert.alert('Missing URL', 'Please enter the website URL.');
      return;
    }

    const urlToAdd = trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`;

    setAdding(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addResource(trimmedName, urlToAdd);
    setName('');
    setUrl('');
    setShowForm(false);
    setAdding(false);
  };

  const handleRemove = (id: string, resourceName: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Remove Source',
      `Remove "${resourceName}" from your sources? Your daily articles will be refreshed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeResource(id),
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Sources</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowForm(v => !v);
            }}
            activeOpacity={0.7}
          >
            <Plus size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.description}>
            Add websites or blogs you want your daily articles to come from. When sources are added, Paprr will prioritize finding articles from them.
          </Text>

          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>SOURCE NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. TechCrunch, Paul Graham's Blog"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
              />
              <Text style={[styles.formLabel, { marginTop: 12 }]}>WEBSITE URL</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. techcrunch.com or https://..."
                placeholderTextColor={Colors.textMuted}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowForm(false);
                    setName('');
                    setUrl('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, adding && styles.saveBtnDisabled]}
                  onPress={handleAdd}
                  activeOpacity={0.7}
                  disabled={adding}
                >
                  <Text style={styles.saveBtnText}>{adding ? 'Adding...' : 'Add Source'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {resources.length === 0 && !showForm ? (
            <View style={styles.emptyState}>
              <Image
                source={require('@/assets/images/Resources.png')}
                style={styles.emptyImage}
                resizeMode="contain"
              />
              <Text style={styles.emptyTitle}>No sources yet</Text>
              <Text style={styles.emptyText}>
                Tap + to add your first source. Your daily articles will come from the websites and blogs you add here.
              </Text>
            </View>
          ) : (
            resources.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>YOUR SOURCES ({resources.length})</Text>
                <View style={styles.sectionCard}>
                  {resources.map((resource, index) => (
                    <React.Fragment key={resource.id}>
                      {index > 0 && <View style={styles.divider} />}
                      <View style={styles.resourceRow}>
                        <View style={styles.resourceIcon}>
                          <Link size={16} color={Colors.primary} />
                        </View>
                        <View style={styles.resourceInfo}>
                          <Text style={styles.resourceName}>{resource.name}</Text>
                          <Text style={styles.resourceUrl} numberOfLines={1}>{resource.url}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleRemove(resource.id, resource.name)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={18} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              </>
            )
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    fontFamily: 'CrimsonText_700Bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    color: Colors.white,
    fontWeight: '600' as const,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    overflow: 'hidden',
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  resourceIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  resourceUrl: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  deleteBtn: {
    padding: 4,
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 60,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyImage: {
    width: 120,
    height: 120,
    opacity: 0.6,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});
