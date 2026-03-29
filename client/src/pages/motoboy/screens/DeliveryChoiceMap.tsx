import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Order } from '@/lib/mockData';
import { Navigation, X, Loader2 } from 'lucide-react';
import {
  createMotoIcon, createPickupIcon, DEFAULT_CENTER,
} from '../utils/mapUtils';

export function DeliveryChoiceMap({
  orders,
  currentIndex,
  onSelectDelivery,
  onClose,
}: {
  orders: Order[];
  currentIndex: number;
  onSelectDelivery: (index: number) => void;
  onClose: () => void;
}) {
  const [motoboyCoords, setMotoboyCoords] = useState<[number, number] | null>(null);
  const [geocodedCoords, setGeocodedCoords] = useState<Record<string, [number, number]>>({});
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => setMotoboyCoords([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  // Geocode delivery addresses for orders missing deliveryCoords
  useEffect(() => {
    const ordersNeedingGeocode = orders.filter(o => !o.deliveryCoords && o.deliveryAddress);
    if (ordersNeedingGeocode.length === 0) return;
    setGeocodingLoading(true);
    Promise.all(
      ordersNeedingGeocode.map(async o => {
        const addr = o.deliveryAddress!;
        const fullAddress = [addr.logradouro, addr.numero, addr.bairro, addr.cidade].filter(Boolean).join(', ');
        try {
          const res = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: fullAddress }),
          });
          if (res.ok) {
            const { lat, lng } = await res.json();
            return { id: o.id, coords: [lat, lng] as [number, number] };
          }
        } catch {/* ignore geocode errors */}
        return null;
      })
    ).then(results => {
      const map: Record<string, [number, number]> = {};
      for (const r of results) {
        if (r) map[r.id] = r.coords;
      }
      setGeocodedCoords(map);
      setGeocodingLoading(false);
    });
  }, [orders]);

  const firstOrder = orders[0];
  const storeCoords: [number, number] = firstOrder?.storeCoords ?? DEFAULT_CENTER;

  const deliveryPoints: { coords: [number, number]; order: Order; index: number; approximate: boolean }[] = orders.map((o, i) => {
    const realCoords: [number, number] | undefined = o.deliveryCoords ?? geocodedCoords[o.id];
    const approximate = !realCoords;
    const coords: [number, number] = realCoords ?? storeCoords;
    return { coords, order: o, index: i, approximate };
  });

  const allPoints: [number, number][] = [
    ...(motoboyCoords ? [motoboyCoords] : []),
    storeCoords,
    ...deliveryPoints.map(d => d.coords),
  ];

  function FitAll() {
    const map = useMap();
    useEffect(() => {
      if (allPoints.length > 1) {
        map.fitBounds(allPoints as L.LatLngBoundsExpression, { padding: [40, 40] });
      }
    }, [map]);
    return null;
  }

  const createDeliveryNumberIcon = (num: number, isActive: boolean, approximate: boolean) => L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="
        width:36px;height:36px;border-radius:50%;
        background:${isActive ? '#ef4444' : '#3b82f6'};
        border:3px solid white;
        display:flex;align-items:center;justify-content:center;
        font-size:15px;font-weight:bold;color:white;
        box-shadow:0 2px 8px rgba(0,0,0,0.4);
        cursor:pointer;
        opacity:${approximate ? '0.6' : '1'};
      ">${num}°</div>
      ${approximate ? '<div style="font-size:9px;color:#fbbf24;background:rgba(0,0,0,0.7);border-radius:4px;padding:1px 4px;white-space:nowrap;">Aprox.</div>' : ''}
    </div>`,
    iconSize: [36, approximate ? 52 : 36],
    iconAnchor: [18, 18],
  });

  const motoIcon = createMotoIcon();
  const storeIcon = createPickupIcon();

  const isDark = true;
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="fixed inset-0 z-[9000] flex flex-col bg-[#111111]" data-testid="delivery-choice-map">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0">
        <button
          data-testid="btn-delivery-map-close"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <span className="text-white font-bold tracking-[0.15em] text-sm">ESCOLHER ROTA</span>
        <div className="w-10" />
      </div>

      {/* Instruction / geocoding status */}
      <div className="px-4 pb-3 flex-shrink-0 text-center space-y-1">
        {geocodingLoading ? (
          <p className="text-yellow-400 text-xs flex items-center justify-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Localizando endereços no mapa...
          </p>
        ) : deliveryPoints.some(d => d.approximate) ? (
          <p className="text-yellow-400 text-xs">⚠ Localização aproximada — use Waze para navegação precisa</p>
        ) : (
          <p className="text-gray-400 text-sm">Escolha qual entrega fazer <span className="text-white font-semibold">primeiro</span></p>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={storeCoords}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer url={tileUrl} />
          <FitAll />
          {motoboyCoords && (
            <Marker position={motoboyCoords} icon={motoIcon} />
          )}
          <Marker position={storeCoords} icon={storeIcon} />
          {deliveryPoints.map(({ coords, index, approximate }) => (
            <Marker
              key={index}
              position={coords}
              icon={createDeliveryNumberIcon(index + 1, index === currentIndex, approximate)}
              eventHandlers={{
                click: () => { onSelectDelivery(index); onClose(); },
              }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Delivery list with "Ir primeiro" buttons */}
      <div className="flex-shrink-0 bg-[#1a1a1a] border-t border-white/10 px-4 pt-4 pb-8 space-y-3">
        {deliveryPoints.map(({ order: o, index, approximate }) => {
          const isActive = index === currentIndex;
          const addrLine = o.deliveryAddress
            ? `${o.deliveryAddress.logradouro}, ${o.deliveryAddress.numero} — ${o.deliveryAddress.bairro}`
            : 'Endereço não informado';
          return (
            <div
              key={index}
              className={`rounded-2xl border overflow-hidden ${
                isActive
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {/* Order info row */}
              <div className="flex items-center gap-3 px-3 pt-3 pb-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-blue-500/70'}`}>
                  {index + 1}°
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">{o.customerName || 'Cliente'}</p>
                  <p className="text-gray-400 text-xs truncate">{addrLine}</p>
                  {approximate && <p className="text-yellow-500 text-[10px] mt-0.5">📍 Localização aproximada</p>}
                </div>
                {isActive && (
                  <span className="flex-shrink-0 flex items-center gap-1 text-green-400 text-xs font-bold bg-green-500/15 px-2 py-1 rounded-full">
                    ✓ PRIMEIRA
                  </span>
                )}
              </div>

              {/* Action button */}
              {!isActive && (
                <div className="px-3 pb-3">
                  <button
                    data-testid={`btn-ir-primeiro-${index}`}
                    onClick={() => { onSelectDelivery(index); onClose(); }}
                    className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    Ir aqui primeiro
                  </button>
                </div>
              )}
              {isActive && (
                <div className="px-3 pb-3">
                  <div className="w-full py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-semibold text-sm text-center">
                    Você vai aqui primeiro 🚀
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
