import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const socket = io("http://localhost:5000");

const RouteDetails = ({ routes = [], onRoutesUpdated }) => {
  const [liveRoutes, setLiveRoutes] = useState(routes);
  const [isRerouting, setIsRerouting] = useState(false);

  // Sync with parent routes prop
  useEffect(() => {
    setLiveRoutes(routes);
  }, [routes]);

  // Listen for live re-optimized routes from backend
  useEffect(() => {
    socket.on("routes_updated", (data) => {
      if (data.triggered_by === "citizen_report") {
        setIsRerouting(false);
        setLiveRoutes(data.routes);

        // Notify parent if needed
        if (onRoutesUpdated) onRoutesUpdated(data.routes);

        toast.success("🗺️ Routes re-optimized based on citizen report!", {
          duration: 4000,
          style: {
            background: "#F0FDF4",
            color: "#166534",
            border: "1px solid #86EFAC",
          },
        });
      }
    });

    // Show spinner while rerouting
    socket.on("citizen_report", () => {
      setIsRerouting(true);
    });

    return () => {
      socket.off("routes_updated");
      socket.off("citizen_report");
    };
  }, []);

  // Helper: fill color
  const fillColor = (fill) => {
    if (fill >= 90) return "bg-red-100 text-red-700";
    if (fill >= 75) return "bg-orange-100 text-orange-700";
    if (fill >= 60) return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  // No routes state
  if (!liveRoutes.length) {
    return (
      <div className="p-6">
        <div className="bg-gray-700/50 rounded-lg p-6 text-center">
          <p className="text-gray-400">No routes available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Re-routing banner */}
      {isRerouting && (
        <div
          className="mb-4 px-4 py-3 bg-blue-500/20 border border-blue-400/30 
                        rounded-lg flex items-center gap-3 text-blue-300 text-sm"
        >
          <span className="animate-spin text-lg">⏳</span>
          <span>Re-optimizing routes based on citizen report...</span>
        </div>
      )}

      <div className="space-y-4">
        {liveRoutes.map((route, index) => {
          // Support both old and new field names
          const license =
            route.license || route.vehicle_license || "Unknown Vehicle";
          const distanceKm =
            route.total_distance_km ?? route.total_distance ?? 0;
          const timeMin = route.total_time_min ?? route.estimated_time_min ?? 0;
          const collectedFill = route.collected_fill ?? route.load_percent ?? 0;
          const waypoints = route.waypoints || [];
          const routeBinIds = route.route_bin_ids || route.route || [];
          const binsCount = route.bins_count ?? routeBinIds.length ?? 0;
          const skipped = route.skipped || [];

          // Highest fill bin in this route
          const maxFill = waypoints.length
            ? Math.max(
                ...waypoints
                  .filter((w) => w.type === "bin")
                  .map((w) => w.fill || 0),
              )
            : 0;

          return (
            <div
              key={index}
              className="bg-gray-700/50 rounded-lg p-6 transition-all 
                         duration-200 hover:bg-gray-700/70"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-teal-400">
                  Route {index + 1}
                </h3>
                <div className="flex items-center gap-2">
                  {/* Priority badge */}
                  {maxFill >= 90 && (
                    <span
                      className="px-2 py-0.5 bg-red-500/20 text-red-400 
                                     rounded-full text-xs font-medium"
                    >
                      🔴 Critical bins
                    </span>
                  )}
                  {maxFill >= 75 && maxFill < 90 && (
                    <span
                      className="px-2 py-0.5 bg-orange-500/20 text-orange-400 
                                     rounded-full text-xs font-medium"
                    >
                      🟠 High priority
                    </span>
                  )}
                  <span
                    className="px-3 py-1 bg-teal-500/20 text-teal-400 
                                   rounded-full text-sm"
                  >
                    {license}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">🛣️ Distance:</span>
                    <span className="text-white font-medium">
                      {Number(distanceKm).toFixed(2)} km
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">⏱️ Est. Time:</span>
                    <span className="text-white font-medium">
                      {Number(timeMin).toFixed(1)} min
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">📦 Load:</span>
                    <span className="text-white font-medium">
                      {Number(collectedFill).toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">📍 Bins:</span>
                    <span className="text-white font-medium">{binsCount}</span>
                  </div>
                </div>
              </div>

              {/* Route order — waypoints with fill levels */}
              {waypoints.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    🗺️ Optimized Route Order:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {waypoints.map((wp, wpIdx) => (
                      <div key={wpIdx} className="flex items-center gap-1">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            wp.type === "start"
                              ? "bg-blue-500/20 text-blue-300"
                              : fillColor(wp.fill || 0)
                          }`}
                        >
                          {wp.type === "start"
                            ? "🚛 Start"
                            : `🗑️ ${wp.fill || 0}%`}
                        </span>
                        {/* Arrow between stops */}
                        {wpIdx < waypoints.length - 1 && (
                          <span className="text-gray-500 text-xs">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback: old bin sequence (if no waypoints) */}
              {waypoints.length === 0 && routeBinIds.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Bin Sequence:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {routeBinIds.map((binId) => (
                      <span
                        key={binId}
                        className="px-2 py-1 bg-gray-600 text-gray-200 
                                   rounded text-sm"
                      >
                        Bin {binId}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped bins */}
              {skipped.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-red-400 mb-2">
                    ⚠️ Skipped Bins:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {skipped.map((binId) => (
                      <span
                        key={binId}
                        className="px-2 py-1 bg-red-500/20 text-red-300 
                                   rounded text-sm"
                      >
                        Bin {binId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RouteDetails;
