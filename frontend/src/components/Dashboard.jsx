import { useState } from "react";
import MLPredictionPanel from "./MLPredictionPanel";
import RouteStats from "./RouteStats";
import AnalyticsDashboard from "./AnalyticsDashboard";

export default function Dashboard({
  bins,
  vehicles,
  startLocation,
  onRoutesGenerated,
  simulationVersion,
  routes, // ← received from BinMapPlacement
}) {
  const [activeTab, setActiveTab] = useState("analytics");

  const tabs = [
    { id: "analytics", label: "📊 Analytics", desc: "Charts & insights" },
    {
      id: "predictions",
      label: "🤖 AI Predictions",
      desc: "ML fill forecasts",
    },
    { id: "routes", label: "🗺️ Route Stats", desc: "Optimization results" },
  ];

  return (
    <div className="bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden border border-zinc-700">
      <div className="border-b border-zinc-700 px-6 pt-5">
        <div className="flex gap-1 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-t-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-zinc-700 text-teal-400 border-b-2 border-teal-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="text-xs text-zinc-500 hidden md:inline">
                  {tab.desc}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === "analytics" && (
          <AnalyticsDashboard
            bins={bins}
            routes={routes}
            simulationVersion={simulationVersion}
          />
        )}
        {activeTab === "predictions" && (
          <MLPredictionPanel
            bins={bins}
            simulationVersion={simulationVersion}
          />
        )}
        {activeTab === "routes" && (
          <RouteStats
            bins={bins}
            vehicles={vehicles}
            startLocation={startLocation}
            onRoutesGenerated={onRoutesGenerated}
          />
        )}
      </div>
    </div>
  );
}
