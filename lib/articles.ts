import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article, NewsResource, UserPreferences } from '@/types';

const DAILY_ARTICLES_KEY = 'daily_articles_cache';
const DAILY_DATE_KEY = 'daily_articles_date';
const DAILY_RESOURCES_KEY = 'daily_articles_resources_hash';
const ARTICLE_HISTORY_KEY = 'article_url_history';

// Rolling history cap — enough to cover ~30 days at 5 articles/day
const HISTORY_CAP = 200;

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// --- Article history (cross-day deduplication) ---

async function loadArticleHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ARTICLE_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function appendToArticleHistory(urls: string[]): Promise<void> {
  try {
    const existing = await loadArticleHistory();
    const combined = [...existing, ...urls.filter(u => !existing.includes(u))];
    const trimmed = combined.slice(-HISTORY_CAP);
    await AsyncStorage.setItem(ARTICLE_HISTORY_KEY, JSON.stringify(trimmed));
    console.log('[Articles] History updated — total seen URLs:', trimmed.length);
  } catch (e) {
    console.log('[Articles] Failed to update article history:', e);
  }
}

// --- Title similarity (same-story deduplication) ---

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','has','have','had',
  'it','its','this','that','these','those','as','not','what','how','why',
  'when','where','who','will','would','could','should','may','might',
]);

function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function titleSimilarity(a: string, b: string): number {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const w of ta) if (tb.has(w)) intersection++;
  return intersection / Math.max(ta.size, tb.size);
}

/** Remove articles whose titles are too similar to an already-kept article. */
function deduplicateByTitle(articles: Article[], threshold = 0.5): Article[] {
  const kept: Article[] = [];
  for (const candidate of articles) {
    const isDuplicate = kept.some(k => titleSimilarity(k.title, candidate.title) >= threshold);
    if (!isDuplicate) {
      kept.push(candidate);
    } else {
      console.log('[Articles] Dropped similar-title article:', candidate.title);
    }
  }
  return kept;
}

// --- Interest distribution ---

