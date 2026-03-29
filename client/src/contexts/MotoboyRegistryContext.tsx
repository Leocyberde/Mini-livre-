import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Motoboy, MotoboyStatus, initialMotoboys } from '@/lib/mockData';
import { authApi } from '@/lib/authFetch';

export type { MotoboyStatus };

interface MotoboyRegistryContextType {
  motoboys: Motoboy[];
  isLoadingMotoboys: boolean;
  activeMotoboyId: string | null;
  activeMotoboy: Motoboy | null;
  setActiveMotoboyId: (id: string | null) => void;
  reloadMotoboys: () => void;
  updateMotoboyStatus: (id: string, status: MotoboyStatus) => void;
  updateMotoboyBlockInfo: (id: string, blockInfo: Motoboy['blockInfo']) => void;
  incrementRejected: (id: string) => void;
  incrementCompleted: (id: string) => void;
}

const MotoboyRegistryContext = createContext<MotoboyRegistryContextType | undefined>(undefined);

async function api(method: string, path: string, body?: unknown) {
  await authApi(method, path, body).catch(console.error);
}

export function MotoboyRegistryProvider({ children }: { children: React.ReactNode }) {
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [isLoadingMotoboys, setIsLoadingMotoboys] = useState(true);
  const [activeMotoboyId, setActiveMotoboyIdState] = useState<string | null>(null);

  const reloadMotoboys = useCallback(() => {
    setIsLoadingMotoboys(true);
    authApi('GET', '/api/motoboys').then(r => r.ok ? r.json() : []).then((data: Motoboy[]) => {
      if (!Array.isArray(data)) { setIsLoadingMotoboys(false); return; }
      if (data.length > 0) {
        setMotoboys(data);
        // Do NOT auto-select based on isActiveSession — that flag is global across all users.
        // MotoboyPanel is responsible for selecting the correct profile for the logged-in user.
      } else if (initialMotoboys.length > 0) {
        setMotoboys(initialMotoboys);
        api('POST', '/api/motoboys/bulk', initialMotoboys);
      }
      setIsLoadingMotoboys(false);
    }).catch(() => setIsLoadingMotoboys(false));
  }, []);

  useEffect(() => {
    reloadMotoboys();
  }, [reloadMotoboys]);

  const setActiveMotoboyId = (id: string | null) => {
    setActiveMotoboyIdState(prev => {
      if (prev) api('PUT', `/api/motoboys/${prev}/active-session`, { isActive: false });
      if (id) api('PUT', `/api/motoboys/${id}/active-session`, { isActive: true });
      return id;
    });
  };

  const updateMotoboyStatus = (id: string, status: MotoboyStatus) => {
    setMotoboys(prev => {
      const updated = prev.map(mb => mb.id === id ? { ...mb, status } : mb);
      const mb = updated.find(m => m.id === id);
      if (mb) api('PUT', `/api/motoboys/${id}`, { ...mb, isActiveSession: mb.id === activeMotoboyId });
      return updated;
    });
  };

  const updateMotoboyBlockInfo = (id: string, blockInfo: Motoboy['blockInfo']) => {
    setMotoboys(prev => {
      const updated = prev.map(mb =>
        mb.id === id
          ? { ...mb, blockInfo, status: blockInfo ? 'blocked' : 'unavailable' as MotoboyStatus }
          : mb
      );
      const mb = updated.find(m => m.id === id);
      if (mb) api('PUT', `/api/motoboys/${id}`, { ...mb, isActiveSession: mb.id === activeMotoboyId });
      return updated;
    });
  };

  const incrementRejected = (id: string) => {
    setMotoboys(prev => {
      const updated = prev.map(mb => mb.id === id ? { ...mb, rejectedTotal: mb.rejectedTotal + 1 } : mb);
      const mb = updated.find(m => m.id === id);
      if (mb) api('PUT', `/api/motoboys/${id}`, { ...mb, isActiveSession: mb.id === activeMotoboyId });
      return updated;
    });
  };

  const incrementCompleted = (id: string) => {
    setMotoboys(prev => {
      const updated = prev.map(mb => mb.id === id ? { ...mb, completedTotal: mb.completedTotal + 1 } : mb);
      const mb = updated.find(m => m.id === id);
      if (mb) api('PUT', `/api/motoboys/${id}`, { ...mb, isActiveSession: mb.id === activeMotoboyId });
      return updated;
    });
  };

  const activeMotoboy = motoboys.find(mb => mb.id === activeMotoboyId) ?? null;

  return (
    <MotoboyRegistryContext.Provider value={{
      motoboys,
      isLoadingMotoboys,
      activeMotoboyId,
      activeMotoboy,
      setActiveMotoboyId,
      reloadMotoboys,
      updateMotoboyStatus,
      updateMotoboyBlockInfo,
      incrementRejected,
      incrementCompleted,
    }}>
      {children}
    </MotoboyRegistryContext.Provider>
  );
}

export function useMotoboyRegistry() {
  const ctx = useContext(MotoboyRegistryContext);
  if (!ctx) throw new Error('useMotoboyRegistry must be used within MotoboyRegistryProvider');
  return ctx;
}
