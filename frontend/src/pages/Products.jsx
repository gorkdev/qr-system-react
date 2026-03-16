import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import PageHeader from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import QRCodeStyling from "qr-code-styling";
import {
  CalendarIcon,
  ChevronDown,
  Pencil,
  QrCode,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const compactCalendarClassNames = {
  caption_label: "text-xs font-medium select-none",
  weekday:
    "flex-1 text-[0.65rem] font-normal text-muted-foreground select-none",
  week_number: "text-[0.65rem] text-muted-foreground select-none",
  dropdowns:
    "flex w-full items-center justify-center gap-1.5 text-xs font-medium",
};

const PAGE_SIZE = 10;

const QrPreview = ({ token }) => {
  const containerRef = useRef(null);
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!token || !containerRef.current) return;

    let rendered = false;

    const qrData = `${window.location.origin}/qr/${token}`;

    const qrCode = new QRCodeStyling({
      width: 256,
      height: 256,
      type: "canvas",
      data: qrData,
      image: "/logo.png",
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 4,
        imageSize: 0.35,
      },
      dotsOptions: {
        color: "#000000",
        type: "rounded",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      qrOptions: {
        errorCorrectionLevel: "H",
      },
    });

    containerRef.current.innerHTML = "";
    qrCode.append(containerRef.current);
    rendered = true;

    const timeoutId = window.setTimeout(() => {
      if (!rendered) setShowSkeleton(true);
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [token]);

  return (
    <div className="inline-flex min-h-[180px] min-w-[180px] items-center justify-center">
      {showSkeleton && (
        <div className="h-24 w-24 animate-pulse rounded-xl bg-muted" />
      )}
      <div ref={containerRef} />
    </div>
  );
};

const defaultStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return format(d, "yyyy-MM-dd");
};
const defaultEnd = () => format(new Date(), "yyyy-MM-dd");

