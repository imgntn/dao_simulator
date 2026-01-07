'use client';

interface EmptyStateProps {
  socketUrl: string;
}

export function EmptyState({ socketUrl }: EmptyStateProps) {
  return (
    <section className="w-full h-[400px] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-6xl">📊</div>
        <h2 className="text-2xl font-bold text-gray-300">Waiting for Simulation Data</h2>
        <p className="text-gray-400">
          Start a simulation to see real-time visualizations
        </p>
        <p className="text-sm text-gray-500">
          Connect to WebSocket at <code className="bg-gray-800 px-2 py-1 rounded">{socketUrl}</code>
        </p>
      </div>
    </section>
  );
}
