import type { Metadata } from 'next';
import SimulationPageClient from './SimulationPageClient';

export const metadata: Metadata = {
  title: 'Live Simulation',
  description: 'Run DAO governance simulations in your browser with real-time 3D visualization.',
};

export default function SimulatePage() {
  return <SimulationPageClient />;
}
