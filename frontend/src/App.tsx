import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { AppLayout } from './components/layout/AppLayout';
import { MapaPage } from './pages/MapaPage';
import { ReportarPage } from './pages/ReportarPage';
import { ReportarPerdidaPage } from './pages/ReportarPerdidaPage';
import { RehabilitacionPage } from './pages/RehabilitacionPage';
import { ComunidadPage } from './pages/ComunidadPage';
import { PerfilPage } from './pages/PerfilPage';
import { NovedadesPage } from './pages/NovedadesPage';
import { SerVoluntarioPage } from './pages/SerVoluntarioPage';
import { AliadosPage } from './pages/AliadosPage';
import { LoginPage } from './pages/LoginPage';
import { RegistroPage } from './pages/RegistroPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminHomePage } from './pages/admin/AdminHomePage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminAnimalsPage } from './pages/admin/AdminAnimalsPage';
import { AdminOrganizationsPage } from './pages/admin/AdminOrganizationsPage';
import { AdminPlaceholderPage } from './pages/admin/AdminPlaceholderPage';

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
          <Route path="reportar-perdida" element={<ReportarPerdidaPage />} />
          <Route path="rehabilitacion" element={<RehabilitacionPage />} />
          <Route path="comunidad" element={<ComunidadPage />} />
          <Route path="perfil" element={<PerfilPage />} />
          <Route path="novedades" element={<NovedadesPage />} />
          <Route path="ser-voluntario" element={<SerVoluntarioPage />} />
          <Route path="aliados" element={<AliadosPage />} />
        </Route>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="reportes" element={<AdminReportsPage />} />
          <Route path="animales" element={<AdminAnimalsPage />} />
          <Route path="aliados" element={<AdminOrganizationsPage />} />
          <Route path="usuarios" element={<AdminPlaceholderPage title="Usuarios" />} />
          <Route path="foro" element={<AdminPlaceholderPage title="Foro" />} />
          <Route path="voluntarios" element={<AdminPlaceholderPage title="Voluntarios" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
