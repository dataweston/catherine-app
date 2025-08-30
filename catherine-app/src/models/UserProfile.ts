export type UserProfile = {
  id: string;
  age: number;
  sex: 'male' | 'female';
  weight: number;
  height: number;
  goal: 'gain' | 'lose' | 'maintain';
  activityLevel: number;
  favoriteFoods: string[];
  calorieTarget: number;
};
