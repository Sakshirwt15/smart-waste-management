import { useEffect, useState } from "react";
import ReportModal from "../components/ReportModal";
import toast, { Toaster } from "react-hot-toast";

export default function CitizenReport() {
  const [bins, setBins] = useState([]);
  const [selectedBin, setSelectedBin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/bins")
      .then((r) => r.json())
      .then((data) => {
        // DEBUG: open browser console to see exact field names from backend
        console.log("📦 Bins from API (first item):", data[0]);
        setBins(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Could not load bins");
        setLoading(false);
      });
  }, []);

  // Works with both _id (MongoDB) and bin_id (string like "1","2")
  const getBinId = (bin) => bin._id || bin.bin_id || bin.id;

  // Fill field — backend uses fill_percentage, frontend uses fill
  const getFill = (bin) => bin.fill_percentage ?? bin.fill ?? 0;

  // Coordinates — backend uses latitude/longitude, frontend uses lat/lng
  const getLat = (bin) => bin.latitude ?? bin.lat;
  const getLng = (bin) => bin.longitude ?? bin.lng;

  const handleReported = (binId, newFill) => {
    setBins((prev) =>
      prev.map((b) =>
        getBinId(b) === binId
          ? { ...b, fill: newFill, fill_percentage: newFill }
          : b,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster />
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            🗑️ Report a Full Bin
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Help us keep the city clean. Click any bin to report its fill level.
          </p>
        </div>

        {/* Bin List */}
        {loading ? (
          <p className="text-gray-400">Loading bins...</p>
        ) : bins.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">🗑️</p>
            <p className="font-semibold text-gray-600">No bins found</p>
            <p className="text-sm mt-1">
              Go to Dashboard → add bins → click <strong>💾 Add Data</strong>{" "}
              first.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bins.map((bin, index) => {
              // FIX 1: guaranteed unique key — never undefined
              const uniqueKey = getBinId(bin) ?? `bin-fallback-${index}`;
              const fill = getFill(bin);
              const lat = getLat(bin);
              const lng = getLng(bin);

              return (
                <div
                  key={uniqueKey}
                  onClick={() => setSelectedBin(bin)}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100
                             hover:border-green-400 cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      📍 {lat?.toFixed(3)}, {lng?.toFixed(3)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        fill >= 80
                          ? "bg-red-100 text-red-700"
                          : fill >= 50
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {fill}%
                    </span>
                  </div>

                  {/* Fill bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        fill >= 80
                          ? "bg-red-500"
                          : fill >= 50
                            ? "bg-yellow-400"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${fill}%` }}
                    />
                  </div>

                  {/* Bin ID tag */}
                  {getBinId(bin) && (
                    <p className="text-xs text-gray-400 mt-1">
                      ID: {getBinId(bin)}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-1">
                    Click to report actual fill level
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {selectedBin && (
        <ReportModal
          bin={selectedBin}
          onClose={() => setSelectedBin(null)}
          onReported={handleReported}
        />
      )}
    </div>
  );
}
