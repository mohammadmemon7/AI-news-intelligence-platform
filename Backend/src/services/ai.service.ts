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
  processArticle: async (text: string): Promise<AIAnalysis> => {
    try {
      // Truncate content to 1000 chars for better context while staying within limits
      const truncatedText = text.slice(0, 1000);

      const response = await axios.post(
        `${env!.GROQ_BASE_URL}/chat/completions`,
        {
          model: env!.GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a professional news intelligence analyst. Your task is to provide objective, high-quality analysis of news articles.
Return ONLY a valid JSON object. No conversational text.`
            },
            {
              role: 'user',
              content: `Analyze the following news article:

ARTICLE TEXT:
"${truncatedText}"

TASKS:
1. Provide a concise 1-2 sentence summary.
2. Determine sentiment: 
   - "Positive": Good news, breakthrough, recovery, or uplifting events.
   - "Negative": Crisis, disaster, crime, death, or economic downturn.
   - "Neutral": Facts, announcements, or balanced reporting.
3. Assign an Impact Score (1-10) based on global or regional significance.
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
          response_format: { type: "json_object" } // Groq supports this for better JSON
        },
        {
          headers: {
            Authorization: `Bearer ${env!.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(content);
        
        // Normalize Sentiment to PascalCase
        if (parsed.sentiment) {
            const s = parsed.sentiment.toLowerCase();
            if (s.includes('pos')) parsed.sentiment = 'Positive';
            else if (s.includes('neg')) parsed.sentiment = 'Negative';
            else parsed.sentiment = 'Neutral';
        } else {
            parsed.sentiment = 'Neutral';
        }

        // Ensure impact_score is numeric
        parsed.impact_score = Number(parsed.impact_score) || 5;
        
        return parsed;
      } catch (parseError) {
        // Fallback: try to find JSON block
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            // Normalize sentiment
            if (parsed.sentiment) {
                const s = parsed.sentiment.toLowerCase();
                if (s.includes('pos')) parsed.sentiment = 'Positive';
                else if (s.includes('neg')) parsed.sentiment = 'Negative';
                else parsed.sentiment = 'Neutral';
            }
            return parsed;
          } catch (innerError) {
             logger.error('Failed to parse matched JSON block:', innerError);
          }
        }
        throw new Error('AI response was not valid JSON');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        throw new Error('RATE_LIMIT'); 
      }
      logger.error('Groq AI Processing Error:', error instanceof Error ? error.message : error);
      throw new Error('AI_PROCESSING_FAILED');
    }
  },
};
