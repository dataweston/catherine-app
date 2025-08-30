import type { NextApiRequest, NextApiResponse } from 'next'
import getSupabase from '../../../src/lib/supabaseClient'

type EntryRow = {
  id: string
  user_id: string
  text: string
  calories: number
  date: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = (req.query.userId as string) || ''
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' })

  const { data, error } = await supabase
    .from('entries')
    .select('id,user_id,text,calories,date')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ entries: (data as EntryRow[]) || [] })
}
