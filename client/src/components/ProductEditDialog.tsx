/**
 * Product Edit Dialog - Modal para editar produtos
 * Features: Preço normal, preço promocional, descrição
 */
import { useState, useRef } from 'react';
import { Product } from '@/lib/mockData';
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

interface ProductEditDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductEditDialog({ product, isOpen, onClose }: ProductEditDialogProps) {
  const { updateProduct, uploadProductImage } = useProducts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: product?.name || '',
    price: product?.price || 0,
    originalPrice: product?.originalPrice || 0,
    stock: product?.stock || 0,
    category: product?.category || '',
    description: product?.description || '',
  });

  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null);

  // Update form when product changes
  if (product && formData.name !== product.name) {
    setFormData({
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice || 0,
      stock: product.stock,
      category: product.category,
      description: product.description,
    });
    setImagePreview(product.imageUrl || null);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('price') || name === 'stock' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida.');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!product) return;

    if (!formData.name.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }

    if (formData.price <= 0) {
      toast.error('Preço promocional deve ser maior que 0');
      return;
    }

    if (formData.stock < 0) {
      toast.error('Estoque não pode ser negativo');
      return;
    }

    // Update product
    updateProduct(product.id, {
      name: formData.name,
      price: formData.price,
      originalPrice: formData.originalPrice || undefined,
      stock: formData.stock,
      category: formData.category,
      description: formData.description,
    });

    // Upload image if changed
    if (imagePreview && imagePreview !== product.imageUrl) {
      uploadProductImage(product.id, imagePreview);
    }

    toast.success('Produto atualizado com sucesso!');
    onClose();
  };

  const discount = formData.originalPrice && formData.originalPrice > formData.price
    ? Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Upload */}
          <div>
            <Label className="block text-sm font-medium text-foreground mb-2">Foto do Produto</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-40 rounded-lg"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(null);
                    }}
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Product Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-foreground">Nome</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 bg-secondary border-border"
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-sm font-medium text-foreground">Categoria</Label>
              <Input
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="mt-1 bg-secondary border-border"
              />
            </div>

            <div>
              <Label htmlFor="stock" className="text-sm font-medium text-foreground">Estoque</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                value={formData.stock}
                onChange={handleInputChange}
                className="mt-1 bg-secondary border-border"
              />
            </div>
          </div>

          {/* Pricing Section */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Preços</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price" className="text-sm font-medium text-foreground">
                  Preço Promocional (R$)
                </Label>
                <p className="text-xs text-muted-foreground mb-1">Este é o preço que será exibido</p>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="mt-1 bg-secondary border-border text-lg font-bold"
                />
              </div>

              <div>
                <Label htmlFor="originalPrice" className="text-sm font-medium text-foreground">
                  Preço Original (R$)
                </Label>
                <p className="text-xs text-muted-foreground mb-1">Deixe em branco se não houver desconto</p>
                <Input
                  id="originalPrice"
                  name="originalPrice"
                  type="number"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={handleInputChange}
                  className="mt-1 bg-secondary border-border"
                />
              </div>
            </div>

            {/* Discount Display */}
            {discount > 0 && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">Resumo do Desconto:</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Desconto</p>
                    <p className="font-bold text-accent">{discount}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Economia</p>
                    <p className="font-bold text-green-600">R$ {(formData.originalPrice - formData.price).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Preço Final</p>
                    <p className="font-bold text-primary">R$ {formData.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-foreground">Descrição do Produto</Label>
            <p className="text-xs text-muted-foreground mb-1">Descreva os detalhes, características e benefícios do produto</p>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={5}
              placeholder="Ex: Produto de alta qualidade, resistente, com garantia de 1 ano..."
              className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white">
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
