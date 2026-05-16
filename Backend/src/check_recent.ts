
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { Article } from './modules/articles/article.model';

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkRecent = async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  const recent = await Article.find().sort({ published_at: -1 }).limit(5);
  console.log('Most Recent Articles:');
  recent.forEach(a => {
    console.log(`- [${a.published_at.toISOString()}] ${a.title}`);
  });
  await mongoose.disconnect();
};

checkRecent();
