import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';

function getRCToken(): string {
  if (__DEV__ || Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY || '';
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  }) || '';
}

const apiKey = getRCToken();

let isConfigured = false;

export function configureRevenueCat() {
  if (isConfigured || !apiKey) {
    console.log('[RC] Already configured or no API key');
    return;
  }
  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    isConfigured = true;
    console.log('[RC] Configured successfully');
  } catch (error) {
    console.log('[RC] Configuration error:', error);
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    console.log('[RC] Offerings:', JSON.stringify(offerings.current?.availablePackages?.length));
    return offerings.current ?? null;
  } catch (error) {
    console.log('[RC] Error fetching offerings:', error);
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    console.log('[RC] Purchase successful');
    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('[RC] User cancelled purchase');
      return null;
    }
    console.log('[RC] Purchase error:', error);
    throw error;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    const info = await Purchases.getCustomerInfo();
    return info;
  } catch (error) {
    console.log('[RC] Error getting customer info:', error);
    return null;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const info = await Purchases.restorePurchases();
    console.log('[RC] Purchases restored');
    return info;
  } catch (error) {
    console.log('[RC] Restore error:', error);
    throw error;
  }
}

export function checkEntitlement(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return typeof info.entitlements?.active?.['Daily Pro'] !== 'undefined';
}

export async function loginRC(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    console.log('[RC] Logged in user:', userId);
  } catch (error) {
    console.log('[RC] Login error:', error);
  }
}

export async function logoutRC(): Promise<void> {
  try {
    await Purchases.logOut();
    console.log('[RC] Logged out');
  } catch (error) {
    console.log('[RC] Logout error:', error);
  }
}
