import { useEffect, useMemo, useState } from "react";
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
import { QrCode } from "lucide-react";
import { toast } from "sonner";

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
      const qrData = `${window.location.origin}/p/${product.qr_token}`;

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
        product.title?.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? product.is_active
            : !product.is_active;

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

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
            <p className="text-xs text-muted-foreground">
              Toplam {filteredProducts.length} ürün listeleniyor.
            </p>
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
              <SelectTrigger className="h-8 w-[130px] text-xs bg-card">
                <SelectValue placeholder="Durum" />
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
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm">
                    Ürünler yükleniyor...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm">
                    Henüz kayıtlı ürün bulunmuyor.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
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
                                  className="max-h-[420px] max-w-full rounded-md border bg-muted"
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
                        {qrUrl ? (
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
                                <img
                                  src={qrUrl}
                                  alt={`${product.title} QR kodu`}
                                  className="max-h-64 max-w-full rounded-md border bg-muted p-2"
                                />
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
                                      const fullUrl = `${window.location.origin}/p/${product.qr_token}`;
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
                                            `${window.location.origin}/p/${product.qr_token}`,
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
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Products;
