import axios from 'axios'
import { supabase } from './supabase'

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
const OPENAI_KEY    = import.meta.env.VITE_OPENAI_API_KEY
const GEMINI_KEY    = import.meta.env.VITE_GEMINI_API_KEY

const OPENAI_BASE  = import.meta.env.DEV ? '/openai' : 'https://api.openai.com'
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com'

export function buildQuestions(client) {
  const niche    = client.niche    || 'service'
  const location = client.location || 'your area'
  return [
    `What are the best ${niche} services in ${location}?`,
    `Who do you recommend for ${niche} near ${location}?`,
    `Can you suggest a good ${niche} provider in ${location}?`,
  ]
}

function mentionsClient(text, clientName) {
  return text.toLowerCase().includes(clientName.toLowerCase())
}

async function askClaude(question) {
  const { data } = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: question }],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    }
  )
  return data.content[0].text
}

async function askChatGPT(question) {
  const { data } = await axios.post(
    `${OPENAI_BASE}/v1/chat/completions`,
    {
      model: 'gpt-4o-mini',
      max_tokens: 500,
      messages: [{ role: 'user', content: question }],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
    }
  )
  return data.choices[0].message.content
}

async function askGemini(question) {
  const { data } = await axios.post(
    `${GEMINI_BASE}/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      contents: [{ parts: [{ text: question }] }],
      generationConfig: { maxOutputTokens: 500 },
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
  return data.candidates[0].content.parts[0].text
}

const ASKERS = {
  claude:  askClaude,
  chatgpt: askChatGPT,
  gemini:  askGemini,
}

// Runs 3 questions against one platform, saves result to Supabase, returns details.
export async function runPlatformCheck(platformKey, client) {
  const questions  = buildQuestions(client)
  const ask        = ASKERS[platformKey]
  const responses  = []
  let mentionCount = 0

  for (const question of questions) {
    try {
      const text      = await ask(question)
      const mentioned = mentionsClient(text, client.name)
      if (mentioned) mentionCount++
      responses.push({ question, text, mentioned, error: null })
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || 'Request failed'
      responses.push({ question, text: null, mentioned: false, error: msg })
    }
  }

  const score      = Math.round((mentionCount / questions.length) * 100)
  const checked_at = new Date().toISOString()

  // Persist to Supabase — non-fatal if RLS blocks it
  const { error: saveError } = await supabase.from('aeo_scores').insert({
    client_id: client.id,
    platform:  platformKey,
    score,
    checked_at,
  })
  if (saveError) console.warn('[aeo] Supabase save failed:', saveError.message)

  return { score, responses, checked_at, mentioned: mentionCount > 0 }
}
