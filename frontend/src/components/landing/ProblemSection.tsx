import { Reveal } from './Reveal';

// Segunda sección: enfatiza el problema que viven las personas que hoy
// intentan ayudar a un animal en la calle. Texto a la izquierda, foto real
// a la derecha.
export function ProblemSection() {
  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-14">
        <Reveal>
          <span className="text-sm font-semibold uppercase tracking-wide text-naranja sm:text-base">
            El problema
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-cobalto sm:text-4xl lg:text-5xl">
            Ves un perrito en la calle y el reporte se pierde en un grupo de WhatsApp.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-neutral-600 sm:text-xl">
            Hoy ayudar depende de mensajes dispersos: nadie sabe si alguien ya fue,
            la ubicación se pierde, las fotos se repiten y no hay forma de darle
            seguimiento. La empatía sobra, pero la coordinación falta.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="overflow-hidden rounded-3xl border border-neutral-200 shadow-sm">
            <img
              src="/seed/charlie-calle.jpg"
              alt="Perrito en situación de calle"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/placeholder-animal.svg';
              }}
              className="h-full max-h-[420px] w-full object-cover"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
