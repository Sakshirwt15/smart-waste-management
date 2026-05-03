import { useEffect, useState } from "react";

export default function MLPredictionPanel({ bins }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchPredictions = () => {
    setLoading(true);
    fetch("http://localhost:5000/api/bins/predict/all")
      .then((r) => r.json())
      .then((data) => {
        setPredictions(data);
        setLoading(false);
        setLastUpdated(new Date().toLocaleTimeString());
      })
      .catch(() => setLoading(false));
  };

  // Fetch on mount
  useEffect(() => {
    fetchPredictions();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchPredictions, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    critical: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      border: "border-red-500/30",
      icon: "🔴",
      label: "Critical",
    },
    warning: {
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      border: "border-orange-500/30",
      icon: "🟠",
      label: "Warning",
    },
    moderate: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/30",
      icon: "🟡",
      label: "Moderate",
    },
    safe: {
      bg: "bg-green-500/20",
      text: "text-green-400",
      border: "border-green-500/30",
      icon: "🟢",
      label: "Safe",
    },
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-teal-400">
            🤖 AI Fill-Level Predictions
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Random Forest model predicts fill 4 hours ahead.
            {lastUpdated && (
              <span className="text-zinc-500 ml-2">Updated: {lastUpdated}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchPredictions}
          disabled={loading}
          className="px-3 py-1.5 bg-teal-500/20 text-teal-400 rounded-lg
                     text-sm hover:bg-teal-500/30 transition-colors
                     disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? <span className="animate-spin">⏳</span> : "🔄"}
          Refresh
        </button>
      </div>

      {/* Summary stats */}
      {predictions.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {["critical", "warning", "moderate", "safe"].map((status) => {
            const count = predictions.filter((p) => p.status === status).length;
            const c = statusConfig[status];
            return (
              <div
                key={status}
                className={`rounded-xl p-3 text-center border ${c.bg} ${c.border}`}
              >
                <div className={`text-2xl font-bold ${c.text}`}>{count}</div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {c.icon} {c.label}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-3">⏳</div>
            <p className="text-zinc-400">Loading AI predictions...</p>
          </div>
        </div>
      )}

      {!loading && predictions.length === 0 && (
        <div className="text-center py-16 bg-zinc-700/30 rounded-xl">
          <p className="text-4xl mb-3">🤖</p>
          <p className="text-zinc-300 font-medium">No predictions yet</p>
          <p className="text-zinc-500 text-sm mt-1">
            Add bins → click <strong>💾 Add Data</strong> → ML trains
            automatically
          </p>
          <button
            onClick={fetchPredictions}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg
                       text-sm hover:bg-teal-700 transition-colors"
          >
            🔄 Try Again
          </button>
        </div>
      )}

      {!loading && predictions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {predictions.map((p) => {
            const c = statusConfig[p.status] || statusConfig.safe;
            return (
              <div
                key={p.bin_id}
                className={`rounded-xl p-4 border ${c.bg} ${c.border}`}
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-white">
                    🗑️ Bin {p.bin_label || p.bin_id}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full 
                                   font-medium ${c.bg} ${c.text} border ${c.border}`}
                  >
                    {c.icon} {c.label}
                  </span>
                </div>

                {/* Current fill */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Current Fill</span>
                    <span className="font-medium text-white">
                      {p.current_fill}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-600 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-teal-500 transition-all"
                      style={{ width: `${p.current_fill}%` }}
                    />
                  </div>
                </div>

                {/* Predicted fill */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Predicted in 4h</span>
                    <span className="font-medium text-white">
                      {p.predicted_fill_4h}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-600 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        p.predicted_fill_4h >= 80
                          ? "bg-red-500"
                          : p.predicted_fill_4h >= 60
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${p.predicted_fill_4h}%` }}
                    />
                  </div>
                </div>

                {/* Increase indicator */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-zinc-600" />
                  <span className="text-xs text-zinc-400">
                    📈 +
                    {Math.max(0, p.predicted_fill_4h - p.current_fill).toFixed(
                      1,
                    )}
                    % increase expected
                  </span>
                  <div className="flex-1 h-px bg-zinc-600" />
                </div>

                {/* Info */}
                <div
                  className={`flex justify-between text-xs pt-2 
                                border-t border-zinc-600 ${c.text}`}
                >
                  <span>
                    ⏰ Full by:{" "}
                    <strong className="text-white">{p.full_by}</strong>
                  </span>
                  <span>⚡ ~{p.hours_to_full}h left</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
