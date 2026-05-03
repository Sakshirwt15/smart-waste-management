import { useState } from "react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

// ── FIX 1: socket created ONCE outside component, not on every render ────────
const socket = io("http://localhost:5000", { transports: ["websocket"] });

export default function ReportModal({ bin, onClose, onReported }) {
  const [fillLevel, setFillLevel] = useState(
    bin.fill_percentage ?? bin.fill ?? 50,
  );
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [rerouteSuccess, setRerouteSuccess] = useState(false);

  const binId = bin.bin_id || bin.id || String(bin._id);
  const lat = bin.latitude ?? bin.lat;
  const lng = bin.longitude ?? bin.lng;
  const currentFill = bin.fill_percentage ?? bin.fill ?? 0;

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!binId) {
      toast.error("Cannot identify bin. Refresh and try again.");
      return;
    }

    setLoading(true);
    try {
      // ── Step 1: Save report to DB via HTTP ──────────────────────────────
      const res = await fetch("http://localhost:5000/api/bins/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bin_id: binId,
          fill_level: fillLevel,
          photo: photo ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error || data.message || JSON.stringify(data);
        toast.error(`Failed: ${errMsg}`, { duration: 6000 });
        setLoading(false);
        return;
      }

      toast.success(`✅ Report submitted! Fill updated to ${fillLevel}%`);
      onReported(binId, fillLevel);

      // ── Step 2: Emit socket event to trigger live re-routing ────────────
      setRerouting(true);
      setLoading(false);

      toast("🗺️ Re-optimizing vehicle routes...", {
        icon: "⏳",
        duration: 3000,
        style: {
          background: "#EFF6FF",
          color: "#1E40AF",
          border: "1px solid #BFDBFE",
        },
      });

      // ── FIX 2: emit with reported_fill (matches app.py handler field) ───
      socket.emit("citizen_report", {
        bin_id: binId,
        fill_percentage: fillLevel,
        reported_fill: fillLevel, // app.py uses reported_fill
      });

      // ── Step 3: Listen for re-routing completion ─────────────────────────
      socket.once("routes_updated", (data) => {
        setRerouting(false);
        setRerouteSuccess(true);
        const count = data?.routes?.length || 0;
        toast.success(`✅ Routes re-optimized! ${count} route(s) updated.`, {
          duration: 4000,
          style: {
            background: "#F0FDF4",
            color: "#166534",
            border: "1px solid #86EFAC",
          },
        });
        setTimeout(() => onClose(), 1500);
      });

      // ── Step 4: Timeout fallback if socket doesn't respond ───────────────
      setTimeout(() => {
        if (rerouting) {
          setRerouting(false);
          toast("⚠️ Route update may be slow. Check Dashboard.", {
            duration: 4000,
            icon: "ℹ️",
          });
          onClose();
        }
      }, 12000);
    } catch (err) {
      toast.error("Server error. Is backend running on port 5000?");
      console.error("❌ Fetch error:", err);
      setLoading(false);
      setRerouting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            🗑️ Report Bin Fill Level
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Bin Info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600">
          <p>
            📍 Lat: {lat?.toFixed(4)}, Lng: {lng?.toFixed(4)}
          </p>
          <p>
            Current fill: <strong>{currentFill}%</strong>
          </p>
          {binId && (
            <p>
              Bin ID: <strong>{binId}</strong>
            </p>
          )}
        </div>

        {/* Fill Level Slider */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Actual Fill Level: <strong>{fillLevel}%</strong>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={fillLevel}
            onChange={(e) => setFillLevel(Number(e.target.value))}
            className="w-full accent-green-500"
          />
          <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all ${
                fillLevel >= 80
                  ? "bg-red-500"
                  : fillLevel >= 50
                    ? "bg-yellow-400"
                    : "bg-green-500"
              }`}
              style={{ width: `${fillLevel}%` }}
            />
          </div>
          <div
            className={`mt-2 text-xs font-medium px-2 py-1 rounded-full inline-block ${
              fillLevel >= 80
                ? "bg-red-100 text-red-700"
                : fillLevel >= 50
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700"
            }`}
          >
            {fillLevel >= 80
              ? "🔴 Critical — route will re-optimize!"
              : fillLevel >= 50
                ? "🟡 Moderate"
                : "🟢 Low"}
          </div>
        </div>

        {/* Optional Photo */}
        <div className="mb-5">
          <label className="text-sm font-medium text-gray-700 block mb-1">
            📷 Photo (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            className="text-sm text-gray-500 file:mr-3 file:py-1 file:px-3
                       file:rounded-full file:border-0 file:text-sm
                       file:bg-green-50 file:text-green-700
                       hover:file:bg-green-100 w-full"
          />
          {photo && (
            <img
              src={photo}
              alt="preview"
              className="mt-2 rounded-lg h-24 w-full object-cover"
            />
          )}
        </div>

        {/* Status indicators */}
        {rerouting && (
          <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center gap-2">
            <span className="animate-spin inline-block">⏳</span>
            Re-optimizing vehicle routes in real-time...
          </div>
        )}
        {rerouteSuccess && (
          <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 flex items-center gap-2">
            ✅ Routes successfully re-optimized!
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || rerouting}
            className="flex-1 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium disabled:opacity-50"
          >
            {loading
              ? "Submitting..."
              : rerouting
                ? "Re-routing..."
                : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
