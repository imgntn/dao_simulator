import type { Metadata } from 'next';
import SimulationPageClient from './SimulationPageClient';

export const metadata: Metadata = {
  title: 'Live Simulation',
  description: 'Run DAO governance simulations in your browser with a real-time interactive Sanctum visualization.',
};

export default function SimulatePage() {
  return <SimulationPageClient />;
}
