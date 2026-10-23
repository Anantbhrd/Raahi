import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Bus, Route, Stop } from '../types';
import { Gauge, Navigation, Compass, Radio, Eye, ExternalLink, MapPin } from 'lucide-react';
import { BOYS_ROUTE_ROAD_WAYPOINTS, GIRLS_ROUTE_ROAD_WAYPOINTS } from '../data/campusRoutes';

interface MapTrackerProps {
  buses: Bus[];
  routes: Route[];
  stops: Stop[];
  onSelectStop?: (stopId: string) => void;
}

export const MapTracker: React.FC<MapTrackerProps> = ({
  buses,
  routes,
  stops,
  onSelectStop,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const busMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routePolylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const stopMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  const [selectedRouteId, setSelectedRouteId] = useState<string>('all');
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  // Central University of Karnataka Coordinates
  const CUK_CENTER: [number, number] = [17.4320, 76.6725];

  // Initialize Map with Google Maps full-color standard tiles
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: CUK_CENTER,
      zoom: 15,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Google Maps standard full-color roadmap tiles
    L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; Google Maps',
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Route Polylines following actual campus roads
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    routePolylinesRef.current.forEach((polyline) => polyline.remove());
    routePolylinesRef.current.clear();

    const drawRoadRoute = (
      routeId: string,
      routeName: string,
      roadPoints: [number, number][],
      color: string,
      weight: number,
      dashArray?: string
    ) => {
      // Background glow/casing for high visibility on full-color map
      const casing = L.polyline(roadPoints, {
        color: '#ffffff',
        weight: weight + 3,
        opacity: 0.9,
      }).addTo(map);

      // Main colored road line
      const polyline = L.polyline(roadPoints, {
        color,
        weight,
        opacity: 0.95,
        dashArray,
      }).addTo(map);

      polyline.bindTooltip(`<b>${routeName}</b><br/>Exact Road Path via Central Library`, { sticky: true });
      routePolylinesRef.current.set(`${routeId}-casing`, casing);
      routePolylinesRef.current.set(routeId, polyline);
    };

    if (selectedRouteId === 'all' || selectedRouteId === 'route-boys') {
      drawRoadRoute(
        'route-boys',
        'Boys Hostel Route (Amarja ➔ Library ➔ CRC)',
        BOYS_ROUTE_ROAD_WAYPOINTS,
        '#1d4ed8', // Vibrant Royal Blue
        5
      );
    }

    if (selectedRouteId === 'all' || selectedRouteId === 'route-girls') {
      drawRoadRoute(
        'route-girls',
        'Girls Hostel Route (Narmada ➔ Library ➔ CRC)',
        GIRLS_ROUTE_ROAD_WAYPOINTS,
        '#db2777', // Vibrant Magenta Pink
        5
      );
    }
  }, [routes, selectedRouteId]);

  // Update Stop Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    stopMarkersRef.current.forEach((marker) => marker.remove());
    stopMarkersRef.current.clear();

    const stopLinks: Record<string, string> = {
      'stop-amarja': 'https://maps.app.goo.gl/6PxbHHpPyDdk5YDz5',
      'stop-narmada': 'https://maps.app.goo.gl/4S7URuMNWGWv8SoF7',
      'stop-library': 'https://maps.app.goo.gl/uEzKxum5bD6tkUTw7',
      'stop-crc': 'https://maps.app.goo.gl/ASMiLtxzsWiRYb36A',
    };

    stops.forEach((stop) => {
      const isLibrary = stop.id === 'stop-library';
      const isCRC = stop.id === 'stop-crc';
      const isAmarja = stop.id === 'stop-amarja';
      const isNarmada = stop.id === 'stop-narmada';

      const pinColor = isAmarja ? '#1d4ed8' : isNarmada ? '#db2777' : isLibrary ? '#059669' : '#0f172a';
      const badgeText = isAmarja ? 'BOYS' : isNarmada ? 'GIRLS' : isLibrary ? 'LIBRARY' : 'CRC';

      const stopIcon = L.divIcon({
        className: 'custom-stop-divicon',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: ${pinColor};
            border: 2.5px solid #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            cursor: pointer;
            transition: transform 0.2s;
          ">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon }).addTo(map);

      marker.bindTooltip(`<b>${stop.name}</b> <span style="font-size:10px; color:${pinColor}">[${badgeText}]</span>`, {
        direction: 'top',
        offset: [0, -12],
        permanent: false,
      });

      const mapsUrl = stopLinks[stop.id] || 'https://maps.app.goo.gl/4GdfTr5JbjiLWJfp8';

      const popupHtml = `
        <div style="font-family: inherit; min-width: 200px; padding: 4px;">
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${stop.name}</div>
          <p style="font-size: 11px; color: #475569; margin: 0 0 8px 0;">${stop.description || 'CUK Campus Waypoint'}</p>
          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 6px; font-size: 11px;">
            <a href="${mapsUrl}" target="_blank" rel="noreferrer" style="color: #2563eb; text-decoration: none; font-weight: 700; display: flex; align-items: center; gap: 3px;">
              View on Google Maps ↗
            </a>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (onSelectStop) onSelectStop(stop.id);
      });

      stopMarkersRef.current.set(stop.id, marker);
    });
  }, [stops, onSelectStop]);

  // Update Bus Markers with dynamic heading rotation and clean styling
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentBusIds = new Set(buses.map((b) => b.id));

    busMarkersRef.current.forEach((marker, id) => {
      if (!currentBusIds.has(id)) {
        marker.remove();
        busMarkersRef.current.delete(id);
      }
    });

    buses.forEach((bus) => {
      if (bus.latitude === null || bus.longitude === null) return;

      const isStale = bus.isStale;
      const heading = bus.heading ?? 0;
      const speed = bus.speed_kmph !== null ? `${Math.round(bus.speed_kmph)} km/h` : '0 km/h';

      const isBoys = bus.id.includes('b');
      const badgeBg = isBoys ? '#1d4ed8' : '#db2777';
      const shortCode = bus.id.replace('bus-', '').toUpperCase();

      const busIcon = L.divIcon({
        className: 'bus-marker-container',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: ${badgeBg};
            color: #ffffff;
            font-weight: 800;
            font-size: 11px;
            font-family: var(--font-mono);
            border: 2.5px solid #ffffff;
            box-shadow: 0 3px 12px rgba(0, 0, 0, 0.35);
          ">
            ${shortCode}
            <!-- Direction pointer arrow -->
            <div style="
              position: absolute;
              top: -6px;
              left: 50%;
              transform: translateX(-50%) rotate(${heading}deg);
              transform-origin: 50% 23px;
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-bottom: 7px solid ${badgeBg};
              pointer-events: none;
            "></div>
          </div>
          <div style="
            position: absolute;
            top: 38px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            background: #0f172a;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 4px;
            border: 1px solid rgba(255,255,255,0.25);
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            pointer-events: none;
            font-family: var(--font-mono);
          ">
            ${bus.name.split(' ')[0]} • ${speed}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      let marker = busMarkersRef.current.get(bus.id);

      if (marker) {
        marker.setLatLng([bus.latitude, bus.longitude]);
        marker.setIcon(busIcon);
      } else {
        marker = L.marker([bus.latitude, bus.longitude], { icon: busIcon }).addTo(map);
        busMarkersRef.current.set(bus.id, marker);
      }

      const popupHtml = `
        <div style="font-family: inherit; min-width: 200px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <strong style="font-size: 13px; color: #0f172a;">${bus.name}</strong>
            <span style="font-size: 9px; padding: 2px 6px; border-radius: 99px; background: ${isStale ? '#e2e8f0' : badgeBg}; color: ${isStale ? '#475569' : '#ffffff'}; font-weight: 800;">
              ${isStale ? 'STANDBY' : 'EN ROUTE'}
            </span>
          </div>
          <div style="font-size: 11px; color: #475569; line-height: 1.6;">
            <div>Route: <b style="color: #0f172a;">${bus.route_name || 'CUK Route'}</b></div>
            <div>Road Speed: <b style="color: #0f172a;">${bus.speed_kmph ? `${bus.speed_kmph.toFixed(1)} km/h` : '0 km/h'}</b></div>
            <div>GPS Tracking: <b style="color: #059669;">Active Lock (${heading}°)</b></div>
            <div>Last Updated: <span style="font-family: monospace;">${bus.last_telemetry_at ? new Date(bus.last_telemetry_at).toLocaleTimeString() : 'Just now'}</span></div>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });
  }, [buses]);

  const focusBus = (bus: Bus) => {
    setSelectedBusId(bus.id);
    if (bus.latitude !== null && bus.longitude !== null && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([bus.latitude, bus.longitude], 17, { duration: 1.0 });
      const marker = busMarkersRef.current.get(bus.id);
      if (marker) {
        marker.openPopup();
      }
    }
  };

  const resetView = () => {
    setSelectedBusId(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(CUK_CENTER, 15, { duration: 1.0 });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Route Map Links Strip */}
      <div className="glass-panel" style={{ padding: '0.75rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Verified Google Maps Routes:</span>
            <span style={{ color: 'var(--text-secondary)' }}>Road network calibrated for Central University of Karnataka</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <a
              href="https://maps.app.goo.gl/wJgDPzZqM5LqobBe9"
              target="_blank"
              rel="noreferrer"
              className="route-link-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.7rem',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
              }}
            >
              <ExternalLink size={12} />
              <span>Boys Route Map ↗</span>
            </a>

            <a
              href="https://maps.app.goo.gl/HcHQKGyDsk91UNWN7"
              target="_blank"
              rel="noreferrer"
              className="route-link-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.7rem',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none',
                background: '#fdf2f8',
                color: '#db2777',
                border: '1px solid #fbcfe8',
              }}
            >
              <ExternalLink size={12} />
              <span>Girls Route Map ↗</span>
            </a>
          </div>
        </div>
      </div>

      {/* Top Map Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Filter Route:
          </label>
          <select
            className="input-field"
            style={{ width: 'auto', padding: '0.35rem 0.75rem' }}
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
          >
            <option value="all">All Routes (Boys & Girls Shuttles)</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <button className="btn-secondary" style={{ padding: '0.35rem 0.85rem' }} onClick={resetView}>
          <Compass size={13} />
          <span>Center on CUK Campus</span>
        </button>
      </div>

      {/* Main Map + Fleet Overlay Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem' }}>
        {/* Full Color Google Maps Tile Container */}
        <div className="map-wrapper">
          <div ref={mapContainerRef} />
        </div>

        {/* Fleet Sidebar */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div>
              <h3 className="title-md" style={{ marginBottom: 2 }}>CUK Fleet Status</h3>
              <p className="subtitle">4 Active Campus Shuttles</p>
            </div>
            <span className="badge-status active-now">
              <Radio size={11} />
              <span>Live Roads</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {buses.map((bus) => {
              const isSelected = selectedBusId === bus.id;
              const isBoys = bus.id.includes('b');
              const themeColor = isBoys ? '#1d4ed8' : '#db2777';

              return (
                <div
                  key={bus.id}
                  onClick={() => focusBus(bus)}
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-xs)',
                    background: isSelected ? 'var(--bg-surface-3)' : 'var(--bg-surface-2)',
                    border: `1px solid ${isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-muted)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = isSelected ? 'var(--border-strong)' : 'var(--border-subtle)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        background: themeColor,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {isBoys ? 'BH' : 'GH'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{bus.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{isBoys ? 'Boys Hostel Shuttle' : 'Girls Hostel Shuttle'}</div>
                      </div>
                    </div>

                    <span className="badge-status" style={{ padding: '0.15rem 0.5rem', fontSize: '0.65rem', borderColor: themeColor, color: themeColor }}>
                      <span className="pulse-dot" style={{ background: themeColor }}></span>
                      {bus.isStale ? 'STANDBY' : 'ROAD ACTIVE'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Gauge size={12} />
                      <span>{bus.speed_kmph ? `${Math.round(bus.speed_kmph)} km/h` : '0 km/h'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Navigation size={12} />
                      <span>{bus.heading ?? 0}° Heading</span>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '0.5rem',
                    paddingTop: '0.4rem',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.7rem',
                    color: 'var(--text-tertiary)',
                  }}>
                    <span>{bus.route_name || 'CUK Route'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: themeColor, fontWeight: 700 }}>
                      <Eye size={11} /> Track
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
