import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { MapaPage } from './pages/MapaPage';
import { ReportarPage } from './pages/ReportarPage';
import { RehabilitacionPage } from './pages/RehabilitacionPage';
import { ComunidadPage } from './pages/ComunidadPage';
import { PerfilPage } from './pages/PerfilPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<MapaPage />} />
          <Route path="reportar" element={<ReportarPage />} />
          <Route path="rehabilitacion" element={<RehabilitacionPage />} />
          <Route path="comunidad" element={<ComunidadPage />} />
          <Route path="perfil" element={<PerfilPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
