import { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCcw, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const PAGE_SIZE = 10;

const Trash = () => {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [restoringId, setRestoringId] = useState(null);
  const [productToRestore, setProductToRestore] = useState(null);
  const searchTimerRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const getStorageUrl = (path) =>
    path ? `${API_BASE_URL}/storage/${path}` : null;

  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchTrashed = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("per_page", String(PAGE_SIZE));
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await apiFetch(`/api/products/trashed?${params.toString()}`);
      if (!res.ok) throw new Error("Çöp kutusu yüklenirken bir hata oluştu.");

      const json = await res.json();
      setProducts(json.data ?? []);
      setTotal(json.total ?? 0);
      setLastPage(json.last_page ?? 1);
    } catch (err) {
      console.error("Çöp kutusu yüklenirken hata oluştu", err);
      toast("Çöp kutusu yüklenemedi.", {
        description: "Lütfen sayfayı yenileyip tekrar deneyin.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    // Önce liste yüklensin; ardından arka planda purge, bittikten sonra listeyi yenile
    let cancelled = false;
    apiFetch("/api/products/purge-trashed", { method: "POST" })
      .then(() => {
        if (!cancelled) fetchTrashed();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const getDaysLeft = (deletedAt) => {
    if (!deletedAt) return 0;
    const d = new Date(deletedAt);
    return Math.max(0, 30 - Math.floor((Date.now() - d.getTime()) / 86400000));
  };

  const handleRestoreClick = (product) => {
    setProductToRestore(product);
  };

  const handleRestoreConfirm = async () => {
    if (!productToRestore || restoringId) return;
    const product = productToRestore;
    setProductToRestore(null);
    try {
      setRestoringId(product.id);
      const res = await apiFetch(`/api/products/${product.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast("Ürün geri getirilemedi.", {
          description: result?.message || "Lütfen daha sonra tekrar deneyin.",
        });
        return;
      }

      toast("Ürün geri getirildi.", {
        description: "Ürün tekrar aktif listede görünecektir.",
      });
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      console.error("Ürün geri getirilirken hata oluştu", err);
      toast("Bir hata oluştu.", {
        description: "Lütfen daha sonra tekrar deneyin.",
      });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Çöp kutusu"
        description="Silinen ürünler 30 gün boyunca burada tutulur. Süre dolmadan geri getirebilirsiniz."
      />

      <div className="rounded-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            {isLoading ? (
              <Skeleton className="h-3 w-44" />
            ) : (
              <p className="text-xs text-muted-foreground">
                Toplam {total} ürün çöp kutusunda.
              </p>
            )}
          </div>
          <div className="flex w-full max-w-xs">
            <Input
              placeholder="Ürün ara"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs bg-card"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px]">Görsel</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead className="hidden md:table-cell">
                  Silinme tarihi
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  Kalan süre
                </TableHead>
                <TableHead className="hidden lg:table-cell">Ziyaret</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-14 w-14 rounded-md" />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-3 w-28 md:hidden" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-3 w-28" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-3 w-12" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-8 w-24 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <SearchX className="h-5 w-5" />
                      <p className="text-sm">
                        {debouncedSearch
                          ? "Arama kriterlerinize uygun ürün bulunamadı."
                          : "Çöp kutusu boş."}
                      </p>
                      {!debouncedSearch && (
                        <p className="text-xs">
                          Silinen ürünler burada listelenir.
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const daysLeft = getDaysLeft(product.deleted_at);
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.cover_image_path ? (
                          <img
                            src={getStorageUrl(product.cover_image_path)}
                            alt={product.title}
                            className="h-14 w-14 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted">
                            <Trash2 className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">
                            {product.title}
                          </span>
                          <span className="line-clamp-1 text-[11px] text-muted-foreground md:hidden">
                            {formatDate(product.deleted_at)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {formatDate(product.deleted_at)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            daysLeft <= 3
                              ? "bg-destructive/10 text-destructive"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {daysLeft > 0 ? `${daysLeft} gün kaldı` : "Yakında silinecek"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {product.visits_count ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleRestoreClick(product)}
                            disabled={restoringId === product.id}
                            className="gap-1"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {restoringId === product.id
                              ? "Geri getiriliyor..."
                              : "Geri getir"}
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
              onClick={() =>
                setCurrentPage((p) => Math.min(lastPage, p + 1))
              }
              className="inline-flex h-7 items-center rounded-md border bg-background px-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>

      <Dialog
        open={!!productToRestore}
        onOpenChange={(open) => !open && setProductToRestore(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ürünü geri getirmek istiyor musunuz?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {productToRestore && (
              <>
                <strong>{productToRestore.title}</strong> ürünü çöp kutusundan
                çıkarılıp tekrar aktif ürünler listesine eklenecektir.
              </>
            )}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProductToRestore(null)}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRestoreConfirm}
              disabled={restoringId !== null}
              className="gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Evet, geri getir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Trash;
