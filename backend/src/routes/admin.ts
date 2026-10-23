import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';
import { requireAdmin } from '../middleware/auth';
import { config } from '../config';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { startSimulator, stopSimulator, isSimulatorRunning } from '../engine/simulator';

const router = Router();

// ── Login ──
router.post('/v1/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  if (username === config.admin.username && password === config.admin.password) {
    (req.session as any).isAdmin = true;
    res.json({ success: true, message: 'Logged in' });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.post('/v1/admin/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get('/v1/admin/session', (req: Request, res: Response) => {
  res.json({ isAdmin: !!(req.session as any)?.isAdmin });
});

// ── All admin routes below require authentication ──
router.use(requireAdmin);

// ── Overview ──
router.get('/v1/admin/overview', (_req: Request, res: Response) => {
  const db = getDb();
  
  const totalBuses = (db.prepare('SELECT COUNT(*) as c FROM buses').get() as any).c;
  const enabledBuses = (db.prepare('SELECT COUNT(*) as c FROM buses WHERE enabled = 1').get() as any).c;
  
  const staleTimeout = config.staleTimeoutSec;
  const onlineBuses = (db.prepare(`
    SELECT COUNT(*) as c FROM buses 
    WHERE enabled = 1 AND last_telemetry_at IS NOT NULL 
    AND (julianday('now') - julianday(last_telemetry_at)) * 86400 <= ?
  `).get(staleTimeout) as any).c;

  const totalRoutes = (db.prepare('SELECT COUNT(*) as c FROM routes WHERE active = 1').get() as any).c;
  const totalStops = (db.prepare('SELECT COUNT(*) as c FROM stops').get() as any).c;
  const totalCards = (db.prepare('SELECT COUNT(*) as c FROM authorized_cards').get() as any).c;
  const activeCards = (db.prepare('SELECT COUNT(*) as c FROM authorized_cards WHERE active = 1').get() as any).c;

  const recentEvents = db.prepare(`
    SELECT * FROM rfid_events ORDER BY event_timestamp DESC LIMIT 10
  `).all();

  const recentTelemetry = db.prepare(`
    SELECT * FROM telemetry ORDER BY server_timestamp DESC LIMIT 10
  `).all();

  const todayBoardings = (db.prepare(`
    SELECT COUNT(*) as c FROM rfid_events 
    WHERE authorized = 1 AND date(event_timestamp) = date('now')
  `).get() as any).c;

  const todayDenials = (db.prepare(`
    SELECT COUNT(*) as c FROM rfid_events 
    WHERE authorized = 0 AND date(event_timestamp) = date('now')
  `).get() as any).c;

  res.json({
    buses: { total: totalBuses, enabled: enabledBuses, online: onlineBuses, offline: enabledBuses - onlineBuses },
    routes: { total: totalRoutes },
    stops: { total: totalStops },
    cards: { total: totalCards, active: activeCards },
    today: { boardings: todayBoardings, denials: todayDenials },
    recentEvents,
    recentTelemetry,
    demoMode: config.demoMode,
    simulatorRunning: isSimulatorRunning(),
  });
});

// ── Bus CRUD ──
router.get('/v1/admin/buses', (_req: Request, res: Response) => {
  const db = getDb();
  const buses = db.prepare(`
    SELECT b.*, r.name as route_name FROM buses b 
    LEFT JOIN routes r ON b.route_id = r.id
    ORDER BY b.created_at DESC
  `).all();
  res.json({ buses });
});

router.post('/v1/admin/buses', (req: Request, res: Response) => {
  const { id, name, deviceId, routeId, enabled } = req.body;
  if (!id || !name) {
    res.status(400).json({ error: 'id and name are required' });
    return;
  }
  const db = getDb();
  try {
    db.prepare(`INSERT INTO buses (id, name, device_id, route_id, enabled) VALUES (?, ?, ?, ?, ?)`).run(
      id, name, deviceId || null, routeId || null, enabled !== false ? 1 : 0
    );
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(409).json({ error: e.message });
  }
});

