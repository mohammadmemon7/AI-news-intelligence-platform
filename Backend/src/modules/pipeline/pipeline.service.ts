import axios from 'axios';
import crypto from 'crypto';
import { env } from '../../config/env';
import { Article } from '../articles/article.model';
import { aiService } from '../../services/ai.service';
import { logger } from '../../utils/logger';

let isRunning = false;
let lastRun: Date | null = null;
let processedCount = 0;
let totalToProcess = 0;
let lastRunStatus: {
    success: boolean;
    error?: string;
    articlesFetched: number;
    rateLimited: boolean;
} | null = null;

export const pipelineService = {
  run: async () => {
    if (isRunning) {
      logger.info('Pipeline is already running. Skipping request.');
      return { message: 'Already running' };
    }

    isRunning = true;
    logger.info('Starting news intelligence pipeline...');
    lastRun = new Date();
    processedCount = 0; // Reset count for new run
    lastRunStatus = {
        success: false,
        articlesFetched: 0,
        rateLimited: false
    };

    // --- Demo Cleanup Logic: Maintain exactly 100 articles before starting ---
    try {
      const totalCount = await Article.countDocuments();
      if (totalCount > 100) {
        const toDeleteCount = totalCount - 100;
        const oldArticles = await Article.find()
          .sort({ published_at: 1 })
          .limit(toDeleteCount)
          .select('_id');
        const ids = oldArticles.map(a => a._id);
        await Article.deleteMany({ _id: { $in: ids } });
        logger.info(`[Cleanup] Proactively removed ${ids.length} old articles to maintain 100-article baseline.`);
      }
    } catch (cleanupErr) {
      logger.error('[Cleanup] Error during baseline cleanup:', cleanupErr);
    }
    
    let articlesFetched = 0;
    let nextPage: string | null = null;
    const targetCount = 10; 
    
    try {
      let pagesFetched = 0;
      const maxPages = 3;

      // --- Optimization for Demo: Check if we have unprocessed articles from a previous crash/stop ---
      const pendingCount = await Article.countDocuments({ ai_processed: false });
      if (pendingCount > 0) {
        logger.info(`Found ${pendingCount} pending articles. Processing them first...`);
        await pipelineService.processAllUnprocessed();
      }
      // ------------------------------------------------------------------------------------------

      do {
        pagesFetched++;
        try {
          const queries = [
            'breaking news', 'world news', 'latest updates', 'global trends', 'headlines',
            'innovation', 'market update', 'climate change', 'space exploration', 'artificial intelligence',
            'cryptocurrency', 'sports highlights', 'entertainment', 'travel deals', 'health research'
          ];
          const randomQuery = queries[Math.floor(Math.random() * queries.length)];
          const categories = ['top', 'technology', 'business', 'science', 'health', 'entertainment', 'environment', 'food', 'politics', 'sports'];
          const randomCategory = categories[Math.floor(Math.random() * categories.length)];
          logger.info(`Fetching NewsData for Query: "${randomQuery}", Category: "${randomCategory}"...`);
          
          const response: any = await axios.get('https://newsdata.io/api/1/news', {
            params: {
              apikey: env.NEWS_API_KEY,
              language: 'en',
              category: randomCategory,
              page: nextPage,
            },
            timeout: 20000
          });

          const { results, nextPage: next }: { results: any[], nextPage: string | null } = response.data;
          nextPage = next;

          if (!results || results.length === 0) {
              logger.info(`NewsData returned 0 results for ${randomCategory}. Checking RSS fallback...`);
              const rssCount = await pipelineService.fetchFromRSS();
              articlesFetched += rssCount;
              nextPage = null; 
              break;
          }

          logger.info(`NewsData returned ${results.length} results.`);
          let newInThisPage = 0;
          for (const rawArticle of results) {
            if (!rawArticle.title || (!rawArticle.content && !rawArticle.description)) continue;
            
            const title = rawArticle.title.trim();
            // Use current date if pubDate is missing to ensure it shows up at top
            const pubDate = rawArticle.pubDate || new Date().toISOString();
            const dedup_hash = crypto.createHash('md5').update(`${title}`).digest('hex'); // Hash just the title to be more aggressive with deduplication
            
            const existing = await Article.findOne({ dedup_hash });
            if (existing) continue;

            const cleanText = (text: string) => text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
            const description = rawArticle.description ? cleanText(rawArticle.description) : '';
            const content = rawArticle.content ? cleanText(rawArticle.content) : description;

            // Skip if content is paywalled or empty
            if (content.toLowerCase().includes('only available in paid plans') || content.length < 30) {
              continue;
            }

            try {
              const newArticle = await Article.create({
                title,
                description,
                content,
                source_url: rawArticle.link,
                source_name: rawArticle.source_id || 'NewsData',
                published_at: new Date(pubDate),
                category: rawArticle.category || [],
                country: rawArticle.country || [],
                language: rawArticle.language || 'english',
                dedup_hash,
                ai_processed: false,
              });
              articlesFetched++;
              newInThisPage++;

              // Delay enrichment slightly to avoid hitting Groq rate limits during burst
              setTimeout(() => {
                pipelineService.enrichArticle(newArticle).catch(err => {
                  logger.error(`Live enrichment failed for ${newArticle._id}: ${err.message}`);
                });
              }, newInThisPage * 2000); // 2s stagger between articles

            } catch (createErr: any) {
              if (createErr.code !== 11000) throw createErr;
            }
          }
          logger.info(`Added ${newInThisPage} new articles from this page.`);

          if (nextPage) {
            logger.info('Waiting 1s before next NewsData page...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (fetchErr: any) {
          if (fetchErr.response?.status === 429) {
            logger.warn('NewsData API Rate Limit hit. Switching to RSS fallback...');
            if (lastRunStatus) lastRunStatus.rateLimited = true;
            
            const rssCount = await pipelineService.fetchFromRSS();
            articlesFetched += rssCount;
            logger.info(`RSS Fallback fetched ${rssCount} articles.`);
            
            nextPage = null; 
            break; 
          }
          throw fetchErr; 
        }
      } while (nextPage && articlesFetched < targetCount && pagesFetched < maxPages);

      // If we still have 0 new articles after trying NewsData, force an RSS fetch
      if (articlesFetched === 0) {
        logger.info('No new articles from NewsData. Forcing RSS fallback...');
        const rssCount = await pipelineService.fetchFromRSS();
        articlesFetched += rssCount;
      }

      // Even if fetch failed partially, process what we have
      await pipelineService.processAllUnprocessed();

      logger.info('Pipeline completed.');
      if (lastRunStatus) {
          lastRunStatus.success = true;
          lastRunStatus.articlesFetched = articlesFetched;
      }
      return { articlesFetched };
      
    } catch (error) {
      logger.error('Pipeline Error:', error instanceof Error ? error.message : error);
      if (lastRunStatus) {
          lastRunStatus.success = false;
          lastRunStatus.error = error instanceof Error ? error.message : 'Unknown error';
      }
      // Still try to process existing articles even on critical fetch error
      try {
        await pipelineService.processAllUnprocessed();
      } catch (procErr) {
        logger.error('Background processing error:', procErr);
      }
      throw error;
    } finally {
        isRunning = false;
    }
  },

  fetchFromRSS: async () => {
    // Aggressive trending queries for demo
    const queries = ['breaking news', 'world events', 'technology', 'finance', 'climate', 'politics'];
    const randomQ = queries[Math.floor(Math.random() * queries.length)];
    // Add current seconds to the query to force UNIQUE results every time for the video demo
    const salt = `${new Date().getMinutes()}${new Date().getSeconds()}`;
    
    const rssFeeds = [
      `https://news.google.com/rss/search?q=${randomQ}+${salt}+when:1h&hl=en-US&gl=US&ceid=US:en`,
      `http://feeds.bbci.co.uk/news/rss.xml?t=${Date.now()}`,
      `https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml?t=${Date.now()}`,
      `https://www.aljazeera.com/xml/rss/all.xml?t=${Date.now()}`,
      `https://www.theguardian.com/world/rss?t=${Date.now()}`,
      `http://rss.cnn.com/rss/edition.rss?t=${Date.now()}`,
      `https://www.cnbc.com/id/100003114/device/rss/rss.html?t=${Date.now()}`,
      `https://feeds.a.dj.com/rss/RSSWorldNews.xml?t=${Date.now()}`,
      `https://www.france24.com/en/rss?t=${Date.now()}`,
      `https://www.independent.co.uk/news/world/rss?t=${Date.now()}`,
      `https://www.standard.co.uk/news/world/rss?t=${Date.now()}`,
      `https://www.mirror.co.uk/news/world-news/rss.xml?t=${Date.now()}`,
      `https://www.thehindu.com/news/feeder/default.rss?t=${Date.now()}`,
      `https://timesofindia.indiatimes.com/rssfeedstopstories.cms?t=${Date.now()}`,
      `https://www.reutersagency.com/feed/?t=${Date.now()}`
    ];
    
    let rssFetched = 0;
    
    for (const url of rssFeeds) {
      try {
        logger.info(`Fetching RSS: ${url.split('?')[0]}...`);
        const response = await axios.get(url, { 
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        const xml = response.data;
        
        // Simple regex-based RSS parsing
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
        logger.info(`Found ${items.length} items in RSS.`);
        
        let newFromThisRSS = 0;
        for (const item of items.slice(0, 10)) {
          const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || 
                             item.match(/<title>([\s\S]*?)<\/title>/);
          const linkMatch = item.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/) ||
                            item.match(/<link>([\s\S]*?)<\/link>/);
          const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || 
                            item.match(/<description>([\s\S]*?)<\/description>/);
          const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

          const title = titleMatch?.[1];
          const link = linkMatch?.[1];
          const description = descMatch?.[1];
          const pubDate = pubDateMatch?.[1];

          if (!title || !link) continue;

          const clean = (text: string) => text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/<[^>]*>?/gm, '').trim();
          const cleanTitle = clean(title);
          const dedup_hash = crypto.createHash('md5').update(`${cleanTitle}`).digest('hex');
          
          const existing = await Article.findOne({ dedup_hash });
          if (existing) continue;

          // Safe Date parsing
          let validPubDate = new Date();
          if (pubDate) {
            const parsed = new Date(pubDate);
            if (!isNaN(parsed.getTime())) {
              validPubDate = parsed;
            }
          }

          try {
            const newArticle = await Article.create({
              title: cleanTitle,
              description: description ? clean(description) : '',
              content: description ? clean(description) : '',
              source_url: link,
              source_name: url.includes('google') ? 'Google News' : url.includes('bbc') ? 'BBC News' : url.includes('nytimes') ? 'NYT' : 'RSS Feed',
              published_at: validPubDate,
              category: ['RSS'],
              country: ['Global'],
              language: 'english',
              dedup_hash,
              ai_processed: false,
            });
            rssFetched++;
            newFromThisRSS++;

            // Delay enrichment slightly to avoid hitting Groq rate limits during burst
            setTimeout(() => {
              pipelineService.enrichArticle(newArticle).catch(err => {
                logger.error(`Live enrichment failed for ${newArticle._id}: ${err.message}`);
              });
            }, newFromThisRSS * 2000); // 2s stagger between articles

          } catch (createErr: any) {
            if (createErr.code !== 11000) throw createErr;
          }
        }
        if (newFromThisRSS > 0) logger.info(`Added ${newFromThisRSS} new articles from this RSS.`);
      } catch (err) {
        logger.error(`RSS Fetch failed for ${url.split('?')[0]}:`, err instanceof Error ? err.message : err);
      }
    }
    
    return rssFetched;
  },

  processAllUnprocessed: async () => {
    const batchSize = 2;
    const delayBetweenBatches = 5000;

    // Process articles that are either not processed yet OR failed but have fewer than 3 retries
    let unprocessed = await Article.find({ 
      $or: [
        { ai_processed: false },
        { ai_failed: true, ai_retry_count: { $lt: 3 } }
      ] 
    }).limit(batchSize);

    totalToProcess = await Article.countDocuments({ 
      $or: [
        { ai_processed: false },
        { ai_failed: true, ai_retry_count: { $lt: 3 } }
      ] 
    });

    while (unprocessed.length > 0) {
      logger.info(`Processing batch of ${unprocessed.length} articles... (${processedCount}/${totalToProcess})`);

      for (const article of unprocessed) {
        await pipelineService.enrichArticle(article);
        processedCount++;
        // Aggressive delay for demo: 1s between articles
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      unprocessed = await Article.find({ 
        $or: [
          { ai_processed: false },
          { ai_failed: true, ai_retry_count: { $lt: 3 } }
        ] 
      }).limit(batchSize);
    }
  },

  enrichArticle: async (article: any) => {
    logger.info(`Enriching article ${article._id}...`);
    
    try {
      const textToAnalyze = `${article.title}\n\n${article.description || article.content}`;
      const analysis = await aiService.processArticle(textToAnalyze);
      
      article.ai_summary = analysis.summary;
      article.ai_sentiment = analysis.sentiment;
      article.ai_impact_score = analysis.impact_score;
      article.ai_insights = analysis.insights;
      article.ai_processed = true;
      article.ai_failed = false;
      article.ai_error_message = null;
    } catch (err: any) {
      logger.error(`AI Enrichment Failed for ${article._id}:`, err.message);
      article.ai_processed = true; 
      article.ai_failed = true;
      article.ai_error_message = err.message || 'AI processing failed';
      article.ai_retry_count = (article.ai_retry_count || 0) + 1;
    }
    
    await Article.findOneAndUpdate(
      { _id: article._id },
      {
        $set: {
          ai_summary: article.ai_summary,
          ai_sentiment: article.ai_sentiment,
          ai_impact_score: article.ai_impact_score,
          ai_insights: article.ai_insights,
          ai_processed: article.ai_processed,
          ai_failed: article.ai_failed,
          ai_error_message: article.ai_error_message,
          ai_retry_count: article.ai_retry_count
        }
      }
    );
    return article;
  },

  processSingleArticle: async (id: string) => {
    const article = await Article.findById(id);
    if (!article) throw new Error('Article not found');
    return await pipelineService.enrichArticle(article);
  },

  getStatus: () => ({
    isRunning,
    lastRun,
    processedCount,
    totalToProcess,
    lastRunStatus
  })
};
