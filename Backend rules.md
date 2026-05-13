You are building the backend for an AI-Powered News Intelligence Platform.  
Tech stack: Node.js, Express, TypeScript, MongoDB (Mongoose), Groq API (model: llama-3.3-70b-versatile), node-cron for pipeline scheduling.  
Follow these **absolute rules** at every step. Do not deviate.

---

### 1. VERSION SAFETY (CRITICAL)
- **Never copy version numbers** from any document, memory, or package.json sample.
- Before adding any dependency, **web search** for latest stable + any security advisories (`"<package-name> npm latest version"`, `"<package-name> CVE"`).
- Where possible, confirm with `npm show <pkg> version`.
- Use `^` semver range for application deps unless there's a reason to pin.
- Generate lockfile with `npm install` for reproducible installs via `npm ci`.
- In responses, state you verified (e.g., “searched + `npm show express version` → using ^….”).

---

### 2. REPOSITORY STRUCTURE
Strictly follow this folder layout:
backend/
├── src/
│ ├── server.ts # Connect DB → start cron → listen
│ ├── app.ts # Express app: middleware + routes
│ ├── config/
│ │ ├── env.ts # Zod-validated env, crash on invalid
│ │ └── db.ts # Mongoose connect/disconnect
│ ├── middleware/
│ │ ├── errorHandler.ts # Central error handler (last)
│ │ ├── validate.ts # Zod schema → 400
│ │ └── rateLimiter.ts # Rate limit configs
│ ├── modules/
│ │ ├── articles/
│ │ │ ├── article.routes.ts
│ │ │ ├── article.controller.ts
│ │ │ ├── article.service.ts
│ │ │ ├── article.model.ts # Mongoose schema
│ │ │ └── article.schema.ts # Zod validation schemas
│ │ └── pipeline/
│ │ ├── pipeline.service.ts # Fetch, clean, deduplicate, store, AI process
│ │ └── pipeline.controller.ts # Trigger endpoint
│ ├── services/
│ │ ├── ai.service.ts # Groq API wrapper
│ │ └── cron.service.ts # node-cron jobs
│ ├── utils/
│ │ └── logger.ts # Simple logger stub (console)
│ └── types/
├── .env.example # All required keys, dummy values
├── .gitignore
├── package.json
└── tsconfig.json # strict: true

text

---

### 3. ENVIRONMENT VARIABLES
- **Never commit `.env` or `.env.local`**; only `.env.example`.
- Example `.env.example`:
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/news_intelligence
NEWS_API_KEY=your_newsdata_io_key
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_BASE_URL=https://api.groq.com/openai/v1
CLIENT_URL=http://localhost:5173

text
- Validate all env vars with Zod in `src/config/env.ts` **at startup**, crash on failure.
**FIXED MONGODB_URI validation** — use `.min(10)` instead of `.url()`:
```ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development','production']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  MONGODB_URI: z.string().min(10),  // accepts mongodb://, mongodb+srv://, etc.
  NEWS_API_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  CLIENT_URL: z.string().url()
});
// ... safeParse + process.exit(1) on error
4. .gitignore (FIXED)
Create .gitignore with these explicit entries to avoid ignoring .env.example:

text
node_modules/
dist/
build/
*.log

# Environment — NEVER commit real secrets
.env
.env.local
.env.production
.env.development
# BUT .env.example IS committed (it’s a template, not a secret)
5. SECURITY MIDDLEWARE (IN ORDER)
In app.ts, apply these in this exact order:

Helmet – set all security headers.

CORS – explicit origin list from env.CLIENT_URL (NO *), methods: GET, POST, PUT, DELETE.

Body parser limit – express.json({ limit: '10kb' }).

Mongo Sanitize – express-mongo-sanitize().

Rate Limiting:

Global for /api: windowMs: 60_000, max: 200

Pipeline endpoint /api/pipeline/run: windowMs: 60_000, max: 5

Use express-rate-limit.

Logging – morgan('dev') in development (no Winston/Sentry).

Your routes.

Error handler – must be last.

6. ERROR & SUCCESS RESPONSE FORMAT (STRICT)
Every API response must follow:

Success (single / paginated):

json
{ "success": true, "data": { ... } }
{ "success": true, "data": [ ... ], "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } }
Error:

json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable",
    "fields": { "field": ["detail"] }  // only for validation errors
  }
}
Standard error codes: VALIDATION_ERROR (400), NOT_FOUND (404), INTERNAL_ERROR (500).

7. DATA PIPELINE RULES (WITH MD5 DEDUP)
Fetch articles from NewsData.io (https://newsdata.io/api/1/news), use pagination with nextPage token.

Fetch 100–500 articles, rate limit between requests (1 sec delay).

Deduplication: compute dedup_hash = MD5(trimmed title + "|" + published_at ISO string). Before inserting, check if dedup_hash already exists; skip if yes.

Cleaning: strip HTML from description/content, trim whitespace, only articles where language == "english".

Storage: insert raw article, set ai_processed: false.

AI Processing: for each unprocessed article, call Groq AI service → update with summary, sentiment, insights → set ai_processed: true.

Pipeline can be triggered via POST /api/pipeline/run (with strict rate limit 5/min) or run on schedule with node-cron.

8. AI SERVICE (GROQ API)
In src/services/ai.service.ts, export processArticle(text: string): Promise<{ summary, sentiment, insights }>.

Use Groq's OpenAI-compatible chat completions endpoint: {baseUrl}/chat/completions.

Prompt template (NO response_format parameter):

text
You are a news analyst. Analyze the following article.
Return ONLY a valid JSON object with exactly these keys:
- "summary": a concise 1-2 sentence summary.
- "sentiment": one of "Positive", "Negative", "Neutral".
- "insights": an array of 3-5 key insights as strings.

Article:
{articleText}

JSON:
If response is not valid JSON, try extracting with regex (/{[\s\S]*?}/); if that fails, fallback to default values and log error with console.error.

Never expose API key in logs.

9. MONGOOSE SCHEMA & INDEXES
Article model (article.model.ts) fields:

dedup_hash: String, unique index (the MD5 hash)

source_url, title, description, content

published_at, source_name, category, country

ai_summary, ai_sentiment, ai_insights ([String])

ai_processed: Boolean (default false)

fetched_at: Date (default now)

Indexes:

Unique index: dedup_hash

Text index: { title: 'text', description: 'text' } for $text search

Single field indexes: ai_sentiment, published_at (descending)

10. API ENDPOINTS
GET /api/articles

Query params: page, limit, search, sentiment, date_from, date_to.

Use $regex for search (or $text if you prefer). Sentiment exact match. Date range on published_at.

Return paginated success shape.

GET /api/articles/:id – full article detail.

POST /api/pipeline/run – trigger pipeline (protected by 5/min rate limit).

GET /health – simple { status: "ok" }, mounted before global rate limiter.

11. LOGGING (SIMPLIFIED)
No Winston or Sentry in this project.

Use morgan('dev') for HTTP logging in development.

Use console.log / console.error for application logs.

Create a simple logger stub (src/utils/logger.ts) that only wraps console for consistency (optional).

Never log API keys, credentials, or full article text that may be sensitive.

12. CODING STANDARDS
TypeScript strict mode ("strict": true in tsconfig.json).

No any unless unavoidable and commented.

Use async/await; try/catch in all services.

Keep controllers thin; business logic in services.

Follow the folder structure exactly.

13. GIT CLEANLINESS
.gitignore as defined above (explicit entries).

Commit .env.example with dummy values and clear comments.

Commit package-lock.json.