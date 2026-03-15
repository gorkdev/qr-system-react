# İşlem Geçmişi ve Activity Log Sistemi

Bu doküman, admin paneldeki **İşlem geçmişi** özelliğini ve arkaplanda çalışan activity log sistemini açıklar.

---

## 1. Genel Amaç

- Admin olarak panelde yaptığın tüm kritik işlemler (login, logout, şifre değiştirme, ürün ekleme/güncelleme/silme, site ayarı değiştirme) otomatik olarak kaydedilir.
- Kayıtlar, backend’de tek bir tabloya (`activity_logs`) yazılır.
- Admin panelde **İşlem geçmişi** sayfasından bu kayıtlar server-side pagination ile listelenir.


---

## 2. Backend – Tablo ve Model

### 2.1. Migration

Dosya: `backend/database/migrations/2026_03_15_120000_create_activity_logs_table.php`

Alanlar:

- `id` (bigint, primary)
- `user_id` (nullable, `users.id`’e foreign key, kullanıcı silinirse `null`)
- `action` (string, 100) – Kısa işlem anahtarı (ör: `product_created`)
- `subject_type` (string, 100, nullable) – İşlem yapılan modelin tam sınıf adı (ör: `App\Models\Product`)
- `subject_id` (bigint, nullable) – İlgili kaydın id’si (ör: ürün id’si)
- `description` (text, nullable) – İnsan okuyabilir kısa açıklama
- `ip_address` (string, 45, nullable) – İsteği yapan istemcinin IP adresi
- `user_agent` (text, nullable) – Tarayıcı/istemci UA bilgisi
- `metadata` (json, nullable) – Ek bağlam/veriler (ör. `purged_count`)
- `created_at`, `updated_at` – timestamp alanları

Ek index’ler:

- `index(['subject_type', 'subject_id'])`
- `index('action')`
- `index('created_at')`


### 2.2. Model

Dosya: `backend/app/Models/ActivityLog.php`

- `$fillable`: `user_id`, `action`, `subject_type`, `subject_id`, `description`, `ip_address`, `user_agent`, `metadata`
- `$casts['metadata'] = 'array'`
- `user()` ilişkisi: `belongsTo(User::class)`

Bu yapı sayesinde log kayıtları performanslı bir şekilde filtrelenip sıralanabilir.


---

## 3. Backend – Otomatik Loglanan İşlemler

### 3.1. Auth işlemleri

Controller: `backend/app/Http/Controllers/Api/AuthController.php`

- **Giriş (`login`)**
  - Başarılı giriş sonrası:
    - `action: 'login'`
    - `subject_type: App\Models\User`
    - `subject_id: user.id`
    - `description: 'Kullanıcı giriş yaptı.'`
- **Çıkış (`logout`)**
  - Access token silindikten sonra:
    - `action: 'logout'`
    - `subject_type: App\Models\User`
    - `subject_id: user.id`
    - `description: 'Kullanıcı çıkış yaptı.'`
- **Şifre değiştirme (`changePassword`)**
  - Başarılı değişiklik sonrası:
    - `action: 'password_changed'`
    - `subject_type: App\Models\User`
    - `subject_id: user.id`
    - `description: 'Kullanıcı şifresini değiştirdi.'`

Tüm bu kayıtlara `ip_address` ve `user_agent` otomatik eklenir.


### 3.2. Ürün işlemleri

Controller: `backend/app/Http/Controllers/Api/ProductController.php`

- **Ürün oluşturma (`store`)**
  - Başarılı `Product::create` sonrası:
    - `action: 'product_created'`
    - `subject_type: App\Models\Product`
    - `subject_id: product.id`
    - `description: 'Ürün oluşturuldu: {title}'`
    - `metadata: { product_id: product.id }`

- **Ürün güncelleme (`update`)**
  - Başarılı `update` sonrası:
    - `action: 'product_updated'`
    - `subject_type: App\Models\Product`
    - `subject_id: product.id`
    - `description: 'Ürün güncellendi: {title}'`

- **Ürünü çöp kutusuna taşıma (`destroy`)**
  - Soft delete sonrası:
    - `action: 'product_deleted'`
    - `subject_type: App\Models\Product`
    - `subject_id: product.id`
    - `description: 'Ürün çöp kutusuna taşındı: {title}'`

- **Çöp kutusundan geri getirme (`restore`)**
  - `restore()` sonrası:
    - `action: 'product_restored'`
    - `subject_type: App\Models\Product`
    - `subject_id: product.id`
    - `description: 'Ürün geri getirildi: {title}'`

