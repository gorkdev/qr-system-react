# Public Ürün Detayı ve Admin Liste İyileştirmeleri

Bu doküman, public ürün detay sayfası (`ProductPublic.jsx`) ile admin tarafındaki ürün ve ziyaret listelerinde yaptığımız UX / davranış iyileştirmelerini özetler.

---

## 1. Public Ürün Detayı (`frontend/src/pages/ProductPublic.jsx`)

### 1.1. Dinamik sayfa başlığı

- Route: `/p/:token` ve `/qr/:token`
- Ürün yüklendiğinde `document.title` dinamik olarak güncellenir:
  - Başarılı durumda: `"{product.title} | Ürün Detayı"`
  - Hata veya bulunamama durumunda: `"Ürün bulunamadı | Ürün Detayı"`
  - Yüklenirken: `"Ürün yükleniyor... | Ürün Detayı"`

### 1.2. 5 saniyelik açılış overlay’i

- Sayfa ilk açıldığında:
  - API çağrısı hemen yapılır ve ürün + görseller + PDF arka planda normal şekilde yüklenir.
  - Ekranın üzerinde 5 saniyelik **tam beyaz** bir overlay görünür; altında içerik hazırlanır.
- Overlay içeriği:
  - Üstte logo benzeri metin: **AKCAN GRUP**
  - Ortada ince, uzun bir progress bar (`h-2 w-56`) – 5 saniyelik süre boyunca soldan sağa sürekli daralan animasyon.
  - Progress bar altında küçük metin: **“Yönlendiriliyorsunuz...”**
  - Altında 5 → 1 arası geri sayım rakamı:
    - Her değişimde Framer Motion ile yumuşak bir “aşağı düşme” animasyonu uygulanır (spring tabanlı).
- Scroll davranışı:
  - Dış container `overflow-y-scroll`, bu sayede scrollbar her zaman görünür; layout sağa-sola kaymaz.
  - `countdown > 0` iken kök container’a `pointer-events-none` uygulanır:
    - Mouse wheel, scrollbar sürükleme ve touch hareketleri dahil **hiçbir scroll etkileşimi çalışmaz**.
  - 5 saniye bittiğinde `pointer-events-none` kaldırılır, overlay kaybolur ve kullanıcı içeriği serbestçe kaydırabilir.

### 1.3. Üst medya alanı (video + kapak görseli)

- YouTube linki varsa:
  - En üstte `getYoutubeEmbedUrl` ile embed edilmiş video (responsive `aspect-video` alanında).
  - Hemen altında cover görseli, video ile arasında küçük bir üst margin (`mt-3`) olacak şekilde konumlanır.
- YouTube linki yoksa:
  - Cover görseli kartın en üstüne boşluksuz oturur (video alanı olmadığı için `mt-3` uygulanmaz).
- Cover görseli:
  - Arka planda blur ve düşürülmüş opaklıkla tüm alanı kaplayan bir katman.
  - Ön planda, sınırları içinde kırpılmadan gösterilen, kartın ortasına yerleşmiş bir görsel katmanı.
  - Tıklanınca shadcn `Dialog` ile büyük, kenarsız bir önizleme açılır.
- Alt görseller:
  - 3 kolonlu grid; hover’da büyüteç ikonlu overlay.
  - Her görsel, kendi dialog penceresinde büyük haliyle gösterilir.

### 1.4. PDF gösterimi

- PDF URL’si ürünün `pdf_path` alanından türetilir ve `/storage/...` ile frontend tarafından erişilir.
- PDF, `PdfPages` bileşeni ile canvas üzerinde, container genişliğine göre ölçeklenerek render edilir:
  - Metinler keskin ve okunaklı olacak şekilde DPI dikkate alınır.
  - PDF alanı kart içinde yatayda ortaya hizalanır.
- Başlık satırı:
  - Solda `FileText` ikonu ve “Doküman” metni.
  - Sağda “**Yeni sekmede aç**” linki (raw PDF’i yeni sekmede açar).

---

