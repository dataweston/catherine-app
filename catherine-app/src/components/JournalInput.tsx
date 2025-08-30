import { useEffect, useState } from 'react';
import { parse } from '../stubs/parserStub';
import { saveToCache, loadFromCache } from '../lib/cache';
import { useAuth } from '../lib/auth';

type Entry = { id: string; text: string; calories: number; date: string; synced?: boolean; protein?: number; carbs?: number; fat?: number };
type ParsedItem = { item: string; calories: number };

export default function JournalInput() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Safely get the current access token for Authorization headers
  async function getAuthToken(): Promise<string | undefined> {
    try {
      const mod = await import('../lib/supabaseClient');
      const supa = mod.default?.();
      if (!supa) return undefined;
      const { data } = await supa.auth.getSession();
      return data.session?.access_token || undefined;
    } catch {
      return undefined;
    }
  }

  useEffect(() => {
    (async () => {
    const cached = (await loadFromCache<Entry[]>('journal_entries')) || [];
      // fetch remote entries to keep dashboard accurate
      try {
  const userId = user?.id || '';
  if (!userId) return;
  const token = await getAuthToken();
  const resp = await fetch(`/api/entries?userId=${encodeURIComponent(userId)}` , { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (resp.ok) {
      const json = (await resp.json()) as { entries: Array<{ id: string; text: string; calories: number; date: string }> }
      const remote = json.entries.map((e) => ({ id: e.id, text: e.text, calories: e.calories, date: e.date, synced: true }))
          const existingSynced = (await loadFromCache<Entry[]>('synced_entries')) || []
          // Merge by date+text+calories to avoid obvious dupes
          const key = (e: Entry) => `${e.date.slice(0,19)}|${e.text}|${e.calories}`
          const map = new Map(existingSynced.map(e => [key(e), e]))
          for (const r of remote) if (!map.has(key(r))) map.set(key(r), r)
          await saveToCache('synced_entries', Array.from(map.values()))
        }
      } catch {
        // ignore offline/network errors
      }
    // Combine remote (synced) + local (unsynced) for view
    const synced = (await loadFromCache<Entry[]>('synced_entries')) || []
    setEntries([...(cached || []), ...synced].sort((a, b) => (b.date.localeCompare(a.date))))
      // attempt auto-sync of any unsynced local entries if authenticated
      try {
        const userId = user?.id || '';
        if (!userId) return;
        const toSync = cached.filter(e => !e.synced)
        if (toSync.length) {
          const rows = toSync.map((e) => ({ user_id: userId, text: e.text, calories: e.calories, date: e.date }))
          const token = await getAuthToken();
          const res = await fetch('/api/entries', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(rows) })
          if (res.ok) {
            const updated = cached.map(e => ({ ...e, synced: true }))
            setEntries(updated)
            await saveToCache('journal_entries', updated)
            const existing = (await loadFromCache<Entry[]>('synced_entries')) || []
            await saveToCache('synced_entries', [...toSync.map(e => ({ ...e, synced: true })), ...existing])
          }
        }
      } catch {}
    })();
  }, [user?.id]);

  async function addEntry() {
  if (!text.trim()) return;
    // First try real nutrition API for robust parsing; fall back to stub parser
    let newItems: Entry[] = []
    const now = new Date().toISOString();
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(text)}`)
      if (res.ok) {
        const j = await res.json() as { items: Array<{ name: string; serving: string; calories: number; protein?: number; carbs?: number; fat?: number }> }
        if (Array.isArray(j.items) && j.items.length > 0) {
          newItems = j.items.map((it, i) => ({
            id: `${Date.now()}-${i}`,
            text: `${it.name} (${it.serving})`,
            calories: Math.max(0, Math.round(it.calories || 0)),
            protein: typeof it.protein === 'number' ? Math.max(0, Math.round(it.protein)) : undefined,
            carbs: typeof it.carbs === 'number' ? Math.max(0, Math.round(it.carbs)) : undefined,
            fat: typeof it.fat === 'number' ? Math.max(0, Math.round(it.fat)) : undefined,
            date: now,
            synced: false,
          }))
        }
      }
    } catch {}
    if (newItems.length === 0) {
      const parsed = parse(text) as ParsedItem[];
      newItems = parsed.map((p: ParsedItem, i: number) => ({
        id: `${Date.now()}-${i}`,
        text: p.item || text,
        calories: p.calories || 0,
        date: now,
        synced: false,
      }));
    }
  const updatedLocal = [...newItems, ...entries.filter(e => !e.synced)];
    setEntries([...
      updatedLocal,
      ...((await loadFromCache<Entry[]>('synced_entries')) || [])
    ].sort((a,b) => b.date.localeCompare(a.date)))
    await saveToCache('journal_entries', updatedLocal);
    // Try to auto-sync immediately if logged in
    try {
      const userId = user?.id || '';
      if (userId) {
        const rows = newItems.map((e) => ({ user_id: userId, text: e.text, calories: e.calories, date: e.date }))
        const token = await getAuthToken();
        const res = await fetch('/api/entries', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(rows) })
        if (res.ok) {
          const data = await res.json() as { entries: Array<{ id: string; text: string; calories: number; date: string }> }
          // Preserve macros from newItems by zipping order
          const inserted: Entry[] = data.entries.map((e, i) => ({
            id: e.id, text: e.text, calories: e.calories, date: e.date, synced: true,
            protein: newItems[i]?.protein, carbs: newItems[i]?.carbs, fat: newItems[i]?.fat,
          }))
          // Clear the local versions we just synced
          const remainingLocal = (await loadFromCache<Entry[]>('journal_entries'))?.filter(e => !newItems.some(n => n.id === e.id)) || []
          await saveToCache('journal_entries', remainingLocal)
          // Update synced cache
          const existing = (await loadFromCache<Entry[]>('synced_entries')) || []
          await saveToCache('synced_entries', [...inserted, ...existing])
          // Refresh view
          setEntries([...
            remainingLocal,
            ...inserted,
            ...existing
          ].sort((a,b) => b.date.localeCompare(a.date)))
        }
      }
    } catch {}
    setText('');
  }

  function startEdit(id: string, currentText: string) {
    setEditingId(id)
    setEditingText(currentText)
  }

  async function saveEdit(id: string) {
    const parsed = parse(editingText) as ParsedItem[]
    const calories = Math.max(0, Math.round(parsed.reduce((s, p) => s + (p.calories || 0), 0)))
    const target = entries.find(e => e.id === id)
    if (!target) return
    if (target.synced) {
      // Update on server
      try {
  const userId = user?.id || ''
  if (!userId) return
  const token = await getAuthToken();
        const res = await fetch('/api/entries', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ id, user_id: userId, text: editingText, calories }),
        })
        if (res.ok) {
          const { entry } = await res.json() as { entry: { id: string; text: string; calories: number; date: string } }
          const synced = (await loadFromCache<Entry[]>('synced_entries')) || []
          const newSynced = synced.map(e => e.id === id ? { ...e, text: entry.text, calories: entry.calories } : e)
          await saveToCache('synced_entries', newSynced)
          const locals = (await loadFromCache<Entry[]>('journal_entries')) || []
          setEntries([ ...locals, ...newSynced ].sort((a,b) => b.date.localeCompare(a.date)))
        }
      } catch {}
    } else {
      const updated = entries.map(e => e.id === id ? { ...e, text: editingText, calories } : e)
      setEntries(updated)
      await saveToCache('journal_entries', updated.filter(e => !e.synced))
    }
    setEditingId(null)
    setEditingText('')
  }

  async function deleteEntry(id: string) {
    const target = entries.find(e => e.id === id)
    if (!target) return
    if (target.synced) {
      try {
  const userId = user?.id || ''
  if (!userId) return
  const token = await getAuthToken();
  const res = await fetch('/api/entries', { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id, user_id: userId }) })
        if (res.ok) {
          const synced = (await loadFromCache<Entry[]>('synced_entries')) || []
          const newSynced = synced.filter(e => e.id !== id)
          await saveToCache('synced_entries', newSynced)
          const locals = (await loadFromCache<Entry[]>('journal_entries')) || []
          setEntries([ ...locals, ...newSynced ].sort((a,b) => b.date.localeCompare(a.date)))
        }
      } catch {}
    } else {
      const newLocals = (await loadFromCache<Entry[]>('journal_entries'))?.filter(e => e.id !== id) || []
      await saveToCache('journal_entries', newLocals)
      const synced = (await loadFromCache<Entry[]>('synced_entries')) || []
      setEntries([ ...newLocals, ...synced ].sort((a,b) => b.date.localeCompare(a.date)))
    }
  }

  return (
    <div>
      <label htmlFor="journal-entry">Journal Entry</label>
      <textarea id="journal-entry" value={text} onChange={(e) => setText(e.target.value)} className="w-full border rounded p-2" placeholder="e.g. 2 eggs, 1 banana, 30 min walk" />
      <div className="flex gap-2 mt-2">
        <button onClick={addEntry} className="bg-blue-600 text-white px-3 py-1 rounded">Add</button>
      </div>

      <div className="mt-4">
        <h3 className="font-semibold">Entries</h3>
        {entries.length === 0 && <p className="text-sm text-gray-500">No entries yet</p>}
        <ul className="space-y-2 mt-2">
          {entries.map((e) => (
            <li key={e.id} className="p-2 border rounded bg-white">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm text-gray-600">{new Date(e.date).toLocaleString()}</div>
                  {editingId === e.id ? (
                    <input className="mt-1 border rounded p-1 w-full" value={editingText} onChange={ev => setEditingText(ev.target.value)} />
                  ) : (
                    <div className="font-medium">{e.text}</div>
                  )}
                  <div className="text-sm">{e.calories} kcal {e.synced && <span className="text-gray-500">• synced</span>}</div>
                </div>
                <div className="flex gap-2">
                  {editingId === e.id ? (
                    <>
                      <button className="text-sm bg-green-600 text-white px-2 py-1 rounded" onClick={() => saveEdit(e.id)}>Save</button>
                      <button className="text-sm bg-gray-300 px-2 py-1 rounded" onClick={() => { setEditingId(null); setEditingText('') }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="text-sm bg-gray-200 px-2 py-1 rounded" onClick={() => startEdit(e.id, e.text)}>Edit</button>
                      <button className="text-sm bg-red-600 text-white px-2 py-1 rounded" onClick={() => deleteEntry(e.id)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
