"use strict";
/**
 * Demo Bus Simulator
 *
 * Moves demo buses along their configured routes deterministically.
 * All generated data is clearly marked as demo (is_demo=1).
 * Stops immediately when demo mode is disabled.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSimulator = startSimulator;
exports.stopSimulator = stopSimulator;
exports.isSimulatorRunning = isSimulatorRunning;
const database_1 = require("../db/database");
const uuid_1 = require("uuid");
let simulatorInterval = null;
let simStates = [];
function startSimulator() {
    if (simulatorInterval)
        return;
    const db = (0, database_1.getDb)();
    // Load buses that have routes
    const buses = db.prepare(`
    SELECT b.id as bus_id, b.device_id, b.route_id FROM buses b
    WHERE b.route_id IS NOT NULL AND b.enabled = 1
  `).all();
    simStates = [];
    for (const bus of buses) {
        const stops = db.prepare(`
      SELECT s.latitude as lat, s.longitude as lng, s.id as stopId, s.name
      FROM route_stops rs JOIN stops s ON rs.stop_id = s.id
      WHERE rs.route_id = ? ORDER BY rs.stop_order ASC
    `).all(bus.route_id);
        if (stops.length < 2)
            continue;
        simStates.push({
            busId: bus.bus_id,
            deviceId: bus.device_id || bus.bus_id,
            routeStops: stops,
            currentSegment: simStates.length % stops.length, // stagger buses
            segmentProgress: 0,
            speedKmph: 12 + (simStates.length * 3), // slightly different speeds
        });
    }
    console.log(`[SIMULATOR] Started with ${simStates.length} demo buses`);
    // Tick every 3 seconds
    simulatorInterval = setInterval(() => tick(), 3000);
    tick(); // Immediate first tick
}
function stopSimulator() {
    if (simulatorInterval) {
        clearInterval(simulatorInterval);
        simulatorInterval = null;
        simStates = [];
        console.log('[SIMULATOR] Stopped');
    }
}
function isSimulatorRunning() {
    return simulatorInterval !== null;
}
function tick() {
    const db = (0, database_1.getDb)();
    const now = new Date().toISOString();
    for (const state of simStates) {
        // Advance along route
        state.segmentProgress += 0.08; // Move 8% of segment per tick
        if (state.segmentProgress >= 1) {
            state.segmentProgress = 0;
            state.currentSegment = (state.currentSegment + 1) % state.routeStops.length;
        }
        // Interpolate position
        const fromStop = state.routeStops[state.currentSegment];
        const toStop = state.routeStops[(state.currentSegment + 1) % state.routeStops.length];
        const lat = fromStop.lat + (toStop.lat - fromStop.lat) * state.segmentProgress;
        const lng = fromStop.lng + (toStop.lng - fromStop.lng) * state.segmentProgress;
        // Update bus position
        db.prepare(`
      UPDATE buses SET 
        latitude = ?, longitude = ?, speed_kmph = ?, gps_fix = 1,
        network_registered = 1, network_data = 1,
        last_telemetry_at = ?, updated_at = ?
      WHERE id = ?
    `).run(lat, lng, state.speedKmph, now, now, state.busId);
        // Record telemetry
        db.prepare(`
      INSERT INTO telemetry (device_id, bus_id, latitude, longitude, speed_kmph, gps_fix, 
        network_registered, network_data, event_type, server_timestamp, is_demo)
      VALUES (?, ?, ?, ?, ?, 1, 1, 1, 'periodic_location', ?, 1)
    `).run(state.deviceId, state.busId, lat, lng, state.speedKmph, now);
        // Occasionally generate a demo boarding event (deterministic)
        const tick_count = Math.floor(Date.now() / 3000);
        if (tick_count % 20 === simStates.indexOf(state)) {
            const nearStop = state.routeStops[state.currentSegment];
            const maskedToken = '**:**:DE:MO';
            db.prepare(`
        INSERT INTO rfid_events (id, bus_id, card_token_masked, event_type, authorized, 
          event_timestamp, stop_id, source, is_demo)
        VALUES (?, ?, ?, 'boarding', 1, ?, ?, 'demo', 1)
      `).run((0, uuid_1.v4)(), state.busId, maskedToken, now, nearStop.stopId);
        }
    }
}
//# sourceMappingURL=simulator.js.map