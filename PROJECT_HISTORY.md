# AEO Hub — Project History & Context

**Owner:** Syville Gacutan (syseoexpert@gmail.com)
**Role:** SEO Strategist at a digital marketing agency
**Last updated:** June 2026

---

## What Is AEO Hub

AEO Hub is a custom-built Answer Engine Optimization app for Syville's digital marketing agency. It automates the process of finding questions people are asking about client businesses across Reddit, Quora, and Google People Also Ask, generating AI-powered draft answers, tracking client visibility in AI engines like ChatGPT, Gemini, and Claude, and writing full SEO blog posts based on real community questions.

The app is built with React + Vite, connected to Supabase for data storage, and deployed live on Railway.

---

## Live App

**Production URL:** https://aeo-hub-production.up.railway.app
**GitHub repo:** https://github.com/syvillegacutan/aeo-hub (private)
**Railway project:** determined-wisdom / production
**Supabase project:** syvillegacutan's Project
**Supabase URL:** https://wjagkxsuawqmkbjllfge.supabase.co

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Express.js (API proxy server) |
| Database | Supabase (PostgreSQL) |
| Hosting | Railway (auto-deploys from GitHub main branch) |
| AI drafts | Anthropic API (claude-haiku-4-5 for community answers, claude-sonnet-4-6 for blog writing) |
| AEO tracking | OpenAI API (GPT-4o mini), Google Gemini API (gemini-1.5-flash), Anthropic API (claude-haiku-4-5) |
| Question scanning | DataForSEO API (SERP + Keywords For Site endpoints) |
| Email alerts | Resend (planned, not yet wired) |

---

## Environment Variables (Railway + local .env)

### Frontend (VITE_ prefix, bundled into client JS — safe to expose)
VITE_SUPABASE_URL=https://wjagkxsuawqmkbjllfge.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (229 chars, Legacy tab)

### Server-only (NO VITE_ prefix, never exposed to browser)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIza...
DATAFORSEO_LOGIN=syvillegacutan@gmail.com
DATAFORSEO_PASSWORD=... (see local .env, gitignored)

Important: The Supabase anon key must be exactly 229 characters. If it is 208 characters in Railway the app will throw 401 errors on all Supabase operations.

Important: As of June 2026, all secret API keys are served through an Express backend proxy (server.js). They must NOT have the VITE_ prefix or they will be bundled into the frontend JS and exposed publicly.

---

## Supabase Tables

All tables have RLS enabled as of June 2026 with an "Allow authenticated access" policy (auth.role() = 'authenticated'). Service role key bypasses RLS. Do NOT disable RLS — it was a critical security vulnerability.

### Table: clients
Stores each agency client. Fields: id, name, location, niche, website, keywords (jsonb), color, ghl_connected, created_at.

### Table: keywords
Stores active keywords per client. Fields: id, client_id, keyword, is_active, source, search_volume, created_at. Has unique constraint on (client_id, keyword).

### Table: questions
Stores detected questions from Reddit, Quora, PAA. Fields: id, client_id, platform, source, question_text, relevance_score, status (new/draft/posted), source_url, meta_info (jsonb), draft_answer, created_at, updated_at.

### Table: aeo_scores
Stores AEO tracking results. Fields: id, client_id, platform, score, checked_at.

### Table: client_credentials
Stores client social media credentials encrypted. Fields: id, client_id, platform, credential_key, credential_value, created_at, updated_at. Also used for private notes (platform = 'notes', credential_key = 'general_notes').

### Table: blog_posts
Stores written blog posts. Fields: id, client_id, title, keyword, content, word_count, status, inspired_by (jsonb), internal_links (jsonb), external_links (jsonb), created_at, updated_at.

### Table: blog_topic_suggestions
Stores suggested blog topics per client. Fields: id, client_id, title, keyword, intent, description, aeo_reason, written (boolean), created_at.

---

## App Features (Built and Deployed)

### Client Management
- Add clients with name, location, niche, website
- Edit client details (pencil icon in sidebar, hover to reveal)
- Delete client with confirmation (trash icon in sidebar, hover to reveal, cascade deletes all related data)
- Client avatar with color and initials auto-generated

### Keyword Management
- When adding a client, DataForSEO Keywords For Site API auto-suggests keywords by niche and location
- Keywords grouped into: service, location, question, intent categories
- Toggle keywords on/off, add own keywords manually, bulk add by pasting a list
- Keywords saved to Supabase and used in nightly scans

### Question Detection (Scan Engine)
- Scan Now button triggers DataForSEO SERP API
- Searches for keywords with site:reddit.com, site:quora.com, and Google PAA
- Questions filtered for freshness (under 6 months old) and relevance (must match client keywords)
- Platform badge on each card shows only the real source: Reddit, Quora, or PAA
- Duplicate prevention checks source_url before saving

### Question Dashboard
- Three sections: New Questions, Drafts, Posted, all collapsed by default
- Red badge on each client in sidebar shows count of new questions
- Each question card shows platform badge, relevance score, question text, source info, detected time
- View source link opens the real Reddit thread or Quora question in a new tab
- Delete button on every card with confirmation
- Clear all button per section

### Draft Generation
- Generate draft button calls Anthropic API (Haiku) with platform-specific tone
- Reddit: casual, under 80 words, sounds like a real community member
- Quora: slightly detailed, under 120 words
- PAA: FAQ schema-ready, under 80 words
- After draft is generated, shows one action button matching the real source
- Reddit question: Answer on Reddit opens the actual thread
- Quora question: Answer on Quora opens the actual question
- PAA question: Add to GHL site (Phase 2)
- Copy answer, Regenerate, Edit, Mark as posted buttons
- No em dashes, hyphens, or en dashes in any generated text, enforced in system prompt

