import React from 'react';
import {
  Bus,
  MapPin,
  Clock,
  ArrowRightLeft,
  BarChart2,
  Cpu,
  ShieldCheck,
  RefreshCw,
  Radio,
  Calendar,
} from 'lucide-react';

export type TabType = 'map' | 'eta' | 'schedule' | 'recommendation' | 'analytics' | 'hardware' | 'admin';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  demoMode: boolean;
  busCount: number;
  onlineCount: number;
  isAdmin: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  demoMode,
  busCount,
  onlineCount,
  isAdmin,
  isRefreshing,
  onRefresh,
}) => {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-icon">
          <Bus size={22} strokeWidth={2.5} />
        </div>
        <div className="brand-title-wrap">
          <h1>RAAHI</h1>
          <p>Real-time Arrival and Attendance Hub via IoT • CUK</p>
        </div>
      </div>

      <nav className="nav-tabs" aria-label="Main Navigation">
        <button
          className={`nav-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => onTabChange('map')}
        >
          <MapPin size={15} />
          <span>Campus Map</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'eta' ? 'active' : ''}`}
          onClick={() => onTabChange('eta')}
        >
          <Clock size={15} />
          <span>Live ETAs</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => onTabChange('schedule')}
        >
          <Calendar size={15} />
          <span>Timetable</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'recommendation' ? 'active' : ''}`}
          onClick={() => onTabChange('recommendation')}
        >
          <ArrowRightLeft size={15} />
          <span>Wait vs Walk</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => onTabChange('analytics')}
        >
          <BarChart2 size={15} />
          <span>Passenger Flow</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'hardware' ? 'active' : ''}`}
          onClick={() => onTabChange('hardware')}
        >
          <Cpu size={15} />
          <span>Hardware & IoT</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => onTabChange('admin')}
        >
          <ShieldCheck size={15} />
          <span>Admin {isAdmin ? '●' : ''}</span>
        </button>
      </nav>

      <div className="header-actions">
        <div className="badge-status active-now" title={demoMode ? 'CUK Campus Simulator' : 'Live IoT'}>
          <span className="pulse-dot"></span>
          <span>{demoMode ? 'CUK Simulator' : 'Live IoT'}</span>
        </div>

        <div className="badge-status">
          <Radio size={12} />
          <span>{onlineCount}/{busCount} Shuttles Active</span>
        </div>

        <button
          className={`btn-icon ${isRefreshing ? 'spinning' : ''}`}
          onClick={onRefresh}
          title="Refresh Data"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </header>
  );
};
