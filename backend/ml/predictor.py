import pickle
import os
from datetime import datetime

MODEL_PATH = os.path.join(os.path.dirname(__file__), "fill_predictor.pkl")


def load_model():
    if not os.path.exists(MODEL_PATH):
        return None
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def predict_fill(current_fill: float, hours_ahead: int = 4) -> dict:
    """
    Predict fill level N hours from now for a bin.
    Returns predicted fill % and a status label.
    """
    model = load_model()
    now = datetime.utcnow()

    future_hour = (now.hour + hours_ahead) % 24
    day_of_week = now.weekday()

    if model:
        predicted = model.predict([[future_hour, day_of_week, current_fill]])[0]
        predicted = round(min(100, max(current_fill, predicted)), 1)
    else:
        # Fallback: simple linear estimate if model not trained yet
        predicted = round(min(100, current_fill + hours_ahead * 1.5), 1)

    # Estimate hours until full (100%)
    if predicted >= 100:
        hours_to_full = 0
    elif predicted <= current_fill:
        hours_to_full = 99
    else:
        rate = (predicted - current_fill) / hours_ahead
        hours_to_full = round((100 - current_fill) / rate) if rate > 0 else 99

    # Label
    if current_fill >= 80:
        status = "critical"
    elif hours_to_full <= 6:
        status = "warning"
    elif hours_to_full <= 12:
        status = "moderate"
    else:
        status = "safe"

    # Human readable time
    from datetime import timedelta

    full_by_dt = datetime.utcnow() + timedelta(hours=hours_to_full)
    full_by = full_by_dt.strftime("%I:%M %p") if hours_to_full < 24 else "Tomorrow+"

    return {
        "predicted_fill_4h": predicted,
        "hours_to_full": hours_to_full,
        "full_by": full_by,
        "status": status,
    }
