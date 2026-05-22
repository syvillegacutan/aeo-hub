import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useClients() {
  const [clients, setClients] = useState([])
  const [newCounts, setNewCounts] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchCounts = useCallback(async () => {
    const { data } = await supabase.from('questions').select('client_id').eq('status', 'new')
    const map = {}
    for (const q of data || []) {
      map[q.client_id] = (map[q.client_id] || 0) + 1
    }
    setNewCounts(map)
  }, [])

  const fetchClients = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
    fetchCounts()
  }, [fetchCounts])

  useEffect(() => {
    fetchClients()

    const sub = supabase
      .channel('sidebar-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, fetchClients)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, fetchCounts)
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [fetchClients, fetchCounts])

  async function addClient(payload) {
    const { data, error } = await supabase.from('clients').insert(payload).select().single()
    if (error) throw error
    await fetchClients()
    return data
  }

  async function updateClient(clientId, payload) {
    const { data, error } = await supabase.from('clients').update(payload).eq('id', clientId).select().single()
    if (error) throw error
    await fetchClients()
    return data
  }

  async function deleteClient(clientId) {
    const { error } = await supabase.from('clients').delete().eq('id', clientId)
    if (error) throw error
    await fetchClients()
  }

  return { clients, newCounts, loading, addClient, updateClient, deleteClient, refetch: fetchClients }
}
