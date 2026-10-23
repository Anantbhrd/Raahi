import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';
import { config } from '../config';
import { calculateETAs, RouteStop, BusPosition } from '../engine/eta';
import { generateRecommendation } from '../engine/recommendation';
import { estimateDemand } from '../engine/recommendation';

const router = Router();

// ── Health ──
router.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    demoMode: config.demoMode,
    version: '1.0.0'
  });
});

// ── Buses ──
router.get('/v1/buses', (_req: Request, res: Response) => {
  const db = getDb();
  const buses = db.prepare(`
    SELECT b.*, r.name as route_name, r.color as route_color
    FROM buses b LEFT JOIN routes r ON b.route_id = r.id
    WHERE b.enabled = 1
  `).all();
  
  const staleTimeout = config.staleTimeoutSec * 1000;
  const now = Date.now();
  
  const result = (buses as any[]).map(b => ({
    ...b,
    isStale: b.last_telemetry_at ? (now - new Date(b.last_telemetry_at).getTime()) > staleTimeout : true,
    isOnline: b.last_telemetry_at ? (now - new Date(b.last_telemetry_at).getTime()) <= staleTimeout : false,
  }));

  res.json({ buses: result, demoMode: config.demoMode });
});

router.get('/v1/buses/:busId', (req: Request, res: Response) => {
  const db = getDb();
  const bus = db.prepare(`
    SELECT b.*, r.name as route_name, r.color as route_color
    FROM buses b LEFT JOIN routes r ON b.route_id = r.id
    WHERE b.id = ?
  `).get(req.params.busId);
  
  if (!bus) {
    res.status(404).json({ error: 'Bus not found' });
    return;
  }
  
  const staleTimeout = config.staleTimeoutSec * 1000;
  const now = Date.now();
  const b = bus as any;
  
  res.json({
    ...b,
    isStale: b.last_telemetry_at ? (now - new Date(b.last_telemetry_at).getTime()) > staleTimeout : true,
    isOnline: b.last_telemetry_at ? (now - new Date(b.last_telemetry_at).getTime()) <= staleTimeout : false,
    demoMode: config.demoMode,
  });
});

