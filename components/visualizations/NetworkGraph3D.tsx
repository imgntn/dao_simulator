'use client';

import { useRef, useMemo, useState, useCallback, memo } from 'react';
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
}

interface NodeDetailPanelProps {
  node: NetworkNode;
  onClose: () => void;
}

// Node detail panel shown when a node is selected
function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  return (
    <div className="absolute top-4 right-4 w-64 bg-gray-900/95 border border-gray-700 rounded-lg p-4 shadow-xl z-10">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-xs uppercase tracking-wide text-gray-500">
            {node.type}
          </span>
          <h4 className="text-sm font-semibold text-white break-all">
            {node.id}
          </h4>
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
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Type</span>
          <span className="text-white capitalize">{node.type}</span>
        </div>
        {node.position && (
          <div className="flex justify-between">
            <span className="text-gray-400">Position</span>
            <span className="text-white font-mono text-xs">
              [{node.position.map(p => p.toFixed(1)).join(', ')}]
            </span>
          </div>
        )}
        {node.size && (
          <div className="flex justify-between">
            <span className="text-gray-400">Size</span>
            <span className="text-white">{node.size}</span>
          </div>
        )}
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

// Camera controls component for zoom buttons
function CameraControls({ onZoomIn, onZoomOut, onReset }: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  const { camera } = useThree();

  const handleZoomIn = useCallback(() => {
    camera.position.multiplyScalar(0.8);
    onZoomIn();
  }, [camera, onZoomIn]);

  const handleZoomOut = useCallback(() => {
    camera.position.multiplyScalar(1.25);
    onZoomOut();
  }, [camera, onZoomOut]);

  const handleReset = useCallback(() => {
    camera.position.set(50, 50, 50);
    camera.lookAt(0, 0, 0);
    onReset();
  }, [camera, onReset]);

  return (
    <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
      <div className="fixed bottom-4 left-4 flex flex-col gap-1" style={{ pointerEvents: 'auto' }}>
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-600 flex items-center justify-center transition-colors"
          aria-label="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-600 flex items-center justify-center transition-colors"
          aria-label="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
        <button
          onClick={handleReset}
          className="w-8 h-8 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-600 flex items-center justify-center transition-colors"
          aria-label="Reset view"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </Html>
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

      {interactive && (
        <CameraControls
          onZoomIn={() => {}}
          onZoomOut={() => {}}
          onReset={() => {}}
        />
      )}
    </group>
  );
}

// Loading skeleton - exported for use in wrapper
export function NetworkLoadingSkeleton() {
  return (
    <div className="w-full h-[600px] p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
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
function NetworkEmptyState({ title }: { title: string }) {
  return (
    <div className="w-full h-[600px] p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
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

export function NetworkGraph3D({
  data,
  interactive = true,
  showLabels = false,
  title = 'DAO Network Graph',
  onNodeSelect,
}: NetworkGraph3DProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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

  if (!data || !data.nodes || data.nodes.length === 0) {
    return <NetworkEmptyState title={title} />;
  }

  const dpr = data.nodes.length > 400 ? 1 : 1.5;
  const enableAntialias = data.nodes.length <= 300;
  const displayNodes = data.visible_nodes || data.nodes;
  const displayEdges = data.visible_edges || data.edges;

  return (
    <div
      className="w-full h-[600px] p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg relative"
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
        </Canvas>

        {/* Node detail panel */}
        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            onClose={() => handleNodeSelect(null)}
          />
        )}
      </div>

      {/* Edge type legend */}
      <div className="absolute bottom-6 right-6 bg-gray-900/90 border border-gray-700 rounded-lg p-2 text-xs">
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

      {/* Screen reader summary */}
      <div className="sr-only" role="status">
        Network visualization showing {displayNodes.length} agents connected by {displayEdges.length} relationships.
        {selectedNode && `Selected node: ${selectedNode.id}, type: ${selectedNode.type}.`}
      </div>
    </div>
  );
}
