#!/bin/bash
# setup.sh – scaffold the fitness tracking app

set -e

echo "⚡ Setting up project scaffold..."

# Remove boilerplate
rm -rf src
mkdir -p src/pages src/components src/lib src/models src/stubs styles

# === Pages ===
cat > src/pages/index.tsx <<'EOF'
export default function Home() {
  return (
    <main>
      <h1>Fitness Tracker</h1>
      <p>Natural language food & exercise logging, adaptive calorie tracking, and forecasting.</p>
    </main>
  )
}
EOF

# === Supabase client ===
cat > src/lib/supabaseClient.ts <<'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseKey)
EOF

# === Local caching ===
cat > src/lib/cache.ts <<'EOF'
export function saveToCache(key: string, value: any) {
  localStorage.setItem(key, JSON.stringify(value))
}
export function loadFromCache<T>(key: string): T | null {
  const item = localStorage.getItem(key)
  return item ? JSON.parse(item) as T : null
}
EOF

# === Stubs ===
cat > src/stubs/parserStub.ts <<'EOF'
export function parseFoodInput(input: string) {
  // TODO: Replace with NLP food parsing
  return [{ item: input, calories: 100 }]
}
EOF

cat > src/stubs/forecastStub.ts <<'EOF'
export function forecastWeight(data: Array<{date: string, weight: number}>) {
  // TODO: Replace with ML model
  return { trend: "stable", prediction: [] }
}
EOF

# === Models ===
cat > src/models/types.ts <<'EOF'
export interface FoodLog {
  id?: string
  date: string
  description: string
  calories: number
  macros?: { protein: number, fat: number, carbs: number }
}
export interface WeightLog {
  id?: string
  date: string
  weight: number
}
EOF

# === Styles (placeholder) ===
cat > styles/globals.css <<'EOF'
body {
  margin: 0;
  font-family: sans-serif;
}
EOF

echo "✅ Scaffold complete."
echo "Next steps:"
echo "1. Run 'npm install @supabase/supabase-js'"
echo "2. Create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "3. Run 'npm run dev' to start."
