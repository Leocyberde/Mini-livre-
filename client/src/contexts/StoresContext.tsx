import React, { createContext, useContext, useState, useEffect } from 'react';
import { Store } from '@/lib/mockData';

interface StoresContextType {
  stores: Store[];
  getStoreById: (id: string) => Store | undefined;
  isLoading: boolean;
  reload: () => void;
}

const StoresContext = createContext<StoresContextType | undefined>(undefined);

export function StoresProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStores = () => {
    setIsLoading(true);
    fetch('/api/stores')
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{
        id: string;
        name: string;
        category: string;
        description: string;
        logo: string;
        phone?: string;
        email?: string;
        address: Record<string, string> | null;
      }>) => {
        const mapped: Store[] = data.map(s => ({
          id: s.id,
          name: s.name || '',
          category: s.category || '',
          rating: 0,
          reviews: 0,
          location: s.address ? [s.address.cidade, s.address.uf].filter(Boolean).join(', ') : '',
          address: s.address
            ? [s.address.logradouro, s.address.numero, s.address.bairro, s.address.cidade, s.address.uf].filter(Boolean).join(', ')
            : undefined,
          addressData: s.address ? {
            cep: s.address.cep,
            logradouro: s.address.logradouro,
            numero: s.address.numero,
            complemento: s.address.complemento,
            bairro: s.address.bairro,
            cidade: s.address.cidade,
            uf: s.address.uf,
          } : undefined,
          phone: s.phone || undefined,
          email: s.email || undefined,
          description: s.description || '',
          logo: s.logo || undefined,
        }));
        setStores(mapped);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const getStoreById = (id: string) => stores.find(s => s.id === id);

  return (
    <StoresContext.Provider value={{ stores, getStoreById, isLoading, reload: fetchStores }}>
      {children}
    </StoresContext.Provider>
  );
}

export function useStores() {
  const context = useContext(StoresContext);
  if (!context) throw new Error('useStores must be used within StoresProvider');
  return context;
}
