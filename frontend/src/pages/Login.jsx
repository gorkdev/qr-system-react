import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { login: setToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast("Lütfen tüm alanları doldurun.");
      return;
    }

    try {
      setIsLoading(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast("Giriş başarısız.", {
          description: data?.message || "E-posta veya şifre hatalı.",
        });
        return;
      }

      setToken(data.token);
      navigate("/genel");
    } catch {
      toast("Sunucuya bağlanılamadı.", {
        description:
          "Lütfen internet bağlantınızı ve sunucu durumunu kontrol edin.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-dvh bg-background">
      {/* Sol panel */}
      <div className="hidden w-1/2 items-center justify-center bg-foreground lg:flex">
        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-bold tracking-[0.3em] text-background">
            AKCAN GROUP
          </h1>
          <div className="h-px w-16 mx-auto bg-background/20" />
          <p className="text-xs tracking-widest text-background/40">
            QR YÖNETİM PANELİ
          </p>
        </div>
      </div>

      {/* Sag panel - Form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <h1 className="text-sm font-semibold tracking-[0.2em] text-foreground">
              AKCAN GROUP
            </h1>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight">Giriş yap</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Panele erişmek için giriş yapın.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@akcangrup.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Şifremi unuttum
              </button>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Giriş yapılıyor..." : "Giriş yap"}
            </Button>
          </form>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Şifre sıfırlama</DialogTitle>
            <DialogDescription>
              Yeni şifreniz aşağıdaki e-posta adresine gönderilecektir.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-[11px] text-muted-foreground">
              Gönderilecek adres
            </p>
            <p className="mt-0.5 text-sm font-medium">akcangroup@gmail.com</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setForgotOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setForgotOpen(false);
                toast("Şifre sıfırlama bağlantısı gönderildi.", {
                  description: "Lütfen e-posta kutunuzu kontrol edin.",
                });
              }}
            >
              Şifreyi sıfırla
            </Button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            E-posta adresinize erişiminiz yoksa{" "}
            <a
              href="https://clicktopeak.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              bize ulaşın
            </a>
            .
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
