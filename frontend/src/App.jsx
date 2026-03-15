import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import GuestRoute from '@/components/auth/GuestRoute'
import { AdminShell } from '@/components/layout/AdminShell'
import Dashboard from '@/pages/Dashboard'
import Stats from '@/pages/Stats'
import Products from '@/pages/Products'
import NewProduct from '@/pages/NewProduct'
import EditProduct from '@/pages/EditProduct'
import Settings from '@/pages/Settings'
import ProductPublic from '@/pages/ProductPublic'
import Visits from '@/pages/Visits'
import Trash from '@/pages/Trash'
import NotFound from '@/pages/NotFound'
import Login from '@/pages/Login'
import ActivityLog from '@/pages/ActivityLog'

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
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
                </AdminShell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
