'use client';

import { useMemo, useState, useCallback } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DAOMember } from '@/lib/types/visualization';

interface ChoroplethMapProps {
  members: DAOMember[];
  title?: string;
  onLocationSelect?: (location: string | null, members: DAOMember[]) => void;
  isLoading?: boolean;
  maxLocations?: number;
}

interface LocationData {
  location: string;
  count: number;
  percentage: number;
  members: string[];
}

// Color gradient based on relative rank
const getLocationColor = (index: number, total: number, isSelected: boolean): string => {
  if (isSelected) return '#FBBF24';
  const intensity = 0.3 + (0.7 * (total - index) / total);
  const hue = 200 + (index / total) * 20; // Slight hue shift
  return `hsl(${hue}, 70%, ${100 - intensity * 50}%)`;
};

// Loading skeleton
function ChartSkeleton() {
  return (
    <div className="w-full h-[400px] p-4 bg-gray-800 rounded-lg shadow-lg animate-pulse">
      <div className="h-7 w-56 bg-gray-700 rounded mb-4" />
      <div className="h-[calc(100%-2.5rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin" />
          <p className="text-gray-500 text-sm">Loading location data...</p>
        </div>
      </div>
    </div>
  );
}

// Empty state
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
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-gray-400 text-sm">No location data to display</p>
          <p className="text-gray-500 text-xs mt-1">Start a simulation to see member distribution</p>
        </div>
      </div>
    </div>
  );
}

// Location detail panel
function LocationDetailPanel({
  data,
  onClose,
}: {
  data: LocationData;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-4 right-4 w-64 bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl z-10">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-semibold text-white">{data.location}</h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-0.5"
          aria-label="Close location details"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Members</span>
          <span className="text-white font-semibold">{data.count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Percentage</span>
          <span className="text-blue-400">{data.percentage.toFixed(1)}%</span>
        </div>
        {data.members.length > 0 && (
          <div className="pt-2 border-t border-gray-700">
            <p className="text-gray-400 text-xs mb-1">Sample members:</p>
            <div className="flex flex-wrap gap-1">
              {data.members.slice(0, 5).map((id, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-gray-800 rounded text-xs text-gray-300 truncate max-w-[80px]">
                  {id.substring(0, 8)}
                </span>
              ))}
              {data.members.length > 5 && (
                <span className="px-1.5 py-0.5 text-xs text-gray-500">
                  +{data.members.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChoroplethMap({
  members,
  title = 'Member Distribution by Location',
  onLocationSelect,
  isLoading = false,
  maxLocations = 15,
}: ChoroplethMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const locationData = useMemo<LocationData[]>(() => {
    if (!members || members.length === 0) return [];

    const locationMap: Record<string, { count: number; members: string[] }> = {};

    members.forEach(member => {
      const location = member.location || 'Unknown';
      if (!locationMap[location]) {
        locationMap[location] = { count: 0, members: [] };
      }
      locationMap[location].count++;
      locationMap[location].members.push(member.unique_id);
    });

    const totalMembers = members.length;
    const sorted = Object.entries(locationMap)
      .map(([location, data]) => ({
        location,
        count: data.count,
        percentage: (data.count / totalMembers) * 100,
        members: data.members,
      }))
      .sort((a, b) => b.count - a.count);

    // Group smaller locations into "Other" if exceeding max
    if (sorted.length > maxLocations) {
      const top = sorted.slice(0, maxLocations - 1);
      const rest = sorted.slice(maxLocations - 1);
      const otherCount = rest.reduce((sum, loc) => sum + loc.count, 0);
      const otherMembers = rest.flatMap(loc => loc.members);

      top.push({
        location: `Other (${rest.length} locations)`,
        count: otherCount,
        percentage: (otherCount / totalMembers) * 100,
        members: otherMembers,
      });

      return top;
    }

    return sorted;
  }, [members, maxLocations]);

  const selectedData = useMemo(() => {
    if (!selectedLocation) return null;
    return locationData.find(d => d.location === selectedLocation) || null;
  }, [selectedLocation, locationData]);

  const handleBarClick = useCallback((data: LocationData) => {
    const newSelected = data.location === selectedLocation ? null : data.location;
    setSelectedLocation(newSelected);

    if (onLocationSelect) {
      if (newSelected) {
        const locationMembers = members.filter(m => (m.location || 'Unknown') === newSelected);
        onLocationSelect(newSelected, locationMembers);
      } else {
        onLocationSelect(null, []);
      }
    }
  }, [selectedLocation, members, onLocationSelect]);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!members || members.length === 0) {
    return <EmptyState title={title} />;
  }

  // Calculate dynamic left margin based on longest location name
  const maxLabelLength = Math.max(...locationData.map(d => d.location.length));
  const leftMargin = Math.min(Math.max(maxLabelLength * 6, 80), 150);

  return (
    <div
      className="w-full h-[400px] p-4 bg-gray-800 rounded-lg shadow-lg relative"
      role="img"
      aria-label={`Bar chart showing member distribution across ${locationData.length} locations`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-xs text-gray-500">
            {members.length} members across {locationData.length} locations
          </p>
        </div>
        <div className="text-xs text-gray-400">
          Click bars to see details
        </div>
      </div>

      <div className="h-[calc(100%-3rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={locationData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: leftMargin, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
            <XAxis
              type="number"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <YAxis
              type="category"
              dataKey="location"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              width={leftMargin - 10}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as LocationData;
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
                      <p className="text-white font-semibold mb-1">{data.location}</p>
                      <div className="space-y-0.5 text-sm">
                        <p className="text-gray-300">
                          Members: <span className="text-white font-medium">{data.count.toLocaleString()}</span>
                        </p>
                        <p className="text-blue-400">
                          {data.percentage.toFixed(1)}% of total
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="count"
              name="Members"
              onClick={(data) => handleBarClick(data as unknown as LocationData)}
              style={{ cursor: 'pointer' }}
              radius={[0, 4, 4, 0]}
            >
              {locationData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.location}`}
                  fill={getLocationColor(index, locationData.length, selectedLocation === entry.location)}
                  stroke={selectedLocation === entry.location ? '#FBBF24' : 'transparent'}
                  strokeWidth={2}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Selected location detail panel */}
      {selectedData && (
        <LocationDetailPanel
          data={selectedData}
          onClose={() => setSelectedLocation(null)}
        />
      )}

      {/* Stats footer */}
      <div className="absolute bottom-1 left-4 right-4 flex justify-between text-xs text-gray-500">
        <span>Top location: {locationData[0]?.location} ({locationData[0]?.percentage.toFixed(1)}%)</span>
        <span>
          {locationData.length === 1 ? '1 location' : `${locationData.length} locations shown`}
        </span>
      </div>

      {/* Screen reader summary */}
      <div className="sr-only" role="status">
        Bar chart showing member distribution across {locationData.length} locations.
        Top location is {locationData[0]?.location} with {locationData[0]?.count} members ({locationData[0]?.percentage.toFixed(1)}%).
        {selectedLocation && `Selected location: ${selectedLocation}.`}
      </div>
    </div>
  );
}
