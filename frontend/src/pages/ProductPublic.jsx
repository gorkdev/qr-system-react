import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PlayCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  // Ürün yüklendiğinde arkaplanda ziyaret kaydı oluştur
  useEffect(() => {
    const recordVisit = async () => {
      if (!product?.id) return

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
  }, [product?.id])

  const getPublicUrl = (path) => {
    if (!path) return null
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
    return `${API_BASE_URL}/storage/${path}`
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-background px-4 py-10 text-foreground'>
        <div className='mx-auto max-w-md text-center text-sm text-muted-foreground'>
          Ürün bilgileri yükleniyor...
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className='min-h-screen bg-background px-4 py-10 text-foreground'>
        <div className='mx-auto max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm'>
          <h1 className='text-lg font-semibold'>Ürün bulunamadı</h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            Ürün pasif durumda olabilir veya bağlantı geçersiz.
          </p>
        </div>
      </div>
    )
  }

  const coverUrl = getPublicUrl(product.cover_image_path)
  const altImages = Array.isArray(product.alt_image_paths)
    ? product.alt_image_paths
    : []
  const pdfUrl = getPublicUrl(product.pdf_path)
  const youtubeEmbed = getYoutubeEmbedUrl(product.youtube_url)

  return (
    <div className='min-h-screen bg-background px-4 py-6 text-foreground'>
      <div className='mx-auto flex w-full max-w-xl flex-col gap-5'>
        {youtubeEmbed && (
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <PlayCircle className='h-4 w-4 text-primary' />
              <span>Tanıtım videosu</span>
            </div>
            <div className='aspect-video w-full overflow-hidden rounded-2xl bg-muted shadow-sm'>
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

        <div className='overflow-hidden rounded-2xl border bg-card shadow-sm'>
          <div className='border-b bg-muted/60 px-4 py-3'>
            <h1 className='text-base font-semibold leading-tight'>
              {product.title}
            </h1>
          </div>

          {coverUrl && (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type='button'
                  className='w-full overflow-hidden border-b bg-black/5'
                >
                  <img
                    src={coverUrl}
                    alt={product.title}
                    className='aspect-video w-full object-cover'
                  />
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
                    className='max-h-[480px] max-w-full rounded-md border bg-muted'
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}

          <div className='space-y-4 px-4 py-4'>
            <div className='space-y-1.5'>
              <p className='text-xs font-medium text-muted-foreground'>
                Ürün açıklaması
              </p>
              <p className='text-sm leading-relaxed text-foreground'>
                {product.description}
              </p>
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
                            className='overflow-hidden rounded-lg border bg-muted'
                          >
                            <img
                              src={url}
                              alt={`${product.title} alt görsel ${index + 1}`}
                              className='aspect-square w-full object-cover'
                            />
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
                              className='max-h-[480px] max-w-full rounded-md border bg-muted'
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
                <div className='flex items-center gap-2 text-sm font-medium'>
                  <FileText className='h-4 w-4 text-primary' />
                  <span>Doküman</span>
                </div>
                <Button asChild variant='outline' size='sm' className='gap-2'>
                  <a href={pdfUrl} target='_blank' rel='noreferrer'>
                    PDF&apos;i aç
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductPublic

