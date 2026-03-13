# Site Ayarları (QR Okunabilirliği) ve Genel Dashboard Metrikleri

Bu doküman, sitenin QR okunabilirliğini açıp kapatan ayar altyapısını ve admin paneldeki `Genel` (Dashboard) sayfasında gösterilen tarama metriklerini hem backend hem frontend tarafında özetler.

---

## 1. Backend – Site Ayarları (QR Okunabilirliği)

### 1.1. Tablo ve Migration

- Dosya: `backend/database/migrations/2026_03_12_010000_create_site_settings_table.php`
- Tablo: `site_settings`

Alanlar:

- `id`
- `qr_enabled` (`boolean`, varsayılan `true`)
- `created_at`, `updated_at`

Bu tablo **singleton** mantığında kullanılır; sistemde tek satır beklenir.

### 1.2. Model – `SiteSetting`

- Dosya: `backend/app/Models/SiteSetting.php`

```php
class SiteSetting extends Model
{
    protected $table = 'site_settings';

    protected $fillable = [
        'qr_enabled',
    ];

    protected $casts = [
        'qr_enabled' => 'boolean',
    ];
}
```

### 1.3. Controller – `SiteSettingController`

- Dosya: `backend/app/Http/Controllers/Api/SiteSettingController.php`

Metotlar:

- `show()`

```php
public function show()
{
    $setting = SiteSetting::query()->first();

    if (!$setting) {
        $setting = SiteSetting::create([
            'qr_enabled' => true,
        ]);
    }

    return response()->json($setting);
}
```

- `update(Request $request)`

```php
public function update(Request $request)
{
    $data = $request->validate([
        'qr_enabled' => ['required', 'boolean'],
    ]);

    $setting = SiteSetting::query()->first();

    if (!$setting) {
        $setting = new SiteSetting();
    }

    $setting->qr_enabled = $data['qr_enabled'];
    $setting->save();

    return response()->json([
        'message' => 'Site settings updated.',
        'data'    => $setting,
    ]);
}
```

### 1.4. API Rotaları

- Dosya: `backend/routes/api.php`

```php
use App\Http\Controllers\Api\SiteSettingController;

Route::get('site-settings', [SiteSettingController::class, 'show']);
Route::put('site-settings', [SiteSettingController::class, 'update']);
```

Bu endpoint’ler, admin paneldeki Ayarlar sayfası ve public ürün detayı tarafından kullanılır.

---

## 2. Frontend – Ayarlar Sayfası (`frontend/src/pages/Settings.jsx`)

### 2.1. UI Tasarımı

- Başlık: `Ayarlar` (`PageHeader` ile)
- Açıklama: “Sistem davranışlarını ve site durumunu buradan yönetebilirsiniz.”
- Sayfa gövdesinde tek bir `Card`:
  - Başlık: **Site durumu**
  - Açıklama: “QR kodların kullanıcıyı ürün detay sayfasına yönlendirmesini kontrol edin.”
  - Sağ üstte durum badge’i:
    - Aktif → `Aktif` (default badge)
    - Kapalı → `Kapalı` (outline badge, kırmızı tonlu border/text)
  - İçerikte:
    - “QR okunabilirliği” satırı + açıklama metni.
    - Sağda custom shadcn uyumlu `Switch` bileşeni (`components/ui/switch.jsx`).
  - Altta “Önizleme” kutusu:
    - QR açık: “QR aktif: kullanıcı ürün detay sayfasına yönlendirilir.”
    - QR kapalı: “QR kapalı: kullanıcı kapalı bilgilendirme sayfasını görür.”
  - `CardFooter`’da:
    - **Vazgeç** butonu (outline)
    - **Kaydet** butonu
    - Değişiklik yoksa veya kaydetme sürüyorsa her ikisi de disabled.

### 2.2. State ve Lifecycle

State’ler:

- `initialQrReadable`: Backend’ten gelen ilk `qr_enabled` değeri.
- `qrReadable`: Switch’in o anki değeri.
- `isLoading`: Ayarları yüklerken `true`.
- `isSaving`: Kaydetme sırasında `true`.

Değişiklik algılama:

```ts
const hasChanges = useMemo(
  () => qrReadable !== initialQrReadable,
  [qrReadable, initialQrReadable],
);
```

### 2.3. Ayarları Yükleme (GET)

