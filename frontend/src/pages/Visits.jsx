import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
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
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, ChevronDown, SearchX } from 'lucide-react'
import { toast } from 'sonner'

const compactCalendarClassNames = {
  caption_label: 'text-xs font-medium select-none',
  weekday: 'flex-1 text-[0.65rem] font-normal text-muted-foreground select-none',
  week_number: 'text-[0.65rem] text-muted-foreground select-none',
  dropdowns: 'flex w-full items-center justify-center gap-1.5 text-xs font-medium',
}

const PAGE_SIZE = 10

const normalizeText = (value) =>
  (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const Visits = () => {
  const [visits, setVisits] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [deviceFilter, setDeviceFilter] = useState('all')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return format(d, 'yyyy-MM-dd')
  })
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [currentPage, setCurrentPage] = useState(1)

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
    const startMs = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null
    const endMs = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null

    return visits.filter((visit) => {
      const title = visit.product?.title ?? ''
      const matchesSearch =
        !search.trim() ||
        normalizeText(title).includes(normalizeText(search)) ||
        (visit.ip_address ?? '').includes(search)

      const matchesDevice =
        deviceFilter === 'all'
          ? true
          : (visit.device_type ?? '').toLowerCase() === deviceFilter

      let matchesDate = true
      if (startMs || endMs) {
        const visitTime = visit.visited_at ? new Date(visit.visited_at).getTime() : null
        if (!visitTime) {
          matchesDate = false
        } else {
          if (startMs && visitTime < startMs) matchesDate = false
          if (endMs && visitTime > endMs) matchesDate = false
        }
      }

      return matchesSearch && matchesDevice && matchesDate
    })
  }, [visits, search, deviceFilter, startDate, endDate])

  const totalPages = Math.max(1, Math.ceil(filteredVisits.length / PAGE_SIZE))

  const currentPageVisits = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredVisits.slice(start, start + PAGE_SIZE)
  }, [filteredVisits, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, deviceFilter, startDate, endDate])

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
            {isLoading ? (
              <div className='h-3 w-44 animate-pulse rounded bg-muted' />
            ) : (
              <p className='text-xs text-muted-foreground'>
                Toplam {filteredVisits.length} ziyaret bulundu.
              </p>
            )}
          </div>

          <div className='flex flex-1 flex-wrap items-center justify-end gap-2 md:gap-3'>
            <div className='hidden w-full max-w-xs md:block'>
              <Input
                placeholder='Ürün başlığı veya IP ara'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='h-8 text-xs bg-card'
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 min-w-[130px] justify-start text-[11px] font-normal bg-card'
                >
                  <CalendarIcon className='mr-1.5 h-3 w-3' />
                  {startDate
                    ? format(new Date(startDate), 'dd MMM yyyy', { locale: tr })
                    : 'Başlangıç'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='end'>
                <Calendar
                  mode='single'
                  locale={tr}
                  classNames={compactCalendarClassNames}
                  className='p-2 [&_[data-slot=button]]:text-xs'
                  selected={startDate ? new Date(startDate) : undefined}
                  onSelect={(day) =>
                    setStartDate(day ? format(day, 'yyyy-MM-dd') : startDate)
                  }
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 min-w-[130px] justify-start text-[11px] font-normal bg-card'
                >
                  <CalendarIcon className='mr-1.5 h-3 w-3' />
                  {endDate
                    ? format(new Date(endDate), 'dd MMM yyyy', { locale: tr })
                    : 'Bitiş'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='end'>
                <Calendar
                  mode='single'
                  locale={tr}
                  classNames={compactCalendarClassNames}
                  className='p-2 [&_[data-slot=button]]:text-xs'
                  selected={endDate ? new Date(endDate) : undefined}
                  onSelect={(day) =>
                    setEndDate(day ? format(day, 'yyyy-MM-dd') : endDate)
                  }
                />
              </PopoverContent>
            </Popover>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className='h-8 w-[150px] text-xs bg-card pl-3 pr-2'>
                <div className='flex w-full items-center justify-between gap-1'>
                  <SelectValue placeholder='Cihaz türü' />
                  <ChevronDown className='h-3.5 w-3.5 text-muted-foreground' />
                </div>
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
                Array.from({ length: PAGE_SIZE }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell className='max-w-xs'>
                      <div className='space-y-1'>
                        <div className='h-4 w-44 animate-pulse rounded bg-muted' />
                        <div className='h-3 w-28 animate-pulse rounded bg-muted md:hidden' />
                      </div>
                    </TableCell>
                    <TableCell className='hidden md:table-cell'>
                      <div className='h-3 w-28 animate-pulse rounded bg-muted' />
                    </TableCell>
                    <TableCell className='hidden lg:table-cell'>
                      <div className='h-3 w-24 animate-pulse rounded bg-muted' />
                    </TableCell>
                    <TableCell>
                      <div className='h-5 w-20 animate-pulse rounded-full bg-muted' />
                    </TableCell>
                    <TableCell className='hidden lg:table-cell'>
                      <div className='h-3 w-24 animate-pulse rounded bg-muted' />
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='ml-auto h-3 w-28 animate-pulse rounded bg-muted' />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredVisits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='py-12'>
                    <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                      <SearchX className='h-5 w-5' />
                      <p className='text-sm'>Arama kriterlerinize uygun ziyaret bulunamadı.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentPageVisits.map((visit) => (
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

        {!isLoading && filteredVisits.length > PAGE_SIZE && (
          <div className='mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground'>
            <button
              type='button'
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className='inline-flex h-7 items-center rounded-md border bg-background px-2 disabled:cursor-not-allowed disabled:opacity-50'
            >
              Önceki
            </button>
            <span>
              Sayfa {currentPage} / {totalPages}
            </span>
            <button
              type='button'
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              className='inline-flex h-7 items-center rounded-md border bg-background px-2 disabled:cursor-not-allowed disabled:opacity-50'
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Visits

