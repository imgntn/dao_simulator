'use client';

import { useMemo } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { DAOMember } from '@/lib/types/visualization';

interface ChoroplethMapProps {
  members: DAOMember[];
  title?: string;
}

export function ChoroplethMap({ members, title = 'Member Distribution by Location' }: ChoroplethMapProps) {
  const locationData = useMemo(() => {
    const locationCounts: Record<string, number> = {};

    members.forEach(member => {
      const location = member.location || 'Unknown';
      locationCounts[location] = (locationCounts[location] || 0) + 1;
    });

    return Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [members]);

  const getColor = (index: number, total: number) => {
    const intensity = 0.3 + (0.7 * (total - index) / total);
    return `hsl(200, 70%, ${100 - intensity * 50}%)`;
  };

  if (!members || members.length === 0) {
    return (
      <div className="w-full h-[400px] p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center">
        <p className="text-gray-500">No location data to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h3>
      <div className="h-[calc(100%-2.5rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={locationData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              type="number"
              label={{ value: 'Number of Members', position: 'insideBottom', offset: -5 }}
              stroke="#9CA3AF"
            />
            <YAxis
              type="category"
              dataKey="location"
              stroke="#9CA3AF"
              width={90}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem'
              }}
              labelStyle={{ color: '#F9FAFB' }}
            />
            <Legend />
            <Bar dataKey="count" name="Members">
              {locationData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(index, locationData.length)} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
