import type { NextApiRequest, NextApiResponse } from 'next'

type Item = { name: string; serving: string; calories: number; protein?: number; carbs?: number; fat?: number }
type NxFood = { food_name?: string; serving_qty?: number; serving_unit?: string; nf_calories?: number; nf_protein?: number; nf_total_carbohydrate?: number; nf_total_fat?: number }
type NxResponse = { foods?: NxFood[] }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const q = ((req.query.q as string) || '').trim()
  if (!q) return res.status(200).json({ items: [], query: '' })

  const appId = process.env.NUTRITIONIX_APP_ID
  const appKey = process.env.NUTRITIONIX_APP_KEY
  if (!appId || !appKey) return res.status(503).json({ error: 'Nutrition API not configured' })

  try {
    const r = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-id': appId,
        'x-app-key': appKey,
      },
      body: JSON.stringify({ query: q }),
      // Let Vercel cache upstream result per unique body
      next: { revalidate: (parseInt(process.env.FOOD_CACHE_TTL_DAYS || '30', 10) || 30) * 86400 },
    })
    if (!r.ok) {
      const txt = await r.text()
      return res.status(502).json({ error: 'Nutrition API error', details: txt.slice(0, 500) })
    }
    const json = (await r.json()) as NxResponse
    const foods = Array.isArray(json.foods) ? json.foods : []
    const items: Item[] = foods.map((f) => ({
      name: f.food_name || 'Item',
      serving: [f.serving_qty, f.serving_unit].filter((v) => v !== undefined && v !== null).join(' '),
      calories: Math.round(Number(f.nf_calories) || 0),
      protein: f.nf_protein != null ? Math.round(Number(f.nf_protein)) : undefined,
      carbs: f.nf_total_carbohydrate != null ? Math.round(Number(f.nf_total_carbohydrate)) : undefined,
      fat: f.nf_total_fat != null ? Math.round(Number(f.nf_total_fat)) : undefined,
    }))
    // CDN cache headers for better performance
    const ttl = (parseInt(process.env.FOOD_CACHE_TTL_DAYS || '30', 10) || 30) * 86400
    res.setHeader('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=${ttl}`)
    return res.status(200).json({ items, query: q })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return res.status(500).json({ error: 'Server error', message })
  }
}
