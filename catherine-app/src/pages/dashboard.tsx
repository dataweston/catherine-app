import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadFromCache, saveToCache } from '../lib/cache';
import RequireAuth from '../components/RequireAuth';
import Warnings from '../components/Warnings';
import Charts from '../components/Charts';
import { useAuth } from '../lib/auth';

export default function Dashboard() {
  const { user } = useAuth();
  const [total, setTotal] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [recent, setRecent] = useState<Array<{ text?: string; calories: number; date: string }>>([]);
  const [macros, setMacros] = useState<{ protein: number; carbs: number; fat: number }>({ protein: 0, carbs: 0, fat: 0 });
  const [weights, setWeights] = useState<Array<{ date: string; weight_kg: number }>>([]);
  const [weightInput, setWeightInput] = useState('');
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
  const synced = (await loadFromCache<Array<{ text?: string; calories: number; date: string }>>('synced_entries')) || [];
  const locals = (await loadFromCache<Array<{ text?: string; calories: number; date: string }>>('journal_entries')) || [];
      const today = new Date().toISOString().slice(0, 10);
      const todayItems: Array<{ calories: number; date: string; protein?: number; carbs?: number; fat?: number }> = [...synced, ...locals]
        .filter((s) => s.date.slice(0, 10) === today)
      const todayTotal = todayItems.reduce((sum, s) => sum + (s.calories || 0), 0);
      setTotal(todayTotal);
      // Sum macros if available on entries
      const m = todayItems.reduce<{ protein: number; carbs: number; fat: number }>((acc, s) => ({
        protein: acc.protein + (s.protein || 0),
        carbs: acc.carbs + (s.carbs || 0),
        fat: acc.fat + (s.fat || 0),
      }), { protein: 0, carbs: 0, fat: 0 })
      setMacros(m)
  setRecent([...locals, ...synced].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5));
      // try load profile locally for target display
      const profile = await loadFromCache<{ calorieTarget?: number }>('profile');
      if (profile?.calorieTarget) setTarget(profile.calorieTarget);
      // ensure we reflect server value if available
      try {
        if (user?.id) {
          let headers: Record<string, string> = {}
          try {
            const mod = await import('../lib/supabaseClient')
            const supa = mod.default?.()
            if (supa) {
              const { data } = await supa.auth.getSession()
              const token = data.session?.access_token
              if (token) headers = { Authorization: `Bearer ${token}` }
            }
          } catch {}
          const r = await fetch(`/api/profile?userId=${encodeURIComponent(user.id)}`, { headers })
          if (r.ok) {
            const { profile: p } = await r.json()
            if (p?.calorieTarget) setTarget(p.calorieTarget)
          }
          // Load recent weights
          try {
            const wr = await fetch(`/api/weights?userId=${encodeURIComponent(user.id)}`, { headers })
            if (wr.ok) {
              const { weights: ws } = await wr.json()
              setWeights(ws || [])
              // Prompt weekly if last weight older than 7 days
              const last = (ws || [])[0]
              const lastPrompt = await loadFromCache<{ date: string }>('last_weight_prompt')
              const today = new Date()
              const lastDate = last ? new Date(last.date) : null
              const daysSinceWeight = lastDate ? Math.floor((today.getTime() - lastDate.getTime())/86400000) : Infinity
              const lastPromptDate = lastPrompt?.date ? new Date(lastPrompt.date) : null
              const daysSincePrompt = lastPromptDate ? Math.floor((today.getTime() - lastPromptDate.getTime())/86400000) : Infinity
              setShowWeightPrompt(daysSinceWeight >= 7 && daysSincePrompt >= 7)
            }
          } catch {}
        }
      } catch {}
    })();
  }, [user?.id]);

  return (
    <RequireAuth>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded shadow">
            <h2 className="text-sm text-gray-600">Target</h2>
            <div className="text-3xl font-bold">{target ?? '—'}{target ? ' kcal' : ''}</div>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <h2 className="text-sm text-gray-600">Consumed</h2>
            <div className="text-3xl font-bold">{total} kcal</div>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <h2 className="text-sm text-gray-600">Remaining</h2>
            <div className="text-3xl font-bold">{target ? Math.max(0, target - total) : '—'}{target ? ' kcal' : ''}</div>
          </div>
        </div>
        <div className="mt-4">
          <Warnings caloriesToday={total} />
        </div>
        {showWeightPrompt && (
          <div className="mt-4 p-3 rounded bg-yellow-50 border border-yellow-200 flex items-center justify-between">
            <div className="text-sm text-yellow-900">It’s been a week since your last weigh-in. Log your weight to recalibrate targets.</div>
            <div className="flex gap-2">
              <button className="text-sm bg-yellow-600 text-white px-2 py-1 rounded" onClick={() => {
                const el = document.querySelector<HTMLInputElement>('input[placeholder="Weight (lbs)"]')
                el?.focus()
              }}>Log now</button>
              <button className="text-sm px-2 py-1 rounded border" onClick={async () => {
                setShowWeightPrompt(false)
                await saveToCache('last_weight_prompt', { date: new Date().toISOString() })
              }}>Dismiss</button>
            </div>
          </div>
        )}
        <div className="mt-4 p-4 bg-white rounded shadow">
          <h3 className="font-semibold mb-2">Today macros</h3>
          <div className="flex gap-6 text-sm">
            <div>Protein: <span className="font-semibold">{macros.protein} g</span></div>
            <div>Carbs: <span className="font-semibold">{macros.carbs} g</span></div>
            <div>Fat: <span className="font-semibold">{macros.fat} g</span></div>
          </div>
          {recalcMsg && (
            <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{recalcMsg}</div>
          )}
        </div>
        <div className="mt-6 p-4 bg-white rounded shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Recent entries</h3>
            <Link href="/journal" className="text-blue-600 hover:underline">Open Journal →</Link>
          </div>
          {recent.length === 0 && <div className="text-sm text-gray-500">No recent entries</div>}
          <ul className="divide-y">
            {recent.map((e, idx) => (
              <li key={idx} className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">{new Date(e.date).toLocaleString()}</div>
                  {e.text && <div className="font-medium">{e.text}</div>}
                </div>
                <div className="text-sm font-semibold">{e.calories} kcal</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-8">
          <Charts />
        </div>
        <div className="mt-8 p-4 bg-white rounded shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Weekly weight check-in</h3>
            <div className="text-xs text-gray-600">We’ll prompt weekly if you haven’t logged a weight.</div>
          </div>
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              const value = Number(weightInput)
              if (!value || !user?.id) return
              // Accept lbs input, convert to kg
              const weight_kg = value * 0.45359237
              const date = new Date().toISOString().slice(0,10)
              try {
                let headers: Record<string, string> = { 'Content-Type': 'application/json' }
                try {
                  const mod = await import('../lib/supabaseClient')
                  const supa = mod.default?.()
                  if (supa) {
                    const { data } = await supa.auth.getSession()
                    const token = data.session?.access_token
                    if (token) headers = { ...headers, Authorization: `Bearer ${token}` }
                  }
                } catch {}
                const r = await fetch('/api/weights', { method: 'POST', headers, body: JSON.stringify([{ user_id: user.id, date, weight_kg }]) })
                if (r.ok) {
                  const { weights: ws } = await r.json()
                  setWeights(ws || [])
                  await saveToCache('last_weight_prompt', { date: new Date().toISOString() })
                  setWeightInput('')
                  // Trigger adaptive recalculation (best-effort)
                  try {
                    const rr = await fetch('/api/adaptive/recalculate', { method: 'POST', headers, body: JSON.stringify({ user_id: user.id, lookback_days: 14 }) })
                    if (rr.ok) {
                      const j = await rr.json()
                      if (j?.recommended_calories) {
                        setRecalcMsg(`New suggested calories: ${j.recommended_calories} kcal`)
                        setTimeout(() => setRecalcMsg(null), 5000)
                      }
                    }
                  } catch {}
                }
              } catch {}
            }}
          >
            <input value={weightInput} onChange={(e)=>setWeightInput(e.target.value)} placeholder="Weight (lbs)" className="border rounded p-2 w-40" />
            <button className="bg-blue-600 text-white px-3 py-2 rounded">Log weight</button>
          </form>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Recent weights</h4>
            {weights.length === 0 ? (
              <div className="text-sm text-gray-500">No weights logged yet.</div>
            ) : (
              <ul className="text-sm grid grid-cols-2 gap-2">
                {weights.slice(0,8).map((w, i) => (
                  <li key={`${w.date}-${i}`} className="flex justify-between">
                    <span>{w.date}</span>
                    <span>{(w.weight_kg * 2.2046226218).toFixed(1)} lbs</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
