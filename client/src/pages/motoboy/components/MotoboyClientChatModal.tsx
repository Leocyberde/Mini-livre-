import { useState, useEffect, useRef } from 'react';
import { useMotoboyClientChat } from '@/contexts/MotoboyClientChatContext';
import { Order } from '@/lib/mockData';
import { Send, X, UserRound } from 'lucide-react';

export function MotoboyClientChatModal({
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
