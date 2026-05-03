import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import HeatmapLayer from "./HeatmapLayer";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function FlyToCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13, { duration: 1.5 });
  }, [center, map]);
  return null;
}

function MapClickHandler({ onMapClickForStart }) {
  useMapEvents({
    click(e) {
      if (onMapClickForStart) {
        onMapClickForStart({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

function getBinIcon(fill) {
  const color =
    fill >= 80
      ? "#EF4444"
      : fill >= 60
        ? "#F97316"
        : fill >= 40
          ? "#EAB308"
          : "#22C55E";

  // Trash can SVG icon
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <svg width="28" height="32" viewBox="0 0 24 24" fill="${color}" 
             xmlns="http://www.w3.org/2000/svg"
             style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6h14zM10 11v6M14 11v6" 
                stroke="white" stroke-width="1.5" stroke-linecap="round" 
                fill="none"/>
          <rect x="5" y="6" width="14" height="2" rx="1" fill="${color}"/>
          <path d="M6 8l1 12h10l1-12H6z" fill="${color}"/>
        </svg>
        <div style="
          width:8px;height:8px;
          background:${color};
          border-radius:50%;
          margin-top:-2px;
          border:1px solid white;
        "></div>
      </div>
    `,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
}

function StartMarker({ location }) {
  if (!location) return null;
  const icon = L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <svg width="32" height="32" viewBox="0 0 24 24" 
             xmlns="http://www.w3.org/2000/svg"
             style="filter:drop-shadow(0 2px 6px rgba(59,130,246,0.8))">
          <rect x="3" y="8" width="16" height="10" rx="2" fill="#3B82F6"/>
          <rect x="1" y="11" width="4" height="6" rx="1" fill="#1D4ED8"/>
          <rect x="17" y="11" width="4" height="6" rx="1" fill="#1D4ED8"/>
          <circle cx="7" cy="19" r="2" fill="#1E293B" stroke="white" stroke-width="1"/>
          <circle cx="15" cy="19" r="2" fill="#1E293B" stroke="white" stroke-width="1"/>
          <rect x="9" y="6" width="8" height="6" rx="1" fill="#60A5FA"/>
        </svg>
        <div style="
          width:0;height:0;
          border-left:6px solid transparent;
          border-right:6px solid transparent;
          border-top:8px solid #3B82F6;
          margin-top:-2px;
        "></div>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });

  return (
    <Marker position={[location.lat, location.lng]} icon={icon}>
      <Popup>
        <div className="text-sm font-semibold text-blue-700">
          🚛 Vehicle Start Location
          <br />
          <span className="font-normal text-gray-600">
            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </span>
        </div>
      </Popup>
    </Marker>
  );
}

export default function BinMap({
  center,
  bins = [],
  mapRef,
  startLocation,
  onMapClickForStart,
  routes = [],
  selectedRouteIndex = null,
  showHeatmap = false,
}) {
  const routeColors = ["#14B8A6", "#F97316", "#A855F7", "#EAB308", "#EC4899"];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "460px", width: "100%" }}
      ref={mapRef}
      className={onMapClickForStart ? "cursor-crosshair" : ""}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToCenter center={center} />
      <MapClickHandler onMapClickForStart={onMapClickForStart} />

      {/* Heatmap — Feature 3 */}
      {showHeatmap && bins.length > 0 && (
        <HeatmapLayer
          bins={bins.map((b) => ({
            latitude: b.lat,
            longitude: b.lng,
            fill_percentage: b.fill,
          }))}
        />
      )}

      {/* Bin markers — trash can icons */}
      {bins.map((bin) => (
        <Marker
          key={bin.id}
          position={[bin.lat, bin.lng]}
          icon={getBinIcon(bin.fill)}
        >
          <Popup>
            <div className="text-sm min-w-[120px]">
              <strong>🗑️ Bin #{bin.id}</strong>
              <br />
              Fill: <strong>{bin.fill}%</strong>
              <br />
              <div
                style={{
                  marginTop: 4,
                  width: "100%",
                  background: "#e5e7eb",
                  borderRadius: 4,
                  height: 6,
                }}
              >
                <div
                  style={{
                    width: `${bin.fill}%`,
                    height: 6,
                    borderRadius: 4,
                    background:
                      bin.fill >= 80
                        ? "#EF4444"
                        : bin.fill >= 60
                          ? "#F97316"
                          : "#22C55E",
                  }}
                />
              </div>
              <span
                style={{
                  color:
                    bin.fill >= 80
                      ? "#EF4444"
                      : bin.fill >= 60
                        ? "#F97316"
                        : "#22C55E",
                  fontSize: 11,
                  marginTop: 4,
                  display: "block",
                }}
              >
                {bin.fill >= 80
                  ? "🔴 Critical — needs collection!"
                  : bin.fill >= 60
                    ? "🟠 High priority"
                    : bin.fill >= 40
                      ? "🟡 Medium"
                      : "🟢 Low — OK"}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Vehicle start marker — truck icon */}
      <StartMarker location={startLocation} />

      {/* Route polylines — FIXED: use latitude/longitude from backend */}
      {routes.map((route, idx) => {
        const waypoints = route.waypoints || [];

        // FIX: backend sends latitude/longitude not lat/lng
        const positions = waypoints
          .filter((w) => w.latitude != null && w.longitude != null)
          .map((w) => [w.latitude, w.longitude]);

        // Need at least 2 points to draw a line
        if (positions.length < 2) return null;

        const isSelected = selectedRouteIndex === idx;
        const isOther = selectedRouteIndex !== null && !isSelected;

        return (
          <Polyline
            key={idx}
            positions={positions}
            pathOptions={{
              color: routeColors[idx % routeColors.length],
              weight: isSelected ? 6 : 3,
              opacity: isOther ? 0.3 : 1,
              dashArray: "10, 6",
            }}
          />
        );
      })}
    </MapContainer>
  );
}
