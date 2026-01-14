'use client';

import { useRef, useMemo, useState, useCallback, memo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { NetworkData, NetworkNode, NetworkEdge } from '@/lib/types/visualization';

interface NetworkGraph3DProps {
  data: NetworkData;
  interactive?: boolean;
  showLabels?: boolean;
  title?: string;
  onNodeSelect?: (node: NetworkNode | null) => void;
  heightClassName?: string;
}

interface NodeDetailPanelProps {
  node: NetworkNode;
  onClose: () => void;
}

// Extended node interface for display
interface ExtendedNodeInfo {
  node: NetworkNode;
  connectedEdges: NetworkEdge[];
  connectedNodes: string[];
}

// Node detail panel shown when a node is selected
function NodeDetailPanel({ node, edges, onClose }: NodeDetailPanelProps & { edges: NetworkEdge[] }) {
  // Find edges connected to this node
  const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id);
  const incomingCount = connectedEdges.filter(e => e.target === node.id).length;
  const outgoingCount = connectedEdges.filter(e => e.source === node.id).length;

  const typeLabels: Record<string, string> = {
    member: 'DAO Member',
    proposal: 'Governance Proposal',
    cluster: 'Member Cluster',
  };

  const typeDescriptions: Record<string, string> = {
    member: 'A participant in the DAO with voting power',
    proposal: 'A governance proposal being voted on',
    cluster: 'A group of similar member types',
  };

  return (
    <div className="absolute top-4 right-4 w-72 bg-gray-900/95 border border-gray-700 rounded-lg p-4 shadow-xl z-10">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className={`text-xs uppercase tracking-wide px-2 py-0.5 rounded ${
            node.type === 'member' ? 'bg-blue-500/20 text-blue-400' :
            node.type === 'proposal' ? 'bg-green-500/20 text-green-400' :
            'bg-pink-500/20 text-pink-400'
          }`}>
            {typeLabels[node.type] || node.type}
          </span>
          <h4 className="text-sm font-semibold text-white break-all mt-2">
            {node.id}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {typeDescriptions[node.type] || ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1"
          aria-label="Close node details"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3 text-sm border-t border-gray-700 pt-3">
        {/* Connection stats */}
        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">Connections</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-800 rounded p-2 text-center">
              <p className="text-lg font-bold text-white">{connectedEdges.length}</p>
              <p className="text-xs text-gray-400">Total</p>
            </div>
            <div className="bg-gray-800 rounded p-2 text-center">
              <p className="text-lg font-bold text-green-400">{incomingCount}</p>
              <p className="text-xs text-gray-400">In</p>
            </div>
            <div className="bg-gray-800 rounded p-2 text-center">
              <p className="text-lg font-bold text-blue-400">{outgoingCount}</p>
              <p className="text-xs text-gray-400">Out</p>
            </div>
          </div>
        </div>

        {/* Node properties */}
        {node.size && (
          <div className="flex justify-between">
            <span className="text-gray-400">
              {node.type === 'member' ? 'Token Weight' : node.type === 'cluster' ? 'Member Count' : 'Vote Weight'}
            </span>
            <span className="text-white font-medium">{node.size.toFixed(1)}</span>
          </div>
        )}

        {node.position && (
          <div className="flex justify-between">
            <span className="text-gray-400">Position</span>
            <span className="text-white font-mono text-xs">
              [{node.position.map(p => p.toFixed(0)).join(', ')}]
            </span>
          </div>
        )}

        {/* Edge breakdown by type */}
        {connectedEdges.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium">Connection Types</p>
            <div className="space-y-1">
              {['delegation', 'representative', 'created', 'aggregated'].map(type => {
                const count = connectedEdges.filter(e => e.type === type).length;
                if (count === 0) return null;
                const colors: Record<string, string> = {
                  delegation: 'bg-blue-500',
                  representative: 'bg-purple-500',
                  created: 'bg-green-500',
                  aggregated: 'bg-amber-500',
                };
                return (
                  <div key={type} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${colors[type]}`} />
                    <span className="text-gray-300 capitalize text-xs">{type}</span>
                    <span className="text-gray-500 text-xs ml-auto">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Network statistics panel
function NetworkStatsPanel({ data }: { data: NetworkData }) {
  const stats = useMemo(() => {
    const nodes = data.visible_nodes || data.nodes;
    const edges = data.visible_edges || data.edges;

    const memberCount = nodes.filter(n => n.type === 'member').length;
    const proposalCount = nodes.filter(n => n.type === 'proposal').length;
    const clusterCount = nodes.filter(n => n.type === 'cluster').length;

    const edgesByType = {
      delegation: edges.filter(e => e.type === 'delegation').length,
      representative: edges.filter(e => e.type === 'representative').length,
      created: edges.filter(e => e.type === 'created').length,
      aggregated: edges.filter(e => e.type === 'aggregated').length,
    };

    // Calculate average connections per node
    const avgConnections = nodes.length > 0 ? (edges.length * 2 / nodes.length).toFixed(1) : '0';

    return { memberCount, proposalCount, clusterCount, edgesByType, avgConnections, totalEdges: edges.length };
  }, [data]);

  return (
    <div className="absolute top-4 left-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 text-xs z-10">
      <p className="text-gray-400 mb-2 font-medium">Network Stats</p>
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-lg font-bold text-blue-400">{stats.memberCount}</p>
            <p className="text-gray-500">Members</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-400">{stats.proposalCount}</p>
            <p className="text-gray-500">Proposals</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-pink-400">{stats.clusterCount}</p>
            <p className="text-gray-500">Clusters</p>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-2 mt-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Total Edges</span>
            <span className="text-white">{stats.totalEdges}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Avg Connections</span>
            <span className="text-white">{stats.avgConnections}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Color mapping for node types - memoized at module level
const NODE_COLORS: Record<string, string> = {
  member: '#60A5FA',
  proposal: '#34D399',
  cluster: '#F472B6',
  default: '#9CA3AF',
};

// Edge color mapping
const EDGE_COLORS: Record<string, string> = {
  delegation: '#3B82F6',
  representative: '#8B5CF6',
  created: '#10B981',
  aggregated: '#F59E0B',
  default: '#6B7280',
};

// Memoized node component
const NetworkNode3D = memo(function NetworkNode3D({
  node,
  isSelected,
  onClick,
  showLabel,
  detail,
  enableHover,
}: {
  node: NetworkNode;
  isSelected: boolean;
  onClick?: () => void;
  showLabel?: boolean;
  detail: number;
  enableHover: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;

    if (isSelected) {
      // Pulsing animation for selected node
      meshRef.current.scale.setScalar(1.2 + Math.sin(state.clock.elapsedTime * 4) * 0.1);
    } else if (enableHover && hovered) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.1);
    } else {
      meshRef.current.scale.setScalar(1);
    }
  });

  const position = node.position || [0, 0, 0];
  const size = node.type === 'cluster' ? (node.size || 10) * 0.1 : 0.3;
  const color = NODE_COLORS[node.type] || NODE_COLORS.default;

  return (
    <group position={position as [number, number, number]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={enableHover ? () => setHovered(true) : undefined}
        onPointerOut={enableHover ? () => setHovered(false) : undefined}
      >
        <sphereGeometry args={[size, detail, detail]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : hovered ? 0.5 : 0.2}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size + 0.2, size + 0.3, 32]} />
          <meshBasicMaterial color="#FBBF24" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      {showLabel && (
        <Text
          position={[0, size + 0.5, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {node.id.substring(0, 8)}
        </Text>
      )}
    </group>
  );
});

// Memoized edge component
const NetworkEdge3D = memo(function NetworkEdge3D({
  edge,
  nodeLookup,
  isHighlighted,
}: {
  edge: NetworkEdge;
  nodeLookup: Map<string, NetworkNode>;
  isHighlighted: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const points = useMemo(() => {
    const sourceNode = nodeLookup.get(edge.source);
    const targetNode = nodeLookup.get(edge.target);

    if (!sourceNode?.position || !targetNode?.position) return [];

    return [
      new THREE.Vector3(...sourceNode.position),
      new THREE.Vector3(...targetNode.position),
    ];
  }, [edge.source, edge.target, nodeLookup]);

  const color = EDGE_COLORS[edge.type] || EDGE_COLORS.default;

  if (points.length === 0) return null;

  const lineWidth = edge.weight ? Math.min(edge.weight / 10, 6) + 2 : 3;
  const opacity = isHighlighted ? 1 : hovered ? 0.9 : 0.6;

  return (
    <Line
      points={points}
      color={isHighlighted || hovered ? '#FBBF24' : color}
      lineWidth={isHighlighted ? lineWidth + 1 : lineWidth}
      transparent
      opacity={opacity}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    />
  );
});

// Zoom controls component - rendered outside canvas as regular HTML
function ZoomControls({ onZoomIn, onZoomOut, onReset }: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-1 z-10">
      <button
        onClick={onZoomIn}
        className="w-8 h-8 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-600 flex items-center justify-center transition-colors"
        aria-label="Zoom in"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
        </svg>
      </button>
      <button
        onClick={onZoomOut}
        className="w-8 h-8 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-600 flex items-center justify-center transition-colors"
        aria-label="Zoom out"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
        </svg>
      </button>
      <button
        onClick={onReset}
        className="w-8 h-8 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-600 flex items-center justify-center transition-colors"
        aria-label="Reset view"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}

function NetworkScene({
  data,
  interactive,
  showLabels,
  selectedNodeId,
  onNodeSelect,
}: {
  data: NetworkData;
  interactive: boolean;
  showLabels: boolean;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current && !interactive) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  const displayNodes = data.visible_nodes || data.nodes;
  const displayEdges = data.visible_edges || data.edges;

  const nodeLookup = useMemo(
    () => new Map(displayNodes.map(node => [node.id, node])),
    [displayNodes]
  );

  // Performance settings based on node count
  const nodeDetail = displayNodes.length > 400 ? 8 : displayNodes.length > 200 ? 12 : 16;
  const allowLabels = showLabels && displayNodes.length <= 200;
  const enableHover = interactive && displayNodes.length <= 250;

  // Get edges connected to selected node for highlighting
  const highlightedEdges = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    return new Set(
      displayEdges
        .filter(edge => edge.source === selectedNodeId || edge.target === selectedNodeId)
        .map(edge => `${edge.source}-${edge.target}`)
    );
  }, [selectedNodeId, displayEdges]);

  const handleBackgroundClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  return (
    <group ref={groupRef} onClick={handleBackgroundClick}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {displayEdges.map((edge) => (
        <NetworkEdge3D
          key={`${edge.source}-${edge.target}`}
          edge={edge}
          nodeLookup={nodeLookup}
          isHighlighted={highlightedEdges.has(`${edge.source}-${edge.target}`)}
        />
      ))}

      {displayNodes.map((node) => (
        <NetworkNode3D
          key={node.id}
          node={node}
          isSelected={selectedNodeId === node.id}
          onClick={() => onNodeSelect(node.id === selectedNodeId ? null : node.id)}
          showLabel={allowLabels}
          detail={nodeDetail}
          enableHover={enableHover}
        />
      ))}
    </group>
  );
}

// Loading skeleton - exported for use in wrapper
export function NetworkLoadingSkeleton({ heightClassName }: { heightClassName?: string }) {
  const heightClass = heightClassName ?? 'h-[clamp(320px,60vh,560px)]';
  return (
    <div className={`w-full ${heightClass} p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg`}>
      <div className="flex justify-between items-center mb-4">
        <div className="h-7 w-48 bg-gray-700 rounded animate-pulse" />
        <div className="flex gap-4">
          <div className="h-5 w-20 bg-gray-700 rounded animate-pulse" />
          <div className="h-5 w-20 bg-gray-700 rounded animate-pulse" />
          <div className="h-5 w-20 bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
      <div className="w-full h-[calc(100%-3rem)] bg-gray-900 rounded flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin" />
          <p className="text-gray-400 text-sm">Loading network visualization...</p>
        </div>
      </div>
    </div>
  );
}

// Empty state
function NetworkEmptyState({ title, heightClassName }: { title: string; heightClassName: string }) {
  return (
    <div className={`w-full ${heightClassName} p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg`}>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="w-full h-[calc(100%-3rem)] bg-gray-900 rounded flex items-center justify-center">
        <div className="text-center px-4">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <p className="text-gray-400 text-sm">No network data to display</p>
          <p className="text-gray-500 text-xs mt-1">Start a simulation to see the DAO network</p>
        </div>
      </div>
    </div>
  );
}

// Camera controller that responds to external zoom commands
function CameraController({ zoomCommand }: { zoomCommand: 'in' | 'out' | 'reset' | null }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!zoomCommand) return;

    if (zoomCommand === 'in') {
      camera.position.multiplyScalar(0.8);
    } else if (zoomCommand === 'out') {
      camera.position.multiplyScalar(1.25);
    } else if (zoomCommand === 'reset') {
      camera.position.set(50, 50, 50);
      camera.lookAt(0, 0, 0);
    }
  }, [zoomCommand, camera]);

  return null;
}

export function NetworkGraph3D({
  data,
  interactive = true,
  showLabels = false,
  title = 'DAO Network Graph',
  onNodeSelect,
  heightClassName,
}: NetworkGraph3DProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoomCommand, setZoomCommand] = useState<'in' | 'out' | 'reset' | null>(null);
  const heightClass = heightClassName ?? 'h-[clamp(320px,60vh,560px)]';

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (onNodeSelect) {
      const node = nodeId ? data.nodes.find(n => n.id === nodeId) || null : null;
      onNodeSelect(node);
    }
  }, [data.nodes, onNodeSelect]);

  const selectedNode = useMemo(
    () => selectedNodeId ? data.nodes.find(n => n.id === selectedNodeId) : null,
    [selectedNodeId, data.nodes]
  );

  // Handle zoom commands with auto-reset
  const handleZoom = useCallback((command: 'in' | 'out' | 'reset') => {
    setZoomCommand(command);
    // Reset command after a short delay so it can be triggered again
    setTimeout(() => setZoomCommand(null), 100);
  }, []);

  if (!data || !data.nodes || data.nodes.length === 0) {
    return <NetworkEmptyState title={title} heightClassName={heightClass} />;
  }

  const dpr = data.nodes.length > 400 ? 1 : 1.5;
  const enableAntialias = data.nodes.length <= 300;
  const displayNodes = data.visible_nodes || data.nodes;
  const displayEdges = data.visible_edges || data.edges;

  return (
    <div
      className={`w-full ${heightClass} p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg relative`}
      role="img"
      aria-label={`3D network graph showing ${displayNodes.length} nodes and ${displayEdges.length} connections`}
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500">
            {displayNodes.length} nodes, {displayEdges.length} edges
            {data.nodes.length !== displayNodes.length &&
              ` (showing ${displayNodes.length} of ${data.nodes.length})`
            }
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400" aria-hidden="true" />
            <span className="text-gray-600 dark:text-gray-300">Members</span>
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400" aria-hidden="true" />
            <span className="text-gray-600 dark:text-gray-300">Proposals</span>
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-400" aria-hidden="true" />
            <span className="text-gray-600 dark:text-gray-300">Clusters</span>
          </span>
        </div>
      </div>

      <div className="w-full h-[calc(100%-4rem)] bg-gray-900 rounded relative">
        <Canvas
          camera={{ position: [50, 50, 50], fov: 60 }}
          dpr={dpr}
          gl={{ antialias: enableAntialias }}
        >
          <NetworkScene
            data={data}
            interactive={interactive}
            showLabels={showLabels}
            selectedNodeId={selectedNodeId}
            onNodeSelect={handleNodeSelect}
          />
          {interactive && <OrbitControls enableDamping dampingFactor={0.05} />}
          <CameraController zoomCommand={zoomCommand} />
        </Canvas>

        {/* Network stats panel - top left */}
        <NetworkStatsPanel data={data} />

        {/* Zoom controls - bottom left */}
        {interactive && (
          <ZoomControls
            onZoomIn={() => handleZoom('in')}
            onZoomOut={() => handleZoom('out')}
            onReset={() => handleZoom('reset')}
          />
        )}

        {/* Node detail panel - top right */}
        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            edges={displayEdges}
            onClose={() => handleNodeSelect(null)}
          />
        )}

        {/* Edge type legend - bottom right */}
        <div className="absolute bottom-4 right-4 bg-gray-900/90 border border-gray-700 rounded-lg p-2 text-xs z-10">
          <p className="text-gray-400 mb-1 font-medium">Edge Types</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-blue-500" aria-hidden="true" />
              <span className="text-gray-300">Delegation</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-purple-500" aria-hidden="true" />
              <span className="text-gray-300">Representative</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-green-500" aria-hidden="true" />
              <span className="text-gray-300">Created</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-amber-500" aria-hidden="true" />
              <span className="text-gray-300">Aggregated</span>
            </span>
          </div>
        </div>
      </div>

      {/* Screen reader summary */}
      <div className="sr-only" role="status">
        Network visualization showing {displayNodes.length} agents connected by {displayEdges.length} relationships.
        {selectedNode && `Selected node: ${selectedNode.id}, type: ${selectedNode.type}.`}
      </div>
    </div>
  );
}
