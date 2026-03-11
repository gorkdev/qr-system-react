import { ArrowUpRight, BarChart3, QrCode, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/ui/page-header'

const statCards = [
  {
    label: 'Toplam QR',
    value: '248',
    trend: '+18%',
    icon: QrCode,
  },
  {
    label: 'AKTİF KULLANICI',
    value: '1.204',
    trend: '+6%',
    icon: Users,
  },
  {
    label: 'Bugünkü Tarama',
    value: '432',
    trend: '+12%',
    icon: BarChart3,
  },
]

const Dashboard = () => {
  return (
    <div className='space-y-6'>
      <PageHeader
        title='Genel'
        description='Sistem durumunu, QR performansını ve temel metrikleri buradan takip edebilirsin.'
        primaryText={
          <span className='flex items-center gap-1.5'>
            Yeni QR oluştur
            <ArrowUpRight className='h-3.5 w-3.5' />
          </span>
        }
        secondaryText='Raporları dışa aktar'
        onPrimaryClick={() => console.log('Yeni QR oluştur')}
        onSecondaryClick={() => console.log('Raporları dışa aktar')}
      />

      <section className='grid gap-4 md:grid-cols-3'>
        {statCards.map(card => (
          <Card key={card.label} className='transition-colors hover:bg-muted'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0'>
              <CardTitle className='text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                {card.label}
              </CardTitle>
              <div className='rounded-full bg-primary/10 p-2 text-primary'>
                <card.icon className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent className='space-y-1'>
              <div className='text-2xl font-semibold tracking-tight'>
                {card.value}
              </div>
              <CardDescription className='text-xs text-emerald-600'>
                {card.trend} son 7 güne göre
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}

export default Dashboard

