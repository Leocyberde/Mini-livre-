import { useState } from 'react';
import { Star, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useReview } from '@/contexts/ReviewContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useProducts } from '@/contexts/ProductContext';
import { useAuth } from '@/contexts/AuthContext';
import StarPicker from './StarPicker';

export default function ReviewRequestCard({
  notifId, orderId, storeId, storeName, productId, timestamp, read,
}: {
  notifId: string; orderId: string; storeId: string; storeName: string;
  productId: string; timestamp: string; read: boolean;
}) {
  const { addProductReview, addStoreReview, hasReviewedOrder } = useReview();
  const { markRead } = useNotification();
  const { products } = useProducts();
  const { user } = useAuth();
  const [storeRating, setStoreRating] = useState(0);
  const [productRating, setProductRating] = useState(0);
  const [storeMessage, setStoreMessage] = useState('');
  const [productMessage, setProductMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const alreadyReviewed = hasReviewedOrder(orderId);
  const product = products.find(p => p.id === productId);
  const clientName = user?.name || 'Cliente';

  const handleSubmit = () => {
    if (storeRating === 0) { toast.error('Por favor, avalie a loja antes de enviar.'); return; }
    addStoreReview({ storeId, storeName, orderId, rating: storeRating, message: storeMessage, clientName });
    if (productId && productRating > 0 && product) {
      addProductReview({ productId, productName: product.name, storeId, rating: productRating, message: productMessage, clientName });
    }
    markRead(notifId);
    setSubmitted(true);
    toast.success('Avaliação enviada! Obrigado pelo feedback.');
  };

  if (alreadyReviewed || submitted) {
    return (
      <div className="rounded-2xl border bg-green-50 border-green-100 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-sm text-green-800">Avaliação enviada!</p>
          <p className="text-xs text-green-700 mt-0.5">Obrigado pelo seu feedback sobre {storeName}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border transition-all ${read ? 'bg-card border-border' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-start gap-3 p-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Star className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1">
          <p className={`font-semibold text-sm ${read ? 'text-foreground' : 'text-amber-800'}`}>
            Avalie sua experiência com {storeName}!
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Seu pedido foi concluído. Como foi?</p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {!read && <div className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0 mt-1" />}
      </div>

      <div className="px-4 pb-4 space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Loja <span className="text-primary">{storeName}</span></p>
          <StarPicker value={storeRating} onChange={setStoreRating} />
          <textarea
            className="w-full text-sm border border-border rounded-xl p-3 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={2}
            placeholder="Comentário sobre a loja (opcional)..."
            value={storeMessage}
            onChange={e => setStoreMessage(e.target.value)}
            data-testid={`input-store-review-${orderId}`}
          />
        </div>
        {product && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Produto <span className="text-primary">{product.name}</span></p>
            <StarPicker value={productRating} onChange={setProductRating} />
            <textarea
              className="w-full text-sm border border-border rounded-xl p-3 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              rows={2}
              placeholder="Comentário sobre o produto (opcional)..."
              value={productMessage}
              onChange={e => setProductMessage(e.target.value)}
              data-testid={`input-product-review-${orderId}`}
            />
          </div>
        )}
        <button
          className="w-full bg-primary text-white text-sm font-semibold rounded-xl py-2.5 px-4 hover:bg-primary/90 transition-colors disabled:opacity-40"
          disabled={storeRating === 0}
          onClick={handleSubmit}
          data-testid={`btn-submit-review-${orderId}`}
        >
          Enviar avaliação
        </button>
      </div>
    </div>
  );
}
