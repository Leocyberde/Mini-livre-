import { useState } from 'react';
import { MotoboySupportModal } from '../components/MotoboySupportModal';
import { HelpCircle, ChevronRight } from 'lucide-react';

const FAQS = [
  {
    q: 'Como funciona o sistema de pagamento?',
    a: 'Os pagamentos são processados diariamente. Você recebe o valor acumulado de todas as corridas do dia diretamente na sua conta cadastrada.',
  },
  {
    q: 'O que fazer em caso de acidente?',
    a: 'Primeiro garanta sua segurança. Em seguida, acione o suporte através do botão "Preciso de Ajuda" e informe a ocorrência. Nossa equipe te auxiliará.',
  },
  {
    q: 'Como funciona a rota dupla?',
    a: 'Quando duas entregas saem da mesma loja ao mesmo tempo, o sistema pode agrupá-las. Você recebe um adicional pelo segundo pedido.',
  },
  {
    q: 'Qual o prazo de entrega máximo?',
    a: 'Você tem 15 minutos para chegar até a loja e 15 minutos para realizar a entrega. O cronômetro aparece na tela durante o percurso.',
  },
];

export function AjudaTab({ isDark }: { isDark: boolean }) {
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const border = isDark ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`} data-testid="ajuda-tab">
      {showSupportModal && <MotoboySupportModal onClose={() => setShowSupportModal(false)} />}

      {/* CTA card */}
      <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-5">
        <p className="text-white font-bold text-base mb-1">Precisa de suporte?</p>
        <p className="text-red-100 text-sm mb-4 leading-snug">
          Nossa equipe está disponível para te ajudar com qualquer ocorrência durante suas entregas.
        </p>
        <button
          data-testid="btn-open-support"
          onClick={() => setShowSupportModal(true)}
          className="bg-white text-red-600 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2"
        >
          <HelpCircle className="w-4 h-4" />
          Abrir chamado de suporte
        </button>
      </div>

      {/* FAQ */}
      <div>
        <p className={`text-xs font-bold tracking-widest ${textSub} mb-3`}>PERGUNTAS FREQUENTES</p>
        <div className={`rounded-2xl overflow-hidden border ${border} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {FAQS.map((faq, i) => (
            <div key={i} className={cardBg} data-testid={`faq-item-${i}`}>
              <button
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              >
                <span className={`text-sm font-medium ${textMain} flex-1 pr-3 leading-snug`}>{faq.q}</span>
                <ChevronRight
                  className={`w-4 h-4 ${textSub} flex-shrink-0 transition-transform ${expandedIdx === i ? 'rotate-90' : ''}`}
                />
              </button>
              {expandedIdx === i && (
                <div className="px-4 pb-4">
                  <p className={`text-sm ${textSub} leading-relaxed`}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
