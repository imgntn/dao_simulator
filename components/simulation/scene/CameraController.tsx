'use client';

import { useRef, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUILDING, FLOORS } from './constants';
import { useSimulationStore } from '@/lib/browser/simulation-store';

export function CameraController() {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const targetFloor = useSimulationStore(s => s.targetFloor);
  const setTargetFloor = useSimulationStore(s => s.setTargetFloor);
  const targetY = useRef<number | null>(null);

  // Set initial camera position
  useEffect(() => {
    const centerY = (BUILDING.topY + BUILDING.bottomY) / 2;
    camera.position.set(14, centerY + 4, 14);
    camera.lookAt(0, centerY, 0);
  }, [camera]);

  // When targetFloor changes, set the target Y
  useEffect(() => {
    if (!targetFloor) {
      targetY.current = null;
      return;
    }
    const floor = FLOORS.find(f => f.id === targetFloor);
    if (floor) {
      targetY.current = floor.yBase + floor.height / 2;
    }
  }, [targetFloor]);

  // Animate camera to target floor
  useFrame(() => {
    if (targetY.current === null || !controlsRef.current) return;

    const controls = controlsRef.current;
    const target = controls.target as THREE.Vector3;
    const desiredY = targetY.current;

    // Lerp target
    target.y += (desiredY - target.y) * 0.08;

    // Lerp camera Y
    camera.position.y += (desiredY + 4 - camera.position.y) * 0.08;

    controls.update();

    // Clear when arrived
    if (Math.abs(target.y - desiredY) < 0.01) {
      targetY.current = null;
      setTargetFloor(null);
    }
  });

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
