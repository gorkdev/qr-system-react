# Layout ve Navigasyon Yapısı

Bu doküman, admin panelinin temel layout'unu, sidebar navigasyonunu ve sayfa/URL mimarisini özetler.

## Genel Layout

- Ana layout bileşeni: `AdminShell` (`src/components/layout/AdminShell.jsx`)
- Yapı:
  - Sol tarafta tam yükseklikte sabit bir sidebar.
  - Sağ tarafta, tüm sayfaların içeriklerini taşıyan ana içerik alanı.
- Tasarım:
  - Light theme odaklı, `bg-background`, `text-foreground` ve `bg-muted/30` gibi shadcn uyumlu Tailwind utility sınıfları kullanılıyor.
  - İçerik alanı maksimum genişlikte (`max-w-6xl`) ama tüm viewport yüksekliğini dolduracak şekilde ayarlandı.

## Sidebar

Dosya: `src/components/navigation/Sidebar.jsx`

- Sol tarafta sabit, `md` breakpoint’ten itibaren görünen bir sidebar.
- Markalama:
  - Üstte marka adı: **Akcan Grup**
  - Minimal tipografi: `text-xl font-semibold tracking-wide`
- Linkler (navItems):
  - **Genel** → `/genel`
  - **İstatistikler** → `/istatistikler`
  - **Ürünler** → `/urunler`
  - **Yeni Ürün** → `/yeni-urun`
  - **Ayarlar** → `/ayarlar`
- Aktif link:
  - `NavLink` ile `isActive` kontrol ediliyor.
  - Aktif durumda: `bg-primary/10 text-primary`
  - Hover durumunda: `hover:bg-muted hover:text-foreground`
- Alt kısım (auth bilgisi):
  - `admin` badge (`Badge` bileşeni) ve `Çıkış yap` butonu (`variant='destructive'`) ile basit bir oturum durumu gösterimi var.

## Router Yapısı

Dosya: `src/App.jsx`

```jsx
<Routes>
  <Route path='/' element={<Navigate to='/genel' replace />} />
  <Route path='/genel' element={<Dashboard />} />
  <Route path='/istatistikler' element={<Stats />} />
  <Route path='/urunler' element={<Products />} />
  <Route path='/yeni-urun' element={<NewProduct />} />
  <Route path='/ayarlar' element={<Settings />} />
</Routes>
```

- Kök `/` adresi otomatik olarak `/genel` sayfasına yönlendiriliyor.
- Tüm sayfalar `AdminShell` içerisinde render ediliyor; böylece layout tek bir noktadan yönetiliyor.

## URL ve İsimlendirme Kararları

- URL’ler tamamen Türkçe ve sade tutuldu:
  - `/genel`, `/istatistikler`, `/urunler`, `/yeni-urun`, `/ayarlar`
- Sidebar’da görünen isimler de aynı dil ve tonla eşleşiyor.
- Bu yaklaşım:
  - Paneli kullanan kişi için daha anlaşılır bir bilgi mimarisi sağlıyor.
  - SEO kritik olmadığı için (admin paneli), URL’lerin Türkçe olması bir problem oluşturmuyor.

