import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useQuestions } from '../hooks/useQuestions'
import { useKeywords } from '../hooks/useKeywords'
import { scanForQuestions } from '../lib/dataforseo'
import QuestionCard from '../components/QuestionCard'
import KeywordManager from '../components/KeywordManager'
import AeoTracker from '../components/AeoTracker'
import ClientCredentials from '../components/ClientCredentials'

// ─── Toast ─────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null
  const colors = {
    success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    error: 'bg-red-500/15 border-red-500/30 text-red-300',
    info: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
  }
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl ${colors[toast.type || 'success']}`}>
      {toast.type === 'error' ? (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {toast.message}
    </div>
  )
}

// ─── Section state persistence (session-scoped, per client) ─────────────────
const DEFAULT_SECTIONS = { new: false, draft: false, posted: false }

function getStoredSections(clientId) {
  try {
    const raw = sessionStorage.getItem(`aeo_sections_${clientId}`)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function storeSections(clientId, state) {
  try { sessionStorage.setItem(`aeo_sections_${clientId}`, JSON.stringify(state)) } catch {}
}

// ─── Section header ─────────────────────────────────────────────────────────
function Section({ icon, label, count, accent, children, empty, onClearAll, isOpen, onToggle }) {
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  const badgeCls = accent === 'text-blue-400'
    ? 'bg-blue-500/15 text-blue-400'
    : accent === 'text-amber-400'
    ? 'bg-amber-500/15 text-amber-400'
    : 'bg-emerald-500/15 text-emerald-400'

  async function handleClearAll() {
    setClearing(true)
    try {
      await onClearAll()
      setClearConfirm(false)
    } catch (e) {
      alert('Failed to clear: ' + (e?.message || 'unknown error'))
    } finally {
      setClearing(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 min-w-0 group"
        >
          <span className={`text-lg ${accent}`}>{icon}</span>
          <span className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider">{label}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{count}</span>
          <div className="flex-1 h-px bg-[#1C2333] ml-2" />
          <svg className={`w-4 h-4 text-[#6E7681] transition-transform ${isOpen ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {count > 0 && onClearAll && (
          <button
            onClick={() => setClearConfirm(true)}
            className="flex-shrink-0 text-xs text-[#6E7681] hover:text-red-400 transition-colors px-1"
          >
            Clear all
          </button>
        )}
      </div>

      {clearConfirm && (
        <div className="mb-4 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center justify-between gap-4">
          <p className="text-xs text-[#C9D1D9]">
            Delete all {count} {label.toLowerCase()} questions? This cannot be undone.
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setClearConfirm(false)}
              disabled={clearing}
              className="px-3 py-1.5 text-xs rounded-md text-[#8B949E] hover:text-white bg-[#21262D] hover:bg-[#30363D] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="px-3 py-1.5 text-xs rounded-md text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {clearing ? 'Deleting…' : 'Delete all'}
            </button>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="space-y-3">
          {count === 0
            ? <p className="text-[#6E7681] text-sm text-center py-6 border border-dashed border-[#21262D] rounded-xl">{empty}</p>
            : children}
        </div>
      )}
    </div>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { clientId } = useParams()
  const [client, setClient] = useState(null)
  const [clientLoading, setClientLoading] = useState(false)
  const [showKeywords, setShowKeywords] = useState(false)
  const [showCredentials, setShowCredentials] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [toast, setToast] = useState(null)

  const { byStatus, updateQuestion, deleteQuestion, deleteAllByStatus, insertQuestions, refetch, loading: qLoading } = useQuestions(clientId)
  const { keywords } = useKeywords(clientId)
  const [sectionsOpen, setSectionsOpen] = useState(DEFAULT_SECTIONS)
  const autoExpandCheckedRef = useRef(new Set())

  useEffect(() => {
    if (!clientId) { setClient(null); return }
    setClientLoading(true)
    supabase.from('clients').select('*').eq('id', clientId).single()
      .then(({ data }) => { setClient(data); setClientLoading(false) })
    // Load stored section state for this client, defaulting to all collapsed
    setSectionsOpen(getStoredSections(clientId) ?? DEFAULT_SECTIONS)
  }, [clientId])

  // Auto-expand New Questions on first visit to a client if it has questions
  useEffect(() => {
    if (!clientId || qLoading) return
    if (autoExpandCheckedRef.current.has(clientId)) return
    autoExpandCheckedRef.current.add(clientId)
    if (getStoredSections(clientId) !== null) return // already have stored state, keep it
    if (byStatus.new.length > 0) {
      const next = { ...DEFAULT_SECTIONS, new: true }
      setSectionsOpen(next)
      storeSections(clientId, next)
    } else {
      storeSections(clientId, DEFAULT_SECTIONS)
    }
  }, [clientId, qLoading, byStatus.new.length])

  function toggleSection(key) {
    setSectionsOpen(prev => {
      const next = { ...prev, [key]: !prev[key] }
      if (clientId) storeSections(clientId, next)
      return next
    })
  }

  function notify(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleScan() {
    if (!keywords.length) {
      notify('Add keywords first before scanning.', 'error')
      return
    }
    setScanning(true)
    try {
      const found = await scanForQuestions(keywords)
      const added = await insertQuestions(found)
      await refetch()
      notify(
        added > 0
          ? `Found ${added} new question${added !== 1 ? 's' : ''}!`
          : 'Scan complete — no new questions found.',
        added > 0 ? 'success' : 'info'
      )
    } catch (err) {
      notify('Scan failed: ' + (err?.message || 'unknown error'), 'error')
    } finally {
      setScanning(false)
    }
  }

  // ── Empty / no client selected ──────────────────────────────────────────
  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-[#1D9E75]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-[#C9D1D9] text-xl font-semibold mb-2">Welcome to AEO Hub</h2>
        <p className="text-[#6E7681] text-sm max-w-xs leading-relaxed">
          Select a client from the sidebar or add your first client to start tracking and answering questions.
        </p>
      </div>
    )
  }

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full text-[#6E7681] text-sm">
        Client not found.
      </div>
    )
  }

  const activeKeywordCount = keywords.filter((k) => k.is_active).length
  const totalNew = byStatus.new.length

  return (
    <div className="min-h-full">
      {/* ── Client header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[#0D1117]/95 backdrop-blur border-b border-[#1C2333] px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#1D9E75] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-lg leading-tight truncate">{client.name}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {client.location && (
                  <span className="flex items-center gap-1 text-xs text-[#6E7681]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {client.location}
                  </span>
                )}
                {client.niche && (
                  <span className="text-xs px-2 py-0.5 bg-[#1D9E75]/10 text-[#1D9E75] rounded-md border border-[#1D9E75]/20 font-medium">
                    {client.niche}
                  </span>
                )}
                {client.website && (
                  <a href={client.website} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#6E7681] hover:text-[#1D9E75] transition-colors truncate max-w-[180px]">
                    {client.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Credentials button */}
            <button
              onClick={() => setShowCredentials(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#8B949E] hover:text-white bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              <span>Credentials</span>
            </button>

            {/* Keywords button */}
            <button
              onClick={() => setShowKeywords(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#8B949E] hover:text-white bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              <span>Keywords</span>
              {activeKeywordCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#1D9E75]/15 text-[#1D9E75] rounded-full">
                  {activeKeywordCount}
                </span>
              )}
            </button>

            {/* Scan Now */}
            <button
              onClick={handleScan}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#179967] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {scanning ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Scanning…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  Scan Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <div className="px-8 py-4 flex items-center gap-6 border-b border-[#1C2333] bg-[#0D1117]">
        {[
          { label: 'New', value: byStatus.new.length, color: 'text-blue-400' },
          { label: 'Drafts', value: byStatus.draft.length, color: 'text-amber-400' },
          { label: 'Posted', value: byStatus.posted.length, color: 'text-emerald-400' },
          { label: 'Active Keywords', value: activeKeywordCount, color: 'text-[#1D9E75]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`text-xl font-bold ${color}`}>{value}</span>
            <span className="text-[#6E7681] text-xs">{label}</span>
          </div>
        ))}
        {totalNew === 0 && activeKeywordCount > 0 && (
          <p className="ml-auto text-[#6E7681] text-xs italic">
            No new questions — click Scan Now to check for more.
          </p>
        )}
        {activeKeywordCount === 0 && (
          <button
            onClick={() => setShowKeywords(true)}
            className="ml-auto text-xs text-[#1D9E75] hover:underline"
          >
            ← Add keywords to enable scanning
          </button>
        )}
      </div>

      {/* ── Question sections ──────────────────────────────────────────── */}
      <div className="px-8 py-6 space-y-10 max-w-5xl">
        {qLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <Section
              icon="●"
              label="New Questions"
              count={byStatus.new.length}
              accent="text-blue-400"
              empty="No new questions yet. Click Scan Now to find some."
              onClearAll={() => deleteAllByStatus('new')}
              isOpen={sectionsOpen.new}
              onToggle={() => toggleSection('new')}
            >
              {byStatus.new.map((q) => (
                <QuestionCard key={q.id} question={q} client={client} onUpdate={updateQuestion} onDelete={deleteQuestion} onToast={notify} />
              ))}
            </Section>

            <Section
              icon="✎"
              label="Drafts"
              count={byStatus.draft.length}
              accent="text-amber-400"
              empty="No drafts yet. Generate answers from the New Questions section."
              onClearAll={() => deleteAllByStatus('draft')}
              isOpen={sectionsOpen.draft}
              onToggle={() => toggleSection('draft')}
            >
              {byStatus.draft.map((q) => (
                <QuestionCard key={q.id} question={q} client={client} onUpdate={updateQuestion} onDelete={deleteQuestion} onToast={notify} />
              ))}
            </Section>

            <Section
              icon="✓"
              label="Posted"
              count={byStatus.posted.length}
              accent="text-emerald-400"
              empty="No posted answers yet."
              onClearAll={() => deleteAllByStatus('posted')}
              isOpen={sectionsOpen.posted}
              onToggle={() => toggleSection('posted')}
            >
              {byStatus.posted.map((q) => (
                <QuestionCard key={q.id} question={q} client={client} onUpdate={updateQuestion} onDelete={deleteQuestion} onToast={notify} />
              ))}
            </Section>
          </>
        )}

        {/* ── AEO Tracking ──────────────────────────────────────────────── */}
        {client && !qLoading && (
          <AeoTracker client={client} />
        )}
      </div>

      {/* ── Keyword Manager drawer ─────────────────────────────────────── */}
      {showKeywords && client && (
        <KeywordManager client={client} onClose={() => setShowKeywords(false)} />
      )}

      {/* ── Platform Credentials drawer ────────────────────────────────── */}
      {showCredentials && client && (
        <ClientCredentials client={client} onClose={() => setShowCredentials(false)} />
      )}

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      <Toast toast={toast} />
    </div>
  )
}
