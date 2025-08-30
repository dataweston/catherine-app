import { useEffect, useState } from 'react';
import { parse } from '../stubs/parserStub';
import { saveToCache, loadFromCache } from '../lib/cache';
import getSupabase from '../lib/supabaseClient';
import { getOrCreateUserId } from '../lib/user';

type Entry = { id: string; text: string; calories: number; date: string; synced?: boolean };
type ParsedItem = { item: string; calories: number };

export default function JournalInput() {
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    (async () => {
      const cached = (await loadFromCache<Entry[]>('journal_entries')) || [];
      setEntries(cached);
      // fetch remote entries to keep dashboard accurate
      try {
        const userId = getOrCreateUserId();
        const resp = await fetch(`/api/entries?userId=${encodeURIComponent(userId)}`)
        if (resp.ok) {
          const json = (await resp.json()) as { entries: Array<{ text: string; calories: number; date: string }> }
          const remote = json.entries.map((e, i) => ({
            id: `r-${Date.now()}-${i}`,
            text: e.text,
            calories: e.calories,
            date: e.date,
            synced: true,
          }))
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
    })();
  }, []);

  async function addEntry() {
    if (!text.trim()) return;
    const parsed = parse(text) as ParsedItem[];
    // parserStub returns array of { item, calories }
    const now = new Date().toISOString();
    const newItems = parsed.map((p: ParsedItem, i: number) => ({
      id: `${Date.now()}-${i}`,
      text: p.item || text,
      calories: p.calories || 0,
      date: now,
      synced: false,
    }));
    const updated = [...newItems, ...entries];
    setEntries(updated);
    await saveToCache('journal_entries', updated);
    setText('');
  }

  async function syncNow() {
    // simple manual sync simulation: mark all as synced and move to 'synced_entries'
    const toSync = entries.map((e) => ({ ...e, synced: true }));
    const existing = (await loadFromCache<Entry[]>('synced_entries')) || [];
    await saveToCache('synced_entries', [...toSync, ...existing]);
    await saveToCache('journal_entries', []);
    // Try Supabase insert
    try {
      const supabase = getSupabase();
      if (supabase) {
        const userId = getOrCreateUserId();
        const rows = toSync.map((e) => ({
          user_id: userId,
          text: e.text,
          calories: e.calories,
          date: e.date,
        }));
        const { error } = await supabase.from('entries').insert(rows);
        if (error) {
          console.warn('Supabase insert entries failed:', error.message);
        }
      }
    } catch (err) {
      console.warn('Supabase client error:', err);
    }
    setEntries([]);
  }

  return (
    <div>
      <label htmlFor="journal-entry">Journal Entry</label>
      <textarea id="journal-entry" value={text} onChange={(e) => setText(e.target.value)} className="w-full border rounded p-2" placeholder="e.g. 2 eggs, 1 banana, 30 min walk" />
      <div className="flex gap-2 mt-2">
        <button onClick={addEntry} className="bg-blue-600 text-white px-3 py-1 rounded">Add</button>
        <button onClick={syncNow} className="bg-green-600 text-white px-3 py-1 rounded">Sync Now</button>
      </div>

      <div className="mt-4">
        <h3 className="font-semibold">Local Entries</h3>
        {entries.length === 0 && <p className="text-sm text-gray-500">No local entries</p>}
        <ul className="space-y-2 mt-2">
          {entries.map((e) => (
            <li key={e.id} className="p-2 border rounded bg-white">
              <div className="text-sm text-gray-600">{new Date(e.date).toLocaleString()}</div>
              <div className="font-medium">{e.text}</div>
              <div className="text-sm">{e.calories} kcal</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
