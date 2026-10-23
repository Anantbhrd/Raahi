import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, Bus, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

export const ScheduleBoard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const totalMinutes = currentHour * 60 + currentMinute;

  // Morning: 9:00 (540 min) to 10:30 (630 min)
  const isMorningShift = totalMinutes >= 540 && totalMinutes <= 630;
  // Afternoon: 13:00 (780 min) to 14:30 (870 min)
  const isAfternoonShift = totalMinutes >= 780 && totalMinutes <= 870;
  const isOperational = isMorningShift || isAfternoonShift;

  const morningSlots = [
    { time: '09:00 AM', slotMin: 540 },
    { time: '09:15 AM', slotMin: 555 },
    { time: '09:30 AM', slotMin: 570 },
    { time: '09:45 AM', slotMin: 585 },
    { time: '10:00 AM', slotMin: 600 },
    { time: '10:15 AM', slotMin: 615 },
    { time: '10:30 AM', slotMin: 630 },
  ];

  const afternoonSlots = [
    { time: '01:00 PM', slotMin: 780 },
    { time: '01:15 PM', slotMin: 795 },
    { time: '01:30 PM', slotMin: 810 },
    { time: '01:45 PM', slotMin: 825 },
    { time: '02:00 PM', slotMin: 840 },
    { time: '02:15 PM', slotMin: 855 },
    { time: '02:30 PM', slotMin: 870 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Shift Status Hero Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--border-strong)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Clock size={20} />
              <h2 className="title-md" style={{ margin: 0 }}>CUK Shuttle Timetable & Operating Window</h2>
            </div>
            <p className="subtitle">
              Dedicated campus transportation schedule connecting Amarja & Narmada Hostels to CRC via Central Library.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-xs)',
              background: isOperational ? 'var(--text-primary)' : 'var(--bg-surface-2)',
              color: isOperational ? '#ffffff' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}>
              <span className="pulse-dot" style={{ backgroundColor: isOperational ? '#22c55e' : '#94a3b8' }}></span>
              <span>{isOperational ? 'ACTIVE SHIFT WINDOW' : 'OFF-PEAK SERVICE'}</span>
            </div>

            <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Allocation Summary */}
      <div className="grid-2">
        {/* Boys Hostel Fleet */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bus size={18} color="#1d4ed8" />
              <h3 className="title-md" style={{ margin: 0 }}>Boys Hostel Route (2 Buses)</h3>
            </div>
            <a
              href="https://maps.app.goo.gl/wJgDPzZqM5LqobBe9"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                textDecoration: 'none',
              }}
            >
              Route Map ↗
            </a>
          </div>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Shuttles <b>BH-01</b> & <b>BH-02</b> connect North Campus Amarja Hostel to Central Library and Class Room Complex (CRC).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.75rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-xs)' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1d4ed8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>1</div>
              <div style={{ flex: 1, fontSize: '0.825rem', fontWeight: 600 }}>Amarja Hostel (Origin)</div>
              <a href="https://maps.app.goo.gl/6PxbHHpPyDdk5YDz5" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }} title="View on Google Maps">
                <ExternalLink size={13} />
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.75rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-xs)' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>2</div>
              <div style={{ flex: 1, fontSize: '0.825rem', fontWeight: 600 }}>Central Library (En Route)</div>
              <a href="https://maps.app.goo.gl/uEzKxum5bD6tkUTw7" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }} title="View on Google Maps">
                <ExternalLink size={13} />
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.75rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-xs)' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>3</div>
              <div style={{ flex: 1, fontSize: '0.825rem', fontWeight: 600 }}>CRC Class Room Complex (Destination)</div>
              <a href="https://maps.app.goo.gl/ASMiLtxzsWiRYb36A" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }} title="View on Google Maps">
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>

        {/* Girls Hostel Fleet */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bus size={18} color="#db2777" />
              <h3 className="title-md" style={{ margin: 0 }}>Girls Hostel Route (2 Buses)</h3>
            </div>
            <a
              href="https://maps.app.goo.gl/HcHQKGyDsk91UNWN7"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#db2777',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                textDecoration: 'none',
              }}
            >
              Route Map ↗
            </a>
          </div>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Shuttles <b>GH-01</b> & <b>GH-02</b> connect South Campus Narmada Hostel to Central Library and Class Room Complex (CRC).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.75rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-xs)' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#db2777', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>1</div>
              <div style={{ flex: 1, fontSize: '0.825rem', fontWeight: 600 }}>Narmada Hostel (Origin)</div>
              <a href="https://maps.app.goo.gl/4S7URuMNWGWv8SoF7" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }} title="View on Google Maps">
                <ExternalLink size={13} />
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.75rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-xs)' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>2</div>
              <div style={{ flex: 1, fontSize: '0.825rem', fontWeight: 600 }}>Central Library (En Route)</div>
              <a href="https://maps.app.goo.gl/uEzKxum5bD6tkUTw7" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }} title="View on Google Maps">
                <ExternalLink size={13} />
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.75rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-xs)' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>3</div>
              <div style={{ flex: 1, fontSize: '0.825rem', fontWeight: 600 }}>CRC Class Room Complex (Destination)</div>
              <a href="https://maps.app.goo.gl/ASMiLtxzsWiRYb36A" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }} title="View on Google Maps">
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 15-Minute Departure Timetable Grid */}
      <div className="grid-2">
        {/* Morning Window */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 className="title-md" style={{ margin: 0 }}>Morning Shift: 09:00 AM – 10:30 AM</h3>
              <p className="subtitle">High-frequency classes commencement interval (every 15 mins)</p>
            </div>
            <span className="schedule-pill">15 MIN FREQ</span>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Departure</th>
                  <th>Boys Fleet (Amarja)</th>
                  <th>Girls Fleet (Narmada)</th>
                  <th>Arrival CRC</th>
                </tr>
              </thead>
              <tbody>
                {morningSlots.map((slot) => {
                  const isCurrent = totalMinutes >= slot.slotMin && totalMinutes < slot.slotMin + 15;
                  return (
                    <tr key={slot.time} style={{ background: isCurrent ? 'rgba(15, 23, 42, 0.05)' : 'transparent' }}>
                      <td className="mono" style={{ fontWeight: 700, color: isCurrent ? '#1d4ed8' : 'var(--text-primary)' }}>
                        {slot.time} {isCurrent ? '●' : ''}
                      </td>
                      <td>BH-01 / BH-02</td>
                      <td>GH-01 / GH-02</td>
                      <td className="mono" style={{ color: 'var(--text-secondary)' }}>+6 to 8 mins</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Afternoon Window */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 className="title-md" style={{ margin: 0 }}>Afternoon Shift: 01:00 PM – 02:30 PM</h3>
              <p className="subtitle">Post-lunch academic session interval (every 15 mins)</p>
            </div>
            <span className="schedule-pill">15 MIN FREQ</span>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Departure</th>
                  <th>Boys Fleet (Amarja)</th>
                  <th>Girls Fleet (Narmada)</th>
                  <th>Arrival CRC</th>
                </tr>
              </thead>
              <tbody>
                {afternoonSlots.map((slot) => {
                  const isCurrent = totalMinutes >= slot.slotMin && totalMinutes < slot.slotMin + 15;
                  return (
                    <tr key={slot.time} style={{ background: isCurrent ? 'rgba(15, 23, 42, 0.05)' : 'transparent' }}>
                      <td className="mono" style={{ fontWeight: 700, color: isCurrent ? '#db2777' : 'var(--text-primary)' }}>
                        {slot.time} {isCurrent ? '●' : ''}
                      </td>
                      <td>BH-01 / BH-02</td>
                      <td>GH-01 / GH-02</td>
                      <td className="mono" style={{ color: 'var(--text-secondary)' }}>+6 to 8 mins</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
