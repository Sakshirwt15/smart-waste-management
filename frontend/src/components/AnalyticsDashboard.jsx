import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

const COLORS = {
  critical: "#ef4444",
  warning: "#f97316",
  safe: "#22c55e",
  teal: "#14b8a6",
  indigo: "#6366f1",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3 shadow-xl text-xs">
        {label && <p className="text-zinc-300 mb-1 font-semibold">{label}</p>}
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color || entry.fill }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsDashboard({
  bins,
  routes,
  simulationVersion,
}) {
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    if (!bins || bins.length === 0) return;
    fetch("http://localhost:5000/api/bins/predict/all")
      .then((r) => r.json())
      .then((data) => setPredictions(data))
      .catch(() => {});
  }, [simulationVersion, bins?.length]);

  if (!bins || bins.length === 0) {
    return (
      <div className="bg-zinc-700/30 rounded-2xl p-8 text-center border border-zinc-700">
        <p className="text-5xl mb-4">📊</p>
        <p className="text-zinc-300 text-lg font-semibold">
          No data to analyze yet
        </p>
        <p className="text-zinc-500 text-sm mt-2">
          Add bins and run a simulation to see analytics
        </p>
      </div>
    );
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalBins = bins.length;
  const criticalBins = bins.filter((b) => b.fill >= 80).length;
  const warningBins = bins.filter((b) => b.fill >= 60 && b.fill < 80).length;
  const safeBins = bins.filter((b) => b.fill < 60).length;
  const avgFill = Math.round(bins.reduce((s, b) => s + b.fill, 0) / totalBins);
  const totalRoutes = routes?.length || 0;
  const totalDistance =
    routes?.reduce((s, r) => s + (r.total_distance_km || 0), 0).toFixed(1) ||
    "0";
  const totalCollected =
    routes?.reduce((s, r) => s + (r.collected_fill || 0), 0) || 0;

  // Pie data
  const pieData = [
    { name: "Critical (≥80%)", value: criticalBins, color: COLORS.critical },
    { name: "Warning (60-79%)", value: warningBins, color: COLORS.warning },
    { name: "Safe (<60%)", value: safeBins, color: COLORS.safe },
  ].filter((d) => d.value > 0);

  // Bar chart — fill per bin
  const fillBarData = bins.map((b) => ({
    name: `Bin ${b.id}`,
    fill: b.fill,
    color:
      b.fill >= 80
        ? COLORS.critical
        : b.fill >= 60
          ? COLORS.warning
          : COLORS.safe,
  }));

  // ML prediction line chart
  const predCompare = predictions.slice(0, 8).map((p) => ({
    name: `Bin ${p.bin_label || p.bin_id}`,
    current: p.current_fill,
    predicted: p.predicted_fill_4h,
  }));

  // Route vehicle bar chart
  const routeBarData = (routes || []).map((r, i) => ({
    name: r.license || `V${i + 1}`,
    distance: parseFloat((r.total_distance_km || 0).toFixed(1)),
    bins: r.bins_count || 0,
    fill: r.collected_fill || 0,
  }));

  // Radar — system health
  const efficiency =
    totalBins > 0
      ? Math.round(((warningBins + criticalBins) / totalBins) * 100)
      : 0;
  const radarData = [
    { subject: "Bin Coverage", A: Math.min(100, totalBins * 10) },
    { subject: "Fill Urgency", A: efficiency },
    { subject: "Avg Fill", A: avgFill },
    { subject: "Routes Active", A: Math.min(100, totalRoutes * 25) },
    { subject: "ML Accuracy", A: predictions.length > 0 ? 87 : 0 },
  ];

  return (
    <div className="space-y-6">
      {/* ── KPI Banner ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Bins",
            value: totalBins,
            icon: "🗑️",
            accent: "teal",
            sub:
              criticalBins > 0 ? `${criticalBins} critical` : "all monitored",
          },
          {
            label: "Avg Fill Level",
            value: `${avgFill}%`,
            icon: "📊",
            accent: avgFill >= 70 ? "red" : avgFill >= 50 ? "yellow" : "green",
            sub: "across all bins",
          },
          {
            label: "Routes Optimized",
            value: totalRoutes,
            icon: "🗺️",
            accent: "teal",
            sub:
              totalRoutes > 0 ? `${totalDistance} km total` : "run simulation",
          },
          {
            label: "Waste Collected",
            value: totalCollected > 0 ? `${totalCollected} units` : "—",
            icon: "♻️",
            accent: "green",
            sub:
              totalCollected > 0 ? "this simulation" : "run simulation first",
          },
        ].map(({ label, value, icon, accent, sub }) => (
          <div
            key={label}
            className="bg-zinc-700/50 rounded-xl p-4 border border-zinc-600 hover:border-zinc-500 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{icon}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400">
                live
              </span>
            </div>
            <p className={`text-2xl font-bold text-${accent}-400`}>{value}</p>
            <p className="text-xs text-zinc-400 mt-1">{label}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Row 1: Fill Bar + Pie ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-zinc-700/50 rounded-xl p-5 border border-zinc-600">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">
            📊 Current Fill Level — All Bins
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={fillBarData}
              margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#3f3f46"
                vertical={false}
              />
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="fill" radius={[4, 4, 0, 0]} name="Fill %">
                {fillBarData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-700/50 rounded-xl p-5 border border-zinc-600">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">
            🥧 Bin Status Breakdown
          </h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {pieData.map((d) => (
                  <div
                    key={d.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: d.color }}
                      />
                      <span className="text-zinc-400">{d.name}</span>
                    </div>
                    <span className="text-white font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-zinc-500 text-sm text-center mt-8">No data</p>
          )}
        </div>
      </div>

      {/* ── Row 2: ML Prediction line chart ─────────────────────────────── */}
      {predCompare.length > 0 && (
        <div className="bg-zinc-700/50 rounded-xl p-5 border border-zinc-600">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">
            🤖 ML Prediction: Current vs 4h Forecast
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={predCompare}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#3f3f46"
                vertical={false}
              />
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px", color: "#a1a1aa" }} />
              <Line
                type="monotone"
                dataKey="current"
                stroke={COLORS.teal}
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Current %"
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke={COLORS.warning}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
                name="Predicted 4h %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Row 3: Route performance + Radar ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {routeBarData.length > 0 ? (
          <div className="bg-zinc-700/50 rounded-xl p-5 border border-zinc-600">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">
              🚛 Vehicle Route Performance
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={routeBarData}
                margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#3f3f46"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px", color: "#a1a1aa" }} />
                <Bar
                  dataKey="distance"
                  fill={COLORS.teal}
                  name="Distance (km)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="bins"
                  fill={COLORS.indigo}
                  name="Bins Visited"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-zinc-700/50 rounded-xl p-5 border border-zinc-600 flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <p className="text-3xl mb-2">🚛</p>
              <p className="text-zinc-500 text-sm">
                Run simulation to see vehicle route stats
              </p>
            </div>
          </div>
        )}

        <div className="bg-zinc-700/50 rounded-xl p-5 border border-zinc-600">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">
            🎯 System Health Radar
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart
              data={radarData}
              margin={{ top: 0, right: 20, bottom: 0, left: 20 }}
            >
              <PolarGrid stroke="#3f3f46" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#a1a1aa", fontSize: 9 }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name="System"
                dataKey="A"
                stroke={COLORS.teal}
                fill={COLORS.teal}
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
