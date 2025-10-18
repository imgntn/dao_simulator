'use client';

import { useState } from 'react';
import { PriceLineChart } from '@/components/visualizations/PriceLineChart';
import { MemberHeatmap } from '@/components/visualizations/MemberHeatmap';
import { NetworkGraph3D } from '@/components/visualizations/NetworkGraph3D';
import { ChoroplethMap } from '@/components/visualizations/ChoroplethMap';
import { DAOReport } from '@/components/visualizations/DAOReport';
import { useSimulationSocket } from '@/lib/hooks/useSimulationSocket';

export default function DashboardPage() {
  const {
    connected,
    step,
    priceHistory,
    simulationData,
    networkData,
    members,
    proposals,
    tokenLeaderboard,
    influenceLeaderboard,
    marketShocks,
    reset,
  } = useSimulationSocket();

  const [showLabels, setShowLabels] = useState(false);
  const [interactiveNetwork, setInteractiveNetwork] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                DAO Simulator Dashboard
              </h1>
              <p className="text-gray-400 mt-1">Real-time governance visualization</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-300">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="text-sm text-gray-300">
                Step: <span className="font-mono font-bold text-blue-400">{step}</span>
              </div>
              <a
                href="/api/simulation"
                className="px-4 py-2 border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white rounded-lg transition-colors text-sm"
              >
                API Docs
              </a>
              <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-[1920px] mx-auto px-6 py-8 space-y-8">
        {/* Report Section */}
        <section className="w-full">
          <DAOReport
            simulationData={simulationData}
            tokenLeaderboard={tokenLeaderboard}
            influenceLeaderboard={influenceLeaderboard}
            marketShocks={marketShocks}
            members={members}
            proposals={proposals}
          />
        </section>

        {/* Price Chart - Full Width */}
        <section className="w-full">
          <PriceLineChart
            data={priceHistory}
            title="DAO Token Price History"
            interactive={true}
          />
        </section>

        {/* Network Visualization - Full Width */}
        {networkData && networkData.nodes.length > 0 && (
          <section className="w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Network Graph - {networkData.nodes.length} nodes, {networkData.edges.length} edges
                </h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={(e) => setShowLabels(e.target.checked)}
                      className="rounded"
                    />
                    Show Labels
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={interactiveNetwork}
                      onChange={(e) => setInteractiveNetwork(e.target.checked)}
                      className="rounded"
                    />
                    Interactive
                  </label>
                </div>
              </div>
              <NetworkGraph3D
                data={networkData}
                interactive={interactiveNetwork}
                showLabels={showLabels}
              />
            </div>
          </section>
        )}

        {/* Two Column Layout - Heatmap and Choropleth */}
        {members.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <MemberHeatmap members={members} />
            <ChoroplethMap members={members} />
          </section>
        )}

        {/* Empty State */}
        {!connected && simulationData.length === 0 && (
          <section className="w-full h-[400px] flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-6xl">📊</div>
              <h2 className="text-2xl font-bold text-gray-300">Waiting for Simulation Data</h2>
              <p className="text-gray-400">
                Start a simulation to see real-time visualizations
              </p>
              <p className="text-sm text-gray-500">
                Connect to WebSocket at <code className="bg-gray-800 px-2 py-1 rounded">localhost:8003</code>
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800/50 backdrop-blur-lg border-t border-gray-700 mt-16">
        <div className="max-w-[1920px] mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-400">
            <div>
              <h4 className="font-semibold text-white mb-2">Visualization Types</h4>
              <ul className="space-y-1">
                <li>• Real-time Price Charts</li>
                <li>• 3D Network Graphs</li>
                <li>• Member Heatmaps</li>
                <li>• Geographic Distribution</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Features</h4>
              <ul className="space-y-1">
                <li>• Live WebSocket Updates</li>
                <li>• Interactive 3D Visualizations</li>
                <li>• Comprehensive Reports</li>
                <li>• Leaderboard Tracking</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Technologies</h4>
              <ul className="space-y-1">
                <li>• Next.js 15 + React 19</li>
                <li>• Three.js + React Three Fiber</li>
                <li>• Recharts</li>
                <li>• Socket.IO</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-500">
            <p>Built with vision by incredible technologists and artists</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
