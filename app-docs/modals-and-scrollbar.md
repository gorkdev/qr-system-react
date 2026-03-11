# Modaller, Animasyonlar ve Scrollbar Tasarımı

Bu doküman, projedeki modal (dialog) davranışlarını, YouTube önizleme modali için yaptığımız özelleştirmeleri ve global scrollbar tasarımını açıklar.

## YouTube Önizleme Modali

### Konsept

Yer: `Yeni Ürün` sayfasındaki YouTube linki alanı (`src/pages/NewProduct.jsx`).

Davranış:

- Kullanıcı geçerli bir YouTube linki girdiğinde:
  - Input’un sağ tarafında küçük bir `PlayCircle` ikonlu buton beliriyor.
- Bu butona tıklanınca:
  - Shadcn `Dialog` bileşeni ile açılan bir modal içinde, YouTube videosunun embed edilmiş önizlemesi gösteriliyor.

### Embed URL Üretimi

Fonksiyon: `getYoutubeEmbedUrl`

Amaç:

- Hem `https://www.youtube.com/watch?v=...`
- Hem `https://youtu.be/...`
- Hem de `/embed/...` formatlarını desteklemek.

Çalışma:

- URL parse edilir, host `youtube.com`, `m.youtube.com` veya `youtu.be` ise video ID çekilir.
- Geçersiz link olması durumunda `null` döner:
  - Bu hem validasyonda (zod `superRefine`) hem de ikonun gösterilip gösterilmemesinde kullanılır.

### Dialog Kullanımı

Dosya: `src/components/ui/dialog.jsx`

Bileşenler:

- `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogOverlay`, `DialogClose`, `DialogFooter`, `DialogDescription`

YouTube inputu yanında:

```jsx
{getYoutubeEmbedUrl(youtubeUrl) && (
  <Dialog>
    <DialogTrigger asChild>
      <button ...>
        <PlayCircle ... />
      </button>
    </DialogTrigger>
    <DialogContent className='sm:max-w-xl'>
      <DialogHeader>
        <DialogTitle>YouTube önizleme</DialogTitle>
      </DialogHeader>
      <div className='mt-2 aspect-video w-full overflow-hidden rounded-md bg-muted'>
        <iframe
          src={getYoutubeEmbedUrl(youtubeUrl) ?? ''}
          ...
        />
      </div>
    </DialogContent>
  </Dialog>
)}
```

### Dialog Tasarımı ve Animasyonları

`DialogOverlay`:

```jsx
<DialogPrimitive.Overlay
  data-slot='dialog-overlay'
  className={cn(
    'fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
    className
  )}
/>
```

- Arka plan:
  - `bg-black/50` → yarı opak siyah, sade ve net bir dimming efekti.
- Animasyon:
  - `animate-in fade-in-0` (açılışta yumuşak fade-in),
  - `animate-out fade-out-0` (kapanışta fade-out).

`DialogContent`:

```jsx
<DialogPrimitive.Content
  data-slot='dialog-content'
  className={cn(
    'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-background p-4 text-sm outline-none sm:max-w-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
    className
  )}
  {...props}
>
  ...
</DialogPrimitive.Content>
```

- Konumlandırma:
  - Tam ekran ortasında (`top-1/2 left-1/2 translate` kombinasyonu).
  - Maksimum genişlik `sm:max-w-xl` ile kontrol ediliyor.
- Animasyon:
  - Açılışta: `fade-in-0` + `zoom-in-95` (hafif bir zoom-in efekti),
  - Kapanışta: `fade-out-0` + `zoom-out-95`.

Amaç:

- Fazla agresif olmayan, ama net bir “açılıyor/kapanıyor” hissiyatı vermek.
- EKSTRA shadow/blur yerine sadelik ve okunabilirlik odaklı.

## Global Scrollbar Tasarımı

Dosya: `src/index.css`

Amaç:

- Tarayıcı varsayılan scrollbar’ı yerine:
  - İnce,
  - Modern,
  - Açık/koyu tema ile uyumlu,
  - Gözükmesi net ama dikkat dağıtmayan bir scrollbar elde etmek.

### Firefox

```css
* {
  scrollbar-width: thin;
  scrollbar-color: #9ca3af transparent; /* Tailwind zinc-400 */
}
```

- `thin` ile daha ince scrollbar.
- Renk: `#9ca3af` (zinc-400) → açık tema için dengeli bir gri.

### WebKit (Chrome, Edge, Safari)

```css
*::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: content-box;
  background-color: #9ca3af; /* zinc-400 */
}

*::-webkit-scrollbar-thumb:hover {
  background-color: #4b5563; /* zinc-600 */
}
```

- Track her zaman transparan: arka planın kendisi görünür.
- Thumb:
  - 8px genişlik/yükseklik, `999px` radius ile tamamen yuvarlak.
  - `border: 2px solid transparent` + `background-clip: content-box` ile ortada ince bir çubuk görünümü.
  - Normalde zinc-400 (`#9ca3af`), hover’da zinc-600 (`#4b5563`) → daha koyu, net bir görünüm.

Bu haliyle:

- Scrollbar tüm sayfalarda ve modallerde modern ve tutarlı görünüyor.
- Renkler shadcn’in light/dark paletiyle uyumlu olacak şekilde gri tonlarda seçildi.
- Kullanıcı deneyimini bozmadan (çok kalın veya çok parlak olmadan) iyi bir görünürlük sağlanıyor.