### AEO Tracking
- Run AEO Check button sends 3 niche questions to each AI platform
- What are the best [niche] services in [location]?
- Who do you recommend for [niche] near [location]?
- Can you suggest a good [niche] provider in [location]?
- Checks ChatGPT (GPT-4o mini), Gemini (gemini-1.5-flash), Claude (claude-haiku-4-5)
- Shows Mentioned (green) or Not mentioned (red) badge per platform
- Saves results to aeo_scores table with timestamp
- Shows the actual AI response text

### Client Credentials Storage
- Credentials tab per client stores Reddit, Quora, and AnswerClub account details
- Fields: username, password (masked with show/hide toggle), subreddit preferences, Chrome profile name
- Credentials encrypted with AES before saving to Supabase
- Private notes section at the bottom, auto-saves with debounce, shows Saved confirmation
- Notes persist across sessions

### Content Engine (Blog Writer)
- Suggest blog topics sends all detected questions to Claude and returns 5 topic cards
- Each card shows title, keyword badge, intent badge (informational/commercial/local), description, AEO visibility note
- Topics saved to blog_topic_suggestions table, persist permanently until manually deleted
- X button on each card to delete that topic (with confirmation)
- Add 5 more topics button adds new topics without replacing existing ones
- Green Written badge on cards where blog has been written, persists in Supabase
- Write this blog button calls Claude Sonnet 4.6 with full system prompt
- Minimum 1,200 words
- H1/H2/H3 heading structure
- Natural conversational tone, mentions business name 3 to 4 times
- FAQ section at bottom based on real questions
- No em dashes or hyphens in prose
- Local call to action at the end
- Blog preview appears below topic cards, topics never disappear automatically
- Word count indicator turns green at 1,200+ words
- Internal link suggester: paste sitemap URL or XML to get anchor text suggestions
- External link suggester auto-populates from source_url of questions that inspired the topic
- Save draft to Supabase, copy as markdown, download as Word .docx

---

## Clients Currently in the App

### Precision K9 Shaping
- Location: Denham Springs, LA 70726
- Niche: Dog Training and Boarding Services
- Website: precisionk9shaping.com
- Keywords: 20 active
- Questions: 8 new detected

### Automations Club
- Location: Baton Rouge, Louisiana
- Niche: AI and business automation
- Website: automationsclub.com
- Questions: 31 new detected
- Contact: Derrick Reeves (founder)

---

## Deployment Process

Any change made locally on the PC or laptop gets deployed to Railway by running:

git add .
git commit -m "describe the change"
git push origin main

Railway auto-detects the push and redeploys in about 2 minutes. No manual steps needed.

To work from the laptop, clone the repo first:

git clone https://github.com/syvillegacutan/aeo-hub.git
cd aeo-hub
npm install

Then create a .env file with all the environment variables listed above. Run npm run dev to start locally.

Always run git pull origin main before starting work on any machine to get the latest version.

---

## Known Issues and Fixes

### Supabase 401 errors
Cause: VITE_SUPABASE_ANON_KEY in Railway is truncated (208 chars instead of 229).
Fix: Get the full Legacy anon key from Supabase Settings > API Keys > Legacy tab and paste the complete key into Railway Variables.

### Supabase RLS errors (new row violates row-level security policy)
Cause: RLS is enabled and the request doesn't meet the policy requirements.
Fix: Ensure the request is made with an authenticated user session, or use the service role key for backend operations. Do NOT disable RLS.

### DataForSEO scan returning no questions
Cause 1: Location format invalid (40501 error). Use location_code 2840 (United States) instead of a location name string.
Cause 2: Sending multiple tasks at once (40000 error). Send one keyword per API call with a 1 second delay between each.
Fix: Updated scan function sends one keyword at a time with delay, uses location_code not location_name.

### Blank white page in browser
Cause: Multiple old Node server instances running on ports 5173 to 5177.
Fix: Run npx kill-port 5173 5174 5175 5176 5177 or close VS Code completely and restart.

### Blog writer model error
Cause: Invalid model string in anthropic.js.
Fix: Use claude-sonnet-4-6 for blog writing and claude-haiku-4-5-20251001 for draft generation.

### Gemini API 404
Cause: Wrong endpoint format.
Fix: Use https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}

---

## Planned Features (Not Yet Built)

- Automated nightly scan scheduler (Supabase Edge Function running on cron)
- Email notifications via Resend when new questions are detected
- Go High Level API integration for auto-publishing FAQ content to client sites
- Perplexity API tracking (requires $50 minimum deposit, deferred)
- Scheduled AEO checks (currently manual via Run AEO Check button)

---

## DataForSEO API Notes

- Login: syvillegacutan@gmail.com
- Authentication: Basic auth using Buffer.from(login + ":" + password).toString('base64'), NOT a single API key
- In .env use DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD (no VITE_ prefix — server-only)
- Frontend calls /api/dataforseo/* which the Express proxy forwards to https://api.dataforseo.com/v3/*
- Request body must be an array with one task object
- Extract items where type === people_also_ask from result[0].items

---

## Writing Rules (Apply to All AI-Generated Content)

These rules are enforced in every Anthropic API system prompt throughout the app:

- Never use em dashes, en dashes, or hyphens in prose
- All writing must sound human, natural, and conversational
- No marketing language or robotic phrasing
- Mention client business name naturally, not repeatedly
- Always include location context for local SEO relevance

---

## How to Continue Building This Project

When starting a new Claude conversation about this project, share this file and say: I am continuing to build the AEO Hub app, here is the full project context. Claude will have everything needed to help without re-explaining the whole setup.

For Claude Code sessions, always start from the aeo-hub folder and type claude to open Claude Code. Use plain English to describe what you want to change. After changes are made, push to GitHub and Railway auto-deploys.
