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

  const { totalQr, qrTrend, totalScans, scansTrend7, todayScans, todayTrend } =
    useMemo(() => {
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

      const inRange = (date, from, to) => date >= from && date < to;

      const totalQr = products.length;
      const qrLast7 = products.filter((p) => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        return d >= startLast7;
      }).length;
      const qrPrev7 = products.filter((p) => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        return inRange(d, startPrev7, startLast7);
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
        totalQr,
        qrTrend: percentChange(qrLast7, qrPrev7),
        totalScans,
        scansTrend7: percentChange(scansLast7, scansPrev7),
        todayScans,
        todayTrend: percentChange(todayScans, yesterdayScans),
      };
    }, [products, visits]);

  const formatTrend = (value) => {
    if (Number.isNaN(value) || value === null || typeof value === "undefined")
      return "0%";
    const rounded = Math.round(value);
    const sign = rounded > 0 ? "+" : "";
    return `${sign}${rounded}%`;
  };

  const statCards = [
    {
      label: "Toplam QR",
      value: isLoading ? "—" : totalQr.toString(),
      trend: formatTrend(qrTrend),
      subtitle: "Son 7 güne göre",
      icon: QrCode,
    },
    {
      label: "Toplam tarama",
      value: isLoading ? "—" : totalScans.toString(),
      trend: formatTrend(scansTrend7),
      subtitle: "Son 7 güne göre",
      icon: QrCode,
    },
    {
      label: "Bugünkü tarama",
      value: isLoading ? "—" : todayScans.toString(),
      trend: formatTrend(todayTrend),
      subtitle: "Düne göre",
      icon: QrCode,
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

      <section className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => (
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
              <CardDescription className="text-xs text-emerald-600">
                {card.trend} {card.subtitle}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
};

export default Dashboard;