- **Çöpleri kalıcı silme (`purgeTrashed`)**
  - 30 günden eski çöp ürünler kalıcı silindiğinde:
    - `action: 'products_purged'`
    - `subject_type: App\Models\Product`
    - `subject_id: null`
    - `description: '{N} ürün kalıcı olarak silindi.'`
    - `metadata: { purged_count: N }`


### 3.3. Site ayarları

Controller: `backend/app/Http/Controllers/Api/SiteSettingController.php`

- **QR okunabilirlik ayarı (`update`)**
  - `qr_enabled` değiştiğinde:
    - `action: 'site_settings_updated'`
    - `subject_type: App\Models\SiteSetting`
    - `subject_id: site_setting.id`
    - `description: 'Site ayarları güncellendi.'`
    - `metadata: { qr_enabled_before: bool, qr_enabled_after: bool }`


---

## 4. Backend – ActivityLogController ve API

Controller: `backend/app/Http/Controllers/Api/ActivityLogController.php`  
Route: `GET /api/activity-logs` (sadece `auth:sanctum` ile, admin paneli için)

Desteklenen query parametreleri:

- `page` – sayfa numarası (varsayılan 1)
- `per_page` – sayfa başına kayıt (varsayılan 20, maksimum 100)
- `user_id` – belirli kullanıcıya ait loglar
- `action` – belirli bir `action` anahtarı için filtre
- `search` – açıklama (`description`) içinde arama

Çıktı, Laravel `paginate()` yapısına uygun bir JSON döndürür:

- `data` – log kayıtları
- `current_page`, `last_page`, `per_page`, `total` vb.


---

## 5. Frontend – İşlem Geçmişi Sayfası

Sayfa: `frontend/src/pages/ActivityLog.jsx`  
Route: `/islem-gecmisi`  
Sidebar etiketi: **“İşlem geçmişi”** (`Clock3` ikonuyla)

### 5.1. Veri akışı

- Sayfa yüklendiğinde ve filtreler değiştiğinde:
  - `GET /api/activity-logs?page={page}&per_page=10&search={query}` çağrılır.
- Arama:
  - Üstte tek bir input alanı: **“Açıklamada ara”**
  - 400ms debounce ile, yazdıkça sorgu server’a gönderilir (Products tablosundaki arama davranışıyla aynı desen).


### 5.2. Tablo yapısı

Shadcn tablosu, Products sayfasındaki tablo ile aynı görsel dile sahip:

- Üstte:
  - Sol tarafta toplam kayıt bilgisi: **“Toplam X işlem kaydı bulundu.”**
  - Sağ tarafta arama input’u (md+ ekranlarda görünür).
- Tablo kolonları:
  - **Tarih** – `formatDate(log.created_at)` ile formatlanmış tarih (ürünler tablosundaki tarih format fonksiyonuyla aynı).
  - **Kullanıcı** – log’da `user` varsa `"Admin"`, yoksa `"Sistem"`.
  - **İşlem** – backend’deki `action` değeri Türkçe etiketlere map edilir:

    ```ts
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
    }
    ```

  - **Açıklama** – backend’den gelen `description` alanı (örn. **“Ürün oluşturuldu: Log Test Ürünü”**).

IP ve user agent bilgisi tabloda gösterilmez; sadece backend logunda tutulur.


### 5.3. Pagination

- Sayfa başına 10 kayıt (`PAGE_SIZE = 10`).
- Alt kısımda:
  - “Önceki” ve “Sonraki” butonları (disabled state’leriyle).
  - Ortada `"Sayfa {page} / {lastPage}"` metni.


---

## 6. Testler

Feature test dosyası: `backend/tests/Feature/ActivityLogTest.php`

Kapsanan senaryolar:

- **Listeleme**:
  - `GET /api/activity-logs` için auth gerekliliği.
  - Sayfa + `per_page` parametreleri ile doğru pagination (`total`, `per_page`, `current_page`).
- **Otomatik loglama**:
  - Ürün oluşturma → `product_created` kaydı oluşur.
  - Ürün güncelleme → `product_updated` kaydı oluşur.
  - Ürünü çöp kutusuna taşıma → `product_deleted` kaydı oluşur.
  - Çöp kutusundan geri getirme → `product_restored` kaydı oluşur.
  - Site ayarı güncelleme (`qr_enabled` değişimi) → `site_settings_updated` kaydı oluşur.

Bu testler, hem log tablosunun doğru doldurulduğunu hem de endpoint’in beklenen veriyi döndürdüğünü garanti eder. Böylece İşlem geçmişi özelliği güvenle geliştirilebilir ve genişletilebilir.**

