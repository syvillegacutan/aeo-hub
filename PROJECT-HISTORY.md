# AEO Hub — Project History

## 2026-06-17 — API Key Security Fix (Backend Proxy)

All API keys (Anthropic, OpenAI, Gemini, DataForSEO) were prefixed with `VITE_` and bundled into the frontend JavaScript, making them visible to anyone via browser dev tools.

**Fix:** Added an Express backend proxy (`server.js`) that holds all secret keys server-side. Frontend now calls `/api/*` proxy endpoints instead of external APIs directly.

**Files changed:**

- `server.js` — new Express server with proxy endpoints for all 4 APIs + static file serving
- `src/lib/aeo.js` — removed API key imports, calls go through `/api/anthropic/messages`, `/api/openai/chat/completions`, `/api/gemini/generate`
- `src/lib/anthropic.js` — removed API key and direct Anthropic headers, all calls go through `/api/anthropic/messages`
- `src/lib/dataforseo.js` — removed credentials, calls go through `/api/dataforseo/*`
- `.env` — secret keys renamed without `VITE_` prefix (only Supabase URL/anon key remain `VITE_`)
- `package.json` — added `express` dependency, start command changed to `node server.js`
- `railway.json` — start command updated to `npm run build && npm start`

**Verified:** Production build contains zero secret keys in the JS bundle.

**Action required:** After deploying, rotate all API keys since the old ones were exposed in the previous production build.

---

## 2026-06-17 — Supabase RLS Security Fix

Resolved critical security vulnerability flagged by Supabase: Row-Level Security (RLS) was disabled on 5 public tables, allowing anyone with the project URL to read, edit, and delete data.

**Changes made:**

- Enabled RLS on `aeo_scores`, `blog_topic_suggestions`, `clients`, `keywords`, `questions`
- `blog_posts` already had RLS enabled
- Added "Allow authenticated access" policy on all 5 tables (`auth.role() = 'authenticated'`)
- Anonymous/public access is now blocked; service role key bypasses RLS as expected

**SQL executed:**

```sql
ALTER TABLE public.aeo_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_topic_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access" ON public.aeo_scores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON public.blog_topic_suggestions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON public.clients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON public.keywords FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON public.questions FOR ALL USING (auth.role() = 'authenticated');
```

---

## 2026-05-29 — Gemini & Anthropic Model Fixes

- Fixed Gemini endpoint and Anthropic model string errors
- Updated blog writer model to `claude-sonnet-4-6`

## 2026-05-22 — Content Engine

- Added Content Engine with blog topics, writer, and link builder
- Persisted blog topics to Supabase
- Fixed blog writer button click handler

## 2026-05-19 — Initial Deployment

- Initial AEO Hub deployment on Railway
- Supabase integration for data storage
- React + Vite + Tailwind stack
