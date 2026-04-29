import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('[Supabase] WARNING: Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function clearSupabaseAuthStorage(): Promise<void> {
  try {
    const projectRef = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0];
    const candidates = [
      `sb-${projectRef}-auth-token`,
      `sb-${projectRef}-auth-token-code-verifier`,
      'supabase.auth.token',
    ];
    await Promise.all(
      candidates.map((k) => SecureStore.deleteItemAsync(k).catch(() => {}))
    );
    console.log('[Supabase] Cleared stale auth storage');
  } catch (e) {
    console.log('[Supabase] Failed to clear auth storage:', e);
  }
}

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  is_premium: boolean;
  is_onboarded: boolean;
  interests: string[];
  streak: number;
  total_articles_read: number;
  saved_articles_count: number;
  created_at: string;
};
