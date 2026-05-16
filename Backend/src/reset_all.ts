import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://Mohammad:BRtF5YOnsjhvcDSP@cluster0.e1r9kue.mongodb.net/AI_News';

async function resetAll() {
  try {
    await mongoose.connect(MONGODB_URI);
    const ArticleSchema = new mongoose.Schema({}, { strict: false, collection: 'articles' });
    const Article = mongoose.model('Article', ArticleSchema);
    
    const res = await Article.updateMany(
      {}, 
      { 
        $set: { 
          ai_processed: false, 
          ai_sentiment: null, 
          ai_summary: null,
          ai_insights: [], 
          ai_failed: false,
          ai_impact_score: null,
          ai_error_message: null
        } 
      }
    );
    
    console.log(`Successfully reset all ${res.modifiedCount} articles for fresh AI analysis.`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

resetAll();
