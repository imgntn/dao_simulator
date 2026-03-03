'use client';

import { OrbitControls } from '@react-three/drei';

export function CameraController() {
  return (
    <OrbitControls
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      autoRotate={false}
      minDistance={5}
      maxDistance={60}
      maxPolarAngle={Math.PI * 0.85}
      minPolarAngle={Math.PI * 0.1}
    />
  );
}
