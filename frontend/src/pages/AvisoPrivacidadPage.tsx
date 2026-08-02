import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Aviso de Privacidad de Dasha (proyecto académico sin fines de lucro), conforme
// a la Ley Federal de Protección de Datos Personales en Posesión de los
// Particulares (LFPDPPP), México. Datos de contacto reales del proyecto.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-lg font-bold text-cobalto">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-600">{children}</div>
    </section>
  );
}

export function AvisoPrivacidadPage() {
  const navigate = useNavigate();
  // Volver a la pantalla anterior (registro, perfil, etc.); si se abrió directo
  // (pestaña nueva, deep link) no hay historial y caemos a la portada.
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="min-h-screen bg-lino px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-cobalto"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <h1 className="mt-4 font-display text-2xl font-bold text-cobalto">Aviso de Privacidad</h1>
        <p className="mt-1 text-xs text-neutral-400">Última actualización: julio de 2026</p>

        <Section title="1. Quién es responsable de tus datos">
          <p>
            Dasha es un <strong>proyecto académico sin fines de lucro</strong> desarrollado por un
            equipo de estudiantes de Computación de la Benemérita Universidad Autónoma de Puebla
            (BUAP), en la ciudad de Puebla, México. No es una empresa ni tiene fines comerciales.
            El equipo Dasha es responsable del uso y protección de tus datos personales conforme a
            la Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Para
            cualquier tema de privacidad puedes escribirnos a{' '}
            <a
              href="mailto:dashaapp.puebla@gmail.com"
              className="font-medium text-cobalto underline"
            >
              dashaapp.puebla@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section title="2. Qué datos recabamos">
          <p>
            Para operar Dasha podemos recabar: tu nombre, correo, teléfono, ubicación aproximada o
            exacta (para reportes y rescates), las fotografías que subas, y —solo si te registras
            como voluntario— una identificación oficial con fotografía y una selfie de verificación.
          </p>
          <p>
            Los datos de identificación (identificación oficial y selfie) son{' '}
            <strong>datos personales sensibles</strong> y se usan únicamente para verificar la
            identidad de los voluntarios que trasladan animales, por seguridad de la comunidad.
          </p>
        </Section>

        <Section title="3. Para qué usamos tus datos">
          <p>Finalidades necesarias para dar el servicio:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Crear y administrar tu cuenta e iniciar sesión.</li>
            <li>Publicar y coordinar reportes, rescates y adopciones.</li>
            <li>Verificar la identidad de los voluntarios.</li>
            <li>Enviarte notificaciones sobre la actividad que sigues.</li>
          </ul>
          <p>Finalidades adicionales (puedes negarte sin afectar el servicio):</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Estadísticas de uso para mejorar la aplicación.</li>
          </ul>
        </Section>

        <Section title="4. Cookies y tecnologías similares">
          <p>
            Usamos una cookie de sesión (esencial) para mantenerte con la sesión iniciada; sin ella
            no podrías usar tu cuenta. En la versión pública usamos Google Analytics para estadísticas
            de uso, y esa analítica <strong>solo se activa si aceptas las cookies no esenciales</strong>{' '}
            en el aviso que aparece al entrar. Puedes cambiar tu decisión borrando las cookies del
            sitio en tu navegador.
          </p>
        </Section>

        <Section title="5. Con quién compartimos tus datos">
          <p>
            No vendemos tus datos. Para funcionar nos apoyamos en servicios que los tratan por cuenta
            nuestra: alojamiento en la nube, Cloudinary (almacenamiento de imágenes) y Google
            Analytics (estadísticas). La información que publicas de forma pública (por ejemplo, un
            reporte en el mapa) es visible para la comunidad.
          </p>
        </Section>

        <Section title="6. Tus derechos (ARCO)">
          <p>
            Puedes solicitar el Acceso, Rectificación, Cancelación u Oposición al tratamiento de tus
            datos, así como revocar tu consentimiento, escribiéndonos a{' '}
            <a
              href="mailto:dashaapp.puebla@gmail.com"
              className="font-medium text-cobalto underline"
            >
              dashaapp.puebla@gmail.com
            </a>
            . También puedes eliminar tu cuenta y tus datos en cualquier momento desde Ajustes.
          </p>
        </Section>

        <Section title="7. Cambios a este aviso">
          <p>
            Podemos actualizar este Aviso de Privacidad. Publicaremos la versión vigente en esta
            página, con su fecha de actualización.
          </p>
        </Section>

        <Section title="Contacto">
          <p>
            Escríbenos a{' '}
            <a
              href="mailto:dashaapp.puebla@gmail.com"
              className="font-medium text-cobalto underline"
            >
              dashaapp.puebla@gmail.com
            </a>{' '}
            o síguenos en{' '}
            <a
              href="https://www.instagram.com/dashamx.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-cobalto underline"
            >
              Instagram
            </a>{' '}
            y{' '}
            <a
              href="https://www.facebook.com/profile.php?id=61590460525696"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-cobalto underline"
            >
              Facebook
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
