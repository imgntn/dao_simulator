'use client';

import { useRef } from 'react';
import * as THREE from 'three';

export function Environment() {
  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.3} color="#8899bb" />

      {/* Main directional light */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        color="#ffffff"
        castShadow={false}
      />

      {/* Subtle grid floor */}
      <GridFloor />

      {/* Background color */}
      <color attach="background" args={['#0a0a0f']} />

      {/* Fog for depth */}
      <fog attach="fog" args={['#0a0a0f', 30, 80]} />
    </>
  );
}

function GridFloor() {
  const ref = useRef<THREE.GridHelper>(null);

  return (
    <gridHelper
      ref={ref}
      args={[60, 60, '#1a1a2e', '#12121f']}
      position={[0, -0.5, 0]}
    />
  );
}