## 2. Ürünler Tablosu – Arama, “Bulunamadı” Durumu ve UX ( `frontend/src/pages/Products.jsx`)

### 2.1. Case/aksan duyarsız arama

- Arama input’u:
  - Placeholder: **“Ürün başlığı veya açıklama ara”**
  - `search` state’i üzerinden filtreleme yapılır.
- `normalizeText` helper’ı ile metin normalize edilerek aranır:

```ts
const normalizeText = (value) =>
  (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
```

- Filtreleme mantığı:
  - `normalizeText(product.title).includes(normalizeText(search))`
  - `normalizeText(product.description).includes(normalizeText(search))`
- Böylece:
  - `iPhone` kaydı, `İphone`, `IPHONE`, `iphone` vb. tüm varyasyonlarla bulunabilir.

### 2.2. “Bulunamadı” durumunun ikonlu/ortalanmış gösterimi

- `filteredProducts.length === 0` ise:
  - Tablo gövdesinde tek bir satır render edilir.
  - `TableCell` → `colSpan={7}` ile tüm sütunları kaplar.
  - İçerik:
    - Ortalanmış bir kolon:
      - `SearchX` ikonu (`lucide-react`).
      - Altında **“Arama kriterlerinize uygun ürün bulunamadı.”** metni.
  - `py-12` ile hem dikey hem yatayda görsel olarak tam merkeze yakın bir konum elde edilir.

### 2.3. Pagination ile entegrasyon

- Mevcut client-side pagination (sayfa başına 10 kayıt) korunur:
  - `currentPageProducts` yalnızca ilgili dilimi gösterir.
  - Altta “Önceki / Sonraki” butonları ve “Sayfa X / Y” bilgisi yer alır.
- Arama veya durum filtresi değiştiğinde:
  - `useEffect` ile otomatik olarak `currentPage` tekrar 1’e çekilir.

---

## 3. Ziyaret Geçmişi Tablosu – Filtreler, Arama ve Pagination (`frontend/src/pages/Visits.jsx`)

### 3.1. Cihaz filtresi (dropdown)

- Shadcn `Select` bileşeni kullanılır:
  - Placeholder: **“Cihaz türü”**
  - Seçenekler: Tümü, Masaüstü, Mobil, Tablet.
- `SelectTrigger` içinde sağ tarafa `ChevronDown` ikonu eklenmiştir:
  - Görsel olarak admin paneldeki diğer filtre dropdown’larıyla tutarlıdır (özellikle `Products` sayfasındaki durum filtresi ile).

### 3.2. Case/aksan duyarsız başlık araması

- Ürün başlığı ve IP bazlı filtre:
  - Başlık için Products ile aynı `normalizeText` yaklaşımı kullanılır:
    - `normalizeText(title).includes(normalizeText(search))`
  - IP adresinde doğrudan substring aranır:
    - `(visit.ip_address ?? '').includes(search)`
- Böylece hem ürün adına göre (case/aksan bağımsız), hem de IP parçasına göre arama yapılabilir.

### 3.3. Pagination

- Products ile aynı desen:
  - `PAGE_SIZE = 10`
  - `currentPage`, `totalPages`, `currentPageVisits`
  - Arama veya cihaz filtresi değiştiğinde `currentPage` 1’e sıfırlanır.
- Alt kısımda:
  - “Önceki” ve “Sonraki” butonları (disabled state’leriyle birlikte).
  - Ortada `"Sayfa {currentPage} / {totalPages}"` metni.

### 3.4. “Bulunamadı” durumu

- `filteredVisits.length === 0` ise:
  - Tablo gövdesinde tek bir satır, `colSpan={6}` ile tüm sütunları kaplar.
  - İçerik:
    - Ortalanmış bir kolon:
      - `SearchX` ikonu.
      - Altında **“Arama kriterlerinize uygun ziyaret bulunamadı.”** metni.
  - Böylece hem ürünler hem ziyaret tablosunda “bulunamadı” deneyimi görsel olarak aynı deseni izler.

