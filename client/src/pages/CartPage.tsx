/**
 * Cart Page - Shopping cart and checkout
 * Features: View cart items, modify quantities, address selection, delivery fee calculation
 */
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useProfile, SavedAddress } from '@/contexts/ProfileContext';
import { useProducts } from '@/contexts/ProductContext';
import { getStoreById, getBairroCoords, mockStoreCoords, Order } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2, Plus, Minus, MapPin, Loader2, Star, Package, AlertCircle, Store, Truck, CheckCircle, ClipboardList } from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { Link, useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { calcDeliveryFromAddresses, calcMotoRideValue } from '@/lib/deliveryCalc';
import AddressForm from '@/components/AddressForm';
import { AddressForm as AddressFormType } from '@/hooks/useCep';

const emptyAddress: AddressFormType = {
  cep: '', logradouro: '', bairro: '', cidade: '', uf: '', numero: '', complemento: '',
};

export default function CartPage() {
  const { cart, removeFromCart, updateCartQuantity, clearCart, addClientOrder } = useMarketplace();
  const { clientProfile, sellerProfile, addClientAddress, getPrimaryAddress } = useProfile();
  const { products } = useProducts();
  const [, navigate] = useLocation();

  const [customerName, setCustomerName] = useState(clientProfile.name || '');
  const [customerEmail, setCustomerEmail] = useState(clientProfile.email || '');
  const [customerPhone, setCustomerPhone] = useState(clientProfile.phone || '');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [placedOrders, setPlacedOrders] = useState<Order[]>([]);
  const [showOrderConfirm, setShowOrderConfirm] = useState(false);

  // Address selection
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressFormType>(emptyAddress);
  const [newAddressLabel, setNewAddressLabel] = useState('');

  // Delivery calculation
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // Initialize selected address to primary
  useEffect(() => {
    const primary = getPrimaryAddress();
    if (primary) setSelectedAddressId(primary.id);
  }, [clientProfile.addresses]);

  // Auto-calculate delivery fee when address is selected (delivery mode only)
  useEffect(() => {
    if (deliveryType === 'delivery' && selectedAddressId && sellerProfile.address) {
      const addr = clientProfile.addresses.find(a => a.id === selectedAddressId);
      if (addr) {
        handleCalcDelivery(addr);
      }
    }
  }, [selectedAddressId, deliveryType]);

  // Group cart items by store
  const cartByStore = cart.reduce((acc, item) => {
    if (!acc[item.storeId]) acc[item.storeId] = [];
    acc[item.storeId].push(item);
    return acc;
  }, {} as Record<string, typeof cart>);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = deliveryType === 'delivery' && deliveryFee !== null ? deliveryFee : 0;
  const total = subtotal + shipping;

  const selectedAddress: SavedAddress | null =
    clientProfile.addresses.find(a => a.id === selectedAddressId) || null;

  // Calculate delivery fee when address or store changes
  const handleCalcDelivery = async (addr?: SavedAddress) => {
    const address = addr || selectedAddress;
    if (!address || !sellerProfile.address) {
      setDeliveryFee(null);
      setDeliveryDistance(null);
      setDeliveryError(
        !sellerProfile.address
          ? 'A loja ainda não cadastrou seu endereço. Entre em contato.'
          : null
      );
      return;
    }

    setCalcLoading(true);
    setDeliveryError(null);

    try {
      const result = await calcDeliveryFromAddresses(
        {
          logradouro: sellerProfile.address.logradouro,
          numero: sellerProfile.address.numero,
          cidade: sellerProfile.address.cidade,
          uf: sellerProfile.address.uf,
          cep: sellerProfile.address.cep,
        },
        {
          logradouro: address.logradouro,
          numero: address.numero,
          cidade: address.cidade,
          uf: address.uf,
          cep: address.cep,
        }
      );

      if (result) {
        setDeliveryFee(result.fee);
        setDeliveryDistance(result.distanceKm);
      } else {
        setDeliveryError('Não foi possível calcular a distância. Verifique os endereços.');
        setDeliveryFee(null);
        setDeliveryDistance(null);
      }
    } catch {
      setDeliveryError('Erro ao calcular frete. Tente novamente.');
    } finally {
      setCalcLoading(false);
    }
  };

  const handleSelectAddress = (id: string) => {
    setSelectedAddressId(id);
  };

  const handleSaveNewAddress = () => {
    if (!newAddress.cep || !newAddress.numero) {
      toast.error('Preencha o CEP e o número');
      return;
    }
    addClientAddress({
      ...newAddress,
      label: newAddressLabel || `Endereço ${clientProfile.addresses.length + 1}`,
      isPrimary: clientProfile.addresses.length === 0,
    });
    setShowNewAddressForm(false);
    setNewAddress(emptyAddress);
    setNewAddressLabel('');
    toast.success('Endereço salvo!');
  };

  const handleCheckout = () => {
    if (!customerName.trim()) { toast.error('Por favor, insira seu nome'); return; }
    if (!customerEmail.trim()) { toast.error('Por favor, insira seu email'); return; }
    if (!customerPhone.trim()) { toast.error('Por favor, insira seu telefone'); return; }
    if (cart.length === 0) { toast.error('Seu carrinho está vazio'); return; }
    if (deliveryType === 'delivery' && !selectedAddress) { toast.error('Selecione um endereço de entrega'); return; }
    if (deliveryType === 'delivery' && deliveryFee === null) { toast.error('Calcule o frete antes de finalizar'); return; }

    const phoneDigits = customerPhone.replace(/\D/g, '');
    const deliveryCode = phoneDigits.length >= 4
      ? phoneDigits.slice(-4)
      : String(Math.floor(1000 + Math.random() * 9000));

    const storeCount = Object.keys(cartByStore).length;

    const newOrders: Order[] = [];

    Object.entries(cartByStore).forEach(([storeId, items]) => {
      const storeSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const store = getStoreById(storeId);
      const resolvedStoreName = storeId === sellerProfile.storeId ? sellerProfile.storeName : store?.name;
      const resolvedStoreAddress = storeId === sellerProfile.storeId && sellerProfile.address
        ? [sellerProfile.address.logradouro, sellerProfile.address.numero, sellerProfile.address.bairro, sellerProfile.address.cidade, sellerProfile.address.uf].filter(Boolean).join(', ')
        : store?.address;
      const resolvedStoreCoords: [number, number] | undefined =
        mockStoreCoords[storeId] ??
        (storeId === sellerProfile.storeId && sellerProfile.address
          ? getBairroCoords(sellerProfile.address.bairro) ?? undefined
          : undefined);

      const orderCreatedAt = new Date().toISOString();
      let order: Order;
      if (deliveryType === 'pickup') {
        order = {
          id: String(Math.floor(1000 + Math.random() * 9000)),
          storeId,
          storeName: resolvedStoreName,
          storeAddress: resolvedStoreAddress,
          storeCoords: resolvedStoreCoords,
          items,
          total: storeSubtotal,
          status: 'pending',
          paymentStatus: 'pending_payment',
          createdAt: orderCreatedAt,
          updatedAt: orderCreatedAt,
          customerName,
          customerEmail,
          customerPhone,
          deliveryCode,
          isPickup: true,
          statusHistory: [{ status: 'pending', timestamp: orderCreatedAt }],
        };
      } else {
        const storeFee = (deliveryFee ?? 0) / storeCount;
        const storeTotal = storeSubtotal + storeFee;
        const motoRideValue = deliveryDistance !== null ? calcMotoRideValue(deliveryDistance) : undefined;
        order = {
          id: String(Math.floor(1000 + Math.random() * 9000)),
          storeId,
          storeName: resolvedStoreName,
          storeAddress: resolvedStoreAddress,
          storeCoords: resolvedStoreCoords,
          items,
          total: storeTotal,
          status: 'pending',
          paymentStatus: 'pending_payment',
          createdAt: orderCreatedAt,
          updatedAt: orderCreatedAt,
          customerName,
          customerEmail,
          customerPhone,
          deliveryCode,
          isPickup: false,
          deliveryAddress: {
            logradouro: selectedAddress!.logradouro,
            numero: selectedAddress!.numero,
            bairro: selectedAddress!.bairro,
            cidade: selectedAddress!.cidade,
            uf: selectedAddress!.uf,
          },
          deliveryCoords: getBairroCoords(selectedAddress!.bairro) ?? undefined,
          distanceKm: deliveryDistance ?? undefined,
          motoRideValue,
          statusHistory: [{ status: 'pending', timestamp: orderCreatedAt }],
        };
      }
      addClientOrder(order);
      newOrders.push(order);
    });

    clearCart();
    setIsCheckingOut(false);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setPlacedOrders(newOrders);
    setShowOrderConfirm(true);
  };

  const buildWhatsappMessage = (orders: Order[]) => {
    const lines: string[] = ['*Novo Pedido - Marketplace Regional*', ''];
    orders.forEach(order => {
      lines.push(`*Loja: ${order.storeName ?? 'Loja'}*`);
      lines.push(`Pedido #${order.id}`);
      lines.push('');
      lines.push('*Itens:*');
      order.items.forEach(item => {
        const pname = products.find(p => p.id === item.productId)?.name ?? 'Produto';
        lines.push(`  - ${pname} x${item.quantity}  =>  R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}`);
      });
      lines.push('');
      if (!order.isPickup && order.distanceKm != null) {
        const itemsSubtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
        const fee = order.total - itemsSubtotal;
        lines.push(`Subtotal produtos: R$ ${itemsSubtotal.toFixed(2).replace('.', ',')}`);
        lines.push(`Taxa de entrega: R$ ${fee.toFixed(2).replace('.', ',')}`);
      }
      lines.push(`*Total: R$ ${order.total.toFixed(2).replace('.', ',')}*`);
      lines.push(order.isPickup ? 'Retirada na loja' : 'Entrega em domicilio');
      if (!order.isPickup && order.deliveryAddress) {
        const da = order.deliveryAddress;
        lines.push(`Endereco: ${da.logradouro}, ${da.numero} - ${da.bairro}, ${da.cidade}/${da.uf}`);
      }
      lines.push('');
    });
    lines.push('---');
    lines.push(`Cliente: ${placedOrders[0]?.customerName ?? ''}`);
    lines.push(`Telefone: ${placedOrders[0]?.customerPhone ?? ''}`);
    lines.push('');
    lines.push('Por favor, confirme o recebimento do pedido e o pagamento. Obrigado!');
    return lines.join('\n');
  };

  if (showOrderConfirm) {
    const msg = buildWhatsappMessage(placedOrders);
    const rawPhone = sellerProfile.storePhone.replace(/\D/g, '');
    const waUrl = rawPhone
      ? `https://wa.me/55${rawPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground">Pedido Realizado!</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Entre em contato com a loja para efetuar o pagamento
            </p>
          </div>

          {placedOrders.map(order => (
            <Card key={order.id} className="p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-foreground">{order.storeName ?? 'Loja'}</span>
                <span className="text-sm text-muted-foreground font-mono">#{order.id}</span>
              </div>
              <div className="space-y-1 mb-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {products.find(p => p.id === item.productId)?.name ?? 'Produto'}{' '}
                      <span className="text-muted-foreground">x{item.quantity}</span>
                    </span>
                    <span className="text-foreground">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              </div>
              {!order.isPickup && order.distanceKm != null && (() => {
                const itemsSubtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
                const fee = order.total - itemsSubtotal;
                return (
                  <div className="space-y-1 border-t pt-2 mt-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal produtos</span>
                      <span>R$ {itemsSubtotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Taxa de entrega</span>
                      <span>R$ {fee.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                );
              })()}
              <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                <span>Total</span>
                <span>R$ {order.total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                {order.isPickup
                  ? <><Store className="w-3 h-3" /> Retirada na loja</>
                  : <><Truck className="w-3 h-3" /> Entrega em domicílio</>}
              </div>
            </Card>
          ))}

          <Card className="p-4 mb-6 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Seu pedido está como <strong>Pendente de Pagamento</strong>. A loja atualizará seu status assim que confirmar o recebimento.
              </span>
            </p>
          </Card>

          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block w-full mb-3">
            <Button
              data-testid="button-whatsapp-contact"
              className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white gap-2 h-12 text-base"
            >
              <SiWhatsapp className="w-5 h-5" />
              Chamar loja no WhatsApp
            </Button>
          </a>

          <Button
            data-testid="button-view-orders"
            variant="outline"
            className="w-full gap-2"
            onClick={() => navigate('/pedidos')}
          >
            <ClipboardList className="w-4 h-4" />
            Ver meus pedidos
          </Button>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2 mb-8">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </Link>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Carrinho Vazio</h2>
            <p className="text-muted-foreground mb-8">Você ainda não adicionou nenhum produto ao carrinho</p>
            <Link href="/">
              <Button className="bg-primary hover:bg-primary/90 text-white">Continuar Comprando</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <Link href="/">
          <Button variant="ghost" className="gap-2 mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </Link>

        <h2 className="text-3xl font-display font-bold text-foreground mb-8">Seu Carrinho</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(cartByStore).map(([storeId, items]) => {
              const store = getStoreById(storeId);
              const storeTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
              return (
                <Card key={storeId} className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span>{store?.logo}</span>
                    {store?.name}
                  </h3>
                  <div className="space-y-4">
                    {items.map(item => {
                      const product = products.find(p => p.id === item.productId);
                      if (!product) return null;
                      return (
                        <div key={`${item.productId}-${item.storeId}`} className="flex gap-4 pb-4 border-b border-border last:border-b-0">
                          <div className="bg-secondary rounded-lg w-20 h-20 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            ) : product.image}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground line-clamp-2">{product.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">R$ {product.price.toFixed(2)} cada</p>
                          </div>
                          <div className="flex items-center gap-2 bg-secondary rounded-lg p-2 h-fit">
                            <button onClick={() => updateCartQuantity(item.productId, item.storeId, item.quantity - 1)} className="p-1 hover:bg-muted rounded transition-colors">
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(item.productId, item.storeId, item.quantity + 1)} className="p-1 hover:bg-muted rounded transition-colors">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="text-right min-w-fit">
                            <p className="font-semibold text-foreground">R$ {(product.price * item.quantity).toFixed(2)}</p>
                            <button onClick={() => removeFromCart(item.productId, item.storeId)} className="text-destructive hover:bg-destructive/10 p-1 rounded mt-2 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border text-right">
                    <p className="text-sm text-muted-foreground">Subtotal da loja:</p>
                    <p className="text-lg font-bold text-primary">R$ {storeTotal.toFixed(2)}</p>
                  </div>
                </Card>
              );
            })}

            {/* Delivery Type Selector */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Como deseja receber?</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  data-testid="btn-delivery-option"
                  onClick={() => setDeliveryType('delivery')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    deliveryType === 'delivery'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <Truck className={`w-6 h-6 ${deliveryType === 'delivery' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-semibold ${deliveryType === 'delivery' ? 'text-primary' : 'text-foreground'}`}>
                    Entrega
                  </span>
                  <span className="text-xs text-muted-foreground text-center">Receba em casa</span>
                </button>
                <button
                  data-testid="btn-pickup-option"
                  onClick={() => setDeliveryType('pickup')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    deliveryType === 'pickup'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <Store className={`w-6 h-6 ${deliveryType === 'pickup' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-semibold ${deliveryType === 'pickup' ? 'text-primary' : 'text-foreground'}`}>
                    Retirar na loja
                  </span>
                  <span className="text-xs text-muted-foreground text-center">Buscar pessoalmente</span>
                </button>
              </div>
            </Card>

            {/* Address Selection — only shown when delivery is selected */}
            {deliveryType === 'delivery' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Endereço de Entrega
              </h3>

              {clientProfile.addresses.length === 0 && !showNewAddressForm && (
                <div className="text-center py-4 text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm mb-3">Nenhum endereço cadastrado.</p>
                  <Button size="sm" variant="outline" onClick={() => setShowNewAddressForm(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Adicionar Endereço
                  </Button>
                </div>
              )}

              {clientProfile.addresses.length > 0 && (
                <div className="space-y-3 mb-4">
                  {clientProfile.addresses.map(addr => (
                    <div
                      key={addr.id}
                      onClick={() => handleSelectAddress(addr.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedAddressId === addr.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground">{addr.label}</span>
                            {addr.isPrimary && (
                              <Badge className="bg-primary/10 text-primary text-xs px-1.5 py-0 flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-primary" /> Principal
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {addr.logradouro}{addr.numero ? `, ${addr.numero}` : ''} - {addr.bairro}, {addr.cidade}/{addr.uf}
                          </p>
                        </div>
                        {selectedAddressId === addr.id && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                    className="gap-2 text-primary"
                  >
                    <Plus className="w-4 h-4" />
                    {showNewAddressForm ? 'Cancelar' : 'Novo Endereço'}
                  </Button>
                </div>
              )}

              {showNewAddressForm && (
                <div className="border border-dashed border-primary/40 rounded-lg p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Novo Endereço</h4>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Nome do endereço</label>
                    <input
                      type="text"
                      value={newAddressLabel}
                      onChange={e => setNewAddressLabel(e.target.value)}
                      placeholder="Ex: Casa, Trabalho..."
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <AddressForm value={newAddress} onChange={setNewAddress} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNewAddress} className="bg-primary text-white gap-2">
                      Salvar Endereço
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowNewAddressForm(false); setNewAddress(emptyAddress); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-foreground mb-6">Resumo do Pedido</h3>

              <div className="space-y-4 mb-6 pb-6 border-b border-border">
                {/* Subtotal */}
                <div className="flex justify-between text-foreground">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>

                {/* Delivery / Pickup Info */}
                {deliveryType === 'pickup' ? (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
                    <Store className="w-4 h-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-primary">Retirada na loja</p>
                      <p className="text-xs text-muted-foreground">Frete: Grátis</p>
                    </div>
                  </div>
                ) : selectedAddress && sellerProfile.address ? (
                  <div className="space-y-2 bg-secondary rounded-lg p-3">
                    <p className="text-xs font-semibold text-foreground">Frete:</p>
                    {calcLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="w-3 h-3 animate-spin" /> Calculando...
                      </div>
                    ) : deliveryDistance !== null && deliveryFee !== null ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Distância:</span>
                          <span className="font-medium text-foreground">{deliveryDistance.toFixed(1)} km</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Taxa:</span>
                          <span className="font-medium text-primary">R$ {deliveryFee.toFixed(2)}</span>
                        </div>
                        <p className="text-muted-foreground italic pt-1">
                          {deliveryDistance <= 5
                            ? '✓ Taxa fixa até 5 km'
                            : `✓ R$ 12 base + R$ ${((deliveryFee - 12).toFixed(2))} por ${(deliveryDistance - 5).toFixed(1)} km`}
                        </p>
                      </div>
                    ) : deliveryError ? (
                      <div className="flex items-start gap-2 text-destructive text-xs">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{deliveryError}</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-800">Selecione um endereço para calcular o frete</p>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between text-lg font-bold text-primary border-t border-border pt-3">
                  <span>Total:</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Form */}
              {!isCheckingOut ? (
                <Button
                  onClick={() => setIsCheckingOut(true)}
                  disabled={deliveryType === 'delivery' && (!selectedAddress || deliveryFee === null || calcLoading)}
                  className="w-full bg-primary hover:bg-primary/90 text-white mb-3"
                >
                  Ir para Checkout
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
                    <Input
                      type="text"
                      placeholder="Seu nome"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Telefone</label>
                    <Input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="bg-secondary border-border"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Os 4 últimos dígitos serão seu código de entrega</p>
                  </div>

                  {deliveryType === 'pickup' ? (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
                      <Store className="w-4 h-4 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-primary">Retirada na loja</p>
                        <p className="text-xs text-muted-foreground">Você retirará o pedido diretamente na loja</p>
                      </div>
                    </div>
                  ) : selectedAddress && (
                    <div className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Entrega em:</p>
                      <p>{selectedAddress.logradouro}, {selectedAddress.numero} - {selectedAddress.bairro}</p>
                      <p>{selectedAddress.cidade}/{selectedAddress.uf} - CEP {selectedAddress.cep}</p>
                    </div>
                  )}

                  {/* Final Summary */}
                  <div className="bg-primary/5 rounded-lg p-3 space-y-2 border border-primary/20">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium text-foreground">R$ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frete:</span>
                      <span className="font-medium text-foreground">
                        {deliveryType === 'pickup' ? 'Grátis' : `R$ ${(deliveryFee || 0).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="border-t border-primary/20 pt-2 flex justify-between text-base font-bold">
                      <span className="text-foreground">Total:</span>
                      <span className="text-primary">R$ {total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                  >
                    Finalizar Compra
                  </Button>
                  <Button onClick={() => setIsCheckingOut(false)} variant="outline" className="w-full">
                    Cancelar
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
