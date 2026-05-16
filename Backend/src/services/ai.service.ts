import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface AIAnalysis {
  summary: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  impact_score: number;
  insights: string[];
}

export const aiService = {
  processArticle: async (text: string, retryCount = 0): Promise<AIAnalysis> => {
    const MAX_RETRIES = 5;
    try {
      const truncatedText = text.slice(0, 1000);

      const response = await axios.post(
        `${env.GROQ_BASE_URL}/chat/completions`,
        {
          model: env.GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a professional news intelligence analyst. Return ONLY a valid JSON object.`
            },
            {
              role: 'user',
              content: `Analyze the following news article and return a JSON object with summary, sentiment (Positive, Negative, or Neutral), impact_score (1-10), and 3-5 key insights.

TEXT: "${truncatedText}"

JSON STRUCTURE:
{
  "summary": "string",
  "sentiment": "Positive" | "Negative" | "Neutral",
  "impact_score": number,
  "insights": ["string", "string", "string"]
}`
            },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000 // Increased to 30s for complex analysis
        }
      );

      const content = response.data.choices[0].message.content;
      if (!content) throw new Error('EMPTY_RESPONSE');

      const parsed = JSON.parse(content);
      
      // Normalize Sentiment to PascalCase
      if (parsed.sentiment) {
          const s = parsed.sentiment.toLowerCase();
          if (s.includes('pos')) parsed.sentiment = 'Positive';
          else if (s.includes('neg')) parsed.sentiment = 'Negative';
          else parsed.sentiment = 'Neutral';
      }

      parsed.impact_score = Number(parsed.impact_score) || 5;
      return parsed;

    } catch (error: any) {
      const status = error.response?.status;
      const errorData = error.response?.data?.error?.message || error.response?.data || error.message;
      
      if (status === 429 && retryCount < MAX_RETRIES) {
        // More aggressive backoff for demo: 3s, 6s, 12s, 24s, 48s
        const waitTime = Math.pow(2, retryCount) * 3000;
        logger.warn(`Groq Rate Limit hit. Retry ${retryCount + 1}/${MAX_RETRIES} in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return aiService.processArticle(text, retryCount + 1);
      }

      logger.error('Groq AI Error:', errorData);
      
      // Throw the specific error message to be stored in the DB
      if (status === 429) throw new Error('RATE_LIMIT_REACHED');
      if (status === 413) throw new Error('CONTENT_TOO_LARGE');
      if (status === 401) throw new Error('INVALID_API_KEY');
      
      throw new Error(`AI_FAILED: ${errorData.toString().slice(0, 100)}`);
    }
  },
};
