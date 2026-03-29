import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Signal, SignalLow } from 'lucide-react';
import { useTrackMotoboy } from '@/hooks/useTrackMotoboy';

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const motoIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:40px;height:40px;border-radius:50%;
    background:#1E40AF;border:3px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    font-size:20px;
  ">🏍️</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function FlyTo({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, map.getZoom(), { animate: true });
  }, [coords, map]);
  return null;
}

export function LiveMotoboyMap({ orderId, deliveryCoords }: { orderId: string; deliveryCoords?: [number, number] | null }) {
  const isActive = true;
  const { coords, connected } = useTrackMotoboy(orderId, isActive);
  const [show, setShow] = useState(false);

  const motoCoords: [number, number] | null = coords ? [coords.lat, coords.lng] : null;
  const hasPosition = motoCoords !== null;

  // default center: delivery address or Brazil center
  const center: [number, number] = motoCoords ?? deliveryCoords ?? [-14.235, -51.925];

  return (
    <div className="rounded-xl overflow-hidden border border-blue-100 bg-blue-50">
      {/* Header bar */}
      <button
        data-testid={`btn-toggle-live-map-${orderId}`}
        onClick={() => setShow(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1E40AF] text-white"
      >
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-semibold">Ver motoboy no mapa</span>
          {connected ? (
            <span className="flex items-center gap-1 text-xs bg-green-500 px-2 py-0.5 rounded-full font-medium">
              <Signal className="w-3 h-3" /> Ao vivo
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
              <SignalLow className="w-3 h-3" /> Conectando...
            </span>
          )}
        </div>
        <span className="text-xs opacity-70">{show ? '▲ Fechar' : '▼ Abrir'}</span>
      </button>

      {show && (
        <div>
          {!hasPosition ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-blue-700">
              <div className="text-3xl animate-bounce">🏍️</div>
              <p className="text-sm font-medium">
                {connected
                  ? 'Aguardando localização do motoboy...'
                  : 'Conectando ao rastreamento...'}
              </p>
            </div>
          ) : (
            <MapContainer
              center={center}
              zoom={15}
              style={{ height: '220px', width: '100%' }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={motoCoords!} icon={motoIcon} />
              {deliveryCoords && (
                <Marker position={deliveryCoords} />
              )}
              <FlyTo coords={motoCoords!} />
            </MapContainer>
          )}
          <p className="text-[10px] text-center text-blue-500 py-1.5 bg-blue-50">
            {hasPosition
              ? `Posição atualizada ${new Date(coords!.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'GPS em tempo real via WebSocket'}
          </p>
        </div>
      )}
    </div>
  );
}
