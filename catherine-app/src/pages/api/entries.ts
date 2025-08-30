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

type EntryRow = {
  id: string
  user_id: string
  text: string
  calories: number
  date: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' })

  if (req.method === 'GET') {
  const userId = (req.query.userId as string) || ''
  // If Authorization header present, enforce it matches userId
  const authUser = await getUserIdFromAuth(req)
  if (authUser && authUser !== userId) return res.status(401).json({ error: 'Unauthorized' })
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const { data, error } = await supabase
      .from('entries')
      .select('id,user_id,text,calories,date')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ entries: (data as EntryRow[]) || [] })
  }

  if (req.method === 'POST') {
    const rows = req.body as Array<{ user_id: string; text: string; calories: number; date: string }>
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'Missing rows' })
  const authUser = await getUserIdFromAuth(req)
  if (authUser && rows.some(r => r.user_id !== authUser)) return res.status(401).json({ error: 'Unauthorized' })
    const { data, error } = await supabase.from('entries').insert(rows).select('id,user_id,text,calories,date')
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ entries: data || [] })
  }

  if (req.method === 'PATCH') {
    const { id, user_id, text, calories, date } = req.body as Partial<EntryRow> & { id: string; user_id: string }
    if (!id || !user_id) return res.status(400).json({ error: 'Missing id or user_id' })
  const authUser = await getUserIdFromAuth(req)
  if (authUser && authUser !== user_id) return res.status(401).json({ error: 'Unauthorized' })
  const updates: Partial<EntryRow> = {}
    if (typeof text === 'string') updates.text = text
    if (typeof calories === 'number') updates.calories = calories
    if (typeof date === 'string') updates.date = date
    const { data, error } = await supabase.from('entries').update(updates).eq('id', id).eq('user_id', user_id).select('id,user_id,text,calories,date').maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ entry: data })
  }

  if (req.method === 'DELETE') {
    const { id, user_id } = req.body as { id: string; user_id: string }
    if (!id || !user_id) return res.status(400).json({ error: 'Missing id or user_id' })
  const authUser = await getUserIdFromAuth(req)
  if (authUser && authUser !== user_id) return res.status(401).json({ error: 'Unauthorized' })
  const { error } = await supabase.from('entries').delete().eq('id', id).eq('user_id', user_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
