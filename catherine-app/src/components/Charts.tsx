import { forecastWeight } from '../stubs/forecastStub';

export default function Charts() {
  // dummy data
  const data = [
    { date: '2025-08-01', calories: 2000 },
    { date: '2025-08-02', calories: 2100 },
    { date: '2025-08-03', calories: 1900 },
  ];
  const forecast = forecastWeight([]);
  return (
    <div className="p-4 bg-white rounded">
      <h3 className="font-semibold mb-2">Charts (stub)</h3>
      <div className="text-sm text-gray-600">Dummy daily calories: {data.map((d) => d.calories).join(', ')}</div>
      <div className="text-sm text-gray-600">Forecast: {forecast.trend}</div>
    </div>
  );
}
