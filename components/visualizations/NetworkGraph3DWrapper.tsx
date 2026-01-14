'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import { Canvas3DErrorBoundary } from '@/components/ErrorBoundary';
import type { NetworkNode } from '@/lib/types/visualization';

// Loading component for 3D network
function NetworkLoadingSkeleton({ heightClassName }: { heightClassName: string }) {
  return (
    <div className={`w-full ${heightClassName} bg-gray-800 rounded-lg flex items-center justify-center`}>
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
    loading: () => <NetworkLoadingSkeleton heightClassName="h-[clamp(320px,60vh,560px)]" />,
  }
);

interface NetworkGraph3DWrapperProps {
  data: {
    nodes: Array<{
      id: string;
      label?: string;
      group?: string;
      type?: 'member' | 'proposal' | 'cluster';
      size?: number;
      color?: string;
      position?: [number, number, number];
    }>;
    edges: Array<{
      source: string;
      target: string;
      weight?: number;
      type?: 'representative' | 'delegation' | 'created' | 'aggregated';
    }>;
  };
  interactive?: boolean;
  showLabels?: boolean;
  title?: string;
  onNodeSelect?: (node: NetworkNode | null) => void;
  heightClassName?: string;
}

// Controls help panel
function ControlsHelp({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="absolute top-4 left-4 max-w-xs bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl z-10">
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
          <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 font-mono">Right-click</span>
          <span className="text-gray-400">Pan view</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 font-mono">Click node</span>
          <span className="text-gray-400">Select & view details</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-500 mt-2">
        Use +/- buttons on left for zoom controls
      </p>
    </div>
  );
}

/**
 * Wrapper component for NetworkGraph3D with error boundary and accessibility
 */
export function NetworkGraph3DWrapper({
  data,
  interactive = true,
  showLabels = false,
  title,
  onNodeSelect,
  heightClassName,
}: NetworkGraph3DWrapperProps) {
  const [showHelp, setShowHelp] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const resolvedHeightClass = heightClassName ?? 'h-[clamp(320px,60vh,560px)]';

  const nodeCount = data.nodes.length;
  const edgeCount = data.edges.length;

  // Transform data to match NetworkGraph3D expected format
  const transformedData = {
    nodes: data.nodes.map(node => ({
      id: node.id,
      type: node.type || (node.group === 'proposal' ? 'proposal' : node.group === 'cluster' ? 'cluster' : 'member') as 'member' | 'proposal' | 'cluster',
      position: node.position,
      size: node.size,
    })),
    edges: data.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      type: edge.type || 'delegation' as 'representative' | 'delegation' | 'created' | 'aggregated',
      weight: edge.weight,
    })),
  };

  const handleNodeSelect = useCallback((node: NetworkNode | null) => {
    setSelectedNode(node);
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  return (
    <Canvas3DErrorBoundary>
      <div
        className="relative"
        role="img"
        aria-label={`3D network graph visualization with ${nodeCount} nodes and ${edgeCount} connections`}
      >
        <NetworkGraph3D
          data={transformedData}
          interactive={interactive}
          showLabels={showLabels}
          title={title}
          onNodeSelect={handleNodeSelect}
          heightClassName={resolvedHeightClass}
        />

        {/* Controls help panel (dismissible) */}
        {showHelp && interactive && (
          <ControlsHelp onDismiss={() => setShowHelp(false)} />
        )}

        {/* Show help button when dismissed */}
        {!showHelp && interactive && (
          <button
            onClick={() => setShowHelp(true)}
            className="absolute top-4 left-4 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 text-gray-300 transition-colors"
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
            Use mouse to rotate, scroll to zoom, right-click to pan.
            {interactive && ' Click nodes to see details.'}
            {nodeCount > 100 && ' Large network - some features optimized for performance.'}
          </span>
        </div>

        {/* Screen reader summary */}
        <div className="sr-only" role="status" aria-live="polite">
          Network visualization showing {nodeCount} agents connected by {edgeCount} relationships.
          {nodeCount > 100 && ' Large network - some performance optimizations applied.'}
          {selectedNode && ` Selected node: ${selectedNode.id}, type: ${selectedNode.type}.`}
        </div>
      </div>
    </Canvas3DErrorBoundary>
  );
}

export default NetworkGraph3DWrapper;
