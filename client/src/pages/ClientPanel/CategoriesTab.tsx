import { getCategoryEmoji } from './helpers';
import { Product } from '@/lib/mockData';

interface CategoriesTabProps {
  categories: string[];
  activeProducts: Product[];
  setSelectedCategory: (cat: string | null) => void;
  setSearchQuery: (q: string) => void;
  navigate: (to: string) => void;
}

export default function CategoriesTab({ categories, activeProducts, setSelectedCategory, setSearchQuery, navigate }: CategoriesTabProps) {
  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-foreground mb-4">Categorias</h2>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setSelectedCategory(null); setSearchQuery(''); navigate('/app'); }}
          className="flex items-center gap-3 bg-primary text-white rounded-2xl p-4 hover:bg-primary/90 transition-all shadow-sm"
          data-testid="btn-cat-all"
        >
          <span className="text-2xl">✨</span>
          <span className="font-semibold text-sm">Todos os produtos</span>
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setSelectedCategory(cat); setSearchQuery(''); navigate('/app'); }}
            className="flex items-center gap-3 bg-white border border-border rounded-2xl p-4 hover:border-primary/40 hover:bg-blue-50/50 transition-all shadow-sm"
            data-testid={`btn-cat-${cat}`}
          >
            <span className="text-2xl">{getCategoryEmoji(cat)}</span>
            <div className="text-left">
              <p className="font-semibold text-sm text-foreground">{cat}</p>
              <p className="text-xs text-muted-foreground">
                {activeProducts.filter(p => p.category === cat).length} produtos
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
