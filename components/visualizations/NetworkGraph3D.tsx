'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { NetworkData, NetworkNode, NetworkEdge } from '@/lib/types/visualization';

interface NetworkGraph3DProps {
  data: NetworkData;
  interactive?: boolean;
  showLabels?: boolean;
  title?: string;
}

function NetworkNode3D({
  node,
  color,
  onClick,
  showLabel,
  detail,
  enableHover,
}: {
  node: NetworkNode;
  color: string;
  onClick?: () => void;
  showLabel?: boolean;
  detail: number;
  enableHover: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!enableHover) return;
    if (meshRef.current && hovered) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.1);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });

  const position = node.position || [0, 0, 0];
  const size = node.type === 'cluster' ? (node.size || 10) * 0.1 : 0.3;

  return (
    <group position={position as [number, number, number]}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={enableHover ? () => setHovered(true) : undefined}
        onPointerOut={enableHover ? () => setHovered(false) : undefined}
      >
        <sphereGeometry args={[size, detail, detail]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.5 : 0.2}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
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
}

function NetworkEdge3D({
  edge,
  nodeLookup,
}: {
  edge: NetworkEdge;
  nodeLookup: Map<string, NetworkNode>;
}) {
  const points = useMemo(() => {
    const sourceNode = nodeLookup.get(edge.source);
    const targetNode = nodeLookup.get(edge.target);

    if (!sourceNode?.position || !targetNode?.position) return [];

    return [
      new THREE.Vector3(...sourceNode.position),
      new THREE.Vector3(...targetNode.position),
    ];
  }, [edge, nodeLookup]);

  const color = useMemo(() => {
    switch (edge.type) {
      case 'delegation': return '#3B82F6';
      case 'representative': return '#8B5CF6';
      case 'created': return '#10B981';
      case 'aggregated': return '#F59E0B';
      default: return '#6B7280';
    }
  }, [edge.type]);

  if (points.length === 0) return null;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={edge.weight ? Math.min(edge.weight / 10, 3) : 1}
      transparent
      opacity={0.6}
    />
  );
}

function NetworkScene({ data, interactive, showLabels }: {
  data: NetworkData;
  interactive: boolean;
  showLabels: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current && !interactive) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  const displayNodes = data.visible_nodes || data.nodes;
  const displayEdges = data.visible_edges || data.edges;
  const nodeLookup = useMemo(() => new Map(displayNodes.map(node => [node.id, node])), [displayNodes]);
  const nodeDetail = displayNodes.length > 400 ? 8 : displayNodes.length > 200 ? 12 : 16;
  const allowLabels = showLabels && displayNodes.length <= 200;
  const enableHover = interactive && displayNodes.length <= 250;

  const getNodeColor = (node: NetworkNode) => {
    switch (node.type) {
      case 'member': return '#60A5FA';
      case 'proposal': return '#34D399';
      case 'cluster': return '#F472B6';
      default: return '#9CA3AF';
    }
  };

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {displayEdges.map((edge, i) => (
        <NetworkEdge3D key={`edge-${i}`} edge={edge} nodeLookup={nodeLookup} />
      ))}

      {displayNodes.map((node) => (
        <NetworkNode3D
          key={node.id}
          node={node}
          color={getNodeColor(node)}
          showLabel={allowLabels}
          detail={nodeDetail}
          enableHover={enableHover}
        />
      ))}
    </group>
  );
}

export function NetworkGraph3D({
  data,
  interactive = true,
  showLabels = false,
  title = 'DAO Network Graph'
}: NetworkGraph3DProps) {
  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="w-full h-[600px] p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center">
        <p className="text-gray-500">No network data to display</p>
      </div>
    );
  }

  const dpr = data.nodes.length > 400 ? 1 : 1.5;
  const enableAntialias = data.nodes.length <= 300;

  return (
    <div className="w-full h-[600px] p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span className="text-gray-600 dark:text-gray-300">Members</span>
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-gray-600 dark:text-gray-300">Proposals</span>
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-400"></div>
            <span className="text-gray-600 dark:text-gray-300">Clusters</span>
          </span>
        </div>
      </div>
      <div className="w-full h-[calc(100%-3rem)] bg-gray-900 rounded">
        <Canvas
          camera={{ position: [50, 50, 50], fov: 60 }}
          dpr={dpr}
          gl={{ antialias: enableAntialias }}
        >
          <NetworkScene data={data} interactive={interactive} showLabels={showLabels} />
          {interactive && <OrbitControls enableDamping dampingFactor={0.05} />}
        </Canvas>
      </div>
    </div>
  );
}
