'use client';

import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  treasuryFunds: number;
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function TreasuryIndicator({ treasuryFunds }: Props) {
  const radius = useMemo(() => {
    const r = Math.log10(Math.max(1, treasuryFunds)) * 0.3;
    return Math.max(0.5, Math.min(2.0, r));
  }, [treasuryFunds]);

  const color = useMemo(() => {
    const health = Math.min(1, treasuryFunds / 500_000);
    if (health > 0.6) return '#22d3ee';
    if (health > 0.3) return '#eab308';
    return '#ef4444';
  }, [treasuryFunds]);

  const label = formatValue(treasuryFunds);

  return (
    <group position={[0, 0, 0]}>
      <mesh>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          roughness={0.4}
          metalness={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      <Text
        position={[0, radius + 0.6, 0]}
        fontSize={0.6}
        color={color}
        anchorX="center"
        anchorY="bottom"
        font={undefined}
      >
        {label}
      </Text>
      <Text
        position={[0, radius + 1.3, 0]}
        fontSize={0.3}
        color="#9ca3af"
        anchorX="center"
        anchorY="bottom"
        font={undefined}
      >
        Treasury
      </Text>
    </group>
  );
}
