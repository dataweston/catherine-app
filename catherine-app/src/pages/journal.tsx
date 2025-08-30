import JournalInput from '../components/JournalInput';
import RequireAuth from '../components/RequireAuth';

export default function Journal() {
  return (
    <RequireAuth>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Journal</h1>
        <JournalInput />
      </div>
    </RequireAuth>
  );
}
