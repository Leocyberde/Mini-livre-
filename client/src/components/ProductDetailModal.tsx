/**
 * ProductDetailModal - Modal de destaque do produto
 * Exibe informações completas do produto com botões de comprar agora e adicionar ao carrinho,
 * seção de perguntas ao lojista, e botão para ver avaliações.
 */
import { useState } from 'react';
import { Product } from '@/lib/mockData';
import { useStores } from '@/contexts/StoresContext';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Star, ShoppingCart, Zap, Package, MapPin, ExternalLink, MessageCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'wouter';
import { useProductQA } from '@/contexts/ProductQAContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useReview } from '@/contexts/ReviewContext';
import { toast } from 'sonner';

interface ProductDetailModalProps {
  product: Product | null;
  storeName?: string;
  storeAddress?: string;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (productId: string, storeId: string, price: number) => void;
  onBuyNow: (productId: string, storeId: string, price: number) => void;
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className="focus:outline-none"
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          onClick={() => onChange && onChange(star)}
          disabled={!onChange}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              star <= (hovered || value)
                ? 'fill-accent text-accent'
                : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProductDetailModal({
  product,
  storeName,
  storeAddress,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
}: ProductDetailModalProps) {
  const [questionText, setQuestionText] = useState('');
  const [questionSent, setQuestionSent] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const { sendQuestion, getQuestionsForProduct } = useProductQA();
  const { addNotification } = useNotification();
  const { getProductReviews, getStoreReviews } = useReview();
  const { getStoreById } = useStores();

  if (!product) return null;

  const store = getStoreById(product.storeId);
  const price = Number(product.price) || 0;
  const origPrice = product.originalPrice ? Number(product.originalPrice) : 0;
  const discount = origPrice > price
    ? Math.round(((origPrice - price) / origPrice) * 100)
    : 0;

  const answeredQuestions = getQuestionsForProduct(product.id);
  const productReviews = getProductReviews(product.id);
  const storeReviews = getStoreReviews(product.storeId);
  const allReviews = [...productReviews, ...storeReviews.filter(r => !productReviews.find(pr => pr.createdAt === r.createdAt))];

  const handleSendQuestion = () => {
    const trimmed = questionText.trim();
    if (!trimmed) return;
    const q = sendQuestion({
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      storeId: product.storeId,
      storeName: store?.name ?? storeName ?? '',
      question: trimmed,
      clientName: 'Cliente',
    });
    addNotification({
      target: 'seller',
      type: 'question',
      icon: '❓',
      title: `Pergunta sobre: ${product.name}`,
      body: trimmed,
      metadata: {
        questionId: q.id,
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl ?? '',
        storeId: product.storeId,
      },
    });
    setQuestionText('');
    setQuestionSent(true);
    toast.success('Pergunta enviada ao lojista!');
  };

  const handleClose = () => {
    setQuestionSent(false);
    setQuestionText('');
    setShowReviews(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-full p-0 overflow-hidden flex flex-col" style={{ maxHeight: '90dvh' }}>
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Header com foto pequena e informações da loja */}
          <div className="flex gap-4">
            <div className="bg-gradient-to-br from-primary/10 to-accent/20 rounded-lg w-24 h-24 flex items-center justify-center text-4xl flex-shrink-0 relative overflow-hidden">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="select-none">{product.image}</span>
              )}
              {discount > 0 && (
                <Badge className="absolute top-1 left-1 bg-accent text-accent-foreground font-bold text-xs px-1.5 py-0.5">
                  -{discount}%
                </Badge>
              )}
            </div>

