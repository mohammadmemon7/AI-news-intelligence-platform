import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface AIAnalysis {
  summary: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  insights: string[];
}

const DEFAULT_ANALYSIS: AIAnalysis = {
  summary: 'Analysis unavailable.',
  sentiment: 'Neutral',
  insights: ['Unable to generate insights at this time.'],
};

export const aiService = {
  processArticle: async (text: string): Promise<AIAnalysis> => {
    try {
      // Truncate content to 800 chars as per rules section 8
      const truncatedText = text.slice(0, 800);

      const response = await axios.post(
        `${env.GROQ_BASE_URL}/chat/completions`,
        {
          model: env.GROQ_MODEL,
          messages: [
            {
              role: 'user',
              content: `Analyze this article and return ONLY a JSON object. 
Do not include any conversational text before or after the JSON.

Article:
${truncatedText}

JSON Structure:
{
  "summary": "1-2 sentence summary",
  "sentiment": "Positive" | "Negative" | "Neutral",
  "insights": ["insight 1", "insight 2", "insight 3"]
}`,
            },
          ],
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        // Fallback: try to find JSON block
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (innerError) {
             logger.error('Failed to parse matched JSON block:', innerError);
          }
        }
        throw new Error('AI response was not valid JSON');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        throw new Error('RATE_LIMIT'); // Specialized error for pipeline to handle
      }
      logger.error('Groq AI Processing Error:', error instanceof Error ? error.message : error);
      return DEFAULT_ANALYSIS;
    }
  },
};
