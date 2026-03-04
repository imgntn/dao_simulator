'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { BlackSwanSnapshot } from '@/lib/browser/worker-protocol';
import { BUILDING } from './constants';

interface Props {
  blackSwan: BlackSwanSnapshot;
  /** The building group ref to shake */
  buildingRef?: React.RefObject<THREE.Group | null>;
}

export function BlackSwanEffect({ blackSwan, buildingRef }: Props) {
  const overlayRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!blackSwan.active) {
      // Reset building position when not active
      if (buildingRef?.current) {
        buildingRef.current.position.x = 0;
        buildingRef.current.position.z = 0;
      }
      return;
    }

    const t = clock.elapsedTime;
    const intensity = blackSwan.severity;

    // Building shake
    if (buildingRef?.current) {
      const shakeX = Math.sin(t * 15) * 0.03 * intensity;
      const shakeZ = Math.cos(t * 18) * 0.02 * intensity;
      buildingRef.current.position.x = shakeX;
      buildingRef.current.position.z = shakeZ;
    }

    // Red pulse overlay
    if (overlayRef.current) {
      const material = overlayRef.current.material as THREE.MeshStandardMaterial;
      const pulse = (Math.sin(t * 3) * 0.5 + 0.5) * intensity;
      material.opacity = 0.05 + pulse * 0.08;
    }
  });

  if (!blackSwan.active) return null;

  return (
    <group>
      {/* Red atmosphere overlay (large sphere around scene) */}
      <mesh ref={overlayRef}>
        <sphereGeometry args={[25, 16, 16]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={0.5}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Red point light for atmosphere */}
      <pointLight
        position={[0, BUILDING.topY + 3, 0]}
        intensity={blackSwan.severity * 2}
        distance={30}
        color="#ff2222"
      />

      {/* Event name floating above building */}
      {blackSwan.name && (
        <Html
          position={[0, BUILDING.topY + 3, 0]}
          center
          distanceFactor={15}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              textAlign: 'center',
              fontFamily: 'monospace',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: '#ef4444',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 2,
                textShadow: '0 0 10px #ff0000',
              }}
            >
              BLACK SWAN EVENT
            </div>
            <div
              style={{
                fontSize: 13,
                color: '#fca5a5',
                fontWeight: 700,
                marginTop: 2,
              }}
            >
              {blackSwan.name}
            </div>
            {blackSwan.category && (
              <div style={{ fontSize: 9, color: '#f87171', marginTop: 1 }}>
                {blackSwan.category} | severity {blackSwan.severity.toFixed(1)}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
