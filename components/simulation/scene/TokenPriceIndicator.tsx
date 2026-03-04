'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { BUILDING } from './constants';

interface Props {
  tokenPrice: number;
  initialPrice?: number;
}

/** LED billboard mounted on the building exterior */
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

  // Billboard position: right side of building, mid-height
  const billboardY = 8;

  return (
    <group position={[-BUILDING.width / 2 - 0.15, billboardY, 0]}>
      {/* Billboard backing */}
      <mesh>
        <boxGeometry args={[0.1, 2.0, 2.5]} />
        <meshStandardMaterial
          ref={pulseRef}
          color="#0a0a1a"
          emissive={color}
          emissiveIntensity={0.3}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* LED frame border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(0.12, 2.0, 2.5)]} />
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </lineSegments>

      {/* Price display */}
      <Html
        position={[-0.08, 0, 0]}
        transform
        rotation={[0, Math.PI / 2, 0]}
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
