import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { LibraryPage } from '@/pages/LibraryPage'
import { MaterialDetailPage } from '@/pages/MaterialDetailPage'
import { NewMaterialPage } from '@/pages/NewMaterialPage'
import { PupilPage } from '@/pages/PupilPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/opetajale" replace />} />
          <Route path="opetajale" element={<NewMaterialPage />} />
          <Route path="opetajale/salvestatud" element={<LibraryPage />} />
          <Route
            path="opetajale/salvestatud/:id"
            element={<MaterialDetailPage />}
          />
          <Route path="opilasele" element={<PupilPage />} />
          <Route path="*" element={<Navigate to="/opetajale" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
