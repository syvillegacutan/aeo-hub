import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useQuestions(clientId) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!clientId) { setQuestions([]); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('questions')
      .select('id, client_id, platform, question_text, status, source_url, relevance_score, meta_info, draft_answer, detected_at')
      .eq('client_id', clientId)
      .order('detected_at', { ascending: false })
    if (error) console.error('[useQuestions] fetch error:', JSON.stringify(error, null, 2))
    setQuestions(data || [])
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetch()
    if (!clientId) return
    const sub = supabase
      .channel(`questions-${clientId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'questions',
        filter: `client_id=eq.${clientId}`,
      }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [clientId, fetch])

  async function updateQuestion(id, updates) {
    const { error } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', id)
    if (error) throw error
    await fetch()
  }

  async function deleteQuestion(id) {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)
    if (error) throw error
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  async function deleteAllByStatus(status) {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('client_id', clientId)
      .eq('status', status)
    if (error) throw error
    setQuestions((prev) => prev.filter((q) => q.status !== status))
  }

  async function insertQuestions(rows) {
    if (!rows.length) return 0

    const { data: existing } = await supabase
      .from('questions')
      .select('source_url, question_text')
      .eq('client_id', clientId)

    const existingUrls = new Set((existing || []).map((q) => q.source_url).filter(Boolean))
    const existingTexts = new Set((existing || []).map((q) => q.question_text.toLowerCase()))

    const fresh = rows.filter((q) => {
      if (q.source_url && existingUrls.has(q.source_url)) return false
      if (existingTexts.has(q.question_text.toLowerCase())) return false
      return true
    })

    if (!fresh.length) return 0

    const toInsert = fresh.map((q) => ({
      client_id: clientId,
      platform: q.platform,
      question_text: q.question_text,
      status: 'new',
      source_url: q.source_url ?? '',
      relevance_score: q.relevance_score ?? 50,
      meta_info: q.meta_info ?? {},
      draft_answer: '',
    }))

    const { error } = await supabase.from('questions').insert(toInsert)
    if (error) {
      console.error('[useQuestions] insert error:', JSON.stringify(error, null, 2))
      throw error
    }

    await fetch()
    return fresh.length
  }

  const byStatus = {
    new: questions.filter((q) => q.status === 'new'),
    draft: questions.filter((q) => q.status === 'draft'),
    posted: questions.filter((q) => q.status === 'posted'),
  }

  return { questions, byStatus, loading, updateQuestion, deleteQuestion, deleteAllByStatus, insertQuestions, refetch: fetch }
}
