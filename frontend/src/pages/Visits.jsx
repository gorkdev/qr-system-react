import { useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/ui/page-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const Visits = () => {
  const [visits, setVisits] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [deviceFilter, setDeviceFilter] = useState('all')

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        setIsLoading(true)
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/api/visits`, {
          headers: {
            Accept: 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Ziyaret geçmişi yüklenirken bir hata oluştu.')
        }

        const data = await response.json()
        setVisits(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Ziyaret geçmişi yüklenirken hata oluştu', error)
        toast('Ziyaret geçmişi yüklenemedi.', {
          description: 'Lütfen sayfayı yenileyip tekrar deneyin.',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchVisits()
  }, [])

  const filteredVisits = useMemo(() => {
    return visits.filter((visit) => {
      const title = visit.product?.title ?? ''
      const matchesSearch =
        !search.trim() ||
        title.toLowerCase().includes(search.toLowerCase()) ||
        (visit.ip_address ?? '').includes(search)

      const matchesDevice =
        deviceFilter === 'all'
          ? true
          : (visit.device_type ?? '').toLowerCase() === deviceFilter

      return matchesSearch && matchesDevice
    })
  }, [visits, search, deviceFilter])

  const formatDateTime = (value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const deviceLabel = (type) => {
    switch ((type ?? '').toLowerCase()) {
      case 'mobile':
        return 'Mobil'
      case 'tablet':
        return 'Tablet'
      case 'desktop':
      default:
        return 'Masaüstü'
    }
  }

  const browserLabel = (userAgent) => {
    const ua = (userAgent ?? '').toLowerCase()
    if (!ua) return '-'

    if (ua.includes('edg/')) return 'Edge'
    if (ua.includes('opr/') || ua.includes('opera')) return 'Opera'
    if (ua.includes('firefox/')) return 'Firefox'
    if (ua.includes('chrome/')) return 'Chrome'
    if (ua.includes('safari/')) return 'Safari'

    return 'Diğer'
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Ziyaret Geçmişi'
        description='Ürünlerinize gelen ziyaretlerin cihaz, tarayıcı ve zaman bilgilerini buradan takip edebilirsiniz.'
        primaryText=''
        secondaryText=''
      />

      <div className='rounded-xl'>
        <div className='mb-3 flex items-center justify-between gap-3'>
          <div className='space-y-0.5'>
            <p className='text-xs text-muted-foreground'>
              Toplam {filteredVisits.length} ziyaret listeleniyor.
            </p>
          </div>

          <div className='flex flex-1 items-center justify-end gap-2 md:gap-3'>
            <div className='hidden w-full max-w-xs md:block'>
              <Input
                placeholder='Ürün başlığı veya IP ara'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='h-8 text-xs bg-card'
              />
            </div>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className='h-8 w-[140px] text-xs bg-card'>
                <SelectValue placeholder='Cihaz türü' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tümü</SelectItem>
                <SelectItem value='desktop'>Masaüstü</SelectItem>
                <SelectItem value='mobile'>Mobil</SelectItem>
                <SelectItem value='tablet'>Tablet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className='overflow-hidden rounded-lg border bg-background'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead className='hidden md:table-cell'>IP</TableHead>
                <TableHead className='hidden lg:table-cell'>Konum</TableHead>
                <TableHead>Cihaz</TableHead>
                <TableHead className='hidden lg:table-cell'>Tarayıcı</TableHead>
                <TableHead className='text-right'>Ziyaret zamanı</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className='py-6 text-center text-sm'>
                    Ziyaretler yükleniyor...
                  </TableCell>
                </TableRow>
              ) : filteredVisits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='py-6 text-center text-sm'>
                    Henüz kayıtlı ziyaret bulunmuyor.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVisits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className='max-w-xs'>
                      <div className='flex flex-col gap-0.5'>
                        <span className='text-sm font-medium text-foreground'>
                          {visit.product?.title ?? 'Silinmiş ürün'}
                        </span>
                        <span className='text-[11px] text-muted-foreground md:hidden'>
                          {visit.ip_address ?? '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className='hidden md:table-cell text-xs text-muted-foreground'>
                      {visit.ip_address ?? '-'}
                    </TableCell>
                    <TableCell className='hidden lg:table-cell text-xs text-muted-foreground'>
                      {visit.location ?? '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline' className='text-[11px]'>
                        {deviceLabel(visit.device_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className='hidden lg:table-cell max-w-xs text-[11px] text-muted-foreground'>
                      {browserLabel(visit.user_agent)}
                    </TableCell>
                    <TableCell className='text-right text-xs text-muted-foreground'>
                      {formatDateTime(visit.visited_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

export default Visits

