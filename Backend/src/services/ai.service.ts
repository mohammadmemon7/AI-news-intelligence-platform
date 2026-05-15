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
    const MAX_RETRIES = 3;
    try {
      const truncatedText = text.slice(0, 1000);

      const response = await axios.post(
        `${env!.GROQ_BASE_URL}/chat/completions`,
        {
          model: env!.GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a professional news intelligence analyst. Return ONLY a valid JSON object.`
            },
            {
              role: 'user',
              content: `Analyze the following news article:
TEXT: "${truncatedText}"

TASKS:
1. Provide a concise 1-2 sentence summary.
2. Determine sentiment: "Positive", "Negative", or "Neutral".
3. Assign an Impact Score (1-10).
4. Extract 3 key bullet-point insights.

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
            Authorization: `Bearer ${env!.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000 // 15s timeout
        }
      );

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);
      
      // Normalize Sentiment
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
      
      // If Rate Limit (429) and we have retries left
      if (status === 429 && retryCount < MAX_RETRIES) {
        const waitTime = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
        logger.warn(`Rate limit hit. Retrying in ${waitTime}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return aiService.processArticle(text, retryCount + 1);
      }

      logger.error('Groq AI Error:', error.response?.data || error.message);
      
      if (status === 429) throw new Error('Groq Rate Limit Exceeded. Please try again in a minute.');
      if (status === 401) throw new Error('Invalid Groq API Key.');
      
      throw new Error(error.response?.data?.error?.message || 'AI processing failed.');
    }
  },
};
