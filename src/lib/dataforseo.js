import axios from 'axios'

const BASE = '/api/dataforseo'

function cleanDomain(website) {
  return website.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]
}

// ─── Keyword suggestions ─────────────────────────────────────────────────────

export async function getKeywordsForSite(website) {
  const domain = cleanDomain(website)
  const { data } = await axios.post(
    `${BASE}/keywords_data/google/keywords_for_site/live`,
    [{ target: domain, language_name: 'English', location_name: 'United States', limit: 50 }],
  )
  const results = data?.tasks?.[0]?.result || []
  return results
    .filter((r) => r.keyword && r.search_volume > 0)
    .sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0))
    .map((r) => ({ keyword: r.keyword, search_volume: r.search_volume || 0, source: 'suggested', is_active: true }))
}

// ─── SERP scan ───────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function serpRequest(keyword) {
  const url = `${BASE}/serp/google/organic/live/advanced`
  const body = [
    {
      keyword,
      location_code: 2840,
      language_code: 'en',
      device: 'desktop',
      os: 'windows',
      depth: 10,
    },
  ]

  console.log(`[DFS] POST ${url}`)
  console.log(`[DFS] Body:`, JSON.stringify(body))

  let resp
  try {
    resp = await axios.post(url, body)
  } catch (err) {
    const detail = err?.response?.data ?? err.message
    console.error(`[DFS] HTTP error for "${keyword}":`, JSON.stringify(detail))
    throw new Error(`DataForSEO HTTP error: ${JSON.stringify(detail)}`)
  }

  const data = resp.data
  console.log(`[DFS] ── FULL RAW RESPONSE for "${keyword}" ──`)
  console.log(JSON.stringify(data, null, 2))

  const task = data?.tasks?.[0]
  if (!task) throw new Error('DataForSEO returned no tasks')

  if (task.status_code !== 20000) {
    throw new Error(`DataForSEO task error ${task.status_code}: ${task.status_message}`)
  }

  const items = task?.result?.[0]?.items ?? []
  console.log(`[DFS] "${keyword}" → ${items.length} items, types:`, [...new Set(items.map((i) => i.type))])
  return items
}

function paaFromItems(items, kw) {
  const out = []
  for (const item of items) {
    if (item.type === 'people_also_ask') {
      const subItems = item.items ?? []
      console.log(`[DFS] PAA block for "${kw.keyword}": ${subItems.length} sub-item(s)`)
      for (const el of subItems) {
        if (el.title) {
          out.push({
            platform: 'paa',
            question_text: el.title.trim(),
            source_url: el.url ?? '',
            relevance_score: 85,
            meta_info: { keyword: kw.keyword, type: 'paa' },
          })
        }
      }
    }
    if (item.type === 'people_also_ask_element' && item.title) {
      out.push({
        platform: 'paa',
        question_text: item.title.trim(),
        source_url: item.url ?? '',
        relevance_score: 85,
        meta_info: { keyword: kw.keyword, type: 'paa' },
      })
    }
  }
  console.log(`[DFS] PAA extracted for "${kw.keyword}":`, out.length)
  return out
}

function redditFromItems(items, kw) {
  const isQ = (t) =>
    t.endsWith('?') ||
    /^(how|what|why|when|where|who|which|can|does|do|is|are|should|would|could)\b/i.test(t)
  const out = []
  for (const item of items) {
    if (item.type !== 'organic') continue
    if (!item.url?.includes('reddit.com')) continue
    const title = (item.title ?? '').trim()
    if (!isQ(title)) continue
    out.push({
      platform: 'reddit',
      question_text: title.replace(/\s*[-|]\s*Reddit.*/i, '').trim(),
      source_url: item.url,
      relevance_score: Math.floor(Math.random() * 20) + 68,
      meta_info: { keyword: kw.keyword, description: item.description ?? '' },
    })
  }
  console.log(`[DFS] Reddit extracted for "${kw.keyword}":`, out.length)
  return out
}

// ─── Public export ────────────────────────────────────────────────────────────

export async function scanForQuestions(keywords) {
  const active = keywords.filter((k) => k.is_active).slice(0, 5)
  if (!active.length) return []

  console.log(`[DFS] Starting scan for ${active.length} keyword(s)`)
  const questions = []

  for (let i = 0; i < active.length; i++) {
    const kw = active[i]
    if (i > 0) await sleep(1000)

    // PAA + Reddit from main SERP
    console.log(`[DFS] ── Keyword ${i + 1}/${active.length}: "${kw.keyword}" ──`)
    try {
      const items = await serpRequest(kw.keyword)
      questions.push(...paaFromItems(items, kw))
      questions.push(...redditFromItems(items, kw))
    } catch (err) {
      console.error(`[DFS] Scan failed for "${kw.keyword}":`, err.message)
    }

    await sleep(1000)

    // Reddit-targeted SERP
    console.log(`[DFS] Reddit pass for "${kw.keyword}"`)
    try {
      const items = await serpRequest(`${kw.keyword} reddit`)
      questions.push(...redditFromItems(items, kw))
    } catch (err) {
      console.warn(`[DFS] Reddit pass failed for "${kw.keyword}":`, err.message)
    }
  }

  console.log(`[DFS] Total before dedup: ${questions.length}`)

  const seen = new Set()
  const deduped = questions.filter((q) => {
    const k = q.question_text.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  console.log(`[DFS] Final count after dedup: ${deduped.length}`)
  console.log(`[DFS] Questions:`, deduped.map((q) => `[${q.platform}] ${q.question_text}`))
  return deduped
}
