/**
 * ProfileContext - Gerenciamento de perfis de logista e cliente
 * Inclui informações da loja, endereços e configurações
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AddressForm } from '@/hooks/useCep';

export interface SavedAddress extends AddressForm {
  id: string;
  label: string;
  isPrimary: boolean;
  lat?: number;
  lng?: number;
}

export interface SellerProfile {
  storeId: string;
  storeName: string;
  storeDescription: string;
  storeCategory: string;
  storeLogo: string;
  storePhone: string;
  storeEmail: string;
  address: SavedAddress | null;
}

export interface ClientProfile {
  name: string;
  email: string;
  phone: string;
  addresses: SavedAddress[];
}

interface ProfileContextType {
  sellerProfile: SellerProfile;
  updateSellerProfile: (updates: Partial<SellerProfile>) => void;
  clientProfile: ClientProfile;
  updateClientProfile: (updates: Partial<ClientProfile>) => void;
  addClientAddress: (address: Omit<SavedAddress, 'id'>) => void;
  updateClientAddress: (id: string, updates: Partial<SavedAddress>) => void;
  removeClientAddress: (id: string) => void;
  setPrimaryAddress: (id: string) => void;
  getPrimaryAddress: () => SavedAddress | null;
}

const defaultSellerProfile: SellerProfile = {
  storeId: 'store-1',
  storeName: 'TechHub Eletrônicos',
  storeDescription: 'Loja especializada em eletrônicos de qualidade com melhor preço da região',
  storeCategory: 'Eletrônicos',
  storeLogo: '📱',
  storePhone: '',
  storeEmail: '',
  address: null,
};

const defaultClientProfile: ClientProfile = {
  name: '',
  email: '',
  phone: '',
  addresses: [],
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [sellerProfile, setSellerProfile] = useState<SellerProfile>(defaultSellerProfile);
  const [clientProfile, setClientProfile] = useState<ClientProfile>(defaultClientProfile);

  useEffect(() => {
    const savedSeller = localStorage.getItem('marketplace-seller-profile');
    const savedClient = localStorage.getItem('marketplace-client-profile');
    if (savedSeller) setSellerProfile(JSON.parse(savedSeller));
    if (savedClient) setClientProfile(JSON.parse(savedClient));
  }, []);

  const updateSellerProfile = (updates: Partial<SellerProfile>) => {
    setSellerProfile(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('marketplace-seller-profile', JSON.stringify(updated));
      return updated;
    });
  };

  const updateClientProfile = (updates: Partial<ClientProfile>) => {
    setClientProfile(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('marketplace-client-profile', JSON.stringify(updated));
      return updated;
    });
  };

  const addClientAddress = (address: Omit<SavedAddress, 'id'>) => {
    setClientProfile(prev => {
      const newAddress: SavedAddress = {
        ...address,
        id: `addr-${Date.now()}`,
        isPrimary: prev.addresses.length === 0 ? true : address.isPrimary,
      };
      // If new address is primary, unset others
      let addresses = prev.addresses.map(a =>
        newAddress.isPrimary ? { ...a, isPrimary: false } : a
      );
      addresses = [...addresses, newAddress];
      const updated = { ...prev, addresses };
      localStorage.setItem('marketplace-client-profile', JSON.stringify(updated));
      return updated;
    });
  };

  const updateClientAddress = (id: string, updates: Partial<SavedAddress>) => {
    setClientProfile(prev => {
      let addresses = prev.addresses.map(a => (a.id === id ? { ...a, ...updates } : a));
      // If setting primary, unset others
      if (updates.isPrimary) {
        addresses = addresses.map(a => (a.id === id ? a : { ...a, isPrimary: false }));
      }
      const updated = { ...prev, addresses };
      localStorage.setItem('marketplace-client-profile', JSON.stringify(updated));
      return updated;
    });
  };

  const removeClientAddress = (id: string) => {
    setClientProfile(prev => {
      const addresses = prev.addresses.filter(a => a.id !== id);
      // If removed was primary, set first as primary
      if (addresses.length > 0 && !addresses.some(a => a.isPrimary)) {
        addresses[0].isPrimary = true;
      }
      const updated = { ...prev, addresses };
      localStorage.setItem('marketplace-client-profile', JSON.stringify(updated));
      return updated;
    });
  };

  const setPrimaryAddress = (id: string) => {
    setClientProfile(prev => {
      const addresses = prev.addresses.map(a => ({ ...a, isPrimary: a.id === id }));
      const updated = { ...prev, addresses };
      localStorage.setItem('marketplace-client-profile', JSON.stringify(updated));
      return updated;
    });
  };

  const getPrimaryAddress = (): SavedAddress | null => {
    return clientProfile.addresses.find(a => a.isPrimary) || clientProfile.addresses[0] || null;
  };

  return (
    <ProfileContext.Provider
      value={{
        sellerProfile,
        updateSellerProfile,
        clientProfile,
        updateClientProfile,
        addClientAddress,
        updateClientAddress,
        removeClientAddress,
        setPrimaryAddress,
        getPrimaryAddress,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
}
