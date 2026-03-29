/**
 * ProductAddDialog - Modal para adicionar novo produto
 */
import { useState, useRef } from 'react';
import { useProducts } from '@/contexts/ProductContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Info, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';

interface ProductAddDialogProps {
  storeId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  'Eletrônicos', 'Papelaria', 'Bebidas', 'Alimentos', 'Livros', 'Moda',
  'Farmácia', 'Mercado', 'Restaurante', 'Serviços', 'Outros',
];

const MAX_IMAGES = 3;

export default function ProductAddDialog({ storeId, isOpen, onClose }: ProductAddDialogProps) {
  const { addProduct } = useProducts();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    originalPrice: 0,
    stock: 1,
    category: 'Outros',
    description: '',
  });

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('price') || name === 'stock' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - imagePreviews.length;
    const toProcess = files.slice(0, remaining);

    toProcess.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: Arquivo muito grande. Máximo 5MB.`); return; }
      if (!file.type.startsWith('image/')) { toast.error('Por favor, selecione apenas imagens válidas.'); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => {
          if (prev.length >= MAX_IMAGES) return prev;
          return [...prev, reader.result as string];
        });
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!formData.name.trim()) { toast.error('Nome do produto é obrigatório'); return; }
    if (formData.price <= 0) { toast.error('Preço deve ser maior que 0'); return; }
    if (formData.stock < 0) { toast.error('Estoque não pode ser negativo'); return; }

    addProduct({
      id: `prod-${Date.now()}`,
      storeId,
      name: formData.name,
      price: formData.price,
      originalPrice: formData.originalPrice > formData.price ? formData.originalPrice : undefined,
      stock: formData.stock,
      category: formData.category,
      description: formData.description,
      image: '📦',
      imageUrl: imagePreviews[0] || undefined,
      imageUrls: imagePreviews,
      rating: 0,
      reviews: 0,
    });

    toast.success('Produto adicionado com sucesso!');
    setFormData({ name: '', price: 0, originalPrice: 0, stock: 1, category: 'Outros', description: '' });
    setImagePreviews([]);
    onClose();
  };

  const handleClose = () => {
    setFormData({ name: '', price: 0, originalPrice: 0, stock: 1, category: 'Outros', description: '' });
    setImagePreviews([]);
    onClose();
  };

  const discount = formData.originalPrice && formData.originalPrice > formData.price
    ? Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Upload — up to 3 photos */}
          <div>
            <Label className="block text-sm font-medium text-foreground mb-1">
              Fotos do Produto
              <span className="text-muted-foreground font-normal ml-1">
                ({imagePreviews.length}/{MAX_IMAGES})
              </span>
            </Label>
            <p className="text-xs text-muted-foreground mb-3">Adicione até 3 fotos. A primeira será a foto principal.</p>

            <div className="flex gap-3 flex-wrap">
              {imagePreviews.map((src, idx) => (
                <div key={idx} className="relative w-28 h-28 rounded-lg overflow-hidden border border-border flex-shrink-0">
                  <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-[10px] text-center py-0.5">
                      Principal
                    </span>
                  )}
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 hover:bg-destructive/90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {imagePreviews.length < MAX_IMAGES && (
                <div
                  className="w-28 h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors flex-shrink-0 text-center px-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="w-6 h-6 text-muted-foreground mb-1" />
                  <p className="text-[11px] text-muted-foreground">Adicionar foto</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Product Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="add-name" className="text-sm font-medium text-foreground">Nome <span className="text-destructive">*</span></Label>
              <Input
                id="add-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nome do produto"
                className="mt-1 bg-secondary border-border"
              />
            </div>

            <div>
              <Label htmlFor="add-category" className="text-sm font-medium text-foreground">Categoria</Label>
              <select
                id="add-category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div>
              <Label htmlFor="add-stock" className="text-sm font-medium text-foreground">Estoque</Label>
              <Input
                id="add-stock"
                name="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={handleInputChange}
                className="mt-1 bg-secondary border-border"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Preços</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-price" className="text-sm font-medium text-foreground">Preço de Venda (R$) <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground mb-1">Preço exibido ao cliente</p>
                <Input
                  id="add-price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="mt-1 bg-secondary border-border text-lg font-bold"
                />
              </div>
              <div>
                <Label htmlFor="add-originalPrice" className="text-sm font-medium text-foreground">Preço Original (R$)</Label>
                <p className="text-xs text-muted-foreground mb-1">Deixe em 0 se não houver desconto</p>
                <Input
                  id="add-originalPrice"
                  name="originalPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.originalPrice}
                  onChange={handleInputChange}
                  className="mt-1 bg-secondary border-border"
                />
              </div>
            </div>
            {discount > 0 && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-sm">
                <span className="font-bold text-accent">-{discount}% de desconto</span>
                <span className="text-muted-foreground ml-2">Economia de R$ {(formData.originalPrice - formData.price).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="add-description" className="text-sm font-medium text-foreground">Descrição</Label>
            <textarea
              id="add-description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="Descreva o produto, características, benefícios..."
              className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white">
            Adicionar Produto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
