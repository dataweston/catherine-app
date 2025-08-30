import type { NextApiRequest, NextApiResponse } from 'next'
import getSupabase from '../../../src/lib/supabaseClient'

async function getUserIdFromAuth(req: NextApiRequest) {
  const supabase = getSupabase()
  if (!supabase) return null
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return null
  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error) return null
    return data.user?.id || null
  } catch {
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' })

  if (req.method === 'GET') {
    const userId = (req.query.userId as string) || ''
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const authUser = await getUserIdFromAuth(req)
    if (authUser && authUser !== userId) return res.status(401).json({ error: 'Unauthorized' })
    const { data, error } = await supabase.from('weights').select('id,user_id,date,weight_kg').eq('user_id', userId).order('date', { ascending: false }).limit(52)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ weights: data || [] })
  }

  if (req.method === 'POST') {
    const rows = req.body as Array<{ user_id: string; date: string; weight_kg: number }>
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'Missing rows' })
    const authUser = await getUserIdFromAuth(req)
    if (authUser && rows.some(r => r.user_id !== authUser)) return res.status(401).json({ error: 'Unauthorized' })
    const { data, error } = await supabase.from('weights').upsert(rows, { onConflict: 'user_id,date' }).select('id,user_id,date,weight_kg')
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ weights: data || [] })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
