# Product Requirements Document (PRD)

**Project Name:** AI-Powered News Intelligence Platform
**Version:** 1.0
**Date:** 13 May 2026
**Stack:** MERN (MongoDB, Express, React, Node.js) + Groq API (LLaMA 3.3-70b) + NewsData.io
**Assignment:** Datastraw Technologies — AI + Tech Intern Hiring Assignment

---

## 1. Executive Summary

This document defines the complete product requirements for the **AI-Powered News Intelligence Platform**. The system fetches real-time news articles from NewsData.io, processes each article through the Groq LLM (LLaMA 3.3-70b-versatile) to generate summaries, sentiment labels, and key insights, stores enriched data in MongoDB, and surfaces it through a React + Tailwind CSS dashboard with search and filter capabilities.

| Component  | Technology                          | Purpose                                  |
|------------|-------------------------------------|------------------------------------------|
| Frontend   | React (Vite) + Tailwind CSS         | Responsive, interactive dashboard        |
| Backend    | Node.js + Express + TypeScript      | REST API, pipeline orchestration         |
| Database   | MongoDB Atlas + Mongoose            | Flexible document storage + text search  |
| LLM / AI   | Groq API — llama-3.3-70b-versatile  | Summarization, sentiment, key insights   |
| News Source| NewsData.io API                     | Real-time paginated article feed         |
| Deployment | Vercel (FE) + Render (BE) — optional| Free-tier cloud hosting                  |

---

## 2. Goals & Success Metrics

| Goal                    | Success Metric                                                        |
|-------------------------|-----------------------------------------------------------------------|
| Complete data pipeline  | 100–500 articles fetched, cleaned, deduplicated, stored               |
| AI enrichment           | 100% of stored articles have summary + sentiment + insights           |
| Working dashboard       | Real DB data rendered; search + filter fully functional               |
| Fast setup              | `git clone` → `npm install` → running in under 5 minutes             |
| Code quality            | Modular structure, `.env.example`, README, code comments              |
| Optional deployment     | Live URL accessible via Vercel + Render (bonus)                       |

---

## 3. User Stories

| ID     | Role        | Story                                                                                          |
|--------|-------------|------------------------------------------------------------------------------------------------|
| US-01  | User        | View a paginated list of articles showing title, source, date, AI summary, sentiment, insights |
| US-02  | User        | Search articles by keyword matching title and description                                      |
| US-03  | User        | Filter articles by sentiment (Positive / Negative / Neutral) and date range                   |
| US-04  | User        | Click an article card to see full details and all AI-generated fields                          |
| US-05  | Developer   | Trigger the fetch + AI processing pipeline via `POST /api/pipeline/run`                        |
| US-06  | Developer   | View article counts segmented by sentiment via `GET /api/stats`                                |

---

## 4. Functional Requirements

### 4.1 Data Pipeline

A Node.js script (or Express-triggered job) responsible for fetching, cleaning, deduplicating, and storing news articles from NewsData.io.

- **API Integration:** `https://newsdata.io/api/1/news` — params: `apikey`, `country`, `category`, `language`, `page` (cursor token)
- **Pagination:** Loop until no `nextPage` token or target count (100–500) reached. Add 1-second delay between requests.
- **Cleaning & Validation:**
  - Strip HTML tags from `content` / `description`
  - Trim whitespace, normalize text
  - Skip articles where `title` or `content` is null/empty
  - Keep only English-language articles (`language == "english"`)
- **Deduplication (MD5 Hash):**
  - Compute `dedup_hash = MD5(trimmed_title + "|" + published_at_ISO_string)`
  - Before inserting, check if `dedup_hash` already exists in DB — skip if found
  - Do NOT rely on `source_url` — it is frequently `null` in NewsData.io responses
- **Storage:** Insert raw article into MongoDB `articles` collection, set `ai_processed: false`
- **AI Processing:** After raw insert, process each article where `ai_processed === false` via Groq API. Update document with AI fields, set `ai_processed: true`
- **Scheduling (Bonus):** Optional `node-cron` job to refresh articles every 6 hours

