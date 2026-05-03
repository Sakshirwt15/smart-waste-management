const BASE_URL = "http://localhost:5000";

function generateVehicleLicense(cityId, index) {
  const timestamp = Date.now().toString().slice(-5);
  return `VEH-${cityId}-${timestamp}-${index}`;
}

/* =========================
   ROUTE OPTIMIZATION
========================= */
export const fetchOptimizedRoute = async ({ depot, bins, vehicles }) => {
  const response = await fetch(`${BASE_URL}/api/test/build-graph`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      depot,
      bins,
      vehicles,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch optimized route");
  }

  return response.json();
};

export const optimizeRoutes = async ({ depot, bins, vehicles }) => {
  const response = await fetch(`${BASE_URL}/api/ml/optimize-routes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      depot,
      bins,
      vehicles,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to optimize routes");
  }

  return response.json();
};
/* =========================
   SAVE DATA
========================= */
export const sendOptimizationSetup = async ({ bins, vehicles, startLocation }) => {
  const city_id = bins[0].city_id;

  const payload = {
    bins: bins.map((bin) => ({
      city_id: bin.city_id,
      bin_id: bin.id,
      latitude: bin.lat,
      longitude: bin.lng,
      capacity: 100,
      fill_percentage: bin.fill,
    })),

    vehicles: vehicles.map((vehicle, idx) => ({
      city_id,
      vehicle_license: generateVehicleLicense(city_id, idx + 1),
      load_capacity: vehicle.capacity,
      latitude: startLocation.lat,
      longitude: startLocation.lng,
      current_load: 0,
      assigned_bins: [],
      status: "available",
    })),

    start_location: {
      lat: startLocation.lat,
      lng: startLocation.lng,
    },
  };

  const response = await fetch(`${BASE_URL}/api/optimize/setup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to save setup");
  }

  return response.json();
};

/* =========================
   BIN
========================= */
export const fetchBinById = async (binId) => {
  const response = await fetch(`${BASE_URL}/api/bins/id/${binId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch bin ${binId}`);
  }

  return response.json();
};

/* =========================
   ML FILL PREDICTION
========================= */
export const predictFill = async (binFeatures) => {
  const response = await fetch(`${BASE_URL}/api/ml/predict-fill`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(binFeatures),
  });

  if (!response.ok) {
    throw new Error("Failed to predict fill");
  }

  return response.json();
};

export const predictFillBatch = async (binsArray) => {
  const response = await fetch(`${BASE_URL}/api/ml/predict-fill-batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(binsArray),
  });

  if (!response.ok) {
    throw new Error("Failed to predict fill batch");
  }

  return response.json();
};

/* =========================
   PRIORITY CLASSIFICATION
========================= */
export const classifyPriority = async (binFeatures) => {
  const response = await fetch(`${BASE_URL}/api/ml/classify-priority`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(binFeatures),
  });

  if (!response.ok) {
    throw new Error("Failed to classify priority");
  }

  return response.json();
};

export const classifyBatch = async (binsArray) => {
  const response = await fetch(`${BASE_URL}/api/ml/classify-batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(binsArray),
  });

  if (!response.ok) {
    throw new Error("Failed to classify batch");
  }

  return response.json();
};

/* =========================
   ALERTS
========================= */
export const getAlerts = async () => {
  const response = await fetch(`${BASE_URL}/api/alerts`);

  if (!response.ok) {
    throw new Error("Failed to fetch alerts");
  }

  return response.json();
};

export const getAlertStats = async () => {
  const response = await fetch(`${BASE_URL}/api/alerts/stats`);

  if (!response.ok) {
    throw new Error("Failed to fetch alert stats");
  }

  return response.json();
};

export const scanAlerts = async () => {
  const response = await fetch(`${BASE_URL}/api/alerts/scan`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to scan alerts");
  }

  return response.json();
};

export const acknowledgeAlert = async (binId, level = null) => {
  const response = await fetch(`${BASE_URL}/api/alerts/acknowledge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bin_id: binId,
      level,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to acknowledge alert");
  }

  return response.json();
};

/* =========================
   DASHBOARD
========================= */
export const getDashboardStats = async () => {
  const response = await fetch(`${BASE_URL}/api/ml/dashboard-stats`);

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard stats");
  }

  return response.json();
};