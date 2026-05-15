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

export const pipelineService = {
  run: async () => {
    if (isRunning) {
        logger.warn('Pipeline is already running.');
        // If it's been running for more than 10 minutes, something might be wrong.
        // We'll allow a reset if it's clearly stuck, but for now we just return.
        return { message: 'Already running', isRunning, processedCount };
    }

    isRunning = true;
    lastRun = new Date();
    processedCount = 0;
    
    logger.info('Starting news intelligence pipeline...');
    
    let articlesFetched = 0;
    let nextPage: string | null = null;
    const targetCount = 100; // Reduced from 200 for faster cycles
    
    try {
      // 1. Fetching Phase
      do {
        logger.info(`Fetching articles... (Current count: ${articlesFetched})`);
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

          if (rawArticle.language && rawArticle.language !== 'english') continue; 

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

      // 2. Processing Phase
      logger.info(`Fetched ${articlesFetched} articles. Starting enrichment...`);
      await pipelineService.processAllUnprocessed();

      logger.info('Pipeline execution finished.');
      return { articlesFetched, processedCount };
      
    } catch (error) {
      logger.error('Pipeline Error:', error instanceof Error ? error.message : error);
      // We don't throw here to ensure isRunning = false is reached in finally
    } finally {
        isRunning = false;
    }
  },

  processAllUnprocessed: async () => {
    const batchSize = 10; // Increased batch size
    const delayBetweenBatches = 1000;

    // Find all that need processing
    const allUnprocessed = await Article.find({ ai_processed: false }).select('_id');
    totalToProcess = allUnprocessed.length;
    
    logger.info(`Found ${totalToProcess} articles requiring AI analysis.`);

    let unprocessed = await Article.find({ ai_processed: false }).limit(batchSize);

    while (unprocessed.length > 0) {
      logger.info(`Processing batch of ${unprocessed.length} articles... (${processedCount}/${totalToProcess})`);

      // Process in parallel within the batch to speed up, but still manageable
      await Promise.all(unprocessed.map(article => pipelineService.enrichArticle(article)));
      
      processedCount += unprocessed.length;

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      
      unprocessed = await Article.find({ ai_processed: false }).limit(batchSize);
    }
  },

  enrichArticle: async (article: any) => {
    try {
      const textToAnalyze = `${article.title}\n\n${article.description || article.content || ''}`;
      // Basic validation: if text is too short, mark as failed immediately
      if (textToAnalyze.trim().length < 50) {
          article.ai_processed = true;
          article.ai_failed = true;
          await article.save();
          return;
      }

      const analysis = await aiService.processArticle(textToAnalyze);
      
      article.ai_summary = analysis.summary;
      article.ai_sentiment = analysis.sentiment;
      article.ai_impact_score = analysis.impact_score;
      article.ai_insights = analysis.insights;
      article.ai_processed = true;
      article.ai_failed = false;
      article.ai_error_message = undefined;
    } catch (err: any) {
      logger.error(`Enrichment failed for ${article._id}:`, err.message);
      article.ai_failed = true;
      article.ai_processed = true; 
      article.ai_error_message = err.message;
    }
    await article.save();
  },

  processSingleArticle: async (id: string) => {
    const article = await Article.findById(id);
    if (!article) throw new Error('Article not found');
    
    article.ai_failed = false;
    article.ai_processed = false;
    
    await pipelineService.enrichArticle(article);
    return await Article.findById(id); // Reload to get updated fields
  },

  getStatus: () => ({
    isRunning,
    lastRun,
    processedCount,
    totalToProcess
  })
};
