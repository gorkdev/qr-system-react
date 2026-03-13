import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useParams } from 'react-router-dom'
import { PlayCircle, FileText, ZoomIn, ArrowUpRight } from 'lucide-react'
import PdfPages from '@/components/PdfPages'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const getYoutubeEmbedUrl = (url) => {
  if (!url) return null

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace('www.', '')

    if (hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1)
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      const v = parsed.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`

      const parts = parsed.pathname.split('/')
      const embedIndex = parts.indexOf('embed')
      if (embedIndex !== -1 && parts[embedIndex + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIndex + 1]}`
      }
    }

    return null
  } catch {
    return null
  }
}

const ProductPublic = () => {
  const { token } = useParams()
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [productInactive, setProductInactive] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [progress, setProgress] = useState(1)
  const [qrEnabled, setQrEnabled] = useState(true)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [closedLang, setClosedLang] = useState('tr')

  useEffect(() => {
    if ((!qrEnabled && !settingsLoading) || productInactive) {
      document.title = 'Şu anda kullanıma kapalı | Ürün Detayı'
    } else if (product?.title) {
      document.title = `${product.title} | Ürün Detayı`
    } else if (error) {
      document.title = 'Ürün bulunamadı | Ürün Detayı'
    } else {
      document.title = 'Ürün yükleniyor... | Ürün Detayı'
    }
  }, [product?.title, error, qrEnabled, settingsLoading, productInactive])

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
        const response = await fetch(
          `${API_BASE_URL}/api/products/token/${token}`,
          {
            headers: {
              Accept: 'application/json',
            },
          },
        )

        if (!response.ok) {
          throw new Error('Ürün bulunamadı veya pasif durumda.')
        }

        const data = await response.json()

        if (data?.inactive) {
          setProductInactive(true)
          return
        }

        setProduct(data)
      } catch (err) {
        console.error('Ürün yüklenirken hata oluştu', err)
        setError(
          err?.message || 'Ürün bilgileri yüklenirken bir hata oluştu.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      fetchProduct()
    }
  }, [token])

  // Site ayarlarını (QR okunabilirliği) yükle
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setSettingsLoading(true)
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
        const res = await fetch(`${API_BASE_URL}/api/site-settings`, {
          headers: {
            Accept: 'application/json',
          },
        })
        if (!res.ok) {
          throw new Error('Site ayarları yüklenirken bir hata oluştu.')
        }
        const data = await res.json()
        const enabled = !!(data?.qr_enabled ?? data?.data?.qr_enabled ?? true)
        setQrEnabled(enabled)
      } catch (err) {
        console.error('Site ayarları yüklenemedi', err)
        setQrEnabled(true)
      } finally {
        setSettingsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  // Geri sayım başladığında sürekli azalan bar animasyonu başlat
  useEffect(() => {
    if (countdown !== 5) return
    setProgress(1)
    const frameId = window.requestAnimationFrame(() => {
      setProgress(0)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [countdown])

  // İlk açılışta 5'ten geriye sayım (token değiştikçe resetlenir)
  useEffect(() => {
    setCountdown(5)
    const intervalId = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [token])

  // Ürün yüklendiğinde arkaplanda ziyaret kaydı oluştur
  useEffect(() => {
    const recordVisit = async () => {
      if (!product?.id || !qrEnabled || productInactive) return

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
  }, [product?.id, qrEnabled, productInactive])

  const getPublicUrl = (path) => {
    if (!path) return null
    // PDF ve görseller için relative URL kullanıyoruz; Vite dev server
    // /storage isteklerini backend'e proxy'liyor.
    return `/storage/${path}`
  }

  const coverUrl = product ? getPublicUrl(product.cover_image_path) : null
  const altImages = Array.isArray(product?.alt_image_paths)
    ? product.alt_image_paths
    : []
  const pdfUrl = product ? getPublicUrl(product.pdf_path) : null
  const youtubeEmbed = product ? getYoutubeEmbedUrl(product.youtube_url) : null

  return (
    <div
      className={`relative h-dvh overflow-y-scroll bg-background px-4 py-6 text-foreground ${countdown > 0 ? 'pointer-events-none' : ''
        }`}
    >
      {error ? (
        <div className='flex h-full items-center justify-center'>
          <div className='flex flex-col items-center gap-4 px-4 text-center'>
            <h1 className='text-lg font-semibold'>Ürün Bulunamadı</h1>
            <p className='max-w-md text-sm text-muted-foreground'>
              Aradığınız ürünü bulamadık, silinmiş veya gösterimden kaldırılmış olabilir.
            </p>
          </div>
        </div>
      ) : (!qrEnabled && !settingsLoading) || productInactive ? (
        <div className='flex h-full items-center justify-center'>
          <div className='flex flex-col items-center gap-4 px-4 text-center'>
            <div className='inline-flex items-center gap-2 rounded-full border bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground'>
              <button
                type='button'
                onClick={() => setClosedLang('tr')}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition ${closedLang === 'tr'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'opacity-70 hover:opacity-100'
                  }`}
              >
                <span>TR</span>
              </button>
              <button
                type='button'
                onClick={() => setClosedLang('en')}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition ${closedLang === 'en'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'opacity-70 hover:opacity-100'
                  }`}
              >
                <span>EN</span>
              </button>
            </div>
            {closedLang === 'tr' ? (
              <>
                <h1 className='text-lg font-semibold'>Ürün Bulunamadı</h1>
                <p className='max-w-md text-sm text-muted-foreground'>
                  Aradığınız ürünü bulamadık, silinmiş veya gösterimden kaldırılmış olabilir.
                </p>
              </>
            ) : (
              <>
                <h1 className='text-lg font-semibold'>Product Not Found</h1>
                <p className='max-w-md text-sm text-muted-foreground'>
                  The product you are looking for could not be found. It may have been removed or taken off display.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
      <div className='mx-auto flex w-full max-w-4xl flex-col gap-5'>
        <div className='overflow-hidden rounded-2xl border bg-card'>
          {!product ? (
            <div className='px-4 py-10 text-center text-sm text-muted-foreground'>
              Ürün bilgileri yükleniyor...
            </div>
          ) : (
            <>
              {youtubeEmbed && (
                <div className='w-full overflow-hidden bg-black/70'>
                  <div className='aspect-video w-full'>
                    <iframe
                      src={youtubeEmbed}
                      title='YouTube video'
                      className='h-full w-full'
                      allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {coverUrl && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type='button'
                      className={`group relative w-full overflow-hidden border-b bg-black/60 ${youtubeEmbed ? 'mt-3' : ''
                        }`}
                    >
                      {/* Arka plan katmanı - tüm alanı kaplar, düşük opacity */}
                      <div className='pointer-events-none absolute inset-0 opacity-35'>
                        <img
                          src={coverUrl}
                          alt={product.title}
                          className='h-full w-full object-cover blur-sm'
                        />
                      </div>

                      {/* Ön plan katmanı - tam görsel, kırpılmadan */}
                      <div className='relative z-10 flex items-center justify-center px-4 py-4'>
                        <img
                          src={coverUrl}
                          alt={product.title}
                          className='max-h-[260px] w-auto rounded-xl border border-white/20 bg-black/40 object-contain'
                        />
                      </div>

                      {/* Hover'da büyüteç overlay */}
                      <div className='pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100'>
                        <div className='flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white'>
                          <ZoomIn className='h-3.5 w-3.5' />
                          <span>Büyütmek için tıklayın</span>
                        </div>
                      </div>
                    </button>
                  </DialogTrigger>
                  <DialogContent className='sm:max-w-xl'>
                    <DialogHeader>
                      <DialogTitle>{product.title}</DialogTitle>
                    </DialogHeader>
                    <div className='mt-2 flex items-center justify-center'>
                      <img
                        src={coverUrl}
                        alt={product.title}
                        className='max-h-[480px] max-w-full rounded-md'
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <div className='space-y-5 px-4 py-5'>
                <div className='space-y-3'>
                  <h1 className='border-b pb-3 text-xl font-semibold leading-snug tracking-tight md:text-2xl'>
                    {product.title}
                  </h1>
                  <div
                    className='prose prose-sm max-w-none text-foreground md:prose-base'
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                </div>

                {altImages.length > 0 && (
                  <div className='space-y-2'>
                    <p className='text-xs font-medium text-muted-foreground'>
                      Ek görseller
                    </p>
                    <div className='grid grid-cols-3 gap-2'>
                      {altImages.map((path, index) => {
                        const url = getPublicUrl(path)
                        if (!url) return null
                        return (
                          <Dialog key={path}>
                            <DialogTrigger asChild>
                              <button
                                type='button'
                                className='group relative overflow-hidden rounded-lg'
                              >
                                <img
                                  src={url}
                                  alt={`${product.title} alt görsel ${index + 1}`}
                                  className='aspect-square w-full object-contain'
                                />
                                <div className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100'>
                                  <div className='rounded-full bg-black/70 p-1.5 text-white'>
                                    <ZoomIn className='h-3.5 w-3.5' />
                                  </div>
                                </div>
                              </button>
                            </DialogTrigger>
                            <DialogContent className='sm:max-w-xl'>
                              <DialogHeader>
                                <DialogTitle>{product.title}</DialogTitle>
                              </DialogHeader>
                              <div className='mt-2 flex items-center justify-center'>
                                <img
                                  src={url}
                                  alt={`${product.title} alt görsel ${index + 1}`}
                                  className='max-h-[480px] max-w-full rounded-md'
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        )
                      })}
                    </div>
                  </div>
                )}

                {pdfUrl && (
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between text-sm font-medium'>
                      <div className='flex items-center gap-2'>
                        <FileText className='h-4 w-4 text-primary' />
                        <span>Doküman</span>
                      </div>
                      <a
                        href={pdfUrl}
                        target='_blank'
                        rel='noreferrer'
                        className='inline-flex items-center gap-1 text-xs font-normal text-muted-foreground hover:text-primary underline'
                      >
                        <span>Yeni sekmede aç</span>
                        <ArrowUpRight className='h-3 w-3' />
                      </a>
                    </div>
                    <div className='flex justify-center'>
                      <PdfPages pdfUrl={pdfUrl} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {countdown > 0 && (
        <div className='pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-white transition-opacity'>
          <div className='pointer-events-auto flex flex-col items-center gap-5 text-center'>
            <span className='text-[11px] font-semibold tracking-[0.3em] text-neutral-900'>
              AKCAN GRUP
            </span>
            <div className='flex flex-col items-center gap-3'>
              <div className='relative h-2 w-56 overflow-hidden rounded-full bg-neutral-100'>
                <div
                  className='absolute inset-0 rounded-full bg-neutral-900 origin-left transition-transform duration-[5000ms] ease-linear'
                  style={{
                    transform: `scaleX(${progress})`,
                  }}
                />
              </div>
              <span className='text-[11px] text-neutral-500'>
                Yönlendiriliyorsunuz...
              </span>
              <div className='h-10 overflow-hidden'>
                <AnimatePresence mode='popLayout' initial={false}>
                  <motion.span
                    key={countdown}
                    initial={{ y: -20, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 20, opacity: 0, scale: 0.98 }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 22,
                    }}
                    className='block text-3xl font-semibold tabular-nums text-neutral-900'
                  >
                    {countdown}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductPublic

