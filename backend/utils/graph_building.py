import heapq
import openrouteservice
from bson.objectid import ObjectId
from dotenv import dotenv_values
from config.config import db
from flask import jsonify
import math

config = dotenv_values(".env")
ORS_API_KEY = config["ORS"]
client = openrouteservice.Client(key=ORS_API_KEY)


def haversine(coord1, coord2):
    """Returns distance in km between two (lng, lat) points"""
    R = 6371
    lng1, lat1 = math.radians(coord1[0]), math.radians(coord1[1])
    lng2, lat2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


def get_priority_score(fill_percentage):
    if fill_percentage >= 90:
        return 0.5
    elif fill_percentage >= 75:
        return 0.7
    elif fill_percentage >= 60:
        return 0.9
    else:
        return 1.2


def nearest_neighbour_sort(start_coord, bins):
    remaining = bins[:]
    sorted_bins = []
    current = start_coord

    while remaining:
        nearest = min(
            remaining, key=lambda b: haversine(current, (b["longitude"], b["latitude"]))
        )
        sorted_bins.append(nearest)
        current = (nearest["longitude"], nearest["latitude"])
        remaining.remove(nearest)

    return sorted_bins


def dijkstra_optimized_route(graph_data, vehicle, index_map_fills=None):
    graph = graph_data["graph"]
    index_map = graph_data["index_map"]
    start_node = 0
    vehicle_capacity = vehicle.get("load_capacity", 0)

    visited_states = set()
    pq = [(0, start_node, 0, frozenset([start_node]), [start_node])]

    best_result = {"route": [], "total_distance": float("inf"), "collected_fill": 0}

    while pq:
        dist, node, collected, visited, route = heapq.heappop(pq)

        if collected <= vehicle_capacity and collected > best_result["collected_fill"]:
            best_result = {
                "route": route,
                "total_distance": dist,
                "collected_fill": collected,
            }

        state = (node, collected, visited)
        if state in visited_states:
            continue
        visited_states.add(state)

        for neighbor in graph[node]:
            if neighbor in visited:
                continue

            neighbor_info = index_map[neighbor]
            extra_fill = neighbor_info["fill"] if neighbor_info["type"] == "bin" else 0
            new_fill = collected + extra_fill

            if new_fill > vehicle_capacity:
                continue

            fill_pct = neighbor_info.get("fill", 0)
            priority = get_priority_score(fill_pct)
            edge_cost = graph[node][neighbor] * priority

            heapq.heappush(
                pq,
                (
                    dist + edge_cost,
                    neighbor,
                    new_fill,
                    visited | {neighbor},
                    route + [neighbor],
                ),
            )

    return best_result


