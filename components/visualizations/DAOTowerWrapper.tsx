'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import { Canvas3DErrorBoundary } from '@/components/ErrorBoundary';

// Loading component for 3D tower
function TowerLoadingSkeleton({ heightClassName }: { heightClassName: string }) {
  return (
    <div className={`w-full ${heightClassName} bg-gray-800 rounded-lg flex items-center justify-center`}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-gray-700 border-t-pink-500 animate-spin" />
        <p className="text-gray-400 text-sm">Building the DAO tower...</p>
        <p className="text-gray-500 text-xs mt-1">Getting everyone settled in</p>
      </div>
    </div>
  );
}

// Dynamically import DAOTower with no SSR (Three.js needs browser)
const DAOTower = dynamic(
  () => import('@/components/visualizations/DAOTower').then((mod) => mod.DAOTower),
  {
    ssr: false,
    loading: () => <TowerLoadingSkeleton heightClassName="h-[clamp(320px,60vh,560px)]" />,
  }
);

// Member data type
interface DAOMemberData {
  id: string;
  name?: string;
  activity: 'voting' | 'proposing' | 'discussing' | 'coding' | 'reviewing' | 'resting' | 'trading' | 'chatting';
  floor: number;
  reputation?: number;
  tokens?: number;
}

interface DAOTowerWrapperProps {
  members: DAOMemberData[];
  totalFloors?: number;
  onMemberClick?: (member: DAOMemberData) => void;
  onFloorClick?: (floor: number) => void;
  title?: string;
  heightClassName?: string;
}

// Controls help panel
function ControlsHelp({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="absolute top-16 left-4 max-w-xs bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl z-20">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-semibold text-white">Controls</h4>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white transition-colors p-0.5"
          aria-label="Dismiss help"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 font-mono">Mouse</span>
          <span className="text-gray-400">Drag to rotate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 font-mono">Scroll</span>
          <span className="text-gray-400">Zoom in/out</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 font-mono">Click member</span>
          <span className="text-gray-400">Select & view details</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 font-mono">Click floor</span>
          <span className="text-gray-400">Highlight floor</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-500 mt-2">
        Hover on legend floors to highlight
      </p>
    </div>
  );
}

/**
 * Wrapper component for DAOTower with error boundary and accessibility
 *
 * A cozy 3D visualization showing DAO members working on different floors
 * of a cute tower building. Each floor represents a different activity zone.
 */
export function DAOTowerWrapper({
  members,
  totalFloors = 6,
  onMemberClick,
  onFloorClick,
  title = 'DAO Tower',
  heightClassName,
}: DAOTowerWrapperProps) {
  const [showHelp, setShowHelp] = useState(true);
  const [selectedMember, setSelectedMember] = useState<DAOMemberData | null>(null);
  const resolvedHeightClass = heightClassName ?? 'h-[clamp(320px,60vh,560px)]';

  const handleMemberClick = useCallback((member: DAOMemberData) => {
    setSelectedMember(member);
    onMemberClick?.(member);
  }, [onMemberClick]);

  const handleFloorClick = useCallback((floor: number) => {
    onFloorClick?.(floor);
  }, [onFloorClick]);

  // Calculate stats for accessibility
  const membersByFloor = members.reduce((acc, m) => {
    const floor = Math.min(m.floor, totalFloors - 1);
    acc[floor] = (acc[floor] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const floorNames = ['Lobby', 'Treasury', 'Governance', 'Dev Hub', 'Proposals', 'Lounge'];

  return (
    <Canvas3DErrorBoundary>
      <div
        className="relative"
        role="img"
        aria-label={`${title} - 3D visualization with ${members.length} members across ${totalFloors} floors`}
      >
        <DAOTower
          members={members}
          totalFloors={totalFloors}
          onMemberClick={handleMemberClick}
          onFloorClick={handleFloorClick}
          heightClassName={resolvedHeightClass}
        />

        {/* Controls help panel (dismissible) */}
        {showHelp && (
          <ControlsHelp onDismiss={() => setShowHelp(false)} />
        )}

        {/* Show help button when dismissed */}
        {!showHelp && (
          <button
            onClick={() => setShowHelp(true)}
            className="absolute top-16 left-4 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 text-gray-300 transition-colors z-20"
            aria-label="Show controls help"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}

        {/* Keyboard accessibility notice */}
        <div className="mt-2 p-2 bg-gray-800/50 rounded text-xs text-gray-400 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Use mouse to rotate, scroll to zoom. Click members or floors to interact.
            {members.length > 50 && ' Large member count - some features optimized for performance.'}
          </span>
        </div>

        {/* Screen reader summary */}
        <div className="sr-only" role="status" aria-live="polite">
          {title} visualization showing {members.length} DAO members working across {totalFloors} floors.
          {Object.entries(membersByFloor).map(([floor, count]) => (
            ` ${floorNames[Number(floor)] || `Floor ${floor}`}: ${count} members.`
          )).join('')}
          {selectedMember && ` Selected: ${selectedMember.name || selectedMember.id}, activity: ${selectedMember.activity}.`}
        </div>
      </div>
    </Canvas3DErrorBoundary>
  );
}

export { TowerLoadingSkeleton };
export default DAOTowerWrapper;
