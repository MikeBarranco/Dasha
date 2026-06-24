import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { AppLayout } from './components/layout/AppLayout';
import { MapaPage } from './pages/MapaPage';
import { ReportarPage } from './pages/ReportarPage';
import { RehabilitacionPage } from './pages/RehabilitacionPage';
import { ComunidadPage } from './pages/ComunidadPage';
import { PerfilPage } from './pages/PerfilPage';
import { NovedadesPage } from './pages/NovedadesPage';
import { LoginPage } from './pages/LoginPage';
import { RegistroPage } from './pages/RegistroPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegistroPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<MapaPage />} />
          <Route path="reportar" element={<ReportarPage />} />
          <Route path="rehabilitacion" element={<RehabilitacionPage />} />
          <Route path="comunidad" element={<ComunidadPage />} />
          <Route path="perfil" element={<PerfilPage />} />
          <Route path="novedades" element={<NovedadesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
