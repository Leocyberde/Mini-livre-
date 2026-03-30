import { Headphones } from 'lucide-react';

export default function SuporteTab() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
        <Headphones className="w-10 h-10 text-purple-500" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Suporte</h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        Esta seção está em construção. Em breve você poderá falar com nossa equipe de suporte.
      </p>
    </div>
  );
}
