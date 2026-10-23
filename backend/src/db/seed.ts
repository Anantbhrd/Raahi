import { getDb } from './database';
import { v4 as uuid } from 'uuid';

/**
 * Seeds the database with Central University of Karnataka (CUK), Kalaburagi campus data.
 * Campus location: Kadaganchi, Aland Taluk, Kalaburagi (17.432°N, 76.672°E).
 * 
 * Routes:
 * 1. Boys Hostel Route: Amarja Hostel -> Central Library -> CRC Class Room Complex -> Amarja Hostel
 * 2. Girls Hostel Route: Narmada Hostel -> Central Library -> CRC Class Room Complex -> Narmada Hostel
 * 
 * Fleet: 4 Buses
 * - 2 for Boys Hostel: BH-01 (bus-b1), BH-02 (bus-b2)
 * - 2 for Girls Hostel: GH-01 (bus-g1), GH-02 (bus-g2)
 * 
 * Operating Timings:
 * - Morning: 09:00 AM - 10:30 AM (every 15 mins)
 * - Afternoon: 01:00 PM - 02:30 PM (every 15 mins)
 */
export function seedDemoData(): void {
  const db = getDb();
  
  // Check if already seeded with new routes
  const existingRoute = db.prepare("SELECT COUNT(*) as count FROM routes WHERE id = 'route-boys'").get() as any;
  if (existingRoute && existingRoute.count > 0) return;

  // Clear existing data to ensure clean CUK setup
  db.exec(`
    DELETE FROM route_stops;
    DELETE FROM telemetry;
    DELETE FROM rfid_events;
    DELETE FROM crowd_observations;
    DELETE FROM buses;
    DELETE FROM routes;
    DELETE FROM stops;
    DELETE FROM devices;
    DELETE FROM authorized_cards;
  `);

  console.log('[SEED] Seeding CUK campus data for RAAHI...');

  // ── Routes (Google Maps style: Royal Blue & Magenta) ──
  db.prepare(`INSERT INTO routes (id, name, description, color, active) VALUES (?, ?, ?, ?, ?)`).run(
    'route-boys', 'Boys Hostel Route', 'Amarja Hostel ↔ Central Library ↔ CRC Class Room Complex', '#1d4ed8', 1
  );
  db.prepare(`INSERT INTO routes (id, name, description, color, active) VALUES (?, ?, ?, ?, ?)`).run(
    'route-girls', 'Girls Hostel Route', 'Narmada Hostel ↔ Central Library ↔ CRC Class Room Complex', '#db2777', 1
  );

  // ── Stops (Verified Google Maps coordinates from CUK) ──
  const stops = [
    {
      id: 'stop-amarja',
      name: 'Amarja Hostel (Boys)',
      lat: 17.439068,
      lng: 76.674685,
      description: 'North Campus Boys Residential Complex'
    },
    {
      id: 'stop-narmada',
      name: 'Narmada Hostel (Girls)',
      lat: 17.424813,
      lng: 76.672557,
      description: 'South Campus Girls Residential Complex'
    },
    {
      id: 'stop-library',
      name: 'Central Library',
      lat: 17.433527,
      lng: 76.672281,
      description: 'CUK Central Academic Resource Center'
    },
    {
      id: 'stop-crc',
      name: 'CRC (Class Room Complex)',
      lat: 17.431569,
      lng: 76.670906,
      description: 'UG & PG Core Classroom Lecture Complex'
    },
  ];

  const insertStop = db.prepare(
    `INSERT INTO stops (id, name, latitude, longitude, description) VALUES (?, ?, ?, ?, ?)`
  );
  for (const s of stops) {
    insertStop.run(s.id, s.name, s.lat, s.lng, s.description);
  }

  // ── Route-Stop Assignments ──
  const insertRS = db.prepare(
    `INSERT INTO route_stops (route_id, stop_id, stop_order) VALUES (?, ?, ?)`
  );

  // Boys Route: Amarja (1) -> Central Library (2) -> CRC (3)
  insertRS.run('route-boys', 'stop-amarja', 1);
  insertRS.run('route-boys', 'stop-library', 2);
  insertRS.run('route-boys', 'stop-crc', 3);

  // Girls Route: Narmada (1) -> Central Library (2) -> CRC (3)
  insertRS.run('route-girls', 'stop-narmada', 1);
  insertRS.run('route-girls', 'stop-library', 2);
  insertRS.run('route-girls', 'stop-crc', 3);

  // ── 4 Buses (2 for Boys Hostel, 2 for Girls Hostel) ──
  const insertBus = db.prepare(`
    INSERT INTO buses (id, name, device_id, route_id, enabled, latitude, longitude, speed_kmph, heading, gps_fix, last_telemetry_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  // Boys Hostel Shuttles
  insertBus.run('bus-b1', 'BH-01 (Boys Shuttle 1)', 'bus-unit-b1', 'route-boys', 1, 17.4375, 76.6738, 18, 195, 1);
  insertBus.run('bus-b2', 'BH-02 (Boys Shuttle 2)', 'bus-unit-b2', 'route-boys', 1, 17.4325, 76.6715, 14, 210, 1);

  // Girls Hostel Shuttles
  insertBus.run('bus-g1', 'GH-01 (Girls Shuttle 1)', 'bus-unit-g1', 'route-girls', 1, 17.4265, 76.6724, 16, 15, 1);
  insertBus.run('bus-g2', 'GH-02 (Girls Shuttle 2)', 'bus-unit-g2', 'route-girls', 1, 17.4322, 76.6718, 12, 340, 1);

  // ── Devices Allowlist / API Keys ──
  const insertDevice = db.prepare(`INSERT INTO devices (id, bus_id, api_key, active) VALUES (?, ?, ?, ?)`);
  insertDevice.run('bus-unit-b1', 'bus-b1', 'demo-device-key-001', 1);
  insertDevice.run('bus-unit-b2', 'bus-b2', 'demo-device-key-001', 1);
  insertDevice.run('bus-unit-g1', 'bus-g1', 'demo-device-key-001', 1);
  insertDevice.run('bus-unit-g2', 'bus-g2', 'demo-device-key-001', 1);

  // ── Authorized RFID Smartcards (CUK Student ID cards) ──
  const cards = [
    { id: uuid(), token: '01:02:03:04', alias: 'CUK Student Pass (CSE)' },
    { id: uuid(), token: '11:22:33:44', alias: 'CUK Student Pass (ECE)' },
    { id: uuid(), token: 'AA:BB:CC:DD', alias: 'CUK Faculty Pass' },
    { id: uuid(), token: 'DE:AD:BE:EF', alias: 'CUK Research Scholar' },
  ];
  const insertCard = db.prepare(
    `INSERT INTO authorized_cards (id, card_token, alias, active) VALUES (?, ?, ?, 1)`
  );
  for (const c of cards) {
    insertCard.run(c.id, c.token, c.alias);
  }

  // ── Seed Historical RFID Events (Representing 9:00-10:30 & 13:00-14:30 schedule) ──
  const insertEvent = db.prepare(`
    INSERT INTO rfid_events (id, bus_id, card_token_masked, event_type, authorized, event_timestamp, stop_id, source, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'demo', 1)
  `);

  const now = new Date();
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);
    
    // Operating Hours: 9-10:30 AM (hours 9, 10) and 1-2:30 PM (hours 13, 14)
    for (let hour = 8; hour <= 18; hour++) {
      const isShiftTime = (hour === 9 || hour === 10 || hour === 13 || hour === 14);
      const eventCount = isShiftTime ? 8 + Math.floor(Math.abs(Math.sin(dayOffset + hour)) * 6) : 
                                       1 + Math.floor(Math.abs(Math.cos(dayOffset + hour)) * 2);

      for (let e = 0; e < eventCount; e++) {
        const eventTime = new Date(day);
        eventTime.setHours(hour, Math.floor((e / eventCount) * 60), 0, 0);
        const cardIdx = (dayOffset + hour + e) % cards.length;
        const stopIdx = (dayOffset + hour + e) % stops.length;
        const busList = ['bus-b1', 'bus-b2', 'bus-g1', 'bus-g2'];
        const busId = busList[(dayOffset + e) % busList.length];
        const isAuthorized = e % 8 !== 7;

        insertEvent.run(
          uuid(),
          busId,
          maskToken(cards[cardIdx].token),
          isAuthorized ? 'boarding' : 'unauthorized_card',
          isAuthorized ? 1 : 0,
          eventTime.toISOString(),
          stops[stopIdx].id
        );
      }
    }
  }

  // ── Seed Telemetry History for the 4 buses ──
  const insertTelemetry = db.prepare(`
    INSERT INTO telemetry (device_id, bus_id, latitude, longitude, speed_kmph, gps_fix, event_type, server_timestamp, is_demo)
    VALUES (?, ?, ?, ?, ?, 1, 'periodic_location', ?, 1)
  `);
  const busPairs = [
    { devId: 'bus-unit-b1', busId: 'bus-b1', baseStop: stops[0] }, // Amarja
    { devId: 'bus-unit-b2', busId: 'bus-b2', baseStop: stops[2] }, // Library
    { devId: 'bus-unit-g1', busId: 'bus-g1', baseStop: stops[1] }, // Narmada
    { devId: 'bus-unit-g2', busId: 'bus-g2', baseStop: stops[3] }, // CRC
  ];

  for (let i = 0; i < 40; i++) {
    const t = new Date(now);
    t.setMinutes(t.getMinutes() - i * 3);
    const pair = busPairs[i % busPairs.length];
    insertTelemetry.run(
      pair.devId, pair.busId,
      pair.baseStop.lat + (Math.sin(i * 0.4) * 0.0015),
      pair.baseStop.lng + (Math.cos(i * 0.4) * 0.0015),
      12 + Math.abs(Math.sin(i)) * 10,
      t.toISOString()
    );
  }

  // ── Configuration metadata ──
  db.prepare(`INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)`).run('campus_name', 'Central University of Karnataka');
  db.prepare(`INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)`).run('platform_name', 'RAAHI');
  
  console.log('[SEED] CUK demonstration data successfully initialized.');
}

function maskToken(token: string): string {
  const parts = token.split(':');
  if (parts.length <= 2) return '**:**';
  return parts.slice(0, -2).map(() => '**').join(':') + ':' + parts.slice(-2).join(':');
}
