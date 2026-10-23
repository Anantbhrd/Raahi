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
    lastUpdate: string;
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
/**
 * Haversine distance between two geographic points in kilometers.
 */
export declare function haversineDistance(a: Coordinate, b: Coordinate): number;
/**
 * Find the closest stop to the bus position along the route.
 * Returns the index into the stops array.
 */
export declare function findClosestStopIndex(bus: Coordinate, stops: RouteStop[]): number;
/**
 * Calculate remaining distance along the route from bus position to a target stop.
 * Uses stop-to-stop segments as the route polyline.
 *
 * Strategy:
 * 1. Find the closest stop to the bus
 * 2. Add distance from bus to closest stop
 * 3. Sum distances along subsequent stops to the target
 */
export declare function remainingDistanceAlongRoute(bus: Coordinate, stops: RouteStop[], targetStopIndex: number): number;
/**
 * Determine effective speed for ETA calculation.
 */
export declare function getEffectiveSpeed(busSpeed: number | null, defaultSpeedKmph: number): {
    speed: number;
    source: string;
};
/**
 * Check if a telemetry timestamp is stale.
 */
export declare function isStale(lastUpdate: string, staleTimeoutSec: number): boolean;
/**
 * Calculate ETA from a bus to each stop on its route.
 */
export declare function calculateETAs(bus: BusPosition, stops: RouteStop[], defaultSpeedKmph: number, staleTimeoutSec: number): ETAResult[];
/**
 * Validate geographic coordinates.
 */
export declare function isValidCoordinate(lat: number | null | undefined, lng: number | null | undefined): boolean;
//# sourceMappingURL=eta.d.ts.map