from flask import Blueprint, request, jsonify
from models.bin_model import Bin
from models.vehicle_model import Vehicle
from utils.graph_building import compute_multi_vehicle_route
import heapq
from config.config import db

# ── FIX: import train function to retrain after new bins saved ───────────────
from routes.train_routes import train_fill_model

optimization_routes = Blueprint("optimization_routes", __name__)
test_routes = Blueprint("test_routes", __name__)


@optimization_routes.route("/optimize/setup", methods=["POST"])
def setup_optimization():
    data = request.get_json()

    bins = data.get("bins", [])
    vehicles = data.get("vehicles", [])
    start_location = data.get("start_location", {})
    print("Start Location:", start_location)
    print(f"Bins: {len(bins)} bins received")
    print(f"Vehicles: {len(vehicles)} vehicles received")

    # Clear old data
    db.bins.delete_many({})
    db.vehicles.delete_many({})

    # Save Bins
    for bin_data in bins:
        new_bin = Bin(
            bin_id=bin_data["bin_id"],
            city_id=bin_data["city_id"],
            latitude=bin_data["latitude"],
            longitude=bin_data["longitude"],
            capacity=bin_data.get("capacity", 100),
            fill_percentage=bin_data["fill_percentage"],
        )
        new_bin.save()

    # Save Vehicles
    for vehicle_data in vehicles:
        new_vehicle = Vehicle(
            city_id=vehicle_data["city_id"],
            vehicle_license=vehicle_data["vehicle_license"],
            load_capacity=vehicle_data["load_capacity"],
            latitude=vehicle_data["latitude"],
            longitude=vehicle_data["longitude"],
            current_load=vehicle_data.get("current_load", 0),
            assigned_bins=vehicle_data.get("assigned_bins", []),
            status=vehicle_data.get("status", "available"),
        )
        new_vehicle.save()

    # ── FIX: Retrain ML model with the new bins so predictions are fresh ─────
    try:
        success, result = train_fill_model()
        if success:
            print(f"✅ ML model retrained after bin save. R²={result}")
        else:
            print(f"⚠️ ML retrain warning: {result}")
    except Exception as e:
        print(f"⚠️ ML retrain failed (non-critical): {e}")

    return jsonify({"message": "Bins and Vehicles saved successfully"}), 201


@test_routes.route("/test/build-graph", methods=["GET"])
def test_graph():
    result = compute_multi_vehicle_route()
    return result, 200
