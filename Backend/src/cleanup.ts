import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://Mohammad:BRtF5YOnsjhvcDSP@cluster0.e1r9kue.mongodb.net/AI_News';

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const ArticleSchema = new mongoose.Schema({}, { strict: false, collection: 'articles' });
    const Article = mongoose.model('Article', ArticleSchema);

    const total = await Article.countDocuments();
    const keep = 120;
    const toDeleteCount = total - keep;

    if (toDeleteCount > 0) {
      const toDelete = await Article.find().sort({ published_at: 1 }).limit(toDeleteCount);
      const ids = toDelete.map(a => a._id);
      await Article.deleteMany({ _id: { $in: ids } });
      console.log(`Successfully deleted ${toDeleteCount} old articles. Remaining: ${await Article.countDocuments()}`);
    } else {
      console.log(`Current count is ${total}. No deletion needed.`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
