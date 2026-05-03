import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.config import db
from datetime import datetime, timedelta
import numpy as np
import pickle
import random
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split


# ── STEP 1: Generate synthetic history if collection is empty ──────────────
def generate_synthetic_history():
    bins = list(db.bins.find({}))
    if not bins:
        print("No bins found in DB. Add bins first.")
        return

    print(f"Generating synthetic history for {len(bins)} bins...")
    db.bin_history.drop()

    records = []
    now = datetime.utcnow()

    for bin_doc in bins:
        bin_id = str(bin_doc["_id"])
        base_fill = bin_doc.get("fill_percentage", 30)

        # Simulate 30 days of hourly readings
        for days_ago in range(30, 0, -1):
            for hour in range(0, 24, 2):  # every 2 hours
                timestamp = now - timedelta(days=days_ago, hours=hour)

                # Fill increases faster during day, slower at night
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
                fill = round(fill, 1)

                records.append(
                    {
                        "bin_id": bin_id,
                        "fill_percentage": fill,
                        "hour": timestamp.hour,
                        "day_of_week": timestamp.weekday(),  # 0=Mon, 6=Sun
                        "timestamp": timestamp.isoformat(),
                    }
                )

    db.bin_history.insert_many(records)
    print(f"Inserted {len(records)} synthetic history records.")


# ── STEP 2: Train the model ────────────────────────────────────────────────
def train():
    generate_synthetic_history()

    records = list(db.bin_history.find({}, {"_id": 0}))
    if not records:
        print("No history data to train on.")
        return

    # Features: hour, day_of_week, current_fill
    X, y = [], []
    for r in records:
        X.append([r["hour"], r["day_of_week"], r["fill_percentage"]])
        # Target: fill level 4 hours later (approx)
        y.append(min(100, r["fill_percentage"] + random.uniform(2, 8)))

    X = np.array(X)
    y = np.array(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    score = model.score(X_test, y_test)
    print(f"Model trained! R² score: {round(score, 3)}")

    # Save model
    os.makedirs("ml", exist_ok=True)
    with open("ml/fill_predictor.pkl", "wb") as f:
        pickle.dump(model, f)
    print("Model saved to ml/fill_predictor.pkl")


if __name__ == "__main__":
    train()
