import React, { useState, useEffect, useCallback } from 'react';
import { Bus, Route, Stop } from './types';
import { fetchBuses, fetchRoutes, fetchStops, fetchHealth, checkAdminSession } from './api';
import { Header, TabType } from './components/Header';
import { MapTracker } from './components/MapTracker';
import { StopEtaBoard } from './components/StopEtaBoard';
import { ScheduleBoard } from './components/ScheduleBoard';
import { RecommendationCalculator } from './components/RecommendationCalculator';
import { DemandAnalytics } from './components/DemandAnalytics';
import { HardwareGuide } from './components/HardwareGuide';
import { AdminDashboard } from './components/AdminDashboard';
import { AlertCircle, ExternalLink } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [selectedStopId, setSelectedStopId] = useState<string>('stop-amarja');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initial load
  const loadInitialData = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const [healthData, routesData, stopsData, busesData, sessionData] = await Promise.all([
        fetchHealth().catch(() => ({ status: 'ok', demoMode: true })),
        fetchRoutes().catch(() => ({ routes: [] })),
        fetchStops().catch(() => ({ stops: [] })),
        fetchBuses().catch(() => ({ buses: [], demoMode: true })),
        checkAdminSession().catch(() => ({ isAdmin: false })),
      ]);

      setDemoMode(healthData.demoMode);
      setRoutes(routesData.routes);
      setStops(stopsData.stops);
      setBuses(busesData.buses);
      setIsAdmin(sessionData.isAdmin);

      if (stopsData.stops.length > 0) {
        setSelectedStopId(stopsData.stops[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load initial transit data', err);
      setErrorMsg('Unable to connect to RAAHI backend server on port 3001.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Periodic bus positions poll
  const pollBusData = useCallback(async () => {
    try {
      const busesData = await fetchBuses();
      setBuses(busesData.buses);
      setDemoMode(busesData.demoMode);
    } catch {
      // Ignore background transient fetch errors
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const interval = setInterval(pollBusData, 3500);
    return () => clearInterval(interval);
  }, [pollBusData]);

  const handleSelectStopFromMap = (stopId: string) => {
    setSelectedStopId(stopId);
    setActiveTab('eta');
  };

  const onlineBusCount = buses.filter((b) => b.isOnline).length;

  return (
    <div className="app-container">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        demoMode={demoMode}
        busCount={buses.length}
        onlineCount={onlineBusCount}
        isAdmin={isAdmin}
        isRefreshing={isRefreshing}
        onRefresh={loadInitialData}
      />

      {/* Global Error Banner */}
      {errorMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          borderRadius: 'var(--radius-xs)',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          fontSize: '0.825rem',
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <main style={{ flex: 1 }}>
        {activeTab === 'map' && (
          <MapTracker
            buses={buses}
            routes={routes}
            stops={stops}
            onSelectStop={handleSelectStopFromMap}
          />
        )}

        {activeTab === 'eta' && (
          <StopEtaBoard
            stops={stops}
            selectedStopId={selectedStopId}
            onSelectStop={(id) => setSelectedStopId(id)}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleBoard />
        )}

        {activeTab === 'recommendation' && (
          <RecommendationCalculator stops={stops} />
        )}

        {activeTab === 'analytics' && (
          <DemandAnalytics stops={stops} />
        )}

        {activeTab === 'hardware' && (
          <HardwareGuide />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            isAdmin={isAdmin}
            onAdminStatusChange={(status) => setIsAdmin(status)}
            onRefreshData={pollBusData}
          />
        )}
      </main>

      {/* Minimal Monochrome Footer */}
      <footer style={{
        marginTop: '3rem',
        paddingTop: '1.25rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <strong style={{ color: 'var(--text-primary)' }}>RAAHI</strong>
          <span>— Real-time Arrival and Attendance Hub via IoT</span>
          <span>• Central University of Karnataka (CUK), Kalaburagi</span>
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          <a href="https://maps.app.goo.gl/4GdfTr5JbjiLWJfp8" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span>CUK Campus Map</span> <ExternalLink size={11} />
          </a>
          <a href="https://maps.app.goo.gl/6PxbHHpPyDdk5YDz5" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span>Amarja Hostel</span> <ExternalLink size={11} />
          </a>
          <a href="https://maps.app.goo.gl/4S7URuMNWGWv8SoF7" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span>Narmada Hostel</span> <ExternalLink size={11} />
          </a>
          <a href="https://maps.app.goo.gl/ASMiLtxzsWiRYb36A" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span>CRC Complex</span> <ExternalLink size={11} />
          </a>
        </div>

        {/* Creator Attribution */}
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '0.85rem',
          marginTop: '0.25rem',
          borderTop: '1px dashed var(--border-subtle)',
          fontSize: '0.85rem',
          letterSpacing: '0.05em',
          color: 'var(--text-secondary)',
        }}>
          <span>Created by <strong style={{ color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '0.08em' }}>ANANT BHARDWAJ</strong></span>
        </div>
      </footer>
    </div>
  );
}

export default App;
