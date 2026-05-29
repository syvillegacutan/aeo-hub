import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { suggestBlogTopics, writeBlogPost, suggestInternalLinks } from '../lib/anthropic'

// ── Helpers ─────────────────────────────────────────────────────────────────

function countWords(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0
}

function parseSitemap(xml) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const locs = Array.from(doc.querySelectorAll('loc'))
    return locs.map(loc => ({ url: loc.textContent.trim() }))
  } catch {
    return []
  }
}

function downloadAsWord(content, title) {
  const lines = content.split('\n')
  const htmlLines = lines.map(line => {
    if (line.startsWith('# '))   return `<h1 style="font-size:18pt;margin-top:12pt">${line.slice(2)}</h1>`
    if (line.startsWith('## '))  return `<h2 style="font-size:14pt;margin-top:10pt">${line.slice(3)}</h2>`
    if (line.startsWith('### ')) return `<h3 style="font-size:12pt;margin-top:8pt">${line.slice(4)}</h3>`
    if (line.trim() === '')       return '<p>&nbsp;</p>'
    const html = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
    return `<p style="margin:6pt 0;line-height:1.6">${html}</p>`
  })

  const doc = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
    xmlns:w='urn:schemas-microsoft-com:office:word'
    xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'><title>${title}</title>
  <style>body{font-family:Calibri,sans-serif;font-size:11pt}</style></head>
  <body>${htmlLines.join('')}</body></html>`

  const blob = new Blob([doc], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 60)}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Blog preview renderer ────────────────────────────────────────────────────

function BlogPreview({ content }) {
  const lines = content.split('\n')
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-white text-xl font-bold mt-6 mb-2 first:mt-0 leading-snug">{line.slice(2)}</h1>
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-[#C9D1D9] text-base font-semibold mt-5 mb-1.5 leading-snug">{line.slice(3)}</h2>
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-[#C9D1D9] text-sm font-semibold mt-4 mb-1 leading-snug">{line.slice(4)}</h3>
        }
        if (line.trim() === '') return <div key={i} className="h-3" />
        const parts = line.split(/(\*\*[^*]+\*\*)/g)
        return (
          <p key={i} className="text-[#8B949E] text-[13px] leading-relaxed">
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j} className="text-[#C9D1D9] font-semibold">{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        )
      })}
    </div>
  )
}

// ── Intent badge styles ──────────────────────────────────────────────────────

const INTENT_CLS = {
  informational: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  commercial:    'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  local:         'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
}

function intentCls(intent) {
  return INTENT_CLS[(intent || '').toLowerCase()] || INTENT_CLS.informational
}

// ── Topic Card ───────────────────────────────────────────────────────────────

function TopicCard({ topic, onWrite, writing }) {
  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5 hover:border-[#30363D] transition-colors flex flex-col">
      <h3 className="text-white font-semibold text-[15px] leading-snug mb-3 flex-1">{topic.title}</h3>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20">
          {topic.keyword}
        </span>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md capitalize ${intentCls(topic.intent)}`}>
          {topic.intent}
        </span>
      </div>

      <p className="text-[#8B949E] text-sm leading-relaxed mb-3">{topic.description}</p>

      <div className="bg-[#0D1117] border border-[#1C2333] rounded-lg px-3 py-2.5 mb-4">
        <p className="text-[11px] font-semibold text-[#1D9E75] uppercase tracking-wide mb-1">AEO Visibility</p>
        <p className="text-[#6E7681] text-xs leading-relaxed">{topic.aeo_reason}</p>
      </div>

      <button
        onClick={() => onWrite(topic)}
        disabled={writing}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#179967] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
        </svg>
        Write this blog
      </button>
    </div>
  )
}

// ── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ className = '' }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ── Section divider ──────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <h3 className="text-white font-semibold text-sm">{title}</h3>
      {subtitle && <span className="text-[#6E7681] text-xs">{subtitle}</span>}
    </div>
  )
}

// ── Main ContentEngine ───────────────────────────────────────────────────────

