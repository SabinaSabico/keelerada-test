import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { LibraryPage } from '@/pages/LibraryPage'
import { MaterialDetailPage } from '@/pages/MaterialDetailPage'
import { NewMaterialPage } from '@/pages/NewMaterialPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<NewMaterialPage />} />
          <Route path="salvestatud" element={<LibraryPage />} />
          <Route path="salvestatud/:id" element={<MaterialDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
