import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { usePublishLocation } from '@/hooks/usePublishLocation';
import L from 'leaflet';
import { useMotoboy } from '@/contexts/MotoboyContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useMotoboyRegistry } from '@/contexts/MotoboyRegistryContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMotoboyClientChat } from '@/contexts/MotoboyClientChatContext';
import { Order, mockStoreCoords, mockStores, Store } from '@/lib/mockData';
import { formatKm, calcDoubleRouteValues, calcMotoRideValue, haversineKm } from '@/lib/deliveryCalc';
import {
  Home, TrendingUp, HelpCircle, MoreHorizontal,
  Eye, EyeOff, Bell, BellDot, Navigation,
  CheckCircle2, ArrowDownCircle, ArrowUpCircle,
  Wallet, Clock, X, DollarSign, Search, Sun, Moon,
  MapPinOff, MapPin, AlertCircle, MessageCircle, Map, User, Smartphone, Delete, Send, UserRound,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSupport, MOTOBOY_SUPPORT_OPTIONS, MOTOBOY_ENTREGA_SUPPORT_OPTIONS, MOTOBOY_CHEGADA_SUPPORT_OPTIONS, SupportCategory } from '@/contexts/SupportContext';
import { authApi } from '@/lib/authFetch';

function MotoboySupportModal({
  onClose,
  orderId,
  options = MOTOBOY_SUPPORT_OPTIONS,
}: {
  onClose: () => void;
  orderId?: string;
  options?: { emoji: string; label: SupportCategory; description: string }[];
}) {
  const { user } = useAuth();
  const motoboyId = user?.id ?? '';
  const motoboyName = user?.name ?? '🏍️ Motoboy';
  const { submitMotoboyTicket, sendMessage, getMotoboyActiveTicket } = useSupport();
  const activeTicket = getMotoboyActiveTicket(motoboyId);

  const [step, setStep] = useState<'menu' | 'form' | 'sent' | 'chat'>(() => {
    if (activeTicket) return activeTicket.status === 'in_chat' ? 'chat' : 'sent';
    return 'menu';
  });
  const [selectedCategory, setSelectedCategory] = useState<SupportCategory | null>(null);
  const [messageText, setMessageText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicket?.chat.length]);

  const handleSelectOption = (category: SupportCategory, description: string) => {
    setSelectedCategory(category);
    setMessageText(description);
    setStep('form');
  };

  const handleSubmit = () => {
    if (!selectedCategory || !messageText.trim()) return;
    submitMotoboyTicket(motoboyId, motoboyName, selectedCategory, messageText.trim(), orderId);
    setStep('sent');
  };

  const handleSendMessage = () => {
    const ticket = getMotoboyActiveTicket(motoboyId);
    if (!ticket || !chatInput.trim()) return;
    sendMessage(ticket.id, 'motoboy', chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm bg-[#1a1a1a] rounded-t-3xl pb-8 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
          {step !== 'menu' && step !== 'sent' && (
            <button onClick={() => setStep('menu')} className="text-white/60 hover:text-white text-sm">← Voltar</button>
          )}
          {(step === 'menu' || step === 'sent') && <div />}
          <p className="text-white font-bold text-sm tracking-wide">
            {step === 'menu' && 'Precisa de ajuda?'}
            {step === 'form' && selectedCategory}
            {step === 'sent' && 'Mensagem enviada'}
            {step === 'chat' && 'Chat com suporte'}
          </p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {/* Menu step */}
          {step === 'menu' && (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm text-center mb-4">Selecione o tipo de ocorrência:</p>
              {options.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => handleSelectOption(opt.label, opt.description)}
                  className="w-full flex items-center gap-4 bg-[#252525] border border-white/10 rounded-2xl p-4 hover:bg-[#2e2e2e] transition-colors text-left"
                >
                  <span className="text-2xl flex-shrink-0">{opt.emoji}</span>
                  <div>
                    <p className="text-white font-semibold text-sm">{opt.label}</p>
                    <p className="text-gray-400 text-xs mt-0.5 leading-snug">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Form step */}
          {step === 'form' && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm leading-snug">Descreva o ocorrido com mais detalhes para ajudar o suporte:</p>
              <textarea
                className="w-full bg-[#252525] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/40 placeholder-gray-500"
                rows={4}
                placeholder="Descreva o problema..."
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
              />
              <button
                onClick={handleSubmit}
                disabled={!messageText.trim()}
                className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar para o suporte
              </button>
            </div>
          )}

          {/* Sent step */}
          {step === 'sent' && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-green-400" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">Mensagem enviada!</p>
                <p className="text-gray-400 text-sm mt-2 leading-snug">
                  Sua solicitação foi recebida pelo suporte. Aguarde que já vamos entrar em contato com você.
                </p>
              </div>
              {activeTicket?.status === 'in_chat' && (
                <button
                  onClick={() => setStep('chat')}
                  className="mt-2 px-6 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Abrir chat com suporte
                </button>
              )}
            </div>
          )}

          {/* Chat step */}
          {step === 'chat' && activeTicket && (
            <div className="space-y-3">
              <div className="bg-[#252525] rounded-2xl p-3 mb-2">
                <p className="text-xs text-gray-400 font-semibold">{activeTicket.category}</p>
                <p className="text-xs text-gray-500 mt-0.5">{activeTicket.message}</p>
              </div>
              <div className="space-y-2 min-h-[160px] max-h-[240px] overflow-y-auto">
                {activeTicket.chat.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.sender === 'admin'
                        ? 'bg-[#2e2e2e] text-white rounded-bl-sm'
                        : 'bg-red-500 text-white rounded-br-sm'
                    }`}>
                      {msg.sender === 'admin' && <p className="text-[10px] font-semibold text-gray-400 mb-1">Suporte</p>}
                      <p className="leading-snug">{msg.text}</p>
                      <p className="text-[10px] mt-1 text-white/50">
                        {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Chat input */}
        {step === 'chat' && activeTicket?.status === 'in_chat' && (
          <div className="flex items-center gap-2 px-5 pt-3 border-t border-white/10 flex-shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && chatInput.trim()) handleSendMessage(); }}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-[#252525] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 placeholder-gray-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MotoboyClientChatModal({
  onClose,
  order,
}: {
  onClose: () => void;
  order: Order;
}) {
  const { getMessages, sendMessage, markRead } = useMotoboyClientChat();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messages = getMessages(order.id);
  const customerName = order.customerName || 'Cliente';

  useEffect(() => {
    markRead(order.id, 'motoboy');
  }, [messages.length, order.id, markRead]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(order.id, 'motoboy', input.trim());
    setInput('');
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-[#1a1a1a] rounded-t-3xl pb-safe shadow-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <UserRound className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{customerName}</p>
              <p className="text-gray-500 text-xs">Cliente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm text-center">
              <UserRound className="w-8 h-8 mb-2 opacity-30" />
              <p>Nenhuma mensagem ainda.</p>
              <p className="text-xs mt-1">Fale com {customerName} aqui.</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'motoboy' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.sender === 'motoboy'
                  ? 'bg-red-500 text-white rounded-br-sm'
                  : 'bg-[#2e2e2e] text-white rounded-bl-sm'
              }`}>
                {msg.sender === 'client' && (
                  <p className="text-[10px] font-semibold text-blue-400 mb-1">{customerName}</p>
                )}
                <p className="leading-snug">{msg.text}</p>
                <p className="text-[10px] mt-1 text-white/50">
                  {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="flex items-center gap-2 px-4 pt-3 pb-6 border-t border-white/10 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) handleSend(); }}
            placeholder={`Mensagem para ${customerName}...`}
            className="flex-1 bg-[#252525] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder-gray-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

type TabType = 'inicio' | 'financeiro' | 'ajuda' | 'mais';

const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333]; // São Paulo

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DARK_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';
const LIGHT_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function createMotoIcon() {
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

function FlyToLocation({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(coords, 15, { duration: 1.2 });
  }, [coords, map]);
  return null;
}

function FitBoundsModal({ positions }: { positions: [number, number][] }) {
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

function createPickupIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="background:#f97316;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:2px solid white;">🏪</div>`,
    iconAnchor: [17, 17],
    iconSize: [34, 34],
  });
}

function createDeliveryIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="background:#ef4444;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:2px solid white;">📍</div>`,
    iconAnchor: [17, 17],
    iconSize: [34, 34],
  });
}

function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.5, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    beep(880, 0, 0.22);
    beep(1100, 0.28, 0.22);
    beep(880, 0.56, 0.22);
    beep(1320, 0.84, 0.4);
  } catch {
    // Audio not available
  }
}

