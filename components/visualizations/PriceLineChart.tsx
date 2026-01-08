'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PriceLineChartProps {
  data: Array<{ step: number; price: number }>;
  title?: string;
  interactive?: boolean;
  isLoading?: boolean;
}

// Loading skeleton component
function ChartSkeleton({ title }: { title: string }) {
  return (
    <div className="w-full h-[400px] p-4 bg-gray-800 rounded-lg shadow-lg animate-pulse">
      <div className="h-6 w-48 bg-gray-700 rounded mb-4" />
      <div className="h-[calc(100%-2.5rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin" />
          <p className="text-gray-500 text-sm">Loading {title.toLowerCase()}...</p>
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ title }: { title: string }) {
  return (
    <div className="w-full h-[400px] p-4 bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-white">{title}</h3>
      <div className="h-[calc(100%-2.5rem)] flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg">
        <div className="text-center px-4">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
          <p className="text-gray-400 text-sm">No price data available yet</p>
          <p className="text-gray-500 text-xs mt-1">Start a simulation to see price history</p>
        </div>
      </div>
    </div>
  );
}

export function PriceLineChart({
  data,
  title = 'DAO Token Price History',
  interactive = false,
  isLoading = false,
}: PriceLineChartProps) {
  // Memoize chart data transformation
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      step: item.step ?? index,
      price: item.price,
    }));
  }, [data]);

  // Show loading state
  if (isLoading) {
    return <ChartSkeleton title={title} />;
  }

  // Show empty state
  if (!data || data.length === 0) {
    return <EmptyState title={title} />;
  }

  // Calculate min/max for better Y-axis scaling
  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1 || 0.1;

  return (
    <div
      className="w-full h-[400px] p-4 bg-gray-800 rounded-lg shadow-lg"
      role="img"
      aria-label={`${title} chart showing ${data.length} data points`}
    >
      <h3 className="text-xl font-bold mb-4 text-white">{title}</h3>
      <div className="h-[calc(100%-2.5rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            aria-label={title}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="step"
              label={{ value: 'Step', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis
              domain={[Math.max(0, minPrice - padding), maxPrice + padding]}
              label={{ value: 'Price', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#F9FAFB' }}
              itemStyle={{ color: '#60A5FA' }}
              formatter={(value: number) => [value.toFixed(4), 'Price']}
              labelFormatter={(label) => `Step ${label}`}
            />
            <Legend
              wrapperStyle={{ color: '#9CA3AF' }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={interactive ? { fill: '#3B82F6', r: 4 } : false}
              activeDot={interactive ? { r: 6 } : false}
              name="Token Price"
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Screen reader description */}
      <div className="sr-only">
        Price chart showing {data.length} data points.
        Current price: {chartData[chartData.length - 1]?.price.toFixed(4) ?? 'N/A'}.
        {minPrice !== maxPrice && (
          <>
            Range: {minPrice.toFixed(4)} to {maxPrice.toFixed(4)}.
          </>
        )}
      </div>
    </div>
  );
}
