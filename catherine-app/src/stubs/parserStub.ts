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
    toast: 'bread',
  }
  const unitPer100g: Record<string, number> = {
    rice: 130, chicken: 165, beef: 250, potato: 77, pasta: 131, bread: 265, apple: 52, banana: 89
  }
  const unitPer100ml: Record<string, number> = {
    milk: 42, yogurt: 59,
  }
  const cupGramsApprox: Record<string, number> = {
    rice: 195, pasta: 140, milk: 240, yogurt: 245, cereal: 30
  }
  // Split into parts by common natural language separators
  const parts = entry
    .split(/[,;+]|\band\b|\bwith\b|\bplus\b|&/g)
    .map(s => s.trim())
    .filter(Boolean)
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
      // default servings when no explicit qty
      if (t === 'egg' || t === 'eggs') {
        const q = qtyMatch ? qty : 2 // default 2 eggs
        calories += (known['egg'] || 78) * q
        continue
      }
      if (known[t]) calories += known[t] * (qtyMatch ? qty : 1)
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
      // ounces e.g., "chicken 6oz"
      const oz = /(\d{1,3})oz$/.exec(raw)
      if (oz) {
        const grams = parseFloat(oz[1]) * 28.3495
        const food = tokens.map(x => x.replace(/[^a-z]/g, '')).find(x => unitPer100g[x])
        if (food && unitPer100g[food]) calories += (unitPer100g[food] * grams) / 100
      }
      // pounds e.g., "beef 0.5lb" or "1lb"
      const lb = /(\d{1,3}(?:\.\d+)?)lb$/.exec(raw)
      if (lb) {
        const grams = parseFloat(lb[1]) * 453.592
        const food = tokens.map(x => x.replace(/[^a-z]/g, '')).find(x => unitPer100g[x])
        if (food && unitPer100g[food]) calories += (unitPer100g[food] * grams) / 100
      }
      // cups e.g., "rice 1.5cup"/"cups"
      const cup = /(\d{1,3}(?:\.\d+)?)(?:cup|cups)$/.exec(raw)
      if (cup) {
        const c = parseFloat(cup[1])
        const food = tokens.map(x => x.replace(/[^a-z]/g, '')).find(x => cupGramsApprox[x] || unitPer100ml[x])
        if (food) {
          if (cupGramsApprox[food] && unitPer100g[food]) {
            const grams = c * cupGramsApprox[food]
            calories += (unitPer100g[food] * grams) / 100
          } else if (unitPer100ml[food]) {
            const mls = c * 240
            calories += (unitPer100ml[food] * mls) / 100
          }
        }
      }
      // tbsp/tsp approximate for oils etc (basic handling)
      const tbsp = /(\d{1,2})(?:tbsp)$/.exec(raw)
      if (tbsp) {
        const n = parseFloat(tbsp[1])
        // rough 120 kcal per tbsp for oil/butter
        calories += n * 120
      }
      const tsp = /(\d{1,2})(?:tsp)$/.exec(raw)
      if (tsp) {
        const n = parseFloat(tsp[1])
        calories += n * 40
      }
    }
    // If we still didn't match anything, use a conservative default per token
    if (!calories) {
      const base = tokens.map(x => x.replace(/[^a-z]/g, '')).find(x => known[x])
      if (base && known[base]) calories = known[base]
    }
    results.push({ item: p, calories: Math.max(0, Math.round(calories || 120)) })
  }
  return results
}
