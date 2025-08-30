// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null | undefined

export function getSupabase(): SupabaseClient | null {
	if (cached !== undefined) return cached ?? null
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
	if (!supabaseUrl || !supabaseKey) {
		cached = null
		return null
	}
	cached = createClient(supabaseUrl, supabaseKey)
	return cached
}

export default getSupabase
