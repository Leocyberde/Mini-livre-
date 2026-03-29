/**
 * Cart Page - Shopping cart and checkout
 * Features: View cart items, modify quantities, address selection, delivery fee calculation
 */
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useProfile, SavedAddress } from '@/contexts/ProfileContext';
import { useProducts } from '@/contexts/ProductContext';
import { getBairroCoords, mockStoreCoords, Order } from '@/lib/mockData';
import { useStores } from '@/contexts/StoresContext';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Trash2, Plus, Minus, MapPin, Loader2, Package,
  AlertCircle, Store, Truck, CheckCircle, ClipboardList, ChevronRight, X,
} from 'lucide-react';
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
  const { clientProfile, addClientAddress, getPrimaryAddress } = useProfile();
  const { getStoreById } = useStores();
  const { products } = useProducts();
  const [, navigate] = useLocation();

  const [customerName, setCustomerName] = useState(clientProfile.name || '');
  const [customerEmail, setCustomerEmail] = useState(clientProfile.email || '');
  const [customerPhone, setCustomerPhone] = useState(clientProfile.phone || '');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [placedOrders, setPlacedOrders] = useState<Order[]>([]);
  const [showOrderConfirm, setShowOrderConfirm] = useState(false);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressFormType>(emptyAddress);
  const [newAddressLabel, setNewAddressLabel] = useState('');

  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  const cartByStore = cart.reduce((acc, item) => {
    if (!acc[item.storeId]) acc[item.storeId] = [];
    acc[item.storeId].push(item);
    return acc;
  }, {} as Record<string, typeof cart>);

  const primaryStoreId = Object.keys(cartByStore)[0] || '';
  const primaryStore = primaryStoreId ? getStoreById(primaryStoreId) : undefined;
  const primaryStoreAddress = primaryStore?.addressData;

  useEffect(() => {
    const primary = getPrimaryAddress();
    if (primary) setSelectedAddressId(primary.id);
  }, [clientProfile.addresses]);

  useEffect(() => {
    if (deliveryType === 'delivery' && selectedAddressId && primaryStoreAddress) {
      const addr = clientProfile.addresses.find(a => a.id === selectedAddressId);
      if (addr) handleCalcDelivery(addr);
    }
  }, [selectedAddressId, deliveryType]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = deliveryType === 'delivery' && deliveryFee !== null ? deliveryFee : 0;
  const total = subtotal + shipping;

  const selectedAddress: SavedAddress | null =
    clientProfile.addresses.find(a => a.id === selectedAddressId) || null;

  const handleCalcDelivery = async (addr?: SavedAddress) => {
    const address = addr || selectedAddress;
    if (!address || !primaryStoreAddress) {
      setDeliveryFee(null);
      setDeliveryDistance(null);
      setDeliveryError(!primaryStoreAddress ? 'A loja ainda não cadastrou seu endereço.' : null);
      return;
    }
    setCalcLoading(true);
    setDeliveryError(null);
    try {
      const storeAddr = [primaryStoreAddress.logradouro, primaryStoreAddress.numero, primaryStoreAddress.bairro, primaryStoreAddress.cidade, primaryStoreAddress.uf, primaryStoreAddress.cep].filter(Boolean).join(', ');
      const customerAddr = [address.logradouro, address.numero, address.bairro, address.cidade, address.uf, address.cep].filter(Boolean).join(', ');
      const result = await calcDeliveryFromAddresses(storeAddr, customerAddr);
      if (result) { setDeliveryFee(result.deliveryFee); setDeliveryDistance(result.distance); }
      else { setDeliveryError('Não foi possível calcular a distância. Verifique os endereços.'); setDeliveryFee(null); setDeliveryDistance(null); }
    } catch { setDeliveryError('Erro ao calcular frete. Tente novamente.'); }
    finally { setCalcLoading(false); }
  };

  const handleSaveNewAddress = () => {
    if (!newAddress.cep || !newAddress.numero) { toast.error('Preencha o CEP e o número'); return; }
    addClientAddress({ ...newAddress, label: newAddressLabel || `Endereço ${clientProfile.addresses.length + 1}`, isPrimary: clientProfile.addresses.length === 0 });
    setShowNewAddressForm(false);
    setNewAddress(emptyAddress);
    setNewAddressLabel('');
    toast.success('Endereço salvo!');
  };

  const geocodeAddress = async (address: string): Promise<[number, number] | undefined> => {
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng) return [data.lat, data.lng];
      }
    } catch { /* ignore, fall back below */ }
    return undefined;
  };

  const handleCheckout = async () => {
    if (!customerName.trim()) { toast.error('Insira seu nome'); return; }
    if (!customerEmail.trim()) { toast.error('Insira seu email'); return; }
    if (!customerPhone.trim()) { toast.error('Insira seu telefone'); return; }
    if (cart.length === 0) { toast.error('Carrinho vazio'); return; }
    if (deliveryType === 'delivery' && !selectedAddress) { toast.error('Selecione um endereço de entrega'); return; }
    if (deliveryType === 'delivery' && deliveryFee === null) { toast.error('Calcule o frete antes de finalizar'); return; }

    setIsCheckingOut(true);

    const phoneDigits = customerPhone.replace(/\D/g, '');
    const deliveryCode = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : String(Math.floor(1000 + Math.random() * 9000));
    const storeCount = Object.keys(cartByStore).length;
    const newOrders: Order[] = [];

    const storeAddrFull = primaryStoreAddress
      ? [primaryStoreAddress.logradouro, primaryStoreAddress.numero, primaryStoreAddress.bairro, primaryStoreAddress.cidade, primaryStoreAddress.uf, primaryStoreAddress.cep].filter(Boolean).join(', ')
      : undefined;

    const deliveryAddrFull = selectedAddress
      ? [selectedAddress.logradouro, selectedAddress.numero, selectedAddress.bairro, selectedAddress.cidade, selectedAddress.uf, selectedAddress.cep].filter(Boolean).join(', ')
      : undefined;

    const [geocodedStoreCoords, geocodedDeliveryCoords] = await Promise.all([
      storeAddrFull ? geocodeAddress(storeAddrFull) : Promise.resolve(undefined),
      deliveryAddrFull && deliveryType === 'delivery' ? geocodeAddress(deliveryAddrFull) : Promise.resolve(undefined),
    ]);

    for (const [storeId, items] of Object.entries(cartByStore)) {
      const storeSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const store = getStoreById(storeId);
      const resolvedStoreName = store?.name;
      const resolvedStoreAddress = store?.address;
      const resolvedStoreCoords: [number, number] | undefined =
        geocodedStoreCoords ??
        (store?.addressData?.bairro ? getBairroCoords(store.addressData.bairro) ?? undefined : undefined);
      const orderCreatedAt = new Date().toISOString();

      let order: Order;
      if (deliveryType === 'pickup') {
        order = { id: String(Math.floor(1000 + Math.random() * 9000)), storeId, storeName: resolvedStoreName, storeAddress: resolvedStoreAddress, storeCoords: resolvedStoreCoords, items, total: storeSubtotal, status: 'pending', paymentStatus: 'pending_payment', createdAt: orderCreatedAt, updatedAt: orderCreatedAt, customerName, customerEmail, customerPhone, deliveryCode, isPickup: true, statusHistory: [{ status: 'pending', timestamp: orderCreatedAt }] };
      } else {
        const storeFee = (deliveryFee ?? 0) / storeCount;
        const motoRideValue = deliveryDistance !== null ? calcMotoRideValue(deliveryDistance) : undefined;
        const resolvedDeliveryCoords: [number, number] | undefined =
          geocodedDeliveryCoords ??
          (selectedAddress ? getBairroCoords(selectedAddress.bairro) ?? undefined : undefined);
        order = { id: String(Math.floor(1000 + Math.random() * 9000)), storeId, storeName: resolvedStoreName, storeAddress: resolvedStoreAddress, storeCoords: resolvedStoreCoords, items, total: storeSubtotal + storeFee, status: 'pending', paymentStatus: 'pending_payment', createdAt: orderCreatedAt, updatedAt: orderCreatedAt, customerName, customerEmail, customerPhone, deliveryCode, isPickup: false, deliveryAddress: { logradouro: selectedAddress!.logradouro, numero: selectedAddress!.numero, bairro: selectedAddress!.bairro, cidade: selectedAddress!.cidade, uf: selectedAddress!.uf }, deliveryCoords: resolvedDeliveryCoords, distanceKm: deliveryDistance ?? undefined, motoRideValue, statusHistory: [{ status: 'pending', timestamp: orderCreatedAt }] };
      }
      addClientOrder(order);
      newOrders.push(order);
    }

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

  /* ── ORDER CONFIRMATION SCREEN ── */
  if (showOrderConfirm) {
    const msg = buildWhatsappMessage(placedOrders);
    const rawPhone = (primaryStore?.phone || '').replace(/\D/g, '');
    const waUrl = rawPhone ? `https://wa.me/55${rawPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    return (
      <div className="min-h-screen bg-[#F8F9FC] pb-24">
        {/* Success Header */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-4 pt-14 pb-10 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-white text-2xl font-bold">Pedido Realizado!</h2>
          <p className="text-green-100 text-sm mt-1">Entre em contato com a loja para efetuar o pagamento</p>
        </div>

        <div className="px-4 -mt-4 max-w-lg mx-auto space-y-3">
          {placedOrders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-foreground">{order.storeName ?? 'Loja'}</span>
                <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">#{order.id}</span>
              </div>
              <div className="space-y-1.5 mb-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-foreground">{products.find(p => p.id === item.productId)?.name ?? 'Produto'} <span className="text-muted-foreground">×{item.quantity}</span></span>
                    <span className="font-medium text-foreground">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              </div>
              {!order.isPickup && order.distanceKm != null && (() => {
                const itemsSubtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
                const fee = order.total - itemsSubtotal;
                return (
                  <div className="border-t border-border pt-2 mt-2 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span><span>R$ {itemsSubtotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Entrega</span>
                      <span>R$ {fee.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                );
              })()}
              <div className="flex justify-between font-bold border-t border-border pt-2 mt-2">
                <span className="text-foreground">Total</span>
                <span className="text-primary">R$ {order.total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                {order.isPickup ? <><Store className="w-3 h-3" /> Retirada na loja</> : <><Truck className="w-3 h-3" /> Entrega em domicílio</>}
              </div>
            </div>
          ))}

          {/* Payment notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Seu pedido está como <strong>Pendente de Pagamento</strong>. A loja atualizará o status após confirmar o recebimento.
            </p>
          </div>

          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block">
            <button data-testid="button-whatsapp-contact" className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors">
              <SiWhatsapp className="w-5 h-5" />
              Chamar loja no WhatsApp
            </button>
          </a>

          <button
            data-testid="button-view-orders"
            onClick={() => navigate('/pedidos')}
            className="w-full border border-border bg-white text-foreground font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Ver meus pedidos
          </button>
        </div>
      </div>
    );
  }

  /* ── EMPTY CART ── */
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col">
        <div className="bg-white border-b border-border px-4 py-4 flex items-center gap-3">
          <Link href="/">
            <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
          </Link>
          <h1 className="font-bold text-lg text-foreground">Meu Carrinho</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-5">
            <Package className="w-12 h-12 text-primary/40" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Carrinho vazio</h2>
          <p className="text-muted-foreground text-sm mb-6">Você ainda não adicionou nenhum produto ao carrinho.</p>
          <Link href="/">
            <button className="bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors">
              Continuar Comprando
            </button>
          </Link>
        </div>
      </div>
    );
  }

  /* ── MAIN CART ── */
  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-6">
      {/* Top bar */}
      <div className="bg-white border-b border-border px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/">
          <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
        </Link>
        <div>
          <h1 className="font-bold text-lg text-foreground leading-none">Meu Carrinho</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{cart.reduce((s, i) => s + i.quantity, 0)} {cart.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'itens'}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">

        {/* ── Cart Items ── */}
        {Object.entries(cartByStore).map(([storeId, items]) => {
          const store = getStoreById(storeId);
          const storeTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
          return (
            <div key={storeId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <span className="text-lg">{store?.logo}</span>
                <span className="font-semibold text-sm text-foreground">{store?.name ?? ''}</span>
              </div>
              <div className="divide-y divide-border">
                {items.map(item => {
                  const product = products.find(p => p.id === item.productId);
                  if (!product) return null;
                  return (
                    <div key={`${item.productId}-${item.storeId}`} className="flex gap-3 p-4">
                      <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                        {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /> : product.image}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">{product.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">R$ {product.price.toFixed(2)} cada</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center bg-secondary rounded-xl overflow-hidden">
                            <button onClick={() => updateCartQuantity(item.productId, item.storeId, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors" data-testid={`btn-decrease-${item.productId}`}>
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(item.productId, item.storeId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors" data-testid={`btn-increase-${item.productId}`}>
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-primary">R$ {(product.price * item.quantity).toFixed(2)}</span>
                            <button onClick={() => removeFromCart(item.productId, item.storeId)} className="w-8 h-8 flex items-center justify-center rounded-xl text-destructive hover:bg-red-50 transition-colors" data-testid={`btn-remove-${item.productId}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 bg-blue-50/50 flex items-center justify-between border-t border-border">
                <span className="text-sm text-muted-foreground">Subtotal da loja</span>
                <span className="font-bold text-primary">R$ {storeTotal.toFixed(2)}</span>
              </div>
            </div>
          );
        })}

        {/* ── Delivery Type ── */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="font-semibold text-sm text-foreground mb-3">Como deseja receber?</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              data-testid="btn-delivery-option"
              onClick={() => setDeliveryType('delivery')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${deliveryType === 'delivery' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30 bg-secondary/50'}`}
            >
              <Truck className={`w-5 h-5 ${deliveryType === 'delivery' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-semibold ${deliveryType === 'delivery' ? 'text-primary' : 'text-foreground'}`}>Entrega</span>
              <span className="text-xs text-muted-foreground">Receba em casa</span>
            </button>
            <button
              data-testid="btn-pickup-option"
              onClick={() => setDeliveryType('pickup')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${deliveryType === 'pickup' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30 bg-secondary/50'}`}
            >
              <Store className={`w-5 h-5 ${deliveryType === 'pickup' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-semibold ${deliveryType === 'pickup' ? 'text-primary' : 'text-foreground'}`}>Retirar na loja</span>
              <span className="text-xs text-muted-foreground">Buscar pessoalmente</span>
            </button>
          </div>
        </div>

        {/* ── Address Selection ── */}
        {deliveryType === 'delivery' && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <p className="font-semibold text-sm text-foreground">Endereço de Entrega</p>
              </div>
              {clientProfile.addresses.length > 0 && !showNewAddressForm && (
                <button onClick={() => setShowNewAddressForm(true)} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Novo
                </button>
              )}
            </div>

            {clientProfile.addresses.length === 0 && !showNewAddressForm && (
              <div className="text-center py-6">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground mb-3">Nenhum endereço cadastrado.</p>
                <button onClick={() => setShowNewAddressForm(true)} className="bg-primary/10 text-primary text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/20 transition-colors flex items-center gap-1.5 mx-auto">
                  <Plus className="w-4 h-4" /> Adicionar Endereço
                </button>
              </div>
            )}

            {clientProfile.addresses.length > 0 && !showNewAddressForm && (
              <div className="space-y-2">
                {clientProfile.addresses.map(addr => (
                  <div
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                    data-testid={`btn-address-${addr.id}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${selectedAddressId === addr.id ? 'border-primary bg-primary' : 'border-border'}`}>
                      {selectedAddressId === addr.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{addr.label} {addr.isPrimary && <span className="text-xs text-primary font-normal">(Principal)</span>}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{addr.logradouro}{addr.numero ? `, ${addr.numero}` : ''} — {addr.bairro}, {addr.cidade}/{addr.uf}</p>
                    </div>
                  </div>
                ))}
                <button onClick={() => setShowNewAddressForm(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors">
                  <Plus className="w-4 h-4" /> Novo endereço
                </button>
              </div>
            )}

            {showNewAddressForm && (
              <div className="border border-dashed border-primary/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-foreground">Novo Endereço</p>
                  <button onClick={() => { setShowNewAddressForm(false); setNewAddress(emptyAddress); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Nome do endereço</label>
                  <input type="text" value={newAddressLabel} onChange={e => setNewAddressLabel(e.target.value)} placeholder="Ex: Casa, Trabalho..." className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" data-testid="input-address-label" />
                </div>
                <AddressForm value={newAddress} onChange={setNewAddress} />
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveNewAddress} className="flex-1 bg-primary text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors" data-testid="btn-save-address">
                    Salvar Endereço
                  </button>
                  <button onClick={() => { setShowNewAddressForm(false); setNewAddress(emptyAddress); }} className="px-4 border border-border text-sm font-semibold rounded-xl hover:bg-secondary transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Delivery fee display */}
            {!showNewAddressForm && selectedAddress && primaryStoreAddress && (
              <div className="mt-3 pt-3 border-t border-border">
                {calcLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Calculando frete...
                  </div>
                ) : deliveryFee !== null && deliveryDistance !== null ? (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-start gap-2">
                    <Truck className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-green-800">{deliveryDistance.toFixed(1)} km — Frete R$ {deliveryFee.toFixed(2)}</p>
                      <p className="text-xs text-green-700 mt-0.5">
                        {deliveryDistance <= 5 ? 'Taxa fixa até 5 km' : `R$ 12 base + adicional por km`}
                      </p>
                    </div>
                  </div>
                ) : deliveryError ? (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-700">{deliveryError}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* ── Order Summary + Checkout ── */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="font-semibold text-sm text-foreground mb-3">Resumo do Pedido</p>

          <div className="space-y-2 pb-3 border-b border-border mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground font-medium">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entrega</span>
              {deliveryType === 'pickup' ? (
                <span className="text-green-600 font-medium">Grátis</span>
              ) : calcLoading ? (
                <span className="text-muted-foreground text-xs flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Calculando...</span>
              ) : deliveryFee !== null ? (
                <span className="text-foreground font-medium">R$ {deliveryFee.toFixed(2)}</span>
              ) : (
                <span className="text-muted-foreground text-xs">Selecione endereço</span>
              )}
            </div>
            <div className="flex justify-between text-base font-bold pt-1 border-t border-border">
              <span className="text-foreground">Total</span>
              <span className="text-primary">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          {!isCheckingOut ? (
            <button
              onClick={() => setIsCheckingOut(true)}
              disabled={deliveryType === 'delivery' && (!selectedAddress || deliveryFee === null || calcLoading)}
              className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="btn-ir-checkout"
            >
              Ir para Checkout
            </button>
          ) : (
            <div className="space-y-3">
              <p className="font-semibold text-sm text-foreground">Dados do cliente</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome</label>
                <Input type="text" placeholder="Seu nome completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="rounded-xl" data-testid="input-customer-name" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                <Input type="email" placeholder="seu@email.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="rounded-xl" data-testid="input-customer-email" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Telefone</label>
                <Input type="tel" placeholder="(11) 99999-9999" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="rounded-xl" data-testid="input-customer-phone" />
                <p className="text-xs text-muted-foreground mt-1">Os 4 últimos dígitos serão seu código de entrega</p>
              </div>

              {/* Delivery summary */}
              {deliveryType === 'pickup' ? (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-primary">Retirada na loja</p>
                    <p className="text-xs text-muted-foreground">Você retirará o pedido diretamente na loja</p>
                  </div>
                </div>
              ) : selectedAddress && (
                <div className="bg-secondary rounded-xl p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> Entrega em:</p>
                  <p>{selectedAddress.logradouro}, {selectedAddress.numero} — {selectedAddress.bairro}</p>
                  <p>{selectedAddress.cidade}/{selectedAddress.uf} — CEP {selectedAddress.cep}</p>
                </div>
              )}

              {/* Final total */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Frete</span>
                  <span>{deliveryType === 'pickup' ? 'Grátis' : `R$ ${(deliveryFee || 0).toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-primary/20 pt-1.5">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">R$ {total.toFixed(2)}</span>
                </div>
              </div>

              <button onClick={handleCheckout} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl transition-colors" data-testid="btn-finalizar-compra">
                Finalizar Compra
              </button>
              <button onClick={() => setIsCheckingOut(false)} className="w-full border border-border text-sm font-semibold py-3 rounded-xl hover:bg-secondary transition-colors">
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
