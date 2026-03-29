import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-4xl font-display font-bold text-foreground mb-2">404</h1>
        <p className="text-xl text-muted-foreground mb-8">Página não encontrada</p>
        <Link href="/">
          <Button className="bg-primary hover:bg-primary/90 text-white">
            Voltar para Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
