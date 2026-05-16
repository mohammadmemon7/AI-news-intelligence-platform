
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { Article } from './modules/articles/article.model';

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkFailedArticles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    const failedArticles = await Article.find({ ai_failed: true }).limit(5);
    console.log(`Found ${failedArticles.length} failed articles.`);

    failedArticles.forEach((art, i) => {
      console.log(`\n--- Failed Article ${i + 1} ---`);
      console.log(`ID: ${art._id}`);
      console.log(`Title: ${art.title}`);
      console.log(`Content: ${art.content?.slice(0, 100)}...`);
      console.log(`Error Message: ${art.ai_error_message}`);
    });

    const totalFailed = await Article.countDocuments({ ai_failed: true });
    const totalProcessed = await Article.countDocuments({ ai_processed: true });
    console.log(`\nStats: ${totalFailed} failed out of ${totalProcessed} processed.`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

checkFailedArticles();
