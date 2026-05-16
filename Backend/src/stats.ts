
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { Article } from './modules/articles/article.model';

dotenv.config({ path: path.join(__dirname, '../.env') });

const stats = async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  const total = await Article.countDocuments();
  const processed = await Article.countDocuments({ ai_processed: true });
  const failed = await Article.countDocuments({ ai_failed: true });
  console.log(`Total: ${total}`);
  console.log(`Processed: ${processed}`);
  console.log(`Failed: ${failed}`);
  await mongoose.disconnect();
};

stats();
