import { useState } from 'react'
import { runPlatformCheck } from '../lib/aeo'
import { useAeoScores } from '../hooks/useAeoScores'

// ── Platform config ────────────────────────────────────────────────────────────
const PLATFORMS = [
  {
    key: 'chatgpt',
    label: 'ChatGPT',
    sub: 'GPT-4o mini',
    color: 'text-emerald-400',
    barColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
    ring: 'border-emerald-500/30',
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
      </svg>
    ),
  },
  {
    key: 'gemini',
    label: 'Gemini',
    sub: 'gemini-1.5-flash',
    color: 'text-blue-400',
    barColor: 'bg-blue-500',
    badgeBg: 'bg-blue-500/15 border-blue-500/30',
    ring: 'border-blue-500/30',
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12"/>
      </svg>
    ),
  },
  {
    key: 'claude',
    label: 'Claude',
    sub: 'claude-haiku-4-5',
    color: 'text-orange-400',
    barColor: 'bg-orange-500',
    badgeBg: 'bg-orange-500/15 border-orange-500/30',
    ring: 'border-orange-500/30',
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-1.385-.121-.97-.42.097-.79.79-.08 1.312.048 2.29.073 2.387.097.985.048.048-.048V11.37l-.048-.742-.073-1.916-.097-1.844-.048-1.506.024-1.119.139-.323.63-.258.468.258.161.323-.048 1.15-.097 1.819-.097 2.47v.757l.048.048h.048l3.632-3.947 1.288-1.432 1.141-1.216.985-.936.839-.614.759.032.614.839-.032.759-1.217 1.288-1.505 1.602-2.374 2.842-.678.839.073.097 4.335-1.506 1.941-.597 1.554-.42 1.288-.226.936.129.323.79-.42.726-1.264.097-1.554.274-2.02.629-1.506.484-3.696 1.288-.468.129v.08l3.067 3.116 1.409 1.385.985 1.087.565.92.129.743-.452.662-.743.048-.839-.452-1.409-1.409-1.554-1.602-2.132-2.212-.29-.29-.08.048-.565 4.077-.323 1.699-.258 1.312-.29.985-.42.629-.726.226-.63-.42-.226-.726.194-1.199.29-1.731.42-2.47.484-3.067v-.581z"/>
      </svg>
    ),
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 67) return 'text-emerald-400'
  if (score >= 34) return 'text-amber-400'
  return 'text-red-400'
}

function scoreBarColor(score) {
  if (score >= 67) return 'bg-emerald-500'
  if (score >= 34) return 'bg-amber-500'
  return 'bg-red-500'
}

