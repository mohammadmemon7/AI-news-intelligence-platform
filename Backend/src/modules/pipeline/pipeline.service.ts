import axios from 'axios';
import crypto from 'crypto';
import { env } from '../../config/env';
import { Article } from '../articles/article.model';
import { aiService } from '../../services/ai.service';
import { logger } from '../../utils/logger';

let isRunning = false;
let lastRun: Date | null = null;
let processedCount = 0;

export const pipelineService = {
  run: async () => {
    if (isRunning) {
        logger.warn('Pipeline is already running.');
        return { message: 'Already running' };
    }

    isRunning = true;
    lastRun = new Date();
    processedCount = 0;
    
    logger.info('Starting news intelligence pipeline...');
    
    let articlesFetched = 0;
    let nextPage: string | null = null;
    const targetCount = 200; 
    
    try {
      do {
        // 1. Fetch from NewsData.io
        logger.info(`Using News API key: ${env!.NEWS_API_KEY.slice(0, 8)}...`);
        const apiResponse: any = await axios.get('https://newsdata.io/api/1/news', {
          params: {
            apikey: env!.NEWS_API_KEY,
            language: 'en',
            page: nextPage,
          }
        });

        const { results, nextPage: nextCursor } = apiResponse.data;
        nextPage = nextCursor;

        if (!results || results.length === 0) break;

        for (const rawArticle of results) {
          if (!rawArticle.title || (!rawArticle.content && !rawArticle.description)) continue;

          // Fix 3: Add language filter — keep only English articles
          if (rawArticle.language && rawArticle.language !== 'english') {
            continue; 
          }

          const title = rawArticle.title.trim();
          const pubDate = rawArticle.pubDate || new Date().toISOString();
          
          const dedup_hash = crypto
            .createHash('md5')
            .update(`${title}|${pubDate}`)
            .digest('hex');

          const existing = await Article.findOne({ dedup_hash });
          if (existing) continue;

          const cleanText = (text: string) => text.replace(/<[^>]*>?/gm, '').trim();
          
          const description = rawArticle.description ? cleanText(rawArticle.description) : '';
          const content = rawArticle.content ? cleanText(rawArticle.content) : description;

          await Article.create({
            title,
            description,
            content,
            source_url: rawArticle.link,
            source_name: rawArticle.source_id,
            published_at: new Date(pubDate),
            category: rawArticle.category || [],
            country: rawArticle.country || [],
            language: rawArticle.language || 'english',
            dedup_hash,
            ai_processed: false,
          });

          articlesFetched++;
        }

        if (nextPage) await new Promise(resolve => setTimeout(resolve, 1000));

      } while (nextPage && articlesFetched < targetCount);

      logger.info(`Fetched and stored ${articlesFetched} new articles. Starting AI processing...`);

      // 5. AI Processing
      await pipelineService.processAllUnprocessed();

      logger.info('Pipeline completed successfully.');
      return { articlesFetched };
      
    } catch (error) {
      logger.error('Pipeline Error:', error instanceof Error ? error.message : error);
      throw error;
    } finally {
        isRunning = false;
    }
  },

  processAllUnprocessed: async () => {
    // Fix 2: Batch Processing (Batch of 5 with 500ms delay between batches)
    const batchSize = 5;
    const delayBetweenBatches = 500;

    // Fix: Only query for articles that are NOT processed and haven't FAILED yet in this run.
    // However, to be robust, we mark them as processed even on failure so we don't loop forever.
    let unprocessed = await Article.find({ ai_processed: false }).limit(batchSize);

    while (unprocessed.length > 0) {
      logger.info(`Processing batch of ${unprocessed.length} articles with AI...`);

      for (const article of unprocessed) {
        await pipelineService.enrichArticle(article);
        processedCount++;
      }

      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      unprocessed = await Article.find({ ai_processed: false }).limit(batchSize);
    }
  },

  enrichArticle: async (article: any) => {
    logger.info(`Enriching article ${article._id} with AI...`);
    
    let success = false;
    let attempts = 0;
    
    while (!success && attempts < 2) {
        try {
          const textToAnalyze = `${article.title}\n\n${article.description || article.content}`;
          const analysis = await aiService.processArticle(textToAnalyze);
          
          article.ai_summary = analysis.summary;
          article.ai_sentiment = analysis.sentiment;
          article.ai_impact_score = analysis.impact_score;
          article.ai_insights = analysis.insights;
          article.ai_processed = true;
          article.ai_failed = false;
          success = true;
        } catch (err: any) {
          attempts++;
          if (err.message === 'RATE_LIMIT') {
            logger.warn('Groq Rate Limit hit. Waiting 5 seconds before retry...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue; 
          }

          logger.error(`AI Enrichment Failed for article ${article._id}:`, err);
          article.ai_failed = true;
          article.ai_processed = true; // Mark as processed so we don't keep retrying in the loop
          success = true; 
        }
    }
    await article.save();
    return article;
  },

  processSingleArticle: async (id: string) => {
    const article = await Article.findById(id);
    if (!article) throw new Error('Article not found');
    
    // For single processing, we ALWAYS try again even if it failed before
    article.ai_failed = false;
    article.ai_processed = false;
    
    return await pipelineService.enrichArticle(article);
  },

  getStatus: () => ({
    isRunning,
    lastRun,
    processedCount
  })
};
