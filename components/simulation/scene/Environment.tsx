'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

export function Environment() {
  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.35} color="#8899bb" />

      {/* Main directional light (sun) */}
      <directionalLight
        position={[15, 25, 10]}
        intensity={0.9}
        color="#ffffff"
      />

      {/* Fill light from opposite side */}
      <directionalLight
        position={[-10, 15, -8]}
        intensity={0.3}
        color="#6688cc"
      />

      {/* Ground plane */}
      <GroundPlane />

      {/* City skyline backdrop */}
      <Skyline />

      {/* Streetlights */}
      <Streetlights />

      {/* Background color */}
      <color attach="background" args={['#080810']} />

      {/* Fog for depth */}
      <fog attach="fog" args={['#080810', 40, 100]} />
    </>
  );
}

function GroundPlane() {
  return (
    <group>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.01, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#0c0c14" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Subtle grid overlay */}
      <gridHelper
        args={[80, 40, '#1a1a2e', '#12121f']}
        position={[0, -2.0, 0]}
      />
    </group>
  );
}

function Skyline() {
  const buildings = useMemo(() => {
    const result: { x: number; z: number; w: number; h: number; d: number; color: string }[] = [];
    const rng = mulberry32(42);

    for (let i = 0; i < 40; i++) {
      const angle = (rng() * Math.PI * 2);
      const dist = 25 + rng() * 30;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const w = 1.5 + rng() * 3;
      const h = 3 + rng() * 15;
      const d = 1.5 + rng() * 3;
      const brightness = 0.04 + rng() * 0.06;
      const r = Math.floor(brightness * 180);
      const g = Math.floor(brightness * 200);
      const b = Math.floor(brightness * 255);
      result.push({ x, z, w, h, d, color: `rgb(${r},${g},${b})` });
    }
    return result;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 - 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.8} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Streetlights() {
  const positions: [number, number][] = [
    [-6, -4], [6, -4], [-6, 4], [6, 4],
    [-6, 0], [6, 0],
  ];

  return (
    <group>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, -2, z]}>
          {/* Pole */}
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 3, 6]} />
            <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Light */}
          <pointLight position={[0, 3, 0]} intensity={0.5} distance={8} color="#ffd080" />
          <mesh position={[0, 3, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial
              color="#ffd080"
              emissive="#ffd080"
              emissiveIntensity={2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Simple seeded PRNG (mulberry32) */
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
