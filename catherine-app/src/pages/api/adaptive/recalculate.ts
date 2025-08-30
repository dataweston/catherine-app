import type { NextApiRequest, NextApiResponse } from 'next'
import getSupabase from '../../../../src/lib/supabaseClient'

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

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' })

  const { user_id, lookback_days = 14 } = req.body as { user_id: string; lookback_days?: number }
  if (!user_id) return res.status(400).json({ error: 'user_id required' })

  const authUser = await getUserIdFromAuth(req)
  if (authUser && authUser !== user_id) return res.status(401).json({ error: 'Unauthorized' })

  // Load recent entries to compute average net calories (we only have calories in; no calories_out yet)
  const { data: entries, error: entriesErr } = await supabase
    .from('entries')
    .select('calories,date')
    .eq('user_id', user_id)
    .order('date', { ascending: false })
    .limit(lookback_days * 3) // buffer

  if (entriesErr) return res.status(500).json({ error: entriesErr.message })

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - Math.max(7, Number(lookback_days)))
  const window = (entries || []).filter(e => new Date(e.date) >= cutoff)

  const byDay = new Map<string, number>()
  for (const e of window) {
    const k = new Date(e.date).toISOString().slice(0,10)
    byDay.set(k, (byDay.get(k) || 0) + (e.calories || 0))
  }
  const days = Math.max(1, byDay.size)
  const avgDailyNet = Array.from(byDay.values()).reduce((a,b)=>a+b,0) / days

  // Load weights
  const { data: weights, error: weightsErr } = await supabase
    .from('weights')
    .select('date,weight_kg')
    .eq('user_id', user_id)
    .order('date', { ascending: true })
    .limit(lookback_days)

  if (weightsErr) return res.status(500).json({ error: weightsErr.message })

  if (!weights || weights.length < 2 || days < 7) {
    return res.status(200).json({ message: 'not enough data', enough: false })
  }

  // Predict kg change using 7700 kcal/kg heuristic
  const first = weights[0]
  const last = weights[weights.length - 1]
  const periodDays = Math.max(1, daysBetween(new Date(first.date), new Date(last.date)))
  const predictedKg = (avgDailyNet * periodDays) / 7700
  const actualKg = last.weight_kg - first.weight_kg
  // ratio intentionally not used; rules below depend on comparing magnitudes directly

  let adjustment = 0
  let reason = ''
  if (Math.abs(predictedKg) > 0.01) {
    if (Math.abs(actualKg) < Math.abs(predictedKg) * 0.8) {
      adjustment = -Math.sign(avgDailyNet) * -150
      reason = 'observed change smaller than predicted → reduce deficit magnitude'
    } else if (Math.abs(actualKg) > Math.abs(predictedKg) * 1.25) {
      adjustment = -Math.sign(avgDailyNet) * 100
      reason = 'observed change larger than predicted → increase deficit magnitude slightly'
    } else {
      reason = 'within expected range — no change'
    }
  } else {
    reason = 'predicted near zero — no change'
  }

  // Use stored profile calorieTarget as baseline
  const { data: profile } = await supabase.from('profiles').select('calorieTarget').eq('id', user_id).maybeSingle()
  const baseline = profile?.calorieTarget || 0
  const finalRecommended = Math.round((baseline || avgDailyNet) + adjustment)

  await supabase.from('recommended_targets').insert({ user_id, recommended_calories: finalRecommended, source: 'adaptive_recalc' })

  return res.status(200).json({
    recommended_calories: finalRecommended,
    reason,
    predictedKg,
    actualKg,
    avgDailyNet,
    enough: true,
  })
}
