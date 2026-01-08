'use client';

import dynamic from 'next/dynamic';
import { Canvas3DErrorBoundary } from '@/components/ErrorBoundary';

// Loading component for 3D network
function NetworkLoadingSkeleton() {
  return (
    <div className="w-full h-[600px] bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin" />
        <p className="text-gray-400 text-sm">Loading 3D network visualization...</p>
        <p className="text-gray-500 text-xs mt-1">This may take a moment</p>
      </div>
    </div>
  );
}

// Dynamically import NetworkGraph3D with no SSR (Three.js needs browser)
const NetworkGraph3D = dynamic(
  () => import('@/components/visualizations/NetworkGraph3D').then((mod) => mod.NetworkGraph3D),
  {
    ssr: false,
    loading: () => <NetworkLoadingSkeleton />,
  }
);

interface NetworkGraph3DWrapperProps {
  data: {
    nodes: Array<{
      id: string;
      label?: string;
      group: string;
      size?: number;
      color?: string;
    }>;
    edges: Array<{
      source: string;
      target: string;
      weight?: number;
    }>;
  };
  interactive?: boolean;
  showLabels?: boolean;
}

/**
 * Wrapper component for NetworkGraph3D with error boundary and accessibility
 */
export function NetworkGraph3DWrapper({
  data,
  interactive = true,
  showLabels = false,
}: NetworkGraph3DWrapperProps) {
  const nodeCount = data.nodes.length;
  const edgeCount = data.edges.length;

  return (
    <Canvas3DErrorBoundary>
      <div
        role="img"
        aria-label={`3D network graph visualization with ${nodeCount} nodes and ${edgeCount} connections`}
      >
        <NetworkGraph3D
          data={data}
          interactive={interactive}
          showLabels={showLabels}
        />

        {/* Keyboard accessibility notice */}
        <div className="mt-2 p-2 bg-gray-800/50 rounded text-xs text-gray-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Use mouse to rotate, scroll to zoom.
            {interactive && ' Click nodes to see details.'}
          </span>
        </div>

        {/* Screen reader summary */}
        <div className="sr-only">
          Network visualization showing {nodeCount} agents connected by {edgeCount} relationships.
          {nodeCount > 100 && ' Large network - some performance optimizations applied.'}
        </div>
      </div>
    </Canvas3DErrorBoundary>
  );
}

export default NetworkGraph3DWrapper;
