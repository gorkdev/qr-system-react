import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell } from '@/components/layout/AdminShell'
import Dashboard from '@/pages/Dashboard'
import Stats from '@/pages/Stats'
import Products from '@/pages/Products'
import NewProduct from '@/pages/NewProduct'
import Settings from '@/pages/Settings'

const App = () => {
  return (
    <BrowserRouter>
      <AdminShell>
        <Routes>
          <Route path='/' element={<Navigate to='/genel' replace />} />
          <Route path='/genel' element={<Dashboard />} />
          <Route path='/istatistikler' element={<Stats />} />
          <Route path='/urunler' element={<Products />} />
          <Route path='/yeni-urun' element={<NewProduct />} />
          <Route path='/ayarlar' element={<Settings />} />
        </Routes>
      </AdminShell>
    </BrowserRouter>
  )
}

export default App