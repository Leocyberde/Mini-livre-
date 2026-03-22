/**
 * ProductQA Context — manages product Q&A threads between clients and sellers
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ProductQuestion {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  storeId: string;
  storeName: string;
  question: string;
  answer?: string;
  status: 'open' | 'answered' | 'closed';
  clientName: string;
  createdAt: string;
  answeredAt?: string;
}

interface ProductQAContextType {
  questions: ProductQuestion[];
  sendQuestion: (q: Omit<ProductQuestion, 'id' | 'status' | 'createdAt'>) => ProductQuestion;
  answerQuestion: (questionId: string, answer: string) => void;
  closeThread: (questionId: string) => void;
  getQuestionsForProduct: (productId: string) => ProductQuestion[];
  getUnansweredForStore: (storeId: string) => ProductQuestion[];
}

const ProductQAContext = createContext<ProductQAContextType | undefined>(undefined);
const STORAGE_KEY = 'marketplace-product-qa';

export function ProductQAProvider({ children }: { children: React.ReactNode }) {
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setQuestions(JSON.parse(saved));
  }, []);

  const persist = (next: ProductQuestion[]) => {
    setQuestions(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const sendQuestion = (q: Omit<ProductQuestion, 'id' | 'status' | 'createdAt'>): ProductQuestion => {
    const newQ: ProductQuestion = {
      ...q,
      id: `qa-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    setQuestions(prev => {
      const next = [...prev, newQ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    return newQ;
  };

  const answerQuestion = (questionId: string, answer: string) => {
    setQuestions(prev => {
      const next = prev.map(q =>
        q.id === questionId
          ? { ...q, answer, status: 'answered' as const, answeredAt: new Date().toISOString() }
          : q
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const closeThread = (questionId: string) => {
    setQuestions(prev => {
      const next = prev.map(q =>
        q.id === questionId ? { ...q, status: 'closed' as const } : q
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const getQuestionsForProduct = (productId: string) =>
    questions.filter(q => q.productId === productId && q.status !== 'open');

  const getUnansweredForStore = (storeId: string) =>
    questions.filter(q => q.storeId === storeId && q.status === 'open');

  return (
    <ProductQAContext.Provider value={{
      questions, sendQuestion, answerQuestion, closeThread,
      getQuestionsForProduct, getUnansweredForStore,
    }}>
      {children}
    </ProductQAContext.Provider>
  );
}

export function useProductQA() {
  const ctx = useContext(ProductQAContext);
  if (!ctx) throw new Error('useProductQA must be used within ProductQAProvider');
  return ctx;
}
