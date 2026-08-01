import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Aviso de Privacidad (Ley Federal de Protección de Datos Personales en Posesión
// de los Particulares, México). El TEXTO legal debe completarse con los datos
// reales del responsable y revisarse con asesoría legal antes de main: los campos
// entre [corchetes] son placeholders que el equipo debe llenar.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-lg font-bold text-cobalto">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-600">{children}</div>
    </section>
  );
}

export function AvisoPrivacidadPage() {
  return (
    <div className="min-h-screen bg-lino px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-cobalto"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <h1 className="mt-4 font-display text-2xl font-bold text-cobalto">Aviso de Privacidad</h1>
        <p className="mt-1 text-xs text-neutral-400">Última actualización: [fecha]</p>

        <Section title="1. Responsable de tus datos">
          <p>
            [Razón social del responsable], con domicilio en [domicilio], es responsable del uso y
            protección de tus datos personales, conforme a la Ley Federal de Protección de Datos
            Personales en Posesión de los Particulares. Para cualquier tema de privacidad puedes
            escribir a [correo de contacto].
          </p>
        </Section>

        <Section title="2. Datos que recabamos">
          <p>
            Para operar Dasha podemos recabar: nombre, correo, teléfono, ubicación aproximada o
            exacta (para reportes y rescates), fotografías que subas, y —solo para voluntarios— una
            identificación oficial con fotografía y una selfie de verificación.
          </p>
          <p>
            Los datos de identificación (INE/identificación oficial y selfie) son{' '}
            <strong>datos personales sensibles</strong> y solo se usan para verificar la identidad
            de los voluntarios que trasladan animales.
          </p>
        </Section>

        <Section title="3. Para qué usamos tus datos (finalidades)">
          <p>Finalidades primarias (necesarias para el servicio):</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Crear y administrar tu cuenta e iniciar sesión.</li>
            <li>Publicar y coordinar reportes, rescates y adopciones.</li>
            <li>Verificar la identidad de los voluntarios.</li>
            <li>Enviarte notificaciones sobre la actividad que sigues.</li>
          </ul>
          <p>Finalidades secundarias (puedes negarte sin afectar el servicio):</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Estadísticas de uso para mejorar la aplicación.</li>
          </ul>
        </Section>

        <Section title="4. Cookies y tecnologías similares">
          <p>
            Usamos una cookie de sesión (esencial) para mantenerte con la sesión iniciada. En
            producción usamos Google Analytics para estadísticas de uso; esta analítica solo se
            activa si aceptas las cookies no esenciales en el aviso que aparece al entrar. Puedes
            cambiar tu decisión borrando las cookies del sitio en tu navegador.
          </p>
        </Section>

        <Section title="5. Con quién compartimos tus datos">
          <p>
            No vendemos tus datos. Para operar usamos proveedores como [proveedor de nube],
            almacenamiento de imágenes (Cloudinary) y analítica (Google Analytics), que tratan los
            datos por cuenta nuestra. La información pública que publicas (por ejemplo, un reporte)
            es visible para la comunidad.
          </p>
        </Section>

        <Section title="6. Tus derechos (ARCO)">
          <p>
            Puedes solicitar el Acceso, Rectificación, Cancelación u Oposición al tratamiento de tus
            datos, así como revocar tu consentimiento, escribiendo a [correo de contacto]. También
            puedes eliminar tu cuenta desde Ajustes.
          </p>
        </Section>

        <Section title="7. Cambios a este aviso">
          <p>
            Podemos actualizar este Aviso de Privacidad. Publicaremos la versión vigente en esta
            página con su fecha de actualización.
          </p>
        </Section>
      </div>
    </div>
  );
}
