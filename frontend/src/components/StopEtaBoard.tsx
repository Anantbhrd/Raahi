import React, { useState, useEffect } from 'react';
import { Stop, StopETA } from '../types';
import { fetchStopETA } from '../api';
import {
  Clock,
  MapPin,
  Bus,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface StopEtaBoardProps {
  stops: Stop[];
  selectedStopId?: string;
  onSelectStop?: (stopId: string) => void;
}

export const StopEtaBoard: React.FC<StopEtaBoardProps> = ({
  stops,
  selectedStopId,
  onSelectStop,
}) => {
  const [currentStopId, setCurrentStopId] = useState<string>(
    selectedStopId || (stops[0]?.id ?? 'stop-amarja')
  );
  const [etas, setEtas] = useState<StopETA[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    if (selectedStopId && selectedStopId !== currentStopId) {
      setCurrentStopId(selectedStopId);
    }
  }, [selectedStopId]);

  const loadETAs = async (stopId: string) => {
    setIsLoading(true);
    try {
      const data = await fetchStopETA(stopId);
      setEtas(data.etas || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load stop ETAs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentStopId) {
      loadETAs(currentStopId);
      const interval = setInterval(() => loadETAs(currentStopId), 3500);
      return () => clearInterval(interval);
    }
  }, [currentStopId]);

  const handleStopChange = (id: string) => {
    setCurrentStopId(id);
    if (onSelectStop) onSelectStop(id);
  };

  const currentStop = stops.find((s) => s.id === currentStopId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Schedule Advisory Strip */}
      <div className="schedule-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={15} />
          <strong style={{ color: 'var(--text-primary)' }}>Active Timings:</strong>
          <span>Morning: 09:00 AM – 10:30 AM • Afternoon: 01:00 PM – 02:30 PM (Every 15 mins)</span>
        </div>
        <div className="schedule-pill">4 CAMPUS SHUTTLES</div>
      </div>

      {/* Header & Stop Picker Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Clock size={18} />
              <h2 className="title-md" style={{ margin: 0 }}>Stop Arrival Countdown</h2>
            </div>
            <p className="subtitle">
              Live ETA computed from telemetry along CUK route corridors.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Select Stop:
            </label>
            <select
              className="input-field"
              style={{ width: '230px', fontWeight: 600 }}
              value={currentStopId}
              onChange={(e) => handleStopChange(e.target.value)}
            >
              {stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              className={`btn-icon ${isLoading ? 'spinning' : ''}`}
              onClick={() => loadETAs(currentStopId)}
              title="Refresh ETA"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {currentStop && (
          <div style={{
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.775rem',
            color: 'var(--text-tertiary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={13} />
              <span>CUK Coordinates: {currentStop.latitude.toFixed(4)}°N, {currentStop.longitude.toFixed(4)}°E</span>
            </div>
            <span>Updated: {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Incoming Buses List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {etas.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              color: 'var(--text-primary)',
            }}>
              <Bus size={24} />
            </div>
            <h3 className="title-md">No Shuttles Currently Approaching</h3>
            <p className="subtitle" style={{ maxWidth: '440px', margin: '0.5rem auto' }}>
              No active buses reporting en route to {currentStop?.name || 'this stop'}.
              Campus shuttles run during scheduled shift intervals (09:00–10:30 & 13:00–14:30).
            </p>
          </div>
        ) : (
          <div className="grid-2">
            {etas.map((eta, idx) => {
              const isFirst = idx === 0;
              const arrivalSec = eta.estimatedArrivalSec ?? 0;
              const minutes = Math.floor(arrivalSec / 60);
              const seconds = Math.floor(arrivalSec % 60);

              const formattedCountdown =
                arrivalSec <= 30
                  ? 'Arriving Now'
                  : `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

              const isBoys = eta.routeId === 'route-boys';
              const routeColor = isBoys ? '#1d4ed8' : '#db2777';

              return (
                <div
                  key={eta.busId}
                  className="glass-panel"
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderColor: isFirst ? 'var(--border-strong)' : 'var(--border-subtle)',
                  }}
                >
                  {isFirst && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      background: 'var(--text-primary)',
                      color: 'var(--bg-surface-1)',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '3px 10px',
                      borderBottomLeftRadius: '6px',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <Sparkles size={10} /> Next Arrival
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 'var(--radius-xs)',
                        background: isFirst ? routeColor : 'var(--bg-surface-2)',
                        color: isFirst ? '#ffffff' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        border: '1px solid var(--border-subtle)',
                      }}>
                        <Bus size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{eta.busName}</h4>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)' }}>
                          Route: <b style={{ color: routeColor }}>{eta.routeId === 'route-boys' ? 'Boys Route' : 'Girls Route'}</b>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '1.6rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-primary)',
                        lineHeight: 1.1,
                      }}>
                        {formattedCountdown}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        Est. Arrival
                      </div>
                    </div>
                  </div>

                  {/* Progress Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem',
                    background: 'var(--bg-surface-2)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: '0.85rem',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)' }}>Distance Left</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {eta.distanceMeters > 1000
                          ? `${(eta.distanceMeters / 1000).toFixed(2)} km`
                          : `${Math.round(eta.distanceMeters)} m`}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)' }}>Confidence</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {eta.confidence}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)' }}>Telemetry</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: eta.isStale ? 'var(--text-secondary)' : '#059669' }}>
                        {eta.isStale ? 'Standby' : 'Live Lock'}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.725rem',
                    color: 'var(--text-secondary)',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} />
                      Stop Sequence #{eta.stopOrder}
                    </span>
                    <span className="mono">{eta.formattedETA}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
