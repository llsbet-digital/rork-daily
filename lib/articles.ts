import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article, NewsResource, UserPreferences } from '@/types';

const DAILY_ARTICLES_KEY = 'daily_articles_cache';
const DAILY_DATE_KEY = 'daily_articles_date';

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function buildInterestDistribution(interests: string[], count: number, preferences?: UserPreferences): string[] {
  // Weight each topic by net positive feedback (up - down), minimum weight 1
  const weights = interests.map(topic => {
    const pref = preferences?.topics[topic.toLowerCase()];
    if (!pref) return 1;
    return Math.max(1, pref.up - pref.down + 1);
  });
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  // Allocate slots proportionally, ensuring every interest gets at least 1
  const slots: string[] = [];
  const allocations = weights.map((w, i) => ({
    topic: interests[i],
    count: Math.max(1, Math.round((w / totalWeight) * count)),
  }));

  // Trim or pad to hit exact count
  let total = allocations.reduce((s, a) => s + a.count, 0);
  while (total > count) {
    // Remove from lowest-weight topics first
    const idx = allocations.reduce((minIdx, a, i) => a.count > 1 && weights[i] <= weights[minIdx] ? i : minIdx, 0);
    allocations[idx].count--;
    total--;
  }
  while (total < count) {
    // Add to highest-weight topics first
    const idx = allocations.reduce((maxIdx, _a, i) => weights[i] > weights[maxIdx] ? i : maxIdx, 0);
    allocations[idx].count++;
    total++;
  }

  for (const { topic, count: n } of allocations) {
    for (let i = 0; i < n; i++) slots.push(topic);
  }

  // Shuffle
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}

function buildPreferenceSummary(interests: string[], preferences?: UserPreferences): string {
  if (!preferences || Object.keys(preferences.topics).length === 0) return '';
  const liked: string[] = [];
  const disliked: string[] = [];
  for (const interest of interests) {
    const pref = preferences.topics[interest.toLowerCase()];
    if (!pref) continue;
    const net = pref.up - pref.down;
    if (net >= 2) liked.push(interest);
    else if (net <= -2) disliked.push(interest);
  }
  if (liked.length === 0 && disliked.length === 0) return '';
  const lines: string[] = ['USER PREFERENCES (based on past reading feedback):'];
  if (liked.length > 0) lines.push(`- Topics user enjoys: ${liked.join(', ')}`);
  if (disliked.length > 0) lines.push(`- Topics user dislikes: ${disliked.join(', ')} — minimise these`);
  return lines.join('\n');
}

