import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthToken } from '@/lib/authFetch';

export interface MotoboyCoords {
  lat: number;
  lng: number;
  ts: number;
}

function getWsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const token = getAuthToken();
  const params = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${proto}://${window.location.host}/ws/tracking${params}`;
}

/**
 * Client side hook: subscribes to real-time motoboy GPS updates for a given orderId.
 * Returns the latest known coords (or null if not yet received) and a connection status.
 */
export function useTrackMotoboy(orderId: string | null, active: boolean) {
  const [coords, setCoords] = useState<MotoboyCoords | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!orderId || !active) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'watch', orderId }));
    };

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === 'location' && typeof msg.lat === 'number' && typeof msg.lng === 'number') {
        setCoords({ lat: msg.lat, lng: msg.lng, ts: typeof msg.ts === 'number' ? msg.ts : Date.now() });
      }

      if (msg.type === 'stopped') {
        setCoords(null);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (active) {
        reconnectRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [orderId, active]);

  useEffect(() => {
    if (active && orderId) {
      connect();
    }

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
    };
  }, [active, orderId, connect]);

  return { coords, connected };
}
