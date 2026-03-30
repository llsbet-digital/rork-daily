import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { User, Article, ArticleInsight, NewsResource, UserPreferences } from '@/types';
import { fetchDailyArticles, fetchAdditionalArticles, clearArticleCache } from '@/lib/articles';
import { supabase, UserProfile } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { configureRevenueCat, getCustomerInfo, checkEntitlement, loginRC, logoutRC } from '@/lib/revenuecat';

const STORAGE_KEYS = {
  ARTICLES: 'daily_articles',
  INSIGHTS: 'article_insights',
  RESOURCES: 'user_news_resources',
  PREFERENCES: 'user_topic_preferences',
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
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNewSignUp, setIsNewSignUp] = useState<boolean>(false);
  const [articlesLoading, setArticlesLoading] = useState<boolean>(false);
  const [insights, setInsights] = useState<ArticleInsight[]>([]);
  const [generatingInsightId, setGeneratingInsightId] = useState<string | null>(null);
  const [resources, setResources] = useState<NewsResource[]>([]);
  const [resourcesLoaded, setResourcesLoaded] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<UserPreferences>({ topics: {} });

  useEffect(() => {
    console.log('[App] Initializing Supabase auth listener');
    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (error) {
        console.log('[App] getSession error:', error.message);
        supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsOnboarded(false);
        setIsLoading(false);
        return;
      }
      console.log('[App] Initial session:', s?.user?.id ?? 'none');
      setSession(s);
      if (!s) {
        setIsLoading(false);
      }
    }).catch((err) => {
      console.log('[App] getSession unexpected error:', err);
      setSession(null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      console.log('[App] Auth state changed:', _event, s?.user?.id ?? 'none');

      if (_event === 'TOKEN_REFRESHED' && !s) {
        console.log('[App] Token refresh failed, signing out');
        supabase.auth.signOut().catch(() => {});
      }

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

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        console.log('[App] Session expired during profile fetch, signing out');
        await supabase.auth.signOut().catch(() => {});
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.log('[App] Profile fetch error:', error.message);
        if (error.message?.includes('Refresh Token') || error.message?.includes('JWT')) {
          console.log('[App] Auth token invalid, signing out');
          await supabase.auth.signOut().catch(() => {});
          return null;
        }
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

  const savedArticlesQuery = useQuery({
    queryKey: ['savedArticles', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('saved_articles')
        .select('article_id, article_data, saved_at')
        .eq('user_id', session.user.id)
        .order('saved_at', { ascending: false });
      if (error) {
        console.log('[App] Failed to load saved articles:', error.message);
        return [];
      }
      return data as { article_id: string; article_data: Article; saved_at: string }[];
    },
    enabled: !!session?.user?.id,
  });

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

  const loadInsights = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.INSIGHTS);
      if (stored) {
        const parsed = JSON.parse(stored) as ArticleInsight[];
        setInsights(parsed);
        console.log('[App] Loaded', parsed.length, 'insights');
      }
    } catch (e) {
      console.log('[App] Failed to load insights:', e);
    }
  }, []);

  const persistInsights = useCallback(async (items: ArticleInsight[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.INSIGHTS, JSON.stringify(items));
      console.log('[App] Persisted', items.length, 'insights');
    } catch (e) {
      console.log('[App] Failed to persist insights:', e);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const loadResources = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.RESOURCES);
      if (stored) {
        const parsed = JSON.parse(stored) as NewsResource[];
        setResources(parsed);
        console.log('[App] Loaded', parsed.length, 'resources');
      }
    } catch (e) {
      console.log('[App] Failed to load resources:', e);
    } finally {
      setResourcesLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const loadPreferences = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        setPreferences(JSON.parse(stored) as UserPreferences);
      }
    } catch (e) {
      console.log('[App] Failed to load preferences:', e);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const loadArticlesForUser = useCallback(async (interests: string[], isPremium: boolean, resourceList?: NewsResource[]) => {
    if (!interests || interests.length === 0) return;
    if (!resourceList || resourceList.length === 0) {
      setArticles([]);
      return;
    }
    const count = isPremium ? 5 : 3;
    setArticlesLoading(true);
    try {
      const fetched = await fetchDailyArticles(interests, count, resourceList, preferences);
      setArticles(fetched);
      console.log('[App] Loaded', fetched.length, 'articles');
    } catch (error) {
      console.log('[App] Failed to load articles:', error);
      setArticles([]);
    } finally {
      setArticlesLoading(false);
    }
  }, []);

  const addResource = useCallback(async (name: string, url: string) => {
    const newResource: NewsResource = {
      id: `resource-${Date.now()}`,
      name,
      url,
      addedAt: new Date().toISOString(),
    };
    const updated = [...resources, newResource];
    setResources(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(updated));
    await clearArticleCache();
    console.log('[App] Added resource:', name, url);
    if (user?.interests && user.interests.length > 0) {
      loadArticlesForUser(user.interests, user?.isPremium ?? false, updated);
    }
  }, [resources, user, loadArticlesForUser]);

  const removeResource = useCallback(async (id: string) => {
    const updated = resources.filter(r => r.id !== id);
    setResources(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(updated));
    await clearArticleCache();
    console.log('[App] Removed resource:', id);
    if (user?.interests && user.interests.length > 0) {
      loadArticlesForUser(user.interests, user?.isPremium ?? false, updated);
    }
  }, [resources, user, loadArticlesForUser]);

  useEffect(() => {
    if (resourcesLoaded && user && isOnboarded && user.interests.length > 0) {
      loadArticlesForUser(user.interests, user.isPremium, resources);
    }
  }, [user?.id, isOnboarded, resourcesLoaded]);

  const maxDailyReads = user?.isPremium ? 5 : 3;
  const maxDailySaves = user?.isPremium ? 3 : 1;

  // Derived from Supabase saved_articles — works cross-device
  const savedArticleIds = useMemo(
    () => new Set((savedArticlesQuery.data || []).map(r => r.article_id)),
    [savedArticlesQuery.data]
  );

  const libraryArticles = useMemo(
    () => (savedArticlesQuery.data || []).map(r => ({ ...(r.article_data as Article), isSaved: true })),
    [savedArticlesQuery.data]
  );

  const todaySavesUsed = useMemo(() => {
    if (!savedArticlesQuery.data) return 0;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return savedArticlesQuery.data.filter(r => new Date(r.saved_at) >= todayStart).length;
  }, [savedArticlesQuery.data]);

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
    queryClient.removeQueries({ queryKey: ['savedArticles'] });
    await clearArticleCache();
  }, [queryClient]);

  const deleteAccount = useCallback(async () => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    console.log('[App] Deleting account:', session.user.id);

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', session.user.id);

    if (error) {
      console.log('[App] Profile delete error:', error.message);
      throw new Error(error.message);
    }

    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ARTICLES,
      STORAGE_KEYS.INSIGHTS,
    ]);

    await logoutRC();
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    setIsOnboarded(false);
    setIsNewSignUp(false);
    setArticles([]);
    setInsights([]);
    queryClient.removeQueries({ queryKey: ['profile'] });
    queryClient.removeQueries({ queryKey: ['customerInfo'] });
    queryClient.removeQueries({ queryKey: ['savedArticles'] });
    await clearArticleCache();
    console.log('[App] Account deleted');
  }, [session, queryClient]);

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
    const wasPremium = user?.isPremium ?? false;
    setUser(prev => prev ? { ...prev, isPremium } : null);
    if (session?.user?.id) {
      await supabase
        .from('profiles')
        .update({ is_premium: isPremium })
        .eq('id', session.user.id);
    }
    if (isPremium && !wasPremium && user?.interests && user.interests.length > 0) {
      console.log('[App] User upgraded to premium, fetching 2 additional articles');
      const additional = await fetchAdditionalArticles(user.interests, 2, articles, resources, preferences);
      if (additional.length > 0) {
        setArticles(prev => [...prev, ...additional]);
      }
    }
  }, [session, refreshCustomerInfo, user, articles]);

  const feedbackArticle = useCallback(async (articleId: string, feedback: 'up' | 'down') => {
    const toggle = (current: 'up' | 'down' | null) => current === feedback ? null : feedback;

    let previousFeedback: 'up' | 'down' | null = null;
    let articleCategory: string | null = null as string | null;

    setArticles(prev =>
      prev.map(a => {
        if (a.id === articleId) {
          previousFeedback = a.feedback;
          articleCategory = a.category;
          return { ...a, feedback: toggle(a.feedback) };
        }
        return a;
      })
    );

    // Update topic preferences in AsyncStorage
    if (articleCategory) {
      const topic = articleCategory.toLowerCase();
      const newFeedback = previousFeedback === feedback ? null : feedback;
      setPreferences(prev => {
        const current = prev.topics[topic] ?? { up: 0, down: 0 };
        const updated = { ...current };
        // Undo previous feedback if toggling
        if (previousFeedback === 'up') updated.up = Math.max(0, updated.up - 1);
        if (previousFeedback === 'down') updated.down = Math.max(0, updated.down - 1);
        // Apply new feedback
        if (newFeedback === 'up') updated.up += 1;
        if (newFeedback === 'down') updated.down += 1;
        const next = { ...prev, topics: { ...prev.topics, [topic]: updated } };
        AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(next)).catch(() => {});
        return next;
      });
    }

    if (session?.user?.id && savedArticleIds.has(articleId)) {
      const savedRow = (savedArticlesQuery.data || []).find(r => r.article_id === articleId);
      if (savedRow) {
        const updatedData = { ...(savedRow.article_data as Article), feedback: toggle((savedRow.article_data as Article).feedback) };
        await supabase
          .from('saved_articles')
          .update({ article_data: updatedData })
          .eq('user_id', session.user.id)
          .eq('article_id', articleId);
        queryClient.invalidateQueries({ queryKey: ['savedArticles'] });
      }
    }
    console.log('[App] Article feedback:', articleId, feedback, 'topic:', articleCategory);
  }, [savedArticleIds, savedArticlesQuery.data, session, queryClient]);

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

  const ensureSavedArticlesTable = useCallback(async () => {
    if (!session?.user?.id) return false;
    try {
      const { error } = await supabase
        .from('saved_articles')
        .select('article_id')
        .eq('user_id', session.user.id)
        .limit(1);
      if (error) {
        console.log('[App] saved_articles table check failed:', error.message, error.code, error.hint);
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
          console.log('[App] Table "saved_articles" does not exist in Supabase. Please create it with columns: id (uuid, PK), user_id (uuid, FK to auth.users), article_id (text), article_data (jsonb), saved_at (timestamptz). Enable RLS with policy for authenticated users.');
          return false;
        }
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          console.log('[App] RLS policy blocking access to saved_articles. Please add: CREATE POLICY "Users can manage own saved articles" ON saved_articles FOR ALL USING (auth.uid() = user_id);');
          return false;
        }
        return false;
      }
      return true;
    } catch (e) {
      console.log('[App] saved_articles table check exception:', e);
      return false;
    }
  }, [session?.user?.id]);

  const toggleSaveArticle = useCallback(async (articleId: string) => {
    if (!session?.user?.id) {
      console.log('[App] Cannot save article: not authenticated');
      Alert.alert('Sign In Required', 'Please sign in to save articles.');
      return;
    }

    const article = articles.find(a => a.id === articleId) || libraryArticles.find(a => a.id === articleId);
    if (!article) {
      console.log('[App] Cannot save article: article not found in articles or library', articleId);
      Alert.alert('Error', 'Article not found. Please try again.');
      return;
    }

    const currentlySaved = savedArticleIds.has(articleId);
    console.log('[App] toggleSaveArticle:', articleId, 'currentlySaved:', currentlySaved, 'userId:', session.user.id);
    console.log('[App] Supabase URL configured:', !!process.env.EXPO_PUBLIC_SUPABASE_URL);

    if (!currentlySaved && todaySavesUsed >= maxDailySaves) {
      console.log('[App] Daily save limit reached:', todaySavesUsed, '/', maxDailySaves);
      Alert.alert(
        'Daily Save Limit',
        user?.isPremium
          ? `You've saved ${maxDailySaves} articles today. Come back tomorrow for more!`
          : `Free accounts can save ${maxDailySaves} article per day. Upgrade to Premium for more saves!`,
        user?.isPremium ? [{ text: 'OK' }] : [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Go Premium', onPress: () => {} },
        ]
      );
      return;
    }

    const tableOk = await ensureSavedArticlesTable();
    if (!tableOk) {
      console.log('[App] saved_articles table is not accessible, cannot save');
      Alert.alert(
        'Save Unavailable',
        'The saved articles feature is not available right now. Please check your Supabase setup — the "saved_articles" table may need to be created or its RLS policies configured.'
      );
      return;
    }

    setArticles(prev => prev.map(a => a.id === articleId ? { ...a, isSaved: !currentlySaved } : a));

    try {
      if (!currentlySaved) {
        const articleToSave = {
          id: article.id,
          title: article.title,
          summary: article.summary,
          category: article.category,
          source: article.source,
          readTime: article.readTime,
          publishedAt: article.publishedAt,
          imageUrl: article.imageUrl,
          content: (article.content || '').slice(0, 5000),
          url: article.url,
          isRead: article.isRead,
          feedback: article.feedback,
          isSaved: true,
        };
        console.log('[App] Saving article to Supabase:', articleId, 'payload size:', JSON.stringify(articleToSave).length, 'bytes');

        const { error: deleteFirst } = await supabase
          .from('saved_articles')
          .delete()
          .eq('user_id', session.user.id)
          .eq('article_id', articleId);
        if (deleteFirst) {
          console.log('[App] Pre-delete (non-fatal):', deleteFirst.message, deleteFirst.code);
        }

        const { data: insertData, error } = await supabase
          .from('saved_articles')
          .insert({
            user_id: session.user.id,
            article_id: articleId,
            article_data: articleToSave,
            saved_at: new Date().toISOString(),
          })
          .select();
        if (error) {
          console.log('[App] Failed to save article:', JSON.stringify({ message: error.message, code: error.code, details: error.details, hint: error.hint }));
          setArticles(prev => prev.map(a => a.id === articleId ? { ...a, isSaved: false } : a));
          Alert.alert('Save Failed', `Could not save the article: ${error.message}`);
          return;
        }
        console.log('[App] Article saved successfully:', articleId, 'inserted rows:', insertData?.length);
      } else {
        console.log('[App] Removing article from Supabase:', articleId);
        const { error } = await supabase
          .from('saved_articles')
          .delete()
          .eq('user_id', session.user.id)
          .eq('article_id', articleId);
        if (error) {
          console.log('[App] Failed to unsave article:', JSON.stringify({ message: error.message, code: error.code, details: error.details, hint: error.hint }));
          setArticles(prev => prev.map(a => a.id === articleId ? { ...a, isSaved: true } : a));
          Alert.alert('Error', 'Could not remove the article. Please try again.');
          return;
        }
        console.log('[App] Article unsaved successfully:', articleId);
      }
    } catch (e) {
      console.log('[App] toggleSaveArticle unexpected error:', e);
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, isSaved: currentlySaved } : a));
      Alert.alert('Error', 'Something went wrong. Please try again.');
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['savedArticles'] });
  }, [articles, libraryArticles, savedArticleIds, todaySavesUsed, maxDailySaves, session, queryClient, user?.isPremium, ensureSavedArticlesTable]);

  const generateInsight = useCallback(async (articleId: string) => {
    if (!user?.isPremium) {
      console.log('[App] AI insights require premium subscription');
      return 'premium_required' as const;
    }

    const article = articles.find(a => a.id === articleId) || libraryArticles.find(a => a.id === articleId);
    if (!article) {
      console.log('[App] Article not found for insight:', articleId);
      return;
    }

    const existing = insights.find(i => i.articleId === articleId);
    if (existing) {
      console.log('[App] Insight already exists for article:', articleId);
      return;
    }

    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      console.log('[App] OpenAI API key not configured');
      return;
    }

    setGeneratingInsightId(articleId);
    try {
      console.log('[App] Generating insight via OpenAI for:', article.title);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a reading assistant. You produce a concise summary of an article and extract specific, fact-based learnings — especially those containing numbers, statistics, names, dates, or concrete details a reader would want to remember. Always respond with valid JSON matching the requested format.',
            },
            {
              role: 'user',
              content: `Read this article and:
1. Write a brief summary (2-3 sentences) capturing what the article is about.
2. Extract as many specific, fact-based learnings as possible — especially facts with numbers, statistics, percentages, names, dates, or concrete details. Each learning should be a standalone factual statement a reader would want to remember. Do not number them.

Title: ${article.title}
Category: ${article.category}
Content: ${article.content || article.summary}

Respond in this exact JSON format:
{"summary": "A 2-3 sentence summary of the article", "keyTakeaways": ["Specific fact or detail from the article", "Another concrete fact worth remembering", ...]}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[App] OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      const result = JSON.parse(content) as { summary: string; keyTakeaways: string[] };
      console.log('[App] OpenAI response parsed successfully');

      const newInsight: ArticleInsight = {
        id: `insight_${Date.now()}`,
        articleId: article.id,
        articleTitle: article.title,
        category: article.category,
        summary: result.summary,
        keyTakeaways: result.keyTakeaways || [],
        generatedAt: new Date().toISOString(),
        colorIndex: Math.floor(Math.random() * 3),
      };

      setInsights(prev => {
        const updated = [newInsight, ...prev];
        persistInsights(updated);
        return updated;
      });
      console.log('[App] Generated insight for article:', article.title);
    } catch (error) {
      console.log('[App] Failed to generate insight:', error);
    } finally {
      setGeneratingInsightId(null);
    }
  }, [articles, libraryArticles, insights, persistInsights, user?.isPremium]);

  const updateProfileName = useCallback(async (name: string) => {
    if (!user || !session?.user?.id) return;

    const { error } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', session.user.id);

    if (error) {
      console.log('[App] Failed to update name:', error.message);
      throw error;
    }

    setUser(prev => prev ? { ...prev, name } : null);
  }, [user, session]);

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
    loadArticlesForUser(interests, user.isPremium, resources);
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  }, [user, session, queryClient, loadArticlesForUser]);

  const savedArticles = useMemo(() => libraryArticles, [libraryArticles]);

  // isSaved is derived from Supabase so it's consistent across devices
  const dailyArticles = useMemo(
    () => articles.slice(0, maxDailyReads).map(a => ({ ...a, isSaved: savedArticleIds.has(a.id) })),
    [articles, maxDailyReads, savedArticleIds]
  );

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
    deleteAccount,
    completeOnboarding,
    togglePremium,
    refreshCustomerInfo,
    feedbackArticle,
    markArticleRead,
    toggleSaveArticle,
    updateInterests,
    updateProfileName,
    generateInsight,
    insights,
    generatingInsightId,
    resources,
    addResource,
    removeResource,

    isSigningUp: false,
    isSigningIn: false,
  };
});
