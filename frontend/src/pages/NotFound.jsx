import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div>
        <p className="text-xs font-semibold tracking-widest text-primary/70">
          HATA 404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Sayfa bulunamadı
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Ulaşmaya çalıştığınız sayfa mevcut değil veya adresi değişmiş olabilir.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild size="sm">
          <Link to="/genel">Kontrol paneline dön</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/">Ana sayfaya git</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;

