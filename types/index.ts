export interface User {
  id: string;
  email: string;
  name: string;
  isPremium: boolean;
  memberSince: string;
  interests: string[];
  streak: number;
  totalArticlesRead: number;
  savedArticlesCount: number;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  readTime: number;
  publishedAt: string;
  imageUrl: string;
  url: string;
  isRead: boolean;
  feedback: 'up' | 'down' | null;
  isSaved: boolean;
}

export interface WeeklyInsight {
  id: string;
  weekLabel: string;
  topTopics: string[];
  articlesRead: number;
  totalReadTime: number;
  keyTakeaways: string[];
  trendingUp: string[];
  trendingDown: string[];
}

export type OnboardingStep = 'welcome' | 'how-it-works' | 'interests' | 'done';

export type AuthMode = 'signin' | 'signup';
