import PageHeader from '@/components/ui/page-header'

const Products = () => {
  return (
    <div className='space-y-6'>
      <PageHeader
        title='Ürünler'
        description='Sistem durumunu, QR performansını ve temel metrikleri buradan takip edebilirsin.'
        primaryText='Yeni ürün'
        secondaryText='Filtreler'
        onPrimaryClick={() => console.log('Yeni ürün')}
        onSecondaryClick={() => console.log('Filtreler aç')}
      />

      <div className='rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-sm text-muted-foreground'>
        Ürün listeleme tablosu ve filtreleme alanları burada yer alacak.
      </div>
    </div>
  )
}

export default Products

