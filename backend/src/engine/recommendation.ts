/**
 * Walk-vs-Wait Recommendation Engine
 * 
 * Compares total journey time for walking vs taking the bus.
 * Uses historical boarding data to estimate demand.
 */

import { getDb } from '../db/database';

export interface RecommendationInput {
  pickupStopId: string;
  destinationStopId: string;
  walkingDurationMin: number;      // Direct walking time in minutes
  busEtaToPickupSec: number | null; // Seconds until bus reaches pickup
  busJourneyTimeSec: number | null; // Seconds for bus trip from pickup to destination stop
  finalWalkMin: number;            // Walking from destination stop to final destination
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

const SIMILAR_THRESHOLD_MIN = 2; // Within 2 minutes = similar

/**
 * Generate a walk-vs-wait recommendation.
 */
export function generateRecommendation(input: RecommendationInput): RecommendationResult {
  const dataLimitations: string[] = [];
  const demand = estimateDemand(input.pickupStopId);

  const walkingTotalMin = input.walkingDurationMin;

  // Check if bus data is available
  if (input.busEtaToPickupSec === null || input.busJourneyTimeSec === null) {
    return {
      outcome: 'INSUFFICIENT_DATA',
      walkingTotalMin,
      busTotalMin: null,
      busBreakdown: {
        waitMin: input.busEtaToPickupSec !== null ? Math.round(input.busEtaToPickupSec / 60 * 10) / 10 : null,
        rideMin: null,
        finalWalkMin: input.finalWalkMin,
      },
      timeDifferenceMin: null,
      demand,
      explanation: 'Bus arrival or journey time is unavailable. Walking time cannot be compared.',
      dataLimitations: ['Bus ETA or journey time unavailable'],
    };
  }

  const waitMin = input.busEtaToPickupSec / 60;
  const rideMin = input.busJourneyTimeSec / 60;
  const busTotalMin = waitMin + rideMin + input.finalWalkMin;

  const diff = walkingTotalMin - busTotalMin;
  const absDiff = Math.abs(diff);

  let outcome: RecommendationOutcome;
  let explanation: string;

  if (absDiff <= SIMILAR_THRESHOLD_MIN) {
    outcome = 'EITHER_SIMILAR';
    explanation = `Walking and taking the bus are estimated to take about the same time (difference: ${absDiff.toFixed(1)} min).`;
  } else if (diff > 0) {
    // Walking takes longer → bus is faster
    outcome = 'WAIT_FOR_BUS';
    explanation = `The bus is estimated to get you to your destination ${absDiff.toFixed(1)} minutes sooner.`;
  } else {
    // Bus takes longer → walking is faster
    outcome = 'WALK';
    explanation = `Walking is estimated to save approximately ${absDiff.toFixed(1)} minutes compared with the bus journey.`;
  }

  // Add demand context
  if (demand.level !== 'insufficient_data') {
    explanation += ` Demand at this stop is historically ${demand.level} for this time slot.`;
  }

  if (demand.confidence === 'low' || demand.confidence === 'none') {
    dataLimitations.push('Limited historical data for demand estimation');
  }

  return {
    outcome,
    walkingTotalMin: Math.round(walkingTotalMin * 10) / 10,
    busTotalMin: Math.round(busTotalMin * 10) / 10,
    busBreakdown: {
      waitMin: Math.round(waitMin * 10) / 10,
      rideMin: Math.round(rideMin * 10) / 10,
      finalWalkMin: input.finalWalkMin,
    },
    timeDifferenceMin: Math.round(absDiff * 10) / 10,
    demand,
    explanation,
    dataLimitations,
  };
}

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
export function estimateDemand(stopId: string, referenceDate?: Date): DemandEstimate {
  const now = referenceDate || new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dayNum = now.getDay(); // 0=Sun, 6=Sat
  const hour = now.getHours();
  const timeSlot = `${hour.toString().padStart(2, '0')}:00–${(hour + 1).toString().padStart(2, '0')}:00`;

  const db = getDb();

  // Level 1: Same weekday + same hour, last 4 weeks
  const exactMatch = db.prepare(`
    SELECT COUNT(*) as total FROM rfid_events
    WHERE stop_id = ? 
      AND authorized = 1
      AND CAST(strftime('%w', event_timestamp) AS INTEGER) = ?
      AND CAST(strftime('%H', event_timestamp) AS INTEGER) = ?
      AND event_timestamp >= datetime('now', '-28 days')
  `).get(stopId, dayNum, hour) as any;

  const exactWeeks = db.prepare(`
    SELECT COUNT(DISTINCT date(event_timestamp)) as days FROM rfid_events
    WHERE stop_id = ?
      AND authorized = 1
      AND CAST(strftime('%w', event_timestamp) AS INTEGER) = ?
      AND CAST(strftime('%H', event_timestamp) AS INTEGER) = ?
      AND event_timestamp >= datetime('now', '-28 days')
  `).get(stopId, dayNum, hour) as any;

  const exactCount = exactMatch?.total || 0;
  const exactDays = exactWeeks?.days || 0;

  if (exactDays >= 2) {
    const avg = exactCount / exactDays;
    return {
      level: categorizeLevel(avg),
      avgBoardings: Math.round(avg * 10) / 10,
      observationCount: exactCount,
      confidence: exactDays >= 3 ? 'high' : 'medium',
      explanation: `Based on ${exactCount} boardings across ${exactDays} ${dayOfWeek}s at this hour.`,
      timeSlot,
      dayOfWeek,
    };
  }

  // Level 2: Same hour, any day
  const hourMatch = db.prepare(`
    SELECT COUNT(*) as total FROM rfid_events
    WHERE stop_id = ?
      AND authorized = 1
      AND CAST(strftime('%H', event_timestamp) AS INTEGER) = ?
      AND event_timestamp >= datetime('now', '-28 days')
  `).get(stopId, hour) as any;

  const hourDays = db.prepare(`
    SELECT COUNT(DISTINCT date(event_timestamp)) as days FROM rfid_events
    WHERE stop_id = ?
      AND authorized = 1
      AND CAST(strftime('%H', event_timestamp) AS INTEGER) = ?
      AND event_timestamp >= datetime('now', '-28 days')
  `).get(stopId, hour) as any;

  const hourCount = hourMatch?.total || 0;
  const hourDaysCount = hourDays?.days || 0;

  if (hourDaysCount >= 2) {
    const avg = hourCount / hourDaysCount;
    return {
      level: categorizeLevel(avg),
      avgBoardings: Math.round(avg * 10) / 10,
      observationCount: hourCount,
      confidence: 'low',
      explanation: `Based on ${hourCount} boardings at this hour across ${hourDaysCount} days (any weekday). No ${dayOfWeek}-specific data.`,
      timeSlot,
      dayOfWeek,
    };
  }

  // Level 3: Global average for this stop
  const globalMatch = db.prepare(`
    SELECT COUNT(*) as total FROM rfid_events
    WHERE stop_id = ? AND authorized = 1
      AND event_timestamp >= datetime('now', '-28 days')
  `).get(stopId) as any;

  if ((globalMatch?.total || 0) > 0) {
    return {
      level: 'insufficient_data',
      avgBoardings: 0,
      observationCount: globalMatch.total,
      confidence: 'none',
      explanation: `Only ${globalMatch.total} total boardings recorded at this stop. Not enough time-specific data.`,
      timeSlot,
      dayOfWeek,
    };
  }

  return {
    level: 'insufficient_data',
    avgBoardings: 0,
    observationCount: 0,
    confidence: 'none',
    explanation: 'No boarding events recorded at this stop.',
    timeSlot,
    dayOfWeek,
  };
}

function categorizeLevel(avgBoardings: number): DemandEstimate['level'] {
  if (avgBoardings >= 6) return 'high';
  if (avgBoardings >= 3) return 'moderate';
  return 'low';
}
