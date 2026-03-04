'use client';

import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import { BUILDING } from './constants';

interface Props {
  treasuryFunds: number;
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

/** Basement vault: gold bar stacks scaled to treasury funds */
export function TreasuryIndicator({ treasuryFunds }: Props) {
  const health = useMemo(
    () => Math.min(1, treasuryFunds / 500_000),
    [treasuryFunds]
  );

  const glowColor = useMemo(() => {
    if (health > 0.6) return '#22d3ee';
    if (health > 0.3) return '#eab308';
    return '#ef4444';
  }, [health]);

  // Number of gold bar stacks (1–8 based on treasury)
  const barCount = useMemo(() => {
    return Math.max(1, Math.min(8, Math.floor(Math.log10(Math.max(1, treasuryFunds)) * 1.3)));
  }, [treasuryFunds]);

  const label = formatValue(treasuryFunds);

  // Basement Y center
  const vaultY = -1;

  return (
    <group position={[0, vaultY, 0]}>
      {/* Vault floor glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.95, 0]}>
        <planeGeometry args={[BUILDING.width - 0.5, BUILDING.depth - 0.5]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.2}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Gold bar stacks */}
      <GoldBars count={barCount} />

      {/* Value label */}
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.4}
        color={glowColor}
        anchorX="center"
        anchorY="bottom"
        font={undefined}
      >
        {label}
      </Text>
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.2}
        color="#9ca3af"
        anchorX="center"
        anchorY="bottom"
        font={undefined}
      >
        Treasury Vault
      </Text>
    </group>
  );
}

function GoldBars({ count }: { count: number }) {
  const bars = useMemo(() => {
    const result: { x: number; z: number; h: number }[] = [];
    const cols = Math.ceil(Math.sqrt(count));
    const spacing = 0.7;

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const totalRows = Math.ceil(count / cols);
      const x = (col - (cols - 1) / 2) * spacing;
      const z = (row - (totalRows - 1) / 2) * spacing;
      const h = 0.2 + (i % 3) * 0.1; // Slight height variation
      result.push({ x, z, h });
    }
    return result;
  }, [count]);

  return (
    <group position={[0, -0.6, 0]}>
      {bars.map((bar, i) => (
        <mesh key={i} position={[bar.x, bar.h / 2, bar.z]}>
          <boxGeometry args={[0.4, bar.h, 0.2]} />
          <meshStandardMaterial
            color="#d4a017"
            emissive="#d4a017"
            emissiveIntensity={0.3}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}
