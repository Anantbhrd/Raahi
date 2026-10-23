"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const config_1 = require("../config");
const eta_1 = require("../engine/eta");
const recommendation_1 = require("../engine/recommendation");
const recommendation_2 = require("../engine/recommendation");
const router = (0, express_1.Router)();
// ── Health ──
router.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        demoMode: config_1.config.demoMode,
        version: '1.0.0'
    });
});
// ── Buses ──
router.get('/v1/buses', (_req, res) => {
    const db = (0, database_1.getDb)();
    const buses = db.prepare(`
    SELECT b.*, r.name as route_name, r.color as route_color
    FROM buses b LEFT JOIN routes r ON b.route_id = r.id
    WHERE b.enabled = 1
  `).all();
    const staleTimeout = config_1.config.staleTimeoutSec * 1000;
    const now = Date.now();
    const result = buses.map(b => ({
        ...b,
        isStale: b.last_telemetry_at ? (now - new Date(b.last_telemetry_at).getTime()) > staleTimeout : true,
        isOnline: b.last_telemetry_at ? (now - new Date(b.last_telemetry_at).getTime()) <= staleTimeout : false,
    }));
    res.json({ buses: result, demoMode: config_1.config.demoMode });
});
router.get('/v1/buses/:busId', (req, res) => {
    const db = (0, database_1.getDb)();
    const bus = db.prepare(`
    SELECT b.*, r.name as route_name, r.color as route_color
    FROM buses b LEFT JOIN routes r ON b.route_id = r.id
    WHERE b.id = ?
  `).get(req.params.busId);
    if (!bus) {
        res.status(404).json({ error: 'Bus not found' });
        return;
    }
    const staleTimeout = config_1.config.staleTimeoutSec * 1000;
    const now = Date.now();
    const b = bus;
    res.json({
        ...b,
        isStale: b.last_telemetry_at ? (now - new Date(b.last_telemetry_at).getTime()) > staleTimeout : true,
        isOnline: b.last_telemetry_at ? (now - new Date(b.last_telemetry_at).getTime()) <= staleTimeout : false,
        demoMode: config_1.config.demoMode,
    });
});
// ── Routes ──
router.get('/v1/routes', (_req, res) => {
    const db = (0, database_1.getDb)();
    const routes = db.prepare(`SELECT * FROM routes WHERE active = 1`).all();
    const result = routes.map(r => {
        const stops = db.prepare(`
      SELECT s.*, rs.stop_order 
      FROM route_stops rs JOIN stops s ON rs.stop_id = s.id
      WHERE rs.route_id = ? ORDER BY rs.stop_order ASC
    `).all(r.id);
        return { ...r, stops };
    });
    res.json({ routes: result });
});
// ── Stops ──
router.get('/v1/stops', (_req, res) => {
    const db = (0, database_1.getDb)();
    const stops = db.prepare(`SELECT * FROM stops`).all();
    res.json({ stops });
});
// ── ETA ──
router.get('/v1/stops/:stopId/eta', (req, res) => {
    const db = (0, database_1.getDb)();
    const stopId = req.params.stopId;
    const stop = db.prepare(`SELECT * FROM stops WHERE id = ?`).get(stopId);
    if (!stop) {
        res.status(404).json({ error: 'Stop not found' });
        return;
    }
    // Find all routes that include this stop
    const routeStopRows = db.prepare(`
    SELECT rs.route_id FROM route_stops rs WHERE rs.stop_id = ?
  `).all(stopId);
    const etas = [];
    for (const rs of routeStopRows) {
        // Get all stops for this route
        const routeStops = db.prepare(`
      SELECT s.id as stopId, s.name, s.latitude, s.longitude, rs2.stop_order as "order"
      FROM route_stops rs2 JOIN stops s ON rs2.stop_id = s.id
      WHERE rs2.route_id = ? ORDER BY rs2.stop_order ASC
    `).all(rs.route_id);
        // Get buses on this route
        const buses = db.prepare(`
      SELECT * FROM buses WHERE route_id = ? AND enabled = 1
    `).all(rs.route_id);
        for (const bus of buses) {
            if (!bus.latitude || !bus.longitude)
                continue;
            const busPos = {
                latitude: bus.latitude,
                longitude: bus.longitude,
                speedKmph: bus.speed_kmph,
                gpsFix: !!bus.gps_fix,
                lastUpdate: bus.last_telemetry_at || new Date(0).toISOString(),
            };
            const busETAs = (0, eta_1.calculateETAs)(busPos, routeStops, config_1.config.eta.defaultSpeedKmph, config_1.config.staleTimeoutSec);
            const targetEta = busETAs.find(e => e.stopId === stopId);
            if (targetEta) {
                etas.push({
                    busId: bus.id,
                    busName: bus.name,
                    routeId: rs.route_id,
                    ...targetEta,
                });
            }
        }
    }
    // Sort by arrival time
    etas.sort((a, b) => (a.estimatedArrivalSec ?? Infinity) - (b.estimatedArrivalSec ?? Infinity));
    res.json({ stopId, etas, demoMode: config_1.config.demoMode });
});
// ── Recommendation ──
router.get('/v1/recommendation', (req, res) => {
    const { pickupStopId, destinationStopId, walkingMin, finalWalkMin } = req.query;
    if (!pickupStopId || !destinationStopId || !walkingMin) {
        res.status(400).json({ error: 'Required: pickupStopId, destinationStopId, walkingMin' });
        return;
    }
    const db = (0, database_1.getDb)();
    // Verify stops exist
    const pickup = db.prepare('SELECT * FROM stops WHERE id = ?').get(pickupStopId);
    const dest = db.prepare('SELECT * FROM stops WHERE id = ?').get(destinationStopId);
    if (!pickup || !dest) {
        res.status(404).json({ error: 'Stop not found' });
        return;
    }
    // Find best bus ETA to pickup stop
    const routeStopRows = db.prepare(`
    SELECT DISTINCT rs.route_id FROM route_stops rs 
    WHERE rs.stop_id = ?
  `).all(pickupStopId);
    let bestBusEta = null;
    let bestBusJourney = null;
    let bestBusId = null;
    for (const rs of routeStopRows) {
        // Check if destination is also on this route
        const destOnRoute = db.prepare(`
      SELECT 1 FROM route_stops WHERE route_id = ? AND stop_id = ?
    `).get(rs.route_id, destinationStopId);
        if (!destOnRoute)
            continue;
        const routeStops = db.prepare(`
      SELECT s.id as stopId, s.name, s.latitude, s.longitude, rs2.stop_order as "order"
      FROM route_stops rs2 JOIN stops s ON rs2.stop_id = s.id
      WHERE rs2.route_id = ? ORDER BY rs2.stop_order ASC
    `).all(rs.route_id);
        const buses = db.prepare(`
      SELECT * FROM buses WHERE route_id = ? AND enabled = 1 AND latitude IS NOT NULL
    `).all(rs.route_id);
        for (const bus of buses) {
            const busPos = {
                latitude: bus.latitude,
                longitude: bus.longitude,
                speedKmph: bus.speed_kmph,
                gpsFix: !!bus.gps_fix,
                lastUpdate: bus.last_telemetry_at || new Date(0).toISOString(),
            };
            const etas = (0, eta_1.calculateETAs)(busPos, routeStops, config_1.config.eta.defaultSpeedKmph, config_1.config.staleTimeoutSec);
            const pickupEta = etas.find(e => e.stopId === pickupStopId);
            const destEta = etas.find(e => e.stopId === destinationStopId);
            if (pickupEta?.estimatedArrivalSec !== null && destEta?.estimatedArrivalSec !== null) {
                const waitSec = pickupEta.estimatedArrivalSec;
                const journeySec = Math.max(0, destEta.estimatedArrivalSec - waitSec);
                if (bestBusEta === null || waitSec < bestBusEta) {
                    bestBusEta = waitSec;
                    bestBusJourney = journeySec;
                    bestBusId = bus.id;
                }
            }
        }
    }
    const result = (0, recommendation_1.generateRecommendation)({
        pickupStopId: pickupStopId,
        destinationStopId: destinationStopId,
        walkingDurationMin: parseFloat(walkingMin),
        busEtaToPickupSec: bestBusEta,
        busJourneyTimeSec: bestBusJourney,
        finalWalkMin: parseFloat(finalWalkMin || '0'),
    });
    res.json({ ...result, busId: bestBusId, demoMode: config_1.config.demoMode });
});
// ── Analytics ──
router.get('/v1/analytics/demand', (req, res) => {
    const { stopId } = req.query;
    const db = (0, database_1.getDb)();
    // Hourly boarding distribution
    const hourly = db.prepare(`
    SELECT CAST(strftime('%H', event_timestamp) AS INTEGER) as hour, COUNT(*) as count
    FROM rfid_events WHERE authorized = 1
    ${stopId ? 'AND stop_id = ?' : ''}
    AND event_timestamp >= datetime('now', '-28 days')
    GROUP BY hour ORDER BY hour
  `).all(...(stopId ? [stopId] : []));
    // Daily boarding distribution
    const daily = db.prepare(`
    SELECT CAST(strftime('%w', event_timestamp) AS INTEGER) as day, COUNT(*) as count
    FROM rfid_events WHERE authorized = 1
    ${stopId ? 'AND stop_id = ?' : ''}
    AND event_timestamp >= datetime('now', '-28 days')
    GROUP BY day ORDER BY day
  `).all(...(stopId ? [stopId] : []));
    // Per-stop totals
    const byStop = db.prepare(`
    SELECT stop_id, COUNT(*) as count
    FROM rfid_events WHERE authorized = 1
    AND event_timestamp >= datetime('now', '-28 days')
    GROUP BY stop_id ORDER BY count DESC
  `).all();
    // Current demand estimate if stop specified
    let currentDemand = null;
    if (stopId) {
        currentDemand = (0, recommendation_2.estimateDemand)(stopId);
    }
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    res.json({
        hourly: hourly.map(h => ({ hour: h.hour, label: `${h.hour}:00`, count: h.count })),
        daily: daily.map(d => ({ day: d.day, label: dayNames[d.day], count: d.count })),
        byStop,
        currentDemand,
        demoMode: config_1.config.demoMode,
    });
});
exports.default = router;
//# sourceMappingURL=public.js.map