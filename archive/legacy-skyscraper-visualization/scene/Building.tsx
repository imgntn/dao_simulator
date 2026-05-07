'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { FLOORS, BUILDING } from './constants';

interface Props {
  /** Set of floor IDs that currently have agents on them */
  activeFloorIds?: Set<string>;
}

export function Building({ activeFloorIds }: Props) {
  return (
    <group>
      {/* Floor plates */}
      {FLOORS.map(floor => (
        <FloorPlate
          key={floor.id}
          yBase={floor.yBase}
          height={floor.height}
          color={floor.color}
          active={activeFloorIds?.has(floor.id) ?? false}
        />
      ))}

      {/* Elevator shaft columns at corners */}
      <ElevatorShafts />

      {/* Roof cap */}
      <mesh position={[0, BUILDING.topY + 0.05, 0]}>
        <boxGeometry args={[BUILDING.width + 0.2, 0.1, BUILDING.depth + 0.2]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function FloorPlate({
  yBase,
  height,
  color,
  active,
}: {
  yBase: number;
  height: number;
  color: string;
  active: boolean;
}) {
  const edgeColor = useMemo(() => new THREE.Color(color), [color]);

  // Cache edge geometry to avoid recreating BoxGeometry on every render
  const edgeGeom = useMemo(() => {
    const box = new THREE.BoxGeometry(BUILDING.width, height, BUILDING.depth);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose(); // Dispose the source box immediately
    return edges;
  }, [height]);

  return (
    <group position={[0, yBase + height / 2, 0]}>
      {/* Glass panel */}
      <mesh>
        <boxGeometry args={[BUILDING.width, height, BUILDING.depth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={active ? 0.12 : 0.06}
          roughness={0.1}
          metalness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe edges */}
      <lineSegments geometry={edgeGeom}>
        <lineBasicMaterial color={edgeColor} transparent opacity={0.4} />
      </lineSegments>

      {/* Floor slab (thin plate at bottom of each floor) */}
      <mesh position={[0, -height / 2 + 0.025, 0]}>
        <boxGeometry args={[BUILDING.width - 0.1, 0.05, BUILDING.depth - 0.1]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.3}
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>

      {/* Emissive glow for active floors */}
      {active && (
        <mesh>
          <boxGeometry
            args={[BUILDING.width - 0.2, height - 0.2, BUILDING.depth - 0.2]}
          />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.15}
            transparent
            opacity={0.05}
          />
        </mesh>
      )}
    </group>
  );
}

function ElevatorShafts() {
  const totalHeight = BUILDING.topY - BUILDING.bottomY;
  const centerY = (BUILDING.topY + BUILDING.bottomY) / 2;
  const halfW = BUILDING.width / 2 - 0.15;
  const halfD = BUILDING.depth / 2 - 0.15;

  const corners: [number, number][] = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [-halfW, halfD],
    [halfW, halfD],
  ];

  return (
    <group>
      {corners.map(([x, z], i) => (
        <mesh key={i} position={[x, centerY, z]}>
          <cylinderGeometry args={[0.08, 0.08, totalHeight, 6]} />
          <meshStandardMaterial
            color="#475569"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}
