# QR Akışı, Ürün Detayı ve Ziyaret Analitiği

Bu doküman, proje boyunca eklediğimiz **QR üretimi**, **ürün detay sayfası**, **ziyaret kayıtları** ve **dashboard/ürünler istatistikleri** ile ilgili tüm backend + frontend mimarisini özetler.

- Yeni ürün oluştururken nasıl benzersiz bir link ve QR üretildiği
- Bu bilginin backend’de nasıl saklandığı
- Ürün detay sayfasının (public) yapısı
- Ziyaretlerin nasıl kaydedildiği ve Ziyaret Geçmişi sayfasında nasıl gösterildiği
- Dashboard ve Ürünler tablosuna eklenen istatistik kolonları

---

## 1. QR Token ve Ürün Oluşturma Akışı

### 1.1. QR token üretimi (frontend)

Dosya: `frontend/src/pages/NewProduct.jsx`

Yeni ürün formu submit edildiğinde:

- Her ürün için **benzersiz, tahmin edilemez bir `qrToken`** üretiliyor:

```ts
const qrToken =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? `${crypto.randomUUID()}-${Math.random().toString(36).slice(2)}`
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
```

- QR içinde encode edilen URL:

```ts
const qrData = `${window.location.origin}/p/${qrToken}`
```

Bu sayede:

- Link yapısı sabit: `/p/:token`
- Token uzun ve rastgele olduğu için tahmin edilmesi neredeyse imkânsız.

### 1.2. QR görselini üretme ve backend’e gönderme

`qr-code-styling` paketi ile frontend’de PNG olarak QR üretiliyor:

```ts
const qrCode = new QRCodeStyling({
  width: 600,
  height: 600,
  type: 'png',
  data: qrData,
  dotsOptions: { color: '#000000', type: 'rounded' },
  backgroundOptions: { color: '#ffffff' },
})

const qrBlob = await qrCode.getRawData('png')
```

Daha sonra form verileri bir `FormData` içine toplanıyor:

- Metin alanları: `title`, `description`, `youtube_url` (opsiyonel), `is_active`
- Dosyalar: `cover`, `alt_images[]`, `pdf` (opsiyonel)
- QR bilgisi:
  - `qr_token` → text alanı
  - `qr` → PNG blob’u (`qr-${qrToken}.png`)

```ts
const formData = new FormData()
formData.append('title', data.title)
formData.append('description', data.description)
formData.append('is_active', data.is_active === '1' ? '1' : '0')
formData.append('qr_token', qrToken)
// ...
if (qrBlob) {
  formData.append('qr', qrBlob, `qr-${qrToken}.png`)
}
```

Tüm veri, `.env` ile ayarlanan `VITE_API_BASE_URL` üzerinden backend’e POST ediliyor:

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
await fetch(`${API_BASE_URL}/api/products`, { method: 'POST', body: formData, ... })
```

---

## 2. Backend: Ürün, QR ve Ziyaret Yapısı

### 2.1. `products` tablosu alanları

Migration’lar:

- `2026_03_11_183949_create_products_table.php`
- `2026_03_11_200000_add_alt_image_paths_to_products_table.php`
- `2026_03_11_210000_add_is_active_to_products_table.php`
- `2026_03_11_220000_add_qr_image_path_to_products_table.php`
- `2026_03_11_230000_add_qr_token_to_products_table.php`

Güncel ürün modeli: `backend/app/Models/Product.php`

- Önemli alanlar:
  - `title`, `description`
  - `youtube_url` (opsiyonel)
  - `cover_image_path` (zorunlu kapak görseli)
  - `alt_image_paths` (JSON, alt görseller)
  - `pdf_path` (opsiyonel)
  - `qr_image_path` (opsiyonel QR PNG path’i)
  - `qr_token` (public link için benzersiz token)
  - `is_active` (bool)

```php
class Product extends Model
{
    protected $fillable = [
        'title',
        'description',
        'youtube_url',
        'cover_image_path',
        'pdf_path',
        'alt_image_paths',
        'qr_image_path',
        'qr_token',
        'is_active',
    ];

