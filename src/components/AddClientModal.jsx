import { useState } from 'react'
import { getKeywordsForSite } from '../lib/dataforseo'
import { useKeywords } from '../hooks/useKeywords'
import { supabase } from '../lib/supabase'

const FIELD = 'bg-[#0D1117] border border-[#30363D] focus:border-[#1D9E75] rounded-lg px-3.5 py-2.5 text-sm text-[#C9D1D9] placeholder-[#6E7681] outline-none transition-colors w-full'
const LABEL = 'block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1.5'

export default function AddClientModal({ addClient, onClose }) {
  const [step, setStep] = useState(1) // 1 = form, 2 = keywords
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [newClientId, setNewClientId] = useState(null)

  const [form, setForm] = useState({ name: '', location: '', niche: '', website: '' })
  const [suggestedKeywords, setSuggestedKeywords] = useState([]) // { keyword, search_volume, is_active }
  const [manualKw, setManualKw] = useState('')

  const { addKeywords } = useKeywords(newClientId)

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSaveClient(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const client = await addClient(form)
      setNewClientId(client.id)
      setStep(2)
      // Fetch keyword suggestions if website provided
      if (form.website.trim()) {
        setFetching(true)
        setFetchError(null)
        try {
          const kws = await getKeywordsForSite(form.website.trim())
          setSuggestedKeywords(kws.slice(0, 30).map((k) => ({ ...k, is_active: true })))
        } catch (err) {
          setFetchError(
            'Could not fetch keyword suggestions. You can add keywords manually below.'
          )
        } finally {
          setFetching(false)
        }
      }
    } catch (err) {
      alert('Failed to save client: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function toggleSuggested(idx) {
    setSuggestedKeywords((prev) =>
      prev.map((k, i) => (i === idx ? { ...k, is_active: !k.is_active } : k))
    )
  }

  function addManual() {
    const kw = manualKw.trim()
    if (!kw) return
    const existing = suggestedKeywords.find((k) => k.keyword.toLowerCase() === kw.toLowerCase())
    if (!existing) {
      setSuggestedKeywords((prev) => [
        ...prev,
        { keyword: kw, search_volume: 0, source: 'manual', is_active: true },
      ])
    }
    setManualKw('')
  }

  async function handleSaveKeywords() {
    if (!newClientId) return
    const toSave = suggestedKeywords.filter((k) => k.keyword.trim())
    if (toSave.length) {
      try {
        await addKeywords(toSave)
      } catch (err) {
        alert('Failed to save keywords: ' + err.message)
        return
      }
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D]">
          <div>
            <h2 className="text-white font-semibold">
              {step === 1 ? 'Add New Client' : 'Select Keywords'}
            </h2>
            <p className="text-[#6E7681] text-xs mt-0.5">
              {step === 1
                ? "Enter the client's details to get started."
                : `Keywords for ${form.name}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className={`h-1.5 rounded-full transition-all ${
                    n === step ? 'w-6 bg-[#1D9E75]' : 'w-3 bg-[#30363D]'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onClose}
              className="text-[#6E7681] hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Step 1: Client form */}
        {step === 1 && (
          <form onSubmit={handleSaveClient} className="p-6 space-y-4">
            <div>
              <label className={LABEL}>Business Name *</label>
              <input
                required
                type="text"
                className={FIELD}
                placeholder="e.g. Acme Roofing Co."
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Location</label>
                <input
                  type="text"
                  className={FIELD}
                  placeholder="e.g. Austin, TX"
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Niche / Industry</label>
                <input
                  type="text"
                  className={FIELD}
                  placeholder="e.g. Roofing"
                  value={form.niche}
                  onChange={(e) => set('niche', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>Website</label>
              <input
                type="url"
                className={FIELD}
                placeholder="https://example.com"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
              />
              <p className="text-[10px] text-[#6E7681] mt-1">
                Used to auto-suggest relevant keywords via DataForSEO
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#8B949E] hover:text-white bg-[#21262D] hover:bg-[#30363D] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#179967] disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving…' : form.website ? 'Save & Fetch Keywords →' : 'Save Client →'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Keywords */}
        {step === 2 && (
          <div className="p-6">
            {fetching && (
              <div className="flex items-center gap-3 py-4 text-[#8B949E]">
                <svg className="w-4 h-4 animate-spin text-[#1D9E75]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Fetching keywords for {form.website}…</span>
              </div>
            )}

            {fetchError && (
              <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-400 text-xs">
                {fetchError}
              </div>
            )}

            {!fetching && (
              <>
                {suggestedKeywords.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className={LABEL}>Suggested Keywords ({suggestedKeywords.filter(k => k.is_active).length} selected)</p>
                      <button
                        onClick={() => setSuggestedKeywords(prev => prev.map(k => ({ ...k, is_active: !prev.every(x => x.is_active) })))}
                        className="text-[10px] text-[#1D9E75] hover:underline"
                      >
                        Toggle all
                      </button>
                    </div>
                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                      {suggestedKeywords.map((kw, i) => (
                        <button
                          key={i}
                          onClick={() => toggleSuggested(i)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                            kw.is_active
                              ? 'bg-[#1D9E75]/15 border border-[#1D9E75]/30 text-[#C9D1D9]'
                              : 'bg-[#0D1117] border border-[#21262D] text-[#6E7681]'
                          }`}
                        >
                          <span className="truncate">{kw.keyword}</span>
                          <span className="text-[10px] text-[#6E7681] ml-2 flex-shrink-0">
                            {kw.search_volume?.toLocaleString()} /mo
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual add */}
                <div className="mb-5">
                  <label className={LABEL}>Add Keyword Manually</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={`${FIELD} flex-1`}
                      placeholder="e.g. roofing contractor near me"
                      value={manualKw}
                      onChange={(e) => setManualKw(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addManual())}
                    />
                    <button
                      onClick={addManual}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] transition-colors whitespace-nowrap"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#8B949E] hover:text-white bg-[#21262D] hover:bg-[#30363D] transition-colors"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleSaveKeywords}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#179967] transition-colors"
                  >
                    Save Keywords
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