**Deduplication Code Pattern:**

```ts
import crypto from 'crypto';

const dedupHash = crypto
  .createHash('md5')
  .update((article.title?.trim() || '') + '|' + (article.pubDate || ''))
  .digest('hex');
```

---

### 4.2 AI-Powered Features (Groq API)

Each stored article is enriched with three AI-generated fields by calling the Groq API. One API call per article minimises latency and cost.

**Groq API Configuration:**
- Base URL: `https://api.groq.com/openai/v1/chat/completions`
- Auth: `Authorization: Bearer ${GROQ_API_KEY}`
- Model: `llama-3.3-70b-versatile`
- Free tier: ~14,400 requests/day

**Prompt Template:**

```
You are a news analyst. Analyze the following article.
Return ONLY a valid JSON object with exactly these keys:
- "summary": a concise 1-2 sentence summary.
- "sentiment": one of "Positive", "Negative", "Neutral".
- "insights": an array of 3-5 key insights as strings.

Article:
{articleText}

JSON:
```

> **Note:** Do NOT use `response_format: { type: "json_object" }` — Groq's LLaMA 3.3-70b does not support it reliably. Enforce JSON output via prompt only.

**Response Parsing & Error Handling:**
- Parse JSON from response directly
- If malformed, attempt regex extraction: `/{[\s\S]*?}/`
- If both fail, log error with `console.error` and mark `ai_failed: true` — do not crash pipeline
- Never expose `GROQ_API_KEY` in logs

**Stored AI Fields:** `ai_summary`, `ai_sentiment`, `ai_insights` (array), `ai_processed`, `ai_failed`

**Batch Processing:** Process articles in batches of 5 with 500ms delay between batches to avoid Groq free-tier token rate limit (6,000 tokens/min). Truncate article content to 800 chars before sending.

---

### 4.3 Backend REST API (Node.js + Express + TypeScript)

| Method | Endpoint              | Description                                        | Auth / Limit        |
|--------|-----------------------|----------------------------------------------------|---------------------|
| GET    | `/api/articles`       | List articles — paginated, searchable, filterable  | 200 req/min         |
| GET    | `/api/articles/:id`   | Single article full detail                         | 200 req/min         |
| GET    | `/api/stats`          | Article counts by sentiment and category           | 200 req/min         |
| POST   | `/api/pipeline/run`   | Trigger fetch + AI pipeline                        | 5 req/min (strict)  |
| GET    | `/health`             | Uptime check — returns `{ status: "ok" }`          | No rate limit       |

**Query params for `GET /api/articles`:** `page`, `limit`, `search`, `sentiment`, `date_from`, `date_to`, `sort_by`

**Middleware stack (in this exact order):**
1. `helmet` — security headers
2. `cors` — explicit `CLIENT_URL` origin, no wildcard `*`
3. `express.json({ limit: '10kb' })` — body parser with size limit
4. `express-mongo-sanitize` — NoSQL injection protection
5. `express-rate-limit` — 200/min global on `/api`; 5/min on `/api/pipeline/run`
6. `morgan('dev')` — HTTP logging (development only)
7. Routes
8. `errorHandler` — central error handler (must be last)

---

### 4.4 Frontend Dashboard (React + Vite + Tailwind CSS)

**Components:**

| Component      | Description                                                                                  |
|----------------|----------------------------------------------------------------------------------------------|
| `Navbar`       | Brand name, optional "Refresh Feed" button                                                   |
| `StatsBar`     | Total articles, % Positive / Negative / Neutral — from `/api/stats`                         |
| `SearchBar`    | Text input with 300ms debounce, updates query and re-fetches                                 |
| `FilterPanel`  | Sentiment dropdown + date range picker — all filters combinable                              |
| `ArticleList`  | Paginated grid of `ArticleCard` components with skeleton loader                              |
| `ArticleCard`  | Title, source, date, sentiment badge (color-coded), AI summary, collapsible insights list   |
| `ArticleDetail`| Modal or `/article/:id` route with full AI output                                            |