// ── Routes ──
router.get('/v1/routes', (_req: Request, res: Response) => {
  const db = getDb();
  const routes = db.prepare(`SELECT * FROM routes WHERE active = 1`).all();
  
  const result = (routes as any[]).map(r => {
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
router.get('/v1/stops', (_req: Request, res: Response) => {
  const db = getDb();
  const stops = db.prepare(`SELECT * FROM stops`).all();
  res.json({ stops });
});

// ── ETA ──
router.get('/v1/stops/:stopId/eta', (req: Request, res: Response) => {
  const db = getDb();
  const stopId = req.params.stopId;
  
  const stop = db.prepare(`SELECT * FROM stops WHERE id = ?`).get(stopId);
  if (!stop) {
    res.status(404).json({ error: 'Stop not found' });
    return;
  }

  // Find all routes that include this stop
  const routeStopRows = db.prepare(`
    SELECT rs.route_id FROM route_stops rs WHERE rs.stop_id = ?
  `).all(stopId) as any[];

  const etas: any[] = [];
  
  for (const rs of routeStopRows) {
    // Get all stops for this route
    const routeStops = db.prepare(`
      SELECT s.id as stopId, s.name, s.latitude, s.longitude, rs2.stop_order as "order"
      FROM route_stops rs2 JOIN stops s ON rs2.stop_id = s.id
      WHERE rs2.route_id = ? ORDER BY rs2.stop_order ASC
    `).all(rs.route_id) as RouteStop[];

    // Get buses on this route
    const buses = db.prepare(`
      SELECT * FROM buses WHERE route_id = ? AND enabled = 1
    `).all(rs.route_id) as any[];

    for (const bus of buses) {
      if (!bus.latitude || !bus.longitude) continue;
      
      const busPos: BusPosition = {
        latitude: bus.latitude,
        longitude: bus.longitude,
        speedKmph: bus.speed_kmph,
        gpsFix: !!bus.gps_fix,
        lastUpdate: bus.last_telemetry_at || new Date(0).toISOString(),
      };

      const busETAs = calculateETAs(busPos, routeStops, config.eta.defaultSpeedKmph, config.staleTimeoutSec);
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

  res.json({ stopId, etas, demoMode: config.demoMode });
});

// ── Recommendation ──
router.get('/v1/recommendation', (req: Request, res: Response) => {
  const { pickupStopId, destinationStopId, walkingMin, finalWalkMin } = req.query;
  
  if (!pickupStopId || !destinationStopId || !walkingMin) {
    res.status(400).json({ error: 'Required: pickupStopId, destinationStopId, walkingMin' });
    return;
  }

  const db = getDb();
  
  // Verify stops exist
  const pickup = db.prepare('SELECT * FROM stops WHERE id = ?').get(pickupStopId as string) as any;
  const dest = db.prepare('SELECT * FROM stops WHERE id = ?').get(destinationStopId as string) as any;
  if (!pickup || !dest) {
    res.status(404).json({ error: 'Stop not found' });
    return;
  }

  // Find best bus ETA to pickup stop
  const routeStopRows = db.prepare(`
    SELECT DISTINCT rs.route_id FROM route_stops rs 
    WHERE rs.stop_id = ?
  `).all(pickupStopId as string) as any[];

  let bestBusEta: number | null = null;
  let bestBusJourney: number | null = null;
  let bestBusId: string | null = null;

  for (const rs of routeStopRows) {
    // Check if destination is also on this route
    const destOnRoute = db.prepare(`
      SELECT 1 FROM route_stops WHERE route_id = ? AND stop_id = ?
    `).get(rs.route_id, destinationStopId as string);
    
    if (!destOnRoute) continue;

    const routeStops = db.prepare(`
      SELECT s.id as stopId, s.name, s.latitude, s.longitude, rs2.stop_order as "order"
      FROM route_stops rs2 JOIN stops s ON rs2.stop_id = s.id
      WHERE rs2.route_id = ? ORDER BY rs2.stop_order ASC
    `).all(rs.route_id) as RouteStop[];

    const buses = db.prepare(`
      SELECT * FROM buses WHERE route_id = ? AND enabled = 1 AND latitude IS NOT NULL
    `).all(rs.route_id) as any[];

    for (const bus of buses) {
      const busPos: BusPosition = {
        latitude: bus.latitude,
        longitude: bus.longitude,
        speedKmph: bus.speed_kmph,
        gpsFix: !!bus.gps_fix,
        lastUpdate: bus.last_telemetry_at || new Date(0).toISOString(),
      };

      const etas = calculateETAs(busPos, routeStops, config.eta.defaultSpeedKmph, config.staleTimeoutSec);
      const pickupEta = etas.find(e => e.stopId === pickupStopId);
      const destEta = etas.find(e => e.stopId === destinationStopId);

      if (pickupEta?.estimatedArrivalSec !== null && destEta?.estimatedArrivalSec !== null) {
        const waitSec = pickupEta!.estimatedArrivalSec!;
        const journeySec = Math.max(0, destEta!.estimatedArrivalSec! - waitSec);
        
        if (bestBusEta === null || waitSec < bestBusEta) {
          bestBusEta = waitSec;
          bestBusJourney = journeySec;
          bestBusId = bus.id;
        }
      }
    }
  }

  const result = generateRecommendation({
    pickupStopId: pickupStopId as string,
    destinationStopId: destinationStopId as string,
    walkingDurationMin: parseFloat(walkingMin as string),
    busEtaToPickupSec: bestBusEta,
    busJourneyTimeSec: bestBusJourney,
    finalWalkMin: parseFloat((finalWalkMin as string) || '0'),
  });

  res.json({ ...result, busId: bestBusId, demoMode: config.demoMode });
});

// ── Analytics ──
router.get('/v1/analytics/demand', (req: Request, res: Response) => {
  const { stopId } = req.query;
  const db = getDb();

  // Hourly boarding distribution
  const hourly = db.prepare(`
    SELECT CAST(strftime('%H', event_timestamp) AS INTEGER) as hour, COUNT(*) as count
    FROM rfid_events WHERE authorized = 1
    ${stopId ? 'AND stop_id = ?' : ''}
    AND event_timestamp >= datetime('now', '-28 days')
    GROUP BY hour ORDER BY hour
  `).all(...(stopId ? [stopId as string] : [])) as any[];

  // Daily boarding distribution
  const daily = db.prepare(`
    SELECT CAST(strftime('%w', event_timestamp) AS INTEGER) as day, COUNT(*) as count
    FROM rfid_events WHERE authorized = 1
    ${stopId ? 'AND stop_id = ?' : ''}
    AND event_timestamp >= datetime('now', '-28 days')
    GROUP BY day ORDER BY day
  `).all(...(stopId ? [stopId as string] : [])) as any[];

  // Per-stop totals
  const byStop = db.prepare(`
    SELECT stop_id, COUNT(*) as count
    FROM rfid_events WHERE authorized = 1
    AND event_timestamp >= datetime('now', '-28 days')
    GROUP BY stop_id ORDER BY count DESC
  `).all() as any[];

  // Current demand estimate if stop specified
  let currentDemand = null;
  if (stopId) {
    currentDemand = estimateDemand(stopId as string);
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  res.json({
    hourly: hourly.map(h => ({ hour: h.hour, label: `${h.hour}:00`, count: h.count })),
    daily: daily.map(d => ({ day: d.day, label: dayNames[d.day], count: d.count })),
    byStop,
    currentDemand,
    demoMode: config.demoMode,
  });
});

export default router;
