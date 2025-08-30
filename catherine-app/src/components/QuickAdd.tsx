import { FormEvent, useState } from 'react'

type SearchResult = {
  items: Array<{ name: string; serving: string; calories: number }>
  query: string
}

export default function QuickAdd() {
  const [text, setText] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!text.trim()) return
    try {
      setLoading(true)
      const q = encodeURIComponent(text)
      const res = await fetch(`/api/food/search?q=${q}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as SearchResult
      setResults(json)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed'
      setError(msg)
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <form onSubmit={search} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 1 cup brown rice"
          className="flex-1 border rounded p-2"
        />
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50">
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      {results && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Matches</h4>
          {results.items.length === 0 ? (
            <div className="text-sm text-gray-500">No matches</div>
          ) : (
            <ul className="divide-y">
              {results.items.map((it, idx) => (
                <li key={`${it.name}-${idx}`} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-sm text-gray-600">{it.serving}</div>
                  </div>
                  <div className="text-sm font-semibold">{it.calories} kcal</div>
                </li>
              ))}
            </ul>
          )}
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-gray-600">View JSON</summary>
            <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(results, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  )
}
