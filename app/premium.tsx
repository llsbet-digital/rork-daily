import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Crown, Check, RotateCcw, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/revenuecat';
import { PurchasesPackage } from 'react-native-purchases';

const comparisonRows = [
  { feature: 'Daily Reads', free: '3', premium: '5' },
  { feature: 'Daily Saves', free: '1', premium: '3' },
  { feature: 'Insights', free: 'Basic', premium: 'Full' },
  { feature: 'Topic Depth', free: 'Standard', premium: 'Deep' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { togglePremium, user, refreshCustomerInfo } = useApp();
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [selectedPlan, setSelectedPlan] = React.useState<'yearly' | 'monthly'>('yearly');

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const offeringsQuery = useQuery({
    queryKey: ['offerings'],
    queryFn: getOfferings,
    staleTime: 1000 * 60 * 10,
  });

  const monthlyPackage = React.useMemo(() => {
    if (!offeringsQuery.data) return null;
    const pkgs = offeringsQuery.data.availablePackages;
    return pkgs?.find(p => p.identifier === '$rc_monthly') ?? null;
  }, [offeringsQuery.data]);

  const yearlyPackage = React.useMemo(() => {
    if (!offeringsQuery.data) return null;
    const pkgs = offeringsQuery.data.availablePackages;
    return pkgs?.find(p => p.identifier === '$rc_annual') ?? null;
  }, [offeringsQuery.data]);

  const activePackage = selectedPlan === 'yearly' ? yearlyPackage : monthlyPackage;

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const result = await purchasePackage(pkg);
      return result;
    },
    onSuccess: async (info) => {
      if (info) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await togglePremium();
        refreshCustomerInfo();
        router.back();
      }
    },
    onError: (error: Error) => {
      Alert.alert('Purchase Failed', error.message || 'Something went wrong. Please try again.');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restorePurchases,
    onSuccess: async (info) => {
      await togglePremium();
      refreshCustomerInfo();
      if (info?.entitlements?.active?.['Daily Pro']) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Restored!', 'Your premium subscription has been restored.');
        router.back();
      } else {
        Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
      }
    },
    onError: (error: Error) => {
      Alert.alert('Restore Failed', error.message || 'Something went wrong.');
    },
  });

  const handlePurchase = React.useCallback(() => {
    if (!activePackage) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    purchaseMutation.mutate(activePackage);
  }, [activePackage, purchaseMutation]);

  const handleRestore = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    restoreMutation.mutate();
  }, [restoreMutation]);

  const monthlyPrice = monthlyPackage?.product?.priceString ?? '$4.99';
  const yearlyPrice = yearlyPackage?.product?.priceString ?? '$29.99';
  const isProcessing = purchaseMutation.isPending || restoreMutation.isPending;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
        disabled={isProcessing}
      >
        <X size={22} color={Colors.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconCircle}>
            <Crown size={48} color={Colors.primary} />
          </View>

          <Text style={styles.title}>{'Unlock Your\nFull Potential'}</Text>
          <Text style={styles.subtitle}>
            Get more daily reads, save more articles, and access deeper insights.
          </Text>

          <View style={styles.comparisonTable}>
            <View style={styles.tableHeader}>
              <View style={styles.featureCol} />
              <Text style={styles.headerFree}>Free</Text>
              <Text style={styles.headerPremium}>Premium</Text>
            </View>

            {comparisonRows.map((row, i) => (
              <View
                key={row.feature}
                style={[
                  styles.tableRow,
                  i % 2 === 0 && styles.tableRowEven,
                ]}
              >
                <Text style={styles.featureText}>{row.feature}</Text>
                <Text style={styles.freeValue}>{row.free}</Text>
                <View style={styles.premiumValueWrap}>
                  <Check size={14} color={Colors.primary} />
                  <Text style={styles.premiumValue}>{row.premium}</Text>
                </View>
              </View>
            ))}
          </View>

          {user?.isPremium ? (
            <View style={styles.activeContainer}>
              <View style={styles.activeBadge}>
                <Check size={18} color={Colors.success} />
                <Text style={styles.activeText}>Premium Active</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.planSelector}>
                <TouchableOpacity
                  style={[
                    styles.planCard,
                    selectedPlan === 'yearly' && styles.planCardSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedPlan('yearly');
                  }}
                  activeOpacity={0.8}
                >
                  {selectedPlan === 'yearly' && (
                    <View style={styles.bestValueBadge}>
                      <Zap size={10} color={Colors.white} />
                      <Text style={styles.bestValueText}>BEST VALUE</Text>
                    </View>
                  )}
                  <View style={[
                    styles.planRadio,
                    selectedPlan === 'yearly' && styles.planRadioSelected,
                  ]}>
                    {selectedPlan === 'yearly' && <View style={styles.planRadioInner} />}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={[
                      styles.planName,
                      selectedPlan === 'yearly' && styles.planNameSelected,
                    ]}>Yearly</Text>
                    <Text style={styles.planPriceDetail}>{yearlyPrice}/year · Save 50%</Text>
                  </View>
                  <Text style={[
                    styles.planPrice,
                    selectedPlan === 'yearly' && styles.planPriceSelected,
                  ]}>{yearlyPrice}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.planCard,
                    selectedPlan === 'monthly' && styles.planCardSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedPlan('monthly');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.planRadio,
                    selectedPlan === 'monthly' && styles.planRadioSelected,
                  ]}>
                    {selectedPlan === 'monthly' && <View style={styles.planRadioInner} />}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={[
                      styles.planName,
                      selectedPlan === 'monthly' && styles.planNameSelected,
                    ]}>Monthly</Text>
                    <Text style={styles.planPriceDetail}>{monthlyPrice}/month</Text>
                  </View>
                  <Text style={[
                    styles.planPrice,
                    selectedPlan === 'monthly' && styles.planPriceSelected,
                  ]}>{monthlyPrice}</Text>
                </TouchableOpacity>
              </View>

              {offeringsQuery.isLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginBottom: 16 }} />
              ) : (
                <TouchableOpacity
                  style={[styles.upgradeButton, isProcessing && styles.upgradeButtonDisabled]}
                  onPress={handlePurchase}
                  activeOpacity={0.8}
                  disabled={isProcessing || !activePackage}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.upgradeButtonText}>
                      Subscribe {selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                activeOpacity={0.7}
                disabled={isProcessing}
              >
                <RotateCcw size={14} color={Colors.textSecondary} />
                <Text style={styles.restoreText}>Restore Purchases</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.trialText}>
            Cancel anytime · {selectedPlan === 'yearly' ? 'Billed annually' : 'Billed monthly'}
          </Text>
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
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  comparisonTable: {
    width: '100%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 28,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  featureCol: {
    flex: 1,
  },
  headerFree: {
    width: 80,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  headerPremium: {
    width: 80,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: Colors.inputBackground,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  freeValue: {
    width: 80,
    textAlign: 'center',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  premiumValueWrap: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  premiumValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  planSelector: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF5EE',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bestValueText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planRadioSelected: {
    borderColor: Colors.primary,
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  planNameSelected: {
    color: Colors.primary,
  },
  planPriceDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  planPriceSelected: {
    color: Colors.primary,
  },
  upgradeButton: {
    backgroundColor: Colors.dark,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  upgradeButtonDisabled: {
    opacity: 0.6,
  },
  upgradeButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
  },
  restoreText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  activeContainer: {
    marginBottom: 16,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  trialText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 12,
    paddingBottom: 8,
  },
});
