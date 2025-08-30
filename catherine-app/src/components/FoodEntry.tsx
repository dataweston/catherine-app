export default function FoodEntry({ item }: { item: { text: string; calories: number; date?: string } }) {
  return (
    <div className="p-2 border rounded bg-white">
      <div className="text-sm text-gray-600">{item.date ? new Date(item.date).toLocaleString() : ''}</div>
      <div className="font-medium">{item.text}</div>
      <div className="text-sm">{item.calories} kcal</div>
    </div>
  );
}
