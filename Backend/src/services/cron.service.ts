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

    // Every 6 hours: '0 */6 * * *'
    cron.schedule('0 */6 * * *', async () => {
      logger.info('Running scheduled news refresh...');
      try {
        await pipelineService.run();
      } catch (error) {
        logger.error('Cron Pipeline Error:', error);
      }
    });

    logger.info('Cron jobs scheduled: News refresh every 6 hours.');
  }
};