**Sentiment badge colors:** Green = Positive, Red = Negative, Gray = Neutral

**Routing:** React Router v6 — `/` (dashboard) and `/article/:id`

**Data fetching:** `axios` or native `fetch` with React hooks (`useState`, `useEffect`) or React Query

**Error & loading states:** Skeleton cards on load, network error banners, empty-state for no results

---

### 4.5 Search & Filter Implementation

```ts
// Backend query builder
const query: Record<string, unknown> = {};

if (search)    query.$text = { $search: search };
if (sentiment) query.ai_sentiment = sentiment;
if (date_from || date_to) {
  query.published_at = {};
  if (date_from) (query.published_at as Record<string, Date>).$gte = new Date(date_from);
  if (date_to)   (query.published_at as Record<string, Date>).$lte = new Date(date_to);
}

const articles = await Article
  .find(query)
  .sort({ published_at: -1 })
  .skip((page - 1) * limit)
  .limit(limit);
```

---

## 5. Non-Functional Requirements

| Category        | Requirement                                                                                          |
|-----------------|------------------------------------------------------------------------------------------------------|
| Performance     | List API response < 200ms with pagination. AI processing async — never blocks API requests.          |
| Scalability     | Pipeline decoupled from web server. Can run independently or be triggered via endpoint.              |
| Security        | No API keys in frontend. Helmet headers on all responses. Pipeline endpoint rate-limited to 5/min.   |
| Deduplication   | MD5 hash of `title + pubDate` as unique key — handles `null source_url` safely.                      |
| Error Handling  | Exponential backoff on 429/5xx from NewsData.io. AI failures logged and flagged; pipeline continues. |
| Documentation   | README with exact setup steps. `.env.example` with all required keys. JSDoc on key functions.        |
| Maintainability | Modular structure: `models/`, `routes/`, `controllers/`, `services/`, `utils/`. No spaghetti files.  |
| Setup Speed     | New developer can clone and run app in under 5 minutes with provided README.                         |

---

## 6. Database Schema (MongoDB / Mongoose)

```ts
const articleSchema = new mongoose.Schema({
  // Raw fields from NewsData.io
  title:        { type: String, required: true },
  description:  String,
  content:      String,
  source_url:   String,           // NOT unique — can be null in NewsData.io
  source_name:  String,
  published_at: Date,
  category:     [String],
  country:      [String],
  language:     String,

  // Deduplication (MD5 hash — unique index)
  dedup_hash: { type: String, unique: true },  // MD5(title + "|" + pubDate)

  // AI-generated fields
  ai_summary:   String,
  ai_sentiment: { type: String, enum: ['Positive', 'Negative', 'Neutral'] },
  ai_insights:  [String],
  ai_processed: { type: Boolean, default: false },
  ai_failed:    { type: Boolean, default: false },

  // Metadata
  fetched_at: { type: Date, default: Date.now }
});

// Indexes
articleSchema.index({ title: 'text', description: 'text' }); // full-text search
articleSchema.index({ published_at: -1 });
articleSchema.index({ ai_sentiment: 1 });
articleSchema.index({ ai_processed: 1 });
articleSchema.index({ dedup_hash: 1 }, { unique: true });
```

---

## 7. API Response Contracts

### Success Response (Single)
```json
{ "success": true, "data": { } }
```

### Success Response (Paginated)
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "total": 348,
    "page": 1,
    "limit": 20,
    "totalPages": 18
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "fields": {
      "field": ["Error detail"]
    }
  }
}
```

**Standard error codes:** `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `INTERNAL_ERROR` (500)

### `GET /api/stats` Response
```json
{
  "success": true,
  "data": {
    "total": 348,
    "sentiment": { "Positive": 142, "Negative": 98, "Neutral": 108 },
    "by_category": { "technology": 89, "politics": 74, "business": 61 }
  }
}
```

---

## 8. System Architecture & Data Flow

