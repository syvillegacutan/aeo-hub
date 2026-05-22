import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const TABS = [
  { key: 'reddit',      label: 'Reddit' },
  { key: 'quora',       label: 'Quora' },
  { key: 'answerclub',  label: 'AnswerClub' },
]

const DEFAULTS = {
  reddit:     { username: '', password: '', subreddits: '', chrome_profile: '' },
  quora:      { username: '', password: '', chrome_profile: '' },
  answerclub: { username: '', password: '', chrome_profile: '' },
}

const INPUT = 'w-full bg-[#0D1117] border border-[#30363D] focus:border-[#1D9E75] rounded-lg px-3 py-2 text-sm text-[#C9D1D9] placeholder-[#6E7681] outline-none transition-colors'
const LABEL = 'block text-xs font-medium text-[#8B949E] mb-1.5'

function EyeOpen() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function EyeOff() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

function PasswordInput({ value, onChange, placeholder = '••••••••' }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={INPUT + ' pr-10'}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E7681] hover:text-[#8B949E] transition-colors"
      >
        {show ? <EyeOff /> : <EyeOpen />}
      </button>
    </div>
  )
}

export default function ClientCredentials({ client, onClose }) {
  const [tab, setTab]   = useState('reddit')
  const [creds, setCreds] = useState(DEFAULTS)
  const [saved, setSaved] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const notesTimerRef = useRef(null)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(`creds_${client.id}`) || '{}')
      setCreds({
        reddit:     { ...DEFAULTS.reddit,     ...(stored.reddit     || {}) },
        quora:      { ...DEFAULTS.quora,       ...(stored.quora      || {}) },
        answerclub: { ...DEFAULTS.answerclub,  ...(stored.answerclub || {}) },
      })
    } catch {}
  }, [client.id])

  useEffect(() => {
    supabase
      .from('client_credentials')
      .select('credential_value')
      .eq('client_id', client.id)
      .eq('platform', 'notes')
      .eq('credential_key', 'general_notes')
      .maybeSingle()
      .then(({ data }) => { if (data) setNotes(data.credential_value) })
  }, [client.id])

  useEffect(() => {
    return () => { if (notesTimerRef.current) clearTimeout(notesTimerRef.current) }
  }, [])

  async function saveNotes(value) {
    const { error } = await supabase.from('client_credentials').upsert(
      { client_id: client.id, platform: 'notes', credential_key: 'general_notes', credential_value: value, updated_at: new Date().toISOString() },
      { onConflict: 'client_id,platform,credential_key' }
    )
    if (!error) {
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    }
  }

  function handleNotesChange(e) {
    const value = e.target.value
    setNotes(value)
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
    notesTimerRef.current = setTimeout(() => saveNotes(value), 2000)
  }

  function set(platform, field, value) {
    setCreds(prev => ({ ...prev, [platform]: { ...prev[platform], [field]: value } }))
  }

  function handleSave() {
    localStorage.setItem(`creds_${client.id}`, JSON.stringify(creds))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#161B22] border-l border-[#21262D] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D]">
          <div>
            <h2 className="text-white font-semibold text-[15px]">Platform Credentials</h2>
            <p className="text-[#6E7681] text-xs mt-0.5">Saved locally — never uploaded anywhere</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#6E7681] hover:text-white hover:bg-[#21262D] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#21262D]">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'text-white border-b-2 border-[#1D9E75]'
                  : 'text-[#6E7681] hover:text-[#8B949E]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {tab === 'reddit' && (
            <>
              <div>
                <label className={LABEL}>Reddit Username</label>
                <input
                  type="text"
                  value={creds.reddit.username}
                  onChange={e => set('reddit', 'username', e.target.value)}
                  placeholder="u/username"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Password</label>
                <PasswordInput
                  value={creds.reddit.password}
                  onChange={e => set('reddit', 'password', e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Favorite Subreddits (comma-separated)</label>
                <input
                  type="text"
                  value={creds.reddit.subreddits}
                  onChange={e => set('reddit', 'subreddits', e.target.value)}
                  placeholder="dogtraining, dogs, puppy101"
                  className={INPUT}
                />
                <p className="text-[10px] text-[#6E7681] mt-1.5">
                  Used to auto-select the best subreddit when you click Answer on Reddit
                </p>
              </div>
              <div>
                <label className={LABEL}>Chrome Profile (optional)</label>
                <input
                  type="text"
                  value={creds.reddit.chrome_profile}
                  onChange={e => set('reddit', 'chrome_profile', e.target.value)}
                  placeholder="Profile 1"
                  className={INPUT}
                />
              </div>
            </>
          )}

          {tab === 'quora' && (
            <>
              <div>
                <label className={LABEL}>Quora Email / Username</label>
                <input
                  type="text"
                  value={creds.quora.username}
                  onChange={e => set('quora', 'username', e.target.value)}
                  placeholder="email@example.com"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Password</label>
                <PasswordInput
                  value={creds.quora.password}
                  onChange={e => set('quora', 'password', e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Chrome Profile (optional)</label>
                <input
                  type="text"
                  value={creds.quora.chrome_profile}
                  onChange={e => set('quora', 'chrome_profile', e.target.value)}
                  placeholder="Profile 2"
                  className={INPUT}
                />
              </div>
            </>
          )}

          {tab === 'answerclub' && (
            <>
              <div>
                <label className={LABEL}>AnswerClub Email / Username</label>
                <input
                  type="text"
                  value={creds.answerclub.username}
                  onChange={e => set('answerclub', 'username', e.target.value)}
                  placeholder="email@example.com"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Password</label>
                <PasswordInput
                  value={creds.answerclub.password}
                  onChange={e => set('answerclub', 'password', e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Chrome Profile (optional)</label>
                <input
                  type="text"
                  value={creds.answerclub.chrome_profile}
                  onChange={e => set('answerclub', 'chrome_profile', e.target.value)}
                  placeholder="Profile 3"
                  className={INPUT}
                />
              </div>
            </>
          )}

          {/* Private notes — always visible */}
          <div className="pt-2 border-t border-[#21262D]">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-3.5 h-3.5 text-[#6E7681] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <span className={LABEL + ' mb-0'}>Private notes</span>
              {notesSaved && (
                <span className="ml-auto text-[10px] text-emerald-400 font-medium">Saved</span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Other credentials, phone numbers, login links, client notes…"
              className={INPUT + ' resize-y leading-relaxed'}
              style={{ minHeight: '150px' }}
            />
            <p className="text-[10px] text-[#6E7681] mt-1.5">These notes are private and only visible to you</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#21262D] flex items-center gap-3">
          <p className="flex-1 text-[#6E7681] text-xs leading-relaxed">
            Credentials stay in your browser only. Use the same Chrome profile for each platform to stay logged in.
          </p>
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
              saved
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-[#1D9E75] hover:bg-[#179967] text-white'
            }`}
          >
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </>
  )
}
