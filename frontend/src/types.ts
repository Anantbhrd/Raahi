export interface Route {
  id: string;
  name: string;
  description: string;
  color: string;
  active: number;
  stops?: Stop[];
}

export interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  stop_order?: number;
}

export interface Bus {
  id: string;
  name: string;
  device_id: string;
  route_id: string | null;
  route_name?: string;
  route_color?: string;
  enabled: number;
  latitude: number | null;
  longitude: number | null;
  speed_kmph: number | null;
  heading: number | null;
  gps_fix: number;
  network_registered: number | null;
  network_data: number | null;
  last_telemetry_at: string | null;
  isStale: boolean;
  isOnline: boolean;
}

export interface StopETA {
  busId: string;
  busName: string;
  routeId: string;
  stopId: string;
  stopName: string;
  stopOrder: number;
  passed: boolean;
  distanceMeters: number;
  estimatedArrivalSec: number | null;
  estimatedArrivalMin: number | null;
  formattedETA: string;
  isStale: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Recommendation {
  recommendation: 'WAIT_FOR_BUS' | 'WALK' | 'SIMILAR' | 'INSUFFICIENT_DATA';
  summary: string;
  timeDifferenceMin: number;
  walking: {
    distanceMeters: number;
    durationMin: number;
    speedKmph: number;
  };
  bus: {
    waitMin: number | null;
    inTransitMin: number | null;
    finalWalkMin: number;
    totalMin: number | null;
    confidence: string;
  };
  busId?: string | null;
  demoMode?: boolean;
}

export interface DemandAnalytics {
  hourly: { hour: number; label: string; count: number }[];
  daily: { day: number; label: string; count: number }[];
  byStop: { stop_id: string; count: number }[];
  currentDemand: {
    stopId: string;
    level: 'LOW' | 'MODERATE' | 'HIGH';
    score: number;
    basis: string;
    historicalAverage: number;
    recentObservations: number;
  } | null;
  demoMode: boolean;
}

export interface AdminOverview {
  buses: { total: number; enabled: number; online: number; offline: number };
  routes: { total: number };
  stops: { total: number };
  cards: { total: number; active: number };
  today: { boardings: number; denials: number };
  recentEvents: RFIDEvent[];
  recentTelemetry: TelemetryPoint[];
  demoMode: boolean;
  simulatorRunning: boolean;
}

export interface RFIDEvent {
  id: string;
  bus_id: string;
  card_token_masked: string;
  event_type: string;
  authorized: number;
  event_timestamp: string;
  stop_id?: string;
  latitude?: number | null;
  longitude?: number | null;
  source: string;
  is_demo: number;
}

export interface TelemetryPoint {
  id: number;
  device_id: string;
  bus_id: string;
  latitude: number | null;
  longitude: number | null;
  speed_kmph: number | null;
  heading: number | null;
  gps_fix: number;
  network_registered: number | null;
  network_data: number | null;
  server_timestamp: string;
  event_type: string;
  is_demo: number;
}

export interface AuthorizedCard {
  id: string;
  card_token: string;
  alias: string;
  active: number;
  created_at: string;
  updated_at: string;
  sync_version: number;
}
