'use client';

import { useRef, useMemo } from 'react';
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

/** Storm cloud positions (static offsets from building top) */
const CLOUD_OFFSETS = [
  { x: 0, z: 0, y: 17, scale: 2.5 },
  { x: -3, z: 1, y: 18, scale: 2.0 },
  { x: 2.5, z: -1.5, y: 16.5, scale: 1.8 },
  { x: -1, z: -3, y: 19, scale: 1.5 },
  { x: 3, z: 2, y: 17.5, scale: 1.3 },
];

/** Rain particle constants */
const RAIN_COUNT = 200;

export function BlackSwanEffect({ blackSwan, buildingRef }: Props) {
  const overlayRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<(THREE.Mesh | null)[]>([]);
  const lightningRef = useRef<THREE.LineSegments>(null);
  const lightningTimer = useRef(0);
  const lightningFlash = useRef(0);
  const rainRef = useRef<THREE.InstancedMesh>(null);

  // Pre-compute rain initial positions
  const rainPositions = useMemo(() => {
    const pos = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 12 + 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    return pos;
  }, []);

  // Pre-compute lightning path
  const lightningGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    // Will be updated dynamically
    const pos = new Float32Array(24); // 4 segments = 8 vertices * 3
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geom;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }, delta) => {
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

    // Storm cloud drift
    for (let i = 0; i < CLOUD_OFFSETS.length; i++) {
      const cloud = cloudsRef.current[i];
      if (!cloud) continue;
      const off = CLOUD_OFFSETS[i];
      cloud.position.x = off.x + Math.sin(t * 0.3 + i) * 0.5;
      cloud.position.z = off.z + Math.cos(t * 0.25 + i * 1.5) * 0.5;
    }

    // Lightning
    lightningTimer.current -= delta;
    lightningFlash.current = Math.max(0, lightningFlash.current - delta * 8);

    if (lightningTimer.current <= 0) {
      // Generate new lightning
      lightningTimer.current = 0.5 + Math.random() * (2 - intensity);

      if (lightningRef.current) {
        const attr = lightningGeom.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        const startX = (Math.random() - 0.5) * 4;
        const startZ = (Math.random() - 0.5) * 4;
        const startY = 17 + Math.random() * 3;
        const endY = BUILDING.topY + 1;
        const segments = 4;

        let cx = startX, cy = startY, cz = startZ;
        for (let s = 0; s < segments; s++) {
          const nx = cx + (Math.random() - 0.5) * 2;
          const ny = cy - (startY - endY) / segments;
          const nz = cz + (Math.random() - 0.5) * 2;

          arr[s * 6] = cx;
          arr[s * 6 + 1] = cy;
          arr[s * 6 + 2] = cz;
          arr[s * 6 + 3] = nx;
          arr[s * 6 + 4] = ny;
          arr[s * 6 + 5] = nz;

          cx = nx; cy = ny; cz = nz;
        }
        attr.needsUpdate = true;
        lightningFlash.current = 1;
      }
    }

    if (lightningRef.current) {
      const mat = lightningRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = lightningFlash.current;
    }

    // Rain particles
    if (rainRef.current) {
      const mesh = rainRef.current;
      const speed = 8 + intensity * 6;
      const wind = intensity * 1.5;

      for (let i = 0; i < RAIN_COUNT; i++) {
        // Move down
        rainPositions[i * 3 + 1] -= speed * delta;
        // Wind drift
        rainPositions[i * 3] += wind * delta;

        // Reset if below ground
        if (rainPositions[i * 3 + 1] < -2) {
          rainPositions[i * 3] = (Math.random() - 0.5) * 16;
          rainPositions[i * 3 + 1] = 16 + Math.random() * 6;
          rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 16;
        }

        dummy.position.set(
          rainPositions[i * 3],
          rainPositions[i * 3 + 1],
          rainPositions[i * 3 + 2]
        );
        dummy.scale.set(0.02, 0.15, 0.02);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  if (!blackSwan.active) return null;

  const cloudCount = Math.min(5, Math.max(3, Math.round(blackSwan.severity * 5)));

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

      {/* Storm clouds */}
      {CLOUD_OFFSETS.slice(0, cloudCount).map((off, i) => (
        <mesh
          key={`cloud-${i}`}
          ref={el => { cloudsRef.current[i] = el; }}
          position={[off.x, off.y, off.z]}
        >
          <sphereGeometry args={[off.scale, 8, 8]} />
          <meshStandardMaterial
            color="#1a1a2e"
            emissive="#1a1a2e"
            emissiveIntensity={0.2}
            transparent
            opacity={0.6 + blackSwan.severity * 0.2}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Lightning */}
      <lineSegments ref={lightningRef} geometry={lightningGeom}>
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          linewidth={2}
          depthWrite={false}
        />
      </lineSegments>

      {/* Rain particles */}
      <instancedMesh ref={rainRef} args={[undefined, undefined, RAIN_COUNT]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#88ccff"
          emissive="#88ccff"
          emissiveIntensity={0.3}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </instancedMesh>

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
