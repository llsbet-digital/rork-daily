import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  CreditCard,
  BookOpen,
  Bookmark,
  Crown,
  Tag,
  LogOut,
  FileText,
  Flame,
  User,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut, maxDailyReads, maxDailySaves } = useApp();

  const handleSignOut = React.useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await signOut();
    router.replace('/auth' as any);
  }, [signOut, router]);

  const initials = user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <X size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <User size={28} color={Colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || user?.email?.split('@')[0] || 'User'}</Text>
            <Text style={styles.profilePlan}>{user?.isPremium ? 'Premium' : 'Free'}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
        <View style={styles.sectionCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <CreditCard size={20} color={Colors.textSecondary} />
              <Text style={styles.settingText}>Plan</Text>
            </View>
            <Text style={styles.settingValue}>{user?.isPremium ? 'Premium' : 'Free'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <BookOpen size={20} color={Colors.textSecondary} />
              <Text style={styles.settingText}>Daily Reads</Text>
            </View>
            <Text style={styles.settingValue}>{maxDailyReads}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Bookmark size={20} color={Colors.textSecondary} />
              <Text style={styles.settingText}>Daily Saves</Text>
            </View>
            <Text style={styles.settingValue}>{maxDailySaves}</Text>
          </View>
          {!user?.isPremium && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => router.push('/premium' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <Crown size={20} color={Colors.primary} />
                  <Text style={[styles.settingText, styles.premiumText]}>Upgrade to Premium</Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.sectionLabel}>INTERESTS</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/manage-interests' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Tag size={20} color={Colors.primary} />
              <Text style={styles.settingText}>Manage Interests</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{user?.interests?.length ?? 0} topics</Text>
              <ChevronRight size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <LogOut size={20} color={Colors.textSecondary} />
              <Text style={styles.settingText}>Sign Out</Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>READING STATS</Text>
        <View style={styles.sectionCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <FileText size={20} color={Colors.textSecondary} />
              <Text style={styles.settingText}>Total Articles</Text>
            </View>
            <Text style={styles.settingValue}>{user?.totalArticlesRead ?? 0}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Flame size={20} color={Colors.textSecondary} />
              <Text style={styles.settingText}>Current Streak</Text>
            </View>
            <Text style={styles.settingValue}>{user?.streak ?? 0} days</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Bookmark size={20} color={Colors.textSecondary} />
              <Text style={styles.settingText}>Saved Articles</Text>
            </View>
            <Text style={styles.settingValue}>{user?.savedArticlesCount ?? 0}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginBottom: 24,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  profilePlan: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    marginBottom: 24,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingText: {
    fontSize: 16,
    color: Colors.text,
  },
  premiumText: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  settingValue: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 48,
  },
});
