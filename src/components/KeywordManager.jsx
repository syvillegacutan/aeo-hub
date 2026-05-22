import { useState } from 'react'
import { useKeywords } from '../hooks/useKeywords'
import { suggestKeywords } from '../lib/keywords'

const FIELD = 'bg-[#0D1117] border border-[#30363D] focus:border-[#1D9E75] rounded-lg px-3.5 py-2.5 text-sm text-[#C9D1D9] placeholder-[#6E7681] outline-none transition-colors w-full'

export default function KeywordManager({ client, onClose }) {
  const { keywords, loading, addKeywords, toggleKeyword, removeKeyword } = useKeywords(client.id)
  const [single, setSingle] = useState('')
  const [bulk, setBulk] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [filter, setFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [suggesting, setSuggesting] = useState(false)

  const active = keywords.filter((k) => k.is_active)
  const inactive = keywords.filter((k) => !k.is_active)

  const filtered = keywords.filter((k) =>
    !filter || k.keyword.toLowerCase().includes(filter.toLowerCase())
  )

  async function handleAddSingle(e) {
    e.preventDefault()
    const kw = single.trim()
    if (!kw) return
    setSaving(true)
    try {
      await addKeywords([{ keyword: kw, source: 'manual', is_active: true }])
      setSingle('')
    } catch (err) {
      alert('Failed to add keyword: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleBulkAdd() {
    const lines = bulk
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (!lines.length) return
    setSaving(true)
    try {
      await addKeywords(lines.map((kw) => ({ keyword: kw, source: 'manual', is_active: true })))
      setBulk('')
      setBulkMode(false)
    } catch (err) {
      alert('Failed to add keywords: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSuggest() {
    const suggestions = suggestKeywords(client)
    if (!suggestions.length) {
      alert('Add a niche and location to the client profile first.')
      return
    }
    setSuggesting(true)
    try {
      await addKeywords(suggestions.map((kw) => ({ keyword: kw, source: 'suggested', is_active: true })))
    } catch (err) {
      alert('Failed to add suggestions: ' + err.message)
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
      <div className="h-full w-full max-w-md bg-[#161B22] border-l border-[#30363D] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D]">
          <div>
            <h2 className="text-white font-semibold">Keyword Manager</h2>
            <p className="text-[#6E7681] text-xs mt-0.5">{client.name}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#6E7681]">
            <span className="text-emerald-400 font-medium">{active.length} active</span>
            <span>·</span>
            <span>{inactive.length} paused</span>
            <button
              onClick={handleSuggest}
              disabled={suggesting}
              className="ml-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#1D9E75] bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20 border border-[#1D9E75]/25 disabled:opacity-50 transition-colors"
            >
              {suggesting ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              )}
              {suggesting ? 'Adding…' : 'Suggest'}
            </button>
            <button onClick={onClose} className="text-[#6E7681] hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-[#21262D]">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E7681]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Filter keywords…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#21262D] rounded-lg pl-9 pr-3 py-2 text-sm text-[#C9D1D9] placeholder-[#6E7681] outline-none focus:border-[#1D9E75] transition-colors"
            />
          </div>
        </div>

        {/* Keyword list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
          {loading && (
            <p className="text-[#6E7681] text-sm text-center py-8">Loading keywords…</p>
          )}

          {!loading && keywords.length === 0 && (
            <div className="text-center py-10">
              <p className="text-[#6E7681] text-sm">No keywords yet.</p>
              <p className="text-[#6E7681] text-xs mt-1">Add some below to start scanning for questions.</p>
            </div>
          )}

          {filtered.map((kw) => (
            <div
              key={kw.id}
              className="flex items-center gap-3 px-3.5 py-2.5 bg-[#0D1117] rounded-lg border border-[#1C2333] group"
            >
              {/* Toggle */}
              <button
                onClick={() => toggleKeyword(kw.id, !kw.is_active)}
                className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${kw.is_active ? 'bg-[#1D9E75]' : 'bg-[#30363D]'}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    kw.is_active ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${kw.is_active ? 'text-[#C9D1D9]' : 'text-[#6E7681]'}`}>
                  {kw.keyword}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {kw.search_volume > 0 && (
                    <span className="text-[10px] text-[#6E7681]">
                      {kw.search_volume.toLocaleString()}/mo
                    </span>
                  )}
                  {kw.source === 'suggested' && (
                    <span className="text-[10px] text-[#1D9E75] bg-[#1D9E75]/10 px-1.5 py-0.5 rounded">
                      suggested
                    </span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => removeKeyword(kw.id)}
                className="opacity-0 group-hover:opacity-100 text-[#6E7681] hover:text-red-400 transition-all p-1 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Add keyword */}
        <div className="px-6 py-4 border-t border-[#21262D] space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setBulkMode(false)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${!bulkMode ? 'bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/30' : 'text-[#6E7681] hover:text-white'}`}
            >
              Single
            </button>
            <button
              onClick={() => setBulkMode(true)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${bulkMode ? 'bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/30' : 'text-[#6E7681] hover:text-white'}`}
            >
              Bulk (one per line)
            </button>
          </div>

          {!bulkMode ? (
            <form onSubmit={handleAddSingle} className="flex gap-2">
              <input
                type="text"
                className={`${FIELD} flex-1`}
                placeholder="Add a keyword…"
                value={single}
                onChange={(e) => setSingle(e.target.value)}
              />
              <button
                type="submit"
                disabled={!single.trim() || saving}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#179967] disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                Add
              </button>
            </form>
          ) : (
            <div className="space-y-2">
              <textarea
                className={`${FIELD} resize-none`}
                rows={4}
                placeholder={'keyword one\nkeyword two\nkeyword three'}
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
              />
              <button
                onClick={handleBulkAdd}
                disabled={!bulk.trim() || saving}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#179967] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Adding…' : `Add ${bulk.split('\n').filter(l => l.trim()).length} keywords`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
