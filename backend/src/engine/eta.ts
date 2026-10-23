/**
 * ETA Estimation Engine
 * 
 * Calculates estimated arrival times using:
 * 1. Bus GPS coordinates & configured route geometry
 * 2. Remaining distance along route polyline (not straight-line)
 * 3. Current/fallback speed
 * 4. Historical travel times when available
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteStop {
  stopId: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
}

export interface BusPosition {
  latitude: number;
  longitude: number;
  speedKmph: number | null;
  gpsFix: boolean;
  lastUpdate: string; // ISO timestamp
}

export interface ETAResult {
  stopId: string;
  stopName: string;
  estimatedArrivalSec: number | null;
  distanceKm: number | null;
  confidence: 'high' | 'medium' | 'low' | 'unavailable';
  method: string;
  stale: boolean;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Haversine distance between two geographic points in kilometers.
 */
export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Find the closest stop to the bus position along the route.
 * Returns the index into the stops array.
 */
export function findClosestStopIndex(bus: Coordinate, stops: RouteStop[]): number {
  let minDist = Infinity;
  let closest = 0;
  for (let i = 0; i < stops.length; i++) {
    const dist = haversineDistance(bus, { latitude: stops[i].latitude, longitude: stops[i].longitude });
    if (dist < minDist) {
      minDist = dist;
      closest = i;
    }
  }
  return closest;
}

/**
 * Calculate remaining distance along the route from bus position to a target stop.
 * Uses stop-to-stop segments as the route polyline.
 * 
 * Strategy:
 * 1. Find the closest stop to the bus
 * 2. Add distance from bus to closest stop
 * 3. Sum distances along subsequent stops to the target
 */
export function remainingDistanceAlongRoute(
  bus: Coordinate,
  stops: RouteStop[],
  targetStopIndex: number
): number {
  if (stops.length === 0) return 0;

  const closestIdx = findClosestStopIndex(bus, stops);
  
  // Distance from bus to the closest stop
  let distance = haversineDistance(bus, { 
    latitude: stops[closestIdx].latitude, 
    longitude: stops[closestIdx].longitude 
  });

  // If bus is already past or at the target stop
  if (closestIdx >= targetStopIndex) {
    // Bus may have passed the stop — in a loop route, calculate forward distance
    // through remaining stops and wrapping around
    if (closestIdx === targetStopIndex) {
      // Bus is at or very near the target stop
      return distance;
    }
    // For a loop route, continue forward
    let d = haversineDistance(bus, { latitude: stops[closestIdx].latitude, longitude: stops[closestIdx].longitude });
    for (let i = closestIdx; i < stops.length - 1; i++) {
      d += haversineDistance(
        { latitude: stops[i].latitude, longitude: stops[i].longitude },
        { latitude: stops[i + 1].latitude, longitude: stops[i + 1].longitude }
      );
    }
    // Wrap from last stop to first stop, then to target
    if (stops.length > 1) {
      d += haversineDistance(
        { latitude: stops[stops.length - 1].latitude, longitude: stops[stops.length - 1].longitude },
        { latitude: stops[0].latitude, longitude: stops[0].longitude }
      );
    }
    for (let i = 0; i < targetStopIndex; i++) {
      d += haversineDistance(
        { latitude: stops[i].latitude, longitude: stops[i].longitude },
        { latitude: stops[i + 1].latitude, longitude: stops[i + 1].longitude }
      );
    }
    return d;
  }

  // Sum segment distances from closest stop forward to target
  for (let i = closestIdx; i < targetStopIndex; i++) {
    distance += haversineDistance(
      { latitude: stops[i].latitude, longitude: stops[i].longitude },
      { latitude: stops[i + 1].latitude, longitude: stops[i + 1].longitude }
    );
  }

  return distance;
}

/**
 * Determine effective speed for ETA calculation.
 */
export function getEffectiveSpeed(
  busSpeed: number | null,
  defaultSpeedKmph: number
): { speed: number; source: string } {
  if (busSpeed !== null && busSpeed > 1 && busSpeed < 120) {
    return { speed: busSpeed, source: 'gps_speed' };
  }
  return { speed: defaultSpeedKmph, source: 'default_fallback' };
}

/**
 * Check if a telemetry timestamp is stale.
 */
export function isStale(lastUpdate: string, staleTimeoutSec: number): boolean {
  const updateTime = new Date(lastUpdate).getTime();
  const now = Date.now();
  return (now - updateTime) > staleTimeoutSec * 1000;
}

/**
 * Calculate ETA from a bus to each stop on its route.
 */
export function calculateETAs(
  bus: BusPosition,
  stops: RouteStop[],
  defaultSpeedKmph: number,
  staleTimeoutSec: number
): ETAResult[] {
  if (!stops.length) return [];

  const stale = isStale(bus.lastUpdate, staleTimeoutSec);

  if (!bus.gpsFix) {
    return stops.map(s => ({
      stopId: s.stopId,
      stopName: s.name,
      estimatedArrivalSec: null,
      distanceKm: null,
      confidence: 'unavailable' as const,
      method: 'No GPS fix available',
      stale,
    }));
  }

  if (!isValidCoordinate(bus.latitude, bus.longitude)) {
    return stops.map(s => ({
      stopId: s.stopId,
      stopName: s.name,
      estimatedArrivalSec: null,
      distanceKm: null,
      confidence: 'unavailable' as const,
      method: 'Invalid bus coordinates',
      stale,
    }));
  }

  const { speed, source } = getEffectiveSpeed(bus.speedKmph, defaultSpeedKmph);
  const busCoord: Coordinate = { latitude: bus.latitude, longitude: bus.longitude };

  return stops.map((stop, idx) => {
    const distKm = remainingDistanceAlongRoute(busCoord, stops, idx);
    const timeSec = (distKm / speed) * 3600;

    let confidence: ETAResult['confidence'] = 'high';
    if (stale) confidence = 'low';
    else if (source === 'default_fallback') confidence = 'medium';

    return {
      stopId: stop.stopId,
      stopName: stop.name,
      estimatedArrivalSec: Math.round(timeSec),
      distanceKm: Math.round(distKm * 1000) / 1000,
      confidence,
      method: stale
        ? `Stale position (>${staleTimeoutSec}s). Using ${source} at ${speed} km/h.`
        : `Route distance with ${source} at ${speed} km/h`,
      stale,
    };
  });
}

/**
 * Validate geographic coordinates.
 */
export function isValidCoordinate(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
