'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PriceLineChartProps {
  data: Array<{ step: number; price: number }>;
  title?: string;
  interactive?: boolean;
}

export function PriceLineChart({ data, title = 'DAO Token Price History', interactive = false }: PriceLineChartProps) {
  const chartData = data.map((item, index) => ({
    step: item.step ?? index,
    price: item.price,
  }));

  return (
    <div className="w-full h-[400px] p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h3>
      <div className="h-[calc(100%-2.5rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="step"
              label={{ value: 'Step', position: 'insideBottom', offset: -5 }}
              stroke="#9CA3AF"
            />
            <YAxis
              label={{ value: 'DAO Token Price', angle: -90, position: 'insideLeft' }}
              stroke="#9CA3AF"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem'
              }}
              labelStyle={{ color: '#F9FAFB' }}
              itemStyle={{ color: '#60A5FA' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={interactive ? { fill: '#3B82F6', r: 4 } : false}
              activeDot={interactive ? { r: 6 } : false}
              name="Price"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
