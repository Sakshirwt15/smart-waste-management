import { useState, useRef, useEffect } from "react";
import BinMap from "../components/BinMap";
import BinControlPanel from "../components/BinControlPanel";
import axios from "axios";
import VehicleControlPanel from "../components/VehicleControlPanel";
import Dashboard from "../components/Dashboard";
import RouteDetails from "../components/RouteDetails";
import LimitationsModal from "../components/LimitationsModal";
import toast, { Toaster } from "react-hot-toast";

const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};
const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const BinPlacement = () => {
  const [startLocationCallback, setStartLocationCallback] = useState(null);
  const [vehicles, setVehiclesState] = useState(() =>
    load("swms_vehicles", []),
  );
  const [startLocation, setStartLocationState] = useState(() =>
    load("swms_startLocation", null),
  );
  const [bins, setBinsState] = useState(() => load("swms_bins", []));
  const [routes, setRoutesState] = useState(() => load("swms_routes", []));
  const [cityCenter, setCityCenter] = useState(() =>
    load("swms_cityCenter", [30.3165, 78.0322]),
  );
  const [activePanel, setActivePanel] = useState("bins");
  const [isSimulating, setIsSimulating] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  // ── NEW: simulation key to force MLPredictionPanel refetch ──────────────
  const [simulationVersion, setSimulationVersion] = useState(0);

  const mapRef = useRef();

  const setBins = (val) => {
    const next = typeof val === "function" ? val(bins) : val;
    setBinsState(next);
    save("swms_bins", next);
  };
  const setVehicles = (val) => {
    const next = typeof val === "function" ? val(vehicles) : val;
    setVehiclesState(next);
    save("swms_vehicles", next);
  };
  const setStartLocation = (val) => {
    setStartLocationState(val);
    save("swms_startLocation", val);
  };
  const setRoutes = (val) => {
    const next = typeof val === "function" ? val(routes) : val;
    setRoutesState(next);
    save("swms_routes", next);
  };

  useEffect(() => {
    save("swms_cityCenter", cityCenter);
  }, [cityCenter]);
  useEffect(() => {
    setTimeout(() => {
      if (mapRef.current) mapRef.current.setView(cityCenter, 13);
    }, 300);
  }, []);

  const handleSetStartLocation = (callback) =>
    setStartLocationCallback(() => callback);
  const handleMapClick = (location) => {
    if (startLocationCallback) {
      startLocationCallback(location);
      setStartLocation(location);
      setStartLocationCallback(null);
    }
  };

  const handleSearchCity = async (cityName) => {
    try {
      const res = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: { q: cityName, format: "json", limit: 1 },
        },
      );
      if (res.data.length > 0) {
        const { lat, lon } = res.data[0];
        const newCenter = [parseFloat(lat), parseFloat(lon)];
        setCityCenter(newCenter);
        setTimeout(() => {
          if (mapRef.current) mapRef.current.setView(newCenter, 13);
        }, 100);
      } else {
        alert("City not found.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch city location.");
    }
  };

  const handleAddBins = (num, fillMode) => {
    const bounds = {
      minLat: cityCenter[0] - 0.02,
      maxLat: cityCenter[0] + 0.02,
      minLng: cityCenter[1] - 0.02,
      maxLng: cityCenter[1] + 0.02,
    };
    const newBins = Array.from({ length: num }, (_, i) => ({
      city_id: "city1",
      id: bins.length + i + 1,
      lat: parseFloat(
        (
          Math.random() * (bounds.maxLat - bounds.minLat) +
          bounds.minLat
        ).toFixed(6),
      ),
      lng: parseFloat(
        (
          Math.random() * (bounds.maxLng - bounds.minLng) +
          bounds.minLng
        ).toFixed(6),
      ),
      fill: fillMode === "auto" ? Math.floor(Math.random() * 101) : 0,
    }));
    setBins([...bins, ...newBins]);
  };

  const updateBinFill = (id, newFill) => {
    setBins((prev) =>
      prev.map((bin) => (bin.id === id ? { ...bin, fill: newFill } : bin)),
    );
  };

  const handleClearAll = () => {
    setBins([]);
    setVehicles([]);
    setStartLocation(null);
    setRoutes([]);
    toast("🗑️ All data cleared", { icon: "🧹" });
  };

  // ── FIX: shared helper to save bins+vehicles to backend ─────────────────
  const saveToBackend = async (binsToSave, vehiclesToSave) => {
    const formattedBins = binsToSave.map((bin) => ({
      bin_id: String(bin.id),
      city_id: "city1",
      latitude: bin.lat,
      longitude: bin.lng,
      capacity: 100,
      fill_percentage: bin.fill,
    }));
    const formattedVehicles = vehiclesToSave.map((vehicle, index) => ({
      city_id: "city1",
      vehicle_license: `VEH-${index + 1}`,
      load_capacity: vehicle.capacity,
      latitude: startLocation.lat,
      longitude: startLocation.lng,
      current_load: 0,
      assigned_bins: [],
      status: "available",
    }));

    const response = await fetch("http://localhost:5000/api/optimize/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bins: formattedBins,
        vehicles: formattedVehicles,
        start_location: {
          latitude: startLocation.lat,
          longitude: startLocation.lng,
        },
      }),
    });
    if (!response.ok) throw new Error("Failed to save");
    return formattedBins;
  };

  // ── FIX: retrain ML after saving new bins ────────────────────────────────
  const retrainML = async () => {
    const trainRes = await fetch("http://localhost:5000/api/train/all", {
      method: "POST",
    });
    if (!trainRes.ok) throw new Error("Training failed");
  };

  // ── 💾 Add Data ──────────────────────────────────────────────────────────
  const handleSimulationClick = async () => {
    if (bins.length === 0) {
      toast.error("Please add bins first!");
      return;
    }
    if (vehicles.length === 0) {
      toast.error("Please add vehicles first!");
      return;
    }
    if (!startLocation) {
      toast.error("Please set start location first!");
      return;
    }

    try {
      await saveToBackend(bins, vehicles);
      toast.success(
        `✅ ${bins.length} bins & ${vehicles.length} vehicles saved!`,
      );

      // ── FIX: retrain with new bins ──────────────────────────────────────
      toast("🤖 Training ML models with new bins...", {
        icon: "⏳",
        duration: 3000,
      });
      await retrainML();
      toast.success("🤖 ML models retrained!");

      await fetch("http://localhost:5000/api/alerts/train", { method: "POST" });

      // ── FIX: bump version so MLPredictionPanel refetches ────────────────
      setSimulationVersion((v) => v + 1);
    } catch {
      toast.error("Failed to save data. Is backend running?");
    }
  };

  // ── ▶ Run Simulation ─────────────────────────────────────────────────────
  const fetchOptimizedRoutes = async () => {
    if (!startLocation) {
      toast.error("Please set start location first");
      return;
    }
    if (bins.length === 0) {
      toast.error("Please add bins first");
      return;
    }
    if (vehicles.length === 0) {
      toast.error("Please add vehicles first");
      return;
    }

    setIsSimulating(true);
    try {
      // ── FIX: save fresh bins to DB ───────────────────────────────────────
      await saveToBackend(bins, vehicles);
      toast("📦 Data saved! Retraining ML...", { icon: "⏳", duration: 2000 });

      // ── FIX: retrain before predicting & routing ─────────────────────────
      await retrainML();
      toast.success("🤖 ML retrained with current bins!");

      // ── FIX: bump version so MLPredictionPanel refetches fresh data ──────
      setSimulationVersion((v) => v + 1);

      toast("🔁 Optimizing routes...", { icon: "⏳", duration: 2000 });
      const routeRes = await fetch(
        "http://localhost:5000/api/test/build-graph",
      );
      if (!routeRes.ok) throw new Error("Optimization failed");

      const data = await routeRes.json();
      if (data?.routes && data.routes.length > 0) {
        setRoutes(data.routes);
        toast.success(`✅ ${data.routes.length} routes optimized!`);
      } else {
        toast.error("No routes returned. Ensure bins have fill ≥ 60%.", {
          duration: 5000,
        });
      }
    } catch {
      toast.error("Optimization failed. Check backend.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleMLRoutesGenerated = (mlRoutes) => {
    toast.success(`Smart routes generated for ${mlRoutes.length} vehicle(s)!`);
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 p-4">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1F2937",
            color: "#fff",
            border: "1px solid #374151",
          },
          success: { iconTheme: { primary: "#10B981", secondary: "#fff" } },
          error: { iconTheme: { primary: "#EF4444", secondary: "#fff" } },
        }}
      />

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Map */}
          <div className="lg:w-[65%] bg-zinc-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-teal-400">
                Smart Waste Management App
              </h2>
              <div className="flex items-center gap-2">
                {bins.length > 0 && (
                  <button
                    onClick={() => setShowHeatmap((p) => !p)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      showHeatmap
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    }`}
                  >
                    🌡️ {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
                  </button>
                )}
                {(bins.length > 0 || routes.length > 0) && (
                  <button
                    onClick={handleClearAll}
                    className="px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    🗑️ Clear
                  </button>
                )}
              </div>
            </div>

            <BinMap
              center={cityCenter}
              bins={bins}
              mapRef={mapRef}
              startLocation={startLocation}
              onMapClickForStart={startLocationCallback ? handleMapClick : null}
              routes={routes}
              selectedRouteIndex={null}
              showHeatmap={showHeatmap}
            />

            {startLocationCallback && (
              <div className="px-4 py-2 bg-yellow-500/20 border-t border-yellow-500/30 text-yellow-300 text-sm text-center animate-pulse">
                📍 Click anywhere on the map to set vehicle start location
              </div>
            )}
          </div>

          {/* Control Panel */}
          <div className="lg:w-[35%] space-y-6">
            <div className="bg-zinc-800 rounded-xl p-4 shadow-2xl">
              <div className="flex gap-3 justify-center">
                {["bins", "vehicles"].map((panel) => (
                  <button
                    key={panel}
                    onClick={() => setActivePanel(panel)}
                    className={`px-6 py-3 rounded-lg text-lg font-semibold transition-all duration-200 ${
                      activePanel === panel
                        ? "bg-teal-600 text-white shadow-lg shadow-teal-500/30"
                        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    }`}
                  >
                    {panel.charAt(0).toUpperCase() + panel.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-800 rounded-xl shadow-2xl overflow-hidden">
              {activePanel === "bins" ? (
                <BinControlPanel
                  onAddBins={handleAddBins}
                  onSearchCity={handleSearchCity}
                />
              ) : (
                <VehicleControlPanel
                  onSetStartLocation={handleSetStartLocation}
                  onAddVehicles={setVehicles}
                />
              )}
            </div>

            {bins.length > 0 && (
              <div className="bg-zinc-800 rounded-xl p-4 shadow-2xl">
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                  📊 Bin Status
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    {
                      label: "Low",
                      color: "green",
                      count: bins.filter((b) => b.fill < 60).length,
                    },
                    {
                      label: "Medium",
                      color: "yellow",
                      count: bins.filter((b) => b.fill >= 60 && b.fill < 80)
                        .length,
                    },
                    {
                      label: "Critical",
                      color: "red",
                      count: bins.filter((b) => b.fill >= 80).length,
                    },
                  ].map(({ label, color, count }) => (
                    <div
                      key={label}
                      className={`bg-${color}-500/10 rounded-lg p-2`}
                    >
                      <div className={`text-${color}-400 text-lg font-bold`}>
                        {count}
                      </div>
                      <div className="text-xs text-zinc-400">{label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-2 text-center">
                  💾 {bins.length} bins · {vehicles.length} vehicles saved
                  locally
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <button
            onClick={handleSimulationClick}
            className="px-8 py-4 bg-gradient-to-r from-zinc-900 to-zinc-800 border-white border-2 text-white font-semibold rounded-xl shadow-lg hover:shadow-teal-500/30 transition-all duration-200 hover:scale-105"
          >
            💾 Add Data
          </button>
          <button
            onClick={fetchOptimizedRoutes}
            disabled={isSimulating}
            className={`px-8 py-4 bg-gradient-to-r from-zinc-200 to-teal-400 text-zinc-900 font-semibold rounded-xl shadow-lg hover:shadow-zinc-500/30 transition-all duration-200 hover:scale-105 flex items-center gap-2 ${
              isSimulating ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {isSimulating ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Running Simulation...
              </>
            ) : (
              "▶ Run Simulation"
            )}
          </button>
        </div>

        {/* Dashboard — pass simulationVersion so it refetches predictions */}
        <div className="mt-6">
          <Dashboard
            bins={bins}
            updateBinFill={updateBinFill}
            vehicles={vehicles}
            startLocation={startLocation}
            onRoutesGenerated={handleMLRoutesGenerated}
            simulationVersion={simulationVersion}
            routes={routes}
          />
        </div>

        <div className="mt-6">
          <RouteDetails routes={routes} onRoutesUpdated={setRoutes} />
        </div>
      </div>

      <LimitationsModal />
    </div>
  );
};

export default BinPlacement;
