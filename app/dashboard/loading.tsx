export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-gray-800 rounded animate-pulse" />
          <div className="h-10 w-24 bg-gray-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Stats */}
        <div className="space-y-4">
          {/* Stats Cards Skeleton */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
              <div className="h-4 w-24 bg-gray-700 rounded mb-3" />
              <div className="h-8 w-32 bg-gray-700 rounded" />
            </div>
          ))}
        </div>

        {/* Center Column - Main Visualization */}
        <div className="lg:col-span-2">
          {/* 3D Network Placeholder */}
          <div className="bg-gray-800 rounded-lg h-[500px] flex items-center justify-center animate-pulse">
            <div className="text-center">
              <div className="relative mx-auto w-20 h-20 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-gray-700" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
              </div>
              <p className="text-gray-500 text-sm">Loading 3D visualization...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Charts */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart Skeletons */}
        {[1, 2].map((i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 w-32 bg-gray-700 rounded mb-4" />
            <div className="h-48 bg-gray-700 rounded" />
          </div>
        ))}
      </div>

      {/* Screen Reader Announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        Loading dashboard, please wait...
      </div>
    </div>
  );
}
