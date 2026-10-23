import React, { useState, useEffect } from 'react';
import { DemandAnalytics as DemandAnalyticsType, Stop } from '../types';
import { fetchDemandAnalytics } from '../api';
import {
  BarChart2,
  Calendar,
  Clock,
  TrendingUp,
  Users,
  RefreshCw,
  Info,
} from 'lucide-react';

interface DemandAnalyticsProps {
  stops: Stop[];
}

export const DemandAnalytics: React.FC<DemandAnalyticsProps> = ({ stops }) => {
  const [selectedStopId, setSelectedStopId] = useState<string>('');
  const [analytics, setAnalytics] = useState<DemandAnalyticsType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadData = async (stopId?: string) => {
    setIsLoading(true);
    try {
      const data = await fetchDemandAnalytics(stopId || undefined);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load demand analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedStopId);
  }, [selectedStopId]);

  const maxHourlyCount = Math.max(1, ...(analytics?.hourly.map((h) => h.count) || [1]));
  const maxDailyCount = Math.max(1, ...(analytics?.daily.map((d) => d.count) || [1]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
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
              <BarChart2 size={20} />
              <h2 className="title-md" style={{ margin: 0 }}>CUK Passenger Boarding Analytics</h2>
            </div>
            <p className="subtitle">
              RFID smartcard tap volumes across Morning (09:00–10:30) & Afternoon (13:00–14:30) operational shifts.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Filter Stop:
            </label>
            <select
              className="input-field"
              style={{ width: '230px', fontWeight: 600 }}
              value={selectedStopId}
              onChange={(e) => setSelectedStopId(e.target.value)}
            >
              <option value="">All CUK Stops (Amarja, Narmada, Lib, CRC)</option>
              {stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              className={`btn-icon ${isLoading ? 'spinning' : ''}`}
              onClick={() => loadData(selectedStopId)}
              title="Refresh Analytics"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Demand Estimation Banner (if stop selected) */}
      {analytics?.currentDemand && (
        <div className="glass-panel" style={{
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-xs)',
              background: 'var(--text-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Estimated Stop Congestion
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0' }}>
                Demand Level: {analytics.currentDemand.level}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {analytics.currentDemand.basis}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Historical Rate</div>
              <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {analytics.currentDemand.historicalAverage.toFixed(1)} / hr
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Score</div>
              <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {analytics.currentDemand.score}/100
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hourly Boarding Bar Chart */}
      <div className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h3 className="title-md" style={{ marginBottom: 2 }}>24-Hour Passenger Distribution</h3>
            <p className="subtitle">Notice concentration during 09:00–10:30 AM & 01:00–02:30 PM shift windows</p>
          </div>
          <Clock size={16} />
        </div>

        {analytics && analytics.hourly.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              height: '180px',
              gap: '6px',
              paddingTop: '1rem',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              {analytics.hourly.map((h) => {
                const heightPct = Math.max(4, Math.round((h.count / maxHourlyCount) * 100));
                const isShift = (h.hour === 9 || h.hour === 10 || h.hour === 13 || h.hour === 14);
                return (
                  <div
                    key={h.hour}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                    }}
                    title={`${h.label}: ${h.count} taps logged`}
                  >
                    <div style={{ fontSize: '10px', color: isShift ? '#0f172a' : 'var(--text-tertiary)', marginBottom: 4, fontWeight: isShift ? 700 : 500 }}>
                      {h.count > 0 ? h.count : ''}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: `${heightPct}%`,
                        background: isShift ? '#0f172a' : '#cbd5e1',
                        borderRadius: '2px 2px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '6px', paddingTop: '4px' }}>
              {analytics.hourly.map((h) => (
                <div key={h.hour} style={{ flex: 1, textAlign: 'center', fontSize: '9px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {h.hour % 3 === 0 ? `${h.hour}h` : ''}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="subtitle">No hourly boarding data available.</p>
        )}
      </div>

      {/* Daily Distribution & Stop Rankings */}
      <div className="grid-2">
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 className="title-md" style={{ margin: 0 }}>Day-of-Week Distribution</h3>
            <Calendar size={16} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {analytics?.daily.map((d) => {
              const widthPct = Math.max(5, Math.round((d.count / maxDailyCount) * 100));
              const isWeekend = d.day === 0 || d.day === 6;
              return (
                <div key={d.day}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: isWeekend ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                      {d.label} {isWeekend ? '(Reduced)' : ''}
                    </span>
                    <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                      {d.count} taps
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'var(--bg-surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${widthPct}%`,
                        height: '100%',
                        background: isWeekend ? '#94a3b8' : '#0f172a',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 className="title-md" style={{ margin: 0 }}>CUK Stops by Boarding Volume</h3>
            <TrendingUp size={16} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {analytics?.byStop.map((item, idx) => {
              const stopName = stops.find((s) => s.id === item.stop_id)?.name || item.stop_id;
              const maxStopCount = Math.max(1, ...(analytics.byStop.map((b) => b.count) || [1]));
              const pct = Math.round((item.count / maxStopCount) * 100);

              return (
                <div key={item.stop_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 2,
                    background: idx === 0 ? '#0f172a' : 'var(--bg-surface-3)',
                    color: idx === 0 ? '#ffffff' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 800,
                  }}>
                    #{idx + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{stopName}</span>
                      <span className="mono" style={{ color: 'var(--text-secondary)' }}>{item.count} taps</span>
                    </div>
                    <div style={{ width: '100%', height: 5, background: 'var(--bg-surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#0f172a' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Methodology Disclaimers */}
      <div className="glass-panel" style={{
        background: 'var(--bg-surface-2)',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}>
        <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-secondary)' }} />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Methodology Note:</strong> All passenger volumes are registered directly from physical/simulated RFID smartcard scan taps on the ESP32 bus unit.
          Historical averages represent a rolling 28-day window. In demonstration mode, seed data models typical CUK class interchange distributions (09:00–10:30 and 13:00–14:30 peaks). Live IoT hardware streams append new tap events instantaneously.
        </div>
      </div>
    </div>
  );
};
