# Akcan Grup QR Yönetim Sistemi

Ürün kataloğu ve QR kod yönetimi için **admin paneli** + **public ürün sayfaları** sunan full-stack uygulama. QR ile taranan ürünlerin detay sayfası gösterilir, ziyaretler kaydedilir ve panelde istatistikler takip edilir.

- **Frontend:** `frontend/` — React 18, Vite, Tailwind, shadcn/ui
- **Backend:** `backend/` — Laravel (REST API), Sanctum auth, MySQL/SQLite

---

## Özellikler

- **Giriş / oturum:** E-posta + şifre, token tabanlı API auth (Laravel Sanctum)
- **Dashboard:** Bugünkü / haftalık / aylık tarama sayıları, trendler
- **Ürünler:** Liste, yeni ürün ekleme, düzenleme, kapak/alt görsel, PDF, YouTube, QR token
- **Çöp kutusu:** Ürün soft-delete, 30 gün içinde geri getirme, süre sonu kalıcı silme (purge)
- **Ziyaret geçmişi:** QR tıklanınca kayıt (IP, cihaz, tarih), panelde listeleme ve filtreleme
- **Ayarlar:** QR okunabilirliği (açık/kapalı) — public ürün sayfası davranışı
- **Public sayfa:** `/p/:token` ve `/qr/:token` — token ile ürün detayı (QR’dan yönlendirme)

---

## 1. Repo’yu klonla

```bash
git clone <REPO_URL>
cd qr-system-react
```

`<REPO_URL>` yerine kendi repo adresini yaz.

---

## 2. Backend kurulumu (`backend/`)

```bash
cd backend

# Bağımlılıklar
composer install

# Ortam dosyası
cp .env.example .env
php artisan key:generate
```

`.env` içinde veritabanı ayarlarını yap:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=akcan_grup_qr
DB_USERNAME=...
DB_PASSWORD=...
```

Migration ve storage:

```bash
php artisan migrate
php artisan storage:link
```

İlk admin kullanıcı (isteğe bağlı):

```bash
php artisan db:seed --class=AdminUserSeeder
```

API’yi çalıştır:

```bash
php artisan serve
```

Varsayılan adres: `http://localhost:8000`

---

## 3. Frontend kurulumu (`frontend/`)

Ayrı bir terminalde:

```bash
cd frontend
npm install
```

`.env` oluştur:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Geliştirme sunucusu:

```bash
npm run dev
```

Panel: `http://localhost:5173`

> Backend ve frontend aynı anda çalışıyor olmalı.

---

## 4. Testler (Backend)

```bash
cd backend
php artisan test
```

Feature testleri: Auth, Product (CRUD + çöp kutusu + purge), Visit, SiteSetting, İstatistikler.

---

## 5. Production

**Frontend:** Build alıp `dist/` içeriğini statik sunucuya at:

```bash
cd frontend
npm run build
```

Production’da `VITE_API_BASE_URL` gerçek API adresine işaret etmeli (build öncesi env).

**Backend:** Sunucuda `.env` (APP_ENV=production, APP_DEBUG=false), `migrate`, `storage:link`. Gerekirse cron ile `schedule:run` (çöp kutusu purge için).

---

## Dokümantasyon

Detaylı uygulama notları `app-docs/` klasöründe:

- `overview.md` — Genel bakış ve dosya listesi
- `layout-and-navigation.md` — Layout, sidebar, URL yapısı
- `new-product-form.md` — Yeni ürün formu
- `validation-and-feedback.md` — Validasyon ve toast
- `qr-flow-and-analytics.md` — QR akışı ve istatistikler
- `soft-delete-trash-products.md` — Çöp kutusu ve 30 günlük silme
- `site-settings-and-dashboard-metrics.md` — Ayarlar ve dashboard metrikleri
- Diğer sayfa/UI dokümanları

---

## API özeti

| Tip    | Endpoint | Auth   | Açıklama |
|--------|----------|--------|----------|
| POST   | `/api/login` | Hayır | Giriş, token döner |
| GET    | `/api/products/token/{token}` | Hayır | Public ürün detayı |
| POST   | `/api/visits` | Hayır | Ziyaret kaydı (QR tıklanınca) |
| GET    | `/api/site-settings` | Hayır | Site ayarları (okuma) |
| *      | `/api/products`, `/api/visits`, `/api/site-settings` (PUT) vb. | **Evet** | Token gerekli (Bearer) |

Tüm ekleme / silme / güncelleme işlemleri `auth:sanctum` ile korunur.
