'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts';
import { messages as m } from '@/lib/i18n';

interface PriceLineChartProps {
  data: Array<{ step: number; price: number }>;
  title?: string;
  interactive?: boolean;
  isLoading?: boolean;
  thresholds?: { warning?: number; critical?: number };
  onDataPointClick?: (step: number, price: number) => void;
  heightClassName?: string;
}

// Loading skeleton component
function ChartSkeleton({ title, heightClassName }: { title: string; heightClassName: string }) {
  return (
    <div className={`w-full ${heightClassName} p-4 bg-gray-800 rounded-lg shadow-lg animate-pulse`}>
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
function EmptyState({ title, heightClassName }: { title: string; heightClassName: string }) {
  return (
    <div className={`w-full ${heightClassName} p-4 bg-gray-800 rounded-lg shadow-lg`}>
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
          <p className="text-gray-400 text-sm">{m.charts.noDataYet}</p>
          <p className="text-gray-500 text-xs mt-1">{m.charts.startToSee}</p>
        </div>
      </div>
    </div>
  );
}

// Stats summary component
function PriceStats({
  current,
  min,
  max,
  change,
  changePercent,
}: {
  current: number;
  min: number;
  max: number;
  change: number;
  changePercent: number;
}) {
  const isPositive = change >= 0;

  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1">
        <span className="text-gray-400">{m.charts.currentLabel}:</span>
        <span className="text-white font-semibold">${current.toFixed(4)}</span>
      </div>
      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isPositive ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'}
          />
        </svg>
        <span>{isPositive ? '+' : ''}{changePercent.toFixed(2)}%</span>
      </div>
      <div className="flex items-center gap-1 text-gray-400">
        <span>{m.charts.rangeLabel}:</span>
        <span className="text-gray-300">${min.toFixed(4)} - ${max.toFixed(4)}</span>
      </div>
    </div>
  );
}

export function PriceLineChart({
  data,
  title = 'DAO Token Price History',
  interactive = false,
  isLoading = false,
  thresholds,
  onDataPointClick,
  heightClassName,
}: PriceLineChartProps) {
  // Track brush range for potential future use (zoom state)
  const [, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});
  const heightClass = heightClassName ?? 'h-[clamp(240px,45vh,420px)]';

  // Memoize chart data transformation
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      step: item.step ?? index,
      price: item.price,
    }));
  }, [data]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const prices = chartData.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const currentPrice = prices[prices.length - 1];
    const startPrice = prices[0];
    const change = currentPrice - startPrice;
    const changePercent = startPrice !== 0 ? (change / startPrice) * 100 : 0;

    return {
      minPrice,
      maxPrice,
      currentPrice,
      change,
      changePercent,
    };
  }, [chartData]);

  // Handle data point click
  const handleClick = useCallback(
    (data: { activePayload?: Array<{ payload: { step: number; price: number } }> }) => {
      if (onDataPointClick && data.activePayload?.[0]) {
        const { step, price } = data.activePayload[0].payload;
        onDataPointClick(step, price);
      }
    },
    [onDataPointClick]
  );

  // Show loading state
  if (isLoading) {
    return <ChartSkeleton title={title} heightClassName={heightClass} />;
  }

  // Show empty state
  if (!data || data.length === 0) {
    return <EmptyState title={title} heightClassName={heightClass} />;
  }

  // Calculate Y-axis domain with padding
  const yMin = stats ? Math.max(0, stats.minPrice - (stats.maxPrice - stats.minPrice) * 0.1) : 0;
  const yMax = stats ? stats.maxPrice + (stats.maxPrice - stats.minPrice) * 0.1 : 1;

  return (
    <div
      className={`w-full ${heightClass} p-4 bg-gray-800 rounded-lg shadow-lg`}
      role="img"
      aria-label={`${title} chart showing ${data.length} data points`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-xs text-gray-500">{data.length} {m.charts.dataPoints}</p>
        </div>
        {stats && (
          <PriceStats
            current={stats.currentPrice}
            min={stats.minPrice}
            max={stats.maxPrice}
            change={stats.change}
            changePercent={stats.changePercent}
          />
        )}
      </div>

      <div className="h-[calc(100%-3.5rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
            onClick={interactive ? (handleClick as unknown as (data: unknown) => void) : undefined}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="step"
              label={{ value: 'Step', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <YAxis
              domain={[yMin, yMax]}
              label={{ value: 'Price', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />

            {/* Threshold reference lines */}
            {thresholds?.warning && (
              <ReferenceLine
                y={thresholds.warning}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                label={{ value: 'Warning', fill: '#F59E0B', fontSize: 10, position: 'right' }}
              />
            )}
            {thresholds?.critical && (
              <ReferenceLine
                y={thresholds.critical}
                stroke="#EF4444"
                strokeDasharray="5 5"
                label={{ value: 'Critical', fill: '#EF4444', fontSize: 10, position: 'right' }}
              />
            )}

            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#F9FAFB' }}
              itemStyle={{ color: '#60A5FA' }}
              formatter={(value: number) => [`$${value.toFixed(4)}`, 'Price']}
              labelFormatter={(label) => `Step ${label}`}
            />
            <Legend wrapperStyle={{ color: '#9CA3AF' }} />

            <Line
              type="monotone"
              dataKey="price"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={interactive ? { fill: '#3B82F6', r: 3, cursor: 'pointer' } : false}
              activeDot={interactive ? { r: 6, stroke: '#1D4ED8', strokeWidth: 2 } : false}
              name="Token Price"
              animationDuration={300}
            />

            {/* Brush for zooming (only for larger datasets) */}
            {data.length > 50 && (
              <Brush
                dataKey="step"
                height={20}
                stroke="#4B5563"
                fill="#1F2937"
                onChange={(range) => setBrushRange(range)}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Screen reader description */}
      <div className="sr-only" role="status">
        Price chart showing {data.length} data points.
        Current price: ${stats?.currentPrice.toFixed(4) ?? 'N/A'}.
        {stats && stats.minPrice !== stats.maxPrice && (
          `Range: $${stats.minPrice.toFixed(4)} to $${stats.maxPrice.toFixed(4)}.`
        )}
        {stats && (
          `Price change: ${stats.change >= 0 ? '+' : ''}${stats.changePercent.toFixed(2)}%.`
        )}
      </div>
    </div>
  );
}
