export default function Warnings({ caloriesToday = 0 }: { caloriesToday?: number }) {
  const low = caloriesToday > 0 && caloriesToday < 1200;
  const high = caloriesToday > 3500;
  return (
    <div>
      {low && <div className="p-2 bg-yellow-100 rounded">Your calorie intake looks low. Consider consulting guidelines.</div>}
      {high && <div className="p-2 bg-red-100 rounded">Your calorie intake is high for today.</div>}
      {!low && !high && <div className="p-2 bg-green-50 rounded">Calorie intake is within expected range.</div>}
    </div>
  );
}