```
┌─────────────────┐   paginated fetch    ┌──────────────────────┐
│  NewsData.io API │ ──────────────────> │   Pipeline Service   │
└─────────────────┘                      │   (pipeline.service) │
                                         │                      │
                                         │  1. Fetch + paginate │
                                         │  2. Clean + validate │
                                         │  3. MD5 dedup_hash   │
                                         │  4. Insert raw docs  │
                                         │  5. Call Groq API    │
                                         │  6. Update AI fields │
                                         └──────────┬───────────┘
                                                    │ read/write
                                         ┌──────────▼───────────┐
┌──────────────────┐   REST API calls    │    MongoDB Atlas      │
│  React Dashboard │ <─────────────────  │  (articles collection)│
│  (Vite + Tailwind│   Express /api/*    └──────────────────────┘
│  search + filter)│
└──────────────────┘
                         ┌──────────────────────────┐
        Pipeline uses:   │  Groq API                │
                         │  llama-3.3-70b-versatile  │
                         └──────────────────────────┘
```

---

## 9. Project Folder Structure

```
datastraw-news-platform/
├── backend/
│   ├── src/
│   │   ├── server.ts                  # Connect DB → start cron → listen
│   │   ├── app.ts                     # Express app: middleware + routes
│   │   ├── config/
│   │   │   ├── env.ts                 # Zod-validated env, crash on invalid
│   │   │   └── db.ts                  # Mongoose connect / disconnect
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts        # Central error handler (must be last)
│   │   │   ├── validate.ts            # Zod schema → 400 response
│   │   │   └── rateLimiter.ts         # Rate limit configs
│   │   ├── modules/
│   │   │   ├── articles/
│   │   │   │   ├── article.routes.ts
│   │   │   │   ├── article.controller.ts
│   │   │   │   ├── article.service.ts
│   │   │   │   ├── article.model.ts   # Mongoose schema with dedup_hash
│   │   │   │   └── article.schema.ts  # Zod request validation schemas
│   │   │   └── pipeline/
│   │   │       ├── pipeline.service.ts  # Fetch, clean, dedup, store, AI process
│   │   │       └── pipeline.controller.ts
│   │   ├── services/
│   │   │   ├── ai.service.ts          # Groq API wrapper
│   │   │   └── cron.service.ts        # node-cron jobs
│   │   └── utils/
│   │       └── logger.ts              # Simple console wrapper
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json                  # strict: true
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── ArticleCard.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   └── StatsBar.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   └── ArticleDetail.tsx
│   │   ├── hooks/
│   │   │   └── useArticles.ts
│   │   └── App.tsx
│   └── vite.config.ts
│
├── .env.example                       # Root-level (all keys documented)
└── README.md                          # Setup in under 5 minutes
```

---

## 10. Environment Variables (.env.example)

