import { Article, WeeklyInsight } from '@/types';

export const generateArticlesForInterests = (interests: string[]): Article[] => {
  const sources = ['TechCrunch', 'Bloomberg', 'Wired', 'The Verge', 'Reuters', 'Harvard Business Review', 'MIT Technology Review', 'Fast Company'];
  const images = [
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop',
  ];

  const titleTemplates = [
    'Breaking Trends in {topic}',
    'How {topic} Is Reshaping the Industry',
    'The Future of {topic}: What Professionals Need to Know',
    'Deep Dive: {topic} in 2026',
    '{topic} Strategies That Top Performers Use',
  ];

  const summaryTemplates = [
    'The latest developments and emerging patterns in {topic} that professionals need to understand to stay competitive.',
    'A deep dive into the latest {topic} developments transforming professional workflows and industry standards.',
    'Expert analysis on how {topic} trends are creating new opportunities for forward-thinking professionals.',
    'Comprehensive overview of {topic} innovations that are redefining best practices across industries.',
    'Key insights from industry leaders on leveraging {topic} for maximum professional impact.',
  ];

  const timeAgoOptions = ['just now', '1 hr. ago', '2 hr. ago', '3 hr. ago', '5 hr. ago'];

  const articles: Article[] = [];
  let id = 1;

  interests.forEach((interest) => {
    const count = Math.min(3, titleTemplates.length);
    for (let i = 0; i < count; i++) {
      articles.push({
        id: `article-${id}`,
        title: titleTemplates[i].replace('{topic}', interest),
        summary: summaryTemplates[i].replace('{topic}', interest),
        category: interest.toUpperCase(),
        source: sources[id % sources.length],
        readTime: Math.floor(Math.random() * 8) + 3,
        publishedAt: timeAgoOptions[i % timeAgoOptions.length],
        imageUrl: images[id % images.length],
        url: `https://example.com/article-${id}`,
        isRead: false,
        rating: null,
        isSaved: false,
      });
      id++;
    }
  });

  return articles;
};

export const mockWeeklyInsights: WeeklyInsight[] = [
  {
    id: 'week-1',
    weekLabel: 'This Week',
    topTopics: ['Design', 'AI', 'Leadership'],
    articlesRead: 12,
    totalReadTime: 54,
    keyTakeaways: [
      'AI-driven design tools are reshaping creative workflows',
      'Remote leadership requires new communication frameworks',
      'Sustainable design practices gaining mainstream adoption',
    ],
    trendingUp: ['AI Design Tools', 'Sustainable UX', 'Voice Interfaces'],
    trendingDown: ['Traditional Wireframing', 'Flat Design'],
  },
  {
    id: 'week-2',
    weekLabel: 'Last Week',
    topTopics: ['Technology', 'Strategy', 'Innovation'],
    articlesRead: 8,
    totalReadTime: 36,
    keyTakeaways: [
      'Edge computing becoming standard for enterprise applications',
      'Cross-functional teams outperform siloed departments by 35%',
      'Privacy-first design is now a competitive advantage',
    ],
    trendingUp: ['Edge Computing', 'Privacy Design', 'No-Code Platforms'],
    trendingDown: ['Monolithic Architecture', 'Cookie-Based Tracking'],
  },
];
