from flask import Blueprint, jsonify
from models.bin_model import Bin
from ml.predictor import predict_fill
from config.config import db
from bson import ObjectId

predict_routes = Blueprint("predict_routes", __name__)


# Predict fill for a single bin
@predict_routes.route("/bins/<bin_id>/predict", methods=["GET"])
def predict_bin(bin_id):
    try:
        bin_doc = db.bins.find_one({"_id": ObjectId(bin_id)})
        if not bin_doc:
            return jsonify({"error": "Bin not found"}), 404

        current_fill = bin_doc.get("fill_percentage", 0)
        prediction = predict_fill(current_fill, hours_ahead=4)

        return (
            jsonify({"bin_id": bin_id, "current_fill": current_fill, **prediction}),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Predict fill for ALL bins at once (used by frontend map)
@predict_routes.route("/bins/predict/all", methods=["GET"])
def predict_all_bins():
    bins = list(db.bins.find({}))
    results = []

    for bin_doc in bins:
        current_fill = bin_doc.get("fill_percentage", 0)
        prediction = predict_fill(current_fill, hours_ahead=4)
        results.append(
            {
                "bin_id": str(bin_doc["_id"]),
                "bin_label": bin_doc.get("bin_id", ""),
                "current_fill": current_fill,
                **prediction,
            }
        )

    return jsonify(results), 200
