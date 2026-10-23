import { describe, it, expect } from 'vitest';
import { generateRecommendation, type RecommendationInput } from '../engine/recommendation';

describe('generateRecommendation', () => {
  it('recommends bus when significantly faster', () => {
    const input: RecommendationInput = {
      pickupStopId: 'stop-main-gate',
      destinationStopId: 'stop-engineering',
      walkingDurationMin: 15,
      busEtaToPickupSec: 120,  // 2 min wait
      busJourneyTimeSec: 300,  // 5 min ride
      finalWalkMin: 1,
    };
    const result = generateRecommendation(input);
    expect(result.outcome).toBe('WAIT_FOR_BUS');
    expect(result.busTotalMin).toBeCloseTo(8, 0);
    expect(result.walkingTotalMin).toBe(15);
    expect(result.timeDifferenceMin).toBeGreaterThan(5);
  });

  it('recommends walking when significantly faster', () => {
    const input: RecommendationInput = {
      pickupStopId: 'stop-main-gate',
      destinationStopId: 'stop-library',
      walkingDurationMin: 5,
      busEtaToPickupSec: 600,  // 10 min wait
      busJourneyTimeSec: 180,  // 3 min ride
      finalWalkMin: 0,
    };
    const result = generateRecommendation(input);
    expect(result.outcome).toBe('WALK');
    expect(result.timeDifferenceMin).toBeGreaterThan(5);
  });

  it('reports similar when times are close', () => {
    const input: RecommendationInput = {
      pickupStopId: 'stop-main-gate',
      destinationStopId: 'stop-library',
      walkingDurationMin: 10,
      busEtaToPickupSec: 180,  // 3 min wait
      busJourneyTimeSec: 300,  // 5 min ride
      finalWalkMin: 1,
    };
    const result = generateRecommendation(input);
    expect(result.outcome).toBe('EITHER_SIMILAR');
    expect(result.timeDifferenceMin).toBeLessThanOrEqual(2);
  });

  it('returns insufficient data when bus ETA unavailable', () => {
    const input: RecommendationInput = {
      pickupStopId: 'stop-main-gate',
      destinationStopId: 'stop-library',
      walkingDurationMin: 10,
      busEtaToPickupSec: null,
      busJourneyTimeSec: null,
      finalWalkMin: 0,
    };
    const result = generateRecommendation(input);
    expect(result.outcome).toBe('INSUFFICIENT_DATA');
    expect(result.busTotalMin).toBeNull();
  });

  it('handles missing bus journey time', () => {
    const input: RecommendationInput = {
      pickupStopId: 'stop-main-gate',
      destinationStopId: 'stop-library',
      walkingDurationMin: 10,
      busEtaToPickupSec: 120,
      busJourneyTimeSec: null,
      finalWalkMin: 0,
    };
    const result = generateRecommendation(input);
    expect(result.outcome).toBe('INSUFFICIENT_DATA');
  });

  it('includes final walk in bus total', () => {
    const input: RecommendationInput = {
      pickupStopId: 'stop-main-gate',
      destinationStopId: 'stop-engineering',
      walkingDurationMin: 20,
      busEtaToPickupSec: 120,   // 2 min
      busJourneyTimeSec: 300,   // 5 min  
      finalWalkMin: 5,          // 5 min final walk
    };
    const result = generateRecommendation(input);
    // Bus total: 2 + 5 + 5 = 12 min
    expect(result.busTotalMin).toBeCloseTo(12, 0);
    expect(result.busBreakdown.finalWalkMin).toBe(5);
  });

  it('provides transparent breakdown', () => {
    const input: RecommendationInput = {
      pickupStopId: 'stop-main-gate',
      destinationStopId: 'stop-library',
      walkingDurationMin: 12,
      busEtaToPickupSec: 300,
      busJourneyTimeSec: 240,
      finalWalkMin: 2,
    };
    const result = generateRecommendation(input);
    expect(result.busBreakdown.waitMin).toBe(5);
    expect(result.busBreakdown.rideMin).toBe(4);
    expect(result.busBreakdown.finalWalkMin).toBe(2);
    expect(result.explanation).toBeTruthy();
    expect(result.explanation.length).toBeGreaterThan(10);
  });
});
