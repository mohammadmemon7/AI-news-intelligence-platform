import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Always resolve .env relative to the Backend root, regardless of cwd
// Works for both CommonJS (ts-node-dev) and ESM
const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });
if (result.error) {
  // Fallback: try cwd (in case __dirname doesn't resolve as expected)
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}
console.log(`[ENV] Loading .env from: ${envPath}`);
console.log(`[ENV] NEWS_API_KEY loaded: ${process.env.NEWS_API_KEY?.slice(0, 8)}...`);

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

const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(envParse.error.format(), null, 2));
  process.exit(1);
}

export const env = envParse.data;
