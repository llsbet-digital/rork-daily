import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { User, Article } from '@/types';
import { fetchDailyArticles, clearArticleCache } from '@/lib/articles';
import { supabase, UserProfile } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { configureRevenueCat, getCustomerInfo, checkEntitlement, loginRC, logoutRC } from '@/lib/revenuecat';

const STORAGE_KEYS = {
  ARTICLES: 'daily_articles',
} as const;

function profileToUser(profile: UserProfile): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    isPremium: profile.is_premium,
    memberSince: profile.created_at,
    interests: profile.interests,
    streak: profile.streak,
    totalArticlesRead: profile.total_articles_read,
    savedArticlesCount: profile.saved_articles_count,
  };
}

configureRevenueCat();

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [todayReadsCompleted, setTodayReadsCompleted] = useState<number>(0);
  const [todaySavesUsed, setTodaySavesUsed] = useState<number>(0);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNewSignUp, setIsNewSignUp] = useState<boolean>(false);
  const [articlesLoading, setArticlesLoading] = useState<boolean>(false);

  useEffect(() => {
    console.log('[App] Initializing Supabase auth listener');
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log('[App] Initial session:', s?.user?.id ?? 'none');
      setSession(s);
      if (!s) {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      console.log('[App] Auth state changed:', _event, s?.user?.id ?? 'none');
      setSession(s);
      if (!s) {
        setUser(null);
        setIsAuthenticated(false);
        setIsOnboarded(false);
        setIsNewSignUp(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const profileQuery = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      console.log('[App] Fetching profile for:', session.user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.log('[App] Profile fetch error:', error.message);
        if (error.code === 'PGRST116') {
          console.log('[App] No profile found, creating one');
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
              is_premium: false,
              is_onboarded: false,
              interests: [],
              streak: 0,
              total_articles_read: 0,
              saved_articles_count: 0,
            })
            .select()
            .single();

          if (createError) {
            console.log('[App] Profile create error:', createError.message);
            throw createError;
          }
          return newProfile as UserProfile;
        }
        throw error;
      }
      return data as UserProfile;
    },
    enabled: !!session?.user?.id,
    retry: 1,
  });

  const customerInfoQuery = useQuery({
    queryKey: ['customerInfo', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      await loginRC(session.user.id);
      const info = await getCustomerInfo();
      console.log('[App] Customer info fetched, premium:', checkEntitlement(info));
      return info;
    },
    enabled: !!session?.user?.id,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  const refreshCustomerInfo = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['customerInfo'] });
  }, [queryClient]);

  useEffect(() => {
    if (profileQuery.data) {
      const appUser = profileToUser(profileQuery.data);
      const rcPremium = checkEntitlement(customerInfoQuery.data ?? null);
      if (rcPremium !== appUser.isPremium) {
        appUser.isPremium = rcPremium;
      }
      setUser(appUser);
      setIsAuthenticated(true);
      const onboarded = profileQuery.data.is_onboarded;
      if (!isNewSignUp && !onboarded) {
        console.log('[App] Returning user not onboarded, skipping onboarding');
        setIsOnboarded(true);
      } else {
        setIsOnboarded(onboarded);
      }
      console.log('[App] Profile loaded:', appUser.id, 'onboarded:', onboarded, 'premium:', rcPremium);
    } else if (profileQuery.isError) {
      console.log('[App] Profile query error, resetting auth state');
      setIsAuthenticated(false);
      setIsOnboarded(false);
      setUser(null);
    }
    if (session && !profileQuery.isLoading) {
      setIsLoading(false);
    }
  }, [profileQuery.data, profileQuery.isError, profileQuery.isLoading, session, isNewSignUp, customerInfoQuery.data]);

  const loadArticlesForUser = useCallback(async (interests: string[], isPremium: boolean) => {
    if (!interests || interests.length === 0) return;
    const count = isPremium ? 5 : 3;
    setArticlesLoading(true);
    try {
      const fetched = await fetchDailyArticles(interests, count);
      setArticles(fetched);
      console.log('[App] Loaded', fetched.length, 'articles');
    } catch (error) {
      console.log('[App] Failed to load articles:', error);
      setArticles([]);
    } finally {
      setArticlesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && isOnboarded && user.interests.length > 0) {
      loadArticlesForUser(user.interests, user.isPremium);
    }
  }, [user?.id, isOnboarded]);

  const maxDailyReads = user?.isPremium ? 5 : 3;
  const maxDailySaves = user?.isPremium ? 3 : 1;

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    console.log('[App] Signing up:', email);
    setIsNewSignUp(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      console.log('[App] Sign up error:', error.message);
      setIsNewSignUp(false);
      throw new Error(error.message);
    }

    if (data.user) {
      console.log('[App] Sign up success:', data.user.id);
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: email.toLowerCase().trim(),
          name: name || email.split('@')[0],
          is_premium: false,
          is_onboarded: false,
          interests: [],
          streak: 0,
          total_articles_read: 0,
          saved_articles_count: 0,
        });

      if (profileError) {
        console.log('[App] Profile creation error:', profileError.message);
      }

      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  }, [queryClient]);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[App] Signing in:', email);
    setIsNewSignUp(false);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('[App] Sign in error:', error.message);
      throw new Error(error.message);
    }

    console.log('[App] Sign in success:', data.user?.id);
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  }, [queryClient]);

  const signOut = useCallback(async () => {
    console.log('[App] Signing out');
    await logoutRC();
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    setIsOnboarded(false);
    setIsNewSignUp(false);
    setArticles([]);
    queryClient.removeQueries({ queryKey: ['profile'] });
    queryClient.removeQueries({ queryKey: ['customerInfo'] });
    await clearArticleCache();
  }, [queryClient]);

  const completeOnboarding = useCallback(async (interests: string[]) => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    console.log('[App] Completing onboarding with interests:', interests);

    const { data, error } = await supabase
      .from('profiles')
      .update({ interests, is_onboarded: true })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) {
      console.log('[App] Onboarding update error:', error.message);
      throw new Error(error.message);
    }

    const profile = data as UserProfile;
    setUser(profileToUser(profile));
    setIsOnboarded(true);
    setIsNewSignUp(false);

    queryClient.invalidateQueries({ queryKey: ['profile'] });
    console.log('[App] Onboarding complete');
  }, [session, queryClient]);

  const togglePremium = useCallback(async () => {
    refreshCustomerInfo();
    const info = await getCustomerInfo();
    const isPremium = checkEntitlement(info);
    setUser(prev => prev ? { ...prev, isPremium } : null);
    if (session?.user?.id) {
      await supabase
        .from('profiles')
        .update({ is_premium: isPremium })
        .eq('id', session.user.id);
    }
  }, [session, refreshCustomerInfo]);

  const rateArticle = useCallback((articleId: string, rating: number) => {
    setArticles(prev => {
      const updated = prev.map(a =>
        a.id === articleId ? { ...a, rating } : a
      );
      return updated;
    });
  }, []);

  const markArticleRead = useCallback((articleId: string) => {
    setArticles(prev => {
      const updated = prev.map(a =>
        a.id === articleId ? { ...a, isRead: true } : a
      );
      return updated;
    });
    setTodayReadsCompleted(prev => prev + 1);
    if (user && session?.user?.id) {
      const newTotal = user.totalArticlesRead + 1;
      const newStreak = Math.max(user.streak, 1);
      setUser(prev => prev ? { ...prev, totalArticlesRead: newTotal, streak: newStreak } : null);
      supabase
        .from('profiles')
        .update({ total_articles_read: newTotal, streak: newStreak })
        .eq('id', session.user.id)
        .then(({ error }) => {
          if (error) console.log('[App] Update read count error:', error.message);
        });
    }
  }, [user, session]);

  const toggleSaveArticle = useCallback((articleId: string) => {
    setArticles(prev => {
      const article = prev.find(a => a.id === articleId);
      if (!article) return prev;

      if (!article.isSaved && todaySavesUsed >= maxDailySaves) {
        return prev;
      }

      const updated = prev.map(a =>
        a.id === articleId ? { ...a, isSaved: !a.isSaved } : a
      );

      if (!article.isSaved) {
        setTodaySavesUsed(p => p + 1);
      } else {
        setTodaySavesUsed(p => Math.max(0, p - 1));
      }

      return updated;
    });
  }, [todaySavesUsed, maxDailySaves]);

  const updateInterests = useCallback(async (interests: string[]) => {
    if (!user || !session?.user?.id) return;

    const { error } = await supabase
      .from('profiles')
      .update({ interests })
      .eq('id', session.user.id);

    if (error) {
      console.log('[App] Failed to update interests:', error.message);
    }

    setUser(prev => prev ? { ...prev, interests } : null);
    await clearArticleCache();
    loadArticlesForUser(interests, user.isPremium);
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  }, [user, session, queryClient, loadArticlesForUser]);

  const refreshArticles = useCallback(async () => {
    if (!user || user.interests.length === 0) return;
    await clearArticleCache();
    await loadArticlesForUser(user.interests, user.isPremium);
  }, [user, loadArticlesForUser]);

  const savedArticles = useMemo(() => articles.filter(a => a.isSaved), [articles]);
  const dailyArticles = useMemo(() => articles.slice(0, maxDailyReads), [articles, maxDailyReads]);

  return {
    user,
    articles,
    dailyArticles,
    savedArticles,
    isOnboarded,
    isAuthenticated,
    isLoading,
    articlesLoading,
    todayReadsCompleted,
    todaySavesUsed,
    maxDailyReads,
    maxDailySaves,
    signUp,
    signIn,
    signOut,
    completeOnboarding,
    togglePremium,
    refreshCustomerInfo,
    rateArticle,
    markArticleRead,
    toggleSaveArticle,
    updateInterests,
    refreshArticles,
    isSigningUp: false,
    isSigningIn: false,
  };
});
