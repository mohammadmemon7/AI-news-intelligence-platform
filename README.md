# AI-Powered News Intelligence Platform

> A full-stack MERN application that automatically fetches, enriches, and displays news articles with AI-generated summaries, sentiment analysis, and key insights — powered by Groq's LLaMA 3.3 70B model.

![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20MongoDB%20%7C%20Groq%20AI-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Quick Setup](#quick-setup--5-minutes)
5. [Environment Variables](#environment-variables)
6. [Running the Pipeline](#running-the-pipeline)
7. [API Reference](#api-reference)
8. [Project Structure](#project-structure)
9. [How AI Enrichment Works](#how-ai-enrichment-works)
10. [Security](#security)

---

## Features

### 🔄 Automated Data Pipeline
- Fetches up to **200 English news articles** per run from [NewsData.io](https://newsdata.io)
- **Pagination-aware** — follows `nextPage` cursors until target is reached
- **MD5 deduplication** — hashes `title|pubDate` to skip already-stored articles
- **HTML stripping** — cleans raw content before storing
- **Retry logic** — handles Groq rate limits with automatic 5s retry

### 🤖 AI Enrichment (Groq + LLaMA 3.3 70B)
- **1-2 sentence AI summary** per article
- **Sentiment classification**: Positive / Negative / Neutral
- **3-5 key insights** extracted per article
- Failed AI calls are marked `ai_failed=true` — no junk placeholder text stored in DB

### 📊 Intelligence Dashboard
- **Full-text search** with 300ms debounce across title + description
- **Sentiment filter** — All / Positive / Negative / Neutral buttons
- **Date range filter** — From / To date picker popover
- **Live stats bar** — total articles, animated sentiment breakdown, global mood indicator
- **Responsive grid** — 1 col mobile / 2 col tablet / 3 col desktop
- **Collapsible AI insights** per card — independent expand/collapse state
- **Dark / Light mode** — persists to `localStorage`, respects system preference
- **Pipeline refresh** — polls status every 3s, updates UI only when pipeline finishes
- **CSV export** — export current page to `.csv`
- **Shareable links** — copy article URL to clipboard
- **Re-process button** — trigger AI re-enrichment on a single article

### 🔒 Security
- `helmet` — secure HTTP headers
- `express-rate-limit` — 200 req/min global, 5 req/min pipeline
- `x-pipeline-secret` — all pipeline trigger endpoints require a secret header
- `express-mongo-sanitize` — prevents NoSQL injection
- No secrets in source code — all via `.env`

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + TypeScript | 18.2 |
| Build Tool | Vite | 8.x |
| Styling | Tailwind CSS | 3.4 |
| Animations | Framer Motion | 12.x |
| Backend | Node.js + Express | 5.2 |
| Language | TypeScript | 5.6 (BE) / 6.0 (FE) |
| Database | MongoDB + Mongoose | 9.6 |
| AI Model | Groq `llama-3.3-70b-versatile` | — |
| News API | NewsData.io | free tier |
| Validation | Zod | 4.x |
| Scheduling | node-cron | 4.x |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│   React Dashboard  ──►  GET /api/articles (paginated)        │
│   "Refresh" click  ──►  POST /api/pipeline/run               │
│                    ◄──  polls GET /api/pipeline/status        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP (Axios)
┌──────────────────────────────▼──────────────────────────────┐
│                   Express API (port 5000)                     │
│   /api/articles  → articleService  → MongoDB query           │
│   /api/pipeline/run → pipelineService.run()                  │
│     ├── NewsData.io fetch (paginated, English, deduplicated) │
│     └── Groq AI enrichment (batches of 5, retry on 429)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose
┌──────────────────────────────▼──────────────────────────────┐
│                  MongoDB Atlas / Local                        │
│   Collection: articles                                        │
│   Indexes: text(title,description), published_at, sentiment  │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Setup (< 5 minutes)

### Prerequisites

- **Node.js 18+** — [download](https://nodejs.org)
- **MongoDB** — [Atlas free tier](https://www.mongodb.com/cloud/atlas) or local install
- **NewsData.io API key** — [register free](https://newsdata.io/register) (200 req/day)
- **Groq API key** — [get free key](https://console.groq.com) (~14,400 req/day)

---

### Step 1 — Clone the repository

```bash
git clone <your-github-repo-url>
cd AI-Powered-News-Intelligence-Platform
```

---

### Step 2 — Set up the Backend

```bash
cd Backend
npm install
cp .env.example .env
```

Open `Backend/.env` and fill in your credentials:

```env
NODE_ENV=development
PORT=5000

MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/AI_News

NEWS_API_KEY=your_newsdata_io_api_key
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_BASE_URL=https://api.groq.com/openai/v1

PIPELINE_SECRET=choose_any_strong_secret
CLIENT_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

✅ You should see:
```
[ENV] NEWS_API_KEY loaded: pub_xxxx...
🚀 Server running in development mode on port 5000
✅ MongoDB Connected
```

---

### Step 3 — Set up the Frontend

```bash
cd ../frontend
npm install
cp .env.example .env
```

Open `frontend/.env` and set the pipeline secret to **match** `PIPELINE_SECRET` in `Backend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_PIPELINE_SECRET=choose_any_strong_secret
```

Start the frontend:

```bash
npm run dev
```

✅ Open **http://localhost:5173** in your browser.

---

### Step 4 — Populate the database

Click **"Refresh Feed"** in the top-right of the dashboard.

The pipeline indicator will appear:

```
⚡ PIPELINE ACTIVE
```

The dashboard auto-updates when finished (polls every 3 seconds). Expect ~2-3 minutes for 200 articles + AI enrichment.

Alternatively, trigger via curl:

```bash
curl -X POST http://localhost:5000/api/pipeline/run \
  -H "x-pipeline-secret: choose_any_strong_secret"
```

---

## Environment Variables

### Backend (`Backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development` or `production` (default: `development`) |
| `PORT` | No | Server port (default: `5000`) |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `NEWS_API_KEY` | ✅ | NewsData.io API key |
| `GROQ_API_KEY` | ✅ | Groq API key |
| `GROQ_MODEL` | No | Groq model ID (default: `llama-3.3-70b-versatile`) |
| `GROQ_BASE_URL` | No | Groq base URL (default: `https://api.groq.com/openai/v1`) |
| `PIPELINE_SECRET` | ✅ | Secret for protecting pipeline endpoints |
| `CLIENT_URL` | ✅ | Frontend URL for CORS (e.g. `http://localhost:5173`) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | No | Backend API base URL (default: `http://localhost:5000/api`) |
| `VITE_PIPELINE_SECRET` | ✅ | Must match `PIPELINE_SECRET` in backend `.env` |

---

## Running the Pipeline

The pipeline runs in the background after a `202 Accepted` response. The frontend polls `/api/pipeline/status` every 3 seconds and refreshes the article list automatically when done.

To enable **scheduled auto-refresh** (every 6 hours), change `Backend/src/server.ts` line 13:

```ts
// Change false → true to enable cron
cronService.init(true);
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Health check |
| `GET` | `/api/articles` | None | List articles with pagination + filters |
| `GET` | `/api/articles/:id` | None | Get a single article by ID |
| `GET` | `/api/stats` | None | Sentiment + category statistics |
| `POST` | `/api/pipeline/run` | `x-pipeline-secret` | Trigger full pipeline (fire-and-forget) |
| `GET` | `/api/pipeline/status` | None | Check if pipeline is running |
| `POST` | `/api/pipeline/process/:id` | `x-pipeline-secret` | Re-process one article with AI |

### Query Parameters for `GET /api/articles`

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Articles per page (default: 12) |
| `search` | string | Full-text search (title + description) |
| `sentiment` | string | `Positive` / `Negative` / `Neutral` |
| `date_from` | string | ISO date — filter articles published after |
| `date_to` | string | ISO date — filter articles published before |
| `sort_by` | string | Sort field (default: `-published_at`) |

---

## Project Structure

```
AI-Powered-News-Intelligence-Platform/
├── README.md
│
├── Backend/
│   ├── .env.example            # Template for environment variables
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts           # Entry point — DB connect, cron, listen
│       ├── app.ts              # Express app — middleware, routes
│       ├── config/
│       │   ├── env.ts          # Zod-validated env loader
│       │   └── db.ts           # MongoDB connection
│       ├── modules/
│       │   ├── articles/
│       │   │   ├── article.model.ts      # Mongoose schema + indexes
│       │   │   ├── article.service.ts    # DB queries (search, filter, stats)
│       │   │   ├── article.controller.ts # HTTP handlers
│       │   │   └── article.routes.ts     # Express router
│       │   └── pipeline/
│       │       ├── pipeline.service.ts   # Fetch → dedupe → store → AI enrich
│       │       ├── pipeline.controller.ts# HTTP handlers
│       │       └── pipeline.routes.ts    # Express router
│       ├── services/
│       │   ├── ai.service.ts   # Groq API integration
│       │   └── cron.service.ts # Scheduled pipeline trigger
│       └── utils/
│           └── logger.ts       # Console wrapper
│
└── frontend/
    ├── .env.example            # Template for Vite env vars
    ├── .gitignore
    ├── tailwind.config.js
    ├── vite.config.ts
    └── src/
        ├── App.tsx             # Router + theme state
        ├── main.tsx            # ReactDOM entry
        ├── index.css           # Tailwind imports + global styles
        ├── pages/
        │   ├── Dashboard.tsx   # Main feed with stats, search, filters, grid
        │   └── ArticleDetail.tsx # Full article view with AI analysis
        ├── components/
        │   ├── Navbar.tsx      # Logo, theme toggle, refresh, pipeline status
        │   ├── StatsBar.tsx    # Animated stats + global sentiment mood bar
        │   ├── SearchBar.tsx   # Debounced search input
        │   ├── FilterPanel.tsx # Sentiment + date range filter popover
        │   ├── ArticleList.tsx # Responsive article grid
        │   ├── ArticleCard.tsx # Card with AI summary + collapsible insights
        │   ├── Pagination.tsx  # Page navigator
        │   ├── Loader.tsx      # Spinner + skeleton cards
        │   └── ErrorMessage.tsx# Error display with retry
        ├── hooks/
        │   └── useDebounce.ts  # Generic debounce hook
        ├── lib/
        │   └── api.ts          # Axios client (6 endpoints)
        └── types/
            └── article.ts      # TypeScript interfaces
```

---

## How AI Enrichment Works

Each article is sent to Groq with a structured prompt:

```
Analyze this article and return ONLY a JSON object.

Article: <first 800 characters of title + description>

JSON Structure:
{
  "summary": "1-2 sentence summary",
  "sentiment": "Positive" | "Negative" | "Neutral",
  "insights": ["insight 1", "insight 2", "insight 3"]
}
```

**Error handling**:
- Primary parse: `JSON.parse(content)`
- Fallback parse: regex `/{[\s\S]*}/` to extract JSON block
- On `429 Rate Limit`: wait 5s and retry once
- On any other failure: article marked `ai_failed=true`, no junk text stored

**Batching**: Articles processed in batches of 5, with a 500ms pause between batches to respect rate limits.

---

## Security

| Protection | Implementation |
|---|---|
| Secure headers | `helmet` middleware |
| Rate limiting | `express-rate-limit` — 200/min global, 5/min pipeline |
| Pipeline auth | `x-pipeline-secret` header required on all write endpoints |
| NoSQL injection | Custom `mongoSanitize` middleware |
| Secret management | All credentials in `.env`, never in source code |
| CORS | Restricted to `CLIENT_URL` origin only |

---

## License

MIT © 2026 News Intelligence Platform
