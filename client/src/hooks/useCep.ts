/**
 * useCep - Hook para busca de endereço via CEP (ViaCEP API)
 */
import { useState, useCallback } from 'react';

export interface CepAddress {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export interface AddressForm {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  numero: string;
  complemento: string;
}

export function useCep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCep = useCallback(async (cep: string): Promise<CepAddress | null> => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setError('CEP deve ter 8 dígitos');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setError('CEP não encontrado');
        return null;
      }

      return data as CepAddress;
    } catch {
      setError('Erro ao buscar CEP. Verifique sua conexão.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const formatCep = (value: string): string => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 5) return clean;
    return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
  };

  return { fetchCep, formatCep, loading, error };
}
