'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { AgentSnapshot } from '@/lib/browser/worker-protocol';

const TYPE_COLOR_MAP: Record<string, string> = {
  Developer: '#3b82f6',
  Investor: '#10b981',
  Trader: '#f59e0b',
  AdaptiveInvestor: '#34d399',
  Delegator: '#8b5cf6',
  LiquidDelegator: '#a78bfa',
  ProposalCreator: '#ec4899',
  Validator: '#06b6d4',
  ServiceProvider: '#14b8a6',
  Arbitrator: '#f97316',
  Regulator: '#64748b',
  Auditor: '#0ea5e9',
  BountyHunter: '#84cc16',
  ExternalPartner: '#d946ef',
  PassiveMember: '#6b7280',
  Artist: '#f43f5e',
  Collector: '#a855f7',
  Speculator: '#eab308',
  RLTrader: '#22c55e',
  GovernanceExpert: '#14b8a6',
  GovernanceWhale: '#f43f5e',
  RiskManager: '#84cc16',
  MarketMaker: '#0891b2',
  Whistleblower: '#dc2626',
  StakerAgent: '#22d3ee',
};

interface Props {
  agents: AgentSnapshot[];
}

interface GroupInfo {
  type: string;
  count: number;
  color: string;
  angle: number;
  position: [number, number, number];
}

export function AgentGroups({ agents }: Props) {
  const groups = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of agents) {
      counts[a.type] = (counts[a.type] || 0) + 1;
    }

    const types = Object.keys(counts).sort();
    const radius = 10;
    const result: GroupInfo[] = [];

    for (let i = 0; i < types.length; i++) {
      const angle = (Math.PI * i) / Math.max(1, types.length - 1) - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      result.push({
        type: types[i],
        count: counts[types[i]],
        color: TYPE_COLOR_MAP[types[i]] || '#888888',
        angle,
        position: [x, 0, z],
      });
    }

    return result;
  }, [agents]);

  return (
    <group>
      {groups.map((g) => (
        <AgentCluster key={g.type} group={g} />
      ))}
    </group>
  );
}

function AgentCluster({ group }: { group: GroupInfo }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const matrices = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(group.count));
    const spacing = 0.5;
    const dummy = new THREE.Object3D();
    const result: THREE.Matrix4[] = [];

    for (let i = 0; i < group.count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const ox = (col - (cols - 1) / 2) * spacing;
      const oz = (row - (Math.ceil(group.count / cols) - 1) / 2) * spacing;
      dummy.position.set(
        group.position[0] + ox,
        0.2,
        group.position[2] + oz
      );
      dummy.scale.setScalar(0.2);
      dummy.updateMatrix();
      result.push(dummy.matrix.clone());
    }

    return result;
  }, [group]);

  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const color = new THREE.Color(group.color);

    for (let i = 0; i < matrices.length; i++) {
      mesh.setMatrixAt(i, matrices[i]);
      mesh.setColorAt(i, color);
    }

    mesh.count = matrices.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [matrices, group.color]);

  const label = `${group.type} (${group.count})`;

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(group.count, 1)]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial
          roughness={0.5}
          metalness={0.3}
          transparent
          opacity={0.85}
        />
      </instancedMesh>
      <Text
        position={[group.position[0], 1.2, group.position[2]]}
        fontSize={0.35}
        color={group.color}
        anchorX="center"
        anchorY="bottom"
        font={undefined}
      >
        {label}
      </Text>
    </group>
  );
}
