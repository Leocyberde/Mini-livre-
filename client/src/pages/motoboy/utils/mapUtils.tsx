import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333]; // São Paulo

export const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const LIGHT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const DARK_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';
export const LIGHT_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const COLETA_DURATION = 15 * 60; // 15 minutes in seconds
export const ENTREGA_DURATION = 15 * 60; // 15 minutes in seconds

export function createMotoIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="display:flex;align-items:center;gap:6px;background:#111;color:#fff;padding:5px 10px 5px 6px;border-radius:20px;font-size:13px;font-weight:600;box-shadow:0 2px 10px rgba(0,0,0,0.4)">
          <div style="width:28px;height:28px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;">🏍️</div>
          Moto
        </div>
        <div style="width:2px;height:16px;background:#111;border-radius:2px;margin-top:-2px;"></div>
        <div style="font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">📍</div>
      </div>
    `,
    iconAnchor: [50, 80],
    iconSize: [100, 80],
  });
}

export function createPickupIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="background:#f97316;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:2px solid white;">🏪</div>`,
    iconAnchor: [17, 17],
    iconSize: [34, 34],
  });
}

export function createDeliveryIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="background:#ef4444;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:2px solid white;">📍</div>`,
    iconAnchor: [17, 17],
    iconSize: [34, 34],
  });
}

export function FlyToLocation({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(coords, 15, { duration: 1.2 });
  }, [coords, map]);
  return null;
}

export function FitBoundsModal({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const didFit = useRef(false);
  useEffect(() => {
    if (!didFit.current && positions.length >= 2) {
      map.fitBounds(positions as L.LatLngBoundsExpression, { padding: [30, 30] });
      didFit.current = true;
    }
  }, []);
  return null;
}
