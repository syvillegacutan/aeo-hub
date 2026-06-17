import axios from 'axios'
import { supabase } from './supabase'

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
  const { data } = await axios.post('/api/anthropic/messages', {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: question }],
  })
  return data.content[0].text
}

async function askChatGPT(question) {
  const { data } = await axios.post('/api/openai/chat/completions', {
    model: 'gpt-4o-mini',
    max_tokens: 500,
    messages: [{ role: 'user', content: question }],
  })
  return data.choices[0].message.content
}

async function askGemini(question) {
  const { data } = await axios.post('/api/gemini/generate', {
    model: 'gemini-1.5-flash',
    contents: [{ parts: [{ text: question }] }],
    generationConfig: { maxOutputTokens: 500 },
  })
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

  // Persist to Supabase
  const { error: saveError } = await supabase.from('aeo_scores').insert({
    client_id: client.id,
    platform:  platformKey,
    score,
    checked_at,
  })
  if (saveError) console.warn('[aeo] Supabase save failed:', saveError.message)

  return {
    score,
    responses,
    checked_at,
    mentioned: mentionCount > 0,
    saveError: saveError ? saveError.message : null,
  }
}
