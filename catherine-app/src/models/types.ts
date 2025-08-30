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
