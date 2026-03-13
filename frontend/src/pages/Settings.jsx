import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/ui/page-header";
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
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const [initialQrReadable, setInitialQrReadable] = useState(true);
  const [qrReadable, setQrReadable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = useMemo(
    () => qrReadable !== initialQrReadable,
    [qrReadable, initialQrReadable],
  );

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;
    try {
      setIsSaving(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(`${API_BASE_URL}/api/site-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
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
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
        const res = await fetch(`${API_BASE_URL}/api/site-settings`, {
          headers: {
            Accept: "application/json",
          },
        });

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
    </div>
  )
}

export default Settings

