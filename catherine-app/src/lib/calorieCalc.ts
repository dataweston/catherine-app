// src/lib/calorieCalc.ts
// Mifflin-St Jeor + Harris-Benedict formula
export function calculateCalorieTarget({ age, sex, weight, height, activityLevel }: { age: number; sex: 'male' | 'female'; weight: number; height: number; activityLevel: number; }) {
  // Mifflin-St Jeor Equation
  const s = sex === 'male' ? 5 : -161;
  const bmr = 10 * weight + 6.25 * height - 5 * age + s;
  // Harris-Benedict Activity Factor
  return Math.round(bmr * activityLevel);
}
