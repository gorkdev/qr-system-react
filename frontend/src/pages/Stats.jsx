import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import PageHeader from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const compactCalendarClassNames = {
  caption_label: "text-xs font-medium select-none",
  weekday: "flex-1 text-[0.65rem] font-normal text-muted-foreground select-none",
  week_number: "text-[0.65rem] text-muted-foreground select-none",
  dropdowns: "flex w-full items-center justify-center gap-1.5 text-xs font-medium",
};

const Stats = () => {
  const [products, setProducts] = useState([]);
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return format(d, "yyyy-MM-dd");
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [productFilter, setProductFilter] = useState("all");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.set("all", "1");
        if (startDate) params.set("start_date", startDate);
        if (endDate) params.set("end_date", endDate);
        const query = `?${params.toString()}`;

        const [productsRes, visitsRes] = await Promise.all([
          apiFetch(`/api/products${query}`),
          apiFetch(`/api/visits${query}`),
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
        console.error("İstatistikler yüklenirken hata oluştu", error);
        toast("İstatistikler yüklenemedi.", {
          description: "Lütfen sayfayı yenileyip tekrar deneyin.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [startDate, endDate]);

  const filteredVisits = useMemo(() => {
    if (productFilter === "all") return visits;
    const id = Number(productFilter);
    return visits.filter((v) => v.product_id === id);
  }, [visits, productFilter]);

  const {
    dailyScans,
    dailyProducts,
    deviceBreakdown,
    countryBreakdown,
  } = useMemo(() => {
    const today = new Date();

    const makeKey = (d) =>
      `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

    // Filtre aralığını belirle (varsayılan: son 30 gün)
    let from = startDate ? new Date(startDate) : null;
    let to = endDate ? new Date(endDate) : null;

    const startOfDay = (d) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (!to) {
      to = startOfDay(today);
    } else {
      to = startOfDay(to);
    }

    if (!from) {
      const d = new Date(to);
      d.setDate(d.getDate() - 29);
      from = startOfDay(d);
    } else {
      from = startOfDay(from);
    }

    if (from > to) {
      const tmp = from;
      from = to;
      to = tmp;
    }

    const dayDiff = Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysBack = Math.min(Math.max(dayDiff + 1, 1), 120); // güvenli sınır

    const scanMap = new Map();
    const productMap = new Map();

    // initialize last N days with zero values so grafik boş kalmaz
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
      const key = makeKey(d);
      scanMap.set(key, { date: d, scans: 0, products: 0 });
      productMap.set(key, { date: d, products: 0, scans: 0 });
    }

    // visits → günlük tarama sayıları
    filteredVisits.forEach((v) => {
      if (!v.visited_at) return;
      const d = new Date(v.visited_at);
      const key = makeKey(d);
      if (scanMap.has(key)) {
        scanMap.get(key).scans += 1;
      }
    });

    // products → günlük yeni ürün sayıları
    products.forEach((p) => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      const key = makeKey(d);
      if (productMap.has(key)) {
        productMap.get(key).products += 1;
      }
    });

    const formatLabel = (d) =>
      d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });

    const dailyScans = Array.from(scanMap.values()).map((entry) => ({
      label: formatLabel(entry.date),
      scans: entry.scans,
    }));

    const dailyProducts = Array.from(productMap.values()).map((entry) => ({
      label: formatLabel(entry.date),
      products: entry.products,
    }));

    const deviceMap = new Map();
    filteredVisits.forEach((v) => {
      const raw = (v.device_type ?? "").toLowerCase();
      const key =
        raw === "mobile"
          ? "Mobil"
          : raw === "tablet"
            ? "Tablet"
            : "Masaüstü";
      deviceMap.set(key, (deviceMap.get(key) || 0) + 1);
    });

    const deviceBreakdown = Array.from(deviceMap.entries()).map(
      ([name, value]) => ({ name, value }),
    );

    const countryMap = new Map();
    filteredVisits.forEach((v) => {
      const country = v.location || "Bilinmiyor";
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    });

    const countrySorted = Array.from(countryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const countryBreakdown = countrySorted;

    return { dailyScans, dailyProducts, deviceBreakdown, countryBreakdown };
  }, [products, filteredVisits, startDate, endDate]);

  const deviceColors = ["#0ea5e9", "#22c55e", "#a855f7"];
  const countryColors = ["#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#10b981"];

  const renderPieLabel = ({ name, value, percent, cx, cy, midAngle, outerRadius }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="#555"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={11}
      >
        {name} {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="İstatistikler"
        description="QR tarama ve ürün ekleme trendlerini detaylı grafiklerle inceleyin."
      />

      <div className="flex flex-wrap items-end justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            {isLoading ? (
              <>
                <div className="h-6 w-12 animate-pulse rounded bg-muted" />
                <div className="mt-1 h-3 w-16 animate-pulse rounded bg-muted" />
              </>
            ) : productFilter === "all" ? (
              <>
                <span className="text-lg font-semibold tracking-tight">{products.length}</span>
                <span className="text-[11px] text-muted-foreground">Toplam ürün</span>
              </>
            ) : (
              <>
                <span className="text-lg font-semibold tracking-tight truncate max-w-[180px]">
                  {products.find((p) => String(p.id) === productFilter)?.title ?? "-"}
                </span>
                <span className="text-[11px] text-muted-foreground">Seçilen ürün</span>
              </>
            )}
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col">
            {isLoading ? (
              <>
                <div className="h-6 w-12 animate-pulse rounded bg-muted" />
                <div className="mt-1 h-3 w-20 animate-pulse rounded bg-muted" />
              </>
            ) : (
              <>
                <span className="text-lg font-semibold tracking-tight">{filteredVisits.length}</span>
                <span className="text-[11px] text-muted-foreground">Toplam tarama</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="h-7 w-[180px] text-[11px] bg-card pl-3 pr-2">
              <div className="flex w-full items-center justify-between gap-1">
                <SelectValue placeholder="Ürün seç" />
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all">Tüm ürünler</SelectItem>
              {products.map((p) => (
                <SelectItem
                  key={p.id}
                  value={String(p.id)}
                  className="max-w-[220px] truncate"
                >
                  <span className="block max-w-[130px] truncate" title={p.title}>
                    {p.title}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 min-w-[140px] justify-start text-[11px] font-normal bg-card"
              >
                <CalendarIcon className="mr-1.5 h-3 w-3" />
                {startDate
                  ? format(new Date(startDate), "dd MMM yyyy", { locale: tr })
                  : "Tarih seç"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                locale={tr}
                classNames={compactCalendarClassNames}
                className="p-2 [&_[data-slot=button]]:text-xs"
                selected={startDate ? new Date(startDate) : undefined}
                onSelect={(day) =>
                  setStartDate(day ? format(day, "yyyy-MM-dd") : startDate)
                }
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 min-w-[140px] justify-start text-[11px] font-normal bg-card"
              >
                <CalendarIcon className="mr-1.5 h-3 w-3" />
                {endDate
                  ? format(new Date(endDate), "dd MMM yyyy", { locale: tr })
                  : "Tarih seç"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                locale={tr}
                classNames={compactCalendarClassNames}
                className="p-2 [&_[data-slot=button]]:text-xs"
                selected={endDate ? new Date(endDate) : undefined}
                onSelect={(day) =>
                  setEndDate(day ? format(day, "yyyy-MM-dd") : endDate)
                }
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>TARAMA TRENDİ</CardTitle>
            <CardDescription>
              Gün bazında QR tarama sayıları.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Grafik yükleniyor...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyScans}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value) => [`${value}`, "Tarama sayısı"]}
                    labelFormatter={(label) => `Tarih: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="scans"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>YENİ ÜRÜNLER</CardTitle>
            <CardDescription>
              Her gün eklenen yeni ürün sayıları.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Grafik yükleniyor...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyProducts}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value) => [`${value}`, "Yeni ürün sayısı"]}
                    labelFormatter={(label) => `Tarih: ${label}`}
                  />
                  <Bar dataKey="products" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CİHAZ DAĞILIMI</CardTitle>
            <CardDescription>
              Tüm ziyaretler için cihaz türüne göre dağılım.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Grafik yükleniyor...
              </div>
            ) : deviceBreakdown.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Henüz ziyaret verisi bulunmuyor.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={deviceBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={renderPieLabel}
                  >
                    {deviceBreakdown.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={deviceColors[index % deviceColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, entry) => [
                      `${value}`,
                      `Cihaz: ${entry?.payload?.name ?? ""}`,
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ÜLKE DAĞILIMI</CardTitle>
            <CardDescription>
              Tüm ziyaretler için ülkeye göre dağılım.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Grafik yükleniyor...
              </div>
            ) : countryBreakdown.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Henüz ziyaret verisi bulunmuyor.
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      dataKey="value"
                      data={countryBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={renderPieLabel}
                    >
                      {countryBreakdown.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={countryColors[index % countryColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, entry) => [
                        `${value}`,
                        `Ülke: ${entry?.payload?.name ?? ""}`,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 pt-1">
                  {countryBreakdown.slice(0, 3).map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: countryColors[index % countryColors.length] }}
                      />
                      {entry.name} ({entry.value})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Stats;

