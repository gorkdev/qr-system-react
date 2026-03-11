import { Sidebar } from '@/components/navigation/Sidebar'

export const AdminShell = ({ children }) => {
  return (
    <div className='min-h-screen bg-background text-foreground'>
      <div className='flex h-screen'>
        <Sidebar />

        <main className='flex-1 overflow-y-auto bg-muted/30 px-4 pt-4 pb-5 md:px-6 md:pt-6 md:pb-7'>
          <div className='max-w-6xl'>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

