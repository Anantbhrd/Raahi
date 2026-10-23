"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDemoData = seedDemoData;
const database_1 = require("./database");
const uuid_1 = require("uuid");
/**
 * Seeds the database with demonstration data.
 * All demo records are clearly marked with is_demo=1 where applicable.
 *
 * Demo campus: fictional "Rahi University" with a circular campus route.
 * Coordinates are in the Gulbarga/Kalaburagi region (Karnataka, India) as a
 * plausible campus setting near the coordinates from the Wokwi GPS simulator.
 */
function seedDemoData() {
    const db = (0, database_1.getDb)();
    // Check if already seeded
    const existing = db.prepare('SELECT COUNT(*) as count FROM routes').get();
    if (existing.count > 0)
        return;
    console.log('[SEED] Seeding demonstration data...');
    // ── Routes ──
    db.prepare(`INSERT INTO routes (id, name, description, color, active) VALUES (?, ?, ?, ?, ?)`).run('route-campus-loop', 'Campus Loop', 'Main circular route connecting all major campus buildings', '#000000', 1);
    db.prepare(`INSERT INTO routes (id, name, description, color, active) VALUES (?, ?, ?, ?, ?)`).run('route-express', 'Express Route', 'Direct route between Main Gate and Engineering Block', '#444444', 1);
    // ── Stops (along a campus loop near 17.32°N, 76.82°E) ──
    const stops = [
        { id: 'stop-main-gate', name: 'Main Gate', lat: 17.3200, lng: 76.8200 },
        { id: 'stop-library', name: 'Central Library', lat: 17.3215, lng: 76.8225 },
        { id: 'stop-science', name: 'Science Block', lat: 17.3235, lng: 76.8240 },
        { id: 'stop-engineering', name: 'Engineering Block', lat: 17.3250, lng: 76.8220 },
        { id: 'stop-cafeteria', name: 'Cafeteria', lat: 17.3245, lng: 76.8195 },
        { id: 'stop-hostel', name: 'Hostel Complex', lat: 17.3225, lng: 76.8180 },
        { id: 'stop-sports', name: 'Sports Ground', lat: 17.3210, lng: 76.8190 },
    ];
    const insertStop = db.prepare(`INSERT INTO stops (id, name, latitude, longitude) VALUES (?, ?, ?, ?)`);
    for (const s of stops) {
        insertStop.run(s.id, s.name, s.lat, s.lng);
    }
    // ── Route-Stop Assignments ──
    const insertRS = db.prepare(`INSERT INTO route_stops (route_id, stop_id, stop_order) VALUES (?, ?, ?)`);
    // Campus Loop: all stops in order
    stops.forEach((s, i) => insertRS.run('route-campus-loop', s.id, i + 1));
    // Express Route: Main Gate → Library → Engineering
    insertRS.run('route-express', 'stop-main-gate', 1);
    insertRS.run('route-express', 'stop-library', 2);
    insertRS.run('route-express', 'stop-engineering', 3);
    // ── Buses ──
    db.prepare(`INSERT INTO buses (id, name, device_id, route_id, enabled, latitude, longitude, speed_kmph, gps_fix, last_telemetry_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run('bus-01', 'Campus Bus 1', 'bus-unit-01', 'route-campus-loop', 1, 17.3205, 76.8210, 15, 1);
    db.prepare(`INSERT INTO buses (id, name, device_id, route_id, enabled, latitude, longitude, speed_kmph, gps_fix, last_telemetry_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run('bus-02', 'Campus Bus 2', 'bus-unit-02', 'route-campus-loop', 1, 17.3240, 76.8230, 12, 1);
    db.prepare(`INSERT INTO buses (id, name, device_id, route_id, enabled) VALUES (?, ?, ?, ?, ?)`).run('bus-03', 'Express Shuttle', 'bus-unit-03', 'route-express', 1);
    // ── Devices ──
    db.prepare(`INSERT INTO devices (id, bus_id, api_key, active) VALUES (?, ?, ?, ?)`).run('bus-unit-01', 'bus-01', 'demo-device-key-001', 1);
    db.prepare(`INSERT INTO devices (id, bus_id, api_key, active) VALUES (?, ?, ?, ?)`).run('bus-unit-02', 'bus-02', 'demo-device-key-001', 1);
    db.prepare(`INSERT INTO devices (id, bus_id, api_key, active) VALUES (?, ?, ?, ?)`).run('bus-unit-03', 'bus-03', 'demo-device-key-002', 1);
    // ── Authorized Cards ──
    const cards = [
        { id: (0, uuid_1.v4)(), token: '01:02:03:04', alias: 'Demo Student A' },
        { id: (0, uuid_1.v4)(), token: '11:22:33:44', alias: 'Demo Student B' },
        { id: (0, uuid_1.v4)(), token: 'AA:BB:CC:DD', alias: 'Demo Staff' },
        { id: (0, uuid_1.v4)(), token: 'DE:AD:BE:EF', alias: 'Demo Student C' },
    ];
    const insertCard = db.prepare(`INSERT INTO authorized_cards (id, card_token, alias, active) VALUES (?, ?, ?, 1)`);
    for (const c of cards) {
        insertCard.run(c.id, c.token, c.alias);
    }
    // ── Seed Historical RFID Events (last 7 days) ──
    const insertEvent = db.prepare(`
    INSERT INTO rfid_events (id, bus_id, card_token_masked, event_type, authorized, event_timestamp, stop_id, source, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'demo', 1)
  `);
    const now = new Date();
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const day = new Date(now);
        day.setDate(day.getDate() - dayOffset);
        // Generate events for each hour 7-19 with varying frequency
        for (let hour = 7; hour <= 19; hour++) {
            // Peak hours 8-10, 16-18 have more events
            const isPeak = (hour >= 8 && hour <= 10) || (hour >= 16 && hour <= 18);
            const eventCount = isPeak ? 5 + Math.floor(Math.abs(Math.sin(dayOffset + hour)) * 4) :
                1 + Math.floor(Math.abs(Math.cos(dayOffset + hour)) * 3);
            for (let e = 0; e < eventCount; e++) {
                const eventTime = new Date(day);
                eventTime.setHours(hour, Math.floor((e / eventCount) * 60), 0, 0);
                const cardIdx = (dayOffset + hour + e) % cards.length;
                const stopIdx = (dayOffset + hour + e) % stops.length;
                const busIdx = (dayOffset + e) % 2;
                const isAuthorized = e % 7 !== 6; // ~85% authorized
                insertEvent.run((0, uuid_1.v4)(), busIdx === 0 ? 'bus-01' : 'bus-02', maskToken(cards[cardIdx].token), isAuthorized ? 'boarding' : 'unauthorized_card', isAuthorized ? 1 : 0, eventTime.toISOString(), stops[stopIdx].id);
            }
        }
    }
    // ── Seed some crowd observations ──
    const insertCrowd = db.prepare(`
    INSERT INTO crowd_observations (stop_id, observed_at, count, source, notes)
    VALUES (?, ?, ?, 'demo', ?)
  `);
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
        const day = new Date(now);
        day.setDate(day.getDate() - dayOffset);
        for (const hour of [8, 9, 12, 17]) {
            const obsTime = new Date(day);
            obsTime.setHours(hour, 15, 0, 0);
            const count = hour >= 8 && hour <= 10 ? 8 + (dayOffset * 2) : 3 + dayOffset;
            insertCrowd.run(stops[(dayOffset + hour) % stops.length].id, obsTime.toISOString(), count, 'Demo observation');
        }
    }
    // ── Seed telemetry history ──
    const insertTelemetry = db.prepare(`
    INSERT INTO telemetry (device_id, bus_id, latitude, longitude, speed_kmph, gps_fix, event_type, server_timestamp, is_demo)
    VALUES (?, ?, ?, ?, ?, 1, 'periodic_location', ?, 1)
  `);
    for (let i = 0; i < 50; i++) {
        const t = new Date(now);
        t.setMinutes(t.getMinutes() - i * 5);
        const busId = i % 2 === 0 ? 'bus-01' : 'bus-02';
        const devId = i % 2 === 0 ? 'bus-unit-01' : 'bus-unit-02';
        const stopRef = stops[i % stops.length];
        insertTelemetry.run(devId, busId, stopRef.lat + (Math.sin(i * 0.3) * 0.001), stopRef.lng + (Math.cos(i * 0.3) * 0.001), 10 + Math.abs(Math.sin(i)) * 15, t.toISOString());
    }
    // ── App Config ──
    db.prepare(`INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)`).run('demo_mode', 'true');
    console.log('[SEED] Demonstration data seeded successfully.');
}
function maskToken(token) {
    const parts = token.split(':');
    if (parts.length <= 2)
        return '**:**';
    return parts.slice(0, -2).map(() => '**').join(':') + ':' + parts.slice(-2).join(':');
}
//# sourceMappingURL=seed.js.map