import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useKeywords(clientId) {
  const [keywords, setKeywords] = useState([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!clientId) { setKeywords([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('keywords')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
    setKeywords(data || [])
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetch() }, [fetch])

  async function addKeywords(list) {
    const rows = list.map((k) => ({
      client_id: clientId,
      keyword: k.keyword.toLowerCase().trim(),
      source: k.source || 'manual',
      search_volume: k.search_volume || 0,
      is_active: k.is_active !== false,
    }))
    // Upsert — ignore duplicates
    const { error } = await supabase
      .from('keywords')
      .upsert(rows, { onConflict: 'client_id,keyword', ignoreDuplicates: true })
    if (error) throw error
    await fetch()
  }

  async function toggleKeyword(id, is_active) {
    const { error } = await supabase.from('keywords').update({ is_active }).eq('id', id)
    if (error) throw error
    setKeywords((prev) => prev.map((k) => (k.id === id ? { ...k, is_active } : k)))
  }

  async function removeKeyword(id) {
    const { error } = await supabase.from('keywords').delete().eq('id', id)
    if (error) throw error
    setKeywords((prev) => prev.filter((k) => k.id !== id))
  }

  return { keywords, loading, addKeywords, toggleKeyword, removeKeyword, refetch: fetch }
}
