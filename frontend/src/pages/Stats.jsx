import PageHeader from '@/components/ui/page-header'

const Stats = () => {
  return (
    <div className='space-y-6'>
      <PageHeader
        title='İstatistikler'
        description='Sistem durumunu, QR performansını ve temel metrikleri buradan takip edebilirsin.'
        primaryText='Rapor oluştur'
        secondaryText='Tarih aralığı'
        onPrimaryClick={() => console.log('Rapor oluştur')}
        onSecondaryClick={() => console.log('Tarih aralığı seç')}
      />

      <div className='rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-sm text-muted-foreground'>
        İstatistik bileşenleri ve grafikler burada yer alacak. Şimdilik sadece taslak görünüm
        sunuluyor.
      </div>
    </div>
  )
}

export default Stats

