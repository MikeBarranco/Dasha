import { useOutletContext } from 'react-router-dom';
import type { AllyContext } from './api';

// Contexto del aliado (organización + rol) que PortalLayout entrega al Outlet.
export function useAllyPortal(): AllyContext {
  return useOutletContext<AllyContext>();
}
