'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { BUILDING } from './constants';

interface Props {
  tokenPrice: number;
  initialPrice?: number;
}

/** Freestanding LED billboard near the building */
export function TokenPriceIndicator({ tokenPrice, initialPrice = 1.0 }: Props) {
  const pulseRef = useRef<THREE.MeshStandardMaterial>(null);

  const isUp = tokenPrice >= initialPrice;
  const color = isUp ? '#22c55e' : '#ef4444';
  const arrow = isUp ? '\u25B2' : '\u25BC';
  const label = `$${tokenPrice.toFixed(3)}`;
  const pctChange = ((tokenPrice - initialPrice) / initialPrice) * 100;

  // Subtle pulse animation
  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const t = Math.sin(clock.elapsedTime * 2) * 0.5 + 0.5;
      pulseRef.current.emissiveIntensity = 0.3 + t * 0.2;
    }
  });

  // Freestanding position: offset from building, standing on ground
  const billboardX = -BUILDING.width / 2 - 3;
  const billboardY = 4;

  return (
    <group position={[billboardX, billboardY, 0]}>
      {/* Billboard backing — tall freestanding sign */}
      <mesh>
        <boxGeometry args={[2.5, 2.5, 0.15]} />
        <meshStandardMaterial
          ref={pulseRef}
          color="#0a0a1a"
          emissive={color}
          emissiveIntensity={0.3}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Frame border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(2.5, 2.5, 0.17)]} />
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </lineSegments>

      {/* Support pole */}
      <mesh position={[0, -2.8, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 3.2, 8]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Price display */}
      <Html
        position={[0, 0, 0.1]}
        transform
        distanceFactor={4}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontSize: 8, color: '#94a3b8', marginBottom: 2 }}>
            TOKEN PRICE
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color,
              letterSpacing: 1,
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 12, color, marginTop: 2 }}>
            {arrow} {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
          </div>
        </div>
      </Html>
    </group>
  );
}
