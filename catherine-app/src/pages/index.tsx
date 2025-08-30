
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-3xl font-bold mb-2">Welcome to My Fitness App</h1>
      <p className="mb-6 text-center max-w-md">
        Track your health, nutrition, and progress. Log your food and exercise, set goals, and visualize your journey—all in one place.
      </p>
      <nav className="flex flex-col gap-3 w-full max-w-xs">
        <Link href="/onboarding" legacyBehavior>
          <a className="w-full bg-blue-600 text-white py-2 rounded text-center hover:bg-blue-700 block">Get Started (Onboarding)</a>
        </Link>
        <Link href="/login" legacyBehavior>
          <a className="w-full bg-gray-200 py-2 rounded text-center hover:bg-gray-300 block">Login</a>
        </Link>
        <Link href="/journal" legacyBehavior>
          <a className="w-full bg-gray-200 py-2 rounded text-center hover:bg-gray-300 block">Journal</a>
        </Link>
        <Link href="/dashboard" legacyBehavior>
          <a className="w-full bg-gray-200 py-2 rounded text-center hover:bg-gray-300 block">Dashboard</a>
        </Link>
      </nav>
    </main>
  );
}
