import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import GuestRoute from '@/components/auth/GuestRoute'
import { AdminShell } from '@/components/layout/AdminShell'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Stats = lazy(() => import('@/pages/Stats'))
const Products = lazy(() => import('@/pages/Products'))
const NewProduct = lazy(() => import('@/pages/NewProduct'))
const EditProduct = lazy(() => import('@/pages/EditProduct'))
const Settings = lazy(() => import('@/pages/Settings'))
const ProductPublic = lazy(() => import('@/pages/ProductPublic'))
const Visits = lazy(() => import('@/pages/Visits'))
const Trash = lazy(() => import('@/pages/Trash'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const Login = lazy(() => import('@/pages/Login'))
const ActivityLog = lazy(() => import('@/pages/ActivityLog'))

const PageLoader = () => (
  <div className='flex h-full min-h-[40vh] items-center justify-center'>
    <div className='h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent' />
  </div>
)

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path='/giris-yap'
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />
            <Route path='/p/:token' element={<ProductPublic />} />
            <Route path='/qr/:token' element={<ProductPublic />} />
            <Route
              path='/*'
              element={
                <ProtectedRoute>
                  <AdminShell>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path='/' element={<Navigate to='/genel' replace />} />
                        <Route path='/genel' element={<Dashboard />} />
                        <Route path='/istatistikler' element={<Stats />} />
                        <Route path='/urunler' element={<Products />} />
                        <Route path='/yeni-urun' element={<NewProduct />} />
                        <Route path='/urun-duzenle/:slugAndId' element={<EditProduct />} />
                        <Route path='/ziyaret-gecmisi' element={<Visits />} />
                        <Route path='/cop-kutusu' element={<Trash />} />
                        <Route path='/ayarlar' element={<Settings />} />
                        <Route path='/islem-gecmisi' element={<ActivityLog />} />
                        <Route path='*' element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </AdminShell>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