export default function ContentEngine({ client, questions }) {
  // Topic suggestion
  const [topics, setTopics]                   = useState([])
  const [suggestingTopics, setSuggestingTopics] = useState(false)
  const [topicsError, setTopicsError]         = useState(null)

  // Blog writing
  const [selectedTopic, setSelectedTopic]     = useState(null)
  const [writingBlog, setWritingBlog]         = useState(false)
  const [blogContent, setBlogContent]         = useState('')
  const [blogError, setBlogError]             = useState(null)

  // Sitemap / internal links
  const [sitemapMode, setSitemapMode]         = useState('url')
  const [sitemapUrl, setSitemapUrl]           = useState('')
  const [sitemapInput, setSitemapInput]       = useState('')
  const [sitemapPages, setSitemapPages]       = useState([])
  const [fetchingSitemap, setFetchingSitemap] = useState(false)
  const [sitemapError, setSitemapError]       = useState(null)
  const [internalLinks, setInternalLinks]     = useState([])
  const [suggestingLinks, setSuggestingLinks] = useState(false)
  const [linksError, setLinksError]           = useState(null)

  // Save / export
  const [saving, setSaving]                   = useState(false)
  const [savedId, setSavedId]                 = useState(null)
  const [copiedMarkdown, setCopiedMarkdown]   = useState(false)
  const [copiedItem, setCopiedItem]           = useState(null)

  const fileInputRef = useRef(null)

  // External links from question source URLs
  const externalLinks = questions
    .filter(q => q.source_url)
    .map(q => ({ url: q.source_url, question: q.question_text, platform: q.platform }))
    .slice(0, 10)

  // ── Topic suggestion ───────────────────────────────────────────────────────

  async function handleSuggestTopics() {
    setSuggestingTopics(true)
    setTopicsError(null)
    setTopics([])
    setSelectedTopic(null)
    setBlogContent('')
    try {
      const result = await suggestBlogTopics(client, questions)
      setTopics(result)
    } catch (e) {
      setTopicsError(e?.response?.data?.error?.message || e?.message || 'Failed to get suggestions')
    } finally {
      setSuggestingTopics(false)
    }
  }

  // ── Blog writing ───────────────────────────────────────────────────────────

  async function handleWriteBlog(topic) {
    setSelectedTopic(topic)
    setWritingBlog(true)
    setBlogContent('')
    setBlogError(null)
    setSavedId(null)
    setInternalLinks([])
    setSitemapPages([])
    setSitemapUrl('')
    setSitemapInput('')
    setSitemapError(null)
    try {
      const content = await writeBlogPost(topic, client, questions)
      setBlogContent(content)
    } catch (e) {
      setBlogError(e?.response?.data?.error?.message || e?.message || 'Failed to write blog post')
    } finally {
      setWritingBlog(false)
    }
  }

  // ── Sitemap loading ────────────────────────────────────────────────────────

  async function handleFetchSitemap() {
    if (!sitemapUrl.trim()) return
    setFetchingSitemap(true)
    setSitemapError(null)
    setSitemapPages([])
    try {
      const res = await fetch(sitemapUrl.trim())
      const xml = await res.text()
      const pages = parseSitemap(xml)
      if (!pages.length) throw new Error('No URLs found in sitemap')
      setSitemapPages(pages)
    } catch (e) {
      setSitemapError(
        e.message === 'Failed to fetch'
          ? 'Could not fetch sitemap (CORS blocked by browser). Try pasting the XML directly instead.'
          : e.message
      )
    } finally {
      setFetchingSitemap(false)
    }
  }

  function handleParseSitemapXml() {
    if (!sitemapInput.trim()) return
    const pages = parseSitemap(sitemapInput)
    if (!pages.length) {
      setSitemapError('No <loc> elements found in the pasted XML.')
      return
    }
    setSitemapError(null)
    setSitemapPages(pages)
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const xml = ev.target.result
      setSitemapInput(xml)
      const pages = parseSitemap(xml)
      if (!pages.length) {
        setSitemapError('No <loc> elements found in the file.')
      } else {
        setSitemapError(null)
        setSitemapPages(pages)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Internal link suggestions ─────────────────────────────────────────────

  async function handleSuggestInternalLinks() {
    if (!sitemapPages.length || !blogContent) return
    setSuggestingLinks(true)
    setLinksError(null)
    try {
      const suggestions = await suggestInternalLinks(blogContent, sitemapPages)
      setInternalLinks(suggestions)
    } catch (e) {
      setLinksError(e?.response?.data?.error?.message || e?.message || 'Failed to get link suggestions')
    } finally {
      setSuggestingLinks(false)
    }
  }

  // ── Save / export ─────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    if (!blogContent || !selectedTopic) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('blog_posts').insert({
        client_id: client.id,
        title: selectedTopic.title,
        keyword: selectedTopic.keyword,
        content: blogContent,
        word_count: countWords(blogContent),
        status: 'draft',
        inspired_by: questions
          .filter(q => q.source_url)
          .map(q => ({ question: q.question_text, url: q.source_url })),
        internal_links: internalLinks,
        external_links: externalLinks,
      }).select().single()
      if (error) throw error
      setSavedId(data.id)
    } catch (e) {
      alert('Failed to save: ' + (e?.message || 'unknown error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleCopyMarkdown() {
    try { await navigator.clipboard.writeText(blogContent) } catch {}
    setCopiedMarkdown(true)
    setTimeout(() => setCopiedMarkdown(false), 2500)
  }

  async function handleCopyItem(text) {
    try { await navigator.clipboard.writeText(text) } catch {}
    setCopiedItem(text)
    setTimeout(() => setCopiedItem(null), 2000)
  }

  const wc = countWords(blogContent)

  // ── Empty — no questions yet ───────────────────────────────────────────────

  if (!questions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-[#1D9E75]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <p className="text-[#C9D1D9] font-medium mb-1">No questions detected yet</p>
        <p className="text-[#6E7681] text-sm max-w-xs leading-relaxed">
          Go to the Questions tab and scan for questions first, then come back here to generate blog topics.
        </p>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold text-lg">Content Engine</h2>
          <p className="text-[#6E7681] text-sm mt-0.5">
            Generate SEO blog posts from {questions.length} detected question{questions.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <button
          onClick={handleSuggestTopics}
          disabled={suggestingTopics || writingBlog}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#179967] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {suggestingTopics ? (
            <><Spinner className="w-4 h-4" /> Analyzing questions…</>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Suggest blog topics
            </>
          )}
        </button>
      </div>

      {/* ── Topics error ───────────────────────────────────────────────────── */}
      {topicsError && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-lg text-red-400 text-sm">
          {topicsError}
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!suggestingTopics && !topics.length && !topicsError && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#21262D] rounded-2xl">
          <svg className="w-10 h-10 text-[#21262D] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <p className="text-[#6E7681] text-sm max-w-xs">
            Click <span className="text-[#C9D1D9] font-medium">Suggest blog topics</span> to generate 5 AI-powered blog ideas from your detected questions.
          </p>
        </div>
      )}

      {/* ── Topic Cards ────────────────────────────────────────────────────── */}
      {topics.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#6E7681] text-xs font-semibold uppercase tracking-wider">Blog Topics</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1D9E75]/15 text-[#1D9E75]">{topics.length}</span>
            <div className="flex-1 h-px bg-[#1C2333]" />
            <button
              onClick={handleSuggestTopics}
              disabled={suggestingTopics || writingBlog}
              className="text-xs text-[#6E7681] hover:text-[#1D9E75] transition-colors disabled:opacity-50"
            >
              Regenerate
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic, i) => (
              <TopicCard
                key={i}
                topic={topic}
                onWrite={handleWriteBlog}
                writing={writingBlog}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Blog Writer ───────────────────────────────────────────────────── */}
      {selectedTopic && (
        <div className="space-y-6">
          <div className="h-px bg-[#1C2333]" />

          {/* Blog heading */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-semibold text-[#6E7681] uppercase tracking-wider">Blog Post</span>
                {blogContent && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${wc >= 1200 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                    {wc.toLocaleString()} words
                  </span>
                )}
                {savedId && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-400">
                    Saved
                  </span>
                )}
              </div>
              <p className="text-white font-semibold text-base leading-snug">{selectedTopic.title}</p>
            </div>
            <button
              onClick={() => { setSelectedTopic(null); setBlogContent(''); setBlogError(null) }}
              className="flex-shrink-0 text-xs text-[#6E7681] hover:text-[#8B949E] transition-colors mt-1"
            >
              ← Back to topics
            </button>
          </div>

          {/* Writing loading */}
          {writingBlog && (
            <div className="flex flex-col items-center justify-center py-16 bg-[#161B22] border border-[#21262D] rounded-xl">
              <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[#C9D1D9] font-medium">Writing your blog post…</p>
              <p className="text-[#6E7681] text-sm mt-1">This takes about 20 to 30 seconds.</p>
            </div>
          )}

          {/* Blog error */}
          {blogError && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-lg text-red-400 text-sm">
              {blogError}
            </div>
          )}

          {/* Blog content + all actions */}
          {blogContent && !writingBlog && (
            <>
              {/* Preview */}
              <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-6 max-h-[600px] overflow-y-auto">
                <BlogPreview content={blogContent} />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Save draft */}
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || !!savedId}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    savedId
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default'
                      : 'border-[#1D9E75]/40 bg-[#1D9E75]/10 text-[#1D9E75] hover:bg-[#1D9E75]/15 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {saving ? (
                    <><Spinner className="w-3.5 h-3.5" /> Saving…</>
                  ) : savedId ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Saved to Supabase
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                      </svg>
                      Save draft
                    </>
                  )}
                </button>

                {/* Copy markdown */}
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#30363D] text-[#8B949E] hover:border-[#6E7681] hover:text-white transition-colors"
                >
                  {copiedMarkdown ? (
                    <><svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg><span className="text-emerald-400">Copied!</span></>
                  ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>Copy as markdown</>
                  )}
                </button>

                {/* Download Word */}
                <button
                  onClick={() => downloadAsWord(blogContent, selectedTopic.title)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#30363D] text-[#8B949E] hover:border-[#6E7681] hover:text-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download as Word
                </button>

                {/* Push to GHL — Phase 2 placeholder */}
                <button
                  disabled
                  title="Phase 2 — coming soon"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#1C2333] text-[#30363D] cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
                  </svg>
                  Push to GHL
                  <span className="text-[10px] text-[#21262D] font-medium">Phase 2</span>
                </button>
              </div>

              {/* ── Internal Link Suggester ──────────────────────────────────── */}
              <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5 space-y-4">
                <SectionHeader
                  icon={<svg className="w-4 h-4 text-[#1D9E75]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>}
                  title="Suggested Internal Links"
                />
                <p className="text-[#6E7681] text-xs">
                  Load your sitemap so Claude can suggest which existing pages to link from this blog post.
                </p>

                {/* Mode tabs */}
                <div className="flex gap-1 bg-[#0D1117] p-1 rounded-lg w-fit">
                  {[{ id: 'url', label: 'URL' }, { id: 'paste', label: 'Paste XML' }, { id: 'upload', label: 'Upload' }].map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSitemapMode(m.id); setSitemapError(null); setSitemapPages([]) }}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        sitemapMode === m.id ? 'bg-[#21262D] text-white' : 'text-[#6E7681] hover:text-[#8B949E]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* URL mode */}
                {sitemapMode === 'url' && (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://yoursite.com/sitemap.xml"
                      value={sitemapUrl}
                      onChange={e => setSitemapUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleFetchSitemap()}
                      className="flex-1 bg-[#0D1117] border border-[#30363D] focus:border-[#1D9E75] rounded-lg px-3 py-2 text-sm text-[#C9D1D9] placeholder-[#484F58] outline-none transition-colors"
                    />
                    <button
                      onClick={handleFetchSitemap}
                      disabled={fetchingSitemap || !sitemapUrl.trim()}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-[#30363D] text-[#8B949E] hover:border-[#1D9E75] hover:text-[#1D9E75] disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {fetchingSitemap ? 'Loading…' : 'Load'}
                    </button>
                  </div>
                )}

                {/* Paste XML mode */}
                {sitemapMode === 'paste' && (
                  <div className="space-y-2">
                    <textarea
                      placeholder="Paste your sitemap XML here…"
                      value={sitemapInput}
                      onChange={e => setSitemapInput(e.target.value)}
                      rows={5}
                      className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#1D9E75] rounded-lg px-3 py-2 text-xs text-[#C9D1D9] placeholder-[#484F58] outline-none transition-colors font-mono resize-none"
                    />
                    <button
                      onClick={handleParseSitemapXml}
                      disabled={!sitemapInput.trim()}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-[#30363D] text-[#8B949E] hover:border-[#1D9E75] hover:text-[#1D9E75] disabled:opacity-50 transition-colors"
                    >
                      Parse XML
                    </button>
                  </div>
                )}

                {/* Upload mode */}
                {sitemapMode === 'upload' && (
                  <>
                    <input ref={fileInputRef} type="file" accept=".xml" onChange={handleFileUpload} className="hidden" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-dashed border-[#30363D] text-[#6E7681] hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      Upload sitemap.xml
                    </button>
                  </>
                )}

                {sitemapError && (
                  <p className="text-red-400 text-xs">{sitemapError}</p>
                )}

                {/* Pages loaded + suggest button */}
                {sitemapPages.length > 0 && (
                  <div>
                    <p className="text-[#6E7681] text-xs mb-3">
                      {sitemapPages.length} page{sitemapPages.length !== 1 ? 's' : ''} loaded.{' '}
                      <button
                        onClick={handleSuggestInternalLinks}
                        disabled={suggestingLinks}
                        className="text-[#1D9E75] hover:underline disabled:opacity-50"
                      >
                        {suggestingLinks ? 'Getting suggestions…' : 'Get link suggestions →'}
                      </button>
                    </p>

                    {linksError && (
                      <p className="text-red-400 text-xs mb-2">{linksError}</p>
                    )}

                    {suggestingLinks && (
                      <div className="flex items-center gap-2 text-[#6E7681] text-xs py-3">
                        <Spinner className="w-3.5 h-3.5" /> Analyzing blog content and sitemap…
                      </div>
                    )}

                    {internalLinks.length > 0 && (
                      <div className="space-y-2">
                        {internalLinks.map((link, i) => {
                          const copyKey = `int-${i}`
                          return (
                            <div key={i} className="flex items-start gap-3 bg-[#0D1117] border border-[#1C2333] rounded-lg px-3 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-[#C9D1D9] text-xs leading-relaxed">
                                  Link the phrase{' '}
                                  <span className="font-semibold text-white bg-[#1D9E75]/10 px-1 py-0.5 rounded">
                                    &ldquo;{link.anchor_text}&rdquo;
                                  </span>
                                  {' '}to{' '}
                                  <span className="text-[#1D9E75] break-all">{link.url}</span>
                                </p>
                                {link.reason && (
                                  <p className="text-[#6E7681] text-[11px] mt-1">{link.reason}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleCopyItem(copyKey === copiedItem ? '' : `<a href="${link.url}">${link.anchor_text}</a>`)}
                                className="flex-shrink-0 text-xs text-[#6E7681] hover:text-white transition-colors whitespace-nowrap"
                                title="Copy HTML link"
                              >
                                {copiedItem === `<a href="${link.url}">${link.anchor_text}</a>` ? (
                                  <span className="text-emerald-400">Copied!</span>
                                ) : 'Copy'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── External Link Suggester ──────────────────────────────────── */}
              {externalLinks.length > 0 && (
                <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5 space-y-4">
                  <SectionHeader
                    icon={<svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>}
                    title="Suggested External Links"
                  />
                  <p className="text-[#6E7681] text-xs">
                    Link to these community discussions as citations. This signals to AI engines that your content addresses real questions.
                  </p>

                  <div className="space-y-2">
                    {externalLinks.map((link, i) => {
                      const platformLabel =
                        link.platform === 'reddit' ? 'Reddit thread' :
                        link.platform === 'quora'  ? 'Quora question' :
                        'Discussion'
                      return (
                        <div key={i} className="flex items-start gap-3 bg-[#0D1117] border border-[#1C2333] rounded-lg px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-[#6E7681] text-xs mb-1">
                              Consider linking to this{' '}
                              <span className="text-purple-400 font-medium">{platformLabel}</span>:
                            </p>
                            <p className="text-[#C9D1D9] text-xs font-medium leading-snug mb-0.5">{link.question}</p>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-[#1D9E75] hover:underline truncate block"
                            >
                              {link.url}
                            </a>
                          </div>
                          <button
                            onClick={() => handleCopyItem(link.url)}
                            className="flex-shrink-0 text-xs text-[#6E7681] hover:text-white transition-colors whitespace-nowrap"
                          >
                            {copiedItem === link.url ? (
                              <span className="text-emerald-400">Copied!</span>
                            ) : 'Copy URL'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
