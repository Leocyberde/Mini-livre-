import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { useMotoboy } from '@/contexts/MotoboyContext';
import { useMotoboyRegistry } from '@/contexts/MotoboyRegistryContext';
import {
  Bell, BellDot, Navigation, Eye, EyeOff, DollarSign,
  MapPin, MapPinOff, Search, Sun, Moon, AlertCircle, X,
} from 'lucide-react';
import { NotificationsSheet } from '../components/NotificationsSheet';
import { RouteSheet } from '../components/RouteSheet';
import {
  createMotoIcon, DEFAULT_CENTER, DARK_TILES, LIGHT_TILES,
  DARK_ATTRIBUTION, LIGHT_ATTRIBUTION, FlyToLocation,
} from '../utils/mapUtils';
import { formatCurrency } from '../utils/formatters';

export function InicioTab({ isDark, onToggleDark, onOpenColeta }: { isDark: boolean; onToggleDark: () => void; onOpenColeta?: () => void }) {
  const {
    status, setStatus, locationEnabled, requestLocation,
    balanceVisible, toggleBalanceVisible,
    todayEarnings, todayRides, unreadCount, totalRejectedRides,
  } = useMotoby();
  const { activeMotoboyId, activeMotoboy, updateMotoboyStatus } = useMotoboyRegistry();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapReady, setMapReady] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationRequesting, setLocationRequesting] = useState(false);

  // Auto-close location modal and set available when location becomes enabled
  useEffect(() => {
    if (locationEnabled && showLocationModal) {
      setShowLocationModal(false);
      setLocationRequesting(false);
      const next = 'available';
      setStatus(next);
      if (activeMotoboyId) updateMotoboyStatus(activeMotoboyId, next);
    }
  }, [locationEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRequestLocationAndEnable = () => {
    setLocationRequesting(true);
    requestLocation();
    // locationEnabled changing will trigger the useEffect above
    // Reset requesting flag after a timeout in case the browser doesn't respond
    setTimeout(() => setLocationRequesting(false), 5000);
  };

  const isOnRoute = status === 'on_route';
  const isAvailable = status === 'available';

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserCoords([pos.coords.latitude, pos.coords.longitude]);
          setMapReady(true);
        },
        () => setMapReady(true),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setMapReady(true);
    }
  }, []);

  const motoIcon = createMotoIcon();

  return (
    <div className="relative h-full overflow-hidden" data-testid="tab-inicio">
      {showNotifications && <NotificationsSheet onClose={() => setShowNotifications(false)} isDark={isDark} />}
      {showRoute && <RouteSheet onClose={() => setShowRoute(false)} isDark={isDark} />}

      {/* Location request modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm" data-testid="location-modal">
          <div className="w-full max-w-sm bg-[#1c1c1c] rounded-t-3xl p-6 pb-10 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex flex-col items-center text-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Localização necessária</h3>
                <p className="text-gray-400 text-sm leading-snug">
                  Precisamos da sua localização para mostrar rotas próximas e deixar você disponível para receber corridas.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                data-testid="btn-location-enable"
                onClick={handleRequestLocationAndEnable}
                disabled={locationRequesting}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {locationRequesting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Aguardando permissão...
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
                    Habilitar localização
                  </>
                )}
              </button>
              <button
                data-testid="btn-location-cancel"
                onClick={() => { setShowLocationModal(false); setLocationRequesting(false); }}
                className="w-full py-3.5 rounded-2xl bg-white/8 hover:bg-white/12 text-gray-400 font-medium text-sm transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAP — full screen */}
      {mapReady && (
        <MapContainer
          center={userCoords}
          zoom={15}
          zoomControl={false}
          attributionControl={true}
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 0 }}
        >
          <TileLayer
            url={isDark ? DARK_TILES : LIGHT_TILES}
            attribution={isDark ? DARK_ATTRIBUTION : LIGHT_ATTRIBUTION}
          />
          <FlyToLocation coords={userCoords} />
          <Marker position={userCoords} icon={motoIcon} />
        </MapContainer>
      )}

      {/* TOP OVERLAY */}
      <div className="absolute top-0 inset-x-0 z-[1001] px-4 pt-4 space-y-2.5">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-gray-600 border-2 border-white flex items-center justify-center text-xl flex-shrink-0 shadow-lg overflow-hidden" title={activeMotoboy?.name}>
            {activeMotoboy?.avatar ?? '🏍️'}
          </div>

          {/* Status button */}
          {isOnRoute ? (
            <button
              data-testid="btn-on-route"
              onClick={() => onOpenColeta?.()}
              className="flex-1 py-3 rounded-full bg-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              <Navigation className="w-4 h-4 animate-pulse" />
              Em Rota
            </button>
          ) : (
            <button
              data-testid="btn-toggle-status"
              onClick={() => {
                if (!locationEnabled) {
                  setShowLocationModal(true);
                  return;
                }
                const next = isAvailable ? 'unavailable' : 'available';
                setStatus(next);
                if (activeMotoboyId) updateMotoboyStatus(activeMotoboyId, next);
              }}
              className={`flex-1 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                isAvailable
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-800/80 text-gray-300 backdrop-blur-sm'
              }`}
            >
              {isAvailable ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Disponível
                </>
              ) : (
                <>
                  <MapPinOff className="w-4 h-4" />
                  Indisponível
                </>
              )}
            </button>
          )}

          {/* Bell */}
          <button
            data-testid="btn-notifications"
            onClick={() => setShowNotifications(true)}
            className="relative w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-lg flex-shrink-0"
          >
            {unreadCount > 0 ? (
              <BellDot className="w-5 h-5 text-white" />
            ) : (
              <Bell className="w-5 h-5 text-white" />
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dark/Light toggle */}
          <button
            data-testid="btn-toggle-dark"
            onClick={onToggleDark}
            className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-lg flex-shrink-0"
          >
            {isDark
              ? <Sun className="w-5 h-5 text-yellow-300" />
              : <Moon className="w-5 h-5 text-white" />
            }
          </button>
        </div>

        {/* Location disabled banner */}
        {!locationEnabled && (
          <button
            data-testid="btn-enable-location"
            onClick={() => setShowLocationModal(true)}
            className="w-full flex items-center gap-2 bg-amber-500/90 backdrop-blur-sm rounded-full px-4 py-2.5 shadow-lg"
          >
            <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
            <span className="text-white text-sm font-medium">Ative a localização para ficar disponível</span>
          </button>
        )}

        {isAvailable && locationEnabled && (
          <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2.5 shadow-md">
            <Search className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-green-400 text-sm font-medium">Estamos procurando rotas pra você</span>
          </div>
        )}
      </div>

      {/* Stats popup */}
      {showStats && (
        <div className="absolute bottom-24 inset-x-4 z-[1002]">
          <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-2xl p-4 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Resumo de hoje</span>
              <button onClick={() => setShowStats(false)} className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-[10px] font-bold tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CORRIDAS</p>
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{todayRides}</p>
              </div>
              <div className="rounded-xl p-3 text-center bg-red-500/10 border border-red-500/20">
                <p className="text-[10px] font-bold tracking-widest mb-1 text-red-400">RECUSADAS</p>
                <p className="text-xl font-bold text-red-400">{totalRejectedRides}</p>
              </div>
              <div className="rounded-xl p-3 text-center bg-green-500/10 border border-green-500/20">
                <p className="text-[10px] font-bold tracking-widest mb-1 text-green-400">GANHOS</p>
                <p className="text-lg font-bold text-green-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(todayEarnings)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM EARNINGS CARD */}
      <div className="absolute bottom-4 inset-x-4 z-[1001]">
        <div className="bg-gray-900/85 backdrop-blur-md rounded-full flex items-center px-5 py-3.5 gap-4 shadow-2xl">
          <button
            data-testid="btn-show-stats"
            onClick={() => setShowStats(v => !v)}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center flex-shrink-0"
          >
            <DollarSign className="w-5 h-5 text-white" />
          </button>
          <span className="flex-1 text-center text-2xl font-bold text-white tracking-tight" data-testid="text-today-earnings">
            {formatCurrency(todayEarnings, balanceVisible)}
          </span>
          <button
            data-testid="btn-toggle-balance"
            onClick={toggleBalanceVisible}
            className="text-gray-300 hover:text-white transition-colors flex-shrink-0"
          >
            {balanceVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

