export type FoodEntry = {
  id: string;
  userId: string;
  date: string;
  name: string;
  amount: string;
  calories: number;
  macros?: {
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  micros?: Record<string, number>;
};
