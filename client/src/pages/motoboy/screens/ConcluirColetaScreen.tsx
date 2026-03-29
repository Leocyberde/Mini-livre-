import { Order } from '@/lib/mockData';
import { Home, MapPin, User } from 'lucide-react';

export function ConcluirColetaScreen({
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
