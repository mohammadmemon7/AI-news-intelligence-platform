import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://Mohammad:BRtF5YOnsjhvcDSP@cluster0.e1r9kue.mongodb.net/AI_News';

async function reset() {
  try {
    await mongoose.connect(MONGODB_URI);
    const ArticleSchema = new mongoose.Schema({}, { strict: false, collection: 'articles' });
    const Article = mongoose.model('Article', ArticleSchema);
    
    // Reset articles that are Neutral but have no content (likely failed or default)
    // Also reset articles where ai_summary is missing
    const res = await Article.updateMany(
      { 
        $or: [
          { ai_sentiment: 'Neutral', ai_summary: { $exists: false } },
          { ai_processed: false }
        ]
      }, 
      { 
        $set: { 
          ai_processed: false, 
          ai_sentiment: null, 
          ai_failed: false,
          ai_summary: null,
          ai_insights: []
        } 
      }
    );
    
    console.log(`Reset ${res.modifiedCount} articles for automatic re-processing.`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

reset();