```env
# ── Backend (/backend/.env) ────────────────────────────────────────────────
NODE_ENV=development
PORT=5000

# MongoDB — Atlas free tier or local
MONGODB_URI=mongodb://localhost:27017/news_intelligence

# NewsData.io — https://newsdata.io/register (free tier: 200 req/day)
NEWS_API_KEY=your_newsdata_io_api_key_here

# Groq API — https://console.groq.com (free tier: ~14,400 req/day)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_BASE_URL=https://api.groq.com/openai/v1

# Pipeline trigger protection
PIPELINE_SECRET=your_pipeline_secret_key_here

# Frontend origin for CORS
CLIENT_URL=http://localhost:5173

# ── Frontend (/frontend/.env) ───────────────────────────────────────────────
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 11. 3-Day Implementation Plan

| Day   | Focus Area                    | Tasks                                                                                                                                               | Deliverable                              |
|-------|-------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| Day 1 | Environment + Core Pipeline   | Init Git repo. Express + MongoDB + TypeScript setup. Mongoose Article model with `dedup_hash`. `newsService` with pagination + cleaning. Test fetch 20 articles. | Pipeline storing raw articles in DB      |
| Day 2 | AI Processing + REST API      | `ai.service.ts` with Groq API call + JSON parsing + fallback. Batch processor (5 at a time, 500ms delay). Express routes: `/api/articles` (search/filter/paginate) + `/api/stats`. Basic React scaffold fetching real data. | 100+ AI-enriched articles in DB + working API |
| Day 3 | Frontend Polish + Docs        | Complete `ArticleCard` with sentiment badges. `SearchBar` debounce + `FilterPanel`. `StatsBar` component. Loading/error states. README + `.env.example`. Screenshots + 5-min walkthrough video. Optional deploy. | Complete, submission-ready application   |

---

## 12. Risks & Mitigations

| Risk                                      | Likelihood | Impact | Mitigation                                                                                                     |
|-------------------------------------------|------------|--------|----------------------------------------------------------------------------------------------------------------|
| NewsData.io rate limit (200 req/day free) | Medium     | Medium | Fetch in one session. Add 1s delay between pages. Articles cached in DB — no re-fetch of existing.            |
| Groq JSON response malformed              | Low        | Low    | `try/catch` on parse. Regex fallback `/{[\s\S]*?}/`. Mark `ai_failed: true` and continue pipeline.            |
| `source_url` null in NewsData.io response | High       | High   | **FIXED:** Use MD5 hash of `title + pubDate` as `dedup_hash` unique index instead of `source_url`.            |
| Groq free tier token limit (6k tokens/min)| Medium     | Low    | Batch 5 articles, add 500ms delay. Truncate content to 800 chars before sending to LLM.                       |
| MongoDB Atlas free tier (512MB limit)     | Low        | Low    | 100–500 articles + AI fields ≈ ~5MB max. Well within free tier limits.                                        |

---

## 13. Key Decisions & Rationale

> Include this section in your submission cover letter.

- **MongoDB over SQL:** News article schema varies across sources — some have `content`, some only `description`, categories may be arrays or strings. MongoDB's flexible document model avoids constant schema migrations and maps naturally to the JSON returned by NewsData.io.

- **Groq API (LLaMA 3.3-70b) over OpenAI/Anthropic:** Groq provides the fastest LLM inference available on a free tier (~14,400 requests/day). LLaMA 3.3-70b delivers high-quality structured JSON output for news analysis. No billing setup required — ideal for assignment scope.

- **One LLM call per article:** A single structured prompt requesting summary + sentiment + insights simultaneously reduces API calls, cost, and latency compared to three separate calls.

- **Pipeline decoupled from API server:** The fetch + AI processing job runs independently of the Express server. This ensures the web API is never blocked during data ingestion and the pipeline can be triggered manually or on a schedule.

- **MD5 dedup hash (not source_url):** NewsData.io frequently returns `null` `source_url` values. A hash of `title + pubDate` provides a reliable, consistent unique key across all articles without risk of null collisions.

- **TypeScript strict mode:** Catches bugs at compile time, improves code quality, and demonstrates professional development practices to reviewers.

- **React + Vite + Tailwind CSS:** Modern, fast build setup with utility-first CSS enabling rapid responsive UI development without heavy component library overhead.

---

## 14. Deliverables Checklist

| # | Deliverable          | Details                                                                       |
|---|----------------------|-------------------------------------------------------------------------------|
| 1 | GitHub Repository    | Clean structure, README, `.env.example`, code comments                        |
| 2 | Data Pipeline        | Fetch 100–500 articles, MD5 dedup, clean, store in MongoDB                    |
| 3 | AI Enrichment        | Summary + sentiment + insights via Groq, stored per article                   |
| 4 | Backend REST API     | `GET /articles` (search + filter + paginate), `GET /stats`, `POST /pipeline/run` |
| 5 | React Dashboard      | Real DB data, search bar, sentiment/date filters, article cards               |
| 6 | Demo Screenshots     | At least 3: dashboard view, article detail, filter in use                     |
| 7 | Video Walkthrough    | 5 min or less — show pipeline run + dashboard features                        |
| 8 | Live Deployment      | Vercel (frontend) + Render (backend) — **OPTIONAL, bonus consideration**      |

---

*Datastraw Technologies Pvt Ltd | AI-Powered News Intelligence Platform | PRD v1.0 | Private & Confidential*