            {store && (
              <div className="flex-1 space-y-2">
                <div className="flex items-start gap-2">
                  {store.logo && store.logo.startsWith('data:') ? (
                    <img src={store.logo} alt={store.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <span className="text-2xl">{store.logo}</span>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">{store.name}</p>
                    <p className="text-xs text-muted-foreground">{store.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= Math.round(store.rating)
                            ? 'fill-accent text-accent'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-medium text-foreground">{store.rating}</span>
                  <span className="text-muted-foreground">({store.reviews})</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{storeAddress || store.address || store.location}</span>
                </div>
                <Link href={`/loja?id=${product.storeId}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1 text-xs h-8 text-primary border-primary/30 hover:bg-primary/5 mt-2"
                    onClick={handleClose}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ver loja
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="border-t border-border" />

          {/* Informações do Produto */}
          <div className="space-y-4">
            <div>
              <DialogTitle className="text-xl font-bold text-foreground mb-2">
                {product.name}
              </DialogTitle>
              <Badge variant="outline" className="text-xs">
                {product.category}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(product.rating)
                        ? 'fill-accent text-accent'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-foreground">{product.rating}</span>
              <span className="text-xs text-muted-foreground">({product.reviews} avaliações)</span>
            </div>

            <div className="bg-primary/5 rounded-lg p-4 space-y-2 border border-primary/20">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">
                  R$ {price.toFixed(2)}
                </span>
                {origPrice > 0 && (
                  <span className="text-sm text-muted-foreground line-through">
                    R$ {origPrice.toFixed(2)}
                  </span>
                )}
              </div>
              {discount > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  💰 Você economiza R$ {(origPrice - price).toFixed(2)} ({discount}% de desconto)
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-muted-foreground" />
              {product.stock === 0 ? (
                <span className="text-destructive font-medium">Fora de estoque</span>
              ) : product.stock < 10 ? (
                <span className="text-orange-500 font-medium">
                  Apenas {product.stock} unidades restantes!
                </span>
              ) : (
                <span className="text-green-600 font-medium">Em estoque ({product.stock} unidades)</span>
              )}
            </div>

            {product.description && (
              <div className="bg-secondary rounded-lg p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground block mb-2">Descrição:</span>
                  {product.description}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border" />

          {/* Botões de ação */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => {
                onBuyNow(product.id, product.storeId, product.price);
                handleClose();
              }}
              disabled={product.stock === 0 || product.frozen}
              className="flex-1 gap-2 bg-accent hover:bg-accent/90 text-black font-semibold"
              data-testid="btn-buy-now"
            >
              <Zap className="w-4 h-4" />
              Comprar Agora
            </Button>
            <Button
              onClick={() => {
                onAddToCart(product.id, product.storeId, product.price);
                handleClose();
              }}
              disabled={product.stock === 0 || product.frozen}
              variant="outline"
              className="flex-1 gap-2"
              data-testid="btn-add-to-cart"
            >
              <ShoppingCart className="w-4 h-4" />
              Adicionar ao Carrinho
            </Button>
          </div>

          <div className="border-t border-border" />

          {/* Avaliações */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full gap-2 text-sm"
              onClick={() => setShowReviews(v => !v)}
              data-testid="btn-ver-avaliacoes"
            >
              <Star className="w-4 h-4 text-accent" />
              Ver avaliações ({productReviews.length + storeReviews.length})
              {showReviews ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
            </Button>

            {showReviews && (
              <div className="space-y-3">
                {productReviews.length === 0 && storeReviews.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Nenhuma avaliação ainda. Seja o primeiro!
                  </p>
                ) : (
                  <>
                    {productReviews.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avaliações do Produto</p>
                        {productReviews.map(r => (
                          <div key={r.id} className="bg-secondary rounded-xl p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">{r.clientName}</span>
                              <StarRating value={r.rating} />
                            </div>
                            {r.message && <p className="text-sm text-muted-foreground">{r.message}</p>}
                            <p className="text-xs text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {storeReviews.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avaliações da Loja</p>
                        {storeReviews.map(r => (
                          <div key={r.id} className="bg-secondary rounded-xl p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">{r.clientName}</span>
                              <StarRating value={r.rating} />
                            </div>
                            {r.message && <p className="text-sm text-muted-foreground">{r.message}</p>}
                            <p className="text-xs text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Perguntas e Respostas Anteriores */}
          {answeredQuestions.length > 0 && (
            <>
              <div className="border-t border-border" />
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  Perguntas e respostas
                </p>
                {answeredQuestions.map(q => (
                  <div key={q.id} className="bg-secondary rounded-xl p-3 space-y-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">Pergunta do cliente:</p>
                      <p className="text-sm text-foreground">{q.question}</p>
                    </div>
                    {q.answer && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 space-y-1">
                        <p className="text-xs font-semibold text-primary">Resposta do lojista:</p>
                        <p className="text-sm text-foreground">{q.answer}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(q.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="border-t border-border" />

          {/* Fazer uma Pergunta */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              Pergunte ao lojista
            </p>

            {questionSent ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-1">
                <p className="text-sm font-semibold text-green-700">✅ Pergunta enviada!</p>
                <p className="text-xs text-green-600">O lojista receberá sua pergunta e responderá em breve.</p>
                <button
                  className="text-xs text-primary underline mt-1"
                  onClick={() => setQuestionSent(false)}
                >
                  Fazer outra pergunta
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder="Tem alguma dúvida sobre este produto? Pergunte ao lojista..."
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  className="resize-none text-sm"
                  rows={3}
                  data-testid="input-product-question"
                />
                <Button
                  onClick={handleSendQuestion}
                  disabled={!questionText.trim()}
                  className="w-full gap-2"
                  size="sm"
                  data-testid="btn-send-question"
                >
                  <Send className="w-4 h-4" />
                  Enviar pergunta
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
