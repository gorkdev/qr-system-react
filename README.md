# Akcan Grup QR Yönetim Sistemi

Bu repo, **frontend (React + Vite)** ve **backend (Laravel)** olmak üzere iki ayrı projeden oluşan bir QR yönetim panelidir.

- Frontend: `frontend/`
- Backend API: `backend/`

---

## 1. Repo'yu Klonla

```bash
git clone <REPO_URL>
cd qr-system-react
```

> `<REPO_URL>` kısmına kendi repo adresini yaz.

---

## 2. Backend Kurulumu (`backend/`)

```bash
cd backend

# PHP bağımlılıkları
composer install

# .env oluştur
cp .env.example .env

# Uygulama anahtarı
php artisan key:generate
```

`.env` içinde veritabanı ayarlarını yap (senin projende varsayılan isim `akcan_grup_qr`):

```env
DB_DATABASE=akcan_grup_qr
DB_USERNAME=...
DB_PASSWORD=...
```

Ardından migration'ları çalıştır:

```bash
# Tüm tablolar (products, visits vb.) boş şekilde oluşur
php artisan migrate

# Storage link (ürün görselleri ve QR'lar için)
php artisan storage:link

# API'yi ayağa kaldır
php artisan serve
```

Varsayılan olarak API `http://localhost:8000` adresinde çalışır.

---

## 3. Frontend Kurulumu (`frontend/`)

Ayrı bir terminalde:

```bash
cd frontend

# JS bağımlılıkları
npm install
```

Frontend için `.env` dosyası oluştur:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Geliştirme sunucusunu başlat:

```bash
npm run dev
```

Tarayıcıdan şu adrese git:

```text
http://localhost:5173
```

> Önemli: Backend (`php artisan serve`) ve frontend (`npm run dev`) aynı anda açık olmalı.

---

## 4. Production Build (Frontend)

```bash
cd frontend
npm run build
```

Oluşan `frontend/dist/` klasörünü dilediğin sunucuya deploy edebilirsin (örneğin Nginx üzerinden veya herhangi bir static hosting servisiyle).

Backend (Laravel) için klasik deploy adımlarını (env, migrate, cache, queue vb.) kendi sunucu ortamına göre uygulayabilirsin.