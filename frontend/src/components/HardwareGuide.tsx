import React, { useState } from 'react';
import { sendSimulatedTelemetry, fetchDeviceAllowlist } from '../api';
import {
  Cpu,
  Radio,
  Zap,
  Terminal,
  Send,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export const HardwareGuide: React.FC = () => {
  const [testBusId, setTestBusId] = useState<string>('bus-b1');
  const [testEvent, setTestEvent] = useState<string>('boarding');
  const [testCardUid, setTestCardUid] = useState<string>('01:02:03:04');
  const [testLat, setTestLat] = useState<string>('17.439068');
  const [testLng, setTestLng] = useState<string>('76.674685');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [allowlistResult, setAllowlistResult] = useState<any>(null);

  const handleSendTelemetry = async () => {
    setIsSending(true);
    try {
      const payload: any = {
        bus_id: testBusId,
        event: testEvent,
        card_uid: testEvent === 'boarding' || testEvent === 'unauthorized_card' ? testCardUid : undefined,
        gps_fix: true,
        latitude: parseFloat(testLat),
        longitude: parseFloat(testLng),
        uptime_ms: Date.now() % 10000000,
      };
      const res = await sendSimulatedTelemetry(payload);
      setApiResponse(res);
    } catch (err: any) {
      setApiResponse({ error: err.message });
    } finally {
      setIsSending(false);
    }
  };

  const handleFetchAllowlist = async () => {
    try {
      const res = await fetchDeviceAllowlist('bus-unit-b1');
      setAllowlistResult(res);
    } catch (err: any) {
      setAllowlistResult({ error: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Intro Header */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-xs)',
            background: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
          }}>
            <Cpu size={18} />
          </div>
          <div>
            <h2 className="title-md" style={{ margin: 0 }}>Embedded Hardware & IoT Architecture</h2>
            <p className="subtitle">
              ESP32 Bus Unit pin mapping, SIM800L power demands, and RAAHI telemetry contract.
            </p>
          </div>
        </div>
      </div>

      {/* Pin Map Table & System Notes */}
      <div className="grid-2">
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className="title-md" style={{ margin: 0 }}>ESP32 GPIO Pin Assignments</h3>
            <Layers size={16} />
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Peripheral</th>
                  <th>Device Signal</th>
                  <th>ESP32 Pin</th>
                  <th>Bus / Voltage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>MFRC522 RFID</b></td>
                  <td>SS / SDA</td>
                  <td><span className="mono">GPIO 5</span></td>
                  <td>3.3V SPI</td>
                </tr>
                <tr>
                  <td><b>MFRC522 RFID</b></td>
                  <td>SCK</td>
                  <td><span className="mono">GPIO 18</span></td>
                  <td>3.3V SPI</td>
                </tr>
                <tr>
                  <td><b>MFRC522 RFID</b></td>
                  <td>MOSI / MISO</td>
                  <td><span className="mono">GPIO 23 / 19</span></td>
                  <td>3.3V SPI</td>
                </tr>
                <tr>
                  <td><b>MFRC522 RFID</b></td>
                  <td>RST</td>
                  <td><span className="mono">GPIO 4</span></td>
                  <td>3.3V Digital Out</td>
                </tr>
                <tr>
                  <td><b>NEO-6M GPS</b></td>
                  <td>TX ➜ ESP32 RX</td>
                  <td><span className="mono">GPIO 16</span></td>
                  <td>UART2 (9600 baud)</td>
                </tr>
                <tr>
                  <td><b>NEO-6M GPS</b></td>
                  <td>RX ⮜ ESP32 TX</td>
                  <td><span className="mono">GPIO 17</span></td>
                  <td>UART2</td>
                </tr>
                <tr>
                  <td><b>SIM800L GSM</b></td>
                  <td>TX ➜ ESP32 RX</td>
                  <td><span className="mono">GPIO 26</span></td>
                  <td>UART1 (9600 baud)</td>
                </tr>
                <tr>
                  <td><b>SIM800L GSM</b></td>
                  <td>RX ⮜ ESP32 TX</td>
                  <td><span className="mono">GPIO 27</span></td>
                  <td>UART1</td>
                </tr>
                <tr>
                  <td><b>16x2 I2C LCD</b></td>
                  <td>SDA / SCL</td>
                  <td><span className="mono">GPIO 21 / 22</span></td>
                  <td>I2C (0x27)</td>
                </tr>
                <tr>
                  <td><b>Status LED</b></td>
                  <td>Anode (+220Ω)</td>
                  <td><span className="mono">GPIO 14</span></td>
                  <td>Digital Out</td>
                </tr>
                <tr>
                  <td><b>Feedback Buzzer</b></td>
                  <td>Positive lead</td>
                  <td><span className="mono">GPIO 25</span></td>
                  <td>PWM Tone Out</td>
                </tr>
                <tr>
                  <td><b>Manual Sync Button</b></td>
                  <td>Switch to GND</td>
                  <td><span className="mono">GPIO 32</span></td>
                  <td>INPUT_PULLUP</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Electrical & Integration Constraints */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
            <h3 className="title-md" style={{ margin: 0 }}>Physical Deployment Constraints</h3>
            <Zap size={16} />
          </div>

          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.825rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              <Zap size={14} color="#eab308" /> SIM800L Power Demand (2.0A Surge Bursts)
            </div>
            The GSM cellular radio generates periodic 2.0 Amp RF transmission current bursts. 
            Do <b>never</b> power the SIM800L directly from the ESP32 3.3V or 5V regulator pin. 
            Use an external step-down buck converter (3.8V–4.2V) or dedicated 18650 Li-ion cell with a 1000µF low-ESR capacitor placed directly across the modem's VCC and GND pins.
          </div>

          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.825rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              <Radio size={14} color="#1d4ed8" /> GPS Cold Start & Satellite Fix
            </div>
            Allow 30 to 45 seconds outdoors for initial ephemeris acquisition. The ESP32 firmware monitors the PPS pulse and NMEA <code>$GPRMC</code> fix validity flag before asserting valid GPS telemetry.
          </div>

          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.825rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              <CheckCircle2 size={14} color="#059669" /> I2C Level Shifter Protection
            </div>
            Ensure 5V I2C LCD pull-up resistors do not drive ESP32 GPIO 21 and 22 beyond 3.3V. Use a bidirectional 4-channel logic level shifter.
          </div>
        </div>
      </div>

      {/* Telemetry Playground */}
      <div className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 className="title-md" style={{ marginBottom: 2 }}>Device Telemetry Playground</h3>
            <p className="subtitle">
              Dispatch simulated HTTP POST payloads to <code>/api/v1/telemetry</code> and test live database ingestion.
            </p>
          </div>
          <Terminal size={16} />
        </div>

        <div className="grid-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="grid-2">
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Bus ID</label>
                <select
                  className="input-field"
                  value={testBusId}
                  onChange={(e) => setTestBusId(e.target.value)}
                >
                  <option value="bus-b1">bus-b1 (BH-01 Boys)</option>
                  <option value="bus-b2">bus-b2 (BH-02 Boys)</option>
                  <option value="bus-g1">bus-g1 (GH-01 Girls)</option>
                  <option value="bus-g2">bus-g2 (GH-02 Girls)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Event Type</label>
                <select
                  className="input-field"
                  value={testEvent}
                  onChange={(e) => setTestEvent(e.target.value)}
                >
                  <option value="periodic">periodic (Location Update)</option>
                  <option value="boarding">boarding (Card Tap Authorized)</option>
                  <option value="unauthorized_card">unauthorized_card (Card Denied)</option>
                  <option value="sync_button">sync_button (Manual Sync)</option>
                </select>
              </div>
            </div>

            {(testEvent === 'boarding' || testEvent === 'unauthorized_card') && (
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>RFID Card UID</label>
                <input
                  type="text"
                  className="input-field mono"
                  value={testCardUid}
                  onChange={(e) => setTestCardUid(e.target.value)}
                />
              </div>
            )}

            <div className="grid-2">
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>GPS Latitude</label>
                <input
                  type="text"
                  className="input-field mono"
                  value={testLat}
                  onChange={(e) => setTestLat(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>GPS Longitude</label>
                <input
                  type="text"
                  className="input-field mono"
                  value={testLng}
                  onChange={(e) => setTestLng(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                className="btn-primary"
                onClick={handleSendTelemetry}
                disabled={isSending}
                style={{ flex: 1 }}
              >
                <Send size={14} />
                <span>{isSending ? 'Sending...' : 'Transmit Telemetry'}</span>
              </button>

              <button
                className="btn-secondary"
                onClick={handleFetchAllowlist}
              >
                <span>Query Card Allowlist</span>
              </button>
            </div>
          </div>

          <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 'var(--radius-xs)',
            padding: '1rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.775rem',
            overflowY: 'auto',
            maxHeight: '260px',
            color: '#f8fafc',
          }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>RESPONSE STREAM</span>
              <span style={{ color: '#38bdf8' }}>X-Device-Key: demo-device-key-001</span>
            </div>

            {apiResponse && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ color: '#4ade80', fontWeight: 700 }}>
                  POST /api/v1/telemetry ➜ Status: {apiResponse.status}
                </div>
                <pre style={{ color: '#cbd5e1', marginTop: 4 }}>
                  {JSON.stringify(apiResponse.data, null, 2)}
                </pre>
              </div>
            )}

            {allowlistResult && (
              <div>
                <div style={{ color: '#38bdf8', fontWeight: 700 }}>
                  GET /api/v1/devices/bus-unit-b1/allowlist ➜ Status: {allowlistResult.status}
                </div>
                <pre style={{ color: '#cbd5e1', marginTop: 4 }}>
                  {JSON.stringify(allowlistResult.data, null, 2)}
                </pre>
              </div>
            )}

            {!apiResponse && !allowlistResult && (
              <div style={{ color: '#64748b', fontStyle: 'italic', padding: '1.5rem 0', textAlign: 'center' }}>
                Transmit telemetry or query allowlist to inspect live handshake.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
