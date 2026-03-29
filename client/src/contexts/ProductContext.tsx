/**
 * Product Context - Gerenciamento de produtos (PostgreSQL backend)
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/lib/mockData';
import { authApi } from '@/lib/authFetch';

interface ProductContextType {
  products: Product[];
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  toggleFrozen: (productId: string) => void;
  uploadProductImage: (productId: string, imageUrl: string) => void;
  addProduct: (product: Product) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

function sanitize(p: Product): Product {
  const orig = p.originalPrice != null ? Number(p.originalPrice) : undefined;
  return {
    ...p,
    price: Number(p.price) || 0,
    originalPrice: orig && orig > 0 ? orig : undefined,
    stock: Number(p.stock) || 0,
    rating: Number(p.rating) || 0,
    reviews: Number(p.reviews) || 0,
  };
}

async function api(method: string, path: string, body?: unknown) {
  await authApi(method, path, body).catch(console.error);
}

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then((data: Product[]) => {
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data.map(sanitize));
      }
    }).catch(console.error);
  }, []);

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts(prev => {
      const updated = prev.map(p => p.id === productId ? { ...p, ...updates } : p);
      const product = updated.find(p => p.id === productId);
      if (product) api('PUT', `/api/products/${productId}`, product);
      return updated;
    });
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => {
      api('DELETE', `/api/products/${productId}`);
      return prev.filter(p => p.id !== productId);
    });
  };

  const toggleFrozen = (productId: string) => {
    setProducts(prev => {
      const updated = prev.map(p => p.id === productId ? { ...p, frozen: !p.frozen } : p);
      const product = updated.find(p => p.id === productId);
      if (product) api('PUT', `/api/products/${productId}`, product);
      return updated;
    });
  };

  const uploadProductImage = (productId: string, imageUrl: string) => {
    setProducts(prev => {
      const updated = prev.map(p => p.id === productId ? { ...p, imageUrl } : p);
      const product = updated.find(p => p.id === productId);
      if (product) api('PUT', `/api/products/${productId}`, product);
      return updated;
    });
  };

  const addProduct = (product: Product) => {
    setProducts(prev => {
      api('POST', '/api/products', product);
      return [...prev, product];
    });
  };

  return (
    <ProductContext.Provider value={{ products, updateProduct, deleteProduct, toggleFrozen, uploadProductImage, addProduct }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProducts must be used within ProductProvider');
  return context;
}
