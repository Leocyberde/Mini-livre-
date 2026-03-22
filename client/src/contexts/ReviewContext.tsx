/**
 * Review Context — manages product and store reviews from clients
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
const PRODUCT_REVIEWS_KEY = 'marketplace-product-reviews';
const STORE_REVIEWS_KEY = 'marketplace-store-reviews';
const REVIEWED_ORDERS_KEY = 'marketplace-reviewed-orders';

export function ReviewProvider({ children }: { children: React.ReactNode }) {
  const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
  const [storeReviews, setStoreReviews] = useState<StoreReview[]>([]);
  const [reviewedOrders, setReviewedOrders] = useState<string[]>([]);

  useEffect(() => {
    const pr = localStorage.getItem(PRODUCT_REVIEWS_KEY);
    const sr = localStorage.getItem(STORE_REVIEWS_KEY);
    const ro = localStorage.getItem(REVIEWED_ORDERS_KEY);
    if (pr) setProductReviews(JSON.parse(pr));
    if (sr) setStoreReviews(JSON.parse(sr));
    if (ro) setReviewedOrders(JSON.parse(ro));
  }, []);

  const addProductReview = (r: Omit<ProductReview, 'id' | 'createdAt'>) => {
    const review: ProductReview = {
      ...r,
      id: `pr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    setProductReviews(prev => {
      const next = [...prev, review];
      localStorage.setItem(PRODUCT_REVIEWS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const addStoreReview = (r: Omit<StoreReview, 'id' | 'createdAt'>) => {
    const review: StoreReview = {
      ...r,
      id: `sr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    setStoreReviews(prev => {
      const next = [...prev, review];
      localStorage.setItem(STORE_REVIEWS_KEY, JSON.stringify(next));
      return next;
    });
    setReviewedOrders(prev => {
      const next = [...prev, r.orderId];
      localStorage.setItem(REVIEWED_ORDERS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const getProductReviews = (productId: string) =>
    productReviews.filter(r => r.productId === productId);

  const getStoreReviews = (storeId: string) =>
    storeReviews.filter(r => r.storeId === storeId);

  const hasReviewedOrder = (orderId: string) =>
    reviewedOrders.includes(orderId);

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