```ts
useEffect(() => {
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(`${API_BASE_URL}/api/site-settings`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Site ayarları yüklenirken bir hata oluştu.");
      const data = await res.json();
      const enabled = !!(data?.qr_enabled ?? data?.data?.qr_enabled ?? true);
      setInitialQrReadable(enabled);
      setQrReadable(enabled);
    } catch (error) {
      toast("Site ayarları yüklenemedi.", {
        description: "Lütfen sayfayı yenileyip tekrar deneyin.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  fetchSettings();
}, []);
```

### 2.4. Ayarları Kaydetme (PUT)

```ts
const handleSave = async () => {
  if (!hasChanges || isSaving) return;
  try {
    setIsSaving(true);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const res = await fetch(`${API_BASE_URL}/api/site-settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ qr_enabled: qrReadable }),
    });

    if (!res.ok) {
      const result = await res.json().catch(() => ({}));
      throw new Error(
        result?.message || "Ayar kaydedilirken bir hata oluştu.",
      );
    }

    const result = await res.json();
    const next = !!(result?.data?.qr_enabled ?? result?.qr_enabled);
    setInitialQrReadable(next);
    setQrReadable(next);

    toast("Ayar kaydedildi.", {
      description: "QR okunabilirliği ayarı güncellendi.",
    });
  } finally {
    setIsSaving(false);
  }
};
```

`handleReset` ise `qrReadable`’ı `initialQrReadable`’a geri alır ve toast ile kullanıcıyı bilgilendirir.

---

## 3. Frontend – Genel Dashboard Metrikleri (`frontend/src/pages/Dashboard.jsx`)

### 3.1. Veri Kaynağı

Dashboard, istatistikler için iki endpoint kullanır:

- `GET /api/products`
- `GET /api/visits`

Bu veriler, sadece ziyaret (tarama) metriklerine odaklanan 4 küçük kartta özetlenir.

### 3.2. Hesaplanan Metrikler (Visits bazlı)

Zaman aralıkları:

- Bugün ve dün (`startToday`, `startYesterday`)
- Son 7 gün ve önceki 7 gün (`startLast7`, `startPrev7`)
- Son 30 gün ve önceki 30 gün (`startLast30`, `startPrev30`)

Hesaplanan değerler:

- `totalScans`: Tüm ziyaret sayısı.
- `scansLast7`: Son 7 gündeki ziyaret sayısı.
- `scansPrev7`: Önceki 7 gündeki ziyaret sayısı.
- `scansLast30`: Son 30 gündeki ziyaret sayısı.
- `scansPrev30`: Önceki 30 gündeki ziyaret sayısı.
- `todayScans`: Bugünkü ziyaret sayısı.
- `yesterdayScans`: Dünkü ziyaret sayısı.

Trend fonksiyonu:

```ts
const percentChange = (current, previous) => {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return ((current - previous) / previous) * 100;
};
```

Dashboard’da kullanılan metrikler:

- `scansTrend7 = percentChange(scansLast7, scansPrev7)`
- `scansTrend30 = percentChange(scansLast30, scansPrev30)`
- `todayTrend = percentChange(todayScans, yesterdayScans)`

### 3.3. Kartlar

Grid: `md:grid-cols-3`, ama 4 kart mevcut; küçük ekranlarda dikey, geniş ekranlarda çok kolonlu görünür.

Kart listesi:

1. **Bugünkü tarama**
   - Değer: `todayScans`
   - Trend: `todayTrend` → `"Düne göre"`
2. **Haftalık tarama**
   - Değer: `scansLast7`
   - Trend: `scansTrend7` → `"Önceki 7 güne göre"`
3. **Aylık tarama**
   - Değer: `scansLast30`
   - Trend: `scansTrend30` → `"Önceki 30 güne göre"`
4. **Toplam tarama**
   - Değer: `totalScans`
   - Trend: referans olarak `scansTrend30` kullanılır → `"Toplam"` açıklamasıyla gösterilir.

Her kart:

- `CardTitle`: küçük, uppercase, hafif gri etiket.
- Sağda ikon: şu an `QrCode` kullanılıyor (ileri aşamada farklı ikonlar eklenebilir).
- Value: büyük, kalın sayı; yüklenirken `"—"`.
- Alt açıklama: yeşil tonda trend yüzdesi + referans aralık metni.