router.put('/v1/admin/buses/:id', (req: Request, res: Response) => {
  const { name, deviceId, routeId, enabled } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE buses SET name = COALESCE(?, name), device_id = ?, route_id = ?, 
    enabled = COALESCE(?, enabled), updated_at = datetime('now')
    WHERE id = ?
  `).run(name, deviceId ?? null, routeId ?? null, enabled !== undefined ? (enabled ? 1 : 0) : null, req.params.id);
  res.json({ success: true });
});

router.delete('/v1/admin/buses/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM buses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Route CRUD ──
router.get('/v1/admin/routes', (_req: Request, res: Response) => {
  const db = getDb();
  const routes = db.prepare('SELECT * FROM routes ORDER BY created_at DESC').all();
  const result = (routes as any[]).map(r => {
    const stops = db.prepare(`
      SELECT s.*, rs.stop_order FROM route_stops rs 
      JOIN stops s ON rs.stop_id = s.id
      WHERE rs.route_id = ? ORDER BY rs.stop_order
    `).all(r.id);
    return { ...r, stops };
  });
  res.json({ routes: result });
});

router.post('/v1/admin/routes', (req: Request, res: Response) => {
  const { id, name, description, color, stopIds } = req.body;
  if (!id || !name) {
    res.status(400).json({ error: 'id and name are required' });
    return;
  }
  const db = getDb();
  try {
    db.prepare('INSERT INTO routes (id, name, description, color) VALUES (?, ?, ?, ?)').run(
      id, name, description || '', color || '#000000'
    );
    if (stopIds && Array.isArray(stopIds)) {
      const insertRS = db.prepare('INSERT INTO route_stops (route_id, stop_id, stop_order) VALUES (?, ?, ?)');
      stopIds.forEach((sid: string, i: number) => insertRS.run(id, sid, i + 1));
    }
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(409).json({ error: e.message });
  }
});

router.put('/v1/admin/routes/:id', (req: Request, res: Response) => {
  const { name, description, color, active, stopIds } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE routes SET name = COALESCE(?, name), description = COALESCE(?, description),
    color = COALESCE(?, color), active = COALESCE(?, active), updated_at = datetime('now')
    WHERE id = ?
  `).run(name, description, color, active !== undefined ? (active ? 1 : 0) : null, req.params.id);

  if (stopIds && Array.isArray(stopIds)) {
    db.prepare('DELETE FROM route_stops WHERE route_id = ?').run(req.params.id);
    const insertRS = db.prepare('INSERT INTO route_stops (route_id, stop_id, stop_order) VALUES (?, ?, ?)');
    stopIds.forEach((sid: string, i: number) => insertRS.run(req.params.id, sid, i + 1));
  }
  res.json({ success: true });
});

