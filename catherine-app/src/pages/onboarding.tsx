import { useEffect, useState } from 'react';
import { calculateCalorieTarget } from '../lib/calorieCalc';
import { saveToCache } from '../lib/cache';
import RequireAuth from '../components/RequireAuth';
import { useAuth } from '../lib/auth';
import { useRouter } from 'next/router';

type FormState = {
  age: string;
  sex: 'male' | 'female' | '';
  weight: string;
  height: string;
  goal: 'gain' | 'lose' | 'maintain' | '';
  activityLevel: string;
  favoriteFoods: string;
};

const initialState: FormState = {
  age: '',
  sex: '',
  weight: '',
  height: '',
  goal: '',
  activityLevel: '',
  favoriteFoods: '',
};

export default function Onboarding() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [form, setForm] = useState<FormState>(initialState);
  const [calorieTarget, setCalorieTarget] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // If already onboarded, skip to dashboard
    (async () => {
      if (loading) return;
      if (!user) return; // RequireAuth will gate rendering
      try {
        const r = await fetch(`/api/profile?userId=${encodeURIComponent(user.id)}`)
        if (r.ok) {
          const { profile } = await r.json()
          if (profile && profile.calorieTarget) router.replace('/dashboard')
        }
      } catch {}
    })()
  }, [loading, user, router])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Calculate calorie target
    if (
      form.age && form.sex && form.weight && form.height && form.activityLevel && form.goal
    ) {
      const weightKg = Number(form.weight) * 0.45359237
      const heightCm = Number(form.height) * 2.54
      const calorie = calculateCalorieTarget({
        age: Number(form.age),
        sex: form.sex as 'male' | 'female',
        weight: weightKg,
        height: heightCm,
        activityLevel: Number(form.activityLevel),
      });
      setCalorieTarget(calorie);
      setSubmitted(true);
      const favorites = form.favoriteFoods
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const profile = {
        id: user!.id,
        age: Number(form.age),
        sex: form.sex as 'male' | 'female',
  weight: weightKg,
  height: heightCm,
        goal: form.goal as 'gain' | 'lose' | 'maintain',
        activityLevel: Number(form.activityLevel),
        favoriteFoods: favorites,
        calorieTarget: calorie,
      };
      // Save locally and POST to our API to persist on the server
      await saveToCache('profile', profile);
      // Also cache quick actions for journal (favorites)
      await saveToCache('quick_actions', favorites.map(name => ({ name, serving: '1', calories: 0 })))
      try {
        await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        })
      } catch (err) {
        console.warn('Profile API error:', err)
      }
      router.replace('/dashboard')
    }
  }

  if (loading) return <div className="p-4">Loading…</div>

  return (
    <RequireAuth>
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Onboarding</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Age</label>
          <input name="age" type="number" min="10" max="120" value={form.age} onChange={handleChange} className="w-full border rounded p-2" required />
        </div>
        <div>
          <label className="block mb-1">Sex</label>
          <select name="sex" value={form.sex} onChange={handleChange} className="w-full border rounded p-2" required>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Weight (lbs)</label>
          <input name="weight" type="number" min="66" max="660" value={form.weight} onChange={handleChange} className="w-full border rounded p-2" required />
        </div>
        <div>
          <label className="block mb-1">Height (inches)</label>
          <input name="height" type="number" min="39" max="98" value={form.height} onChange={handleChange} className="w-full border rounded p-2" required />
        </div>
        <div>
          <label className="block mb-1">Goal</label>
          <select name="goal" value={form.goal} onChange={handleChange} className="w-full border rounded p-2" required>
            <option value="">Select</option>
            <option value="gain">Gain</option>
            <option value="lose">Lose</option>
            <option value="maintain">Maintain</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Activity Level</label>
          <select name="activityLevel" value={form.activityLevel} onChange={handleChange} className="w-full border rounded p-2" required>
            <option value="">Select</option>
            <option value="1.2">Sedentary (little or no exercise)</option>
            <option value="1.375">Lightly active (light exercise/sports 1-3 days/week)</option>
            <option value="1.55">Moderately active (moderate exercise/sports 3-5 days/week)</option>
            <option value="1.725">Very active (hard exercise/sports 6-7 days/week)</option>
            <option value="1.9">Super active (very hard exercise & physical job)</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Favorite Foods (comma separated)</label>
          <textarea name="favoriteFoods" value={form.favoriteFoods} onChange={handleChange} className="w-full border rounded p-2" />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">Calculate Calorie Target</button>
      </form>
      {submitted && calorieTarget && (
        <div className="mt-6 p-4 bg-green-100 rounded">
          <h2 className="font-semibold">Your daily calorie target:</h2>
          <p className="text-xl">{calorieTarget} kcal</p>
        </div>
      )}
    </div>
    </RequireAuth>
  );
}
