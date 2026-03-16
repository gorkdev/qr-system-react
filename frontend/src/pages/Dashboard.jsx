import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { BarChart3, CheckCircle2, QrCode, XCircle, ArrowRight, Activity, ShieldOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

const today = () => format(new Date(), "yyyy-MM-dd");
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return format(d, "yyyy-MM-dd");
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qrEnabled, setQrEnabled] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const [productsRes, visitsRes, settingsRes] = await Promise.all([
          apiFetch("/api/products?all=1"),
          apiFetch("/api/visits?all=1"),
          apiFetch("/api/site-settings"),
        ]);

        if (!productsRes.ok || !visitsRes.ok) {
          throw new Error("İstatistikler yüklenirken bir hata oluştu.");
        }

        const productsData = await productsRes.json();
        const visitsData = await visitsRes.json();

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setQrEnabled(!!(settingsData?.qr_enabled ?? true));
        }

        setProducts(
          Array.isArray(productsData)
            ? productsData
            : (productsData.data ?? []),
        );
        setVisits(Array.isArray(visitsData) ? visitsData : []);
      } catch (error) {
        console.error(
          "Dashboard istatistikleri yüklenirken hata oluştu",
          error,
        );
        toast("İstatistikler yüklenemedi.", {
          description: "Lütfen sayfayı yenileyip tekrar deneyin.",
        });
      } finally {
        setIsLoading(false);
        // Sayfa gösterildikten sonra arka planda çöp kontrolü (kullanıcı beklemez)
        apiFetch("/api/products/purge-trashed", { method: "POST" }).catch(
          () => { },
        );
      }
    };

    fetchStats();
  }, []);

  const {
    totalProducts,
    productsToday,
    productsLast7,
    productsLast30,
    productsTodayTrend,
    products7Trend,
    products30Trend,
    totalScans,
    scansLast7,
    scansLast30,
    scansTrend7,
    scansTrend30,
    todayScans,
    todayTrend,
  } = useMemo(() => {
    const now = new Date();
    const startToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startToday.getDate() - 1);
    const startLast7 = new Date(startToday);
    startLast7.setDate(startToday.getDate() - 7);
    const startPrev7 = new Date(startLast7);
    startPrev7.setDate(startLast7.getDate() - 7);
    const startLast30 = new Date(startToday);
    startLast30.setDate(startToday.getDate() - 30);
    const startPrev30 = new Date(startLast30);
    startPrev30.setDate(startLast30.getDate() - 30);

    const inRange = (date, from, to) => date >= from && date < to;

    const totalProducts = products.length;

    const productsToday = products.filter((p) => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return d >= startToday;
    }).length;

    const productsYesterday = products.filter((p) => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return inRange(d, startYesterday, startToday);
    }).length;

    const productsLast7 = products.filter((p) => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return d >= startLast7;
    }).length;

    const productsLast30 = products.filter((p) => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return d >= startLast30;
    }).length;

    const productsPrev7 = products.filter((p) => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return inRange(d, startPrev7, startLast7);
    }).length;

    const productsPrev30 = products.filter((p) => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return inRange(d, startPrev30, startLast30);
    }).length;

    const totalScans = visits.length;
    const scansLast7 = visits.filter((v) => {
      if (!v.visited_at) return false;
      const d = new Date(v.visited_at);
      return d >= startLast7;
    }).length;
    const scansPrev7 = visits.filter((v) => {
      if (!v.visited_at) return false;
      const d = new Date(v.visited_at);
      return inRange(d, startPrev7, startLast7);
    }).length;

    const scansLast30 = visits.filter((v) => {
      if (!v.visited_at) return false;
      const d = new Date(v.visited_at);
      return d >= startLast30;
    }).length;
    const scansPrev30 = visits.filter((v) => {
      if (!v.visited_at) return false;
      const d = new Date(v.visited_at);
      return inRange(d, startPrev30, startLast30);
    }).length;

    const todayScans = visits.filter((v) => {
      if (!v.visited_at) return false;
      const d = new Date(v.visited_at);
      return d >= startToday;
    }).length;
    const yesterdayScans = visits.filter((v) => {
      if (!v.visited_at) return false;
      const d = new Date(v.visited_at);
      return inRange(d, startYesterday, startToday);
    }).length;

    const percentChange = (current, previous) => {
      if (previous === 0) {
        if (current === 0) return 0;
        return 100;
      }
      return ((current - previous) / previous) * 100;
    };

    return {
      totalProducts,
      productsToday,
      productsLast7,
      productsLast30,
      totalScans,
      scansLast7,
      scansLast30,
      scansTrend7: percentChange(scansLast7, scansPrev7),
      scansTrend30: percentChange(scansLast30, scansPrev30),
      todayScans,
      todayTrend: percentChange(todayScans, yesterdayScans),
      productsTodayTrend: percentChange(productsToday, productsYesterday),
      products7Trend: percentChange(productsLast7, productsPrev7),
      products30Trend: percentChange(productsLast30, productsPrev30),
    };
  }, [products, visits]);

  const formatTrend = (value) => {
    if (Number.isNaN(value) || value === null || typeof value === "undefined")
      return "0%";
    const rounded = Math.round(value);
    const sign = rounded > 0 ? "+" : "";
    return `${sign}${rounded}%`;
  };

  const scanCards = [
    {
      label: "BUGÜNKÜ TARAMA",
      value: todayScans.toString(),
      trend: formatTrend(todayTrend),
      subtitle: "Düne göre",
      icon: QrCode,
      href: `/ziyaret-gecmisi?start=${today()}&end=${today()}`,
    },
    {
      label: "HAFTALIK TARAMA",
      value: scansLast7.toString(),
      trend: formatTrend(scansTrend7),
      subtitle: "Önceki 7 güne göre",
      icon: QrCode,
      href: `/ziyaret-gecmisi?start=${daysAgo(7)}&end=${today()}`,
    },
    {
      label: "AYLIK TARAMA",
      value: scansLast30.toString(),
      trend: formatTrend(scansTrend30),
      subtitle: "Önceki 30 güne göre",
      icon: QrCode,
      href: `/ziyaret-gecmisi?start=${daysAgo(30)}&end=${today()}`,
    },
    {
      label: "TOPLAM TARAMA",
      value: totalScans.toString(),
      trend: null,
      subtitle: "Toplam tarama sayısı",
      icon: QrCode,
      href: "/ziyaret-gecmisi",
    },
  ];

  const productCards = [
    {
      label: "BUGÜN EKLENEN ÜRÜN",
      value: productsToday.toString(),
      trend: formatTrend(productsTodayTrend),
      subtitle: "Düne göre",
      icon: BarChart3,
      href: `/urunler?start=${today()}&end=${today()}`,
    },
    {
      label: "HAFTALIK YENİ ÜRÜN",
      value: productsLast7.toString(),
      trend: formatTrend(products7Trend),
      subtitle: "Önceki 7 güne göre",
      icon: BarChart3,
      href: `/urunler?start=${daysAgo(7)}&end=${today()}`,
    },
    {
      label: "AYLIK YENİ ÜRÜN",
      value: productsLast30.toString(),
      trend: formatTrend(products30Trend),
      subtitle: "Önceki 30 güne göre",
      icon: BarChart3,
      href: `/urunler?start=${daysAgo(30)}&end=${today()}`,
    },
    {
      label: "TOPLAM ÜRÜN",
      value: totalProducts.toString(),
      trend: null,
      subtitle: "Genel toplam",
      icon: BarChart3,
      href: "/urunler",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Genel"
        description="Sistem durumunu, QR performansını ve temel metrikleri buradan takip edebilirsiniz."
      />

      {qrEnabled === null ? (
        <div className="rounded-xl border px-5 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        </div>
      ) : qrEnabled ? (
          <div className="relative overflow-hidden rounded-xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-teal-50/50">
            <div className="absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-emerald-100/40" />
            <div className="absolute right-6 bottom-0 -mb-6 h-16 w-16 rounded-full bg-teal-100/30" />
            <div className="relative flex items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Activity className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-emerald-900">Sistem aktif</h3>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-emerald-700/80">
                  Tüm QR kodları çalışıyor, taramalar kaydediliyor ve ürün sayfaları erişilebilir durumda.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-red-200/60 bg-gradient-to-r from-red-50 to-orange-50/50">
            <div className="absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-red-100/40" />
            <div className="absolute right-6 bottom-0 -mb-6 h-16 w-16 rounded-full bg-orange-100/30" />
            <div className="relative flex items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <ShieldOff className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-red-900">Sistem duraklatıldı</h3>
                  <span className="inline-flex h-2 w-2 rounded-full bg-red-400" />
                </div>
                <p className="mt-0.5 text-xs text-red-700/80">
                  QR okumaları devre dışı — kullanıcılar ürün sayfalarına erişemiyor ve taramalar kaydedilmiyor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/ayarlar")}
                className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-white hover:text-red-900"
              >
                Yeniden etkinleştir
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      }

      {[scanCards, productCards].map((cards, sectionIdx) => (
        <section
          key={sectionIdx}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {cards.map((card) => (
            <Card
              key={card.label}
              className="cursor-pointer transition-colors hover:bg-muted"
              onClick={() => navigate(card.href)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {card.label}
                </CardTitle>
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {isLoading ? (
                  <>
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-28" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-semibold tracking-tight">
                      {card.value}
                    </div>
                    {typeof card.trend === "string" ? (
                      <CardDescription
                        className={
                          "text-xs " +
                          (parseInt(card.trend, 10) > 0
                            ? "text-emerald-600"
                            : parseInt(card.trend, 10) < 0
                              ? "text-red-500"
                              : "text-yellow-500")
                        }
                      >
                        {card.trend} {card.subtitle}
                      </CardDescription>
                    ) : (
                      <CardDescription className="text-xs text-muted-foreground">
                        {card.subtitle}
                      </CardDescription>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
};

export default Dashboard;
