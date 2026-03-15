# Proje Dokümantasyonu – Genel Bakış (Akcan Grup QR Yönetim Paneli)

Bu klasör, projedeki UI/UX ve teknik kararları özetleyen dokümanları içerir. Her `.md` dosyası belirli bir konuya odaklanır; hem sen hem de ileride projeye katılacak geliştiriciler neyin neden ve nasıl yapıldığını takip edebilir.

---

## İçerik listesi

| Dosya | Konu |
|-------|------|
| `layout-and-navigation.md` | Genel layout, sidebar, sayfa isimleri ve URL yapısı. Giriş, korumalı ve public route’lar. |
| `page-header-and-actions.md` | Ortak `PageHeader` bileşeni ve global aksiyon butonları. |
| `new-product-form.md` | Yeni Ürün formu: alanlar, alt görseller, PDF/YouTube önizleme. |
| `validation-and-feedback.md` | react-hook-form + zod validasyonu, toast ve hata gösterimi. |
| `modals-and-scrollbar.md` | Modallar, dialog animasyonları, global scrollbar. |
| `qr-flow-and-analytics.md` | QR üretimi, `qr_token` mimarisi, ürün detay sayfası, ziyaret kayıtları ve istatistikler. |
| `product-public-and-admin-tweaks.md` | Public ürün sayfası overlay, admin tablolarında arama / pagination / “bulunamadı” UX. |
| `site-settings-and-dashboard-metrics.md` | Site QR ayarı (backend + frontend), Dashboard tarama metrikleri (günlük / haftalık / aylık). |
| `soft-delete-trash-products.md` | Ürün soft-delete, 30 günlük çöp kutusu, geri getir, purge (kalıcı silme) ve zamanlanmış görev. |
| `activity-logs-and-history.md` | Admin işlemleri için otomatik loglama (İşlem Geçmişi), backend kayıt yapısı ve admin tablosu. |

---

## Teknik özet

- **Auth:** Panel rotaları `ProtectedRoute` ile korunur; API’de Laravel Sanctum (`auth:sanctum`). Giriş sayfası `/giris-yap`, public ürün sayfaları `/p/:token` ve `/qr/:token` auth gerektirmez.
- **CRUD ve yönetim:** Ürün ekleme, silme, güncelleme, çöp kutusu, ayar güncelleme gibi tüm yönetim endpoint’leri token ile korunur.
- Dokümanlarda geçen bileşen yolları (`src/...`) frontend’e, migration/controller yolları backend’e aittir.
