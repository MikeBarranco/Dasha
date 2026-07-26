import { Store, Users, PawPrint, HeartHandshake, type LucideIcon } from 'lucide-react';

export type OnboardingStep = {
  image?: string;
  icon?: LucideIcon;
  accent: 'cobalto' | 'naranja' | 'purpura';
  title: string;
  text: string;
};

// Onboarding general de la app (primera entrada).
export const appSteps: OnboardingStep[] = [
  {
    image: '/illustrations/ilustracion-paso-reportar.webp',
    accent: 'cobalto',
    title: 'Reporta lo que ves',
    text: 'Encontraste un animal en la calle: repórtalo con una foto y su ubicación en segundos.',
  },
  {
    image: '/illustrations/ilustracion-paso-rescatar.webp',
    accent: 'naranja',
    title: 'La comunidad se coordina',
    text: 'Tu reporte aparece en el mapa. Voluntarios y aliados cercanos se organizan para ayudar.',
  },
  {
    image: '/illustrations/ilustracion-paso-adoptar.webp',
    accent: 'purpura',
    title: 'Sigue su historia',
    text: 'Acompaña su recuperación en Rehabilitación, hasta que encuentra un hogar para siempre.',
  },
];

// Onboarding para quien acaba de ser aprobado como VOLUNTARIO. Le explicamos dónde
// está su panel y, sobre todo, el Modo Activo (antes nadie sabía que existía).
export const volunteerSteps: OnboardingStep[] = [
  {
    image: '/illustrations/ilustracion-paso-reportar.webp',
    accent: 'cobalto',
    title: '¡Ya eres voluntario!',
    text: 'Ahora tienes tu Panel de voluntario en el Perfil. Desde ahí recibes las emergencias cercanas y sigues tus rescates.',
  },
  {
    image: '/illustrations/ilustracion-paso-rescatar.webp',
    accent: 'naranja',
    title: 'Enciende el Modo Activo',
    text: 'En tu panel, activa el Modo Activo y elige tu radio. Así te avisamos cuando un animalito necesita ayuda cerca de ti.',
  },
  {
    image: '/illustrations/ilustracion-paso-adoptar.webp',
    accent: 'purpura',
    title: 'Ayuda y gana medallas',
    text: 'Da "Voy en camino", lleva al animalito con un aliado y desbloquea medallas por cada rescate.',
  },
];

// Onboarding para una cuenta de ALIADO (veterinaria, refugio, asociación).
export const allySteps: OnboardingStep[] = [
  {
    icon: Store,
    accent: 'cobalto',
    title: 'Bienvenido a tu portal',
    text: 'Desde aquí administras tu presencia en Dasha. Arma tu perfil para que la comunidad te conozca.',
  },
  {
    icon: Users,
    accent: 'naranja',
    title: 'Agrega a tu equipo',
    text: 'Vincula a tus veterinarios por su correo para que aparezcan en tu perfil.',
  },
  {
    icon: PawPrint,
    accent: 'purpura',
    title: 'Da seguimiento a tus rescatados',
    text: 'Registra a los animalitos que atiendes y actualiza su estatus hasta que estén listos para adoptar.',
  },
  {
    icon: HeartHandshake,
    accent: 'cobalto',
    title: 'Recibe apoyo',
    text: 'Revisa los comprobantes de donación de tus perritos y confírmalos cuando llegue la transferencia.',
  },
];
