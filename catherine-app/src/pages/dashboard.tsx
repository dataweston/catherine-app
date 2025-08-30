import { useEffect, useState } from 'react';
import { loadFromCache } from '../lib/cache';
import Warnings from '../components/Warnings';

export default function Dashboard() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      const synced = (await loadFromCache<Array<{ calories: number; date: string }>>('synced_entries')) || [];
      const today = new Date().toISOString().slice(0, 10);
      const todayTotal = synced
        .filter((s) => s.date.slice(0, 10) === today)
        .reduce((sum, s) => sum + (s.calories || 0), 0);
      setTotal(todayTotal);
    })();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="p-4 bg-white rounded shadow">
  <h2 className="text-lg">Today&apos;s calories</h2>
        <div className="text-3xl font-bold">{total} kcal</div>
      </div>
      <div className="mt-4">
        <Warnings caloriesToday={total} />
      </div>
    </div>
  );
}
