import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const PLATFORMS = ['claude', 'chatgpt', 'gemini']

export function useAeoScores(clientId) {
  const [history, setHistory] = useState({ claude: [], chatgpt: [], gemini: [] })
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!clientId) { setHistory({ claude: [], chatgpt: [], gemini: [] }); return }
    setLoading(true)

    const { data, error } = await supabase
      .from('aeo_scores')
      .select('id, client_id, platform, score, checked_at')
      .eq('client_id', clientId)
      .order('checked_at', { ascending: false })
      .limit(25)

    if (error) console.error('[useAeoScores] fetch error:', error.message)

    const grouped = { claude: [], chatgpt: [], gemini: [] }
    for (const row of data || []) {
      const list = grouped[row.platform]
      if (list && list.length < 5) list.push(row)
    }

    setHistory(grouped)
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetch() }, [fetch])

  return { history, loading, refetch: fetch }
}
