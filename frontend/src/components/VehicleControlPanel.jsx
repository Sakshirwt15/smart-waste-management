import { useState } from "react";

const VehicleControlPanel = ({ onSetStartLocation, onAddVehicles }) => {
  const [vehicleCount, setVehicleCount] = useState(1);
  const [capacities, setCapacities] = useState("1000");
  const [isSettingStart, setIsSettingStart] = useState(false);
  const [startLocation, setStartLocation] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleStartLocationClick = () => {
    setIsSettingStart(true);
    setError(null);
    onSetStartLocation((location) => {
      setStartLocation(location);
      setIsSettingStart(false);
    });
  };

  const handleAdd = () => {
    setError(null);
    setSuccess(null);

    // FIX 1: parse count as integer explicitly
    const count = parseInt(vehicleCount, 10);

    if (!count || count < 1) {
      setError("Enter at least 1 vehicle.");
      return;
    }

    // FIX 2: handle capacities — if only one value given, apply to all vehicles
    const rawCaps = capacities
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number);

    let finalCaps;
    if (rawCaps.length === 1) {
      // Single capacity — apply same to all vehicles
      finalCaps = Array(count).fill(rawCaps[0]);
    } else if (rawCaps.length === count) {
      finalCaps = rawCaps;
    } else {
      setError(
        `Enter either 1 capacity (applied to all) or exactly ${count} comma-separated capacities.`,
      );
      return;
    }

    if (finalCaps.some((c) => isNaN(c) || c <= 0)) {
      setError("All capacities must be positive numbers.");
      return;
    }

    // FIX 3: startLocation check with clear message
    if (!startLocation) {
      setError("Please click 'Set Start Location' then click on the map.");
      return;
    }

    const vehicles = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      capacity: finalCaps[i],
      startLocation,
    }));

    onAddVehicles(vehicles);
    setSuccess(`✅ ${count} vehicle(s) added successfully!`);

    // Clear success after 3s
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="p-6">
      <div className="bg-zinc-700/50 rounded-lg p-6 space-y-4">
        {/* Vehicle Count */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Number of Vehicles
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={vehicleCount}
            onChange={(e) => {
              setVehicleCount(parseInt(e.target.value, 10) || 1);
              setError(null);
            }}
            className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg
                       text-zinc-100 placeholder-zinc-400 focus:outline-none
                       focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
          />
        </div>

        {/* Capacities */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Vehicle Capacities (comma-separated)
          </label>
          <input
            type="text"
            value={capacities}
            onChange={(e) => {
              setCapacities(e.target.value);
              setError(null);
            }}
            className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg
                       text-zinc-100 placeholder-zinc-400 focus:outline-none
                       focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
            placeholder="e.g., 1000  or  1000, 1500, 2000"
          />
          <p className="text-xs text-zinc-500 mt-1">
            One value = same for all vehicles. Multiple = one per vehicle.
          </p>
        </div>

        {/* Set Start Location Button */}
        <button
          onClick={handleStartLocationClick}
          className={`w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
            isSettingStart
              ? "bg-yellow-500 text-zinc-900 shadow-lg shadow-yellow-500/30 animate-pulse"
              : startLocation
                ? "bg-green-600/30 text-green-300 border border-green-500/50 hover:bg-green-600/50"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 border border-zinc-600"
          }`}
        >
          {isSettingStart
            ? "📍 Click on Map..."
            : startLocation
              ? "✅ Start Location Set (click to change)"
              : "📍 Set Start Location"}
        </button>

        {/* Start Location Display */}
        {startLocation && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-300">
              🚛 Start: {startLocation.lat.toFixed(5)},{" "}
              {startLocation.lng.toFixed(5)}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400">⚠️ {error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
            <p className="text-sm text-green-400">{success}</p>
          </div>
        )}

        {/* Add Vehicles Button */}
        <button
          onClick={handleAdd}
          className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600
                     text-white font-semibold rounded-lg shadow-lg
                     hover:shadow-teal-500/30 transition-all duration-200 hover:scale-105"
        >
          Add Vehicles
        </button>
      </div>
    </div>
  );
};

export default VehicleControlPanel;
