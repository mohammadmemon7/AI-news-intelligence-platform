import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

const loadEnv = () => {
  // Always resolve .env relative to the Backend root, regardless of cwd
  const envPath = path.resolve(__dirname, '../../.env');
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    // Fallback: try cwd
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  }

  const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    PORT: z.string().transform(Number).default(5000),
    MONGODB_URI: z.string().min(10), 
    NEWS_API_KEY: z.string().min(1),
    GROQ_API_KEY: z.string().min(1),
    GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
    GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
    CLIENT_URL: z.string().url(),
    PIPELINE_SECRET: z.string().min(1).default('secret'),
  });

  try {
    const parsed = envSchema.parse(process.env);
    console.log(`[ENV] Using AI Model: ${parsed.GROQ_MODEL}`);
    return parsed;
  } catch (error: any) {
    console.error('❌ Invalid environment variables:', JSON.stringify(error.format ? error.format() : error, null, 2));
    process.exit(1);
    throw error; // unreachable but satisfies TS
  }
};

export const env = loadEnv()!;
