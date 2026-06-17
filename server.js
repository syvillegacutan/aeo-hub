import express from 'express'
import axios from 'axios'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 4173

app.use(express.json({ limit: '1mb' }))

// Serve the built frontend
app.use(express.static(join(__dirname, 'dist')))

// ─── Anthropic proxy ────────────────────────────────────────────────────────

app.post('/api/anthropic/messages', async (req, res) => {
  try {
    const { data } = await axios.post(
      'https://api.anthropic.com/v1/messages',
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      }
    )
    res.json(data)
  } catch (err) {
    const status = err?.response?.status || 500
    const detail = err?.response?.data || { error: err.message }
    res.status(status).json(detail)
  }
})

// ─── OpenAI proxy ───────────────────────────────────────────────────────────

app.post('/api/openai/chat/completions', async (req, res) => {
  try {
    const { data } = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    )
    res.json(data)
  } catch (err) {
    const status = err?.response?.status || 500
    const detail = err?.response?.data || { error: err.message }
    res.status(status).json(detail)
  }
})

// ─── Gemini proxy ───────────────────────────────────────────────────────────

app.post('/api/gemini/generate', async (req, res) => {
  try {
    const model = req.body.model || 'gemini-1.5-flash'
    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { contents: req.body.contents, generationConfig: req.body.generationConfig },
      { headers: { 'Content-Type': 'application/json' } }
    )
    res.json(data)
  } catch (err) {
    const status = err?.response?.status || 500
    const detail = err?.response?.data || { error: err.message }
    res.status(status).json(detail)
  }
})

// ─── DataForSEO proxy ───────────────────────────────────────────────────────

app.post('/api/dataforseo/*', async (req, res) => {
  try {
    const subpath = req.params[0] // everything after /api/dataforseo/
    const auth = Buffer.from(
      `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
    ).toString('base64')

    const { data } = await axios.post(
      `https://api.dataforseo.com/v3/${subpath}`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
      }
    )
    res.json(data)
  } catch (err) {
    const status = err?.response?.status || 500
    const detail = err?.response?.data || { error: err.message }
    res.status(status).json(detail)
  }
})

// ─── SPA fallback ───────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] AEO Hub running on port ${PORT}`)
})
