from flask import Blueprint, jsonify
from config.config import db
from ml.anomaly_detector import check_anomaly, check_zone_surge, train_anomaly_model
from bson import ObjectId

alert_routes = Blueprint("alert_routes", __name__)


# ── Check single bin for anomaly ──────────────────────────────────────────
@alert_routes.route("/bins/<bin_id>/check-alert", methods=["GET"])
def check_bin_alert(bin_id):
    try:
        bin_doc = db.bins.find_one({"_id": ObjectId(bin_id)})
        if not bin_doc:
            return jsonify({"error": "Bin not found"}), 404

        fill = bin_doc.get("fill_percentage", 0)
        result = check_anomaly(fill)
        result["bin_id"] = bin_id
        result["bin_label"] = bin_doc.get("bin_id", bin_id)
        result["fill_percentage"] = fill
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Check ALL bins and return any anomalies + zone surges ─────────────────
@alert_routes.route("/alerts/scan", methods=["GET"])
def scan_all_alerts():
    bins = list(db.bins.find({}))
    alerts = []

    for bin_doc in bins:
        fill = bin_doc.get("fill_percentage", 0)
        result = check_anomaly(fill)

        if result["is_anomaly"]:
            alerts.append(
                {
                    "bin_id": str(bin_doc["_id"]),
                    "bin_label": bin_doc.get("bin_id", ""),
                    "fill_percentage": fill,
                    "alert_type": result["alert_type"],
                    "message": result["message"],
                    "anomaly_score": result["anomaly_score"],
                }
            )

    # Check zone surge
    bins_plain = [
        {
            "fill_percentage": b.get("fill_percentage", 0),
            "latitude": b.get("latitude", 0),
            "longitude": b.get("longitude", 0),
        }
        for b in bins
    ]

    surge = check_zone_surge(bins_plain)

    return (
        jsonify(
            {"bin_alerts": alerts, "zone_surge": surge, "total_anomalies": len(alerts)}
        ),
        200,
    )


# ── Train anomaly model endpoint ──────────────────────────────────────────
@alert_routes.route("/alerts/train", methods=["POST"])
def train_model():
    train_anomaly_model()
    return jsonify({"message": "Anomaly model trained successfully"}), 200
