/**
 * Walk-vs-Wait Recommendation Engine
 *
 * Compares total journey time for walking vs taking the bus.
 * Uses historical boarding data to estimate demand.
 */
export interface RecommendationInput {
    pickupStopId: string;
    destinationStopId: string;
    walkingDurationMin: number;
    busEtaToPickupSec: number | null;
    busJourneyTimeSec: number | null;
    finalWalkMin: number;
}
export interface DemandEstimate {
    level: 'low' | 'moderate' | 'high' | 'insufficient_data';
    avgBoardings: number;
    observationCount: number;
    confidence: 'high' | 'medium' | 'low' | 'none';
    explanation: string;
    timeSlot: string;
    dayOfWeek: string;
}
export type RecommendationOutcome = 'WALK' | 'WAIT_FOR_BUS' | 'EITHER_SIMILAR' | 'INSUFFICIENT_DATA';
export interface RecommendationResult {
    outcome: RecommendationOutcome;
    walkingTotalMin: number;
    busTotalMin: number | null;
    busBreakdown: {
        waitMin: number | null;
        rideMin: number | null;
        finalWalkMin: number;
    };
    timeDifferenceMin: number | null;
    demand: DemandEstimate;
    explanation: string;
    dataLimitations: string[];
}
/**
 * Generate a walk-vs-wait recommendation.
 */
export declare function generateRecommendation(input: RecommendationInput): RecommendationResult;
/**
 * Estimate demand at a stop based on historical boarding events.
 *
 * Strategy:
 * 1. Try exact day-of-week + hour match
 * 2. Fall back to same hour, any day
 * 3. Fall back to global average
 *
 * RFID boardings are a proxy for demand, not an exact count.
 */
export declare function estimateDemand(stopId: string, referenceDate?: Date): DemandEstimate;
//# sourceMappingURL=recommendation.d.ts.map