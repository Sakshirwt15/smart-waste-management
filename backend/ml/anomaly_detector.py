import numpy as np
import pickle
import os
from sklearn.ensemble import IsolationForest
from config.config import db
from datetime import datetime

MODEL_PATH = os.path.join(os.path.dirname(__file__), "anomaly_model.pkl")


# ── Train Isolation Forest on bin history ─────────────────────────────────
def train_anomaly_model():
    records = list(db.bin_history.find({}, {"_id": 0}))

    if len(records) < 50:
        print("Not enough history to train anomaly model.")
        return

    # Features: hour, day_of_week, fill_percentage
    X = np.array([[r["hour"], r["day_of_week"], r["fill_percentage"]] for r in records])

    # Isolation Forest — no labels needed, learns what's "normal"
    model = IsolationForest(
        n_estimators=100, contamination=0.05, random_state=42  # expects ~5% anomalies
    )
    model.fit(X)

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

    print("Anomaly model trained and saved.")


# ── Check if a single bin reading is anomalous ────────────────────────────
def check_anomaly(fill_percentage: float) -> dict:
    now = datetime.utcnow()
    hour = now.hour
    day_of_week = now.weekday()

    # Load model
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)

        X = np.array([[hour, day_of_week, fill_percentage]])
        prediction = model.predict(X)[0]  # -1 = anomaly, 1 = normal
        score = model.decision_function(X)[0]  # lower = more anomalous
        is_anomaly = prediction == -1
    else:
        # Fallback if model not trained yet
        is_anomaly = fill_percentage >= 85
        score = -1.0 if is_anomaly else 0.5

    # Determine alert type
    if is_anomaly:
        if fill_percentage >= 90:
            alert_type = "critical"
            message = f"🚨 Critical! Bin filling abnormally fast ({fill_percentage}%)"
        elif fill_percentage >= 70:
            alert_type = "warning"
            message = (
                f"⚠️ Unusual fill detected ({fill_percentage}%) — may need early pickup"
            )
        else:
            alert_type = "info"
            message = f"📊 Abnormal pattern detected at {fill_percentage}% fill"
    else:
        alert_type = "normal"
        message = "Normal"

    return {
        "is_anomaly": is_anomaly,
        "alert_type": alert_type,
        "message": message,
        "anomaly_score": round(float(score), 3),
    }


# ── Zone surge: check if multiple bins in same area are spiking ───────────
def check_zone_surge(bins: list) -> dict | None:
    """
    bins: list of dicts with latitude, longitude, fill_percentage
    Returns surge alert if 3+ bins nearby are all high fill
    """
    high_fill_bins = [b for b in bins if b.get("fill_percentage", 0) >= 70]

    if len(high_fill_bins) >= 3:
        avg_fill = round(
            sum(b["fill_percentage"] for b in high_fill_bins) / len(high_fill_bins), 1
        )
        return {
            "is_surge": True,
            "affected_bins": len(high_fill_bins),
            "avg_fill": avg_fill,
            "message": f"📊 Zone surge! {len(high_fill_bins)} bins averaging {avg_fill}% — consider extra vehicle",
        }
    return None
