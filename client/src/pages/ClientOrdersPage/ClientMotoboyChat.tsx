import { useState, useEffect, useRef } from 'react';
import { Bike, X, Send, MessageCircle } from 'lucide-react';
import { useMotoboyClientChat } from '@/contexts/MotoboyClientChatContext';

export function ClientMotoboyChat({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { getMessages, sendMessage, markRead } = useMotoboyClientChat();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messages = getMessages(orderId);

  useEffect(() => {
    markRead(orderId, 'client');
  }, [messages.length, orderId, markRead]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(orderId, 'client', input.trim());
    setInput('');
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-t-3xl shadow-2xl flex flex-col border border-gray-100" style={{ maxHeight: '80vh' }}>
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
              <Bike className="w-4 h-4 text-green-700" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900">Motoboy</p>
              <p className="text-xs text-gray-500">Em rota de entrega</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm text-center">
              <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
              <p>Nenhuma mensagem ainda.</p>
              <p className="text-xs mt-1">Fale com o motoboy aqui.</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.sender === 'client'
                  ? 'bg-[#1E40AF] text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
              }`}>
                {msg.sender === 'motoboy' && (
                  <p className="text-[10px] font-semibold text-green-600 mb-1">Motoboy</p>
                )}
                <p className="leading-snug">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${msg.sender === 'client' ? 'opacity-70' : 'text-gray-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="flex items-center gap-2 px-4 pt-3 pb-8 border-t border-gray-100 bg-white flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) handleSend(); }}
            placeholder="Mensagem para o motoboy..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1E40AF] hover:bg-[#1E3A8A] disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
