import { HeartPulse, Car, ShieldAlert, PawPrint, Thermometer, type LucideIcon } from 'lucide-react';

// Guía "qué hacer mientras llega la ayuda". Contenido de orientación general de
// primeros auxilios: prioriza la seguridad y el "qué NO hacer". NO sustituye a un
// veterinario. Ideal que un aliado veterinario lo revise antes de la demo (badge
// "Revisado por veterinario" cuando lo validen).
export type GuiaSituacion = {
  id: string;
  icon: LucideIcon;
  title: string;
  intro: string;
  hacer: string[];
  evitar: string[];
  transportar: string;
};

export const guiaSituaciones: GuiaSituacion[] = [
  {
    id: 'herido',
    icon: HeartPulse,
    title: 'Herido o sangrando',
    intro: 'Un animal lastimado está asustado y con dolor; puede reaccionar aunque sea manso.',
    hacer: [
      'Acércate despacio y en silencio, háblale con voz suave.',
      'Si hay sangrado, cubre la herida con una tela limpia y haz presión ligera.',
      'Mantenlo quieto y abrigado mientras consigues ayuda.',
    ],
    evitar: [
      'No muevas una posible fractura ni le jales las patas.',
      'No le des agua ni comida.',
      'No le des medicamentos para humanos.',
    ],
    transportar:
      'Deslízalo con cuidado sobre una superficie rígida (tabla, cartón o cobija firme), sosteniendo cabeza y cadera. Llévalo con un veterinario o aliado lo antes posible.',
  },
  {
    id: 'atropellado',
    icon: Car,
    title: 'Atropellado',
    intro: 'Puede tener lesiones internas o de columna aunque se vea estable o camine.',
    hacer: [
      'Retíralo del tráfico solo si es seguro para ti.',
      'Cúbrelo con una cobija para reducir el estrés y conservar el calor.',
      'Revisa con calma si respira, sin manipularlo de más.',
    ],
    evitar: [
      'No lo cargues de golpe ni le dobles el cuerpo.',
      'No le des agua ni comida.',
      'No asumas que está bien aunque logre caminar.',
    ],
    transportar:
      'Usa una superficie rígida como camilla y muévelo "en bloque", sin torcer la columna. Directo al veterinario.',
  },
  {
    id: 'agresivo',
    icon: ShieldAlert,
    title: 'Asustado o agresivo',
    intro: 'El miedo puede volverlo defensivo. Tu seguridad va primero.',
    hacer: [
      'Dale espacio y tiempo; no lo arrincones.',
      'Muévete lento, sin mirarlo fijo a los ojos.',
      'Ofrécele agua o comida a distancia para ganar confianza.',
    ],
    evitar: [
      'No lo persigas ni le grites.',
      'No acerques la mano a su cara.',
      'No lo toques si gruñe, tiembla o enseña los dientes.',
    ],
    transportar:
      'Si no puedes acercarte con seguridad, reporta la ubicación y pide apoyo de un voluntario o de control animal. No te arriesgues.',
  },
  {
    id: 'cachorro',
    icon: PawPrint,
    title: 'Cachorro solo',
    intro: 'A veces la madre anda cerca. Observa antes de intervenir.',
    hacer: [
      'Obsérvalo un momento a distancia: la madre puede volver.',
      'Si está en peligro real, mantenlo tibio envolviéndolo en una tela.',
      'Consíguele valoración veterinaria pronto.',
    ],
    evitar: [
      'No le des leche de vaca: les cae mal.',
      'No lo separes de la madre si ella está presente y el lugar es seguro.',
      'No lo manipules con las manos frías o bruscamente.',
    ],
    transportar:
      'En una caja con una tela tibia, en un lugar silencioso y sin corrientes de aire. Llévalo con un veterinario o aliado para revisarlo.',
  },
  {
    id: 'deshidratado',
    icon: Thermometer,
    title: 'Deshidratado o con golpe de calor',
    intro: 'El calor extremo es una urgencia; actúa rápido pero sin excesos.',
    hacer: [
      'Muévelo a la sombra, a un lugar fresco y ventilado.',
      'Si está consciente, ofrécele agua fresca en pocas cantidades.',
      'Moja sus patas y panza con agua templada.',
    ],
    evitar: [
      'No lo sumerjas en agua muy fría ni le pongas hielo.',
      'No lo obligues a beber si está inconsciente.',
      'No lo dejes en un auto o al sol.',
    ],
    transportar:
      'Mantenlo fresco y ventilado en el traslado. Si no mejora rápido, llévalo con un veterinario.',
  },
];
