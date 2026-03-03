'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { Environment } from './scene/Environment';
import { TreasuryIndicator } from './scene/TreasuryIndicator';
import { TokenPriceIndicator } from './scene/TokenPriceIndicator';
import { AgentGroups } from './scene/AgentGroups';
import { CameraController } from './scene/CameraController';

export function SimulationCanvas() {
  const snapshot = useSimulationStore(s => s.snapshot);
  const status = useSimulationStore(s => s.status);

  if (!snapshot && status !== 'running') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-950">
        <p className="text-gray-600 text-sm font-mono">Press Play to begin</p>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 12, 20], fov: 50, near: 0.1, far: 500 }}
      dpr={[1, 2]}
      className="bg-gray-950"
    >
      <Suspense fallback={null}>
        <Environment />
        <CameraController />
        {snapshot && (
          <>
            <TreasuryIndicator treasuryFunds={snapshot.treasuryFunds} />
            <TokenPriceIndicator tokenPrice={snapshot.tokenPrice} />
            <AgentGroups agents={snapshot.agents} />
          </>
        )}
      </Suspense>
    </Canvas>
  );
}