async function searchArticlesWithOpenAI(interests: string[], count: number, resources?: NewsResource[], preferences?: UserPreferences): Promise<Article[]> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const today = getTodayDateString();
  const topicSlots = buildInterestDistribution(interests, count, preferences);
  const topicBreakdown = topicSlots.map((t, i) => `Article ${i + 1}: about "${t}"`).join('\n');
  const prefSummary = buildPreferenceSummary(interests, preferences);

  const hasResources = resources && resources.length > 0;

  // Extract clean domain names from resource URLs for search and filtering
  const allowedDomains = hasResources
    ? resources.map(r => {
        try {
          const url = r.url.startsWith('http') ? r.url : `https://${r.url}`;
          return new URL(url).hostname.replace(/^www\./, '');
        } catch {
          return r.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
        }
      })
    : [];

  let prompt: string;

  if (hasResources) {
    // Build per-article search instructions using site: queries
    const searchInstructions = topicSlots.map((topic, i) => {
      const domain = allowedDomains[i % allowedDomains.length];
      return `Article ${i + 1}: Search "site:${domain} ${topic}" — return an article from ${domain}`;
    }).join('\n');

    prompt = `You are a search assistant. For each article below, run the specified web search and return the result.

${searchInstructions}
${prefSummary ? `\n${prefSummary}\n` : ''}
STRICT RULES:
- Every article URL MUST be from one of these domains: ${allowedDomains.join(', ')}
- If a search returns no result from the correct domain, try another keyword variation on the same domain.
- NEVER return a URL from any domain not listed above.
- Return exactly ${count} articles.

For each article provide:
- title: the exact article title
- url: the full URL (MUST be on one of: ${allowedDomains.join(', ')})
- source: the site name
- summary: 1-2 sentence summary
- content: detailed article body (4-8 paragraphs), well-written with analysis and insights. Use line breaks between paragraphs.
- category: the topic in UPPERCASE
- readTime: estimated reading time in minutes (3-15)

Respond with ONLY valid JSON, no markdown:
{"articles":[{"title":"...","url":"https://...","source":"...","summary":"...","content":"...","category":"TOPIC","readTime":5}]}`;
  } else {
    prompt = `Find exactly ${count} real, recent FREE news articles from the internet. Each article MUST be about the specific topic assigned below:

${topicBreakdown}
${prefSummary ? `\n${prefSummary}\n` : ''}
IMPORTANT RULES:
- You MUST return exactly ${count} articles, no more, no less.
- Each article must match its assigned topic above.
- Only include articles that are completely free to read — no paywalls, no subscription requirements.
- Prefer free sources like BBC, Reuters, The Verge, TechCrunch, Ars Technica, The Guardian, AP News, NPR, Wired (free articles), etc.
- Avoid WSJ, Financial Times, NYT, The Athletic, Bloomberg (paywalled).

For each article provide:
- title: the exact article title
- url: the real, working URL to the article
- source: the publication name
- summary: 1-2 sentence summary
- content: detailed article body (4-8 paragraphs), well-written with analysis and insights. Use line breaks between paragraphs.
- category: the topic in UPPERCASE
- readTime: estimated reading time in minutes (3-15)

Respond with ONLY valid JSON, no markdown:
{"articles":[{"title":"...","url":"https://...","source":"...","summary":"...","content":"...","category":"TOPIC","readTime":5}]}`;
  }

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

  let cleanedText = fullText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/【[^】]*】/g, '')
    .trim();

  let data: { articles: Array<{
    title: string;
    summary: string;
    content: string;
    category: string;
    source: string;
    readTime: number;
    url: string;
  }> };

  try {
    data = JSON.parse(cleanedText);
  } catch (_e) {
    console.log('[Articles] Direct parse failed, trying regex extraction');
    const jsonMatch = cleanedText.match(/\{[\s\S]*"articles"\s*:\s*\[[\s\S]*\]\s*\}/);
    if (!jsonMatch) {
      console.log('[Articles] No JSON found in response, cleaned text:', cleanedText.slice(0, 1000));
      throw new Error('No valid JSON found in OpenAI response');
    }
    try {
      data = JSON.parse(jsonMatch[0]);
    } catch (e2) {
      console.log('[Articles] JSON parse error:', e2, 'matched:', jsonMatch[0].slice(0, 500));
      throw new Error('Failed to parse article JSON');
    }
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
    .filter(a => {
      if (!a.title || !a.url || !a.url.startsWith('http')) return false;
      // Enforce domain restriction: reject articles not from the user's sources
      if (allowedDomains.length > 0) {
        try {
          const articleHost = new URL(a.url).hostname.replace(/^www\./, '');
          const allowed = allowedDomains.some(d => articleHost === d || articleHost.endsWith(`.${d}`));
          if (!allowed) {
            console.log('[Articles] Filtered out off-domain article:', articleHost, a.url);
          }
          return allowed;
        } catch {
          return false;
        }
      }
      return true;
    })
    .map((a, i) => ({
      id: `article-${today}-${i}`,
      title: a.title,
      summary: a.summary || '',
      content: a.content || a.summary || '',
      category: (a.category || topicSlots[i] || interests[i % interests.length] || 'NEWS').toUpperCase(),
      source: a.source || 'Web',
      readTime: a.readTime || 5,
      publishedAt: 'Today',
      imageUrl: unsplashImages[i % unsplashImages.length],
      url: a.url,
      isRead: false,
      feedback: null,
      isSaved: false,
    }));

  console.log('[Articles] Parsed', articles.length, 'articles with real URLs, requested', count);
  articles.forEach(a => console.log('[Articles]  -', a.source, ':', a.category, ':', a.url));
  return articles;
}