function buildInterestDistribution(interests: string[], count: number, preferences?: UserPreferences): string[] {
  const weights = interests.map(topic => {
    const pref = preferences?.topics[topic.toLowerCase()];
    if (!pref) return 1;
    return Math.max(1, pref.up - pref.down + 1);
  });
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  const slots: string[] = [];
  const allocations = weights.map((w, i) => ({
    topic: interests[i],
    count: Math.max(1, Math.round((w / totalWeight) * count)),
  }));

  let total = allocations.reduce((s, a) => s + a.count, 0);
  while (total > count) {
    const idx = allocations.reduce((minIdx, a, i) => a.count > 1 && weights[i] <= weights[minIdx] ? i : minIdx, 0);
    allocations[idx].count--;
    total--;
  }
  while (total < count) {
    const idx = allocations.reduce((maxIdx, _a, i) => weights[i] > weights[maxIdx] ? i : maxIdx, 0);
    allocations[idx].count++;
    total++;
  }

  for (const { topic, count: n } of allocations) {
    for (let i = 0; i < n; i++) slots.push(topic);
  }

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

// --- OpenAI fetch ---

async function searchArticlesWithOpenAI(
  interests: string[],
  count: number,
  resources?: NewsResource[],
  preferences?: UserPreferences,
  seenUrls: string[] = [],
): Promise<Article[]> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  if (!resources || resources.length === 0) {
    console.log('[Articles] No user sources configured — returning empty');
    return [];
  }

  const today = getTodayDateString();
  const topicSlots = buildInterestDistribution(interests, count, preferences);
  const prefSummary = buildPreferenceSummary(interests, preferences);

  const allowedDomains = resources.map(r => {
    try {
      const url = r.url.startsWith('http') ? r.url : `https://${r.url}`;
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return r.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    }
  });

  const domainList = allowedDomains.join(', ');
  const interestList = interests.join(', ');

  const seenBlock = seenUrls.length > 0
    ? `\nPREVIOUSLY SHOWN — do NOT return any article at these URLs, or any article covering the same story:\n${seenUrls.map(u => `- ${u}`).join('\n')}\n`
    : '';

  const prompt = `You are a senior news editor curating a personalised daily briefing. Find EXACTLY ${count} high-quality, recent articles from specific websites.

ALLOWED SOURCES (domains): ${domainList}
USER'S TOPICS OF INTEREST: ${interestList}
${prefSummary ? `\n${prefSummary}\n` : ''}${seenBlock}
QUALITY STANDARDS:
- Only return articles published within the last 7 days. Prefer today or yesterday.
- Prioritise original reporting, in-depth analysis, and exclusive insights over wire re-runs or press release rewrites.
- Prefer articles with substance: data, expert quotes, original research, or investigative work.
- Skip opinion pieces unless they are from a named expert with clear credentials.

DIVERSITY RULES — strictly enforced:
- Every article MUST cover a distinctly different subject, angle, or story. No two articles can be about the same event or topic.
- Do NOT return articles with similar titles or that cover the same news story from different angles.
- Spread across as many different topics and domains as possible.
- If a topic has no new qualifying articles, pick a different topic rather than padding with low-quality or repetitive content.

INSTRUCTIONS:
1. Search each allowed domain for recent articles matching the user's interests.
2. ONLY return articles that actually exist on the allowed domains. Do NOT use any other websites.
3. You MUST return EXACTLY ${count} articles.
4. Every article URL MUST start with https:// and belong to one of: ${domainList}
5. NEVER fabricate URLs. Only return articles you found via web search.
6. NEVER return a URL from any domain not listed above.
7. NEVER return any article from the "PREVIOUSLY SHOWN" list above.

For each article provide:
- title: the exact article title as it appears on the site
- url: the full URL (MUST be on one of: ${domainList})
- source: the site name
- summary: 1-2 sentence summary
- content: the complete full-length article text — reproduce as much of the original article as possible, including all sections, key quotes, statistics, data points, context, and analysis. Aim for 12-20+ paragraphs. Use double line breaks between paragraphs.
- category: the topic in UPPERCASE
- readTime: estimated reading time in minutes (3-15)

Respond with ONLY valid JSON, no markdown:
{"articles":[{"title":"...","url":"https://...","source":"...","summary":"...","content":"...","category":"TOPIC","readTime":5}]}`;

  console.log('[Articles] Calling OpenAI (gpt-4o) with', seenUrls.length, 'excluded URLs...');

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        input: prompt,
      }),
    });
  } catch (networkError) {
    console.log('[Articles] Network error calling OpenAI:', networkError);
    throw new Error('Network error: Unable to reach OpenAI. Please check your internet connection.');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown');
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
  } catch {
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

  const seenUrlSet = new Set(seenUrls);

  const articles: Article[] = data.articles
    .filter(a => {
      if (!a.title || !a.url || !a.url.startsWith('http')) return false;
      // Reject previously seen URLs
      if (seenUrlSet.has(a.url)) {
        console.log('[Articles] Filtered out previously seen:', a.url);
        return false;
      }
      // Enforce domain restriction
      if (allowedDomains.length > 0) {
        try {
          const articleHost = new URL(a.url).hostname.replace(/^www\./, '');
          const allowed = allowedDomains.some(d => articleHost === d || articleHost.endsWith(`.${d}`));
          if (!allowed) console.log('[Articles] Filtered out off-domain article:', articleHost, a.url);
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

  console.log('[Articles] Parsed', articles.length, 'articles, requested', count);
  articles.forEach(a => console.log('[Articles]  -', a.source, ':', a.category, ':', a.url));
  return articles;
}

// --- Domain helpers ---

function getResourcesHash(resources?: NewsResource[]): string {
  if (!resources || resources.length === 0) return 'none';
  return resources.map(r => r.url).sort().join('|');
}

function getAllowedDomains(resources?: NewsResource[]): string[] {
  if (!resources || resources.length === 0) return [];
  return resources.map(r => {
    try {
      const url = r.url.startsWith('http') ? r.url : `https://${r.url}`;
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return r.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    }
  });
}

function filterArticlesByDomain(articles: Article[], resources?: NewsResource[]): Article[] {
  const domains = getAllowedDomains(resources);
  if (domains.length === 0) return [];
  return articles.filter(a => {
    if (!a.url || !a.url.startsWith('http')) return false;
    try {
      const articleHost = new URL(a.url).hostname.replace(/^www\./, '');
      const allowed = domains.some(d => articleHost === d || articleHost.endsWith(`.${d}`));
      if (!allowed) console.log('[Articles] Domain filter removed:', articleHost, a.url);
      return allowed;
    } catch {
      return false;
    }
  });
}

// --- Public API ---

export async function fetchDailyArticles(
  interests: string[],
  count: number,
  resources?: NewsResource[],
  preferences?: UserPreferences,
): Promise<Article[]> {
  const today = getTodayDateString();
  const currentHash = getResourcesHash(resources);

  // Return today's cache if still valid
  try {
    const cachedDate = await AsyncStorage.getItem(DAILY_DATE_KEY);
    const cachedArticles = await AsyncStorage.getItem(DAILY_ARTICLES_KEY);
    const cachedHash = await AsyncStorage.getItem(DAILY_RESOURCES_KEY);

    if (cachedDate === today && cachedArticles && cachedHash === currentHash) {
      const parsed = JSON.parse(cachedArticles) as Article[];
      const validArticles = filterArticlesByDomain(parsed, resources);
      if (validArticles.length >= count) {
        console.log('[Articles] Returning cached articles for', today, '— count:', validArticles.length);
        return validArticles.slice(0, count);
      }
      console.log('[Articles] Cache has', validArticles.length, 'valid articles but need', count, '— re-fetching');
    } else if (cachedDate === today && cachedHash !== currentHash) {
      console.log('[Articles] Sources changed since last fetch — invalidating cache');
    }
  } catch (e) {
    console.log('[Articles] Cache read error:', e);
  }

  // Load cross-day history for deduplication
  const seenUrls = await loadArticleHistory();
  console.log('[Articles] Loaded', seenUrls.length, 'previously seen URLs to exclude');

  console.log('[Articles] Fetching new articles — interests:', interests, 'count:', count, 'sources:', resources?.length ?? 0);

  let articles: Article[] = [];
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const needed = count - articles.length;
    if (needed <= 0) break;

    console.log('[Articles] Attempt', attempt, '/', MAX_RETRIES, '— need', needed, 'more articles');
    try {
      // Exclude both history and URLs already collected this run
      const excludeUrls = [...seenUrls, ...articles.map(a => a.url)];
      const fetched = await searchArticlesWithOpenAI(interests, needed, resources, preferences, excludeUrls);

      // Deduplicate by URL against what we already have
      const existingUrls = new Set(articles.map(a => a.url));
      const dedupedByUrl = fetched.filter(a => !existingUrls.has(a.url));

      // Deduplicate by title similarity across everything collected so far
      const dedupedByTitle = deduplicateByTitle([...articles, ...dedupedByUrl]).slice(articles.length);

      const reindexed = dedupedByTitle.map((a, i) => ({
        ...a,
        id: `article-${today}-${articles.length + i}`,
      }));

      articles = [...articles, ...reindexed];
      console.log('[Articles] After attempt', attempt, '— total:', articles.length, '/', count);

      if (articles.length >= count) break;
    } catch (error) {
      console.log('[Articles] Attempt', attempt, 'failed:', error);
      if (attempt === MAX_RETRIES && articles.length === 0) {
        console.log('[Articles] All attempts exhausted with no articles');
      }
    }
  }

  articles = articles.slice(0, count);
  articles = filterArticlesByDomain(articles, resources);
  articles = articles.slice(0, count);
  console.log('[Articles] After domain filter:', articles.length, 'articles');

  if (articles.length > 0) {
    // Persist to cache
    await AsyncStorage.setItem(DAILY_ARTICLES_KEY, JSON.stringify(articles));
    await AsyncStorage.setItem(DAILY_DATE_KEY, today);
    await AsyncStorage.setItem(DAILY_RESOURCES_KEY, currentHash);
    console.log('[Articles] Cached', articles.length, 'articles for', today);

    // Append to cross-day history
    await appendToArticleHistory(articles.map(a => a.url));
  }

  return articles;
}

export async function fetchAdditionalArticles(
  interests: string[],
  additionalCount: number,
  existingArticles: Article[],
  resources?: NewsResource[],
  preferences?: UserPreferences,
): Promise<Article[]> {
  console.log('[Articles] Fetching', additionalCount, 'additional articles for upgrade');
  try {
    const seenUrls = await loadArticleHistory();
    const excludeUrls = [...seenUrls, ...existingArticles.map(a => a.url)];

    const newArticles = await searchArticlesWithOpenAI(interests, additionalCount, resources, preferences, excludeUrls);
    const today = getTodayDateString();

    // Deduplicate against existing by title too
    const dedupedByTitle = deduplicateByTitle([...existingArticles, ...newArticles]).slice(existingArticles.length);

    const reindexed = dedupedByTitle.map((a, i) => ({
      ...a,
      id: `article-${today}-extra-${i}`,
    }));

    const combined = [...existingArticles, ...reindexed];
    await AsyncStorage.setItem(DAILY_ARTICLES_KEY, JSON.stringify(combined));
    await AsyncStorage.setItem(DAILY_DATE_KEY, today);
    await appendToArticleHistory(reindexed.map(a => a.url));
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
  await AsyncStorage.removeItem(DAILY_RESOURCES_KEY);
  console.log('[Articles] Cache cleared');
}
