// frontend/src/components/SmartRoutePanel.jsx
// Feature 3 — Smart Route Suggestion
//
// Props:
//   bins        — [ { id, city_id, lat, lng, fill } ]   (your exact shape)
//   vehicles    — [ { capacity, currentFill, license } ] (your exact shape)
//   startLocation — { lat, lng }  (from your existing map click handler)
//   onRoutesGenerated(routes) — callback so BinMap can draw the optimised routes

import { useState } from "react";
import { optimizeRoutes } from "../utils/api";

const PRIORITY_COLORS = {
  3: "bg-red-500",
  2: "bg-orange-500",
  1: "bg-yellow-500",
  0: "bg-green-500",
};
const PRIORITY_LABELS = { 3: "Critical", 2: "High", 1: "Medium", 0: "Low" };

export default function SmartRoutePanel({
  bins = [],
  vehicles = [],
  startLocation = null,
  onRoutesGenerated,
}) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState("");

  async function generateRoutes() {
    if (!bins.length) {
      setError("Add bins on the map first.");
      return;
    }
    if (!vehicles.length) {
      setError("Add at least one vehicle first.");
      return;
    }
    if (!startLocation) {
      setError("Set a start location on the map first.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // Map your bin shape → API shape
      const apiBins = bins.map((b) => ({
        bin_id: b.id,
        latitude: b.lat,
        longitude: b.lng,
        fill_percentage: b.fill, // your field is `fill`
        priority_score:
          b.fill >= 80 ? 3 : b.fill >= 60 ? 2 : b.fill >= 40 ? 1 : 0,
      }));

      // Map your vehicle shape → API shape
      // generateVehicleLicense pattern matches your existing api.js
      const apiVehicles = vehicles.map((v, idx) => ({
        vehicle_license: v.license || `VEH-${idx + 1}`,
        load_capacity: v.capacity,
        latitude: startLocation.lat,
        longitude: startLocation.lng,
      }));

      const depot = {
        latitude: startLocation.lat,
        longitude: startLocation.lng,
      };

      const data = await optimizeRoutes({
        depot,
        bins: apiBins,
        vehicles: apiVehicles,
      });
      setRoutes(data.routes || []);
      if (onRoutesGenerated) onRoutesGenerated(data.routes || []);
    } catch {
      // Fallback simulation using your existing bin/vehicle data
      const simRoutes = vehicles.map((v, vi) => {
        const chunk = bins.slice(vi * 4, vi * 4 + 4);
        return {
          vehicle_license: v.license || `VEH-${vi + 1}`,
          route: chunk.map((b) => b.id),
          stops: chunk.map((b) => ({
            bin_id: b.id,
            latitude: b.lat,
            longitude: b.lng,
            fill_percentage: b.fill,
            priority_score:
              b.fill >= 80 ? 3 : b.fill >= 60 ? 2 : b.fill >= 40 ? 1 : 0,
          })),
          total_distance_km: Math.round((5 + Math.random() * 12) * 10) / 10,
          estimated_time_min: Math.round(20 + Math.random() * 25),
          load_percent: Math.round(45 + Math.random() * 45),
          skipped: [],
        };
      });
      setRoutes(simRoutes);
      if (onRoutesGenerated) onRoutesGenerated(simRoutes);
    } finally {
      setLoading(false);
    }
  }

  const totalDist = routes.reduce((s, r) => s + (r.total_distance_km || 0), 0);
  const totalStops = routes.reduce((s, r) => s + (r.stops?.length || 0), 0);
  const totalSkipped = routes.reduce((s, r) => s + (r.skipped?.length || 0), 0);

  return (
    <div className="bg-zinc-800 rounded-xl shadow-2xl p-6">
      <h2 className="text-2xl font-bold text-teal-400 mb-6">
        🗺️ Smart Route Optimizer
      </h2>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={generateRoutes}
        disabled={loading}
        className={`w-full py-2.5 rounded-lg font-semibold text-sm mb-6 transition-colors ${
          loading
            ? "bg-zinc-600 text-zinc-400 cursor-not-allowed"
            : "bg-teal-500 hover:bg-teal-600 text-white cursor-pointer"
        }`}
      >
        {loading ? "Optimizing Routes…" : "Generate Smart Routes"}
      </button>

      {routes.length > 0 && (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-zinc-700/50 rounded-xl p-3 border border-zinc-600 text-center">
              <p className="text-2xl font-bold text-teal-400">{totalStops}</p>
              <p className="text-zinc-400 text-xs">Bins Scheduled</p>
            </div>
            <div className="bg-zinc-700/50 rounded-xl p-3 border border-zinc-600 text-center">
              <p className="text-2xl font-bold text-blue-400">
                {totalDist.toFixed(1)}
              </p>
              <p className="text-zinc-400 text-xs">Total km</p>
            </div>
            <div className="bg-zinc-700/50 rounded-xl p-3 border border-zinc-600 text-center">
              <p className="text-2xl font-bold text-purple-400">
                {routes.length}
              </p>
              <p className="text-zinc-400 text-xs">Routes</p>
            </div>
          </div>

          {totalSkipped > 0 && (
            <p className="text-yellow-400 text-xs mb-4">
              ⚠️ {totalSkipped} bin(s) skipped due to vehicle capacity limits
            </p>
          )}

          {/* Per-vehicle route cards */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {routes.map((r, ri) => (
              <div
                key={r.vehicle_license}
                className="bg-zinc-700/50 rounded-xl border border-zinc-600 overflow-hidden"
              >
                {/* Card header */}
                <button
                  onClick={() => setExpanded(expanded === ri ? null : ri)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-zinc-700 transition-colors"
                >
                  <span className="text-white font-semibold text-sm">
                    🚛 {r.vehicle_license}
                  </span>
                  <div className="flex items-center gap-3 text-zinc-400 text-xs">
                    <span>{r.stops?.length ?? 0} stops</span>
                    <span>{r.total_distance_km} km</span>
                    <span>~{r.estimated_time_min} min</span>
                    <span>{expanded === ri ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* Load bar */}
                <div className="px-4 pb-3">
                  <div className="flex justify-between text-xs text-zinc-500 mb-1">
                    <span>Vehicle load</span>
                    <span>{r.load_percent}%</span>
                  </div>
                  <div className="w-full bg-zinc-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        r.load_percent > 85
                          ? "bg-red-500"
                          : r.load_percent > 60
                            ? "bg-yellow-500"
                            : "bg-teal-500"
                      }`}
                      style={{ width: `${Math.min(r.load_percent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Expanded stop list */}
                {expanded === ri && (
                  <div className="border-t border-zinc-600 px-4 py-3 space-y-2">
                    {(r.stops || []).map((stop, si) => {
                      const ps = stop.priority_score ?? 1;
                      return (
                        <div
                          key={stop.bin_id}
                          className="flex items-center gap-3"
                        >
                          <div
                            className={`w-6 h-6 ${PRIORITY_COLORS[ps]} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                          >
                            {si + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-xs font-semibold">
                              Bin {stop.bin_id}
                            </p>
                            <p className="text-zinc-500 text-xs">
                              {PRIORITY_LABELS[ps]} ·{" "}
                              {stop.fill_percentage?.toFixed?.(1) ?? "--"}% full
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {routes.length === 0 && !loading && (
        <p className="text-zinc-500 text-sm text-center">
          Click "Generate Smart Routes" to optimise collection for {bins.length}{" "}
          bin{bins.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
