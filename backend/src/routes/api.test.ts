import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { getDb } from '../db/database';

describe('Telemetry API', () => {
  it('rejects requests without device key', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry')
      .send({ bus_id: 'bus-01', event: 'periodic_location' });
    expect(res.status).toBe(401);
  });

  it('rejects invalid device key', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry')
      .set('X-Device-Key', 'wrong-key')
      .send({ bus_id: 'bus-01', event: 'periodic_location' });
    expect(res.status).toBe(403);
  });

  it('rejects missing bus_id', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry')
      .set('X-Device-Key', 'test-device-key')
      .send({ event: 'periodic_location' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid coordinates with GPS fix', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry')
      .set('X-Device-Key', 'test-device-key')
      .send({
        bus_id: 'bus-01',
        event: 'periodic_location',
        gps_fix: true,
        latitude: 999,
        longitude: 999,
      });
    expect(res.status).toBe(400);
  });

  it('accepts valid firmware-format telemetry', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry')
      .set('X-Device-Key', 'test-device-key')
      .send({
        bus_id: 'bus-b1',
        event: 'periodic_location',
        gps_fix: true,
        latitude: 17.4375,
        longitude: 76.6738,
        uptime_ms: 123456,
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.busId).toBe('bus-b1');
  });

  it('accepts valid extended-format telemetry', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry')
      .set('X-Device-Key', 'test-device-key')
      .send({
        deviceId: 'bus-unit-b1',
        busId: 'bus-b1',
        timestamp: new Date().toISOString(),
        gps: { fix: true, latitude: 17.4375, longitude: 76.6738, speedKmph: 18 },
        network: { registered: true, dataConnected: true },
      });
    expect(res.status).toBe(200);
  });

  it('processes boarding events via firmware format', async () => {
    const db = getDb();
    const beforeCount = (db.prepare('SELECT COUNT(*) as c FROM rfid_events WHERE is_demo = 0').get() as any).c;
    
    const res = await request(app)
      .post('/api/v1/telemetry')
      .set('X-Device-Key', 'test-device-key')
      .send({
        bus_id: 'bus-b1',
        event: 'boarding',
        card_uid: '01:02:03:04',
        gps_fix: true,
        latitude: 17.4375,
        longitude: 76.6738,
      });
    expect(res.status).toBe(200);

    const afterCount = (db.prepare('SELECT COUNT(*) as c FROM rfid_events WHERE is_demo = 0').get() as any).c;
    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  it('accepts GPS-unavailable telemetry', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry')
      .set('X-Device-Key', 'test-device-key')
      .send({
        bus_id: 'bus-b1',
        event: 'periodic_location',
        gps_fix: false,
        latitude: null,
        longitude: null,
      });
    expect(res.status).toBe(200);
  });
});

describe('Admin Authentication', () => {
  it('rejects unauthenticated admin requests', async () => {
    const res = await request(app).get('/api/v1/admin/overview');
    expect(res.status).toBe(401);
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/admin/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('accepts valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/admin/login')
      .send({ username: 'admin', password: 'testpass' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Device Allowlist', () => {
  it('rejects unauthenticated allowlist requests', async () => {
    const res = await request(app).get('/api/v1/devices/bus-unit-b1/allowlist');
    expect(res.status).toBe(401);
  });

  it('returns allowlist for authenticated device', async () => {
    const res = await request(app)
      .get('/api/v1/devices/bus-unit-b1/allowlist')
      .set('X-Device-Key', 'test-device-key');
    expect(res.status).toBe(200);
    expect(res.body.cards).toBeDefined();
    expect(Array.isArray(res.body.cards)).toBe(true);
    expect(res.body.syncVersion).toBeGreaterThan(0);
  });

  it('returns 404 for unknown device', async () => {
    const res = await request(app)
      .get('/api/v1/devices/nonexistent/allowlist')
      .set('X-Device-Key', 'test-device-key');
    expect(res.status).toBe(404);
  });
});

describe('Public Endpoints', () => {
  it('returns health status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns buses', async () => {
    const res = await request(app).get('/api/v1/buses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.buses)).toBe(true);
  });

  it('returns routes with stops', async () => {
    const res = await request(app).get('/api/v1/routes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.routes)).toBe(true);
    if (res.body.routes.length > 0) {
      expect(res.body.routes[0].stops).toBeDefined();
    }
  });

  it('returns stops', async () => {
    const res = await request(app).get('/api/v1/stops');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.stops)).toBe(true);
  });

  it('returns ETA for a stop', async () => {
    const res = await request(app).get('/api/v1/stops/stop-amarja/eta');
    expect(res.status).toBe(200);
    expect(res.body.stopId).toBe('stop-amarja');
    expect(Array.isArray(res.body.etas)).toBe(true);
  });

  it('returns 404 for unknown stop ETA', async () => {
    const res = await request(app).get('/api/v1/stops/nonexistent/eta');
    expect(res.status).toBe(404);
  });

  it('returns demand analytics', async () => {
    const res = await request(app).get('/api/v1/analytics/demand');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.hourly)).toBe(true);
    expect(Array.isArray(res.body.daily)).toBe(true);
  });
});
