'use client';

import { useRef, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BUILDING } from './constants';

export function CameraController() {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  // Set initial camera position to look at building from slight angle
  useEffect(() => {
    const centerY = (BUILDING.topY + BUILDING.bottomY) / 2;
    camera.position.set(14, centerY + 4, 14);
    camera.lookAt(0, centerY, 0);
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, (BUILDING.topY + BUILDING.bottomY) / 2, 0]}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      autoRotate={true}
      autoRotateSpeed={0.3}
      minDistance={8}
      maxDistance={50}
      maxPolarAngle={Math.PI * 0.85}
      minPolarAngle={Math.PI * 0.05}
    />
  );
}
