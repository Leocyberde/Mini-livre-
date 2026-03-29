import { useEffect, useRef, useCallback } from 'react';
import { getAuthToken } from '@/lib/authFetch';

function getWsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const token = getAuthToken();
  const params = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${proto}://${window.location.host}/ws/tracking${params}`;
}

/**
 * Motoboy side hook: connects to the tracking WebSocket and continuously
 * publishes the device's GPS position for a given orderId.
 *
 * Only runs when `active` is true (e.g. when status === 'on_the_way').
 */
export function usePublishLocation(orderId: string | null, active: boolean) {
  const wsRef = useRef<WebSocket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!orderId || !active) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'publish', orderId }));

      // Start GPS watch
      if ('geolocation' in navigator && watchIdRef.current === null) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'location',
                orderId,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              }));
            }
          },
          (err) => console.warn('[GPS] watchPosition error:', err.message),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
        );
      }
    };

    ws.onclose = () => {
      // Clear GPS watcher on close
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // Reconnect after 3s if still active
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
      // Stop GPS
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // Signal stop to server
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && orderId) {
        wsRef.current.send(JSON.stringify({ type: 'stop', orderId }));
      }
      wsRef.current?.close();
      wsRef.current = null;
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
    };
  }, [active, orderId, connect]);
}
