import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { ChevronDown, Pencil, QrCode, SearchX } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 10;

const normalizeText = (value) =>
  (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

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
      dotsOptions: {
        color: "#000000",
        type: "rounded",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
    });

    containerRef.current.innerHTML = "";
    qrCode.append(containerRef.current);
    rendered = true;

    // Eğer render 1 saniyeden uzun sürerse skeleton göster
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

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${API_BASE_URL}/api/products`, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Ürünler yüklenirken bir hata oluştu.");
        }

        const data = await response.json();
        setProducts(Array.isArray(data) ? data : (data.data ?? []));
      } catch (error) {
        console.error("Ürünler yüklenirken hata oluştu", error);
        toast("Ürünler yüklenemedi.", {
          description: "Lütfen sayfayı yenileyip tekrar deneyin.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const getQrUrl = (qrImagePath) => {
    if (!qrImagePath) return null;
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    return `${API_BASE_URL}/storage/${qrImagePath}`;
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
        dotsOptions: {
          color: "#000000",
          type: "rounded",
        },
        backgroundOptions: {
          color: "#ffffff",
        },
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

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !search.trim() ||
        normalizeText(product.title).includes(normalizeText(search)) ||
        normalizeText(product.description).includes(normalizeText(search));

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? product.is_active
            : !product.is_active;

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );

  const currentPageProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    // Arama veya filtre değiştiğinde ilk sayfaya dön
    setCurrentPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ürünler"
        description="Sistemde kayıtlı tüm ürünleri, durumlarını ve QR kodlarını buradan yönetebilirsiniz."
        primaryText="Yeni ürün"
        secondaryText="Filtreler"
        onPrimaryClick={() => navigate("/yeni-urun")}
        onSecondaryClick={() => {
          setSearch("");
          setStatusFilter("all");
        }}
      />

      <div className="rounded-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            {isLoading ? (
              <div className="h-3 w-44 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-xs text-muted-foreground">
                Toplam {filteredProducts.length} ürün bulundu.
              </p>
            )}
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 md:gap-3">
            <div className="hidden w-full max-w-xs md:block">
              <Input
                placeholder="Ürün başlığı veya açıklama ara"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs bg-card"
              />
            </div>
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
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <SearchX className="h-5 w-5" />
                      <p className="text-sm">Arama kriterlerinize uygun ürün bulunamadı.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentPageProducts.map((product) => {
                  const qrUrl = getQrUrl(product.qr_image_path);
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
                          <span className="text-[11px] text-muted-foreground md:hidden">
                            {product.description?.slice(0, 60)}
                            {product.description &&
                              product.description.length > 60
                              ? "..."
                              : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-md">
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {product.description}
                        </span>
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
                        {product.created_at
                          ? new Date(product.created_at).toLocaleDateString(
                            "tr-TR",
                            {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            },
                          )
                          : "-"}
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

        {!isLoading && filteredProducts.length > PAGE_SIZE && (
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
              Sayfa {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
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
