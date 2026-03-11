import PageHeader from '@/components/ui/page-header'

const Settings = () => {
  return (
    <div className='space-y-6'>
      <PageHeader
        title='Ayarlar'
        description='Sistem durumunu, QR performansını ve temel metrikleri buradan takip edebilirsin.'
        primaryText='Değişiklikleri kaydet'
        secondaryText='Varsayılanlara dön'
        onPrimaryClick={() => console.log('Değişiklikleri kaydet')}
        onSecondaryClick={() => console.log('Varsayılanlara dön')}
      />

      <div className='rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-sm text-muted-foreground'>
        Ayar kartları ve form alanları burada yer alacak.
      </div>
    </div>
  )
}

export default Settings