function RouteNotificationModal({
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

function StackingModal({
  stackOrder,
  currentRouteValue,
  currentRouteKm,
  betweenKm,
  onAccept,
  onReject,
}: {
  stackOrder: Order;
  currentRouteValue: number;
  currentRouteKm: number;
  betweenKm: number;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(60);
  const onRejectRef = useRef(onReject);
  useEffect(() => { onRejectRef.current = onReject; }, [onReject]);

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(v => {
        if (v <= 1) { clearInterval(t); onRejectRef.current(); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // totalRouteKm = store → first delivery + first delivery → second delivery
  const addValue = calcDoubleRouteValues(currentRouteKm + betweenKm).order2Value;
  const newTotal = parseFloat((currentRouteValue + addValue).toFixed(2));

  const RADIUS = 36;
  const circ = 2 * Math.PI * RADIUS;
  const timerOffset = circ * (1 - timeLeft / 60);
  const timerColor = timeLeft > 15 ? '#ffffff' : '#fca5a5';

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 backdrop-blur-sm p-3">
      <div className="w-full max-w-sm bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-purple-600 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl animate-bounce flex-shrink-0">
            🛵
          </div>
          <div className="flex-1">
            <h2 className="text-white font-bold text-base leading-tight">Rota adicional disponível!</h2>
            <p className="text-purple-100 text-xs mt-0.5">Mesma loja — adicione ao trajeto atual</p>
          </div>
          <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
            <svg className="absolute -rotate-90" viewBox="0 0 100 100" width="48" height="48">
              <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="10" />
              <circle
                cx="50" cy="50" r={RADIUS} fill="none"
                stroke={timerColor} strokeWidth="10"
                strokeDasharray={circ} strokeDashoffset={timerOffset}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
              />
            </svg>
            <span className="text-white font-bold text-sm z-10">{timeLeft}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* New delivery address */}
          <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-gray-400 text-[10px] font-bold tracking-widest">2ª ENTREGA</p>
              {stackOrder.deliveryAddress ? (
                <>
                  <p className="text-white text-sm font-semibold leading-tight">
                    {stackOrder.deliveryAddress.logradouro}, {stackOrder.deliveryAddress.numero}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {stackOrder.deliveryAddress.bairro}{stackOrder.deliveryAddress.cidade ? ` — ${stackOrder.deliveryAddress.cidade}` : ''}
                  </p>
                </>
              ) : (
                <p className="text-white text-sm font-semibold">Endereço não informado</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 text-center">
              <p className="text-orange-400 text-[9px] font-bold tracking-widest mb-1">+KM</p>
              <p className="text-orange-400 text-base font-bold">{formatKm(betweenKm)}</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-2.5 text-center">
              <p className="text-purple-400 text-[9px] font-bold tracking-widest mb-1">+VALOR</p>
              <p className="text-purple-400 text-base font-bold">+R$ {addValue.toFixed(2).replace('.', ',')}</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 text-center">
              <p className="text-green-400 text-[9px] font-bold tracking-widest mb-1">NOVO TOTAL</p>
              <p className="text-green-400 text-base font-bold">R$ {newTotal.toFixed(2).replace('.', ',')}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              data-testid="btn-reject-stack"
              onClick={onReject}
              className="flex-1 py-3 rounded-2xl bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold text-sm transition-colors border border-red-500/25 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Recusar
            </button>
            <button
              data-testid="btn-accept-stack"
              onClick={onAccept}
              className="flex-[2] py-3 rounded-2xl bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Adicionar à rota
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number, visible: boolean) {
  if (!visible) return 'R$ ••••';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function NotificationsSheet({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const { notifications, markAllRead, unreadCount } = useMotoboy();
  const bg = isDark ? 'bg-gray-900' : 'bg-white';
  const border = isDark ? 'border-gray-800' : 'border-gray-100';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const unreadBg = isDark ? 'bg-blue-900/40' : 'bg-blue-50/60';

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col" data-testid="notifications-sheet">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative mt-auto ${bg} rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl`}>
        <div className={`flex items-center justify-between px-5 pt-5 pb-3 border-b ${border}`}>
          <div className="flex items-center gap-2">
            <Bell className={`w-5 h-5 text-primary`} />
            <h2 className={`font-semibold text-base ${textMain}`}>Notificações</h2>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-2 py-0.5">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary font-medium">
                Marcar todas
              </button>
            )}
            <button onClick={onClose} className={`${textSub} hover:text-gray-400`}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className={`overflow-y-auto flex-1 divide-y ${isDark ? 'divide-gray-800' : 'divide-gray-50'}`}>
          {notifications.length === 0 && (
            <div className={`py-12 text-center ${textSub} text-sm`}>Nenhuma notificação</div>
          )}
          {notifications.map(n => (
            <div
              key={n.id}
              className={`px-5 py-4 flex items-start gap-3 ${!n.read ? unreadBg : ''}`}
              data-testid={`notification-item-${n.id}`}
            >
              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-primary' : 'bg-gray-500'}`} />
              <div className="flex-1">
                <p className={`text-sm leading-snug ${!n.read ? `${textMain} font-medium` : textSub}`}>{n.message}</p>
                <p className={`text-xs ${textSub} mt-1`}>{formatTime(n.time)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RouteSheet({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const { currentRoute, finishRoute } = useMotoboy();
  if (!currentRoute) return null;
  const bg = isDark ? 'bg-gray-900' : 'bg-white';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-gray-50';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col" data-testid="route-sheet">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative mt-auto ${bg} rounded-t-2xl shadow-2xl p-5 pb-10`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-orange-500" />
            <h2 className={`font-semibold text-base ${textMain}`}>Rota Atual</h2>
          </div>
          <button onClick={onClose} className={textSub}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3 mb-6">
          <div className={`flex items-start gap-3 ${cardBg} rounded-xl p-3`}>
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div>
              <p className={`text-xs ${textSub} font-medium`}>RETIRADA</p>
              <p className={`text-sm font-medium ${textMain} mt-0.5`}>{currentRoute.from}</p>
            </div>
          </div>
          <div className={`flex items-start gap-3 ${cardBg} rounded-xl p-3`}>
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <div>
              <p className={`text-xs ${textSub} font-medium`}>ENTREGA</p>
              <p className={`text-sm font-medium ${textMain} mt-0.5`}>{currentRoute.to}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-6">
          <span className={`${textSub} text-sm`}>Valor da corrida</span>
          <span className={`text-xl font-bold ${textMain}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentRoute.value)}
          </span>
        </div>
        <button
          data-testid="btn-finish-route"
          onClick={() => { finishRoute(); onClose(); }}
          className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          Finalizar Entrega
        </button>
      </div>
    </div>
  );
}

const COLETA_DURATION = 15 * 60; // 15 minutes in seconds

function ColetaScreen({
  onGoHome,
  onTimeout,
  onArrivedAtPickup,
  orderId,
}: {
  onGoHome: () => void;
  onTimeout: () => void;
  onArrivedAtPickup: () => void;
  orderId: string;
}) {
  const { currentRoute } = useMotoboy();
  const [secondsLeft, setSecondsLeft] = useState(COLETA_DURATION);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [holdDone, setHoldDone] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const timedOut = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Countdown — runs once on mount, decrements every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(interval);
          if (!timedOut.current) {
            timedOut.current = true;
            onTimeoutRef.current();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format countdown as mm:ss
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdownStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // ETA fixed at mount time (now + 15 min), never changes
  const [etaStr] = useState(() =>
    new Date(Date.now() + COLETA_DURATION * 1000)
      .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );

  // Timer is urgent when < 3 minutes left
  const isUrgent = secondsLeft < 180;
  const progressPct = ((COLETA_DURATION - secondsLeft) / COLETA_DURATION) * 100;

  // Hold-to-confirm handlers
  const startHold = () => {
    if (holdDone) return;
    holdTimer.current = setInterval(() => {
      setHoldProgress(p => {
        if (p >= 100) {
          clearInterval(holdTimer.current!);
          setHoldDone(true);
          setShowConfirmModal(true);
          return 100;
        }
        return p + 1.67;
      });
    }, 50);
  };

  const cancelHold = () => {
    if (holdDone) return;
    if (holdTimer.current) clearInterval(holdTimer.current);
    setHoldProgress(0);
  };

  const openWaze = () => {
    const address = encodeURIComponent(currentRoute?.storeAddress || currentRoute?.from || '');
    window.open(`https://waze.com/ul?q=${address}&navigate=yes`, '_blank');
  };

  const handleConfirmArrival = () => {
    setShowConfirmModal(false);
    onArrivedAtPickup();
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setHoldDone(false);
    setHoldProgress(0);
  };

  if (!currentRoute) return null;

  void orderId;

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#111111]" data-testid="coleta-screen">
      {/* Confirmation modal — shown after holding the button */}
      {showConfirmModal && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1c1c1c] rounded-t-3xl p-6 pb-10 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
            </div>
            <h3 className="text-white font-bold text-lg text-center mb-1">Chegou na coleta?</h3>
            <p className="text-gray-400 text-sm text-center mb-6">Confirme sua chegada para prosseguir com a entrega</p>
            <div className="flex flex-col gap-3">
              <button
                data-testid="btn-confirm-arrival"
                onClick={handleConfirmArrival}
                className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirmar chegada na coleta
              </button>
              <button
                data-testid="btn-cancel-arrival"
                onClick={handleCancelConfirm}
                className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          data-testid="btn-coleta-home"
          onClick={onGoHome}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
        >
          <Home className="w-6 h-6" />
        </button>
        <span className="text-white font-bold tracking-[0.2em] text-sm">COLETA</span>
        <button
          data-testid="btn-coleta-support"
          onClick={() => setShowSupportModal(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white/90 transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

      {showSupportModal && <MotoboySupportModal onClose={() => setShowSupportModal(false)} orderId={orderId} />}

      {/* Drag handle */}
      <div className="flex justify-center mb-2">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      <div className="flex-1 px-4 space-y-3 overflow-y-auto pb-6">
        {/* Store info card (Coleta) */}
        <div className="bg-[#1c1c1c] rounded-2xl p-4 flex items-center gap-3 border border-white/5">
          <div className="flex-1 min-w-0">
            <p className="text-orange-400 text-[10px] font-bold tracking-widest mb-0.5">🏪 COLETA</p>
            <p className="text-white font-bold text-base leading-tight">{currentRoute.from}</p>
            <p className="text-gray-400 text-sm mt-1 leading-snug">
              {currentRoute.storeAddress || 'Endereço não informado'}
            </p>
          </div>
          <button
            data-testid="btn-waze"
            onClick={openWaze}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 w-16 h-16 rounded-2xl border-2 border-red-500 text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Map className="w-5 h-5" />
            <span className="text-[11px] font-bold tracking-wide">Mapa</span>
          </button>
        </div>

        {/* Delivery address card (Entrega) */}
        {currentRoute.to && currentRoute.to !== 'Destino' && (
          <div className="bg-[#1c1c1c] rounded-2xl p-4 border border-white/5">
            <p className="text-red-400 text-[10px] font-bold tracking-widest mb-1">📍 ENTREGA</p>
            <p className="text-white font-semibold text-sm leading-snug">{currentRoute.to}</p>
          </div>
        )}

        {/* Timer card */}
        <div className={`rounded-2xl p-4 border transition-colors ${isUrgent ? 'bg-red-950/40 border-red-500/30' : 'bg-[#1c1c1c] border-white/5'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-bold text-base">Você está indo pra coleta</p>
            {isUrgent && (
              <span className="text-red-400 text-xs font-bold animate-pulse">⚠ URGENTE</span>
            )}
          </div>
          {/* Countdown */}
          <div className="text-center mb-3">
            <div className={`text-4xl font-bold tabular-nums ${isUrgent ? 'text-red-400' : 'text-white'}`}>
              {countdownStr}
            </div>
            <div className="flex justify-center gap-8 mt-1">
              <span className="text-gray-500 text-[10px] font-medium tracking-widest">MIN</span>
              <span className="text-gray-500 text-[10px] font-medium tracking-widest">SEG</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-400 text-sm">Previsão de chegada:</span>
            <span className={`font-bold text-sm ${isUrgent ? 'text-red-400' : 'text-white'}`}>{etaStr}</span>
          </div>
          {isUrgent && (
            <p className="text-red-400/70 text-xs mt-2">
              Se não chegar a tempo, a corrida será redirecionada para outro motoboy.
            </p>
          )}
        </div>
      </div>

      {/* Hold-to-confirm bottom button */}
      <div className="px-4 pb-10 pt-2 flex-shrink-0">
        <div className="relative overflow-hidden rounded-2xl">
          <div
            className="absolute inset-0 bg-green-500 rounded-2xl transition-none"
            style={{ width: `${holdProgress}%`, opacity: 0.9 }}
          />
          <button
            data-testid="btn-cheguei-coleta"
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            className="relative z-10 w-full py-5 rounded-2xl border-2 border-red-500 text-red-500 font-bold text-base tracking-wide transition-colors select-none"
            style={{
              color: holdProgress > 50 ? 'white' : undefined,
              borderColor: holdProgress > 50 ? 'transparent' : undefined,
            }}
          >
            Cheguei na coleta
          </button>
        </div>
        <p className="text-center text-gray-600 text-xs mt-2">Segure o botão para confirmar</p>
      </div>
    </div>
  );
}

function PickupScreen({
  order,
  orders,
  store,
  onGoHome,
  onConclude,
}: {
  order: Order;
  orders?: Order[];
  store: Store | undefined;
  onGoHome: () => void;
  onConclude: () => void;
}) {
  const { currentRoute } = useMotoboy();
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [holdDone, setHoldDone] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const allPickupOrders = (orders && orders.length > 0) ? orders : [order];
  const isDouble = allPickupOrders.length >= 2;
  const storeName = order.storeName || store?.name || `Loja #${order.storeId}`;
  const storeAddress = currentRoute?.storeAddress || order.storeAddress || store?.address || 'Endereço não informado';
  const orderCode = order.id;

  const openWaze = () => {
    const address = encodeURIComponent(storeAddress);
    window.open(`https://waze.com/ul?q=${address}&navigate=yes`, '_blank');
  };

  const startHold = () => {
    if (holdDone) return;
    holdTimer.current = setInterval(() => {
      setHoldProgress(p => {
        if (p >= 100) {
          clearInterval(holdTimer.current!);
          setHoldDone(true);
          setShowConfirmModal(true);
          return 100;
        }
        return p + 1.67;
      });
    }, 50);
  };

  const cancelHold = () => {
    if (holdDone) return;
    if (holdTimer.current) clearInterval(holdTimer.current);
    setHoldProgress(0);
  };

  const handleConfirmCollect = () => {
    setShowConfirmModal(false);
    onConclude();
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setHoldDone(false);
    setHoldProgress(0);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#111111]" data-testid="pickup-screen">
      {/* Confirmation modal */}
      {showConfirmModal && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1c1c1c] rounded-t-3xl p-6 pb-10 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-orange-400" />
              </div>
            </div>
            <h3 className="text-white font-bold text-lg text-center mb-1">Coletou os pedidos?</h3>
            <p className="text-gray-400 text-sm text-center mb-6">
              Confirme que você retirou todos os itens da loja
            </p>
            <div className="flex flex-col gap-3">
              <button
                data-testid="btn-confirm-collect"
                onClick={handleConfirmCollect}
                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirmar coleta
              </button>
              <button
                data-testid="btn-cancel-collect"
                onClick={handleCancelConfirm}
                className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          data-testid="btn-pickup-home"
          onClick={onGoHome}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
        >
          <Home className="w-6 h-6" />
        </button>
        <span className="text-white font-bold tracking-[0.2em] text-sm">COLETA</span>
        <button
          data-testid="btn-pickup-support"
          onClick={() => setShowSupportModal(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white/90 transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

      {showSupportModal && <MotoboySupportModal onClose={() => setShowSupportModal(false)} orderId={order.id} />}

      {/* Drag handle */}
      <div className="flex justify-center mb-2">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      <div className="flex-1 px-4 space-y-3 overflow-y-auto pb-6">
        {/* Store info card (Coleta) */}
        <div className="bg-[#1c1c1c] rounded-2xl p-4 border border-white/5">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-orange-400 text-[10px] font-bold tracking-widest mb-1">🏪 COLETA</p>
              <p className="text-white font-bold text-base leading-tight">{storeName}</p>
              <p className="text-gray-400 text-sm mt-1 leading-snug">{storeAddress}</p>
            </div>
            <button
              data-testid="btn-pickup-waze"
              onClick={openWaze}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 w-16 h-16 rounded-2xl border-2 border-red-500 text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Map className="w-5 h-5" />
              <span className="text-[11px] font-bold tracking-wide">Mapa</span>
            </button>
          </div>
        </div>

        {/* Delivery address card (Entrega) */}
        {order.deliveryAddress && (
          <div className="bg-[#1c1c1c] rounded-2xl p-4 border border-white/5">
            <p className="text-red-400 text-[10px] font-bold tracking-widest mb-1">📍 ENTREGA</p>
            <p className="text-white font-semibold text-sm leading-tight">
              {order.deliveryAddress.logradouro}, {order.deliveryAddress.numero}
            </p>
            <p className="text-gray-400 text-sm mt-0.5 leading-snug">
              {order.deliveryAddress.bairro}{order.deliveryAddress.cidade ? ` — ${order.deliveryAddress.cidade}` : ''}
            </p>
          </div>
        )}

        {/* Instructions card */}
        <div className="bg-[#1c1c1c] rounded-2xl p-4 border border-white/5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-400 text-sm">💡</span>
          </div>
          <div>
            <p className="text-blue-400 font-semibold text-sm mb-1">Confirmação da coleta</p>
            <p className="text-gray-400 text-sm leading-snug">
              Segure o botão para confirmar que coletou os pedidos
            </p>
          </div>
        </div>

        {/* Double route banner */}
        {isDouble && (
          <div className="bg-purple-500/15 border border-purple-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-purple-400 text-sm">🔄</span>
            <p className="text-purple-300 text-sm font-semibold">Rota dupla — colete os {allPickupOrders.length} pedidos de uma vez</p>
          </div>
        )}

        {/* Order items */}
        {allPickupOrders.map((o, i) => (
          <div key={o.id} className="bg-[#1c1c1c] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-white text-sm font-bold">
                {isDouble ? `${i + 1}° Pedido` : '1° Pedido'}: #{o.id.slice(-5).toUpperCase()}
              </span>
              <span className="bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-500/30">
                Pronto
              </span>
            </div>
            <div className="px-4 py-2.5 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className="text-gray-400 text-xs">Cliente:</span>
              <span className="text-gray-200 text-xs font-semibold ml-auto">—</span>
            </div>
            {o.deliveryAddress && (
              <div className="px-4 py-2.5 flex items-start gap-2 border-t border-white/5">
                <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 text-xs leading-snug">
                  {o.deliveryAddress.logradouro}, {o.deliveryAddress.numero} — {o.deliveryAddress.bairro}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hold-to-confirm bottom button */}
      <div className="px-4 pb-10 pt-2 flex-shrink-0">
        <div className="relative overflow-hidden rounded-2xl">
          <div
            className="absolute inset-0 bg-orange-500 rounded-2xl transition-none"
            style={{ width: `${holdProgress}%`, opacity: 0.9 }}
          />
          <button
            data-testid="btn-coletar-pedidos"
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            className="relative z-10 w-full py-5 rounded-2xl border-2 border-red-500 text-red-500 font-bold text-base tracking-wide transition-colors select-none"
            style={{
              color: holdProgress > 50 ? 'white' : undefined,
              borderColor: holdProgress > 50 ? 'transparent' : undefined,
            }}
          >
            Coletar os pedidos
          </button>
        </div>
        <p className="text-center text-gray-600 text-xs mt-2">Segure o botão para confirmar</p>
      </div>
    </div>
  );
}

function ConcluirColetaScreen({
  order,
  orders,
  onGoHome,
  onCollected,
}: {
  order: Order;
  orders?: Order[];
  onGoHome: () => void;
  onCollected: () => void;
}) {
  const allOrders = orders && orders.length > 0 ? orders : [order];
  const isDouble = allOrders.length >= 2;

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#111111]" data-testid="concluir-coleta-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          data-testid="btn-concluir-home"
          onClick={onGoHome}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
        >
          <Home className="w-6 h-6" />
        </button>
        <span className="text-white font-bold tracking-[0.1em] text-xs text-center flex-1 px-2">
          COLETA
        </span>
        <div className="w-10 h-10" />
      </div>

      {/* Drag handle */}
      <div className="flex justify-center mb-4">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      <div className="flex-1 px-4 space-y-4 overflow-y-auto pb-6">
        {/* Main instruction title */}
        <h2 className="text-white font-bold text-xl text-center leading-snug px-2">
          {isDouble
            ? 'Informe os nomes dos clientes para a loja e conclua a coleta'
            : 'Informe o nome do cliente para loja e conclua a coleta para ir para entrega'}
        </h2>

        {/* Info box */}
        <div className="bg-[#1c1c1c] rounded-2xl p-4 border border-white/5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-400 text-sm">💡</span>
          </div>
          <p className="text-gray-300 text-sm leading-snug flex-1">
            {isDouble
              ? 'Colete todos os pedidos de uma vez — as entregas aparecerão em sequência no app'
              : 'As entregas vão aparecer em ordem no app pra facilitar suas rotas'}
          </p>
        </div>

        {/* Order cards */}
        {allOrders.map((o, i) => (
          <div key={o.id} className="bg-[#1c1c1c] rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-white/10">
              <span className="text-white font-bold text-base">
                {isDouble ? `${i + 1}° Pedido: #${o.id.slice(-5).toUpperCase()}` : `1° Pedido: #${o.id.slice(-5).toUpperCase()}`}
              </span>
            </div>
            <div className="px-4 py-3.5 flex items-center gap-3">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-400 text-sm">Nome do cliente:</span>
              <span className="text-white font-bold text-sm ml-auto">{o.customerName || 'Cliente'}</span>
            </div>
            {o.deliveryAddress && (
              <div className="px-4 py-3 flex items-center gap-3 border-t border-white/5">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-400 text-xs leading-snug">
                  {o.deliveryAddress.logradouro}, {o.deliveryAddress.numero} — {o.deliveryAddress.bairro}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom button */}
      <div className="px-4 pb-10 pt-2 flex-shrink-0">
        <button
          data-testid="btn-concluir-coleta"
          onClick={onCollected}
          className="w-full py-5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-base tracking-wide transition-colors"
        >
          Concluir a coleta
        </button>
      </div>
    </div>
  );
}

const ENTREGA_DURATION = 15 * 60; // 15 minutes in seconds

function DeliveryChoiceMap({
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

function EntregaScreen({
  order,
  onGoHome,
  onArrived,
  deliveryIndex = 0,
  totalDeliveries = 1,
  allOrders = [],
  onSelectDelivery,
}: {
  order: Order;
  onGoHome: () => void;
  onArrived: () => void;
  deliveryIndex?: number;
  totalDeliveries?: number;
  allOrders?: Order[];
  onSelectDelivery?: (index: number) => void;
}) {
  const { getUnreadCount } = useMotoboyClientChat();
  const customerName = order.customerName || 'Cliente';
  const [secondsLeft, setSecondsLeft] = useState(ENTREGA_DURATION);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showClientChatModal, setShowClientChatModal] = useState(false);
  const clientUnread = getUnreadCount(order.id, 'motoboy');
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdDone, setHoldDone] = useState(false);
  const [showConfirmArrival, setShowConfirmArrival] = useState(false);
  const [showDeliveryMap, setShowDeliveryMap] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDoubleRoute = allOrders.length > 1;

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(interval); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const progressPct = ((ENTREGA_DURATION - secondsLeft) / ENTREGA_DURATION) * 100;

  const [etaStr] = useState(() =>
    new Date(Date.now() + ENTREGA_DURATION * 1000)
      .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );

  const deliveryAddressLine = order.deliveryAddress
    ? `${order.deliveryAddress.logradouro}, ${order.deliveryAddress.numero}, ${order.deliveryAddress.bairro}${order.deliveryAddress.cidade ? `, ${order.deliveryAddress.cidade}` : ''}`
    : 'Endereço não informado';

  const openMap = () => {
    const query = encodeURIComponent(deliveryAddressLine);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const startHold = () => {
    if (holdDone) return;
    holdTimerRef.current = setInterval(() => {
      setHoldProgress(p => {
        if (p >= 100) {
          if (holdTimerRef.current) clearInterval(holdTimerRef.current);
          setHoldDone(true);
          setShowConfirmArrival(true);
          return 100;
        }
        return p + 4;
      });
    }, 80);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    if (!holdDone) setHoldProgress(0);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#111111]" data-testid="entrega-screen">
      {/* Delivery choice map modal */}
      {showDeliveryMap && isDoubleRoute && onSelectDelivery && (
        <DeliveryChoiceMap
          orders={allOrders}
          currentIndex={deliveryIndex}
          onSelectDelivery={onSelectDelivery}
          onClose={() => setShowDeliveryMap(false)}
        />
      )}

      {/* Confirm Arrival Modal */}
      {showConfirmArrival && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1c1c1c] rounded-t-3xl p-6 pb-10 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                <Navigation className="w-7 h-7 text-red-400" />
              </div>
            </div>
            <h3 className="text-white font-bold text-xl text-center mb-2">Você chegou na entrega?</h3>
            <p className="text-gray-400 text-sm text-center mb-6">Confirme apenas quando estiver no endereço do cliente.</p>
            <div className="flex gap-3">
              <button
                data-testid="btn-cancel-arrival"
                onClick={() => { setShowConfirmArrival(false); setHoldDone(false); setHoldProgress(0); }}
                className="flex-1 py-4 rounded-2xl border-2 border-white/20 text-white/70 font-bold text-base transition-colors hover:bg-white/10"
              >
                Voltar
              </button>
              <button
                data-testid="btn-confirm-arrival"
                onClick={() => { setShowConfirmArrival(false); onArrived(); }}
                className="flex-1 py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-base transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          data-testid="btn-entrega-home"
          onClick={onGoHome}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
        >
          <Home className="w-6 h-6" />
        </button>
        <span className="text-white font-bold tracking-[0.2em] text-sm">ENTREGA</span>
        <div className="flex items-center gap-1">
          <button
            data-testid="btn-entrega-client-chat"
            onClick={() => setShowClientChatModal(true)}
            className="relative w-10 h-10 flex items-center justify-center rounded-full text-blue-400 hover:bg-white/10 transition-colors"
          >
            <UserRound className="w-6 h-6" />
            {clientUnread > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-400 border border-[#111111]" />
            )}
          </button>
          <button
            data-testid="btn-entrega-support"
            onClick={() => setShowSupportModal(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white/90 transition-colors"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>
      </div>

      {showSupportModal && <MotoboySupportModal onClose={() => setShowSupportModal(false)} orderId={order.id} options={MOTOBOY_ENTREGA_SUPPORT_OPTIONS} />}
      {showClientChatModal && <MotoboyClientChatModal onClose={() => setShowClientChatModal(false)} order={order} />}

      {/* Drag handle */}
      <div className="flex justify-center mb-4">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      <div className="flex-1 px-4 space-y-3 overflow-y-auto pb-6">
        {/* Double route progress banner + route choice button */}
        {totalDeliveries >= 2 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-purple-500/15 border border-purple-500/30 rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <span className="text-purple-400 text-sm">🔄</span>
              <p className="text-purple-300 text-sm font-semibold">
                {deliveryIndex + 1}ª entrega de {totalDeliveries}
              </p>
            </div>
            {onSelectDelivery && (
              <button
                data-testid="btn-ver-rotas-mapa"
                onClick={() => setShowDeliveryMap(true)}
                className="flex-shrink-0 flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                <Map className="w-4 h-4" />
                <span className="text-[10px] font-bold">Rotas</span>
              </button>
            )}
          </div>
        )}

        {/* Customer + address card with map button */}
        <div className="bg-[#1c1c1c] rounded-2xl p-4 flex items-start gap-3 border border-white/5">
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg leading-tight">{customerName}</p>
            <p className="text-gray-400 text-sm mt-1 leading-snug">{deliveryAddressLine}</p>
          </div>
          <button
            data-testid="btn-entrega-mapa"
            onClick={openMap}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 w-16 h-16 rounded-2xl border-2 border-red-500 text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Map className="w-5 h-5" />
            <span className="text-[11px] font-bold tracking-wide">Mapa</span>
          </button>
        </div>

        {/* Status + ETA card */}
        <div className="bg-[#1c1c1c] rounded-2xl p-4 border border-white/5">
          <p className="text-white font-bold text-base mb-2">Você está indo pra entrega</p>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-1000"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-400 text-sm">Previsão de entrega:</span>
            <span className="text-white font-bold text-sm">{etaStr}</span>
          </div>
        </div>
      </div>

      {/* Bottom button - hold to confirm */}
      <div className="px-4 pb-10 pt-2 flex-shrink-0">
        <div className="relative overflow-hidden rounded-2xl">
          <div
            className="absolute inset-0 bg-red-500 rounded-2xl transition-none"
            style={{ width: `${holdProgress}%`, opacity: 0.9 }}
          />
          <button
            data-testid="btn-cheguei-entrega"
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            className="relative z-10 w-full py-5 rounded-2xl border-2 border-red-500 text-red-500 font-bold text-base tracking-wide transition-colors select-none"
            style={{
              color: holdProgress > 50 ? 'white' : undefined,
              borderColor: holdProgress > 50 ? 'transparent' : undefined,
            }}
          >
            Cheguei na entrega
          </button>
        </div>
        <p className="text-center text-gray-600 text-xs mt-2">Segure o botão para confirmar</p>
      </div>
    </div>
  );
}

function ChegadaEntregaScreen({
  order,
  onGoHome,
  onLeave,
  deliveryIndex = 0,
  totalDeliveries = 1,
}: {
  order: Order;
  onGoHome: () => void;
  onLeave: () => void;
  deliveryIndex?: number;
  totalDeliveries?: number;
}) {
  const { getUnreadCount } = useMotoboyClientChat();
  const [codeVerified, setCodeVerified] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeDigits, setCodeDigits] = useState(['', '', '', '']);
  const [codeError, setCodeError] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showClientChatModal, setShowClientChatModal] = useState(false);
  const clientUnread = getUnreadCount(order.id, 'motoboy');

  const deliveryAddressLine = order.deliveryAddress
    ? `${order.deliveryAddress.logradouro}, ${order.deliveryAddress.numero}, ${order.deliveryAddress.bairro}${order.deliveryAddress.cidade ? `, ${order.deliveryAddress.cidade}` : ''}`
    : 'Endereço não informado';

  const openMap = () => {
    const query = encodeURIComponent(deliveryAddressLine);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const expectedCode = order.customerPhone
    ? order.customerPhone.replace(/\D/g, '').slice(-4)
    : '';

  const enteredCode = codeDigits.join('');

  const handleDigit = (digit: string) => {
    const idx = codeDigits.findIndex(d => d === '');
    if (idx === -1) return;
    const next = [...codeDigits];
    next[idx] = digit;
    setCodeDigits(next);
    setCodeError(false);
  };

  const handleBackspace = () => {
    const filled = codeDigits.filter(d => d !== '');
    if (filled.length === 0) return;
    const next = [...codeDigits];
    const idx = filled.length - 1;
    next[idx] = '';
    setCodeDigits(next);
    setCodeError(false);
  };

  const handleValidate = () => {
    if (enteredCode.length < 4) return;
    if (!expectedCode || enteredCode === expectedCode) {
      setCodeVerified(true);
      setShowCodeModal(false);
    } else {
      setCodeError(true);
      setCodeDigits(['', '', '', '']);
    }
  };

  const numpadButtons = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#111111]" data-testid="chegada-entrega-screen">
      {/* Code input modal */}
      {showCodeModal && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1c1c1c] rounded-t-3xl p-6 pb-10 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Código do cliente</h3>
              <button
                onClick={() => { setShowCodeModal(false); setCodeDigits(['', '', '', '']); setCodeError(false); }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-6 text-center">
              Digite os 4 últimos dígitos do telefone do cliente
            </p>

            {/* 4-digit display */}
            <div className="flex gap-3 justify-center mb-2">
              {codeDigits.map((d, i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold border-2 transition-colors ${
                    codeError
                      ? 'border-red-500 bg-red-500/10 text-red-400'
                      : d
                        ? 'border-red-500 bg-red-500/10 text-white'
                        : 'border-white/20 bg-white/5 text-gray-600'
                  }`}
                >
                  {d || '—'}
                </div>
              ))}
            </div>
            {codeError && (
              <p className="text-red-400 text-xs text-center mb-3">Código incorreto. Tente novamente.</p>
            )}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {numpadButtons.map((btn, i) => {
                if (btn === '') return <div key={i} />;
                if (btn === '⌫') {
                  return (
                    <button
                      key={i}
                      onClick={handleBackspace}
                      className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <Delete className="w-5 h-5 text-white" />
                    </button>
                  );
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleDigit(btn)}
                    className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xl transition-colors"
                  >
                    {btn}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleValidate}
              disabled={enteredCode.length < 4}
              className="mt-4 w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          data-testid="btn-chegada-home"
          onClick={onGoHome}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
        >
          <Home className="w-6 h-6" />
        </button>
        <span className="text-white font-bold tracking-[0.2em] text-sm">ENTREGA</span>
        <div className="flex items-center gap-1">
          <button
            data-testid="btn-chegada-client-chat"
            onClick={() => setShowClientChatModal(true)}
            className="relative w-10 h-10 flex items-center justify-center rounded-full text-blue-400 hover:bg-white/10 transition-colors"
          >
            <UserRound className="w-6 h-6" />
            {clientUnread > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-400 border border-[#111111]" />
            )}
          </button>
          <button
            data-testid="btn-chegada-support"
            onClick={() => setShowSupportModal(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white/90 transition-colors"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>
      </div>

      {showSupportModal && <MotoboySupportModal onClose={() => setShowSupportModal(false)} orderId={order.id} options={MOTOBOY_CHEGADA_SUPPORT_OPTIONS} />}
      {showClientChatModal && <MotoboyClientChatModal onClose={() => setShowClientChatModal(false)} order={order} />}

      {/* Drag handle */}
      <div className="flex justify-center mb-4">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      <div className="flex-1 px-4 space-y-3 overflow-y-auto pb-6">
        {/* Delivery address card */}
        <div className="bg-[#1c1c1c] rounded-2xl p-4 flex items-start gap-3 border border-white/5">
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base leading-tight mb-0.5">Endereço de entrega</p>
            <p className="text-gray-400 text-sm leading-snug">{deliveryAddressLine}</p>
            {order.storeName && (
              <p className="text-gray-500 text-xs mt-1">— {order.storeName}</p>
            )}
          </div>
          <button
            data-testid="btn-chegada-mapa"
            onClick={openMap}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 w-16 h-16 rounded-2xl border-2 border-red-500 text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Map className="w-5 h-5" />
            <span className="text-[11px] font-bold tracking-wide">Mapa</span>
          </button>
        </div>

        {/* Order info card */}
        <div className="bg-[#1c1c1c] rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-white/5">
            <p className="text-gray-400 text-sm">Pedido {order.id}</p>
          </div>
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-white font-bold text-base leading-tight">{order.customerName || 'Cliente'}</p>
            {order.storeName && (
              <p className="text-gray-400 text-sm mt-0.5">{order.storeName}</p>
            )}
          </div>
          <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5">
            <Smartphone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-300 text-sm">Cliente pagou no app</span>
          </div>
          <div className="px-4 py-3">
            <button
              data-testid="btn-digitar-codigo"
              onClick={() => { setShowCodeModal(true); setCodeDigits(['', '', '', '']); setCodeError(false); }}
              disabled={codeVerified}
              className={`w-full py-4 rounded-2xl border-2 font-bold text-base tracking-wide transition-colors flex items-center justify-center gap-2 ${
                codeVerified
                  ? 'border-green-500 text-green-400 bg-green-500/10 cursor-default'
                  : 'border-red-500 text-red-500 hover:bg-red-500/10'
              }`}
            >
              {codeVerified ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Código validado
                </>
              ) : (
                'Digitar código do cliente'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sair da entrega button */}
      <div className="px-4 pb-10 pt-2 flex-shrink-0">
        <button
          data-testid="btn-sair-entrega"
          onClick={onLeave}
          disabled={!codeVerified}
          className={`w-full py-5 rounded-2xl font-bold text-base tracking-wide transition-colors ${
            codeVerified
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-[#2a2a2a] text-gray-600 cursor-not-allowed'
          }`}
        >
          Sair da entrega
        </button>
      </div>
    </div>
  );
}

function InicioTab({ isDark, onToggleDark, onOpenColeta }: { isDark: boolean; onToggleDark: () => void; onOpenColeta?: () => void }) {
  const {
    status, setStatus, locationEnabled, requestLocation,
    balanceVisible, toggleBalanceVisible,
    todayEarnings, todayRides, unreadCount, totalRejectedRides,
  } = useMotoboy();
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

function FinanceiroTab({ isDark }: { isDark: boolean }) {
  const {
    todayEarnings, weekEarnings, totalEntradas,
    completedRoutes, balanceVisible, toggleBalanceVisible,
  } = useMotoboy();

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-white';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const divide = isDark ? 'divide-gray-800' : 'divide-gray-50';

  const grouped: Record<string, typeof completedRoutes> = {};
  completedRoutes.forEach(r => {
    const label = formatDate(r.completedAt);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(r);
  });

  return (
    <div className={`flex flex-col gap-4 p-4 pb-4 ${bg} min-h-full`} data-testid="tab-financeiro">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <h1 className={`text-xl font-bold ${textMain}`}>Financeiro</h1>
        <button
          data-testid="btn-toggle-balance-fin"
          onClick={toggleBalanceVisible}
          className={`flex items-center gap-1.5 text-sm ${textSub} hover:text-primary transition-colors`}
        >
          {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {balanceVisible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      {/* Top cards row */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`${cardBg} rounded-2xl p-4 shadow-sm`}>
          <p className={`text-xs ${textSub} mb-1`}>Ganhos hoje</p>
          <p className={`text-lg font-bold ${textMain}`} data-testid="text-fin-today">
            {formatCurrency(todayEarnings, balanceVisible)}
          </p>
        </div>
        <div className={`${cardBg} rounded-2xl p-4 shadow-sm`}>
          <p className={`text-xs ${textSub} mb-1`}>Ganhos na semana</p>
          <p className={`text-lg font-bold ${textMain}`} data-testid="text-fin-week">
            {formatCurrency(weekEarnings, balanceVisible)}
          </p>
        </div>
      </div>

      {/* Entradas reais */}
      <div className={`${cardBg} rounded-2xl shadow-sm divide-y ${divide} overflow-hidden`}>
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <span className={`text-sm font-medium ${textMain}`}>Total recebido</span>
              <p className={`text-[10px] ${textSub}`}>Soma de todas as corridas concluídas</p>
            </div>
          </div>
          <span className="text-sm font-bold text-green-500" data-testid="text-fin-entradas">
            +{formatCurrency(totalEntradas, balanceVisible)}
          </span>
        </div>
        {completedRoutes.length === 0 && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-full bg-gray-500/15 flex items-center justify-center">
              <Navigation className={`w-5 h-5 ${textSub}`} />
            </div>
            <span className={`text-sm ${textSub}`}>Nenhuma corrida concluída ainda</span>
          </div>
        )}
      </div>

      {/* Completed routes history */}
      <div>
        <h2 className={`text-xs font-semibold ${textSub} uppercase tracking-wider mb-3`}>
          Histórico de corridas
        </h2>
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, routes]) => (
            <div key={date}>
              <p className={`text-xs font-semibold ${textSub} mb-2`}>{date}</p>
              <div className={`${cardBg} rounded-2xl shadow-sm divide-y ${divide} overflow-hidden`}>
                {routes.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-3.5"
                    data-testid={`route-history-${r.id}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                      <Navigation className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${textMain} truncate`}>{r.to}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className={`w-3 h-3 ${textSub}`} />
                        <span className={`text-xs ${textSub}`}>{formatTime(r.completedAt)}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-green-500 flex-shrink-0">
                      +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AjudaTab({ isDark }: { isDark: boolean }) {
  return (
    <div className={`flex-1 flex items-center justify-center p-8 text-center ${isDark ? 'bg-gray-950' : 'bg-gray-50'} min-h-full`} data-testid="tab-ajuda">
      <div>
        <HelpCircle className={`w-12 h-12 ${isDark ? 'text-gray-700' : 'text-gray-200'} mx-auto mb-3`} />
        <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-sm`}>Em breve</p>
      </div>
    </div>
  );
}

function MaisTab({ isDark }: { isDark: boolean }) {
  const { activeMotoboy } = useMotoboyRegistry();
  return (
    <div className={`flex-1 p-5 ${isDark ? 'bg-gray-950' : 'bg-gray-50'} min-h-full`} data-testid="tab-mais">
      {activeMotoboy && (
        <div className={`rounded-2xl p-4 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-2xl">
              {activeMotoboy.avatar}
            </div>
            <div>
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeMotoboy.name}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{activeMotoboy.vehicle} · {activeMotoboy.licensePlate}</p>
            </div>
          </div>
        </div>
      )}
      <div className={`flex items-center justify-center p-8 text-center`}>
        <div>
          <MoreHorizontal className={`w-12 h-12 ${isDark ? 'text-gray-700' : 'text-gray-200'} mx-auto mb-3`} />
          <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-sm`}>Em breve</p>
        </div>
      </div>
    </div>
  );
}

export default function MotoboyPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const [isDark, setIsDark] = useState(true);
  const [tick, setTick] = useState(0);
  const [screenVisible, setScreenVisible] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [deliveryOrderIndex, setDeliveryOrderIndex] = useState(0);
  const [deliveredOrderIds, setDeliveredOrderIds] = useState<Set<string>>(new Set());
  const [activeStore, setActiveStore] = useState<Store | undefined>(undefined);
  const { pendingRoutes, dispatchQueue, rejectDispatch, acceptDispatch, updateOrderStatus, timeoutDispatch, addOrderToActiveRoute, activeDeliveryRoutes, allOrders } = useMarketplace();
  const { status, startRoute, addValueToCurrentRoute, addRejection, currentRoute, finishRoute, cancelRoute, screenPhase, setScreenPhase, activeOrderId, setActiveOrderId, resetSession } = useMotoboy();
  const { motoboys, isLoadingMotoboys, activeMotoboy, activeMotoboyId, setActiveMotoboyId, reloadMotoboys, updateMotoboyStatus, incrementRejected, incrementCompleted } = useMotoboyRegistry();
  const { user } = useAuth();

  // Auto-select the logged-in user's motoboy profile once data is loaded.
  // Always enforce the current user's own profile — never inherit another user's session.
  // If no profile exists, create one automatically via /api/motoboys/ensure.
  const ensuredRef = useRef(false);
  useEffect(() => {
    if (isLoadingMotoboys || !user) return;
    const myMotoboy = motoboys.find(mb => (mb as any).userId === user.id || mb.id === user.id);
    if (myMotoboy) {
      if (myMotoboy.id !== activeMotoboyId) {
        setActiveMotoboyId(myMotoboy.id);
      }
    } else if (!ensuredRef.current) {
      ensuredRef.current = true;
      authApi('POST', '/api/motoboys/ensure', { userId: user.id })
        .then(r => r.json())
        .then(mb => {
          if (mb && mb.id) {
            reloadMotoboys();
          }
        })
        .catch(console.error);
    }
  }, [isLoadingMotoboys, motoboys, user, activeMotoboyId, setActiveMotoboyId, reloadMotoboys]);

  // Restore active order/store when panel remounts (e.g. after switching panels)
  useEffect(() => {
    if (activeOrderId && status === 'on_route') {
      const order = allOrders.find(o => o.id === activeOrderId) ?? null;
      if (order) {
        setActiveOrder(order);
        setActiveOrders(prev => prev.length > 0 ? prev : [order]);
        setActiveStore(mockStores.find(s => s.id === order.storeId));
      }
      if (screenPhase) {
        setScreenVisible(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick every second to re-evaluate cooldown expiry
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Only dispatch to available motoboys; respect 60s per-motoboy cooldown after rejection
  const activeEntry = (status === 'available' && activeMotoboyId)
    ? dispatchQueue.find(e => {
        const cooldown = e.cooldownByMotoboyId[activeMotoboyId];
        if (cooldown && Date.now() - cooldown < 60000) return false;
        return true;
      })
    : undefined;

  // Resolve the orders for the pending notification
  const pendingNotificationOrders: Order[] = activeEntry
    ? activeEntry.orderIds
        .map(id => allOrders.find(o => o.id === id))
        .filter((o): o is Order => Boolean(o))
    : [];

  // Also derive the pending route object (for routeId)
  const pendingRoute = activeEntry
    ? pendingRoutes.find(r => r.id === activeEntry.routeId) ?? null
    : null;

  // Stacking: offer a 2nd delivery from the same store while in coleta or pickup phase
  const [stackingDismissed, setStackingDismissed] = useState<Set<string>>(new Set());
  const canStack =
    status === 'on_route' &&
    (screenPhase === 'coleta' || screenPhase === 'pickup') &&
    activeMotoboyId &&
    activeOrders.length === 1;

  const stackEntry = canStack
    ? dispatchQueue.find(e => {
        if (stackingDismissed.has(e.routeId)) return false;
        const cooldown = e.cooldownByMotoboyId[activeMotoboyId!];
        if (cooldown && Date.now() - cooldown < 60000) return false;
        const stackOrders = e.orderIds.map(id => allOrders.find(o => o.id === id)).filter(Boolean);
        if (stackOrders.length === 0) return false;
        // Must be same store as current delivery
        return stackOrders[0]?.storeId === activeOrders[0]?.storeId;
      })
    : undefined;

  const stackOrder = stackEntry
    ? (allOrders.find(o => o.id === stackEntry.orderIds[0]) ?? null)
    : null;

  const handleAcceptStack = () => {
    if (!stackEntry || !stackOrder || !activeRouteId) return;
    const firstOrder = activeOrders[0];
    const firstDist = firstOrder?.distanceKm ?? 3;
    const between = haversineKm(
      [firstOrder?.deliveryCoords?.lat ?? 0, firstOrder?.deliveryCoords?.lng ?? 0],
      [stackOrder.deliveryCoords?.lat ?? 0, stackOrder.deliveryCoords?.lng ?? 0],
    );
    const addValue = calcDoubleRouteValues(firstDist + between).order2Value;
    updateOrderStatus(stackOrder.id, 'motoboy_accepted');
    acceptDispatch(stackEntry.routeId);
    addOrderToActiveRoute(activeRouteId, stackOrder.id);
    setActiveOrders(prev => [...prev, stackOrder]);
    addValueToCurrentRoute(addValue);
    setStackingDismissed(prev => new Set([...prev, stackEntry.routeId]));
  };

  const handleRejectStack = () => {
    if (!stackEntry) return;
    setStackingDismissed(prev => new Set([...prev, stackEntry.routeId]));
  };

  const handleAcceptRoute = (orders: Order[], routeId: string) => {
    const firstOrder = orders[0];
    const store = mockStores.find(s => s.id === firstOrder.storeId);
    const totalValue = orders.reduce((sum, o) => sum + (o.motoRideValue ?? 8.5), 0);

    // Mark all orders as motoboy_accepted
    for (const order of orders) {
      updateOrderStatus(order.id, 'motoboy_accepted');
    }
    acceptDispatch(routeId);
    startRoute({
      from: firstOrder.storeName || store?.name || `Loja #${firstOrder.storeId}`,
      to: firstOrder.deliveryAddress
        ? `${firstOrder.deliveryAddress.logradouro}, ${firstOrder.deliveryAddress.numero} - ${firstOrder.deliveryAddress.bairro}`
        : 'Destino',
      value: totalValue,
      storeAddress: firstOrder.storeAddress || store?.address,
    });
    setActiveOrderId(firstOrder.id);
    setActiveOrder(firstOrder);
    setActiveOrders(orders);
    setActiveRouteId(routeId);
    setDeliveryOrderIndex(0);
    setDeliveredOrderIds(new Set());
    setActiveStore(store);
    setScreenPhase('coleta');
    setScreenVisible(true);
  };

  const handleArrivedAtPickup = () => {
    for (const order of activeOrders) {
      updateOrderStatus(order.id, 'motoboy_at_store');
    }
    setScreenPhase('pickup');
    setScreenVisible(true);
  };

  const handleConclude = () => {
    setScreenPhase('conclude');
    setScreenVisible(true);
  };

  const handleCollected = () => {
    // First order in the list is active (on_the_way).
    // Remaining orders wait with a new status that tells the client
    // "motoboy left the store but is doing another delivery first".
    activeOrders.forEach((order, i) => {
      updateOrderStatus(order.id, i === 0 ? 'on_the_way' : 'motoboy_doing_other_delivery');
    });
    setDeliveryOrderIndex(0);
    setScreenPhase('entrega');
    setScreenVisible(true);
  };

  const handleDeliveryArrived = () => {
    const currentDeliveryOrder = activeOrders[deliveryOrderIndex];
    if (currentDeliveryOrder) {
      updateOrderStatus(currentDeliveryOrder.id, 'motoboy_arrived');
    }
    setScreenPhase('chegada_entrega');
    setScreenVisible(true);
  };

  const handleFinalDelivery = () => {
    const currentDeliveryOrder = activeOrders[deliveryOrderIndex];
    if (currentDeliveryOrder) {
      updateOrderStatus(currentDeliveryOrder.id, 'delivered');
    }

    // Track which orders have been delivered by ID (not sequential index)
    const newDeliveredIds = new Set([...deliveredOrderIds, ...(currentDeliveryOrder ? [currentDeliveryOrder.id] : [])]);
    setDeliveredOrderIds(newDeliveredIds);

    // Find the next undelivered order (any that hasn't been delivered yet)
    const nextOrder = activeOrders.find(o => !newDeliveredIds.has(o.id));

    if (nextOrder) {
      // Move to next undelivered delivery — go to entrega screen first so the
      // motoboy navigates there, then confirms arrival separately.
      // Also promote the next order's status so the waiting client sees "a caminho".
      updateOrderStatus(nextOrder.id, 'on_the_way');
      const nextIndex = activeOrders.indexOf(nextOrder);
      setDeliveryOrderIndex(nextIndex);
      setActiveOrderId(nextOrder.id);
      setActiveOrder(nextOrder);
      setScreenPhase('entrega');
      setScreenVisible(true);
    } else {
      // All deliveries done
      if (activeMotoboyId) incrementCompleted(activeMotoboyId);
      finishRoute();
      setScreenPhase(null);
      setScreenVisible(false);
      setActiveOrderId(null);
      setActiveOrder(null);
      setActiveOrders([]);
      setActiveRouteId(null);
      setDeliveryOrderIndex(0);
      setDeliveredOrderIds(new Set());
      setActiveStore(undefined);
      setActiveTab('inicio');
    }
  };

  const handleRejectRoute = (routeId: string) => {
    rejectDispatch(routeId, activeMotoboyId ?? undefined);
    addRejection();
    if (activeMotoboyId) incrementRejected(activeMotoboyId);
  };

  // Called when the 15-minute pickup timer expires
  const handlePickupTimeout = () => {
    // Return all orders in the route to 'ready' so grouping engine re-queues them
    for (const order of activeOrders) {
      updateOrderStatus(order.id, 'ready');
    }
    if (activeRouteId) {
      timeoutDispatch(activeRouteId, activeMotoboyId ?? undefined);
    }
    cancelRoute();
    setActiveOrderId(null);
    setActiveOrder(null);
    setActiveOrders([]);
    setActiveRouteId(null);
    setDeliveryOrderIndex(0);
    setDeliveredOrderIds(new Set());
    setActiveStore(undefined);
    setScreenPhase(null);
    setScreenVisible(false);
    setActiveTab('inicio');
  };

  // Suppress unused tick warning
  void tick;

  // Publish motoboy GPS position via WebSocket while actively delivering
  const isDelivering = status === 'on_route' && (screenPhase === 'entrega' || screenPhase === 'chegada_entrega');
  usePublishLocation(activeOrder?.id ?? null, isDelivering);

  const navBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';
  const navText = isDark ? 'text-gray-500' : 'text-gray-400';
  const navActive = 'text-primary';

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'inicio', label: 'Início', icon: <Home className="w-5 h-5" /> },
    { id: 'financeiro', label: 'Financeiro', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'ajuda', label: 'Ajuda', icon: <HelpCircle className="w-5 h-5" /> },
    { id: 'mais', label: 'Mais', icon: <MoreHorizontal className="w-5 h-5" /> },
  ];

  // Show loading or "not registered" while motoboy profile is being resolved
  if (!activeMotoboy) {
    const hasProfile = !isLoadingMotoboys && user && motoboys.some(mb => (mb as any).userId === user.id || mb.id === user.id);
    return (
      <div className="flex flex-col h-[calc(100vh-65px)] bg-gray-950 items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🏍️</div>
          {isLoadingMotoboys ? (
            <>
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Carregando perfil...</p>
            </>
          ) : hasProfile ? (
            <>
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Iniciando sessão...</p>
            </>
          ) : (
            <>
              <h2 className="text-white text-xl font-bold mb-2">Perfil não encontrado</h2>
              <p className="text-gray-400 text-sm">Você não possui um perfil de motoboy cadastrado.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[calc(100vh-65px)] ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Coleta screen */}
      {screenPhase === 'coleta' && screenVisible && status === 'on_route' && currentRoute && activeOrderId && (
        <ColetaScreen
          orderId={activeOrderId}
          onGoHome={() => { setScreenVisible(false); setActiveTab('inicio'); }}
          onTimeout={handlePickupTimeout}
          onArrivedAtPickup={handleArrivedAtPickup}
        />
      )}

      {/* Pickup screen - shown after confirming arrival at store */}
      {screenPhase === 'pickup' && screenVisible && status === 'on_route' && activeOrder && (
        <PickupScreen
          order={activeOrder}
          orders={activeOrders}
          store={activeStore}
          onGoHome={() => { setScreenVisible(false); setActiveTab('inicio'); }}
          onConclude={handleConclude}
        />
      )}

      {/* Conclude coleta screen - shown after clicking "Coletar os pedidos" */}
      {screenPhase === 'conclude' && screenVisible && status === 'on_route' && activeOrders.length > 0 && (
        <ConcluirColetaScreen
          order={activeOrders[0]}
          orders={activeOrders}
          onGoHome={() => { setScreenVisible(false); setActiveTab('inicio'); }}
          onCollected={handleCollected}
        />
      )}

      {/* Entrega screen - shown after "Concluir a coleta" */}
      {screenPhase === 'entrega' && screenVisible && status === 'on_route' && activeOrders[deliveryOrderIndex] && (
        <EntregaScreen
          key={`entrega-${deliveryOrderIndex}-${activeOrders[deliveryOrderIndex]?.id}`}
          order={activeOrders[deliveryOrderIndex]}
          onGoHome={() => { setScreenVisible(false); setActiveTab('inicio'); }}
          onArrived={handleDeliveryArrived}
          deliveryIndex={deliveryOrderIndex}
          totalDeliveries={activeOrders.length}
          allOrders={activeOrders}
          onSelectDelivery={activeOrders.length > 1 ? (index) => {
            // Update statuses: chosen delivery → on_the_way, others → motoboy_doing_other_delivery
            activeOrders.forEach((o, i) => {
              if (!deliveredOrderIds.has(o.id)) {
                updateOrderStatus(o.id, i === index ? 'on_the_way' : 'motoboy_doing_other_delivery');
              }
            });
            setDeliveryOrderIndex(index);
            setActiveOrderId(activeOrders[index].id);
            setActiveOrder(activeOrders[index]);
          } : undefined}
        />
      )}

      {/* Chegada entrega screen - shown after "Cheguei na entrega" */}
      {screenPhase === 'chegada_entrega' && screenVisible && status === 'on_route' && activeOrders[deliveryOrderIndex] && (
        <ChegadaEntregaScreen
          key={`chegada-${deliveryOrderIndex}-${activeOrders[deliveryOrderIndex]?.id}`}
          order={activeOrders[deliveryOrderIndex]}
          onGoHome={() => { setScreenVisible(false); setActiveTab('inicio'); }}
          onLeave={handleFinalDelivery}
        />
      )}

      {/* Route notification modal - blocks all interaction */}
      {pendingNotificationOrders.length > 0 && activeEntry && (
        <RouteNotificationModal
          orders={pendingNotificationOrders}
          onAccept={() => handleAcceptRoute(pendingNotificationOrders, activeEntry.routeId)}
          onReject={() => handleRejectRoute(activeEntry.routeId)}
          rejectionCount={activeEntry.rejectionCount}
        />
      )}

      {/* Stacking modal — offered when motoboy is at pickup or en-route to store */}
      {stackOrder && stackEntry && !pendingNotificationOrders.length && (() => {
        const firstOrder = activeOrders[0];
        const stackBetweenKm = haversineKm(
          [firstOrder?.deliveryCoords?.lat ?? 0, firstOrder?.deliveryCoords?.lng ?? 0],
          [stackOrder.deliveryCoords?.lat ?? 0, stackOrder.deliveryCoords?.lng ?? 0],
        );
        return (
          <StackingModal
            stackOrder={stackOrder}
            currentRouteValue={activeOrders.reduce((s, o) => s + (o.motoRideValue ?? 8.5), 0)}
            currentRouteKm={firstOrder?.distanceKm ?? 3}
            betweenKm={stackBetweenKm}
            onAccept={handleAcceptStack}
            onReject={handleRejectStack}
          />
        );
      })()}

      {/* Content area */}
      <div className={`flex-1 overflow-y-auto ${activeTab === 'inicio' ? 'overflow-hidden' : ''}`}>
        {activeTab === 'inicio' && (
          <div className="h-full">
            <InicioTab
              isDark={isDark}
              onToggleDark={() => setIsDark(d => !d)}
              onOpenColeta={() => setScreenVisible(true)}
            />
          </div>
        )}
        {activeTab === 'financeiro' && <FinanceiroTab isDark={isDark} />}
        {activeTab === 'ajuda' && <AjudaTab isDark={isDark} />}
        {activeTab === 'mais' && <MaisTab isDark={isDark} />}
      </div>

      {/* Bottom navigation bar */}
      <nav className={`flex-shrink-0 ${navBg} border-t shadow-[0_-2px_12px_rgba(0,0,0,0.08)]`}>
        <div className="flex">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                  isActive ? navActive : navText
                }`}
              >
                {tab.icon}
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
                {isActive && (
                  <span className="w-5 h-0.5 bg-primary rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
