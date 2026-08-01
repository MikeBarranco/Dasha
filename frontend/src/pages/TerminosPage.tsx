import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Términos y Condiciones de uso. El TEXTO debe revisarse con asesoría legal antes
// de main; los campos entre [corchetes] son placeholders que el equipo completa.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-lg font-bold text-cobalto">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-600">{children}</div>
    </section>
  );
}

export function TerminosPage() {
  return (
    <div className="min-h-screen bg-lino px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-cobalto"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <h1 className="mt-4 font-display text-2xl font-bold text-cobalto">Términos y Condiciones</h1>
        <p className="mt-1 text-xs text-neutral-400">Última actualización: [fecha]</p>

        <Section title="1. Qué es Dasha">
          <p>
            Dasha es una plataforma que conecta a ciudadanos, voluntarios y aliados (veterinarias,
            refugios y asociaciones) para reportar, rescatar y dar en adopción a animales en Puebla.
            Al usar Dasha aceptas estos Términos y nuestro{' '}
            <Link to="/aviso-privacidad" className="font-medium text-cobalto underline">
              Aviso de Privacidad
            </Link>
            .
          </p>
        </Section>

        <Section title="2. Tu cuenta">
          <p>
            Debes proporcionar información veraz al registrarte y eres responsable de la actividad de
            tu cuenta. Para ser voluntario se requiere verificación de identidad. Puedes eliminar tu
            cuenta en cualquier momento desde Ajustes.
          </p>
        </Section>

        <Section title="3. Uso correcto">
          <p>Al usar Dasha te comprometes a no:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Publicar reportes falsos, fotos que no correspondan o contenido ofensivo.</li>
            <li>Suplantar a otra persona u organización.</li>
            <li>Usar la plataforma para fines ilegales o para dañar a los animales o a terceros.</li>
          </ul>
          <p>
            Podemos suspender cuentas que incumplan estos Términos o que la comunidad reporte.
          </p>
        </Section>

        <Section title="4. Contenido que publicas">
          <p>
            Eres responsable de lo que publicas (reportes, fotos, comentarios). Nos otorgas permiso
            para mostrar ese contenido dentro de Dasha con el fin de coordinar rescates y adopciones.
          </p>
        </Section>

        <Section title="5. Rescates y adopciones">
          <p>
            Dasha facilita el contacto y la coordinación, pero no es dueña de los animales ni
            garantiza el resultado de un rescate o una adopción. Los acuerdos entre ciudadanos,
            voluntarios y aliados son su responsabilidad. Recomendamos actuar con precaución y
            responsabilidad hacia los animales.
          </p>
        </Section>

        <Section title="6. Limitación de responsabilidad">
          <p>
            Dasha se ofrece "tal cual". En la medida que la ley lo permita, no somos responsables de
            daños derivados del uso de la plataforma o de la conducta de otros usuarios.
          </p>
        </Section>

        <Section title="7. Cambios y contacto">
          <p>
            Podemos actualizar estos Términos; publicaremos la versión vigente en esta página. Estos
            Términos se rigen por las leyes de México, con jurisdicción en [Puebla, México]. Dudas:
            [correo de contacto].
          </p>
        </Section>
      </div>
    </div>
  );
}
