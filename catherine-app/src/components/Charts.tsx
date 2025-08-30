import { useEffect, useState } from 'react'
import { loadFromCache } from '../lib/cache'
import { forecastWeight } from '../stubs/forecastStub'
import { useAuth } from '../lib/auth'

type Synced = { calories: number; date: string }

export default function Charts() {
  const [series, setSeries] = useState<Array<{ date: string; calories: number }>>([])
  const { user } = useAuth()

  useEffect(() => {
    (async () => {
      const local = (await loadFromCache<Synced[]>('synced_entries')) || []
      let remote: Synced[] = []
      try {
        const userId = user?.id || ''
        if (userId) {
          const resp = await fetch(`/api/entries?userId=${encodeURIComponent(userId)}`)
          if (resp.ok) {
            const json = (await resp.json()) as { entries: Array<{ text: string; calories: number; date: string }> }
            remote = json.entries.map(e => ({ calories: e.calories, date: e.date }))
          }
        }
      } catch {
        // offline or API not configured; ignore
      }
      // Deduplicate local+remote by date+calories+index bucket to avoid double-counting same records
      const key = (e: Synced, i: number) => `${e.date.slice(0,19)}|${e.calories}|${i}`
      const mergedMap = new Map<string, Synced>()
      local.forEach((e, i) => mergedMap.set(key(e, i), e))
      remote.forEach((e, i) => {
        // try to find an existing equal by date (trimmed) and calories
        const k = key(e, i)
        if (![...mergedMap.values()].some(v => v.date.slice(0,19) === e.date.slice(0,19) && v.calories === e.calories)) {
          mergedMap.set(k, e)
        }
      })

      const merged = Array.from(mergedMap.values())
      // Aggregate by date (YYYY-MM-DD) for last 7 days
      const byDate = new Map<string, number>()
      const today = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const k = d.toISOString().slice(0, 10)
        byDate.set(k, 0)
      }
      for (const e of merged) {
        const k = e.date.slice(0, 10)
        if (byDate.has(k)) byDate.set(k, (byDate.get(k) || 0) + (e.calories || 0))
      }
      const arr = Array.from(byDate.entries()).map(([date, calories]) => ({ date, calories }))
      setSeries(arr)
    })()
  }, [user?.id])

  const max = Math.max(1, ...series.map(d => d.calories))
  // Simple linear trend on indices
  const slope = (() => {
    const n = series.length
    if (n < 2) return 0
    const xs = series.map((_, i) => i)
    const ys = series.map(d => d.calories)
    const xMean = xs.reduce((a, b) => a + b, 0) / n
    const yMean = ys.reduce((a, b) => a + b, 0) / n
    const num = xs.reduce((acc, x, i) => acc + (x - xMean) * (ys[i] - yMean), 0)
    const den = xs.reduce((acc, x) => acc + (x - xMean) ** 2, 0) || 1
    return num / den
  })()
  const trend = slope > 50 ? 'rising' : slope < -50 ? 'falling' : 'stable'
  const forecast = forecastWeight([])

  return (
    <div className="p-4 bg-white rounded">
      <h3 className="font-semibold mb-2">Calories (last 7 days)</h3>
      <div className="space-y-1">
        {series.map(d => (
          <div key={d.date} className="flex items-center gap-2">
            <div className="w-20 text-xs text-gray-600">{d.date.slice(5)}</div>
            <div className="flex-1 bg-gray-100 h-2 rounded">
              <div className="bg-blue-500 h-2 rounded" style={{ width: `${(d.calories / max) * 100}%` }} />
            </div>
            <div className="w-16 text-right text-xs">{d.calories}</div>
          </div>
        ))}
        {series.length === 0 && <div className="text-sm text-gray-500">No data yet.</div>}
      </div>
      <div className="mt-3 text-sm text-gray-600">Weekly trend: {trend} • Forecast: {forecast.trend}</div>
    </div>
  )
}
