import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Order, mockStoreCoords, mockStores } from '@/lib/mockData';
import { formatKm } from '@/lib/deliveryCalc';
import { CheckCircle2, X } from 'lucide-react';
import {
  createMotoIcon, createPickupIcon, createDeliveryIcon,
  FitBoundsModal, DEFAULT_CENTER, DARK_TILES,
} from '../utils/mapUtils';
import { playNotificationSound } from '../utils/audio';

export function RouteNotificationModal({
  orders,
  onAccept,
  onReject,
  rejectionCount,
}: {
  orders: Order[];
  onAccept: () => void;
  onReject: () => void;
  rejectionCount: number;
}) {
  const [timeLeft, setTimeLeft] = useState(100);
  const [motoboyCoords, setMotoboyCoords] = useState<[number, number]>(DEFAULT_CENTER);
  const soundPlayed = useRef(false);
  const isDouble = orders.length >= 2;
  const firstOrder = orders[0];

  useEffect(() => {
    if (!soundPlayed.current) {
      soundPlayed.current = true;
      playNotificationSound();
    }
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => setMotoboyCoords([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const onRejectRef = useRef(onReject);
  useEffect(() => { onRejectRef.current = onReject; }, [onReject]);

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(v => {
        if (v <= 1) {
          clearInterval(t);
          onRejectRef.current();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const storeCoords: [number, number] = firstOrder.storeCoords ?? mockStoreCoords[firstOrder.storeId] ?? DEFAULT_CENTER;
  const distKm = firstOrder.distanceKm ?? 3;

  // Collect all delivery coords for all orders in the route
  const deliveryCoordsAll: [number, number][] = orders.map((o, i) =>
    o.deliveryCoords ?? [
      storeCoords[0] + ((o.distanceKm ?? distKm) / 111) * (0.65 + i * 0.2),
      storeCoords[1] + ((o.distanceKm ?? distKm) / 111) * (0.75 + i * 0.2),
    ]
  );
  const mapPositions: [number, number][] = [motoboyCoords, storeCoords, ...deliveryCoordsAll];

  const totalValue = orders.reduce((sum, o) => sum + (o.motoRideValue ?? 8.5), 0);
  const totalKm = orders.reduce((sum, o) => sum + (o.distanceKm ?? 3), 0);

  const RADIUS = 42;
  const circ = 2 * Math.PI * RADIUS;
  const timerOffset = circ * (1 - timeLeft / 100);
  const timerColor = timeLeft > 30 ? '#ffffff' : '#fca5a5';

  const motoIcon = createMotoIcon();
  const pickupIcon = createPickupIcon();
  const deliveryIcon = createDeliveryIcon();

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3"
      onMouseDown={e => e.stopPropagation()}
    >
      <div
        className="w-full max-w-sm bg-gray-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className={`${isDouble ? 'bg-blue-600' : 'bg-orange-500'} px-5 py-4 flex items-center gap-3 flex-shrink-0`}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl animate-bounce flex-shrink-0">
            {isDouble ? '🛵' : '🏍️'}
          </div>
          <div className="flex-1">
            <h2 className="text-white font-bold text-lg leading-tight">
              {isDouble ? `Rota Dupla — ${orders.length} Pedidos!` : 'Nova Corrida!'}
            </h2>
            <p className={`${isDouble ? 'text-blue-100' : 'text-orange-100'} text-xs`}>
              {rejectionCount > 0
                ? `${rejectionCount} recusa${rejectionCount > 1 ? 's' : ''} anterior${rejectionCount > 1 ? 'es' : ''} · Aceite antes do tempo acabar`
                : isDouble
                ? 'Coleta tudo de uma vez, entrega em sequência'
                : 'Aceite antes do tempo acabar'}
            </p>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
            <svg className="absolute -rotate-90" viewBox="0 0 100 100" width="56" height="56">
              <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="9" />
              <circle
                cx="50" cy="50" r={RADIUS} fill="none"
                stroke={timerColor} strokeWidth="9"
                strokeDasharray={circ} strokeDashoffset={timerOffset}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
              />
            </svg>
            <span className="text-white font-bold text-sm z-10">{timeLeft}</span>
          </div>
        </div>

        {/* Map */}
        <div className="h-44 relative flex-shrink-0">
          <MapContainer
            key={`modal-map-${firstOrder.id}`}
            center={storeCoords}
            zoom={13}
            zoomControl={false}
            attributionControl={false}
            className="absolute inset-0 w-full h-full"
          >
            <TileLayer url={DARK_TILES} />
            <FitBoundsModal positions={mapPositions} />
            <Marker position={motoboyCoords} icon={motoIcon} />
            <Marker position={storeCoords} icon={pickupIcon} />
            {deliveryCoordsAll.map((coords, i) => (
              <Marker key={i} position={coords} icon={deliveryIcon} />
            ))}
          </MapContainer>
          <div className="absolute bottom-2 left-2 z-[1001] flex flex-col gap-1 pointer-events-none">
            {[
              ['🏍️', 'Você'],
              ['🏪', 'Coleta'],
              ...deliveryCoordsAll.map((_, i) => [`📍`, isDouble ? `Entrega ${i + 1}` : 'Entrega']),
            ].map(([icon, label]) => (
              <div key={label} className="flex items-center gap-1.5 bg-black/70 rounded-full px-2 py-0.5">
                <span className="text-xs">{icon}</span>
                <span className="text-white text-[10px] font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col gap-3 overflow-y-auto">
          {/* Coleta */}
          <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 text-[10px] font-bold tracking-widest">COLETA</p>
              <p className="text-white text-sm font-semibold leading-tight">{firstOrder.storeName || `Loja #${firstOrder.storeId}`}</p>
              {(() => {
                const storeAddr = firstOrder.storeAddress || mockStores.find(s => s.id === firstOrder.storeId)?.address;
                return storeAddr ? <p className="text-gray-400 text-xs mt-0.5 leading-snug">{storeAddr}</p> : null;
              })()}
            </div>
          </div>

          {/* Delivery addresses */}
          <div className="space-y-2">
            {orders.map((order, i) => (
              <div key={order.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-gray-400 text-[10px] font-bold tracking-widest">
                    {isDouble ? `ENTREGA ${i + 1} · #${order.id.slice(-5).toUpperCase()}` : 'ENTREGA'}
                  </p>
                  {order.deliveryAddress ? (
                    <>
                      <p className="text-white text-sm font-semibold leading-tight">
                        {order.deliveryAddress.logradouro}, {order.deliveryAddress.numero}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5 leading-snug">
                        {order.deliveryAddress.bairro}{order.deliveryAddress.cidade ? ` — ${order.deliveryAddress.cidade}` : ''}
                      </p>
                    </>
                  ) : (
                    <p className="text-white text-sm font-semibold">Endereço não informado</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Value + KM */}
          <div className="flex gap-2">
            <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
              <p className="text-green-400 text-[10px] font-bold tracking-widest mb-1">
                {isDouble ? 'VALOR TOTAL' : 'VALOR'}
              </p>
              <p className="text-green-400 text-xl font-bold">
                R$ {totalValue.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="flex-1 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
              <p className="text-orange-400 text-[10px] font-bold tracking-widest mb-1">
                {isDouble ? 'KM TOTAL' : 'DISTÂNCIA'}
              </p>
              <p className="text-orange-400 text-xl font-bold">{formatKm(totalKm)}</p>
            </div>
            {isDouble && (
              <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                <p className="text-blue-400 text-[10px] font-bold tracking-widest mb-1">PEDIDOS</p>
                <p className="text-blue-400 text-xl font-bold">{orders.length}x</p>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1 pb-1">
            <button
              data-testid="btn-reject-route"
              onClick={onReject}
              className="flex-1 py-3.5 rounded-2xl bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold text-sm transition-colors border border-red-500/25 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Recusar
            </button>
            <button
              data-testid="btn-accept-route"
              onClick={onAccept}
              className="flex-[2] py-3.5 rounded-2xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Aceitar Corrida
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
