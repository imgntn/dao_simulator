'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SimulationEvent } from '@/lib/browser/worker-protocol';

interface Props {
  events: SimulationEvent[];
  currentStep: number;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

const MAX_PARTICLES = 200;
const GOV_FLOOR_Y = 4.5; // F2 Governance Chamber center

/** Proposal lifecycle particles — bursts on creation/approval/rejection */
export function ProposalParticles({ events, currentStep }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particles = useRef<Particle[]>([]);
  const lastProcessedStep = useRef(-1);

  // Track events to spawn particles
  useEffect(() => {
    if (currentStep <= lastProcessedStep.current) return;
    lastProcessedStep.current = currentStep;

    for (const event of events) {
      if (event.step !== currentStep) continue;

      if (event.type === 'proposal_created') {
        spawnParticles(particles.current, 15, GOV_FLOOR_Y, '#06b6d4', 'rise');
      } else if (event.type === 'proposal_approved') {
        spawnParticles(particles.current, 25, GOV_FLOOR_Y, '#22c55e', 'burst');
      } else if (event.type === 'proposal_rejected') {
        spawnParticles(particles.current, 25, GOV_FLOOR_Y, '#ef4444', 'fall');
      }
    }
  }, [events, currentStep]);

  // Pre-allocate reusable objects outside render loop
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const alive = particles.current;
    const dt = Math.min(delta, 0.05); // cap

    // Update particles
    for (let i = alive.length - 1; i >= 0; i--) {
      const p = alive[i];
      p.life -= dt;
      if (p.life <= 0) {
        alive.splice(i, 1);
        continue;
      }

      // Physics
      p.velocity.y += -1.5 * dt; // gravity
      p.position.addScaledVector(p.velocity, dt);
    }

    // Update instances
    const count = Math.min(alive.length, MAX_PARTICLES);
    mesh.count = count;

    for (let i = 0; i < count; i++) {
      const p = alive[i];
      const alpha = p.life / p.maxLife;

      dummy.position.copy(p.position);
      dummy.scale.setScalar(p.size * alpha);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Reuse tempColor instead of cloning
      tempColor.copy(p.color);
      mesh.setColorAt(i, tempColor);
    }

    if (count > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        transparent
        opacity={0.8}
        emissive="#ffffff"
        emissiveIntensity={0.5}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function spawnParticles(
  particles: Particle[],
  count: number,
  y: number,
  color: string,
  mode: 'rise' | 'burst' | 'fall'
) {
  for (let i = 0; i < count; i++) {
    // Trim oldest if at capacity
    if (particles.length >= MAX_PARTICLES) {
      particles.shift();
    }

    const angle = Math.random() * Math.PI * 2;
    const spread = 1.5;
    const px = Math.cos(angle) * Math.random() * spread;
    const pz = Math.sin(angle) * Math.random() * spread;

    let vx = 0, vy = 0, vz = 0;
    if (mode === 'rise') {
      vx = (Math.random() - 0.5) * 0.5;
      vy = 1.5 + Math.random() * 1.5;
      vz = (Math.random() - 0.5) * 0.5;
    } else if (mode === 'burst') {
      const speed = 2 + Math.random() * 2;
      vx = Math.cos(angle) * speed;
      vy = 1 + Math.random() * 2;
      vz = Math.sin(angle) * speed;
    } else {
      vx = (Math.random() - 0.5) * 1;
      vy = -0.5 + Math.random() * 0.5;
      vz = (Math.random() - 0.5) * 1;
    }

    const life = mode === 'rise' ? 2 : 1.5;

    particles.push({
      position: new THREE.Vector3(px, y, pz),
      velocity: new THREE.Vector3(vx, vy, vz),
      color: new THREE.Color(color),
      life,
      maxLife: life,
      size: 0.04 + Math.random() * 0.03,
    });
  }
}
