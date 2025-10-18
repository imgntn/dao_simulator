import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8">
      <main className="max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
            DAO Simulator
          </h1>
          <p className="text-xl md:text-2xl text-gray-300">
            Real-time decentralized governance visualization
          </p>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Experience the beauty of distributed decision-making through stunning 3D network graphs,
            interactive charts, and comprehensive analytics.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
          <Link
            href="/dashboard"
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full font-bold text-lg text-white shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
          >
            <span className="relative z-10">Launch Dashboard</span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left">
          <div className="p-6 bg-gray-800/50 backdrop-blur-lg rounded-lg border border-gray-700 hover:border-purple-500 transition-all duration-300">
            <div className="text-4xl mb-4">🌐</div>
            <h3 className="text-xl font-bold text-white mb-2">3D Network Graphs</h3>
            <p className="text-gray-400">
              Visualize complex governance networks in stunning 3D with WebGL and Three.js
            </p>
          </div>

          <div className="p-6 bg-gray-800/50 backdrop-blur-lg rounded-lg border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">Real-time Analytics</h3>
            <p className="text-gray-400">
              Live price charts, heatmaps, and comprehensive reports updated via WebSocket
            </p>
          </div>

          <div className="p-6 bg-gray-800/50 backdrop-blur-lg rounded-lg border border-gray-700 hover:border-pink-500 transition-all duration-300">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-white mb-2">Agent-Based Simulation</h3>
            <p className="text-gray-400">
              Watch autonomous agents interact, vote, and shape the future of your DAO
            </p>
          </div>
        </div>

        <footer className="mt-16 text-gray-500 text-sm">
          <p>Built with vision by incredible technologists and artists</p>
        </footer>
      </main>
    </div>
  );
}
