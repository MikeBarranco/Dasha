import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Titulo de la pestaña por pantalla (SEO + orientacion del usuario). El mentor pidio
// que la pestaña diga algo descriptivo con palabra clave, como en Airbnb
// ("Airbnb | Alojamientos..."), en vez de solo "Dasha".
//
// Formato: cada seccion es "<Seccion> | Dasha"; la portada usa el titulo de marca
// completo. Se coloca ANTES de <AnalyticsTracker /> en el arbol para que el titulo
// ya este puesto cuando la analitica registra la vista (lee document.title).

const BRAND = 'Dasha';
const HOME_TITLE = 'Dasha | Plataforma de coordinacion de rescate animal en Puebla';

// Rutas exactas → nombre de la seccion (se le agrega " | Dasha").
const SECTION_TITLES: Record<string, string> = {
  '/login': 'Iniciar sesion',
  '/registro': 'Crear cuenta',
  '/terminos': 'Terminos y condiciones',
  '/aviso-privacidad': 'Aviso de privacidad',
  '/mapa': 'Mapa de rescate en Puebla',
  '/reportar': 'Reportar un animal en la calle',
  '/reportar-perdida': 'Reportar mascota perdida',
  '/rehabilitacion': 'Animales en rehabilitacion',
  '/comunidad': 'Comunidad',
  '/perfil': 'Mi perfil',
  '/novedades': 'Novedades',
  '/ser-voluntario': 'Hazte voluntario',
  '/ser-aliado': 'Conviertete en aliado',
  '/voluntario': 'Panel del voluntario',
  '/aliados': 'Aliados y refugios',
  '/necesidades': 'Necesidades de los aliados',
  '/guia': 'Guia de uso',
  '/impacto': 'Nuestro impacto',
  '/adoptados': 'Adoptados',
  '/memorial': 'Los que recordamos',
};

// Prefijos para rutas dinamicas o con muchas subrutas (se evaluan en orden).
const PREFIX_TITLES: Array<[string, string]> = [
  ['/aliados/', 'Perfil del aliado'],
  ['/rescate/', 'Rescate en vivo'],
  ['/admin', 'Panel de administracion'],
  ['/portal', 'Portal del aliado'],
];

function titleForPath(pathname: string): string {
  if (pathname === '/') return HOME_TITLE;

  const exact = SECTION_TITLES[pathname];
  if (exact) return `${exact} | ${BRAND}`;

  for (const [prefix, label] of PREFIX_TITLES) {
    if (pathname.startsWith(prefix)) return `${label} | ${BRAND}`;
  }

  // Ruta desconocida (NotFoundPage u otra): titulo neutro de marca.
  return HOME_TITLE;
}

export function PageTitle() {
  const location = useLocation();

  useEffect(() => {
    document.title = titleForPath(location.pathname);
  }, [location.pathname]);

  return null;
}
