import {
  LayoutDashboard,
  Flag,
  PawPrint,
  Building2,
  CalendarDays,
  Megaphone,
  Sparkles,
  Users,
  MessagesSquare,
  Flag as FlagIcon,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react';

export type AdminSection = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  end?: boolean;
};

export const adminSections: AdminSection[] = [
  {
    to: '/admin',
    label: 'Resumen',
    description: 'Vista general del panel',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/admin/reportes',
    label: 'Reportes',
    description: 'Revisa y actualiza los reportes de calle',
    icon: Flag,
  },
  {
    to: '/admin/animales',
    label: 'Rehabilitación',
    description: 'Casos en recuperación, hogar temporal y adopción',
    icon: PawPrint,
  },
  {
    to: '/admin/aliados',
    label: 'Aliados',
    description: 'Veterinarias, refugios y asociaciones',
    icon: Building2,
  },
  {
    to: '/admin/eventos',
    label: 'Eventos',
    description: 'Jornadas, ferias y campañas comunitarias',
    icon: CalendarDays,
  },
  {
    to: '/admin/avisos',
    label: 'Avisos',
    description: 'Envía notificaciones a la comunidad',
    icon: Megaphone,
  },
  {
    to: '/admin/novedades',
    label: 'Novedades',
    description: 'Publica el changelog que ve la comunidad',
    icon: Sparkles,
  },
  {
    to: '/admin/usuarios',
    label: 'Usuarios',
    description: 'Administra las cuentas registradas',
    icon: Users,
  },
  {
    to: '/admin/foro',
    label: 'Foro',
    description: 'Modera las publicaciones de la comunidad',
    icon: MessagesSquare,
  },
  {
    to: '/admin/denuncias',
    label: 'Denuncias',
    description: 'Publicaciones reportadas por la comunidad',
    icon: FlagIcon,
  },
  {
    to: '/admin/voluntarios',
    label: 'Voluntarios',
    description: 'Aprueba o rechaza las solicitudes',
    icon: BadgeCheck,
  },
];
