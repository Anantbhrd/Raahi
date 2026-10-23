/**
 * Demo Bus Simulator
 * 
 * Moves demo buses along actual CUK campus roads deterministically.
 * Follows exact road curves from Amarja & Narmada Hostels through Central Library to CRC.
 * All generated data is clearly marked as demo (is_demo=1).
 */

import { getDb } from '../db/database';
import { v4 as uuid } from 'uuid';
import { BOYS_ROUTE_LOOP, GIRLS_ROUTE_LOOP } from './campusRoutes';

interface SimState {
  busId: string;
  deviceId: string;
  routeId: string;
  waypoints: [number, number][]; // [lat, lng] array
  currentWaypointIndex: number;
  speedKmph: number;
}

let simulatorInterval: ReturnType<typeof setInterval> | null = null;
let simStates: SimState[] = [];

export function startSimulator(): void {
  if (simulatorInterval) return;

  const db = getDb();
  
  // Load buses that have routes
  const buses = db.prepare(`
    SELECT b.id as bus_id, b.device_id, b.route_id FROM buses b
    WHERE b.route_id IS NOT NULL AND b.enabled = 1
  `).all() as any[];

  simStates = [];

  for (let i = 0; i < buses.length; i++) {
    const bus = buses[i];
    const isBoys = bus.route_id === 'route-boys';
    const waypoints = isBoys ? BOYS_ROUTE_LOOP : GIRLS_ROUTE_LOOP;

    // Stagger buses along the road route
    const offset = bus.bus_id.endsWith('2') ? Math.floor(waypoints.length / 2) : 0;

    simStates.push({
      busId: bus.bus_id,
      deviceId: bus.device_id || bus.bus_id,
      routeId: bus.route_id,
      waypoints,
      currentWaypointIndex: offset,
      speedKmph: 18 + (i % 2) * 4,
    });
  }

  console.log(`[SIMULATOR] Started with ${simStates.length} demo buses on campus roads`);
  
  // Tick every 2.5 seconds
  simulatorInterval = setInterval(() => tick(), 2500);
  tick(); // Immediate first tick
}

export function stopSimulator(): void {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
    simStates = [];
    console.log('[SIMULATOR] Stopped');
  }
}

export function isSimulatorRunning(): boolean {
  return simulatorInterval !== null;
}

function calculateHeading(from: [number, number], to: [number, number]): number {
  const dLat = to[0] - from[0];
  const dLng = to[1] - from[1];
  const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  return Math.round((angle + 360) % 360);
}

function tick(): void {
  const db = getDb();
  const now = new Date().toISOString();

  for (const state of simStates) {
    // Advance to next waypoint
    const fromPt = state.waypoints[state.currentWaypointIndex];
    state.currentWaypointIndex = (state.currentWaypointIndex + 1) % state.waypoints.length;
    const toPt = state.waypoints[state.currentWaypointIndex];

    const lat = toPt[0];
    const lng = toPt[1];
    const heading = calculateHeading(fromPt, toPt);

    // Update bus position with realistic speed & road heading
    db.prepare(`
      UPDATE buses SET 
        latitude = ?, longitude = ?, speed_kmph = ?, heading = ?, gps_fix = 1,
        network_registered = 1, network_data = 1,
        last_telemetry_at = ?, updated_at = ?
      WHERE id = ?
    `).run(lat, lng, state.speedKmph, heading, now, now, state.busId);

    // Record telemetry
    db.prepare(`
      INSERT INTO telemetry (device_id, bus_id, latitude, longitude, speed_kmph, gps_fix, 
        network_registered, network_data, event_type, server_timestamp, is_demo)
      VALUES (?, ?, ?, ?, ?, 1, 1, 1, 'periodic_location', ?, 1)
    `).run(state.deviceId, state.busId, lat, lng, state.speedKmph, now);

    // Occasionally generate a demo boarding event (deterministic)
    const tickCount = Math.floor(Date.now() / 2500);
    if (tickCount % 16 === simStates.indexOf(state)) {
      const maskedToken = '**:**:DE:MO';
      const stopId = state.routeId === 'route-boys' ? 'stop-amarja' : 'stop-narmada';
      db.prepare(`
        INSERT INTO rfid_events (id, bus_id, card_token_masked, event_type, authorized, 
          event_timestamp, stop_id, source, is_demo)
        VALUES (?, ?, ?, 'boarding', 1, ?, ?, 'demo', 1)
      `).run(uuid(), state.busId, maskedToken, now, stopId);
    }
  }
}
