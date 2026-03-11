import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Trash2, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import PageHeader from '@/components/ui/page-header'

const getYoutubeEmbedUrl = url => {
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

const NewProduct = () => {
  const [altImages, setAltImages] = useState([{ id: 1 }, { id: 2 }])
  const [hasCoverFile, setHasCoverFile] = useState(false)
  const [hasAltFile, setHasAltFile] = useState(false)
  const [coverError, setCoverError] = useState('')
  const [altError, setAltError] = useState('')
  const [coverName, setCoverName] = useState('')
  const [altNames, setAltNames] = useState({})
  const [pdfName, setPdfName] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    getValues,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(newProductSchema),
    defaultValues: {
      title: '',
      description: '',
      youtube: '',
    },
  })

  const youtubeUrl = watch('youtube')

  const handleAddAltImage = () => {
    setAltImages(prev => [...prev, { id: prev.length + 1 }])
  }

  const handleRemoveAltImage = id => {
    if (altImages.length <= 1) {
      toast('En az bir alt fotoğraf gereklidir.', {
        description: 'Lütfen en az bir alt görsel bırakarak düzenlemeye devam edin.',
      })
      return
    }

    setAltImages(prev => prev.filter(img => img.id !== id))
  }

  const handleCoverChange = e => {
    const file = e.target.files && e.target.files[0]
    if (file) {
      setHasCoverFile(true)
      setCoverError('')
      setCoverName(file.name)
    } else {
      setHasCoverFile(false)
      setCoverName('')
    }
  }

  const handleAltFileChange = (e, id) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    setHasAltFile(true)
    setAltError('')
    setAltNames(prev => ({
      ...prev,
      [id]: file.name,
    }))
  }

  const handleReset = () => {
    reset({
      title: '',
      description: '',
      youtube: '',
    })
    setAltImages([{ id: 1 }, { id: 2 }])
    setHasCoverFile(false)
    setHasAltFile(false)
    setCoverError('')
    setAltError('')
    setCoverName('')
    setAltNames({})
    setPdfName('')
    toast('Form temizlendi.', {
      description: 'Tüm alanlar varsayılan değerlere döndürüldü.',
    })
  }

  const onSubmit = data => {
    toast('Ürün kaydedildi.', {
      description: 'Form doğrulamadan başarıyla geçti.',
    })
    console.log('New product submit', data)
  }

  const handleValidateAndSubmit = async () => {
    const fieldsValid = await trigger()
    let hasError = !fieldsValid

    if (!hasCoverFile) {
      setCoverError('Kapak fotoğrafı zorunludur.')
      hasError = true
    } else {
      setCoverError('')
    }

    if (!hasAltFile) {
      setAltError('En az bir alt fotoğraf zorunludur.')
      hasError = true
    } else {
      setAltError('')
    }

    if (hasError) return

    const data = getValues()
    onSubmit(data)
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Yeni Ürün'
        description={"Bu sayfada yeni bir ürün oluşturabilirsiniz."}
        primaryText='Ürünü oluştur'
        secondaryText='Temizle'
        onPrimaryClick={handleValidateAndSubmit}
        onSecondaryClick={handleReset}
      />

      <form
        className='w-full space-y-6 pt-3 md:w-1/2'
        onSubmit={e => {
          e.preventDefault()
          handleValidateAndSubmit()
        }}
      >
        <div className='space-y-1.5'>
          <Label htmlFor='title'>
            Ürün başlığı <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='title'
            placeholder='Örn. Akcan Grup Özel QR Menü'
            {...register('title')}
          />
          {errors.title && (
            <p className='text-xs text-destructive'>
              {errors.title.message}
            </p>
          )}
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='description'>
            Ürün açıklaması <span className='text-destructive'>*</span>
          </Label>
          <Textarea
            id='description'
            placeholder='Ürünün detaylarını, öne çıkan özelliklerini ve kullanıldığı alanları açıklayın.'
            rows={4}
            {...register('description')}
          />
          {errors.description && (
            <p className='text-xs text-destructive'>
              {errors.description.message}
            </p>
          )}
        </div>

        <div className='space-y-6'>
          <div className='space-y-1'>
            <Label htmlFor='cover-image'>
              Kapak fotoğrafı <span className='text-destructive'>*</span>
            </Label>
            <div className='relative flex h-32 cursor-pointer items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 text-xs text-muted-foreground'>
              {coverName ? (
                <div className='max-w-full px-4 text-center text-xs text-foreground'>
                  <p className='font-medium'>Seçilen dosya</p>
                  <p className='mt-1 truncate text-[11px]' title={coverName}>
                    {coverName}
                  </p>
                  <p className='mt-1 text-[11px] text-muted-foreground'>
                    Önerilen boyut: 1200x630px. JPG veya PNG, en fazla 5MB.
                  </p>
                </div>
              ) : (
                <div className='space-y-1 text-center'>
                  <p className='text-sm font-medium text-foreground'>
                    Kapak görselini sürükleyip bırak
                  </p>
                  <p>
                    veya <span className='font-medium text-primary'>dosya seç</span>
                  </p>
                  <p className='text-[11px]'>
                    Önerilen boyut: 1200x630px. JPG veya PNG, en fazla 5MB.
                  </p>
                </div>
              )}
              <Input
                id='cover-image'
                type='file'
                accept='image/*'
                className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                onChange={handleCoverChange}
              />
            </div>
            {coverError && (
              <p className='text-xs text-destructive'>
                {coverError}
              </p>
            )}
          </div>

          <div className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <Label>
                Alt fotoğraflar <span className='text-destructive'>*</span>
              </Label>

              <Plus className='h-4 w-4' onClick={handleAddAltImage} />

            </div>
            <div className='grid grid-cols-2 gap-3'>
              <AnimatePresence initial={false}>
                {altImages.map(image => (
                  <motion.div
                    key={image.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className='relative flex h-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 text-xs text-muted-foreground'
                  >
                    <Button
                      type='button'
                      size='icon'
                      variant='outline'
                      className='absolute right-1.5 top-1.5 z-10 h-7 w-7 rounded-full bg-background/80'
                      onClick={() => handleRemoveAltImage(image.id)}
                    >
                      <Trash2 className='h-3.5 w-3.5' />
                    </Button>
                    {altNames[image.id] ? (
                      <div className='max-w-full px-3 text-center text-[11px] text-foreground'>
                        <p className='font-medium'>Seçilen dosya</p>
                        <p className='mt-1 truncate' title={altNames[image.id]}>
                          {altNames[image.id]}
                        </p>
                      </div>
                    ) : (
                      <div className='space-y-1 text-center px-4'>
                        <p className='text-xs font-medium text-foreground'>
                          Alt görseli sürükleyip bırak
                        </p>
                        <p>
                          veya <span className='font-medium text-primary'>dosya seç</span>
                        </p>
                      </div>
                    )}
                    <Input
                      type='file'
                      accept='image/*'
                      className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                      onChange={e => handleAltFileChange(e, image.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {altError && (
              <p className='text-xs text-destructive'>
                {altError}
              </p>
            )}
          </div>
        </div>

        <div className='space-y-6'>
          <div className='space-y-1.5'>
            <Label htmlFor='pdf'>PDF dokümanı</Label>
            <div className='relative flex h-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 text-xs text-muted-foreground'>
              {pdfName ? (
                <div className='max-w-full px-4 text-center text-xs text-foreground'>
                  <p className='font-medium'>Seçilen dosya</p>
                  <p className='mt-1 truncate text-[11px]' title={pdfName}>
                    {pdfName}
                  </p>
                  <p className='mt-1 text-[11px] text-muted-foreground'>
                    Sadece PDF dosyaları, en fazla 10MB.
                  </p>
                </div>
              ) : (
                <div className='space-y-1 text-center'>
                  <p className='text-sm font-medium text-foreground'>
                    PDF dokümanı sürükleyip bırak
                  </p>
                  <p>
                    veya <span className='font-medium text-primary'>dosya seç</span>
                  </p>
                  <p className='text-[11px]'>
                    Sadece PDF dosyaları, en fazla 10MB.
                  </p>
                </div>
              )}
              <Input
                id='pdf'
                type='file'
                accept='application/pdf'
                className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                onChange={e => {
                  const file = e.target.files && e.target.files[0]
                  setPdfName(file ? file.name : '')
                }}
              />
            </div>
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='youtube'>YouTube linki</Label>
            <div className='relative'>
              <Input
                id='youtube'
                type='url'
                placeholder='https://www.youtube.com/watch?v=...'
                {...register('youtube')}
                className={getYoutubeEmbedUrl(youtubeUrl) ? 'pr-10' : ''}
              />
              {getYoutubeEmbedUrl(youtubeUrl) && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type='button'
                      className='absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-primary focus-visible:outline-none'
                    >
                      <PlayCircle className='h-4 w-4' />
                      <span className='sr-only'>Videoyu önizle</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className='sm:max-w-xl'>
                    <DialogHeader>
                      <DialogTitle>YouTube önizleme</DialogTitle>
                    </DialogHeader>
                    <div className='mt-2 aspect-video w-full overflow-hidden rounded-md bg-muted'>
                      <iframe
                        src={getYoutubeEmbedUrl(youtubeUrl) ?? ''}
                        title='YouTube video preview'
                        className='h-full w-full'
                        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                        allowFullScreen
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <p className='text-xs text-muted-foreground'>
              Ürünü tanıtan video veya kullanım rehberi ekleyebilirsin.
            </p>
            {errors.youtube && (
              <p className='text-xs text-destructive'>
                {errors.youtube.message}
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

export default NewProduct

