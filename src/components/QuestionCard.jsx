import { useState } from 'react'
import { generateAnswer } from '../lib/anthropic'

function detectPlatform(sourceUrl) {
  if (!sourceUrl) return 'paa'
  if (sourceUrl.includes('reddit.com'))     return 'reddit'
  if (sourceUrl.includes('quora.com'))      return 'quora'
  if (sourceUrl.includes('answerclub.com')) return 'answerclub'
  return 'paa'
}

function viewSourceUrl(question) {
  if (question.source_url) return question.source_url
  return `https://www.google.com/search?q=${encodeURIComponent(question.question_text)}`
}

const SOURCE_PLATFORM = {
  reddit:     { label: 'Reddit',     badge: 'bg-orange-500/15 text-orange-400 border border-orange-500/25', bar: 'bg-orange-500'  },
  quora:      { label: 'Quora',      badge: 'bg-rose-500/15 text-rose-400 border border-rose-500/25',       bar: 'bg-rose-500'    },
  answerclub: { label: 'AnswerClub', badge: 'bg-purple-500/15 text-purple-400 border border-purple-500/25', bar: 'bg-purple-500'  },
  paa:        { label: 'PAA',        badge: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',       bar: 'bg-blue-500'    },
}

const ANSWER_PLATFORMS = [
  { key: 'reddit',     label: 'Reddit',     hint: 'Casual · ≤80 words',    maxWords: 80  },
  { key: 'quora',      label: 'Quora',      hint: 'Detailed · ≤120 words', maxWords: 120 },
  { key: 'answerclub', label: 'AnswerClub', hint: 'Clear · ≤100 words',    maxWords: 100 },
]

const ANSWER_BUTTON_LABEL = {
  reddit:     'Answer on Reddit',
  quora:      'Answer on Quora',
  answerclub: 'Answer on AnswerClub',
  paa:        'Add to GHL site',
}

function relevanceMeta(score) {
  if (score >= 80) return { label: `${score}% match`, cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' }
  if (score >= 60) return { label: `${score}% match`, cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25' }
  return { label: `${score}% match`, cls: 'bg-slate-500/15 text-slate-400 border border-slate-500/25' }
}

function wordCount(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0
}

function timeAgo(iso) {
  if (!iso) return ''
  const date = new Date(iso.replace(/(\.\d{3})\d+/, '$1'))
  if (isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const BTN_OUTLINE = 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#30363D] text-[#8B949E] hover:border-[#6E7681] hover:text-white bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const BTN_PRIMARY = 'flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#179967] disabled:opacity-60 disabled:cursor-not-allowed transition-colors'

export default function QuestionCard({ question, client, onUpdate, onDelete, onToast }) {
  const detectedPlatform = detectPlatform(question.source_url)
  const src = SOURCE_PLATFORM[detectedPlatform] || SOURCE_PLATFORM.paa

  const [generating, setGenerating]   = useState(false)
  const [error, setError]             = useState(null)
  const [editing, setEditing]         = useState(false)
  const [draftText, setDraftText]     = useState(question.draft_answer || '')
  const [copied, setCopied]           = useState(null)
  const [confirming, setConfirming]   = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [clearingDraft, setClearingDraft] = useState(false)
  const [targetPlatform, setTargetPlatform] = useState(
    question.meta_info?.target_platform ||
    (detectedPlatform !== 'paa' ? detectedPlatform : null)
  )
  const [showPostMenu, setShowPostMenu] = useState(false)

  const ansPlat  = ANSWER_PLATFORMS.find(p => p.key === (targetPlatform || question.meta_info?.target_platform))
  const wc       = wordCount(draftText)
  const maxWords = ansPlat?.maxWords || 100
  const rel      = relevanceMeta(question.relevance_score)

  async function handleGenerate() {
    if (!targetPlatform) return
    setGenerating(true)
    setError(null)
    try {
      const answer = await generateAnswer(question.question_text, targetPlatform, client)
      setDraftText(answer)
      await onUpdate(question.id, {
        draft_answer: answer,
        status: 'draft',
        meta_info: { ...question.meta_info, target_platform: targetPlatform },
      })
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Failed to generate. Check your API key.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleOpenAndCopy() {
    try { await navigator.clipboard.writeText(draftText) } catch {}
    setCopied('answer')
    setTimeout(() => setCopied(null), 2500)
    const url = viewSourceUrl(question)
    if (detectedPlatform !== 'paa' && url) window.open(url, '_blank', 'noopener,noreferrer')
    onToast?.(`Answer copied${detectedPlatform !== 'paa' ? ' + source opened!' : '!'}`)
  }

  async function handleCopyAnswer() {
    try { await navigator.clipboard.writeText(draftText) } catch {}
    setCopied('text')
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleSaveDraft() {
    await onUpdate(question.id, { draft_answer: draftText })
    setEditing(false)
  }

  async function handlePost(platformKey) {
    await onUpdate(question.id, {
      status: 'posted',
      draft_answer: draftText,
      meta_info: { ...question.meta_info, posted_platform: platformKey, posted_at: new Date().toISOString() },
    })
    setShowPostMenu(false)
  }

  async function handleDeleteConfirm() {
    setDeleting(true)
    try {
      await onDelete(question.id)
    } catch (e) {
      setDeleting(false)
      setConfirming(false)
      alert('Failed to delete: ' + (e?.message || 'unknown error'))
    }
  }

  async function handleClearDraft() {
    setClearingDraft(true)
    try {
      await onUpdate(question.id, {
        status: 'new',
        draft_answer: '',
        meta_info: { ...question.meta_info, target_platform: null },
      })
    } catch (e) {
      alert('Failed to clear draft: ' + (e?.message || 'unknown error'))
    } finally {
      setClearingDraft(false)
    }
  }

  async function handleMoveToNew() {
    try {
      await onUpdate(question.id, { status: 'new' })
    } catch (e) {
      alert('Failed to move: ' + (e?.message || 'unknown error'))
    }
  }

  const postedLabel = question.meta_info?.posted_platform
    ? ANSWER_PLATFORMS.find(p => p.key === question.meta_info.posted_platform)?.label || question.meta_info.posted_platform
    : null

  return (
    <div className="relative bg-[#161B22] border border-[#21262D] rounded-xl overflow-hidden hover:border-[#30363D] transition-colors group">
      {/* Source color bar */}
      <div className={`h-0.5 ${src.bar}`} />

      {/* Trash icon — all cards, hover-reveal */}
      {onDelete && !confirming && (
        <button
          onClick={() => setConfirming(true)}
          title="Delete question"
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-[#6E7681] hover:text-red-400 hover:bg-red-500/10 transition-all z-10"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      )}

      {/* Inline delete confirmation overlay */}
      {confirming && (
        <div className="absolute inset-0 bg-[#161B22]/92 z-20 flex items-end p-4">
          <div className="w-full bg-[#1C2333] border border-[#30363D] rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-[#C9D1D9]">Delete this question?</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="px-3 py-1.5 text-xs rounded-md text-[#8B949E] hover:text-white bg-[#21262D] hover:bg-[#30363D] transition-colors disabled:opacity-50"
              >
                No
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-3 py-1.5 text-xs rounded-md text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${src.badge}`}>
              {src.label}
            </span>
            <a
              href={viewSourceUrl(question)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#6E7681] hover:text-[#1D9E75] transition-colors flex items-center gap-1"
            >
              View source
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${rel.cls}`}>
              {rel.label}
            </span>
            {(question.status === 'draft' || question.status === 'posted') && ansPlat && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20">
                → {ansPlat.label}
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#6E7681] whitespace-nowrap flex-shrink-0 mt-0.5">
            {timeAgo(question.detected_at)}
          </span>
        </div>

        {/* Question */}
        <p className="text-[#C9D1D9] text-[15px] font-medium leading-snug mb-3">
          {question.question_text}
        </p>

        {/* Meta row */}
        {question.meta_info?.keyword && (
          <div className="flex items-center gap-3 text-[11px] text-[#6E7681] mb-4">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              {question.meta_info.keyword}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Draft / Posted text */}
        {draftText && (question.status === 'draft' || question.status === 'posted') && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#6E7681] uppercase tracking-wider">
                {question.status === 'posted' ? 'Posted Answer' : 'Draft Answer'}
              </span>
              <span className={`text-[10px] ${wc > maxWords ? 'text-amber-400' : 'text-[#6E7681]'}`}>
                {wc} / {maxWords} words
              </span>
            </div>
            {editing ? (
              <textarea
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                rows={5}
                className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#1D9E75] rounded-lg px-3 py-2.5 text-[13px] text-[#C9D1D9] leading-relaxed resize-none outline-none transition-colors"
              />
            ) : (
              <div className="bg-[#0D1117] border border-[#1C2333] rounded-lg px-3 py-2.5 text-[13px] text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                {draftText}
              </div>
            )}
          </div>
        )}

        {/* ── NEW ─────────────────────────────────────────────────────── */}
        {question.status === 'new' && (
          <div className="space-y-3">
            {detectedPlatform === 'paa' ? (
              <div>
                <p className="text-[11px] text-[#6E7681] mb-2">Where will you post this answer?</p>
                <div className="flex gap-2">
                  {ANSWER_PLATFORMS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setTargetPlatform(p.key)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                        targetPlatform === p.key
                          ? 'border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]'
                          : 'border-[#30363D] text-[#6E7681] hover:border-[#6E7681] hover:text-[#8B949E]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {targetPlatform && (
                  <p className="text-[10px] text-[#6E7681] mt-1.5 italic">
                    {ANSWER_PLATFORMS.find(p => p.key === targetPlatform)?.hint}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-[#6E7681] italic">
                {ANSWER_PLATFORMS.find(p => p.key === detectedPlatform)?.hint}
              </p>
            )}

            <button onClick={handleGenerate} disabled={generating || !targetPlatform} className={BTN_PRIMARY}>
              {generating ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  {targetPlatform
                    ? `Generate Draft for ${ANSWER_PLATFORMS.find(p => p.key === targetPlatform)?.label || targetPlatform}`
                    : 'Generate Draft'}
                </>
              )}
            </button>
          </div>
        )}

        {/* ── DRAFT ───────────────────────────────────────────────────── */}
        {question.status === 'draft' && (
          <div className="flex flex-col gap-2">
            {/* Single answer button */}
            <button
              onClick={handleOpenAndCopy}
              className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${
                copied === 'answer'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#1D9E75]/50 hover:text-[#1D9E75] hover:bg-[#1D9E75]/5'
              }`}
            >
              {copied === 'answer' ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  {ANSWER_BUTTON_LABEL[detectedPlatform] || 'Answer'}
                </>
              )}
            </button>

            {/* Secondary row */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleCopyAnswer} className={BTN_OUTLINE}>
                {copied === 'text' ? (
                  <span className="text-emerald-400">Copied!</span>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    Copy
                  </>
                )}
              </button>

              {editing ? (
                <>
                  <button onClick={handleSaveDraft} className={BTN_OUTLINE + ' border-[#1D9E75]/50 text-[#1D9E75] hover:border-[#1D9E75]'}>
                    Save
                  </button>
                  <button onClick={() => { setEditing(false); setDraftText(question.draft_answer || '') }} className={BTN_OUTLINE}>
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className={BTN_OUTLINE}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                  Edit
                </button>
              )}

              <button onClick={handleGenerate} disabled={generating} className={BTN_OUTLINE}>
                <svg className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                {generating ? 'Regenerating…' : 'Regenerate'}
              </button>

              {/* Clear draft — resets to New */}
              <button
                onClick={handleClearDraft}
                disabled={clearingDraft}
                className={BTN_OUTLINE + ' border-amber-500/20 text-amber-500/60 hover:border-amber-500/40 hover:text-amber-400'}
              >
                {clearingDraft ? 'Clearing…' : 'Clear draft'}
              </button>

              {/* Mark as posted */}
              <div className="ml-auto relative">
                <button
                  onClick={() => setShowPostMenu(v => !v)}
                  className={BTN_OUTLINE + ' border-[#1D9E75]/30 text-[#1D9E75] hover:border-[#1D9E75] hover:bg-[#1D9E75]/10'}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Mark as posted
                </button>
                {showPostMenu && (
                  <div className="absolute bottom-full right-0 mb-1 z-20 bg-[#1C2333] border border-[#30363D] rounded-lg shadow-xl overflow-hidden min-w-[160px]">
                    <p className="text-[10px] text-[#6E7681] uppercase tracking-wide px-3 pt-2.5 pb-1">Posted on…</p>
                    {ANSWER_PLATFORMS.map(p => (
                      <button key={p.key} onClick={() => handlePost(p.key)} className="w-full text-left px-3 py-2 text-sm text-[#C9D1D9] hover:bg-[#21262D] transition-colors">
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── POSTED ──────────────────────────────────────────────────── */}
        {question.status === 'posted' && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Posted{postedLabel ? ` on ${postedLabel}` : ''}
            </span>
            <button onClick={handleMoveToNew} className={BTN_OUTLINE + ' text-[#6E7681]'}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              Move back to New
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
