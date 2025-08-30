import type { NextApiRequest, NextApiResponse } from 'next'

// Minimal stub database
const FOOD_DB: Array<{ name: string; serving: string; calories: number; tags?: string[] }> = [
  { name: 'Brown rice', serving: '1 cup (195g)', calories: 215, tags: ['rice', 'cup'] },
  { name: 'White rice', serving: '1 cup (195g)', calories: 205, tags: ['rice', 'cup'] },
  { name: 'Chicken breast', serving: '6 oz (170g)', calories: 280, tags: ['chicken', 'oz'] },
  { name: 'Egg', serving: '1 large', calories: 78, tags: ['egg'] },
  { name: 'Bread (toast)', serving: '1 slice', calories: 80, tags: ['bread', 'toast', 'slice'] },
  { name: 'Milk (2%)', serving: '1 cup (240ml)', calories: 122, tags: ['milk', 'cup'] },
]

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const q = (req.query.q as string || '').toLowerCase().trim()
  if (!q) return res.status(200).json({ items: [], query: '' })
  const terms = q.split(/\s+/).filter(Boolean)
  const items = FOOD_DB.filter(item => terms.every(t => item.name.toLowerCase().includes(t) || (item.tags||[]).some(tag => tag.includes(t))))
  return res.status(200).json({ items, query: q })
}
