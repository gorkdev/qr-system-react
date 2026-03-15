# Layout ve Navigasyon Yapısı

Bu doküman, admin panelinin layout’unu, sidebar navigasyonunu ve sayfa/URL yapısını özetler.

---

## Genel layout

- **Bileşen:** `AdminShell` (`frontend/src/components/layout/AdminShell.jsx`)
- **Yapı:** Sol tarafta sabit sidebar, sağda ana içerik alanı.
- **Tasarım:** Tailwind + shadcn uyumlu sınıflar (`bg-background`, `text-foreground`, `bg-muted/30` vb.). İçerik alanı `max-w-6xl` ile sınırlı, viewport yüksekliği kullanılır.

---

## Sidebar

**Dosya:** `frontend/src/components/navigation/Sidebar.jsx`

- Sol tarafta sabit; `md` breakpoint’ten itibaren görünür.
- **Marka:** Üstte “Akcan Grup” metni, minimal tipografi.
- **Menü öğeleri (navItems):**

| Etiket           | URL              | İkon          |
|------------------|------------------|---------------|
| Genel            | `/genel`         | LayoutDashboard |
| İstatistikler    | `/istatistikler` | BarChart3    |
| Ürünler          | `/urunler`       | Boxes         |
| Yeni Ürün        | `/yeni-urun`     | PlusSquare    |
| Ziyaret geçmişi  | `/ziyaret-gecmisi` | BarChart3  |
| Çöp kutusu       | `/cop-kutusu`    | Trash2        |
| Ayarlar          | `/ayarlar`       | Settings     |

- **Aktif link:** `NavLink` + `isActive`; aktifte `bg-primary/10 text-primary`, hover’da `hover:bg-muted hover:text-foreground`. Motion ile aktif arka plan animasyonu.
- **Alt kısım:** Oturum bilgisi (badge) ve “Çıkış yap” butonu (`variant='destructive'`).

---

## Router yapısı

**Dosya:** `frontend/src/App.jsx`

### Auth dışı (public)

- `/giris-yap` — Giriş sayfası (`GuestRoute`: giriş yapmışsa yönlendirilir)
- `/p/:token` — Public ürün sayfası (QR’dan yönlendirme)
- `/qr/:token` — Public ürün sayfası (alternatif URL)

### Korumalı (ProtectedRoute + AdminShell)

- `/` → `/genel` (replace)
- `/genel` — Dashboard
- `/istatistikler` — İstatistikler
- `/urunler` — Ürün listesi
- `/yeni-urun` — Yeni ürün formu
- `/urun-duzenle/:slugAndId` — Ürün düzenleme (slug + id)
- `/ziyaret-gecmisi` — Ziyaret geçmişi listesi
- `/cop-kutusu` — Çöp kutusu (silinmiş ürünler)
- `/ayarlar` — Site ayarları
- `*` — 404 (NotFound)

Tüm korumalı sayfalar `AdminShell` içinde render edilir; layout tek noktadan yönetilir.

---

## URL ve isimlendirme

- URL’ler Türkçe ve kısadır: `/genel`, `/istatistikler`, `/urunler`, `/yeni-urun`, `/ziyaret-gecmisi`, `/cop-kutusu`, `/ayarlar`.
- Sidebar etiketleri aynı dil ve tonla uyumludur.
- Admin paneli olduğu için SEO kritik değildir; Türkçe URL kullanımı bilinçli tercihtir.
