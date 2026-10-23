import React, { useState, useEffect } from 'react';
import {
  AdminOverview,
  AuthorizedCard,
  RFIDEvent,
  TelemetryPoint,
} from '../types';
import {
  fetchAdminOverview,
  fetchAdminCards,
  addAdminCard,
  toggleAdminCard,
  deleteAdminCard,
  fetchAdminEvents,
  fetchAdminTelemetry,
  loginAdmin,
  logoutAdmin,
  controlSimulator,
} from '../api';
import {
  ShieldCheck,
  Lock,
  Unlock,
  CreditCard,
  Activity,
  Play,
  Square,
  Plus,
  Trash2,
  RefreshCw,
  Radio,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface AdminDashboardProps {
  isAdmin: boolean;
  onAdminStatusChange: (status: boolean) => void;
  onRefreshData?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isAdmin,
  onAdminStatusChange,
  onRefreshData,
}) => {
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('smartbus2026');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [cards, setCards] = useState<AuthorizedCard[]>([]);
  const [events, setEvents] = useState<RFIDEvent[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'events' | 'simulator'>('overview');

  const [newCardToken, setNewCardToken] = useState<string>('');
  const [newCardAlias, setNewCardAlias] = useState<string>('');
  const [cardError, setCardError] = useState<string>('');

  const loadAdminData = async () => {
    try {
      const [ov, crds, evts, tel] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminCards(),
        fetchAdminEvents(30),
        fetchAdminTelemetry(30),
      ]);
      setOverview(ov);
      setCards(crds.cards);
      setEvents(evts.events);
      setTelemetry(tel.telemetry);
    } catch (err) {
      console.error('Failed to load admin data', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
      const interval = setInterval(loadAdminData, 4000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await loginAdmin(username, password);
      onAdminStatusChange(true);
      await loadAdminData();
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
      onAdminStatusChange(false);
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardToken) return;
    setCardError('');
    try {
      await addAdminCard(newCardToken.trim(), newCardAlias.trim());
      setNewCardToken('');
      setNewCardAlias('');
      loadAdminData();
    } catch (err: any) {
      setCardError(err.message || 'Failed to add card');
    }
  };

  const handleToggleCard = async (id: string) => {
    try {
      await toggleAdminCard(id);
      loadAdminData();
    } catch (err) {
      console.error('Failed to toggle card', err);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm('Delete this authorized card?')) return;
    try {
      await deleteAdminCard(id);
      loadAdminData();
    } catch (err) {
      console.error('Failed to delete card', err);
    }
  };

  const handleSimulatorControl = async (action: 'start' | 'stop') => {
    try {
      await controlSimulator(action);
      loadAdminData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(`Simulator ${action} failed`, err);
    }
  };

  const handleTriggerSimulatorEvent = async (event: string) => {
    try {
      await controlSimulator('trigger-event', {
        event,
        busId: 'bus-b1',
        cardUid: '01:02:03:04',
      });
      loadAdminData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Trigger simulator event failed', err);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: '420px', margin: '3rem auto' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-xs)',
              background: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              margin: '0 auto 1rem auto',
            }}>
              <ShieldCheck size={24} />
            </div>
            <h2 className="title-md" style={{ fontSize: '1.25rem' }}>RAAHI Administrator</h2>
            <p className="subtitle">Sign in to manage CUK campus transportation operations</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loginError && (
              <div style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-xs)',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '0.8rem',
              }}>
                {loginError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Username
              </label>
              <input
                type="text"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Password
              </label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', width: '100%' }} disabled={isLoggingIn}>
              <Lock size={14} />
              <span>{isLoggingIn ? 'Authenticating...' : 'Sign In as Administrator'}</span>
            </button>

            <div style={{
              marginTop: '0.75rem',
              padding: '0.65rem',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.725rem',
              color: 'var(--text-tertiary)',
              textAlign: 'center',
            }}>
              Default admin demo credentials: <b>admin</b> / <b>smartbus2026</b>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
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
              <ShieldCheck size={20} />
              <h2 className="title-md" style={{ margin: 0 }}>CUK Fleet & Operations Dashboard</h2>
            </div>
            <p className="subtitle">
              Fleet management for 4 campus shuttles, RFID allowlist synchronization, and security logs.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={loadAdminData}>
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>

            <button className="btn-danger" onClick={handleLogout}>
              <Unlock size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Admin Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
          <button
            className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={14} />
            <span>Overview & KPIs</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'cards' ? 'active' : ''}`}
            onClick={() => setActiveTab('cards')}
          >
            <CreditCard size={14} />
            <span>RFID Allowlist ({cards.length})</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            <Radio size={14} />
            <span>Passenger Taps ({events.length})</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulator')}
          >
            <Play size={14} />
            <span>CUK Simulator</span>
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="grid-4">
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Active Fleet</div>
              <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                {overview.buses.online} / {overview.buses.total}
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                2 Boys + 2 Girls Shuttles
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Today's Boardings</div>
              <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                {overview.today.boardings}
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Authorized ID scans</div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Denied Taps</div>
              <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                {overview.today.denials}
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Unregistered cards</div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Authorized Cards</div>
              <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                {overview.cards.active} / {overview.cards.total}
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Synced to ESP32s</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="glass-panel">
              <h3 className="title-md" style={{ marginBottom: '0.85rem' }}>Recent Passenger Taps</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto' }}>
                {events.slice(0, 8).map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {evt.authorized ? (
                        <CheckCircle2 size={15} color="#059669" />
                      ) : (
                        <XCircle size={15} color="#dc2626" />
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          Card: <span className="mono">{evt.card_token_masked}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                          Bus: {evt.bus_id} • {evt.event_type}
                        </div>
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                      {new Date(evt.event_timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel">
              <h3 className="title-md" style={{ marginBottom: '0.85rem' }}>CUK Telemetry Stream</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto' }}>
                {telemetry.slice(0, 8).map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.bus_id}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        {t.latitude?.toFixed(4)}, {t.longitude?.toFixed(4)} • {t.speed_kmph ? `${Math.round(t.speed_kmph)} km/h` : '0 km/h'}
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                      {new Date(t.server_timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RFID Allowlist Tab */}
      {activeTab === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-panel">
            <h3 className="title-md" style={{ marginBottom: '0.75rem' }}>Register Authorized CUK Smartcard</h3>
            <form onSubmit={handleAddCard} style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <input
                  type="text"
                  className="input-field mono"
                  placeholder="Card UID (e.g. 01:02:03:04)"
                  value={newCardToken}
                  onChange={(e) => setNewCardToken(e.target.value)}
                  required
                />
              </div>

              <div style={{ flex: '1 1 200px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Student / Faculty Passholder Alias"
                  value={newCardAlias}
                  onChange={(e) => setNewCardAlias(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary">
                <Plus size={15} />
                <span>Add Card</span>
              </button>
            </form>
            {cardError && (
              <p style={{ color: '#dc2626', fontSize: '0.775rem', marginTop: '0.4rem' }}>{cardError}</p>
            )}
          </div>

          <div className="glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className="title-md" style={{ margin: 0 }}>Registered RFID Smartcards</h3>
              <p className="subtitle">Synced to ESP32 units via <code>/api/v1/devices/:id/allowlist</code></p>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Card Token UID</th>
                    <th>Alias / Description</th>
                    <th>Status</th>
                    <th>Sync Ver</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((c) => (
                    <tr key={c.id}>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.card_token}</td>
                      <td>{c.alias || '—'}</td>
                      <td>
                        <span className="badge-status" style={{ padding: '0.15rem 0.5rem', fontSize: '0.65rem', color: c.active ? '#059669' : '#64748b' }}>
                          {c.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="mono">v{c.sync_version}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.725rem' }}
                            onClick={() => handleToggleCard(c.id)}
                          >
                            {c.active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            className="btn-danger"
                            style={{ padding: '0.2rem 0.45rem' }}
                            onClick={() => handleDeleteCard(c.id)}
                            title="Delete Card"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 className="title-md" style={{ marginBottom: 2 }}>Passenger Boarding Audit Trail</h3>
              <p className="subtitle">Real-time attendance log of student scans on Amarja & Narmada shuttles</p>
            </div>
            <button className="btn-secondary" onClick={loadAdminData}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Shuttle</th>
                  <th>Masked Token</th>
                  <th>Access Verdict</th>
                  <th>Type</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr key={evt.id}>
                    <td className="mono" style={{ fontSize: '0.75rem' }}>
                      {new Date(evt.event_timestamp).toLocaleString()}
                    </td>
                    <td><b>{evt.bus_id}</b></td>
                    <td className="mono" style={{ color: 'var(--text-primary)' }}>{evt.card_token_masked}</td>
                    <td>
                      <span className="badge-status" style={{ padding: '0.15rem 0.5rem', fontSize: '0.65rem', color: evt.authorized ? '#059669' : '#dc2626' }}>
                        {evt.authorized ? 'Granted' : 'Denied'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>{evt.event_type}</td>
                    <td style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)' }}>
                      {evt.is_demo ? 'Simulator' : 'Hardware'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Simulator Tab */}
      {activeTab === 'simulator' && (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 className="title-md">CUK Campus Telemetry Simulator</h3>
            <p className="subtitle">
              Simulates BH-01, BH-02, GH-01, GH-02 shuttles operating between Amarja/Narmada Hostels, Central Library, and CRC.
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem',
            background: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Simulator State: <span style={{ color: overview?.simulatorRunning ? '#059669' : '#64748b' }}>{overview?.simulatorRunning ? 'Active & Running' : 'Stopped'}</span>
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Ticks every 2.5 seconds across CUK campus road corridors.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {overview?.simulatorRunning ? (
                <button
                  className="btn-danger"
                  onClick={() => handleSimulatorControl('stop')}
                >
                  <Square size={13} />
                  <span>Stop Simulator</span>
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={() => handleSimulatorControl('start')}
                >
                  <Play size={13} />
                  <span>Start Simulator</span>
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>Inject Mock Events</h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn-secondary"
                onClick={() => handleTriggerSimulatorEvent('boarding')}
              >
                <span>Simulate Student Boarding (Granted)</span>
              </button>

              <button
                className="btn-secondary"
                onClick={() => handleTriggerSimulatorEvent('unauthorized_card')}
              >
                <span>Simulate Unregistered Card (Denied)</span>
              </button>

              <button
                className="btn-secondary"
                onClick={() => handleTriggerSimulatorEvent('sync_button')}
              >
                <span>Simulate Manual Sync Button</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
