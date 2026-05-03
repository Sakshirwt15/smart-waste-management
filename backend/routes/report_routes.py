from flask import Blueprint, request, jsonify
from config.config import db
from datetime import datetime

report_routes = Blueprint("report_routes", __name__)


@report_routes.route("/bins/report", methods=["POST"])
def report_bin():
    data = request.json
    bin_id = data.get("bin_id")
    reported_fill = data.get("fill_level")
    photo = data.get("photo", None)

    if not bin_id or reported_fill is None:
        return jsonify({"error": "bin_id and fill_level are required"}), 400

    # Convert to string — frontend sends "1", "2", etc.
    bin_id_str = str(bin_id)

    # FIX: query by bin_id field (string), NOT by _id (ObjectId)
    # Bins are stored with bin_id: "1", "2", ... not by MongoDB _id
    result = db.bins.update_one(
        {"bin_id": bin_id_str},
        {
            "$set": {
                "fill_percentage": reported_fill,  # backend field name
                "fill": reported_fill,  # keep both in sync
            }
        },
    )

    # If not found by bin_id, try by id field as fallback
    if result.matched_count == 0:
        result = db.bins.update_one(
            {"id": bin_id_str},
            {
                "$set": {
                    "fill_percentage": reported_fill,
                    "fill": reported_fill,
                }
            },
        )

    # Last resort: try MongoDB ObjectId (only if it looks like one)
    if result.matched_count == 0 and len(bin_id_str) == 24:
        try:
            from bson import ObjectId

            result = db.bins.update_one(
                {"_id": ObjectId(bin_id_str)},
                {
                    "$set": {
                        "fill_percentage": reported_fill,
                        "fill": reported_fill,
                    }
                },
            )
        except Exception:
            pass

    if result.matched_count == 0:
        # Debug: show what bin_ids exist in DB
        existing = list(db.bins.find({}, {"bin_id": 1, "id": 1, "_id": 0}))
        print(
            f"❌ Bin not found. Tried bin_id='{bin_id_str}'. Existing bins: {existing}"
        )
        return (
            jsonify(
                {
                    "error": f"Bin not found with bin_id='{bin_id_str}'",
                    "hint": "Check browser console — existing bin IDs printed in backend logs",
                }
            ),
            404,
        )

    # Save report history
    report = {
        "bin_id": bin_id_str,
        "reported_fill": reported_fill,
        "photo": photo,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "pending",
    }
    db.reports.insert_one(report)

    print(f"✅ Report saved: bin_id={bin_id_str}, fill={reported_fill}%")

    return (
        jsonify(
            {
                "message": "Report submitted successfully",
                "bin_id": bin_id_str,
                "new_fill": reported_fill,
            }
        ),
        200,
    )


@report_routes.route("/reports", methods=["GET"])
def get_reports():
    reports = list(db.reports.find({}, {"_id": 0}))
    return jsonify(reports), 200
