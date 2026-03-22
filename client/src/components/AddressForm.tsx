/**
 * AddressForm - Formulário de endereço com preenchimento automático via CEP
 * Reutilizável para cliente e logista
 */
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Search } from 'lucide-react';
import { useCep, AddressForm as AddressFormType } from '@/hooks/useCep';
import { toast } from 'sonner';

interface AddressFormProps {
  value: AddressFormType;
  onChange: (address: AddressFormType) => void;
  disabled?: boolean;
}

export default function AddressForm({ value, onChange, disabled }: AddressFormProps) {
  const { fetchCep, formatCep, loading: cepLoading, error: cepError } = useCep();
  const [cepInput, setCepInput] = useState(value.cep || '');

  useEffect(() => {
    setCepInput(value.cep || '');
  }, [value.cep]);

  const handleCepChange = (raw: string) => {
    const formatted = formatCep(raw);
    setCepInput(formatted);
    onChange({ ...value, cep: formatted });
  };

  const handleCepSearch = async () => {
    const result = await fetchCep(cepInput);
    if (result) {
      onChange({
        ...value,
        cep: formatCep(result.cep),
        logradouro: result.logradouro,
        bairro: result.bairro,
        cidade: result.localidade,
        uf: result.uf,
        complemento: result.complemento || value.complemento,
      });
      toast.success('Endereço preenchido automaticamente!');
    } else if (cepError) {
      toast.error(cepError);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCepSearch();
    }
  };

  return (
    <div className="space-y-4">
      {/* CEP */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-1 block">
          CEP <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="00000-000"
              value={cepInput}
              onChange={(e) => handleCepChange(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={9}
              disabled={disabled}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleCepSearch}
            disabled={disabled || cepLoading || cepInput.replace(/\D/g, '').length !== 8}
            className="gap-2 shrink-0"
          >
            {cepLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {cepLoading ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>
        {cepError && (
          <p className="text-xs text-destructive mt-1">{cepError}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Digite o CEP e clique em Buscar ou pressione Enter para preencher o endereço automaticamente
        </p>
      </div>

      {/* Logradouro + Número */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label className="text-sm font-medium text-foreground mb-1 block">Rua / Logradouro</Label>
          <Input
            type="text"
            placeholder="Rua, Avenida..."
            value={value.logradouro}
            onChange={(e) => onChange({ ...value, logradouro: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-foreground mb-1 block">
            Número <span className="text-destructive">*</span>
          </Label>
          <Input
            type="text"
            placeholder="Nº"
            value={value.numero}
            onChange={(e) => onChange({ ...value, numero: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Complemento */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-1 block">Complemento</Label>
        <Input
          type="text"
          placeholder="Apto, Bloco, Sala..."
          value={value.complemento}
          onChange={(e) => onChange({ ...value, complemento: e.target.value })}
          disabled={disabled}
        />
      </div>

      {/* Bairro */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-1 block">Bairro</Label>
        <Input
          type="text"
          placeholder="Bairro"
          value={value.bairro}
          onChange={(e) => onChange({ ...value, bairro: e.target.value })}
          disabled={disabled}
        />
      </div>

      {/* Cidade + UF */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label className="text-sm font-medium text-foreground mb-1 block">Cidade</Label>
          <Input
            type="text"
            placeholder="Cidade"
            value={value.cidade}
            onChange={(e) => onChange({ ...value, cidade: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-foreground mb-1 block">UF</Label>
          <Input
            type="text"
            placeholder="SP"
            value={value.uf}
            onChange={(e) => onChange({ ...value, uf: e.target.value.toUpperCase().slice(0, 2) })}
            maxLength={2}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
