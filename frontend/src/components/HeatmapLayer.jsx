import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export default function HeatmapLayer({ bins }) {
  const map = useMap();

  useEffect(() => {
    if (!bins || bins.length === 0) return;

    // Convert bins to heatmap points [lat, lng, intensity]
    const heatPoints = bins.map((bin) => [
      bin.latitude,
      bin.longitude,
      bin.fill_percentage / 100, // normalize 0-1
    ]);

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 35, // size of each point's glow
      blur: 25, // how soft the edges are
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: "blue", // empty bins → blue/cool
        0.4: "green", // low fill → green
        0.6: "yellow", // medium → yellow
        0.8: "orange", // high → orange
        1.0: "red", // full/critical → red
      },
    });

    heatLayer.addTo(map);

    // Cleanup on unmount or bins change
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [bins, map]);

  return null; // renders nothing itself, just adds layer to map
}
