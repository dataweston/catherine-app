import JournalInput from '../components/JournalInput';
import RequireAuth from '../components/RequireAuth';
import Link from 'next/link';

export default function Journal() {
  return (
    <RequireAuth>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Journal</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline">Back to Dashboard</Link>
        </div>
        <JournalInput />
      </div>
    </RequireAuth>
  );
}
