import mongoose, { Schema, Document } from 'mongoose';

export interface IArticle extends Document {
  title: string;
  description?: string;
  content?: string;
  source_url?: string;
  source_name?: string;
  published_at: Date;
  category: string[];
  country: string[];
  language: string;
  dedup_hash: string;
  ai_summary?: string;
  ai_sentiment?: 'Positive' | 'Negative' | 'Neutral';
  ai_impact_score?: number;
  ai_insights: string[];
  ai_processed: boolean;
  ai_failed: boolean;
  ai_error_message?: string;
  ai_retry_count: number;
  fetched_at: Date;
}

const articleSchema = new Schema<IArticle>({
  title: { type: String, required: true },
  description: { type: String },
  content: { type: String },
  source_url: { type: String },
  source_name: { type: String },
  published_at: { type: Date, required: true },
  category: [{ type: String }],
  country: [{ type: String }],
  language: { type: String, required: true },
  dedup_hash: { type: String, required: true, unique: true },
  ai_summary: { type: String },
  ai_sentiment: { type: String, enum: ['Positive', 'Negative', 'Neutral'] },
<<<<<<< HEAD
  ai_impact_score: { type: Number },
=======
  ai_impact_score: { type: Number, min: 1, max: 10 },
>>>>>>> 4708b866a888bb780857c6eab811f4df5a17bdf8
  ai_insights: [{ type: String }],
  ai_processed: { type: Boolean, default: false },
  ai_failed: { type: Boolean, default: false },
  ai_error_message: { type: String },
  ai_retry_count: { type: Number, default: 0 },
  fetched_at: { type: Date, default: Date.now },
});

articleSchema.index({ title: 'text', description: 'text' });
articleSchema.index({ published_at: -1 });
articleSchema.index({ ai_sentiment: 1 });
articleSchema.index({ ai_processed: 1 });

export const Article = mongoose.model<IArticle>('Article', articleSchema);
