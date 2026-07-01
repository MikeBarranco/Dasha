import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { AnalyticsTracker } from './components/layout/AnalyticsTracker';
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
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminForumPage } from './pages/admin/AdminForumPage';
import { AdminVolunteersPage } from './pages/admin/AdminVolunteersPage';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AnalyticsTracker />
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
          <Route path="usuarios" element={<AdminUsersPage />} />
          <Route path="foro" element={<AdminForumPage />} />
          <Route path="voluntarios" element={<AdminVolunteersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
