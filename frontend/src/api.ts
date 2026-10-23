import {
  Bus,
  Route,
  Stop,
  StopETA,
  Recommendation,
  DemandAnalytics,
  AdminOverview,
  AuthorizedCard,
  RFIDEvent,
  TelemetryPoint,
} from './types';

const BASE_URL = '/api';

export async function fetchHealth(): Promise<{ status: string; demoMode: boolean }> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchBuses(): Promise<{ buses: Bus[]; demoMode: boolean }> {
  const res = await fetch(`${BASE_URL}/v1/buses`);
  if (!res.ok) throw new Error('Failed to fetch buses');
  return res.json();
}

export async function fetchRoutes(): Promise<{ routes: Route[] }> {
  const res = await fetch(`${BASE_URL}/v1/routes`);
  if (!res.ok) throw new Error('Failed to fetch routes');
  return res.json();
}

export async function fetchStops(): Promise<{ stops: Stop[] }> {
  const res = await fetch(`${BASE_URL}/v1/stops`);
  if (!res.ok) throw new Error('Failed to fetch stops');
  return res.json();
}

export async function fetchStopETA(stopId: string): Promise<{ stopId: string; etas: StopETA[]; demoMode: boolean }> {
  const res = await fetch(`${BASE_URL}/v1/stops/${encodeURIComponent(stopId)}/eta`);
  if (!res.ok) throw new Error('Failed to fetch stop ETA');
  return res.json();
}

export async function fetchRecommendation(
  pickupStopId: string,
  destinationStopId: string,
  walkingMin: number,
  finalWalkMin: number = 0
): Promise<Recommendation> {
  const params = new URLSearchParams({
    pickupStopId,
    destinationStopId,
    walkingMin: walkingMin.toString(),
    finalWalkMin: finalWalkMin.toString(),
  });
  const res = await fetch(`${BASE_URL}/v1/recommendation?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch recommendation');
  return res.json();
}

export async function fetchDemandAnalytics(stopId?: string): Promise<DemandAnalytics> {
  const url = stopId
    ? `${BASE_URL}/v1/analytics/demand?stopId=${encodeURIComponent(stopId)}`
    : `${BASE_URL}/v1/analytics/demand`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch demand analytics');
  return res.json();
}

// ── Admin APIs ──

export async function checkAdminSession(): Promise<{ isAdmin: boolean }> {
  const res = await fetch(`${BASE_URL}/v1/admin/session`);
  if (!res.ok) return { isAdmin: false };
  return res.json();
}

export async function loginAdmin(username: string, password: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${BASE_URL}/v1/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Login failed');
  }
  return res.json();
}

export async function logoutAdmin(): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/v1/admin/logout`, { method: 'POST' });
  return res.json();
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const res = await fetch(`${BASE_URL}/v1/admin/overview`);
  if (!res.ok) throw new Error('Failed to fetch admin overview');
  return res.json();
}

export async function fetchAdminCards(): Promise<{ cards: AuthorizedCard[] }> {
  const res = await fetch(`${BASE_URL}/v1/admin/cards`);
  if (!res.ok) throw new Error('Failed to fetch cards');
  return res.json();
}

export async function addAdminCard(cardToken: string, alias: string): Promise<{ card: AuthorizedCard }> {
  const res = await fetch(`${BASE_URL}/v1/admin/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardToken, alias }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to add card');
  }
  return res.json();
}

export async function toggleAdminCard(cardId: string): Promise<{ card: AuthorizedCard }> {
  const res = await fetch(`${BASE_URL}/v1/admin/cards/${encodeURIComponent(cardId)}/toggle`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Failed to toggle card');
  return res.json();
}

export async function deleteAdminCard(cardId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/v1/admin/cards/${encodeURIComponent(cardId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete card');
  return res.json();
}

export async function fetchAdminEvents(limit: number = 30): Promise<{ events: RFIDEvent[] }> {
  const res = await fetch(`${BASE_URL}/v1/admin/events?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function fetchAdminTelemetry(limit: number = 30): Promise<{ telemetry: TelemetryPoint[] }> {
  const res = await fetch(`${BASE_URL}/v1/admin/telemetry?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch telemetry');
  return res.json();
}

export async function controlSimulator(action: 'start' | 'stop' | 'trigger-event', payload?: any): Promise<any> {
  const endpoint = action === 'trigger-event' ? 'trigger-event' : action;
  const res = await fetch(`${BASE_URL}/v1/admin/simulator/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) throw new Error(`Simulator action ${action} failed`);
  return res.json();
}

// ── Device Telemetry Simulator Tool (Hardware Integration Playground) ──
export async function sendSimulatedTelemetry(payload: any, deviceKey: string = 'demo-device-key-001'): Promise<any> {
  const res = await fetch(`${BASE_URL}/v1/telemetry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Key': deviceKey,
    },
    body: JSON.stringify(payload),
  });
  return { status: res.status, data: await res.json() };
}

export async function fetchDeviceAllowlist(deviceId: string, deviceKey: string = 'demo-device-key-001'): Promise<any> {
  const res = await fetch(`${BASE_URL}/v1/devices/${encodeURIComponent(deviceId)}/allowlist`, {
    headers: { 'X-Device-Key': deviceKey },
  });
  return { status: res.status, data: await res.json() };
}