    protected $casts = [
        'alt_image_paths' => 'array',
        'is_active'       => 'boolean',
    ];
}
```

### 2.2. Ürün oluşturma (`ProductController@store`)

Dosya: `backend/app/Http/Controllers/Api/ProductController.php`

- Request validasyonu:

```php
$validated = $request->validate([
    'title'       => ['required', 'string', 'max:255'],
    'description' => ['required', 'string'],
    'youtube_url' => ['nullable', 'string', 'max:255'],
    'qr_token'    => ['required', 'string', 'max:255'],
    'is_active'   => ['required', 'boolean'],
    'cover'       => ['required', 'file', 'image', 'max:5120'],
    'pdf'         => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
    'alt_images'  => ['nullable', 'array'],
    'alt_images.*'=> ['file', 'image', 'max:5120'],
    'qr'          => ['nullable', 'file', 'image', 'max:5120'],
]);
```

- Kapak ve alt görseller Intervention Image (`ImageManager`) ile işlenip `storage/app/public/products/...` altına kaydediliyor.
- PDF, ürün klasörü altına ham dosya olarak yazılıyor.
- QR PNG, yine aynı klasöre `qr-<random>.png` olarak yazılıyor.
- Ayrıca klasör içinde text olarak QR token saklanıyor:

```php
if (!empty($validated['qr_token'] ?? null)) {
    Storage::disk('public')->put($folder . '/qr-token.txt', $validated['qr_token']);
}
```

### 2.3. Public ürün detayı için token endpoint’i

API route: `backend/routes/api.php`

```php
Route::apiResource('products', ProductController::class);
Route::get('products/token/{token}', [ProductController::class, 'showByToken']);
```

Controller:

```php
public function showByToken(string $token)
{
    $product = Product::where('qr_token', $token)
        ->where('is_active', true)
        ->firstOrFail();

    return response()->json($product);
}
```

Bu endpoint, QR içindeki `/p/:token` URL’sinin backend tarafındaki karşılığıdır.

---

## 3. Public Ürün Detay Sayfası (`/p/:token`)

Dosya: `frontend/src/pages/ProductPublic.jsx`  
Route tanımı: `App.jsx` içinde:

```jsx
<Route path='/p/:token' element={<ProductPublic />} />
```

### 3.1. Ekran yapısı (mobile-first)

- En üstte (varsa) **YouTube videosu**:
  - `getYoutubeEmbedUrl` ile normal YouTube linki embed URL’ye dönüştürülüyor.
  - `aspect-video` oranlı, full-width kart içinde iframe ile gösteriliyor.
- Altında **ürün kartı**:
  - Başlık (sadece title, aktif/pasif badge’i public sayfadan kaldırdık).
  - Kapak görseli:
    - Kart içinde küçük hali.
    - Tıklanınca shadcn `Dialog` ile büyük hali açılıyor (mobilde pinch/zoom için ideal).
  - Açıklama metni.
  - Ek görseller:
    - 3 sütunlu küçük grid.
    - Her görsel tıklanınca kendi modali ile büyük gösteriliyor.
  - PDF dokümanı:
    - Varsa “PDF’i aç” butonu (yeni sekmede).

### 3.2. Ürün detayı yüklenince ziyaret kaydı

`ProductPublic.jsx` içinde:

1. İlk `useEffect` → `GET /api/products/token/:token` ile ürünü çeker.
2. İkinci `useEffect` → `product.id` geldiğinde arkaplanda **ziyaret kaydı** oluşturur:

```ts
useEffect(() => {
  const recordVisit = async () => {
    if (!product?.id) return

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
      await fetch(`${API_BASE_URL}/api/visits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ product_id: product.id }),
      })
    } catch (err) {
      console.error('Ziyaret kaydedilirken hata oluştu', err)
    }
  }

  recordVisit()
}, [product?.id])
```

Her QR okutuluşunda veya `/p/:token` sayfası açıldığında otomatik bir ziyaret kaydı düşer.

---

## 4. Ziyaret Tablosu ve Analitik (`visits`)

### 4.1. Veritabanı ve model

Migration: `2026_03_12_000000_create_visits_table.php`

Alanlar:

- `id`
- `product_id` (foreign key, `products.id`)
- `ip_address` (string, IPv4/IPv6 için 45 karakter)
- `location` (şimdilik her zaman `null`)
- `device_type` (`desktop|mobile|tablet`)
- `user_agent` (tam UA string)
- `visited_at` (timestamp)

Model: `backend/app/Models/Visit.php`

```php
class Visit extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'product_id',
        'ip_address',
        'location',
        'device_type',
        'user_agent',
        'visited_at',
    ];

    protected $casts = [
        'visited_at' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
```

`Product` modeli ile ilişki:

```php
public function visits()
{
    return $this->hasMany(Visit::class);
}
```

### 4.2. VisitController ve API

Dosya: `backend/app/Http/Controllers/Api/VisitController.php`

- `POST /api/visits`:
  - `product_id` doğrulanır ve ürün bulunur.
  - `ip_address` → `$request->ip()`
  - `user_agent` → `$request->userAgent()`
  - `device_type` UA string’inden basit kurallarla çıkarılır (`mobile`, `tablet`, default `desktop`).
  - `location` şimdilik `null`.
  - `visited_at = now()`.

- `GET /api/visits`:
  - `Visit::with('product')->orderByDesc('visited_at')->limit(500)->get()` ile son 500 ziyaret döndürülür.

API rotaları:

```php
Route::get('visits', [VisitController::class, 'index']);
Route::post('visits', [VisitController::class, 'store']);
```

### 4.3. Ziyaret Geçmişi sayfası (admin)

Dosya: `frontend/src/pages/Visits.jsx`  
Sidebar’a yeni bir item eklendi:

- Label: `Ziyaret geçmişi`
- URL: `/ziyaret-gecmisi`

Sayfanın özellikleri:

- Üstte `PageHeader` ile başlık + açıklama.
- Üst sağda filtreler:
  - `Input` (`bg-card`) → ürün başlığı veya IP ile arama.
  - `Select` (`bg-card`) → cihaz filtresi (`Tümü / Masaüstü / Mobil / Tablet`).
- Tablo kolonları:
  - Ürün başlığı
  - IP adresi (md+)
  - Konum (şimdilik hepsi `-`)
  - Cihaz türü (`Masaüstü / Mobil / Tablet` badge)
  - Tarayıcı (UA’dan kısaltılmış isim: `Chrome`, `Firefox`, `Safari`, `Edge`, `Opera`, `Diğer`)
  - Ziyaret zamanı (tarih + saat, `tr-TR` formatında)

---

## 5. Ürünler Tablosu ve QR İşlemleri

Dosya: `frontend/src/pages/Products.jsx`

### 5.1. shadcn tablosu ve filtreler

- Üst kısım:
  - `PageHeader` (`Ürünler` sayfası, `Yeni ürün` + `Filtreler` butonları).
  - Sağ üstte:
    - Ürün başlığı / açıklama arama inputu (`bg-card`).
    - Durum filtresi select’i (`Tümü / Aktif / Pasif`, `bg-card`).

- Tablo kolonları:
  - Kapak görseli (tıklanabilir, modal ile büyük gösterim).
  - Ürün başlığı + mobilde kısa açıklama snippet’i.
  - Açıklama (md+ ekranlarda, 2 satıra kadar).
  - Durum (Aktif/Pasif badge).
  - Oluşturulma tarihi.
  - Ziyaret sayısı (lg+ ekranlarda `visits_count`).
  - İşlemler (QR modalı vb.).

Ürünler backend’den `GET /api/products` ile çekiliyor; `ProductController@index` tarafında `withCount('visits')` kullanıldığı için her üründe `visits_count` hazır geliyor.

### 5.2. QR modalı, link kopyalama ve indirme

- Tablo satırında “İşlemler” kolonunda bir QR ikonlu buton var.
- Tıklanınca shadcn `Dialog` açılıyor:
  - QR PNG, backend’de kaydedilmiş `qr_image_path` üzerinden gösteriliyor.
  - Altında “Ürün bağlantısı” alanı:
    - Görünürde en fazla 40 karakter (`...` ile kısaltılmış), hover’da tam URL `title` olarak.
    - Yanındaki “Kopyala” butonu tam URL’yi (`/p/:qr_token`) panoya yazıyor (`navigator.clipboard`).
  - En altta ortalanmış “QR’ı indir” butonu:
    - QR’ı backend’den çekmek yerine, yeniden `qr-code-styling` ile **`qr_token`’a göre client-side oluşturuyor**.
    - Dosya adı: `<ürün-slug>-qr-<product.id>.png`  
      Örn: `akcan-grup-ozel-qr-menu-qr-12.png`

Bu yapı sayesinde:

- QR görseli hem backend’de saklanıyor (tarihsel kayıt), hem de her indirme isteğinde token’a göre tekrar üretilebiliyor.

---

## 6. Dashboard İstatistik Kartları

Dosya: `frontend/src/pages/Dashboard.jsx`

Dashboard artık **gerçek veriye dayalı** 3 kart gösteriyor:

1. **Toplam QR**
2. **Toplam tarama**
3. **Bugünkü tarama**

Veri kaynağı:

- `GET /api/products` → ürün sayısı (toplam QR) ve oluşturulma tarihleri.
- `GET /api/visits` → tüm ziyaretler.

Hesaplanan metrikler:

- **Toplam QR**
  - `totalQr = products.length`
  - Son 7 günde oluşturulan ürünler vs. önceki 7 gün → yüzde değişim.

- **Toplam tarama**
  - `totalScans = visits.length`
  - Son 7 gündeki ziyaret sayısı vs. önceki 7 gün → yüzde değişim.

- **Bugünkü tarama**
  - `todayScans` → `visited_at` bugün olan ziyaretler.
  - `yesterdayScans` → dünküler.
  - Bugün vs. dün ziyaret sayıları arasındaki yüzde fark.

Trend metinleri:

- `formatTrend` fonksiyonu ile `+18% / -5% / 0%` gibi değerler üretiliyor.
- Kartların alt açıklamaları:
  - Toplam QR / Toplam tarama → `Son 7 güne göre`
  - Bugünkü tarama → `Düne göre`

---

Bu mimari sayesinde:

- Her ürün için benzersiz, tahmin edilmesi zor bir QR linki ile public ürün detayı sunuluyor.
- Tüm ziyaretler IP, cihaz türü ve tarayıcı bilgisiyle kaydedilip admin panelde analiz edilebiliyor.
- Dashboard ve ürünler tablosu canlı istatistikler sunuyor; ileride daha detaylı analitik veya filtreler eklemek kolay olacak.***
