import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { AnalyticsTracker } from './components/layout/AnalyticsTracker';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { LandingPage } from './pages/LandingPage';
import { MapaPage } from './pages/MapaPage';
import { ReportarPage } from './pages/ReportarPage';
import { ReportarPerdidaPage } from './pages/ReportarPerdidaPage';
import { RehabilitacionPage } from './pages/RehabilitacionPage';
import { ComunidadPage } from './pages/ComunidadPage';
import { PerfilPage } from './pages/PerfilPage';
import { NovedadesPage } from './pages/NovedadesPage';
import { SerVoluntarioPage } from './pages/SerVoluntarioPage';
import { PanelVoluntarioPage } from './pages/PanelVoluntarioPage';
import { GuiaPage } from './pages/GuiaPage';
import { ImpactoPage } from './pages/ImpactoPage';
import { AdoptadosPage } from './pages/AdoptadosPage';
import { AliadosPage } from './pages/AliadosPage';
import { AllyProfilePage } from './pages/AllyProfilePage';
import { NecesidadesPage } from './pages/NecesidadesPage';
import { LoginPage } from './pages/LoginPage';
import { RegistroPage } from './pages/RegistroPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { RescateEnVivoPage } from './pages/RescateEnVivoPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminHomePage } from './pages/admin/AdminHomePage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminAnimalsPage } from './pages/admin/AdminAnimalsPage';
import { AdminOrganizationsPage } from './pages/admin/AdminOrganizationsPage';
import { AdminEventsPage } from './pages/admin/AdminEventsPage';
import { AdminAvisosPage } from './pages/admin/AdminAvisosPage';
import { AdminNovedadesPage } from './pages/admin/AdminNovedadesPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminForumPage } from './pages/admin/AdminForumPage';
import { AdminDenunciasPage } from './pages/admin/AdminDenunciasPage';
import { AdminVolunteersPage } from './pages/admin/AdminVolunteersPage';
import { AdminOrgApplicationsPage } from './pages/admin/AdminOrgApplicationsPage';
import { SolicitudAliadoPage } from './pages/SolicitudAliadoPage';
import { PortalLayout } from './components/portal/PortalLayout';
import { PortalHomePage } from './pages/portal/PortalHomePage';
import { PortalPerfilPage } from './pages/portal/PortalPerfilPage';
import { PortalEquipoPage } from './pages/portal/PortalEquipoPage';
import { PortalRescatesPage } from './pages/portal/PortalRescatesPage';
import { PortalPerritosPage } from './pages/portal/PortalPerritosPage';
import { PortalAdopcionesPage } from './pages/portal/PortalAdopcionesPage';
import { PortalDonacionesPage } from './pages/portal/PortalDonacionesPage';
import { PortalNecesidadesPage } from './pages/portal/PortalNecesidadesPage';

function App() {
  // Disuasión ligera contra guardar fotos por clic derecho (hotlinking). No rompe
  // imágenes interactivas: solo cancela el menú contextual sobre <img>. El bloqueo
  // real (dominios/marca de agua) se hace en Cloudinary, del lado de Isabel.
  useEffect(() => {
    const blockImageMenu = (event: MouseEvent) => {
      if (event.target instanceof HTMLImageElement) event.preventDefault();
    };
    document.addEventListener('contextmenu', blockImageMenu);
    return () => document.removeEventListener('contextmenu', blockImageMenu);
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <AnalyticsTracker />
      <ErrorBoundary>
        <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegistroPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="rescate/:assignmentId" element={<RescateEnVivoPage />} />
        <Route element={<AppLayout />}>
          <Route path="mapa" element={<MapaPage />} />
          <Route path="reportar" element={<ReportarPage />} />
          <Route path="reportar-perdida" element={<ReportarPerdidaPage />} />
          <Route path="rehabilitacion" element={<RehabilitacionPage />} />
          <Route path="comunidad" element={<ComunidadPage />} />
          <Route path="perfil" element={<PerfilPage />} />
          <Route path="novedades" element={<NovedadesPage />} />
          <Route path="ser-voluntario" element={<SerVoluntarioPage />} />
          <Route path="ser-aliado" element={<SolicitudAliadoPage />} />
          <Route path="voluntario" element={<PanelVoluntarioPage />} />
          <Route path="aliados" element={<AliadosPage />} />
          <Route path="aliados/:id" element={<AllyProfilePage />} />
          <Route path="necesidades" element={<NecesidadesPage />} />
          <Route path="guia" element={<GuiaPage />} />
          <Route path="impacto" element={<ImpactoPage />} />
          <Route path="adoptados" element={<AdoptadosPage />} />
        </Route>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="reportes" element={<AdminReportsPage />} />
          <Route path="animales" element={<AdminAnimalsPage />} />
          <Route path="aliados" element={<AdminOrganizationsPage />} />
          <Route path="eventos" element={<AdminEventsPage />} />
          <Route path="avisos" element={<AdminAvisosPage />} />
          <Route path="novedades" element={<AdminNovedadesPage />} />
          <Route path="usuarios" element={<AdminUsersPage />} />
          <Route path="foro" element={<AdminForumPage />} />
          <Route path="denuncias" element={<AdminDenunciasPage />} />
          <Route path="voluntarios" element={<AdminVolunteersPage />} />
          <Route path="solicitudes-aliado" element={<AdminOrgApplicationsPage />} />
        </Route>
        <Route path="portal" element={<PortalLayout />}>
          <Route index element={<PortalHomePage />} />
          <Route path="perfil" element={<PortalPerfilPage />} />
          <Route path="equipo" element={<PortalEquipoPage />} />
          <Route path="rescates" element={<PortalRescatesPage />} />
          <Route path="perritos" element={<PortalPerritosPage />} />
          <Route path="adopciones" element={<PortalAdopcionesPage />} />
          <Route path="donaciones" element={<PortalDonacionesPage />} />
          <Route path="necesidades" element={<PortalNecesidadesPage />} />
        </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
