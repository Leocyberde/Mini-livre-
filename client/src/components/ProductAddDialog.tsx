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
import { Upload, X, Info } from 'lucide-react';
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

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('price') || name === 'stock' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo 5MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Por favor, selecione uma imagem válida.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
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
      imageUrl: imagePreview || undefined,
      rating: 0,
      reviews: 0,
    });

    toast.success('Produto adicionado com sucesso!');
    setFormData({ name: '', price: 0, originalPrice: 0, stock: 1, category: 'Outros', description: '' });
    setImagePreview(null);
    onClose();
  };

  const handleClose = () => {
    setFormData({ name: '', price: 0, originalPrice: 0, stock: 1, category: 'Outros', description: '' });
    setImagePreview(null);
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
          {/* Image Upload */}
          <div>
            <Label className="block text-sm font-medium text-foreground mb-2">Foto do Produto</Label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg" />
                  <button
                    onClick={e => { e.stopPropagation(); setImagePreview(null); }}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Clique para fazer upload da imagem</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG até 5MB</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
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
