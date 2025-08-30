import type { NextApiRequest, NextApiResponse } from 'next'
import getSupabase from '../../../src/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' })

  if (req.method === 'GET') {
    const userId = (req.query.userId as string) || ''
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ profile: data })
  }

  if (req.method === 'POST') {
    const body = req.body
    const { error } = await supabase.from('profiles').upsert(body, { onConflict: 'id' })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
