import cron from 'node-cron';
import { pipelineService } from '../modules/pipeline/pipeline.service';
import { logger } from '../utils/logger';

/**
 * Optional cron job to refresh articles every 6 hours as per PRD section 4.1.
 * Set enabled: true to activate.
 */
export const cronService = {
  init: (enabled: boolean = false) => {
    if (!enabled) {
      logger.info('Cron jobs are disabled.');
      return;
    }

    // Every 1 hour: '0 * * * *'
    cron.schedule('0 * * * *', async () => {
      logger.info('Running scheduled news refresh...');
      try {
        await pipelineService.run();
      } catch (error) {
        logger.error('Cron Pipeline Error:', error);
      }
    });

    // Run once immediately on start (Disabled to save credits for demo)
    // logger.info('Triggering initial news refresh...');
    // pipelineService.run().catch(err => logger.error('Initial Pipeline Error:', err));

    logger.info('Cron jobs scheduled: News refresh every 1 hour.');
  }
};
