# Ürün Soft-Delete (Çöp Kutusu) Mantığı

Bu doküman, ürünlerin 30 günlük çöp kutusu akışının nasıl çalıştığını ve backend/frontend karşılıklarını özetler.

---

## 1. Genel mantık

1. **Sil (çöp kutusuna taşı)**  
   “Ürünü sil” ile ürün veritabanından fiziksel silinmez; `deleted_at` doldurulur (soft delete). Ürün normal listeden çıkar; public QR linki artık ürünü göstermez (inaktif/çöp durumu).

2. **30 gün süre**  
   Silinen ürünler `deleted_at` ile işaretlidir. Bu tarihten itibaren 30 gün boyunca “çöp kutusunda” kabul edilir.

3. **Geri getir**  
   Kullanıcı 30 gün içinde ürünü geri getirebilir. `deleted_at` temizlenir; ürün tekrar normal listede ve QR ile erişilebilir olur.

4. **Kalıcı silme (purge)**  
   30 gün dolan çöp kutusu kayıtları kalıcı silinir; ilgili storage dosyaları (kapak, alt görseller, PDF, QR) da kaldırılır. Bu işlem hem API üzerinden (purge-trashed) hem de isteğe bağlı zamanlanmış komutla yapılabilir.

---

## 2. Backend

### 2.1. Veritabanı

- **Migration:** `products` tablosunda `deleted_at` (nullable timestamp).
- Laravel `SoftDeletes` trait’i bu alanı kullanır; normal sorgular `deleted_at = null` olanları getirir.

### 2.2. Model (Product)

- `Illuminate\Database\Eloquent\SoftDeletes` trait kullanılır.
- Normal liste: `Product::...` (silinmemişler).
- Çöp kutusu: `Product::onlyTrashed()`.
- Düzenleme için (çöp + normal): `Product::withTrashed()`.
- Kalıcı silmede storage temizliği: model `forceDeleting` event’inde klasör silinir.

### 2.3. API uçları (hepsi `auth:sanctum` korumalı)

| Metot  | URL | Açıklama |
|--------|-----|----------|
| DELETE | `DELETE /api/products/{id}` | Ürünü soft delete (çöp kutusuna taşır). |
| POST   | `POST /api/products/{id}/restore` | Ürünü geri getirir (`deleted_at` null). |
| GET    | `GET /api/products/trashed` | Sadece çöp kutusundaki ürünleri sayfalanmış döner. |
| POST   | `POST /api/products/purge-trashed` | 30 günden eski çöp kayıtlarını kalıcı siler ve storage’ı temizler. |

- **GET /api/products:** Sadece silinmemiş ürünler (SoftDeletes varsayılan scope).
- **GET /api/products/{id}:** Düzenleme için `withTrashed()` ile çekilir; response’ta `deleted_at` vardır; frontend “Geri getir” gösterir.
- **GET /api/products/token/{token}:** Sadece silinmemiş ve aktif ürünler public erişime açılır (mevcut controller mantığı).

### 2.4. ProductController

- **destroy($id):** Normal ürünü bulur, `$product->delete()` (soft delete). 422 dönmez; çöp kutusundaki ürünü tekrar silmek farklı bir senaryodur (gerekirse ayrıca ele alınır).
- **restore($id):** `Product::onlyTrashed()->findOrFail($id)`, sonra `$product->restore()`.
- **trashed():** `GET /api/products/trashed` — `onlyTrashed()`, isteğe bağlı arama, sayfalama (per_page, max 100).
- **purgeTrashed():** `POST /api/products/purge-trashed` — `deleted_at < now()->subDays(30)` olanları bulur, her biri için storage klasörünü siler ve `forceDelete()` çağırır. Response’ta `purged_count` ve mesaj döner.
- **show($id):** Düzenleme sayfası için `Product::withTrashed()->findOrFail($id)`; response’ta `deleted_at` alanı vardır.

### 2.5. Zamanlanmış görev (isteğe bağlı)

- **Artisan command:** Örn. `product:purge-trashed` (veya controller’daki purge mantığını kullanan bir command).
- **Zamanlama:** `routes/console.php` içinde örn. `Schedule::command('product:purge-trashed')->daily()`.
- Sunucuda cron: `* * * * * php /path/to/artisan schedule:run`

Frontend’de çöp kutusu sayfası açıldığında `POST /api/products/purge-trashed` çağrılarak da 30 günden eski kayıtlar temizlenebilir; böylece hem manuel hem zamanlanmış purge desteklenir.

---

## 3. Frontend

- **Ürün düzenle – “Ürünü sil”:** Onay modali sonrası `DELETE /api/products/{id}`. Başarıda ürünler listesine yönlendirme, toast: “Ürün çöp kutusuna taşındı. 30 gün içinde geri getirebilirsiniz.”
- **Çöp kutusu sayfası (`/cop-kutusu`):** `GET /api/products/trashed` ile liste. Satırda “Geri getir” → `POST /api/products/{id}/restore`. İsteğe bağlı “Eski kayıtları temizle” / purge butonu → `POST /api/products/purge-trashed`.
- **Düzenleme sayfasında çöp kutusundaki ürün:** “Bu ürün çöp kutusunda” mesajı + “Geri getir” butonu → `POST /api/products/{id}/restore`; ardından sayfa/veri güncellenir.
- **30 gün sonrası:** Backend’de purge (API veya cron) ile kalıcı silme; frontend’de ek işlem gerekmez.

---

## 4. Özet tablo

| Adım | Backend | Frontend |
|------|---------|----------|
| Sil | Model: `SoftDeletes`; Controller: `destroy()` soft delete | DELETE, yönlendirme, toast |
| Çöp listesi | `GET /api/products/trashed` (auth), sayfalama | `/cop-kutusu` sayfası |
| Geri getir | `POST /api/products/{id}/restore` | Çöp kutusu veya düzenle sayfasında “Geri getir” |
| Purge | `POST /api/products/purge-trashed` veya Artisan command | İsteğe bağlı purge butonu; cron ile otomatik |

Bu yapı ile ürün silme, 30 günlük çöp kutusu, geri getirme ve kalıcı silme tutarlı şekilde çalışır.
