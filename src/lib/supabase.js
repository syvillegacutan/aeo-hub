import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error('[Supabase] VITE_SUPABASE_URL is missing or empty')
}

if (!supabaseAnonKey) {
  console.error('[Supabase] VITE_SUPABASE_ANON_KEY is missing or empty')
} else {
  const keyPreview = `${supabaseAnonKey.slice(0, 20)}...${supabaseAnonKey.slice(-10)}`
  console.log(`[Supabase] Initializing with URL: ${supabaseUrl}`)
  console.log(`[Supabase] Key preview: ${keyPreview} (length: ${supabaseAnonKey.length})`)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
