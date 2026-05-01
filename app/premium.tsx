import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import RevenueCatUI from 'react-native-purchases-ui';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { togglePremium, refreshCustomerInfo } = useApp();

  const handlePurchaseCompleted = React.useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await togglePremium();
    refreshCustomerInfo();
    router.back();
  }, [togglePremium, refreshCustomerInfo, router]);

  const handleRestoreCompleted = React.useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await togglePremium();
    refreshCustomerInfo();
    router.back();
  }, [togglePremium, refreshCustomerInfo, router]);

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
        <Text style={styles.headerTitle}>Upgrade</Text>
        <View style={{ width: 38 }} />
      </View>

      <RevenueCatUI.Paywall
        style={styles.paywall}
        onPurchaseCompleted={handlePurchaseCompleted}
        onRestoreCompleted={handleRestoreCompleted}
        onDismiss={() => router.back()}
        onPurchaseCancelled={() => {}}
        onPurchaseError={({ error }) => {
          console.log('[Premium] Purchase error:', error);
        }}
        onRestoreError={({ error }) => {
          console.log('[Premium] Restore error:', error);
        }}
      />
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
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    fontFamily: 'CrimsonText_700Bold',
  },
  paywall: {
    flex: 1,
  },
});
