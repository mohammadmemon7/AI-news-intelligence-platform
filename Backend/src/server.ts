import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { cronService } from './services/cron.service';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Start Cron Jobs (optional, disabled by default)
    cronService.init(false);

    // 3. Start Listening
    app.listen(env!.PORT, () => {
      logger.info(`🚀 Server running in ${env!.NODE_ENV} mode on port ${env!.PORT}`);
      logger.info(`Health check: http://localhost:${env!.PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
