from flask import Flask, request
from flask_socketio import SocketIO
from flask_cors import CORS
from routes.bin_routes import bin_routes
from routes.vehicle_routes import vehicle_routes
from utils.optimization import optimization_routes, test_routes
from routes.report_routes import report_routes
from routes.predict_routes import predict_routes
from routes.alert_routes import alert_routes
from routes.train_routes import train_routes
from config.config import db

app = Flask(__name__)

CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:5173", "http://localhost:4000"]}},
    supports_credentials=True,
)
socketIo = SocketIO(
    app,
    cors_allowed_origins=["http://localhost:5173", "http://localhost:4000"],
    transports=["websocket", "polling"],  # ── FIX: explicitly allow both transports
)

app.register_blueprint(bin_routes, url_prefix="/api")
app.register_blueprint(vehicle_routes, url_prefix="/api")
app.register_blueprint(optimization_routes, url_prefix="/api")
app.register_blueprint(test_routes, url_prefix="/api")
app.register_blueprint(report_routes, url_prefix="/api")
app.register_blueprint(predict_routes, url_prefix="/api")
app.register_blueprint(alert_routes, url_prefix="/api")
app.register_blueprint(train_routes, url_prefix="/api")


@app.route("/")
def home():
    return "Smart Waste Management System Simulator"


@socketIo.on("update_bin")
def handle_bin_update(data):
    from ml.anomaly_detector import check_anomaly

    print(f"Bin update received: {data}")
    socketIo.emit("bin_update", data, broadcast=True)
    fill = data.get("fill_percentage", 0)
    result = check_anomaly(fill)
    if result["is_anomaly"]:
        socketIo.emit(
            "bin_alert",
            {
                "bin_id": data.get("bin_id"),
                "bin_label": data.get("bin_label", ""),
                "alert_type": result["alert_type"],
                "message": result["message"],
            },
            broadcast=True,
        )


@socketIo.on("update_route")
def handle_route_update(data):
    print(f"Route update received: {data}")
    socketIo.emit("route_update", data, broadcast=True)


@socketIo.on("citizen_report")
def handle_citizen_report(data):
    print(f"🚨 Citizen report received: {data}")
    bin_id = str(data.get("bin_id", ""))
    new_fill = data.get("fill_percentage") or data.get("reported_fill", 0)

    if not bin_id:
        print("❌ No bin_id in citizen report")
        return

    # Update bin in DB immediately (fast, sync)
    result = db.bins.update_one(
        {"bin_id": bin_id},
        {"$set": {"fill_percentage": new_fill}},
    )
    print(
        f"✅ DB update: matched={result.matched_count}, modified={result.modified_count}"
    )

    if result.matched_count == 0:
        from bson import ObjectId

        try:
            db.bins.update_one(
                {"_id": ObjectId(bin_id)},
                {"$set": {"fill_percentage": new_fill}},
            )
        except Exception:
            pass

    # ── FIX: run re-routing in background thread so socket isn't blocked ────
    def do_reroute():
        try:
            from utils.graph_building import multi_vehicle_routing_fast

            print("🔁 Fast re-routing in background thread...")
            new_routes = multi_vehicle_routing_fast()
            print(f"✅ {len(new_routes)} routes computed")
            socketIo.emit(
                "routes_updated",
                {
                    "routes": new_routes,
                    "triggered_by": "citizen_report",
                    "bin_id": bin_id,
                    "new_fill": new_fill,
                },
            )
            print("📡 routes_updated emitted")
        except Exception as e:
            print(f"❌ Reroute error: {e}")
            import traceback

            traceback.print_exc()

    import threading

    threading.Thread(target=do_reroute, daemon=True).start()


@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return "", 200


if __name__ == "__main__":
    socketIo.run(app, host="localhost", port=5000, debug=True)