router.delete('/v1/admin/routes/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM route_stops WHERE route_id = ?').run(req.params.id);
  db.prepare('DELETE FROM routes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Stop CRUD ──
router.get('/v1/admin/stops', (_req: Request, res: Response) => {
  const db = getDb();
  const stops = db.prepare('SELECT * FROM stops ORDER BY name').all();
  res.json({ stops });
});

router.post('/v1/admin/stops', (req: Request, res: Response) => {
  const { id, name, latitude, longitude, description } = req.body;
  if (!id || !name || latitude === undefined || longitude === undefined) {
    res.status(400).json({ error: 'id, name, latitude, longitude are required' });
    return;
  }
  const db = getDb();
  try {
    db.prepare('INSERT INTO stops (id, name, latitude, longitude, description) VALUES (?, ?, ?, ?, ?)').run(
      id, name, latitude, longitude, description || ''
    );
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(409).json({ error: e.message });
  }
});

router.put('/v1/admin/stops/:id', (req: Request, res: Response) => {
  const { name, latitude, longitude, description } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE stops SET name = COALESCE(?, name), latitude = COALESCE(?, latitude),
    longitude = COALESCE(?, longitude), description = COALESCE(?, description),
    updated_at = datetime('now') WHERE id = ?
  `).run(name, latitude, longitude, description, req.params.id);
  res.json({ success: true });
});

router.delete('/v1/admin/stops/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM stops WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Card Management ──
router.get('/v1/admin/cards', (_req: Request, res: Response) => {
  const db = getDb();
  const cards = db.prepare('SELECT * FROM authorized_cards ORDER BY created_at DESC').all();
  // Mask tokens for display
  const masked = (cards as any[]).map(c => ({
    ...c,
    card_token_display: maskToken(c.card_token),
  }));
  res.json({ cards: masked });
});

router.post('/v1/admin/cards', (req: Request, res: Response) => {
  const { cardToken, alias } = req.body;
  if (!cardToken) {
    res.status(400).json({ error: 'cardToken is required' });
    return;
  }
  const db = getDb();
  const id = uuid();
  try {
    // Increment global sync version
    const maxV = (db.prepare('SELECT MAX(sync_version) as v FROM authorized_cards').get() as any)?.v || 0;
    db.prepare('INSERT INTO authorized_cards (id, card_token, alias, active, sync_version) VALUES (?, ?, ?, 1, ?)').run(
      id, cardToken, alias || '', maxV + 1
    );
    res.status(201).json({ success: true, id });
  } catch (e: any) {
    res.status(409).json({ error: e.message });
  }
});

router.put('/v1/admin/cards/:id', (req: Request, res: Response) => {
  const { alias, active } = req.body;
  const db = getDb();
  const maxV = (db.prepare('SELECT MAX(sync_version) as v FROM authorized_cards').get() as any)?.v || 0;
  db.prepare(`
    UPDATE authorized_cards SET alias = COALESCE(?, alias), active = COALESCE(?, active),
    sync_version = ?, updated_at = datetime('now') WHERE id = ?
  `).run(alias, active !== undefined ? (active ? 1 : 0) : null, maxV + 1, req.params.id);
  res.json({ success: true });
});

router.delete('/v1/admin/cards/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM authorized_cards WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Events ──
router.get('/v1/admin/events', (req: Request, res: Response) => {
  const { busId, eventType, authorized, limit, offset } = req.query;
  const db = getDb();
  
  let sql = 'SELECT * FROM rfid_events WHERE 1=1';
  const params: any[] = [];
  
  if (busId) { sql += ' AND bus_id = ?'; params.push(busId); }
  if (eventType) { sql += ' AND event_type = ?'; params.push(eventType); }
  if (authorized !== undefined) { sql += ' AND authorized = ?'; params.push(authorized === 'true' ? 1 : 0); }
  
  sql += ' ORDER BY event_timestamp DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit as string) || 50);
  params.push(parseInt(offset as string) || 0);

  const events = db.prepare(sql).all(...params);
  const total = (db.prepare('SELECT COUNT(*) as c FROM rfid_events').get() as any).c;
  
  res.json({ events, total });
});

// ── Crowd Observations ──
router.get('/v1/admin/crowd-observations', (req: Request, res: Response) => {
  const db = getDb();
  const observations = db.prepare(`
    SELECT co.*, s.name as stop_name 
    FROM crowd_observations co JOIN stops s ON co.stop_id = s.id
    ORDER BY co.observed_at DESC LIMIT 100
  `).all();
  res.json({ observations });
});

router.post('/v1/admin/crowd-observations', (req: Request, res: Response) => {
  const { stopId, count, notes } = req.body;
  if (!stopId || count === undefined) {
    res.status(400).json({ error: 'stopId and count are required' });
    return;
  }
  const db = getDb();
  db.prepare(`
    INSERT INTO crowd_observations (stop_id, observed_at, count, source, notes)
    VALUES (?, datetime('now'), ?, 'manual', ?)
  `).run(stopId, count, notes || '');
  res.json({ success: true });
});

// ── Simulator Control ──
router.post('/v1/admin/simulator/start', (_req: Request, res: Response) => {
  startSimulator();
  res.json({ success: true, running: true });
});

router.post('/v1/admin/simulator/stop', (_req: Request, res: Response) => {
  stopSimulator();
  res.json({ success: true, running: false });
});

router.get('/v1/admin/simulator/status', (_req: Request, res: Response) => {
  res.json({ running: isSimulatorRunning() });
});

// ── Analytics ──
router.get('/v1/admin/analytics', (_req: Request, res: Response) => {
  const db = getDb();

  const hourly = db.prepare(`
    SELECT CAST(strftime('%H', event_timestamp) AS INTEGER) as hour, COUNT(*) as count
    FROM rfid_events WHERE authorized = 1
    AND event_timestamp >= datetime('now', '-28 days')
    GROUP BY hour ORDER BY hour
  `).all();

  const daily = db.prepare(`
    SELECT CAST(strftime('%w', event_timestamp) AS INTEGER) as day, COUNT(*) as count
    FROM rfid_events WHERE authorized = 1
    AND event_timestamp >= datetime('now', '-28 days')
    GROUP BY day ORDER BY day
  `).all();

  const byStop = db.prepare(`
    SELECT re.stop_id, s.name as stop_name, COUNT(*) as count
    FROM rfid_events re LEFT JOIN stops s ON re.stop_id = s.id
    WHERE re.authorized = 1 AND re.event_timestamp >= datetime('now', '-28 days')
    GROUP BY re.stop_id ORDER BY count DESC
  `).all();

  const byBus = db.prepare(`
    SELECT bus_id, COUNT(*) as count
    FROM rfid_events WHERE authorized = 1
    AND event_timestamp >= datetime('now', '-28 days')
    GROUP BY bus_id ORDER BY count DESC
  `).all();

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  res.json({
    hourly: (hourly as any[]).map(h => ({ hour: h.hour, label: `${h.hour}:00`, count: h.count })),
    daily: (daily as any[]).map(d => ({ day: d.day, label: dayNames[d.day], count: d.count })),
    byStop,
    byBus,
  });
});

function maskToken(token: string): string {
  const parts = token.split(':');
  if (parts.length <= 2) return '**:**';
  return parts.slice(0, -2).map(() => '**').join(':') + ':' + parts.slice(-2).join(':');
}

export default router;
