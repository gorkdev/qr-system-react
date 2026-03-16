import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 10;

const ACTION_LABELS = {
  login: "Giriş",
  logout: "Çıkış",
  password_changed: "Şifre değiştirildi",
  product_created: "Ürün oluşturuldu",
  product_updated: "Ürün güncellendi",
  product_deleted: "Ürün silindi (çöp kutusu)",
  product_restored: "Ürün geri getirildi",
  products_purged: "Çöp kutusu temizlendi",
  site_settings_updated: "Site ayarları değişti",
};

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("per_page", String(PAGE_SIZE));
        if (search) {
          params.set("search", search);
        }

        const res = await apiFetch(`/api/activity-logs?${params.toString()}`);
        if (!res.ok) {
          throw new Error("İşlem geçmişi yüklenemedi.");
        }
        const data = await res.json();

        setLogs(Array.isArray(data.data) ? data.data : []);
        setPage(data.current_page ?? 1);
        setLastPage(data.last_page ?? 1);
        setTotal(data.total ?? 0);
      } catch (error) {
        console.error("İşlem geçmişi yüklenirken hata oluştu", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [page, search]);

  const handleClearFilters = () => {
    setSearch("");
    setSearchInput("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="İşlem geçmişi"
        description="Panelde yapılan işlemlerin kaydını görüntüleyin."
      />

      <div className="rounded-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            {isLoading ? (
              <div className="h-3 w-44 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-xs text-muted-foreground">
                Toplam {total} işlem kaydı bulundu.
              </p>
            )}
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 md:gap-3">
            <div className="hidden w-full max-w-xs md:block">
              <Input
                placeholder="Açıklamada ara"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-8 text-xs bg-card"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Tarih</TableHead>
                <TableHead className="w-[140px]">Kullanıcı</TableHead>
                <TableHead className="w-[180px]">İşlem</TableHead>
                <TableHead>Açıklama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: PAGE_SIZE }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-64 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-xs text-muted-foreground"
                  >
                    Henüz işlem kaydı bulunmuyor.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="align-top text-xs text-muted-foreground">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell className="align-top text-xs">
                      {log.user ? "Admin" : "Sistem"}
                    </TableCell>
                    <TableCell className="align-top text-xs">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </TableCell>
                    <TableCell className="align-top text-xs text-muted-foreground max-w-md">
                      <span className="block truncate" title={log.description || "-"}>
                        {log.description || "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && lastPage > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-7 items-center rounded-md border bg-background px-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Önceki
            </button>
            <span>
              Sayfa {page} / {lastPage}
            </span>
            <button
              type="button"
              disabled={page === lastPage}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
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

export default ActivityLog;

