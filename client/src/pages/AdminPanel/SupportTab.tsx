import { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Headphones, MessageCircle, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { SupportTicket } from '@/contexts/SupportContext';

interface SupportTabProps {
  pendingTickets: SupportTicket[];
  startChat: (ticketId: string) => void;
  sendMessage: (ticketId: string, sender: 'seller' | 'admin' | 'motoboy', text: string) => void;
  resolveTicket: (ticketId: string) => void;
  activeChatId: string | null;
  setActiveChatId: (v: string | null) => void;
  adminChatInput: Record<string, string>;
  setAdminChatInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export default function SupportTab({
  pendingTickets,
  startChat,
  sendMessage,
  resolveTicket,
  activeChatId,
  setActiveChatId,
  adminChatInput,
  setAdminChatInput,
}: SupportTabProps) {
  const adminChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    adminChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatId, pendingTickets]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Headphones className="w-6 h-6 text-primary" />
        <h3 className="text-xl font-semibold text-foreground">Solicitações de Suporte</h3>
        {pendingTickets.length > 0 && (
          <Badge className="bg-red-100 text-red-800">{pendingTickets.length} ativa(s)</Badge>
        )}
      </div>

      {pendingTickets.length === 0 ? (
        <Card className="p-12 text-center">
          <Headphones className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-lg">Nenhuma solicitação de suporte no momento</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {pendingTickets.map(ticket => {
            const isOpen = activeChatId === ticket.id;
            return (
              <Card key={ticket.id} className={`border-l-4 ${ticket.status === 'in_chat' ? 'border-green-500' : 'border-orange-400'}`}>
                {/* Ticket header */}
                <div className="p-5">
                  <div className="flex flex-wrap items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">📩 Nova Solicitação de Suporte</p>
                        {ticket.submitterType === 'motoboy' && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">🏍️ Motoboy</Badge>
                        )}
                        {ticket.status === 'in_chat' ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">🟢 Em atendimento</Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800 text-xs">⏳ Aguardando</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{ticket.submitterType === 'motoboy' ? 'Motoboy:' : 'Loja:'}</span> {ticket.storeName}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5"><span className="font-medium text-foreground">Categoria:</span> {ticket.category}</p>
                      <p className="text-sm text-muted-foreground mt-0.5"><span className="font-medium text-foreground">Mensagem:</span> {ticket.message}</p>
                      {ticket.orderId && (
                        <p className="text-sm text-muted-foreground mt-0.5"><span className="font-medium text-foreground">Pedido:</span> #{ticket.orderId.slice(-5).toUpperCase()}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Horário: {new Date(ticket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} —{' '}
                        {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    {ticket.status === 'pending' && (
                      <Button
                        className="gap-2"
                        onClick={() => {
                          startChat(ticket.id);
                          setActiveChatId(ticket.id);
                        }}
                      >
                        <MessageCircle className="w-4 h-4" /> Iniciar Atendimento
                      </Button>
                    )}
                    {ticket.status === 'in_chat' && (
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setActiveChatId(isOpen ? null : ticket.id)}
                      >
                        <MessageCircle className="w-4 h-4" />
                        {isOpen ? 'Fechar Chat' : 'Abrir Chat'}
                      </Button>
                    )}
                    {ticket.status === 'in_chat' && (
                      <Button
                        variant="outline"
                        className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
                        onClick={() => {
                          resolveTicket(ticket.id);
                          if (activeChatId === ticket.id) setActiveChatId(null);
                          toast.success('Atendimento encerrado e movido para o histórico.');
                        }}
                      >
                        <CheckCircle className="w-4 h-4" /> Marcar como Resolvido
                      </Button>
                    )}
                  </div>
                </div>

                {/* Chat panel */}
                {isOpen && ticket.status === 'in_chat' && (
                  <div className="border-t border-border">
                    <div className="flex flex-col" style={{ height: '340px' }}>
                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/20">
                        {ticket.chat.map(msg => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                                msg.sender === 'admin'
                                  ? 'bg-primary text-white rounded-br-sm'
                                  : 'bg-card border border-border text-foreground rounded-bl-sm'
                              }`}
                            >
                              {(msg.sender === 'seller' || msg.sender === 'motoboy') && (
                                <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                                  {msg.sender === 'motoboy' ? `🏍️ ${ticket.storeName}` : ticket.storeName}
                                </p>
                              )}
                              <p>{msg.text}</p>
                              <p className={`text-[10px] mt-1 ${msg.sender === 'admin' ? 'text-white/70' : 'text-muted-foreground'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={adminChatEndRef} />
                      </div>

                      {/* Input */}
                      <div className="flex items-center gap-2 p-3 border-t border-border bg-card">
                        <input
                          type="text"
                          value={adminChatInput[ticket.id] ?? ''}
                          onChange={e => setAdminChatInput(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                          onKeyDown={e => {
                            const text = adminChatInput[ticket.id]?.trim();
                            if (e.key === 'Enter' && text) {
                              sendMessage(ticket.id, 'admin', text);
                              setAdminChatInput(prev => ({ ...prev, [ticket.id]: '' }));
                            }
                          }}
                          placeholder="Digite sua resposta..."
                          className="flex-1 border border-border rounded-xl px-4 py-2 text-sm bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <Button
                          size="sm"
                          className="rounded-xl"
                          disabled={!adminChatInput[ticket.id]?.trim()}
                          onClick={() => {
                            const text = adminChatInput[ticket.id]?.trim();
                            if (text) {
                              sendMessage(ticket.id, 'admin', text);
                              setAdminChatInput(prev => ({ ...prev, [ticket.id]: '' }));
                            }
                          }}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
