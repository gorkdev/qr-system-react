# Ortak Sayfa Başlığı ve Aksiyonlar (`PageHeader`)

Bu doküman, tüm sayfalarda kullandığımız ortak header bileşeni olan `PageHeader` ve sağ üstteki global aksiyon butonlarının yapısını açıklar.

## Bileşen: `PageHeader`

Dosya: `src/components/ui/page-header.jsx`

### Props

- `title: string`  
  Sayfa başlığı. Örnek: `"Genel"`, `"Yeni Ürün"`, `"Ürünler"`.

- `description?: string`  
  Başlığın altındaki kısa açıklama. Tüm sayfalarda genellikle şu metin kullanıldı:

  > Sistem durumunu, QR performansını ve temel metrikleri buradan takip edebilirsin.

- `primaryText?: ReactNode` (varsayılan: `"Kaydet"`)
  Sağ üstteki ana aksiyon butonunun etiketi. Gerektiğinde ikonlu yapı da verilebilir (Dashboard sayfasında `Yeni QR oluştur + ArrowUpRight` gibi).

- `secondaryText?: string` (varsayılan: `"Taslak olarak kaydet"`)
  İkincil aksiyon butonunun etiketi. Örneğin:
  - Dashboard: `"Raporları dışa aktar"`
  - Yeni Ürün: `"Temizle"`

- `onPrimaryClick?: () => void`  
  Birincil butonun `onClick` handler’ı. Genellikle form submit veya önemli bir aksiyon tetikliyor.

- `onSecondaryClick?: () => void`  
  İkincil butonun `onClick` handler’ı. Örneğin Yeni Ürün sayfasında formu temizlemek için kullanılıyor.

- `className?: string`  
  Dış wrapper için ek Tailwind sınıfları eklemek için.

### Layout

```jsx
<div className={cn("relative mb-6 flex justify-between items-center", className)}>
  <div className='flex flex-col gap-1'>
    <h1 className='text-xl font-semibold tracking-tight sm:text-2xl'>
      {title}
    </h1>
    {description && (
      <p className='text-sm text-muted-foreground'>
        {description}
      </p>
    )}
  </div>

  <div className='fixed top-6 right-6 z-50 flex gap-2 sm:right-10'>
    {onSecondaryClick && (
      <Button ...>{secondaryText}</Button>
    )}
    <Button ...>{primaryText}</Button>
  </div>
</div>
```

- Sol tarafta başlık ve açıklama.
- Sağ üstte, viewport’a göre **sabitleştirilmiş** bir aksiyon buton grubu:
  - Bu sayede sayfa aşağı scroll edilse bile aksiyon butonları her zaman görünür kalıyor.
  - Hem desktop hem de daha dar ekranlarda sağ üst köşede konumlandırıldı (`right-6`, `sm:right-10`).

## Sayfalardaki Kullanım Örnekleri

### Dashboard (`src/pages/Dashboard.jsx`)

```jsx
<PageHeader
  title='Genel'
  description='Sistem durumunu, QR performansını ve temel metrikleri buradan takip edebilirsin.'
  primaryText={
    <span className='flex items-center gap-1.5'>
      Yeni QR oluştur
      <ArrowUpRight className='h-3.5 w-3.5' />
    </span>
  }
  secondaryText='Raporları dışa aktar'
  onPrimaryClick={() => console.log('Yeni QR oluştur')}
  onSecondaryClick={() => console.log('Raporları dışa aktar')}
/>
```

### İstatistikler (`src/pages/Stats.jsx`)

```jsx
<PageHeader
  title='İstatistikler'
  description='Sistem durumunu, QR performansını ve temel metrikleri buradan takip edebilirsin.'
  primaryText='Rapor oluştur'
  secondaryText='Tarih aralığı'
  onPrimaryClick={() => console.log('Rapor oluştur')}
  onSecondaryClick={() => console.log('Tarih aralığı seç')}
/>
```

### Ürünler (`src/pages/Products.jsx`)

```jsx
<PageHeader
  title='Ürünler'
  description='Sistem durumunu, QR performansını ve temel metrikleri buradan takip edebilirsin.'
  primaryText='Yeni ürün'
  secondaryText='Filtreler'
  onPrimaryClick={() => console.log('Yeni ürün')}
  onSecondaryClick={() => console.log('Filtreler aç')}
/>
```

### Ayarlar (`src/pages/Settings.jsx`)

```jsx
<PageHeader
  title='Ayarlar'
  description='Sistem durumunu, QR performansını ve temel metrikleri buradan takip edebilirsin.'
  primaryText='Değişiklikleri kaydet'
  secondaryText='Varsayılanlara dön'
  onPrimaryClick={() => console.log('Değişiklikleri kaydet')}
  onSecondaryClick={() => console.log('Varsayılanlara dön')}
/>
```

### Yeni Ürün (`src/pages/NewProduct.jsx`)

```jsx
<PageHeader
  title='Yeni Ürün'
  description='Sistem durumunu, QR performansını ve temel metrikleri buradan takip edebilirsin.'
  primaryText='Ürünü oluştur'
  secondaryText='Temizle'
  onPrimaryClick={handleValidateAndSubmit}
  onSecondaryClick={handleReset}
/>
```

Burada:
- `handleValidateAndSubmit`: `react-hook-form + zod` validasyonunu ve görsel alan (kapak foto, alt foto) kontrollerini tetikliyor.
- `handleReset`: Formu, alt görselleri, dosya isimlerini ve hata mesajlarını sıfırlayıp bir “Form temizlendi” toast’ı gösteriyor.

## Tasarım Kararları

- **Sabit aksiyonlar:**  
  Admin panellerde kullanıcılar formun ortasındayken bile hızlı kaydet/temizle işlemi yapmak istiyor. Bu nedenle aksiyon butonlarının tüm sayfalarda sağ üstte, viewport’a göre sabit kalması tercih edildi.

- **Yeniden kullanılabilirlik:**  
  Başlık/açıklama + aksiyon yapısı, tüm sayfalarda tekrar eden bir pattern olduğu için tek bir `PageHeader` bileşenine çekildi. Böylece:
  - Yeni sayfa eklemek çok hızlı.
  - Tasarım değişiklikleri tek noktadan yapılabiliyor.

