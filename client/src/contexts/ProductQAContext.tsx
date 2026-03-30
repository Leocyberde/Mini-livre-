/**
 * ProductQA Context — manages product Q&A threads (PostgreSQL backend)
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, authFetch } from '@/lib/authFetch';

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

async function api(method: string, path: string, body?: unknown) {
  await authApi(method, path, body).catch(console.error);
}

export function ProductQAProvider({ children }: { children: React.ReactNode }) {
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);

  useEffect(() => {
    authFetch('/api/product-qa')
      .then(r => r.ok ? r.json() : [])
      .then((data: ProductQuestion[]) => { if (Array.isArray(data)) setQuestions(data); })
      .catch(console.error);
  }, []);

  const sendQuestion = (q: Omit<ProductQuestion, 'id' | 'status' | 'createdAt'>): ProductQuestion => {
    const newQ: ProductQuestion = {
      ...q,
      id: `qa-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    setQuestions(prev => [...prev, newQ]);
    api('POST', '/api/product-qa', newQ);
    return newQ;
  };

  const answerQuestion = (questionId: string, answer: string) => {
    setQuestions(prev =>
      prev.map(q =>
        q.id === questionId
          ? { ...q, answer, status: 'answered' as const, answeredAt: new Date().toISOString() }
          : q
      )
    );
    api('PUT', `/api/product-qa/${questionId}/answer`, { answer });
  };

  const closeThread = (questionId: string) => {
    setQuestions(prev =>
      prev.map(q => q.id === questionId ? { ...q, status: 'closed' as const } : q)
    );
    api('PUT', `/api/product-qa/${questionId}/close`, {});
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
