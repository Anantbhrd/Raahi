import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  findClosestStopIndex,
  remainingDistanceAlongRoute,
  calculateETAs,
  isValidCoordinate,
  getEffectiveSpeed,
  isStale,
  type RouteStop,
  type BusPosition,
} from '../engine/eta';

const testStops: RouteStop[] = [
  { stopId: 'A', name: 'Stop A', latitude: 17.3200, longitude: 76.8200, order: 1 },
  { stopId: 'B', name: 'Stop B', latitude: 17.3215, longitude: 76.8225, order: 2 },
  { stopId: 'C', name: 'Stop C', latitude: 17.3235, longitude: 76.8240, order: 3 },
  { stopId: 'D', name: 'Stop D', latitude: 17.3250, longitude: 76.8220, order: 4 },
];

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    const d = haversineDistance({ latitude: 17.32, longitude: 76.82 }, { latitude: 17.32, longitude: 76.82 });
    expect(d).toBe(0);
  });

  it('returns a plausible short distance', () => {
    const d = haversineDistance(
      { latitude: 17.3200, longitude: 76.8200 },
      { latitude: 17.3215, longitude: 76.8225 }
    );
    // Should be roughly 0.3 km for these nearby points
    expect(d).toBeGreaterThan(0.1);
    expect(d).toBeLessThan(1.0);
  });

  it('returns roughly 111 km for 1 degree of latitude', () => {
    const d = haversineDistance({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });
});

describe('findClosestStopIndex', () => {
  it('finds the correct closest stop', () => {
    const idx = findClosestStopIndex({ latitude: 17.3200, longitude: 76.8200 }, testStops);
    expect(idx).toBe(0);
  });

  it('finds a mid-route stop', () => {
    const idx = findClosestStopIndex({ latitude: 17.3236, longitude: 76.8241 }, testStops);
    expect(idx).toBe(2); // closest to Stop C
  });
});

describe('remainingDistanceAlongRoute', () => {
  it('returns zero-ish when bus is at the target stop', () => {
    const dist = remainingDistanceAlongRoute(
      { latitude: 17.3200, longitude: 76.8200 },
      testStops,
      0
    );
    expect(dist).toBeLessThan(0.01);
  });

  it('returns positive distance to a forward stop', () => {
    const dist = remainingDistanceAlongRoute(
      { latitude: 17.3200, longitude: 76.8200 },
      testStops,
      2
    );
    expect(dist).toBeGreaterThan(0);
  });

  it('handles empty stops', () => {
    const dist = remainingDistanceAlongRoute(
      { latitude: 17.32, longitude: 76.82 },
      [],
      0
    );
    expect(dist).toBe(0);
  });
});

describe('isValidCoordinate', () => {
  it('accepts valid coordinates', () => {
    expect(isValidCoordinate(17.32, 76.82)).toBe(true);
    expect(isValidCoordinate(0, 0)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
    expect(isValidCoordinate(90, 180)).toBe(true);
  });

  it('rejects invalid coordinates', () => {
    expect(isValidCoordinate(null, 76)).toBe(false);
    expect(isValidCoordinate(17, null)).toBe(false);
    expect(isValidCoordinate(91, 76)).toBe(false);
    expect(isValidCoordinate(17, 181)).toBe(false);
    expect(isValidCoordinate(NaN, 76)).toBe(false);
    expect(isValidCoordinate(undefined, undefined)).toBe(false);
  });
});

describe('getEffectiveSpeed', () => {
  it('uses GPS speed when valid', () => {
    const { speed, source } = getEffectiveSpeed(25, 20);
    expect(speed).toBe(25);
    expect(source).toBe('gps_speed');
  });

  it('falls back for zero speed', () => {
    const { speed, source } = getEffectiveSpeed(0, 20);
    expect(speed).toBe(20);
    expect(source).toBe('default_fallback');
  });

  it('falls back for null speed', () => {
    const { speed, source } = getEffectiveSpeed(null, 20);
    expect(speed).toBe(20);
    expect(source).toBe('default_fallback');
  });

  it('falls back for unreasonably high speed', () => {
    const { speed, source } = getEffectiveSpeed(200, 20);
    expect(speed).toBe(20);
    expect(source).toBe('default_fallback');
  });
});

describe('isStale', () => {
  it('returns false for recent timestamps', () => {
    expect(isStale(new Date().toISOString(), 60)).toBe(false);
  });

  it('returns true for old timestamps', () => {
    const old = new Date(Date.now() - 120000).toISOString();
    expect(isStale(old, 60)).toBe(true);
  });
});

describe('calculateETAs', () => {
  it('returns unavailable when no GPS fix', () => {
    const bus: BusPosition = {
      latitude: 17.32,
      longitude: 76.82,
      speedKmph: 20,
      gpsFix: false,
      lastUpdate: new Date().toISOString(),
    };

    const results = calculateETAs(bus, testStops, 20, 60);
    expect(results).toHaveLength(testStops.length);
    results.forEach(r => {
      expect(r.confidence).toBe('unavailable');
      expect(r.estimatedArrivalSec).toBeNull();
    });
  });

  it('calculates ETAs for a moving bus', () => {
    const bus: BusPosition = {
      latitude: 17.3200,
      longitude: 76.8200,
      speedKmph: 20,
      gpsFix: true,
      lastUpdate: new Date().toISOString(),
    };

    const results = calculateETAs(bus, testStops, 20, 60);
    expect(results).toHaveLength(testStops.length);
    
    // First stop should have very low ETA (bus is here)
    expect(results[0].estimatedArrivalSec).toBeLessThan(10);
    expect(results[0].confidence).toBe('high');
    
    // Later stops should have higher ETA
    expect(results[2].estimatedArrivalSec!).toBeGreaterThan(results[0].estimatedArrivalSec!);
  });

  it('marks stale bus positions', () => {
    const bus: BusPosition = {
      latitude: 17.3200,
      longitude: 76.8200,
      speedKmph: 20,
      gpsFix: true,
      lastUpdate: new Date(Date.now() - 120000).toISOString(),
    };

    const results = calculateETAs(bus, testStops, 20, 60);
    results.forEach(r => {
      expect(r.stale).toBe(true);
      expect(r.confidence).toBe('low');
    });
  });

  it('returns empty for no stops', () => {
    const bus: BusPosition = {
      latitude: 17.32,
      longitude: 76.82,
      speedKmph: 20,
      gpsFix: true,
      lastUpdate: new Date().toISOString(),
    };
    expect(calculateETAs(bus, [], 20, 60)).toHaveLength(0);
  });

  it('handles invalid coordinates', () => {
    const bus: BusPosition = {
      latitude: 999,
      longitude: 999,
      speedKmph: 20,
      gpsFix: true,
      lastUpdate: new Date().toISOString(),
    };
    const results = calculateETAs(bus, testStops, 20, 60);
    results.forEach(r => {
      expect(r.confidence).toBe('unavailable');
    });
  });
});
