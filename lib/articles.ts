import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article } from '@/types';

const DAILY_ARTICLES_KEY = 'daily_articles_cache';
const DAILY_DATE_KEY = 'daily_articles_date';

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function searchArticlesWithOpenAI(interests: string[], count: number): Promise<Article[]> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const today = getTodayDateString();

  const prompt = `Find ${count} real, recent news articles from the internet about these topics: ${interests.join(', ')}.

For each article, provide:
- title: the exact article title
- url: the real, working URL to the article
- source: the publication name (e.g. TechCrunch, BBC, The Verge)
- summary: a 1-2 sentence summary
- category: the topic in UPPERCASE
- readTime: estimated reading time in minutes (3-15)

Respond with ONLY a valid JSON object in this exact format, no markdown or extra text:
{"articles":[{"title":"...","url":"https://...","source":"...","summary":"...","category":"TOPIC","readTime":5}]}`;

  console.log('[Articles] Calling OpenAI Responses API with web search...');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      tools: [{ type: 'web_search_preview' }],
      input: prompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log('[Articles] OpenAI request failed:', response.status, errorText);
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const result = await response.json();
  console.log('[Articles] OpenAI response received');

  let fullText = '';
  if (result.output && Array.isArray(result.output)) {
    for (const item of result.output) {
      if (item.type === 'message' && item.content) {
        for (const part of item.content) {
          if (part.type === 'output_text' || part.type === 'text') {
            fullText += part.text || '';
          }
        }
      }
    }
  }

  if (!fullText && result.choices) {
    fullText = result.choices[0]?.message?.content || '';
  }

  console.log('[Articles] Extracted text length:', fullText.length);
  console.log('[Articles] Extracted text preview:', fullText.slice(0, 500));

  const jsonMatch = fullText.match(/\{[\s\S]*"articles"[\s\S]*\}/);
  if (!jsonMatch) {
    console.log('[Articles] No JSON found in response, full text:', fullText.slice(0, 1000));
    throw new Error('No valid JSON found in OpenAI response');
  }

  let data: { articles: Array<{
    title: string;
    summary: string;
    category: string;
    source: string;
    readTime: number;
    url: string;
  }> };

  try {
    data = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.log('[Articles] JSON parse error:', e);
    throw new Error('Failed to parse article JSON');
  }

  if (!data.articles || !Array.isArray(data.articles)) {
    throw new Error('Invalid articles data structure');
  }

  const unsplashImages = [
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&h=300&fit=crop',
  ];

  const articles: Article[] = data.articles
    .filter(a => a.title && a.url && a.url.startsWith('http'))
    .map((a, i) => ({
      id: `article-${today}-${i}`,
      title: a.title,
      summary: a.summary || '',
      category: (a.category || interests[i % interests.length] || 'NEWS').toUpperCase(),
      source: a.source || 'Web',
      readTime: a.readTime || 5,
      publishedAt: 'Today',
      imageUrl: unsplashImages[i % unsplashImages.length],
      url: a.url,
      isRead: false,
      rating: null,
      isSaved: false,
    }));

  console.log('[Articles] Parsed', articles.length, 'articles with real URLs');
  articles.forEach(a => console.log('[Articles]  -', a.source, ':', a.url));
  return articles;
}

export async function fetchDailyArticles(interests: string[], count: number): Promise<Article[]> {
  const today = getTodayDateString();

  try {
    const cachedDate = await AsyncStorage.getItem(DAILY_DATE_KEY);
    const cachedArticles = await AsyncStorage.getItem(DAILY_ARTICLES_KEY);

    if (cachedDate === today && cachedArticles) {
      const parsed = JSON.parse(cachedArticles) as Article[];
      if (parsed.length > 0) {
        console.log('[Articles] Returning cached articles for', today);
        return parsed;
      }
    }
  } catch (e) {
    console.log('[Articles] Cache read error:', e);
  }

  console.log('[Articles] Fetching new articles for interests:', interests);

  const articles = await searchArticlesWithOpenAI(interests, count);

  if (articles.length > 0) {
    await AsyncStorage.setItem(DAILY_ARTICLES_KEY, JSON.stringify(articles));
    await AsyncStorage.setItem(DAILY_DATE_KEY, today);
    console.log('[Articles] Cached', articles.length, 'articles for', today);
  }

  return articles;
}

export async function fetchAdditionalArticles(interests: string[], additionalCount: number, existingArticles: Article[]): Promise<Article[]> {
  console.log('[Articles] Fetching', additionalCount, 'additional articles for upgrade');
  try {
    const newArticles = await searchArticlesWithOpenAI(interests, additionalCount);
    const today = getTodayDateString();
    const reindexed = newArticles.map((a, i) => ({
      ...a,
      id: `article-${today}-extra-${i}`,
    }));
    const combined = [...existingArticles, ...reindexed];
    await AsyncStorage.setItem(DAILY_ARTICLES_KEY, JSON.stringify(combined));
    await AsyncStorage.setItem(DAILY_DATE_KEY, today);
    console.log('[Articles] Cached', combined.length, 'total articles after upgrade');
    return reindexed;
  } catch (e) {
    console.log('[Articles] Failed to fetch additional articles:', e);
    return [];
  }
}

export async function clearArticleCache(): Promise<void> {
  await AsyncStorage.removeItem(DAILY_ARTICLES_KEY);
  await AsyncStorage.removeItem(DAILY_DATE_KEY);
  console.log('[Articles] Cache cleared');
}
