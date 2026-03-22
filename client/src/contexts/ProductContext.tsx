/**
 * Product Context - Gerenciamento de produtos
 * Permite editar, excluir, congelar e fazer upload de fotos de produtos
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/lib/mockData';

interface ProductContextType {
  products: Product[];
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  toggleFrozen: (productId: string) => void;
  uploadProductImage: (productId: string, imageUrl: string) => void;
  addProduct: (product: Product) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Sanitize product numeric fields — guards against strings coming out of localStorage
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

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);

  // Load products from localStorage on mount
  useEffect(() => {
    const savedProducts = localStorage.getItem('marketplace-products');
    if (savedProducts) {
      setProducts((JSON.parse(savedProducts) as Product[]).map(sanitize));
    } else {
      // Initialize with mock products from mockData
      import('@/lib/mockData').then(({ mockProducts }) => {
        setProducts(mockProducts);
        localStorage.setItem('marketplace-products', JSON.stringify(mockProducts));
      });
    }
  }, []);

  // Persist products to localStorage
  const persistProducts = (updatedProducts: Product[]) => {
    localStorage.setItem('marketplace-products', JSON.stringify(updatedProducts));
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts(prevProducts => {
      const newProducts = prevProducts.map(p =>
        p.id === productId ? { ...p, ...updates } : p
      );
      persistProducts(newProducts);
      return newProducts;
    });
  };

  const deleteProduct = (productId: string) => {
    setProducts(prevProducts => {
      const newProducts = prevProducts.filter(p => p.id !== productId);
      persistProducts(newProducts);
      return newProducts;
    });
  };

  const toggleFrozen = (productId: string) => {
    setProducts(prevProducts => {
      const newProducts = prevProducts.map(p =>
        p.id === productId ? { ...p, frozen: !p.frozen } : p
      );
      persistProducts(newProducts);
      return newProducts;
    });
  };

  const uploadProductImage = (productId: string, imageUrl: string) => {
    setProducts(prevProducts => {
      const newProducts = prevProducts.map(p =>
        p.id === productId ? { ...p, imageUrl } : p
      );
      persistProducts(newProducts);
      return newProducts;
    });
  };

  const addProduct = (product: Product) => {
    setProducts(prevProducts => {
      const newProducts = [...prevProducts, product];
      persistProducts(newProducts);
      return newProducts;
    });
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        updateProduct,
        deleteProduct,
        toggleFrozen,
        uploadProductImage,
        addProduct,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductProvider');
  }
  return context;
}
