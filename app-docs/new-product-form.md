# Yeni Ürün Formu Tasarımı ve Davranışı (`NewProduct.jsx`)

Bu doküman, `Yeni Ürün` sayfasındaki formun tüm tasarım ve davranış detaylarını kapsar.

Dosya: `src/pages/NewProduct.jsx`

## Genel Amaç

Bu form, yeni bir ürünü QR sistemine eklemek için gerekli temel verileri toplar:

- Ürün başlığı
- Ürün açıklaması
- Kapak fotoğrafı (zorunlu)
- Alt fotoğraflar (dinamik, en az 1 zorunlu)
- YouTube videosu (opsiyonel, önizlemeli)
- PDF dokümanı (opsiyonel, seçilen dosya adı gösterilir)

Tasarım sade, modern ve shadcn/Tailwind uyumlu olacak şekilde oluşturuldu.

## Kullanılan Teknolojiler / Bileşenler

- `react-hook-form` → form state yönetimi ve performanslı render.
- `zod` + `@hookform/resolvers/zod` → schema tabanlı validasyon.
- `toast` (`sonner`) → kullanıcıya geri bildirim için toast mesajları.
- `PageHeader` → sayfa başlığı ve sağ üst aksiyon butonları.
- shadcn UI bileşenleri:
  - `Input`, `Textarea`, `Label`, `Button`, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger`.
- `lucide-react` ikonları (`Plus`, `Trash2`, `PlayCircle`).
- `framer-motion` (`AnimatePresence`, `motion`) → alt fotoğraf kartlarının eklenme/silinme animasyonları.

## Form Alanları ve Validasyon

Schema: `newProductSchema` (zod)

```ts
const newProductSchema = z
  .object({
    title: z.string().min(1, 'Ürün başlığı zorunludur.'),
    description: z
      .string()
      .min(10, 'Ürün açıklaması en az 10 karakter olmalıdır.'),
    youtube: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.youtube && !getYoutubeEmbedUrl(data.youtube)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['youtube'],
        message: 'Geçerli bir YouTube linki girin.',
      })
    }
  })