function formatChecked(iso) {
  if (!iso) return ''
  const date = new Date(iso.replace(/(\.\d{3})\d+/, '$1'))
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function ResponseRow({ item, clientName }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-[#21262D] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#21262D]/50 transition-colors"
      >
        <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${item.mentioned ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
          {item.mentioned
            ? <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            : <svg className="w-2.5 h-2.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          }
        </span>
        <span className="text-[12px] text-[#8B949E] flex-1 truncate">{item.question}</span>
        <svg className={`w-3 h-3 text-[#6E7681] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-[#21262D]">
          {item.error ? (
            <p className="text-red-400 text-[12px]">{item.error}</p>
          ) : (
            <p className="text-[#C9D1D9] text-[12px] leading-relaxed whitespace-pre-wrap">{item.text}</p>
          )}
        </div>
      )}
    </div>
  )
}

function HistoryDots({ history }) {
  if (!history.length) return null
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {[...history].reverse().map((h) => (
        <div
          key={h.id}
          title={`${h.score}% · ${formatChecked(h.checked_at)}`}
          className={`w-2 h-2 rounded-full ${scoreBarColor(h.score)}`}
          style={{ opacity: 0.5 + (h.score / 200) }}
        />
      ))}
      <span className="text-[10px] text-[#6E7681] ml-1">last {history.length} check{history.length !== 1 ? 's' : ''}</span>
    </div>
  )
}

function PlatformCard({ platform, result, historyRows, checking, client }) {
  const latestScore = result?.score ?? (historyRows[0]?.score ?? null)
  const latestMentioned = latestScore !== null && latestScore > 0
  const lastChecked = result?.checked_at ?? historyRows[0]?.checked_at ?? null

  return (
    <div className={`bg-[#161B22] border rounded-xl p-5 flex flex-col gap-4 ${checking ? 'border-[#30363D] animate-pulse' : 'border-[#21262D]'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg bg-[#21262D] flex items-center justify-center ${platform.color}`}>
            {platform.logo}
          </div>
          <div>
            <p className="text-[#C9D1D9] text-sm font-semibold leading-tight">{platform.label}</p>
            <p className="text-[#6E7681] text-[11px]">{platform.sub}</p>
          </div>
        </div>

        {/* Mentioned badge */}
        {latestScore !== null && !checking && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${latestMentioned ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
            {latestMentioned ? 'Mentioned' : 'Not mentioned'}
          </span>
        )}
        {checking && (
          <span className="text-[11px] text-[#6E7681] flex items-center gap-1.5">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Checking…
          </span>
        )}
      </div>

      {/* Score */}
      {latestScore !== null && !checking ? (
        <div>
          <div className="flex items-end justify-between mb-1.5">
            <span className={`text-3xl font-bold ${scoreColor(latestScore)}`}>{latestScore}</span>
            <span className="text-[#6E7681] text-sm mb-1">/ 100</span>
          </div>
          <div className="h-1.5 bg-[#21262D] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(latestScore)}`}
              style={{ width: `${latestScore}%` }}
            />
          </div>
          <HistoryDots history={historyRows} />
        </div>
      ) : !checking ? (
        <p className="text-[#6E7681] text-sm">No data yet — run an AEO check.</p>
      ) : (
        <div className="h-1.5 bg-[#21262D] rounded-full" />
      )}

      {/* Last checked */}
      {lastChecked && !checking && (
        <p className="text-[10px] text-[#6E7681]">Last checked {formatChecked(lastChecked)}</p>
      )}

      {/* Responses from current session */}
      {result?.responses?.length > 0 && !checking && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-[#6E7681] uppercase tracking-wider">AI Responses</p>
          {result.responses.map((r, i) => (
            <ResponseRow key={i} item={r} clientName={client.name} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function AeoTracker({ client }) {
  const { history, loading, refetch } = useAeoScores(client.id)
  const [checking, setChecking] = useState({})   // { claude: true/false, ... }
  const [results, setResults]   = useState({})   // session results with response text
  const [error, setError]       = useState(null)

  async function handleRunCheck() {
    setError(null)
    // Run all 3 platforms in parallel, updating checking state per-platform
    const pending = PLATFORMS.map(async ({ key }) => {
      setChecking((c) => ({ ...c, [key]: true }))
      try {
        const result = await runPlatformCheck(key, client)
        setResults((r) => ({ ...r, [key]: result }))
      } catch (err) {
        const msg = err?.response?.data?.error?.message || err.message || 'Check failed'
        setResults((r) => ({ ...r, [key]: { score: 0, responses: [], error: msg, checked_at: new Date().toISOString() } }))
      } finally {
        setChecking((c) => ({ ...c, [key]: false }))
      }
    })

    await Promise.all(pending)
    await refetch()
  }

  const anyChecking = Object.values(checking).some(Boolean)

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-lg text-purple-400">◈</span>
        <span className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider">AEO Tracking</span>
        <div className="flex-1 h-px bg-[#1C2333] ml-2" />
        <button
          onClick={handleRunCheck}
          disabled={anyChecking}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#179967] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {anyChecking ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Checking…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Run AEO Check
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Platform cards */}
      {loading && !Object.keys(results).length ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLATFORMS.map((platform) => (
            <PlatformCard
              key={platform.key}
              platform={platform}
              result={results[platform.key] ?? null}
              historyRows={history[platform.key] ?? []}
              checking={!!checking[platform.key]}
              client={client}
            />
          ))}
        </div>
      )}

      {/* Questions preview */}
      <div className="mt-4 px-4 py-3 bg-[#0D1117] border border-[#1C2333] rounded-xl">
        <p className="text-[11px] font-semibold text-[#6E7681] uppercase tracking-wider mb-2">Questions sent to each AI</p>
        <ul className="space-y-1">
          {[
            `What are the best ${client.niche || '[niche]'} services in ${client.location || '[location]'}?`,
            `Who do you recommend for ${client.niche || '[niche]'} near ${client.location || '[location]'}?`,
            `Can you suggest a good ${client.niche || '[niche]'} provider in ${client.location || '[location]'}?`,
          ].map((q, i) => (
            <li key={i} className="text-[12px] text-[#8B949E] flex items-start gap-2">
              <span className="text-[#6E7681] flex-shrink-0">{i + 1}.</span>
              {q}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
