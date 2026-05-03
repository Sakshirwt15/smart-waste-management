from flask import Blueprint, jsonify
from config.config import db
from ml.anomaly_detector import train_anomaly_model
from datetime import datetime, timedelta
import random
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

train_routes = Blueprint("train_routes", __name__)


def train_fill_model():
    bins = list(db.bins.find({}))
    if not bins:
        return False, "No bins found in DB"

    print(f"Training fill model for {len(bins)} bins...")
    db.bin_history.drop()
    records = []
    now = datetime.utcnow()

    for bin_doc in bins:
        bin_id = str(bin_doc["_id"])
        base_fill = bin_doc.get("fill_percentage", 30)

        for days_ago in range(30, 0, -1):
            for hour in range(0, 24, 2):
                timestamp = now - timedelta(days=days_ago, hours=hour)
                day_factor = 1.5 if 8 <= timestamp.hour <= 20 else 0.5
                weekend_factor = 1.3 if timestamp.weekday() >= 5 else 1.0
                fill = min(
                    100,
                    base_fill
                    + random.uniform(0.5, 2.5)
                    * day_factor
                    * weekend_factor
                    * (24 - hour)
                    / 24
                    * days_ago
                    * 0.3,
                )
                records.append(
                    {
                        "bin_id": bin_id,
                        "fill_percentage": round(fill, 1),
                        "hour": timestamp.hour,
                        "day_of_week": timestamp.weekday(),
                        "timestamp": timestamp.isoformat(),
                    }
                )

    # Include real citizen reports if any
    real_reports = list(db.reports.find({}, {"_id": 0}))
    for r in real_reports:
        try:
            ts = datetime.fromisoformat(r["timestamp"])
            records.append(
                {
                    "bin_id": r["bin_id"],
                    "fill_percentage": r["reported_fill"],
                    "hour": ts.hour,
                    "day_of_week": ts.weekday(),
                    "timestamp": r["timestamp"],
                }
            )
        except Exception:
            pass

    if not records:
        return False, "No records to train on"

    db.bin_history.insert_many(records)
    print(f"✅ Inserted {len(records)} history records")

    # Train Random Forest
    X = np.array([[r["hour"], r["day_of_week"], r["fill_percentage"]] for r in records])
    y = np.array(
        [min(100, r["fill_percentage"] + random.uniform(2, 8)) for r in records]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    score = round(model.score(X_test, y_test), 3)
    print(f"✅ Fill model R² = {score}")

    # Save model
    model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "fill_predictor.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)

    print(f"✅ Model saved to {model_path}")
    return True, score


@train_routes.route("/train/all", methods=["POST"])
def train_all():
    results = {}

    # Train Fill Level Predictor
    try:
        success, result = train_fill_model()
        results["fill_predictor"] = {
            "status": "success" if success else "failed",
            "r2_score": result if success else None,
            "error": None if success else str(result),
        }
    except Exception as e:
        results["fill_predictor"] = {"status": "failed", "error": str(e)}

    # Train Anomaly Detector
    try:
        train_anomaly_model()
        results["anomaly_detector"] = {"status": "success"}
    except Exception as e:
        results["anomaly_detector"] = {"status": "failed", "error": str(e)}

    print("✅ All models trained:", results)
    return jsonify({"message": "Models trained successfully!", "results": results}), 200
