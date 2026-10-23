"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const eta_1 = require("../engine/eta");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
/**
 * POST /api/v1/telemetry
 *
 * Accepts telemetry from ESP32 bus units.
 * Compatible with the firmware payload format:
 *   { bus_id, event, card_uid, gps_fix, latitude, longitude, uptime_ms }
 *
 * Also supports the extended format:
 *   { deviceId, busId, timestamp, gps: { fix, latitude, longitude, speedKmph },
 *     network: { registered, dataConnected }, rfidEvent: { ... } }
 */
router.post('/v1/telemetry', auth_1.authenticateDevice, (req, res) => {
    const body = req.body;
    const db = (0, database_1.getDb)();
    // ── Normalize payload (support both firmware and extended formats) ──
    let deviceId;
    let busId;
    let latitude;
    let longitude;
    let gpsFix;
    let speedKmph = null;
    let heading = null;
    let networkRegistered = null;
    let networkData = null;
    let eventType = 'periodic_location';
    let deviceTimestamp = null;
    let rfidEvent = null;
    if (body.gps && typeof body.gps === 'object') {
        // Extended format
        deviceId = body.deviceId;
        busId = body.busId;
        latitude = body.gps.latitude;
        longitude = body.gps.longitude;
        gpsFix = !!body.gps.fix;
        speedKmph = body.gps.speedKmph ?? null;
        heading = body.gps.heading ?? null;
        deviceTimestamp = body.timestamp || null;
        if (body.network) {
            networkRegistered = !!body.network.registered;
            networkData = !!body.network.dataConnected;
        }
        if (body.rfidEvent) {
            rfidEvent = body.rfidEvent;
        }
    }
    else {
        // Firmware format: { bus_id, event, card_uid, gps_fix, latitude, longitude, uptime_ms }
        deviceId = body.device_id || body.bus_id || '';
        busId = body.bus_id || '';
        latitude = body.latitude;
        longitude = body.longitude;
        gpsFix = !!body.gps_fix;
        eventType = body.event || 'periodic_location';
        // If firmware sent a boarding or unauthorized event with card_uid
        if (body.card_uid && (body.event === 'boarding' || body.event === 'unauthorized_card')) {
            rfidEvent = {
                cardToken: body.card_uid,
                eventType: body.event === 'boarding' ? 'BOARDING' : 'UNAUTHORIZED',
                authorized: body.event === 'boarding',
                timestamp: new Date().toISOString(),
            };
        }
    }
    // ── Validate required fields ──
    if (!busId) {
        res.status(400).json({ error: 'Missing bus_id or busId' });
        return;
    }
    // Validate coordinates if GPS fix is claimed
    if (gpsFix && !(0, eta_1.isValidCoordinate)(latitude, longitude)) {
        res.status(400).json({ error: 'Invalid coordinates with GPS fix' });
        return;
    }
    // Validate device timestamp if provided
    if (deviceTimestamp) {
        const parsed = new Date(deviceTimestamp);
        if (isNaN(parsed.getTime())) {
            res.status(400).json({ error: 'Invalid timestamp format' });
            return;
        }
        // Reject timestamps more than 1 day in the future
        if (parsed.getTime() > Date.now() + 86400000) {
            res.status(400).json({ error: 'Timestamp is too far in the future' });
            return;
        }
    }
    const now = new Date().toISOString();
    // ── Update bus position ──
    const bus = db.prepare('SELECT id FROM buses WHERE id = ?').get(busId);
    if (!bus) {
        // Auto-register unknown bus in development mode
        if (process.env.NODE_ENV === 'development') {
            db.prepare(`INSERT INTO buses (id, name, device_id, enabled) VALUES (?, ?, ?, 1)`).run(busId, busId, deviceId);
        }
        else {
            res.status(404).json({ error: 'Unknown bus ID' });
            return;
        }
    }
    if (gpsFix && latitude !== null && longitude !== null) {
        db.prepare(`
      UPDATE buses SET 
        latitude = ?, longitude = ?, speed_kmph = ?, heading = ?,
        gps_fix = 1, network_registered = ?, network_data = ?,
        last_telemetry_at = ?, updated_at = ?
      WHERE id = ?
    `).run(latitude, longitude, speedKmph, heading, networkRegistered !== null ? (networkRegistered ? 1 : 0) : null, networkData !== null ? (networkData ? 1 : 0) : null, now, now, busId);
    }
    else {
        db.prepare(`
      UPDATE buses SET 
        gps_fix = 0, network_registered = ?, network_data = ?,
        last_telemetry_at = ?, updated_at = ?
      WHERE id = ?
    `).run(networkRegistered !== null ? (networkRegistered ? 1 : 0) : null, networkData !== null ? (networkData ? 1 : 0) : null, now, now, busId);
    }
    // ── Record telemetry history ──
    db.prepare(`
    INSERT INTO telemetry (device_id, bus_id, latitude, longitude, speed_kmph, heading,
      gps_fix, network_registered, network_data, device_timestamp, server_timestamp, event_type, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(deviceId, busId, gpsFix ? latitude : null, gpsFix ? longitude : null, speedKmph, heading, gpsFix ? 1 : 0, networkRegistered !== null ? (networkRegistered ? 1 : 0) : null, networkData !== null ? (networkData ? 1 : 0) : null, deviceTimestamp, now, eventType);
    // ── Record RFID event (with deduplication) ──
    if (rfidEvent) {
        const eventId = rfidEvent.eventId || (0, uuid_1.v4)();
        const existing = db.prepare('SELECT id FROM rfid_events WHERE id = ?').get(eventId);
        if (!existing) {
            const maskedToken = maskCardToken(rfidEvent.cardToken || '');
            db.prepare(`
        INSERT INTO rfid_events (id, bus_id, card_token_masked, event_type, authorized, 
          event_timestamp, latitude, longitude, source, is_demo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'device', 0)
      `).run(eventId, busId, maskedToken, rfidEvent.eventType || 'BOARDING', rfidEvent.authorized ? 1 : 0, rfidEvent.timestamp || now, gpsFix ? latitude : null, gpsFix ? longitude : null);
        }
    }
    // Update device last seen
    db.prepare(`UPDATE devices SET last_seen_at = ? WHERE id = ?`).run(now, deviceId);
    res.json({
        status: 'ok',
        serverTimestamp: now,
        busId,
    });
});
/**
 * GET /api/v1/devices/:deviceId/allowlist
 * Returns the current authorized card list for device synchronization.
 */
router.get('/v1/devices/:deviceId/allowlist', auth_1.authenticateDevice, (req, res) => {
    const db = (0, database_1.getDb)();
    const deviceId = req.params.deviceId;
    // Verify device exists
    const device = db.prepare('SELECT * FROM devices WHERE id = ? AND active = 1').get(deviceId);
    if (!device) {
        res.status(404).json({ error: 'Device not found or inactive' });
        return;
    }
    // Get current sync version
    const maxVersion = db.prepare('SELECT MAX(sync_version) as v FROM authorized_cards').get();
    const cards = db.prepare(`
    SELECT card_token, active FROM authorized_cards WHERE active = 1
  `).all();
    res.json({
        deviceId,
        syncVersion: maxVersion?.v || 0,
        timestamp: new Date().toISOString(),
        cards: cards.map(c => ({
            token: c.card_token,
            active: !!c.active,
        })),
    });
});
function maskCardToken(token) {
    if (!token || token.length < 5)
        return '****';
    const parts = token.split(':');
    if (parts.length <= 2)
        return '**:**';
    return parts.slice(0, -2).map(() => '**').join(':') + ':' + parts.slice(-2).join(':');
}
exports.default = router;
//# sourceMappingURL=device.js.map