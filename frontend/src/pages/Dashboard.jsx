import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BarChart3, QrCode, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { toast } from "sonner";

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

        const [productsRes, visitsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/products`, {
            headers: { Accept: "application/json" },
          }),
          fetch(`${API_BASE_URL}/api/visits`, {
            headers: { Accept: "application/json" },
          }),
        ]);

        if (!productsRes.ok || !visitsRes.ok) {
          throw new Error("İstatistikler yüklenirken bir hata oluştu.");
        }

        const productsData = await productsRes.json();
        const visitsData = await visitsRes.json();

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
      value: isLoading ? "—" : todayScans.toString(),
      trend: formatTrend(todayTrend),
      subtitle: "Düne göre",
      icon: QrCode,
    },
    {
      label: "HAFTALIK TARAMA",
      value: isLoading ? "—" : scansLast7.toString(),
      trend: formatTrend(scansTrend7),
      subtitle: "Önceki 7 güne göre",
      icon: QrCode,
    },
    {
      label: "AYLIK TARAMA",
      value: isLoading ? "—" : scansLast30.toString(),
      trend: formatTrend(scansTrend30),
      subtitle: "Önceki 30 güne göre",
      icon: QrCode,
    },
    {
      label: "TOPLAM TARAMA",
      value: isLoading ? "—" : totalScans.toString(),
      trend: null,
      subtitle: "Toplam tarama sayısı",
      icon: QrCode,
    },
  ];

  const productCards = [
    {
      label: "BUGÜN EKLENEN ÜRÜN",
      value: isLoading ? "—" : productsToday.toString(),
      trend: formatTrend(productsTodayTrend),
      subtitle: "Düne göre",
      icon: BarChart3,
    },
    {
      label: "HAFTALIK YENİ ÜRÜN",
      value: isLoading ? "—" : productsLast7.toString(),
      trend: formatTrend(products7Trend),
      subtitle: "Önceki 7 güne göre",
      icon: BarChart3,
    },
    {
      label: "AYLIK YENİ ÜRÜN",
      value: isLoading ? "—" : productsLast30.toString(),
      trend: formatTrend(products30Trend),
      subtitle: "Önceki 30 güne göre",
      icon: BarChart3,
    },
    {
      label: "TOPLAM ÜRÜN",
      value: isLoading ? "—" : totalProducts.toString(),
      trend: null,
      subtitle: "Genel toplam",
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Genel"
        description="Sistem durumunu, QR performansını ve temel metrikleri buradan takip edebilirsin."
        primaryText={
          <span className="flex items-center gap-1.5">
            Yeni QR oluştur
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        }
        secondaryText="Raporları dışa aktar"
        onPrimaryClick={() => console.log("Yeni QR oluştur")}
        onSecondaryClick={() => console.log("Raporları dışa aktar")}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {scanCards.map((card) => (
          <Card key={card.label} className="transition-colors hover:bg-muted">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {card.label}
              </CardTitle>
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
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
                      : "text-muted-foreground")
                  }
                >
                  {card.trend} {card.subtitle}
                </CardDescription>
              ) : (
                <CardDescription className="text-xs text-muted-foreground">
                  {card.subtitle}
                </CardDescription>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {productCards.map((card) => (
          <Card key={card.label} className="transition-colors hover:bg-muted">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {card.label}
              </CardTitle>
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
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
                      : "text-muted-foreground")
                  }
                >
                  {card.trend} {card.subtitle}
                </CardDescription>
              ) : (
                <CardDescription className="text-xs text-muted-foreground">
                  {card.subtitle}
                </CardDescription>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
};

export default Dashboard;
