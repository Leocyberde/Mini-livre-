/**
 * ProfileContext - Gerenciamento de perfis (PostgreSQL backend)
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AddressForm } from '@/hooks/useCep';
import { nanoid } from 'nanoid';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/authFetch';

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
  id: string;
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
  allClients: ClientProfile[];
  activeClientIndex: number;
  switchClient: (index: number) => void;
}

const makeEmptySellerProfile = (userId: string): SellerProfile => ({
  storeId: userId,
  storeName: '',
  storeDescription: '',
  storeCategory: '',
  storeLogo: '🏪',
  storePhone: '',
  storeEmail: '',
  address: null,
});

const emptyClientProfile = (id: string, name: string, email: string, phone: string): ClientProfile => ({
  id,
  name,
  email,
  phone,
  addresses: [],
});

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

async function api(method: string, path: string, body?: unknown) {
  await authApi(method, path, body).catch(console.error);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sellerProfile, setSellerProfile] = useState<SellerProfile>(() => makeEmptySellerProfile(user?.id ?? ''));
  const [allClients, setAllClients] = useState<ClientProfile[]>([]);
  const [activeClientIndex, setActiveClientIndex] = useState(0);

  useEffect(() => {
    if (!user) return;
    // Load seller profile scoped to this user
    fetch(`/api/profiles/seller?userId=${user.id}`).then(r => r.ok ? r.json() : null).then((data: SellerProfile | null) => {
      if (data && data.storeName) {
        // Always ensure storeId is user.id for consistency
        setSellerProfile({ ...data, storeId: user.id });
      } else if (user.roles.includes('seller')) {
        // Seed seller profile from authenticated user's registration data
        const userAddress: SavedAddress | null = user.address?.cep && user.address?.numero
          ? {
              id: 'seller-addr',
              label: 'Endereço da Loja',
              isPrimary: true,
              cep: user.address.cep,
              logradouro: user.address.logradouro,
              numero: user.address.numero,
              complemento: user.address.complemento,
              bairro: user.address.bairro,
              cidade: user.address.cidade,
              uf: user.address.uf,
            }
          : null;
        const seededProfile: SellerProfile = {
          storeId: user.id,
          storeName: '',
          storeDescription: '',
          storeCategory: '',
          storeLogo: '🏪',
          storePhone: user.whatsapp || '',
          storeEmail: user.email || '',
          address: userAddress,
        };
        setSellerProfile(seededProfile);
        api('PUT', '/api/profiles/seller', seededProfile);
      }
    }).catch(console.error);
  }, [user?.id, user?.roles?.join(',')]);

  useEffect(() => {
    if (!user) return;

    // Load client profiles
    authApi('GET', '/api/profiles/clients').then(r => r.ok ? r.json() : []).then((data: (ClientProfile & { isActive?: boolean })[]) => {
      if (Array.isArray(data) && data.length > 0) {
        // Sync the first (or matching) profile with auth user data
        const updated = data.map(c => {
          if (c.id === user.id || data.indexOf(c) === 0) {
            return {
              ...c,
              id: user.id,
              name: c.name || user.name,
              email: c.email || user.email,
              phone: c.phone || user.whatsapp || '',
            };
          }
          return c;
        });
        setAllClients(updated);

        const savedClientId = localStorage.getItem('active-client-id');
        const savedIdx = savedClientId ? updated.findIndex(c => c.id === savedClientId) : -1;
        const activeIdx = savedIdx >= 0 ? savedIdx : updated.findIndex(c => c.isActive);
        const finalIdx = activeIdx >= 0 ? activeIdx : 0;
        setActiveClientIndex(finalIdx);
        localStorage.setItem('active-client-id', updated[finalIdx]?.id || user.id);
      } else {
        // Seed from auth user's registration data
        const userAddress: SavedAddress | null = user.address?.cep && user.address?.numero
          ? {
              id: nanoid(),
              label: 'Meu Endereço',
              isPrimary: true,
              cep: user.address.cep,
              logradouro: user.address.logradouro,
              numero: user.address.numero,
              complemento: user.address.complemento,
              bairro: user.address.bairro,
              cidade: user.address.cidade,
              uf: user.address.uf,
            }
          : null;

        const newProfile: ClientProfile = {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.whatsapp || '',
          addresses: userAddress ? [userAddress] : [],
        };

        setAllClients([newProfile]);
        setActiveClientIndex(0);
        localStorage.setItem('active-client-id', user.id);
        api('PUT', '/api/profiles/clients', [{ ...newProfile, isActive: true }]);
      }
    }).catch(console.error);
  }, [user?.id]);

  const clientProfile = allClients[activeClientIndex] ?? allClients[0] ?? emptyClientProfile(user?.id ?? '', user?.name ?? '', user?.email ?? '', user?.whatsapp ?? '');

  const persistClients = (clients: ClientProfile[], activeIdx: number) => {
    const toSave = clients.map((c, i) => ({ ...c, isActive: i === activeIdx }));
    api('PUT', '/api/profiles/clients', toSave);
  };

  const updateSellerProfile = (updates: Partial<SellerProfile>) => {
    setSellerProfile(prev => {
      const updated = { ...prev, ...updates };
      api('PUT', '/api/profiles/seller', updated);
      return updated;
    });
  };

  const updateClientProfile = (updates: Partial<ClientProfile>) => {
    setAllClients(prev => {
      const updated = prev.map((c, i) =>
        i === activeClientIndex ? { ...c, ...updates } : c
      );
      persistClients(updated, activeClientIndex);
      return updated;
    });
  };

  const addClientAddress = (address: Omit<SavedAddress, 'id'>) => {
    const newAddr: SavedAddress = { ...address, id: nanoid() };
    setAllClients(prev => {
      const updated = prev.map((c, i) =>
        i === activeClientIndex
          ? { ...c, addresses: [...c.addresses, newAddr] }
          : c
      );
      persistClients(updated, activeClientIndex);
      return updated;
    });
  };

  const updateClientAddress = (id: string, updates: Partial<SavedAddress>) => {
    setAllClients(prev => {
      const updated = prev.map((c, i) =>
        i === activeClientIndex
          ? { ...c, addresses: c.addresses.map(a => a.id === id ? { ...a, ...updates } : a) }
          : c
      );
      persistClients(updated, activeClientIndex);
      return updated;
    });
  };

  const removeClientAddress = (id: string) => {
    setAllClients(prev => {
      const updated = prev.map((c, i) =>
        i === activeClientIndex
          ? { ...c, addresses: c.addresses.filter(a => a.id !== id) }
          : c
      );
      persistClients(updated, activeClientIndex);
      return updated;
    });
  };

  const setPrimaryAddress = (id: string) => {
    setAllClients(prev => {
      const updated = prev.map((c, i) =>
        i === activeClientIndex
          ? { ...c, addresses: c.addresses.map(a => ({ ...a, isPrimary: a.id === id })) }
          : c
      );
      persistClients(updated, activeClientIndex);
      return updated;
    });
  };

  const getPrimaryAddress = (): SavedAddress | null => {
    return clientProfile.addresses.find(a => a.isPrimary) || clientProfile.addresses[0] || null;
  };

  const switchClient = (index: number) => {
    if (index < 0 || index >= allClients.length) return;
    setActiveClientIndex(index);
    const client = allClients[index];
    if (client) {
      localStorage.setItem('active-client-id', client.id);
    }
    persistClients(allClients, index);
    window.dispatchEvent(new CustomEvent('clientChanged', { detail: { clientId: client?.id } }));
  };

  return (
    <ProfileContext.Provider value={{
      sellerProfile, updateSellerProfile,
      clientProfile, updateClientProfile,
      addClientAddress, updateClientAddress, removeClientAddress,
      setPrimaryAddress, getPrimaryAddress,
      allClients, activeClientIndex, switchClient,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
}