export async function fetchDailyArticles(interests: string[], count: number, resources?: NewsResource[], preferences?: UserPreferences): Promise<Article[]> {
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

  console.log('[Articles] Fetching new articles for interests:', interests, 'count:', count, 'resources:', resources?.length ?? 0);

  let articles: Article[] = [];
  try {
    articles = await searchArticlesWithOpenAI(interests, count, resources, preferences);
  } catch (error) {
    console.log('[Articles] OpenAI fetch failed, using fallback:', error);
  }

  // Only use generic fallback when no user resources are set — never mix fallback with user sources
  if (articles.length < count && (!resources || resources.length === 0)) {
    console.log('[Articles] Got', articles.length, 'articles but need', count, '- generating fallback articles');
    const existingIds = new Set(articles.map(a => a.id));
    const fallback = generateFallbackArticles(interests, count - articles.length, articles.length);
    for (const fb of fallback) {
      if (!existingIds.has(fb.id)) {
        articles.push(fb);
      }
    }
    console.log('[Articles] Total after fallback:', articles.length);
  } else if (articles.length < count) {
    console.log('[Articles] Got', articles.length, '/', count, 'articles from user sources — no fallback applied');
  }

  if (articles.length > 0) {
    await AsyncStorage.setItem(DAILY_ARTICLES_KEY, JSON.stringify(articles));
    await AsyncStorage.setItem(DAILY_DATE_KEY, today);
    console.log('[Articles] Cached', articles.length, 'articles for', today);
  }

  return articles;
}

export async function fetchAdditionalArticles(interests: string[], additionalCount: number, existingArticles: Article[], resources?: NewsResource[], preferences?: UserPreferences): Promise<Article[]> {
  console.log('[Articles] Fetching', additionalCount, 'additional articles for upgrade');
  try {
    const newArticles = await searchArticlesWithOpenAI(interests, additionalCount, resources, preferences);
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

function generateFallbackArticles(interests: string[], count: number, startIndex: number): Article[] {
  const today = getTodayDateString();
  const sources = ['BBC News', 'Reuters', 'The Guardian', 'AP News', 'NPR', 'The Verge', 'TechCrunch', 'Ars Technica'];
  const unsplashImages = [
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop',
  ];
  const titleTemplates = [
    'Breaking Trends in {topic}',
    'How {topic} Is Reshaping the Industry in 2026',
    'The Future of {topic}: What Professionals Need to Know',
    'Deep Dive: {topic} Developments This Week',
    '{topic} Strategies That Top Performers Use',
  ];
  const summaryTemplates = [
    'The latest developments and emerging patterns in {topic} that professionals need to understand to stay competitive.',
    'A deep dive into the latest {topic} developments transforming professional workflows and industry standards.',
    'Expert analysis on how {topic} trends are creating new opportunities for forward-thinking professionals.',
    'Comprehensive overview of {topic} innovations that are redefining best practices across industries.',
    'Key insights from industry leaders on leveraging {topic} for maximum professional impact.',
  ];

  const articles: Article[] = [];
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    const interest = interests[idx % interests.length];
    articles.push({
      id: `article-${today}-${idx}`,
      title: titleTemplates[idx % titleTemplates.length].replace('{topic}', interest),
      summary: summaryTemplates[idx % summaryTemplates.length].replace('{topic}', interest),
      content: `The landscape of ${interest} is undergoing a profound transformation that few could have predicted even a year ago. Industry leaders and analysts are pointing to a convergence of technological advances, shifting consumer expectations, and regulatory changes that together are reshaping how professionals approach ${interest}.\n\nAt the heart of this shift is a growing recognition that traditional methods are no longer sufficient. Companies that once dominated the ${interest} space are being forced to rethink their strategies from the ground up, while nimble startups are seizing the opportunity to introduce innovative approaches.\n\nExperts emphasize that the pace of change shows no signs of slowing. What we're seeing is not just incremental improvement — it's a fundamental rethinking of how ${interest} fits into the broader ecosystem.\n\nFor professionals looking to stay ahead, the message is clear: continuous learning and adaptability are no longer optional.`,
      category: interest.toUpperCase(),
      source: sources[idx % sources.length],
      readTime: Math.floor(Math.random() * 8) + 3,
      publishedAt: 'Today',
      imageUrl: unsplashImages[idx % unsplashImages.length],
      url: '#',
      isRead: false,
      feedback: null,
      isSaved: false,
    });
  }
  return articles;
}

export async function clearArticleCache(): Promise<void> {
  await AsyncStorage.removeItem(DAILY_ARTICLES_KEY);
  await AsyncStorage.removeItem(DAILY_DATE_KEY);
  console.log('[Articles] Cache cleared');
}
