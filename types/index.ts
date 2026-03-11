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
  content: string;
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

export interface ArticleInsight {
  id: string;
  articleId: string;
  articleTitle: string;
  category: string;
  summary: string;
  keyTakeaways: string[];
  generatedAt: string;
  colorIndex: number;
}

export type AuthMode = 'signin' | 'signup';

export interface NewsResource {
  id: string;
  name: string;
  url: string;
  addedAt: string;
}
