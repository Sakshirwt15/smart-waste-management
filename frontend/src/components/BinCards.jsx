import React, { useEffect, useState } from "react";
import PredictionBadge from "./PredictionBadge";
import ReportModal from "./ReportModal";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

const BinCards = ({ bins, updateBinFill }) => {
  // Feature 2 — AI Predictions
  const [predictions, setPredictions] = useState({});
  const [loadingPredictions, setLoadingPredictions] = useState(true);

  // Feature 1 — Citizen Reporting
  const [selectedBin, setSelectedBin] = useState(null);

  // Feature 4 — Smart Alerts (anomaly scan)
  const [alerts, setAlerts] = useState([]);

  // Feature 3 — Heatmap toggle (controlled here, passed up if needed)
  const [showHeatmap, setShowHeatmap] = useState(false);

  // ── Feature 2: Fetch ALL predictions on mount ──────────────────────────
  useEffect(() => {
    fetch("http://localhost:5000/api/bins/predict/all")
      .then((r) => r.json())
      .then((data) => {
        const predMap = {};
        data.forEach((p) => {
          predMap[p.bin_label] = p;
        });
        setPredictions(predMap);
        setLoadingPredictions(false);
      })
      .catch(() => setLoadingPredictions(false));
  }, []);

  // ── Feature 4: Scan for anomalies on mount ────────────────────────────
  useEffect(() => {
    fetch("http://localhost:5000/api/alerts/scan")
      .then((r) => r.json())
      .then((data) => {
        // Show toast for each anomaly found
        data.bin_alerts?.forEach((alert) => {
          if (alert.alert_type === "critical") {
            toast.error(`${alert.message}\nBin: ${alert.bin_label}`, {
              duration: 6000,
              icon: "🚨",
              style: {
                background: "#FEE2E2",
                color: "#991B1B",
                fontWeight: "600",
                border: "1px solid #FCA5A5",
              },
            });
          } else if (alert.alert_type === "warning") {
            toast(`${alert.message}\nBin: ${alert.bin_label}`, {
              duration: 5000,
              icon: "⚠️",
              style: {
                background: "#FEF3C7",
                color: "#92400E",
                fontWeight: "500",
                border: "1px solid #FCD34D",
              },
            });
          }
        });

        // Zone surge alert
        if (data.zone_surge?.is_surge) {
          toast(data.zone_surge.message, {
            duration: 7000,
            icon: "📊",
            style: {
              background: "#F3E8FF",
              color: "#6B21A8",
              fontWeight: "600",
              border: "1px solid #D8B4FE",
            },
          });
        }

        setAlerts(data.bin_alerts || []);
      })
      .catch(() => {});
  }, []);

  // ── Feature 4: Listen for real-time socket alerts ─────────────────────
  useEffect(() => {
    socket.on("bin_alert", (data) => {
      const { alert_type, message, bin_label } = data;
      if (alert_type === "critical") {
        toast.error(`${message}\nBin: ${bin_label}`, {
          duration: 6000,
          icon: "🚨",
          style: {
            background: "#FEE2E2",
            color: "#991B1B",
            fontWeight: "600",
            border: "1px solid #FCA5A5",
          },
        });
      } else {
        toast(`${message}\nBin: ${bin_label}`, {
          duration: 5000,
          icon: "⚠️",
          style: {
            background: "#FEF3C7",
            color: "#92400E",
            border: "1px solid #FCD34D",
          },
        });
      }
    });

    socket.on("zone_surge", (data) => {
      toast(data.message, {
        duration: 7000,
        icon: "📊",
        style: {
          background: "#F3E8FF",
          color: "#6B21A8",
          fontWeight: "600",
          border: "1px solid #D8B4FE",
        },
      });
    });

    return () => {
      socket.off("bin_alert");
      socket.off("zone_surge");
    };
  }, []);

  // ── Feature 2: Refresh single bin prediction after fill change ─────────
  const refreshPrediction = (binId, binMongoId) => {
    if (!binMongoId) return;
    fetch(`http://localhost:5000/api/bins/${binMongoId}/predict`)
      .then((r) => r.json())
      .then((data) => {
        setPredictions((prev) => ({ ...prev, [binId]: data }));
      })
      .catch(() => {});
  };

  // ── Feature 1: After citizen reports, update bin fill locally ──────────
  const handleReported = (binMongoId, newFill) => {
    // Find bin by _id and update
    const bin = bins.find((b) => b._id === binMongoId);
    if (bin) {
      updateBinFill(bin.id, newFill);
      refreshPrediction(bin.id, bin._id);
      toast.success(
        `✅ Report submitted! Bin #${bin.id} updated to ${newFill}%`,
      );
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  const getFillColor = (fill) => {
    if (fill >= 80) return "bg-red-500";
    if (fill >= 50) return "bg-yellow-400";
    return "bg-green-500";
  };

  const getFillTextColor = (fill) => {
    if (fill >= 80) return "text-red-600";
    if (fill >= 50) return "text-yellow-600";
    return "text-green-600";
  };

  const getBorderColor = (fill) => {
    if (fill >= 80) return "border-red-300";
    if (fill >= 50) return "border-yellow-300";
    return "border-zinc-200";
  };

  // Check if this bin has an active anomaly alert
  const getBinAlert = (binId) => {
    return alerts.find((a) => a.bin_label === String(binId));
  };

  return (
    <div className="bin-cards-container">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold">Bin Fill Levels</h2>
        <div className="flex items-center gap-2">
          {loadingPredictions && (
            <span className="text-xs text-gray-400 animate-pulse">
              🤖 Loading predictions...
            </span>
          )}
          {/* Feature 3 — Heatmap toggle button */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                        flex items-center gap-1 shadow-sm
                        ${
                          showHeatmap
                            ? "bg-orange-500 text-white hover:bg-orange-600"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                        }`}
          >
            🌡️ {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
          </button>
        </div>
      </div>

      {/* ── Alert Summary Bar (Feature 4) ── */}
      {alerts.length > 0 && (
        <div
          className="mb-4 px-4 py-2 bg-red-50 border border-red-200 
                        rounded-lg flex items-center gap-2 text-sm text-red-700"
        >
          🚨{" "}
          <strong>
            {alerts.length} bin{alerts.length > 1 ? "s" : ""}
          </strong>
          &nbsp;showing abnormal fill patterns
        </div>
      )}

      {/* ── Bin Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bins.map((bin) => {
          const binAlert = getBinAlert(bin.id);

          return (
            <div
              key={bin.id}
              className={`p-4 rounded-lg shadow-md bg-white border 
                         hover:shadow-lg transition-all
                         ${getBorderColor(bin.fill)}
                         ${binAlert ? "ring-2 ring-red-400 ring-offset-1" : ""}`}
            >
              {/* ── Bin Header ── */}
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold">Bin #{bin.id}</p>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full
                                  ${
                                    bin.fill >= 80
                                      ? "bg-red-100 text-red-700"
                                      : bin.fill >= 50
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-green-100 text-green-700"
                                  }`}
                >
                  {bin.fill}%
                </span>
              </div>

              {/* ── Coordinates ── */}
              <p className="text-xs text-zinc-400 mb-2">
                📍 {bin.lat.toFixed(4)}, {bin.lng.toFixed(4)}
              </p>

              {/* ── Feature 4: Anomaly Alert Banner ── */}
              {binAlert && (
                <div
                  className="mb-2 px-2 py-1 bg-red-50 border border-red-200 
                                rounded text-xs text-red-700 font-medium"
                >
                  {binAlert.alert_type === "critical" ? "🚨" : "⚠️"}{" "}
                  {binAlert.message}
                </div>
              )}

              {/* ── Fill Bar (Feature 3 visual) ── */}
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 
                              ${getFillColor(bin.fill)}`}
                  style={{ width: `${bin.fill}%` }}
                />
              </div>

              {/* ── Slider ── */}
              <input
                type="range"
                min="0"
                max="100"
                value={bin.fill}
                onChange={(e) => {
                  const newFill = parseInt(e.target.value);
                  updateBinFill(bin.id, newFill);
                  refreshPrediction(bin.id, bin._id); // Feature 2
                }}
                className="w-full accent-green-500 mt-1"
              />

              <p
                className={`text-sm mt-1 font-medium ${getFillTextColor(bin.fill)}`}
              >
                Fill: {bin.fill}%
              </p>

              {/* ── Feature 2: AI Prediction Badge ── */}
              <PredictionBadge prediction={predictions[bin.id]} />

              {/* ── Feature 1: Citizen Report Button ── */}
              <button
                onClick={() => setSelectedBin(bin)}
                className="mt-3 w-full py-1.5 rounded-lg border border-green-300
                           text-green-700 text-xs font-medium hover:bg-green-50
                           transition-colors flex items-center justify-center gap-1"
              >
                🙋 Report Actual Fill Level
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Feature 1: Report Modal ── */}
      {selectedBin && (
        <ReportModal
          bin={selectedBin}
          onClose={() => setSelectedBin(null)}
          onReported={handleReported}
        />
      )}
    </div>
  );
};

export default BinCards;
