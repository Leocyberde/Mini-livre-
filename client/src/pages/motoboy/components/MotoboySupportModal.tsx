import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupport, MOTOBOY_SUPPORT_OPTIONS, SupportCategory } from '@/contexts/SupportContext';
import { Send, CheckCircle2, X, MessageCircle } from 'lucide-react';

export function MotoboySupportModal({
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
