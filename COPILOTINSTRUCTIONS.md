# Project Instructions for GitHub Copilot

## Goal
Build a lightweight, browser-based health/fitness tracker for a single user. Core function: methodical weight gain or loss through calorie goal tracking, natural-language food/exercise journaling, and clear visualizations.

## Tech Stack
- Frontend: Next.js (React + TypeScript), TailwindCSS  
- Backend: Supabase (auth, database, edge functions)  
- Deployment: Vercel  
- Local caching: IndexedDB + localStorage fallback  
- Natural Language Parsing: Stubbed now; later integrate USDA/Nutritionix APIs  
- Authentication: Supabase Auth  
- Charts: Recharts  

## Core Features (MVP)
1. **Login + Onboarding**  
   - Collect age, sex, weight, height, goal (gain/lose/maintain), activity level, favorite foods.  
   - Calculate calorie target using Mifflin-St Jeor + Harris-Benedict.  

2. **Journal (Natural Language Input)**  
   - Input meals/supplements/exercise in plain text.  
   - Parse to structured food/exercise entries.  
   - Handle vague units ("a bite") with defaults or “?” indicator.  

3. **Calories + Macros/Micros**  
   - Track total calories, macros, micros daily.  
   - Adaptive calorie targets adjust with logged weight trends.  

4. **Exercise & Steps**  
   - Log workouts or steps (manual entry).  
   - Estimate calorie burn.  

5. **Visualization**  
   - Daily/weekly charts: calories, macros, weight trajectory.  
   - 30-day forecast line.  

6. **Offline-first**  
   - Cache journal entries locally (IndexedDB).  
   - Sync with Supabase when online.  

7. **Safety Features**  
   - Soft warnings when over/under safe calorie thresholds.  
   - Professional guideline references.  

## Coding Guidelines
- Keep components modular (e.g., `JournalInput`, `FoodEntry`, `Charts`).  
- Use TypeScript types for all models (`UserProfile`, `FoodEntry`, `ExerciseEntry`).  
- Store unfinished features in `/stubs`.  
- Always leave clear TODO comments for unfinished integration points.  
- Prioritize readability and maintainability over cleverness.  

## Next Steps
- Generate scaffolding for Next.js app.  
- Implement Supabase connection.  
- Build Login + Onboarding flow.  
- Build Journal input box with parser stub.  
- Build Charts stub with Recharts.  