```

### Zorunlu Alanlar

- **Ürün başlığı**
  - Label: `Ürün başlığı *`
  - Validasyon: boş bırakılamaz.
  - Hata mesajı: alanın altında kırmızı küçük metin.

- **Ürün açıklaması**
  - Label: `Ürün açıklaması *`
  - Validasyon: en az 10 karakter.
  - Hata mesajı: alanın altında kırmızı küçük metin.

- **Kapak fotoğrafı**
  - Label: `Kapak fotoğrafı *`
  - Validasyon (manual, state bazlı):
    - `hasCoverFile` state’i ile takip ediliyor.
    - Dosya seçildiğinde `handleCoverChange` ile `hasCoverFile = true` ve `coverName` güncelleniyor.
    - Submit sırasında boşsa: `"Kapak fotoğrafı zorunludur."` mesajı gösteriliyor.

- **Alt fotoğraflar (en az 1)**
  - Label: `Alt fotoğraflar *`
  - Dinamik alan:
    - `altImages` state’i ile takip ediliyor (başlangıçta 2 satır).
    - `+` ikonu ile yeni kart ekleniyor.
  - Validasyon (manual, state bazlı):
    - Her file input change event’inde `hasAltFile = true` ve ilgili `altNames[id]` güncelleniyor.
    - Submit sırasında `hasAltFile === false` ise: `"En az bir alt fotoğraf zorunludur."` mesajı gösteriliyor.
    - Son görsel silinmek istenirse:
      - Silme işlemi iptal ediliyor.
      - `"En az bir alt fotoğraf gereklidir."` içerikli toast gösteriliyor.

### Opsiyonel Alanlar

- **YouTube linki**
  - Label: `YouTube linki`
  - Boş bırakılabilir.
  - Dolu ise `getYoutubeEmbedUrl` fonksiyonu ile parse edilip doğrulanıyor.
  - Geçerli değilse: `"Geçerli bir YouTube linki girin."` hata mesajı gösteriliyor.

- **PDF dokümanı**
  - Label: `PDF dokümanı`
  - Sadece bilgi amaçlı; şu an zorunlu değil ve schema’ya dahil değil.

## Görsel Alan Davranışları (Dosya Adı Gösterimi)

### Kapak Fotoğrafı

- Dosya seçildiğinde:
  - `coverName` state’i dosya adıyla güncelleniyor.
  - Dropzone içeriği, seçilen dosyanın adını gösteren bir preview metnine dönüşüyor:
    - “Seçilen dosya” başlığı.
    - `truncate` ile kısaltılmış dosya adı (`title` attribute ile tam ad).
    - Altında yine boyut/format tavsiyesi.

### Alt Fotoğraflar

- Her alt fotoğraf için ayrı bir `altNames[id]` kaydı tutuluyor.
- Dosya seçildiğinde:
  - `altNames[id] = file.name` olacak şekilde güncelleniyor.
  - Kartın ortasında:
    - “Seçilen dosya” + `truncate` edilmiş dosya adı gösteriliyor.
  - Dosya seçilmemiş kartlarda klasik “Alt görseli sürükleyip bırak / dosya seç” metni görünmeye devam ediyor.

### PDF Dokümanı

- `pdfName` state’i ile dosya adı tutuluyor.
- Bir PDF seçildiğinde:
  - “Seçilen dosya” başlığı + `truncate` edilmiş dosya adı gösteriliyor.
  - Altında boyut limiti bilgisi (`10MB`).
- PDF kaldırıldığında (yeni seçim yapılmadan input temizlenirse) veya form sıfırlanınca, alan eski placeholder metnine dönüyor.

## Alt Fotoğraflar: Animasyon ve Dinamik Yapı

- Alt görsel kartları `AnimatePresence` + `motion.div` ile animasyonlu:
  - Eklenirken: hafif scale + fade-in.
  - Silinirken: scale + fade-out.
  - `layout` prop’u sayesinde kartlar yeniden hizalanırken yumuşak animasyonla hareket ediyor.
- Silme davranışı:
  - Son kalan alt fotoğraf silinmek istendiğinde:
    - Silme engelleniyor.
    - Toast ile kullanıcı uyarılıyor (en az bir alt fotoğraf zorunlu).

## Form Submit ve Temizleme Davranışı

### `handleValidateAndSubmit`

1. `trigger()` ile tüm zod schema alanları validasyondan geçiyor.
2. Aynı anda:
   - `hasCoverFile` ve `hasAltFile` kontrol edilip `coverError`/`altError` güncelleniyor.
3. Eğer herhangi bir hata varsa, submit iptal ediliyor ve tüm hata mesajları aynı anda görünür oluyor.
4. Hata yoksa `getValues()` ile form verileri okunarak `onSubmit` fonksiyonuna aktarılıyor.

### `onSubmit`

- Şimdilik sadece:
  - `"Ürün kaydedildi."` başlıklı bir toast gösteriyor.
  - Verileri `console.log` ile yazdırıyor.

Bu noktada backend entegrasyonu eklendiğinde, `onSubmit` içine API çağrısı veya mutation logic’i yerleştirilebilir.

### `handleReset` (Temizle Butonu)

- `reset` ile:
  - `title`, `description`, `youtube` alanları boş string’e sıfırlanıyor.
- State temizlikleri:
  - `altImages` tekrar varsayılan `[ { id: 1 }, { id: 2 } ]` haline getiriliyor.
  - `hasCoverFile`, `hasAltFile` false’a çekiliyor.
  - `coverError`, `altError` temizleniyor.
  - `coverName`, `altNames`, `pdfName` sıfırlanıyor.
- Toast:

```ts
toast('Form temizlendi.', {
  description: 'Tüm alanlar varsayılan değerlere döndürüldü.',
})
```

## YouTube Önizleme Modali

- Input’un sağ tarafında, geçerli bir YouTube linki girildiğinde `PlayCircle` ikonlu bir buton beliriyor.
- Bu butona tıklanınca `Dialog` (shadcn UI) açılıyor:
  - Başlık: `"YouTube önizleme"`
  - İçeride `Iframe` ile embed edilmiş YouTube videosu:

```jsx
<iframe
  src={getYoutubeEmbedUrl(youtubeUrl) ?? ''}
  title='YouTube video preview'
  className='h-full w-full'
  allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
  allowFullScreen
/>
```

## Özet

Yeni Ürün formu, sadece temel alanlara sahip basit bir form olmaktan çıkıp:

- Dinamik görsel alanları,
- Dosya adı bazlı kullanıcı dostu geri bildirim,
- Gelişmiş validasyon (zod + react-hook-form),
- Kullanışlı toast mesajları,
- Ve modern bir YouTube önizleme modali

ile zenginleştirilmiş, gerçek bir üretim seviyesi form haline getirildi. Bu doküman, ileride benzer formlar oluştururken referans alınabilecek kapsamlı bir örnek sunar.

