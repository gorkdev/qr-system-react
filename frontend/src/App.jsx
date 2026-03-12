import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell } from '@/components/layout/AdminShell'
import Dashboard from '@/pages/Dashboard'
import Stats from '@/pages/Stats'
import Products from '@/pages/Products'
import NewProduct from '@/pages/NewProduct'
import EditProduct from '@/pages/EditProduct'
import Settings from '@/pages/Settings'
import ProductPublic from '@/pages/ProductPublic'
import Visits from '@/pages/Visits'
import NotFound from '@/pages/NotFound'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/p/:token' element={<ProductPublic />} />
        <Route path='/qr/:token' element={<ProductPublic />} />
        <Route
          path='/*'
          element={
            <AdminShell>
              <Routes>
                <Route path='/' element={<Navigate to='/genel' replace />} />
                <Route path='/genel' element={<Dashboard />} />
                <Route path='/istatistikler' element={<Stats />} />
                <Route path='/urunler' element={<Products />} />
                <Route path='/yeni-urun' element={<NewProduct />} />
                <Route path='/urun-duzenle/:slugAndId' element={<EditProduct />} />
                <Route path='/ziyaret-gecmisi' element={<Visits />} />
                <Route path='/ayarlar' element={<Settings />} />
                <Route path='*' element={<NotFound />} />
              </Routes>
            </AdminShell>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App