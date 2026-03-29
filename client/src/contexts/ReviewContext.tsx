/**
 * Review Context — manages product and store reviews (PostgreSQL backend)
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ProductReview {
  id: string;
  productId: string;
  productName: string;
  storeId: string;
  rating: number;
  message: string;
  clientName: string;
  createdAt: string;
}

export interface StoreReview {
  id: string;
  storeId: string;
  storeName: string;
  orderId: string;
  rating: number;
  message: string;
  clientName: string;
  createdAt: string;
}

interface ReviewContextType {
  productReviews: ProductReview[];
  storeReviews: StoreReview[];
  addProductReview: (r: Omit<ProductReview, 'id' | 'createdAt'>) => void;
  addStoreReview: (r: Omit<StoreReview, 'id' | 'createdAt'>) => void;
  getProductReviews: (productId: string) => ProductReview[];
  getStoreReviews: (storeId: string) => StoreReview[];
  hasReviewedOrder: (orderId: string) => boolean;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

async function postReview(path: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[ReviewContext] Failed to save review: ${res.status}`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[ReviewContext] Network error saving review:', err);
    return false;
  }
}

export function ReviewProvider({ children }: { children: React.ReactNode }) {
  const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
  const [storeReviews, setStoreReviews] = useState<StoreReview[]>([]);

  useEffect(() => {
    fetch('/api/reviews/products').then(r => r.json()).then(setProductReviews).catch(console.error);
    fetch('/api/reviews/stores').then(r => r.json()).then(setStoreReviews).catch(console.error);
  }, []);

  const addProductReview = (r: Omit<ProductReview, 'id' | 'createdAt'>) => {
    const review: ProductReview = {
      ...r,
      id: `pr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    setProductReviews(prev => [...prev, review]);
    postReview('/api/reviews/products', review);
  };

  const addStoreReview = (r: Omit<StoreReview, 'id' | 'createdAt'>) => {
    const review: StoreReview = {
      ...r,
      id: `sr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    setStoreReviews(prev => [...prev, review]);
    postReview('/api/reviews/stores', review);
  };

  const getProductReviews = (productId: string) =>
    productReviews.filter(r => r.productId === productId);

  const getStoreReviews = (storeId: string) =>
    storeReviews.filter(r => r.storeId === storeId);

  const hasReviewedOrder = (orderId: string) =>
    storeReviews.some(r => r.orderId === orderId);

  return (
    <ReviewContext.Provider value={{
      productReviews, storeReviews,
      addProductReview, addStoreReview,
      getProductReviews, getStoreReviews,
      hasReviewedOrder,
    }}>
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview() {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error('useReview must be used within ReviewProvider');
  return ctx;
}
