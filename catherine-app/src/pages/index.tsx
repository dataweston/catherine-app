
import Link from 'next/link';
import { useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useRouter } from 'next/router';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    (async () => {
      if (loading) return;
      if (user) {
        try {
          const r = await fetch(`/api/profile?userId=${encodeURIComponent(user.id)}`)
          if (r.ok) {
            const { profile } = await r.json()
            if (profile && profile.calorieTarget) router.replace('/dashboard')
            else router.replace('/onboarding')
          } else router.replace('/onboarding')
        } catch { router.replace('/onboarding') }
      }
    })()
  }, [loading, user, router]);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-3xl font-bold mb-2">Welcome to My Fitness App</h1>
      <p className="mb-6 text-center max-w-md">
        Track your health, nutrition, and progress. Log your food and exercise, set goals, and visualize your journey—all in one place.
      </p>
      <nav className="flex flex-col gap-3 w-full max-w-xs">
        <Link href="/login" legacyBehavior>
          <a className="w-full bg-blue-600 text-white py-2 rounded text-center hover:bg-blue-700 block">Continue</a>
        </Link>
      </nav>
    </main>
  );
}
