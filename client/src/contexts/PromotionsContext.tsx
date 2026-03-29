import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/authFetch';

export interface Promotion {
  id: string;
  storeId: string;
  title: string;
  description: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y' | 'free_shipping';
  value: number;
  minOrderValue: number;
  applyTo: 'all' | 'category' | 'specific';
  productIds: string[];
  category: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  buyQuantity: number;
  getQuantity: number;
  createdAt: string;
}

export type PromotionStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

export function getPromotionStatus(promo: Promotion): PromotionStatus {
  const now = new Date();
  const start = new Date(promo.startsAt);
  const end = new Date(promo.endsAt);
  if (!promo.isActive) return 'inactive';
  if (now < start) return 'scheduled';
  if (now > end) return 'expired';
  return 'active';
}

interface PromotionsContextType {
  promotions: Promotion[];
  isLoading: boolean;
  fetchPromotions: (storeId: string) => Promise<void>;
  createPromotion: (promo: Omit<Promotion, 'id' | 'createdAt'>) => Promise<void>;
  updatePromotion: (id: string, updates: Partial<Omit<Promotion, 'id' | 'createdAt' | 'storeId'>>) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
}

const PromotionsContext = createContext<PromotionsContextType | undefined>(undefined);

export function PromotionsProvider({ children }: { children: React.ReactNode }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPromotions = useCallback(async (storeId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/promotions?storeId=${encodeURIComponent(storeId)}`);
      const data = await res.json();
      if (Array.isArray(data)) setPromotions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPromotion = async (promo: Omit<Promotion, 'id' | 'createdAt'>) => {
    const res = await authApi('POST', '/api/promotions', promo);
    const data = await res.json();
    const newPromo: Promotion = { ...promo, id: data.id, createdAt: data.createdAt };
    setPromotions(prev => [newPromo, ...prev]);
  };

  const updatePromotion = async (id: string, updates: Partial<Omit<Promotion, 'id' | 'createdAt' | 'storeId'>>) => {
    setPromotions(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      const promo = updated.find(p => p.id === id);
      if (promo) authApi('PUT', `/api/promotions/${id}`, promo).catch(console.error);
      return updated;
    });
  };

  const deletePromotion = async (id: string) => {
    await authApi('DELETE', `/api/promotions/${id}`);
    setPromotions(prev => prev.filter(p => p.id !== id));
  };

  return (
    <PromotionsContext.Provider value={{ promotions, isLoading, fetchPromotions, createPromotion, updatePromotion, deletePromotion }}>
      {children}
    </PromotionsContext.Provider>
  );
}

export function usePromotions() {
  const ctx = useContext(PromotionsContext);
  if (!ctx) throw new Error('usePromotions must be used inside PromotionsProvider');
  return ctx;
}
