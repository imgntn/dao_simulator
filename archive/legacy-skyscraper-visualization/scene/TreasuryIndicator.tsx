'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { BUILDING } from './constants';

interface Props {
  treasuryFunds: number;
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

/** Basement vault: gold bar stacks scaled to treasury funds, with pulse on large changes */
export function TreasuryIndicator({ treasuryFunds }: Props) {
  const prevTreasury = useRef(treasuryFunds);
  const pulseIntensity = useRef(0);
  const pulseColor = useRef<'cyan' | 'red'>('cyan');
  const floorRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const lastTargetColor = useRef('');
  const tmpColor = useMemo(() => new THREE.Color(), []);

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

  // Detect large treasury changes and trigger pulse
  // Use a debounce to prevent flickering from rapid small changes
  const lastPulseTime = useRef(0);

  useFrame(({ clock }) => {
    const delta = treasuryFunds - prevTreasury.current;
    const threshold = prevTreasury.current * 0.05; // 5% change (was 1% — too sensitive)
    const now = clock.elapsedTime;

    // Only pulse if significant change AND at least 1s since last pulse
    if (Math.abs(delta) > Math.max(threshold, 500) && now - lastPulseTime.current > 1.0) {
      pulseIntensity.current = 0.6; // Softer pulse (was 0.8)
      pulseColor.current = delta > 0 ? 'cyan' : 'red';
      lastPulseTime.current = now;
    }
    prevTreasury.current = treasuryFunds;

    // Decay pulse — slower decay for smoother transitions
    if (pulseIntensity.current > 0) {
      pulseIntensity.current *= 0.96; // ~50 frame decay (was 0.93 = ~30 frames)
      if (pulseIntensity.current < 0.01) pulseIntensity.current = 0;
    }

    const t = clock.elapsedTime;
    // Continuous gentle breathing — very subtle
    const breathe = 0.85 + 0.15 * Math.sin(t * 0.3); // Slower, narrower range
    const totalEmissive = Math.max(0.15 * breathe, pulseIntensity.current);

    // Update floor glow — only set color when it changes
    if (floorRef.current) {
      const mat = floorRef.current.material as THREE.MeshStandardMaterial;
      const targetColor = pulseIntensity.current > 0.1
        ? (pulseColor.current === 'cyan' ? '#22d3ee' : '#ef4444')
        : glowColor;
      if (targetColor !== lastTargetColor.current) {
        tmpColor.set(targetColor);
        mat.color.copy(tmpColor);
        mat.emissive.copy(tmpColor);
        lastTargetColor.current = targetColor;
      }
      mat.emissiveIntensity = totalEmissive;
      mat.opacity = 0.15 + pulseIntensity.current * 0.3;
    }

    // Update point light — skip when pulse is zero
    if (lightRef.current && pulseIntensity.current > 0.01) {
      lightRef.current.intensity = pulseIntensity.current * 3;
      lightRef.current.color.set(
        pulseColor.current === 'cyan' ? '#22d3ee' : '#ef4444'
      );
    } else if (lightRef.current) {
      lightRef.current.intensity = 0;
    }
  });

  return (
    <group position={[0, vaultY, 0]}>
      {/* Vault floor glow */}
      <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.95, 0]}>
        <planeGeometry args={[BUILDING.width - 0.5, BUILDING.depth - 0.5]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.2}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Pulse point light at vault center */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 0]}
        intensity={0}
        distance={8}
        color="#22d3ee"
      />

      {/* Gold bar stacks */}
      <GoldBars count={barCount} />

      {/* Value label — Billboard keeps text facing camera */}
      <Billboard position={[0, 1.0, 0]}>
        <Text
          position={[0, -0.2, 0]}
          fontSize={0.4}
          color={glowColor}
          anchorX="center"
          anchorY="bottom"
          font={undefined}
        >
          {label}
        </Text>
        <Text
          position={[0, 0.2, 0]}
          fontSize={0.2}
          color="#9ca3af"
          anchorX="center"
          anchorY="bottom"
          font={undefined}
        >
          Treasury Vault
        </Text>
      </Billboard>
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
