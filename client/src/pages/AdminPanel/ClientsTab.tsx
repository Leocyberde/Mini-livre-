import { Card } from '@/components/ui/card';
import { Mail, Phone, Clock, User } from 'lucide-react';
import { Order } from '@/lib/mockData';

interface Client {
  name: string;
  email: string;
  phone?: string;
  orders: number;
  total: number;
  lastOrder: string;
}

interface ClientsTabProps {
  clients: Client[];
  allOrders: Order[];
  formatDate: (iso: string) => string;
}

export default function ClientsTab({ clients, allOrders, formatDate }: ClientsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Clientes ({clients.length})
        </h3>
        <p className="text-sm text-muted-foreground">Dados derivados dos pedidos realizados</p>
      </div>

      {clients.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">Nenhum cliente encontrado. Os clientes aparecem assim que realizarem pedidos.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map((client, i) => {
            const clientOrders = allOrders.filter(o => o.customerEmail === client.email || o.customerName === client.name);
            const delivered = clientOrders.filter(o => o.status === 'delivered').length;
            return (
              <Card key={i} className="p-5 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground">{client.name}</h4>
                    <div className="space-y-1 mt-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Mail className="w-3 h-3" />
                        {client.email}
                      </p>
                      {client.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </p>
                      )}
                      {client.lastOrder && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          Último pedido: {formatDate(client.lastOrder)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-secondary rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">Pedidos</p>
                    <p className="font-bold text-foreground">{client.orders}</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">Entregues</p>
                    <p className="font-bold text-green-700">{delivered}</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">Total gasto</p>
                    <p className="font-bold text-primary text-xs">R$ {client.total.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
