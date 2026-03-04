'use client';

import { useRef, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import type { AgentSnapshot } from '@/lib/browser/worker-protocol';
import {
  AGENT_FLOORS,
  AGENT_FLOOR_MAP,
  BUILDING,
  TYPE_COLOR_MAP,
} from './constants';

interface Props {
  agents: AgentSnapshot[];
  onHover?: (agent: AgentSnapshot | null, position: THREE.Vector3 | null) => void;
  onSelect?: (agent: AgentSnapshot | null) => void;
}

interface FloorAgents {
  floorId: string;
  yBase: number;
  height: number;
  agents: AgentSnapshot[];
}

export function AgentGroups({ agents, onHover, onSelect }: Props) {
  const floorGroups = useMemo(() => {
    const map = new Map<string, AgentSnapshot[]>();
    for (const a of agents) {
      const floorId = AGENT_FLOOR_MAP[a.type] ?? 'F1';
      if (!map.has(floorId)) map.set(floorId, []);
      map.get(floorId)!.push(a);
    }

    const result: FloorAgents[] = [];
    for (const floor of AGENT_FLOORS) {
      const floorAgents = map.get(floor.id) ?? [];
      if (floorAgents.length > 0) {
        result.push({
          floorId: floor.id,
          yBase: floor.yBase,
          height: floor.height,
          agents: floorAgents,
        });
      }
    }
    return result;
  }, [agents]);

  return (
    <group>
      {floorGroups.map(fg => (
        <FloorCluster
          key={fg.floorId}
          floor={fg}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function FloorCluster({
  floor,
  onHover,
  onSelect,
}: {
  floor: FloorAgents;
  onHover?: (agent: AgentSnapshot | null, position: THREE.Vector3 | null) => void;
  onSelect?: (agent: AgentSnapshot | null) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const prevPositions = useRef<Float32Array | null>(null);
  const targetPositions = useRef<Float32Array | null>(null);

  const { matrices, positions: posArray, colors } = useMemo(() => {
    const count = floor.agents.length;
    const cols = Math.ceil(Math.sqrt(count));
    const spacing = 0.55;
    const floorWidth = BUILDING.width - 1.0;
    const floorDepth = BUILDING.depth - 1.0;
    const dummy = new THREE.Object3D();
    const mats: THREE.Matrix4[] = [];
    const pos = new Float32Array(count * 3);
    const col: THREE.Color[] = [];

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col_idx = i % cols;
      const totalRows = Math.ceil(count / cols);

      // Center agents within the floor bounds
      let ox = (col_idx - (cols - 1) / 2) * spacing;
      let oz = (row - (totalRows - 1) / 2) * spacing;

      // Clamp to floor bounds
      ox = Math.max(-floorWidth / 2, Math.min(floorWidth / 2, ox));
      oz = Math.max(-floorDepth / 2, Math.min(floorDepth / 2, oz));

      const y = floor.yBase + floor.height * 0.3;

      dummy.position.set(ox, y, oz);
      dummy.scale.setScalar(0.18);
      dummy.updateMatrix();
      mats.push(dummy.matrix.clone());

      pos[i * 3] = ox;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = oz;

      col.push(new THREE.Color(TYPE_COLOR_MAP[floor.agents[i].type] ?? '#888888'));
    }

    return { matrices: mats, positions: pos, colors: col };
  }, [floor]);

  // Smooth position lerping
  useEffect(() => {
    if (!prevPositions.current || prevPositions.current.length !== posArray.length) {
      prevPositions.current = new Float32Array(posArray);
    }
    targetPositions.current = posArray;
  }, [posArray]);

  useFrame(() => {
    if (!meshRef.current || !prevPositions.current || !targetPositions.current) return;
    const mesh = meshRef.current;
    const prev = prevPositions.current;
    const target = targetPositions.current;
    const dummy = new THREE.Object3D();
    let needsUpdate = false;

    for (let i = 0; i < floor.agents.length; i++) {
      const idx = i * 3;
      prev[idx] += (target[idx] - prev[idx]) * 0.08;
      prev[idx + 1] += (target[idx + 1] - prev[idx + 1]) * 0.08;
      prev[idx + 2] += (target[idx + 2] - prev[idx + 2]) * 0.08;

      if (
        Math.abs(target[idx] - prev[idx]) > 0.001 ||
        Math.abs(target[idx + 1] - prev[idx + 1]) > 0.001 ||
        Math.abs(target[idx + 2] - prev[idx + 2]) > 0.001
      ) {
        dummy.position.set(prev[idx], prev[idx + 1], prev[idx + 2]);
        dummy.scale.setScalar(0.18);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  // Set initial matrices and colors
  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;

    for (let i = 0; i < matrices.length; i++) {
      mesh.setMatrixAt(i, matrices[i]);
      mesh.setColorAt(i, colors[i]);
    }

    mesh.count = matrices.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [matrices, colors]);

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const id = e.instanceId;
      if (id !== undefined && id < floor.agents.length && onHover) {
        const agent = floor.agents[id];
        const pos = new THREE.Vector3(
          posArray[id * 3],
          posArray[id * 3 + 1] + 0.4,
          posArray[id * 3 + 2]
        );
        onHover(agent, pos);
      }
    },
    [floor.agents, posArray, onHover]
  );

  const handlePointerOut = useCallback(() => {
    onHover?.(null, null);
  }, [onHover]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const id = e.instanceId;
      if (id !== undefined && id < floor.agents.length && onSelect) {
        onSelect(floor.agents[id]);
      }
    },
    [floor.agents, onSelect]
  );

  if (floor.agents.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, Math.max(floor.agents.length, 1)]}
      frustumCulled={false}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[1, 10, 10]} />
      <meshStandardMaterial
        roughness={0.4}
        metalness={0.3}
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  );
}