def multi_vehicle_routing(
    FILL_THRESHOLD=0,
):  # ← FIX: was 30, now 0 so ALL bins included
    all_results = []
    used_bin_ids = set()
    all_vehicles = list(db.vehicles.find())

    if not all_vehicles:
        return []

    # ── FIX: fetch ALL bins (threshold=0), sort by fill descending ──────────
    bins = list(db.bins.find({"fill_percentage": {"$gte": FILL_THRESHOLD}}))
    if not bins:
        return []

    # Sort highest fill first so priority bins are visited first
    bins.sort(key=lambda b: b.get("fill_percentage", 0), reverse=True)

    # FIX: pre-split bins evenly across vehicles so each gets some
    num_vehicles = len(all_vehicles)
    bins_per_vehicle = max(1, len(bins) // num_vehicles)

    for v_idx, vehicle in enumerate(all_vehicles):
        start_coord = (vehicle["longitude"], vehicle["latitude"])
        vehicle_capacity = vehicle["load_capacity"]

        available_bins = [b for b in bins if str(b["_id"]) not in used_bin_ids]
        if not available_bins:
            break

        # Give each vehicle its share — last vehicle gets any remainder
        if v_idx < num_vehicles - 1:
            available_bins = available_bins[:bins_per_vehicle]

        sorted_bins = nearest_neighbour_sort(start_coord, available_bins)

        coords = [start_coord] + [(b["longitude"], b["latitude"]) for b in sorted_bins]

        index_map = {
            0: {
                "type": "start",
                "id": str(vehicle["_id"]),
                "capacity": vehicle_capacity,
                "license": vehicle["vehicle_license"],
                "longitude": vehicle["longitude"],
                "latitude": vehicle["latitude"],
            }
        }
        for i, b in enumerate(sorted_bins, start=1):
            index_map[i] = {
                "type": "bin",
                "id": str(b["_id"]),
                "fill": b.get("fill_percentage", 0),
                "longitude": b["longitude"],
                "latitude": b["latitude"],
            }

        subgraph = {}
        time_matrix = {}

        for i in range(len(coords)):
            subgraph[i] = {}
            time_matrix[i] = {}
            for j in range(len(coords)):
                if i != j:
                    try:
                        route = client.directions(
                            [coords[i], coords[j]], profile="driving-car"
                        )
                        summary = route["routes"][0]["summary"]
                        dist = round(summary["distance"] / 1000, 2)
                        duration = round(summary["duration"] / 60, 1)
                        subgraph[i][j] = dist
                        time_matrix[i][j] = duration
                    except Exception as e:
                        print(f"ORS error {i}→{j}: {e}")
                        subgraph[i][j] = haversine(coords[i], coords[j])
                        time_matrix[i][j] = subgraph[i][j] * 2

        result = dijkstra_optimized_route(
            {"graph": subgraph, "index_map": index_map, "nodes": len(coords)}, vehicle
        )

        total_time = 0
        route_nodes = result["route"]
        for k in range(len(route_nodes) - 1):
            src = route_nodes[k]
            dst = route_nodes[k + 1]
            total_time += time_matrix.get(src, {}).get(dst, 0)

        used_bin_ids.update(
            [
                index_map[n]["id"]
                for n in result["route"]
                if index_map[n]["type"] == "bin"
            ]
        )

        route_bin_ids = [
            index_map[n]["id"] for n in result["route"] if index_map[n]["type"] == "bin"
        ]

        waypoints = []
        for n in result["route"]:
            node_info = index_map[n]
            waypoints.append(
                {
                    "type": node_info["type"],
                    "id": node_info["id"],
                    "latitude": node_info["latitude"],
                    "longitude": node_info["longitude"],
                    "fill": node_info.get("fill", 0),
                }
            )

        all_results.append(
            {
                "vehicle_id": str(vehicle["_id"]),
                "license": vehicle["vehicle_license"],
                "route_node_indices": result["route"],
                "route_bin_ids": route_bin_ids,
                "waypoints": waypoints,
                "total_distance_km": result["total_distance"],
                "total_time_min": round(total_time, 1),
                "collected_fill": result["collected_fill"],
                "bins_count": len(route_bin_ids),
            }
        )

    return all_results


def multi_vehicle_routing_fast():
    """
    Fast version using haversine only — no ORS API calls.
    Used for citizen report re-routing so it completes in <1 second.
    """
    all_results = []
    used_bin_ids = set()
    all_vehicles = list(db.vehicles.find())

    if not all_vehicles:
        return []

    bins = list(db.bins.find({"fill_percentage": {"$gte": 0}}))
    if not bins:
        return []

    bins.sort(key=lambda b: b.get("fill_percentage", 0), reverse=True)

    # FIX: split bins evenly across vehicles
    num_vehicles = len(all_vehicles)
    bins_per_vehicle = max(1, len(bins) // num_vehicles)

    for v_idx, vehicle in enumerate(all_vehicles):
        start_coord = (vehicle["longitude"], vehicle["latitude"])
        vehicle_capacity = vehicle["load_capacity"]

        available_bins = [b for b in bins if str(b["_id"]) not in used_bin_ids]
        if not available_bins:
            break

        if v_idx < num_vehicles - 1:
            available_bins = available_bins[:bins_per_vehicle]

        sorted_bins = nearest_neighbour_sort(start_coord, available_bins)
        coords = [start_coord] + [(b["longitude"], b["latitude"]) for b in sorted_bins]

        index_map = {
            0: {
                "type": "start",
                "id": str(vehicle["_id"]),
                "capacity": vehicle_capacity,
                "license": vehicle["vehicle_license"],
                "longitude": vehicle["longitude"],
                "latitude": vehicle["latitude"],
            }
        }
        for i, b in enumerate(sorted_bins, start=1):
            index_map[i] = {
                "type": "bin",
                "id": str(b["_id"]),
                "fill": b.get("fill_percentage", 0),
                "longitude": b["longitude"],
                "latitude": b["latitude"],
            }

        # Use haversine only — instant, no ORS API calls
        subgraph = {}
        for i in range(len(coords)):
            subgraph[i] = {}
            for j in range(len(coords)):
                if i != j:
                    subgraph[i][j] = haversine(coords[i], coords[j])

        result = dijkstra_optimized_route(
            {"graph": subgraph, "index_map": index_map, "nodes": len(coords)}, vehicle
        )

        used_bin_ids.update(
            [
                index_map[n]["id"]
                for n in result["route"]
                if index_map[n]["type"] == "bin"
            ]
        )
        route_bin_ids = [
            index_map[n]["id"] for n in result["route"] if index_map[n]["type"] == "bin"
        ]
        waypoints = []
        for n in result["route"]:
            node_info = index_map[n]
            waypoints.append(
                {
                    "type": node_info["type"],
                    "id": node_info["id"],
                    "latitude": node_info["latitude"],
                    "longitude": node_info["longitude"],
                    "fill": node_info.get("fill", 0),
                }
            )

        all_results.append(
            {
                "vehicle_id": str(vehicle["_id"]),
                "license": vehicle["vehicle_license"],
                "route_node_indices": result["route"],
                "route_bin_ids": route_bin_ids,
                "waypoints": waypoints,
                "total_distance_km": round(result["total_distance"], 2),
                "total_time_min": round(result["total_distance"] * 2, 1),
                "collected_fill": result["collected_fill"],
                "bins_count": len(route_bin_ids),
            }
        )

    return all_results


def compute_multi_vehicle_route():
    all_routes = multi_vehicle_routing()
    return jsonify({"routes": all_routes})
