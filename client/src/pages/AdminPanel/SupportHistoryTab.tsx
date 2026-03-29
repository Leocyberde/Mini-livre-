import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, CheckCircle } from 'lucide-react';
import { SupportTicket } from '@/contexts/SupportContext';

interface SupportHistoryTabProps {
  resolvedTickets: SupportTicket[];
}

export default function SupportHistoryTab({ resolvedTickets }: SupportHistoryTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <History className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold text-foreground">Histórico de Suporte</h3>
        <Badge className="bg-blue-100 text-blue-800">{resolvedTickets.length} resolvido(s)</Badge>
      </div>

      {resolvedTickets.length === 0 ? (
        <Card className="p-12 text-center">
          <History className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-lg">Nenhum atendimento encerrado ainda</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {[...resolvedTickets].reverse().map(ticket => (
            <Card key={ticket.id} className="border-l-4 border-blue-400 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="font-semibold text-foreground">{ticket.storeName}</p>
                    <Badge className="bg-blue-100 text-blue-800 text-xs">Resolvido</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{ticket.category}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Mensagem inicial: {ticket.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(ticket.createdAt).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(ticket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Badge className="bg-secondary text-muted-foreground">{ticket.chat.length} mensagem(s)</Badge>
              </div>

              {/* Chat transcript */}
              {ticket.chat.length > 0 && (
                <details className="mt-2">
                  <summary className="text-sm text-primary cursor-pointer font-medium hover:underline">Ver conversa completa</summary>
                  <div className="mt-3 space-y-2 bg-secondary/30 rounded-xl p-3">
                    {ticket.chat.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${msg.sender === 'admin' ? 'bg-primary text-white' : 'bg-card border border-border text-foreground'}`}>
                          <p className={`text-[10px] font-semibold mb-0.5 ${msg.sender === 'admin' ? 'text-white/70' : 'text-muted-foreground'}`}>
                            {msg.sender === 'admin' ? 'Suporte' : ticket.storeName}
                          </p>
                          <p>{msg.text}</p>
                          <p className={`text-[10px] mt-1 ${msg.sender === 'admin' ? 'text-white/60' : 'text-muted-foreground'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
