import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadFromCache } from '../lib/cache';
import RequireAuth from '../components/RequireAuth';
import Warnings from '../components/Warnings';
import Charts from '../components/Charts';
import { useAuth } from '../lib/auth';

export default function Dashboard() {
  const { user } = useAuth();
  const [total, setTotal] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [recent, setRecent] = useState<Array<{ text?: string; calories: number; date: string }>>([]);

  useEffect(() => {
    (async () => {
      const synced = (await loadFromCache<Array<{ text?: string; calories: number; date: string }>>('synced_entries')) || [];
      const today = new Date().toISOString().slice(0, 10);
      const todayTotal = synced
        .filter((s) => s.date.slice(0, 10) === today)
        .reduce((sum, s) => sum + (s.calories || 0), 0);
      setTotal(todayTotal);
      setRecent(synced.slice(0, 5));
      // try load profile locally for target display
      const profile = await loadFromCache<{ calorieTarget?: number }>('profile');
      if (profile?.calorieTarget) setTarget(profile.calorieTarget);
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
      </div>
    </RequireAuth>
  );
}
