import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api";

const Settings = () => {
  const [initialQrReadable, setInitialQrReadable] = useState(true);
  const [qrReadable, setQrReadable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const hasChanges = useMemo(
    () => qrReadable !== initialQrReadable,
    [qrReadable, initialQrReadable],
  );

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;
    try {
      setIsSaving(true);
      const res = await apiFetch("/api/site-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ qr_enabled: qrReadable }),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(
          result?.message || "Ayar kaydedilirken bir hata oluştu.",
        );
      }

      const result = await res.json();
      const next = !!result?.data?.qr_enabled ?? !!result?.qr_enabled;
      setInitialQrReadable(next);
      setQrReadable(next);

      toast("Ayar kaydedildi.", {
        description: "QR okunabilirliği ayarı güncellendi.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (isChangingPassword) return;

    if (!currentPassword.trim()) {
      toast("Mevcut şifrenizi girin.");
      return;
    }
    if (newPassword.length < 6) {
      toast("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("Yeni şifreler eşleşmiyor.");
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await apiFetch("/api/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirmation: confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast("Şifre değiştirilemedi.", {
          description: data?.message || "Lütfen bilgilerinizi kontrol edin.",
        });
        return;
      }

      toast("Şifre değiştirildi.", {
        description: "Yeni şifreniz başarıyla kaydedildi.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch {
      toast("Bir hata oluştu.", {
        description: "Lütfen daha sonra tekrar deneyin.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleReset = () => {
    if (!hasChanges || isSaving) return;
    setQrReadable(initialQrReadable);
    toast("Değişiklikler geri alındı.", {
      description: "Ayarlar varsayılan değerlere döndürüldü.",
    });
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const res = await apiFetch("/api/site-settings");

        if (!res.ok) {
          throw new Error("Site ayarları yüklenirken bir hata oluştu.");
        }

        const data = await res.json();
        const enabled = !!(data?.qr_enabled ?? data?.data?.qr_enabled ?? true);
        setInitialQrReadable(enabled);
        setQrReadable(enabled);
      } catch (error) {
        console.error("Site ayarları yüklenemedi", error);
        toast("Site ayarları yüklenemedi.", {
          description: "Lütfen sayfayı yenileyip tekrar deneyin.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ayarlar"
          description="Sistem davranışlarını ve site durumunu buradan yönetebilirsiniz."
        />

        <div className="rounded-lg border bg-card">
          <div className="flex flex-col gap-4 border-b p-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-72 max-w-full" />
              </div>
              <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
            </div>
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-2 h-3 w-full max-w-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t p-6">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b p-6">
            <div className="space-y-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div className="w-full space-y-4 md:w-1/2">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t p-6">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ayarlar"
        description="Sistem davranışlarını ve site durumunu buradan yönetebilirsiniz."
        primaryText={isSaving ? "Kaydediliyor..." : "Değişiklikleri kaydet"}
        secondaryText="Varsayılana dön"
        onPrimaryClick={
          hasChanges && !isSaving && !isLoading ? handleSave : undefined
        }
        onSecondaryClick={
          hasChanges && !isSaving && !isLoading ? handleReset : undefined
        }
      />

      <Card>
        <CardHeader className="border-b">
          <div className="space-y-1">
            <CardTitle>Site durumu</CardTitle>
            <CardDescription>
              QR kodların kullanıcıyı ürün detay sayfasına yönlendirmesini
              kontrol edin.
            </CardDescription>
          </div>
          <CardAction>
            <Badge
              variant={qrReadable ? "default" : "outline"}
              className={
                qrReadable ? "" : "border-destructive/40 text-destructive"
              }
            >
              {qrReadable ? "Aktif" : "Kapalı"}
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">
                QR okunabilirliği
              </p>
              <p className="text-xs text-muted-foreground">
                Kapalıyken QR okutulduğunda ürün detayı yerine “Kapalı” sayfası
                gösterilir.
              </p>
            </div>
            <Switch
              checked={qrReadable}
              onCheckedChange={setQrReadable}
              disabled={isSaving || isLoading}
            />
          </div>

          <div className="rounded-xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Önizleme</p>
            <p className="mt-1">
              {qrReadable
                ? "QR aktif: kullanıcı ürün detay sayfasına yönlendirilir."
                : "QR kapalı: kullanıcı kapalı bilgilendirme sayfasını görür."}
            </p>
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!hasChanges || isSaving || isLoading}
            onClick={handleReset}
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            disabled={!hasChanges || isSaving || isLoading}
            onClick={handleSave}
          >
            {isSaving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div className="space-y-1">
            <CardTitle>Şifre değiştir</CardTitle>
            <CardDescription>
              Hesap güvenliğiniz için şifrenizi düzenli aralıklarla değiştirin.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="w-full space-y-4 md:w-1/2">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Mevcut şifre</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10 bg-card"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">Yeni şifre</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10 bg-card"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">En az 6 karakter olmalıdır.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Yeni şifre (tekrar)</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10 bg-card"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isChangingPassword || (!currentPassword && !newPassword && !confirmPassword)}
            onClick={() => {
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setShowCurrentPassword(false);
              setShowNewPassword(false);
              setShowConfirmPassword(false);
            }}
          >
            Temizle
          </Button>
          <Button
            type="button"
            disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
            onClick={handleChangePassword}
          >
            {isChangingPassword ? "Kaydediliyor..." : "Şifreyi değiştir"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default Settings

