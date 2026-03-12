# Proje Dokümantasyonu Genel Bakış (Akcan Grup QR Yönetim Paneli)

Bu klasör, projede birlikte yaptığımız UI/UX ve front-end geliştirmelerini detaylı şekilde özetlemek için oluşturuldu. Her `.md` dosyası belirli bir konuya odaklanıyor; böylece hem kendin hem de ileride projeye katılacak başka geliştiriciler, neyin neden ve nasıl yapıldığını kolayca takip edebilir.

## İçerik Başlıkları

- `layout-and-navigation.md`  
  Genel layout, sidebar yapısı, sayfa ismi ve URL mimarisi.

- `page-header-and-actions.md`  
  Tüm sayfalarda kullanılan ortak header bileşeni (`PageHeader`) ve global aksiyon butonları.

- `new-product-form.md`  
  Yeni Ürün formunun tasarımı, alanları, dinamik alt görseller, PDF ve YouTube önizleme özellikleri.

- `validation-and-feedback.md`  
  `react-hook-form + zod` ile validasyon, toast mesajlar ve hata gösterim stratejisi.

- `modals-and-scrollbar.md`  
  YouTube önizleme modali, dialog animasyonları ve global scrollbar tasarımı.

- `qr-flow-and-analytics.md`  
  QR üretimi ve `qr_token` mimarisi, ürün detay sayfası, ziyaret kayıtları (`visits` tablosu) ve dashboard/ürünler sekmesindeki istatistikler.

- `product-public-and-admin-tweaks.md`  
  Public ürün detay sayfası açılış overlay’i, dinamik başlık, admin ürünler ve ziyaret geçmişi tablolarında arama/pagination/bulunamadı UX iyileştirmeleri.

Her dosya, hem teknik olarak hangi bileşenlerin/araçların kullanıldığını, hem de tasarım kararlarının arkasındaki mantığı anlatır.

