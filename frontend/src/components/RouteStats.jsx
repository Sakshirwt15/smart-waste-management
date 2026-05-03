export default function RouteStats({ route }) {
  if (!route) return null;

  const {
    license,
    bins_count,
    total_distance_km,
    total_time_min,
    collected_fill,
    waypoints = [],
  } = route;

  // Find highest priority bin in route
  const maxFill = waypoints.length
    ? Math.max(...waypoints.filter((w) => w.type === "bin").map((w) => w.fill))
    : 0;

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 
                    shadow-sm p-4 mb-3"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚛</span>
          <span className="font-semibold text-gray-800">{license}</span>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            maxFill >= 90
              ? "bg-red-100 text-red-700"
              : maxFill >= 75
                ? "bg-orange-100 text-orange-700"
                : "bg-green-100 text-green-700"
          }`}
        >
          {maxFill >= 90
            ? "🔴 Critical bins"
            : maxFill >= 75
              ? "🟠 High priority"
              : "🟢 Normal"}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <div className="text-xs text-blue-500 mb-0.5">📍 Bins</div>
          <div className="font-bold text-blue-700 text-lg">{bins_count}</div>
        </div>

        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="text-xs text-green-500 mb-0.5">📦 Load</div>
          <div className="font-bold text-green-700 text-lg">
            {collected_fill}%
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-2 text-center">
          <div className="text-xs text-purple-500 mb-0.5">🛣️ Distance</div>
          <div className="font-bold text-purple-700 text-lg">
            {total_distance_km} km
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-2 text-center">
          <div className="text-xs text-orange-500 mb-0.5">⏱️ Est. Time</div>
          <div className="font-bold text-orange-700 text-lg">
            {total_time_min} min
          </div>
        </div>
      </div>

      {/* Waypoint order — shows route sequence */}
      <div>
        <p className="text-xs text-gray-400 mb-1.5">Route order:</p>
        <div className="flex flex-wrap gap-1">
          {waypoints.map((wp, idx) => (
            <span
              key={idx}
              className={`text-xs px-2 py-0.5 rounded-full ${
                wp.type === "start"
                  ? "bg-blue-100 text-blue-700"
                  : wp.fill >= 90
                    ? "bg-red-100 text-red-700"
                    : wp.fill >= 75
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-600"
              }`}
            >
              {wp.type === "start" ? "🚛 Start" : `🗑️ ${wp.fill}%`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
