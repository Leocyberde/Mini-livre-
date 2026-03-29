import { Card } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { Order, Product } from '@/lib/mockData';

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  count: number;
}

interface CategoriesTabProps {
  realCategories: Category[];
  products: Product[];
  allOrders: Order[];
}

export default function CategoriesTab({ realCategories, products, allOrders }: CategoriesTabProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Categorias derivadas dos produtos cadastrados na plataforma.
      </p>

      {realCategories.length === 0 ? (
        <Card className="p-10 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">Nenhuma categoria encontrada.</p>
          <p className="text-xs text-muted-foreground mt-1">Cadastre produtos com categorias para vê-las aqui.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {realCategories.map(category => {
            const catProducts = products.filter(p => p.category === category.name);
            const catSales = allOrders.flatMap(o => o.items).filter(i => {
              const prod = products.find(p => p.id === i.productId);
              return prod?.category === category.name;
            }).reduce((sum, i) => sum + i.price * i.quantity, 0);
            return (
              <Card key={category.id} className="p-6 hover:shadow-lg transition-all">
                <div className="text-4xl mb-4">{category.icon}</div>
                <h4 className="text-lg font-semibold text-foreground mb-1">{category.name}</h4>
                <div className="space-y-1 mb-4">
                  <p className="text-xs text-muted-foreground">
                    {catProducts.length} produto{catProducts.length !== 1 ? 's' : ''} cadastrado{catProducts.length !== 1 ? 's' : ''}
                  </p>
                  {catSales > 0 && (
                    <p className="text-xs text-primary font-medium">
                      R$ {catSales.toFixed(2)} em vendas
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