const Products = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState(
    () => searchParams.get("start") || defaultStart(),
  );
  const [endDate, setEndDate] = useState(
    () => searchParams.get("end") || defaultEnd(),
  );
  const [currentPage, setCurrentPage] = useState(1);

  const searchTimerRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input (400ms)
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

  // Filtre değişince sayfayı 1'e sıfırla
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, startDate, endDate]);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("per_page", String(PAGE_SIZE));
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await apiFetch(`/api/products?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Ürünler yüklenirken bir hata oluştu.");
      }

      const json = await response.json();
      setProducts(json.data ?? []);
      setTotal(json.total ?? 0);
      setLastPage(json.last_page ?? 1);
    } catch (error) {
      console.error("Ürünler yüklenirken hata oluştu", error);
      toast("Ürünler yüklenemedi.", {
        description: "Lütfen sayfayı yenileyip tekrar deneyin.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, startDate, endDate, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const slugify = (value) => {
    if (!value) return "";
    return value
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const getCoverUrl = (coverImagePath) => {
    if (!coverImagePath) return null;
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    return `${API_BASE_URL}/storage/${coverImagePath}`;
  };

  const handleDownloadQr = async (product) => {
    if (!product.qr_token) {
      toast("QR indirilemedi.", {
        description: "Bu ürün için QR token bulunamadı.",
      });
      return;
    }

    try {
      const qrData = `${window.location.origin}/qr/${product.qr_token}`;
      const slug = slugify(product.title);

      const qrCode = new QRCodeStyling({
        width: 600,
        height: 600,
        type: "png",
        data: qrData,
        image: "/logo.png",
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 6,
          imageSize: 0.35,
        },
        dotsOptions: { color: "#000000", type: "rounded" },
        backgroundOptions: { color: "#ffffff" },
        qrOptions: { errorCorrectionLevel: "H" },
      });

      await qrCode.download({
        name: `${slug || "urun"}-qr-${product.id}`,
        extension: "png",
      });
    } catch (error) {
      console.error("QR indirilirken hata oluştu", error);
      toast("QR indirilemedi.", {
        description: "Lütfen daha sonra tekrar deneyin.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ürünler"
        description="Sistemde kayıtlı tüm ürünleri, durumlarını ve QR kodlarını buradan yönetebilirsiniz."
      />

      <div className="rounded-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            {isLoading ? (
              <div className="h-3 w-44 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-xs text-muted-foreground">
                Toplam {total} ürün bulundu.
              </p>
            )}
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 md:gap-3">
            <div className="hidden w-full max-w-xs md:block">
              <Input
                placeholder="Ürün başlığı veya açıklama ara"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs bg-card"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 min-w-[130px] justify-start text-[11px] font-normal bg-card"
                >
                  <CalendarIcon className="mr-1.5 h-3 w-3" />
                  {startDate
                    ? format(new Date(startDate), "dd MMM yyyy", { locale: tr })
                    : "Başlangıç"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  locale={tr}
                  classNames={compactCalendarClassNames}
                  className="p-2 [&_[data-slot=button]]:text-xs"
                  selected={startDate ? new Date(startDate) : undefined}
                  onSelect={(day) =>
                    setStartDate(day ? format(day, "yyyy-MM-dd") : "")
                  }
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 min-w-[130px] justify-start text-[11px] font-normal bg-card"
                >
                  <CalendarIcon className="mr-1.5 h-3 w-3" />
                  {endDate
                    ? format(new Date(endDate), "dd MMM yyyy", { locale: tr })
                    : "Bitiş"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  locale={tr}
                  classNames={compactCalendarClassNames}
                  className="p-2 [&_[data-slot=button]]:text-xs"
                  selected={endDate ? new Date(endDate) : undefined}
                  onSelect={(day) =>
                    setEndDate(day ? format(day, "yyyy-MM-dd") : "")
                  }
                />
              </PopoverContent>
            </Popover>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs bg-card pl-3 pr-2">
                <div className="flex w-full items-center justify-between gap-1">
                  <SelectValue placeholder="Durum" />
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Kapak</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead className="hidden md:table-cell">Açıklama</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Oluşturulma
                </TableHead>
                <TableHead className="hidden lg:table-cell text-center">
                  Ziyaret
                </TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: PAGE_SIZE }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="h-10 w-16 animate-pulse rounded-md bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="h-3 w-64 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="mx-auto h-3 w-10 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
                        <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <SearchX className="h-5 w-5" />
                      <p className="text-sm">
                        Arama kriterlerinize uygun ürün bulunamadı.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const coverUrl = getCoverUrl(product.cover_image_path);
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        {coverUrl ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <button
                                type="button"
                                className="h-10 w-16 overflow-hidden rounded-md border bg-muted hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <img
                                  src={coverUrl}
                                  alt={product.title}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl">
                              <DialogHeader>
                                <DialogTitle>Kapak görseli</DialogTitle>
                              </DialogHeader>
                              <div className="mt-2 flex items-center justify-center">
                                <img
                                  src={coverUrl}
                                  alt={product.title}
                                  className="max-h-[420px] max-w-full rounded-md bg-muted"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Yok
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">
                            {product.title}
                          </span>
                          <div
                            className="line-clamp-1 text-[11px] text-muted-foreground md:hidden [&>*]:inline"
                            dangerouslySetInnerHTML={{
                              __html: product.description,
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-md">
                        <div
                          className="truncate text-xs text-muted-foreground [&>*]:inline [&_br]:hidden [&_ul]:inline [&_ol]:inline [&_li]:inline [&_li]:list-none [&_li]:mr-1 [&_blockquote]:inline [&_h2]:inline [&_h2]:text-xs [&_h2]:font-semibold [&_p]:inline"
                          dangerouslySetInnerHTML={{
                            __html: product.description,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.is_active ? "default" : "outline"}
                          className={
                            product.is_active
                              ? ""
                              : "border-destructive/40 text-destructive"
                          }
                        >
                          {product.is_active ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {formatDate(product.created_at)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center text-xs text-muted-foreground">
                        {typeof product.visits_count === "number"
                          ? product.visits_count
                          : 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {product.qr_token ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                >
                                  <QrCode className="h-4 w-4" />
                                  <span className="sr-only">QR kodunu gör</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-sm">
                                <DialogHeader>
                                  <DialogTitle>QR kodu</DialogTitle>
                                </DialogHeader>
                                <div className="mt-2 flex items-center justify-center">
                                  <QrPreview token={product.qr_token} />
                                </div>
                                <div className="flex justify-center">
                                  <Button
                                    type="button"
                                    size="lg"
                                    onClick={() => handleDownloadQr(product)}
                                  >
                                    QR&apos;ı indir
                                  </Button>
                                </div>
                                <div className="mt-0 space-y-2">
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium text-foreground">
                                      Ürün bağlantısı
                                    </p>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                      {(() => {
                                        const fullUrl = `${window.location.origin}/qr/${product.qr_token}`;
                                        const shortUrl =
                                          fullUrl.length > 40
                                            ? `${fullUrl.slice(0, 40)}...`
                                            : fullUrl;
                                        return (
                                          <div
                                            className="flex-1 rounded-md border bg-muted/60 px-2 py-1.5 text-[12px] text-muted-foreground"
                                            title={fullUrl}
                                          >
                                            {shortUrl}
                                          </div>
                                        );
                                      })()}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                          try {
                                            await navigator.clipboard.writeText(
                                              `${window.location.origin}/qr/${product.qr_token}`,
                                            );
                                            toast("Bağlantı kopyalandı.", {
                                              description:
                                                "Ürün bağlantısı panoya kopyalandı.",
                                            });
                                          } catch {
                                            toast("Kopyalanamadı.", {
                                              description:
                                                "Lütfen bağlantıyı elle kopyalayın.",
                                            });
                                          }
                                        }}
                                      >
                                        Kopyala
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              QR yok
                            </span>
                          )}

                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => {
                              const slug = slugify(product.title);
                              navigate(
                                `/urun-duzenle/${slug || "urun"}-${product.id}`,
                              );
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Ürünü düzenle</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && lastPage > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-7 items-center rounded-md border bg-background px-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Önceki
            </button>
            <span>
              Sayfa {currentPage} / {lastPage}
            </span>
            <button
              type="button"
              disabled={currentPage === lastPage}
              onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
              className="inline-flex h-7 items-center rounded-md border bg-background px-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
