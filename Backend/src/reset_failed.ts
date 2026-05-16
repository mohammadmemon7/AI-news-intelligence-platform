
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { Article } from './modules/articles/article.model';
import { pipelineService } from './modules/pipeline/pipeline.service';

dotenv.config({ path: path.join(__dirname, '../.env') });

const resetAndRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    // Reset ai_processed for articles that failed
    const result = await Article.updateMany(
      { ai_failed: true },
      { 
        ai_processed: false, 
        ai_failed: false, 
        ai_error_message: null 
      }
    );

    console.log(`Reset ${result.modifiedCount} failed articles. Starting re-processing...`);

    // Run the pipeline enrichment for just the unprocessed ones
    await pipelineService.processAllUnprocessed();

    console.log('Re-processing complete.');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

resetAndRetry();
