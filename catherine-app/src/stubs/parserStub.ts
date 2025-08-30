// src/stubs/parserStub.ts
// Stub for natural language parser
export function parse(_entry: string) {
  const entry = _entry.trim().toLowerCase()
  if (!entry) return []
  // calories per unit (approx)
  const known: Record<string, number> = {
    banana: 105, bananas: 105,
    apple: 95, apples: 95,
    egg: 78, eggs: 78,
    rice: 200, bread: 80, yogurt: 150,
    milk: 60, chicken: 165, beef: 250, potato: 160, potatoes: 160,
    pasta: 220, cereal: 200, orange: 62, oranges: 62,
  }
  const synonyms: Record<string, string> = {
    yoghurt: 'yogurt',
    oats: 'cereal',
    steak: 'beef',
  }
  const unitPer100g: Record<string, number> = {
    rice: 130, chicken: 165, beef: 250, potato: 77, pasta: 131, bread: 265,
  }
  const unitPer100ml: Record<string, number> = {
    milk: 42, yogurt: 59,
  }
  const parts = entry.split(/[,;+]/).map(s => s.trim()).filter(Boolean)
  const results = [] as Array<{ item: string; calories: number }>
  for (const p of parts) {
    // "200 kcal" or "kcal 200"
    const kcal = /(?:(\d{2,4})\s*kcal)|(?:kcal\s*(\d{2,4}))/i.exec(p)
    if (kcal) {
      const c = Number(kcal[1] || kcal[2])
      results.push({ item: p, calories: isFinite(c) ? c : 0 })
      continue
    }
    // quantities like "2 eggs", "3 bananas"
    const qtyMatch = /^(\d+(?:\.\d+)?)\s+(.*)$/.exec(p)
    let qty = 1
    let rest = p
    if (qtyMatch) {
      qty = parseFloat(qtyMatch[1])
      rest = qtyMatch[2]
    }
    const tokens = rest.split(/\s+/)
    let calories = 0
  for (const raw of tokens) {
      let t = raw.replace(/[^a-z]/g, '')
      if (synonyms[t]) t = synonyms[t]
      if (known[t]) calories += known[t] * qty
      // grams e.g., "rice 150g"
      const g = /(\d{2,4})g$/.exec(raw)
      if (g) {
        const grams = parseFloat(g[1])
        // pick the last food token we saw; fallback to the rest
        const food = tokens.map(x => x.replace(/[^a-z]/g, '')).find(x => unitPer100g[x])
        if (food && unitPer100g[food]) {
          calories += (unitPer100g[food] * grams) / 100
        }
      }
      // ml e.g., "milk 200ml"
      const ml = /(\d{2,4})ml$/.exec(raw)
      if (ml) {
        const mls = parseFloat(ml[1])
        const food = tokens.map(x => x.replace(/[^a-z]/g, '')).find(x => unitPer100ml[x])
        if (food && unitPer100ml[food]) {
          calories += (unitPer100ml[food] * mls) / 100
        }
      }
    }
    results.push({ item: p, calories: Math.max(0, Math.round(calories || 100)) })
  }
  return results
}
