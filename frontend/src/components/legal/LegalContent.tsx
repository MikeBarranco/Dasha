import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// Contenido legal reutilizable: se muestra tanto en las páginas completas
// (/terminos, /aviso-privacidad) como dentro de una hoja (LegalSheet) para
// consultarlo sin salir del registro y sin perder los datos ya escritos.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="font-display text-lg font-bold text-cobalto">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-600">{children}</div>
    </section>
  );
}

// `linkToOther` en false muestra la referencia cruzada (al Aviso) como texto
// plano: dentro de la hoja del registro no queremos navegar a otra ruta.
export function TerminosContent({ linkToOther = true }: { linkToOther?: boolean }) {
  return (
    <>
      <Section title="1. Qué es Dasha">
        <p>
          Dasha es un <strong>proyecto académico sin fines de lucro</strong> desarrollado por un
          equipo de estudiantes de Computación de la Benemérita Universidad Autónoma de Puebla
          (BUAP). Es una plataforma que conecta a ciudadanos, voluntarios y aliados (veterinarias,
          refugios y asociaciones) para reportar, rescatar y dar en adopción a animales en Puebla.
          Al usar Dasha aceptas estos Términos y nuestro{' '}
          {linkToOther ? (
            <Link to="/aviso-privacidad" className="font-medium text-cobalto underline">
              Aviso de Privacidad
            </Link>
          ) : (
            <span className="font-medium text-cobalto">Aviso de Privacidad</span>
          )}
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
        <p>Podemos suspender cuentas que incumplan estos Términos o que la comunidad reporte.</p>
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
          voluntarios y aliados son su responsabilidad. Te pedimos actuar con precaución y
          responsabilidad hacia los animales y hacia las demás personas.
        </p>
      </Section>

      <Section title="6. Naturaleza del proyecto y responsabilidad">
        <p>
          Dasha es un proyecto estudiantil sin fines de lucro y se ofrece "tal cual", como una
          herramienta de apoyo a la comunidad. En la medida que la ley lo permita, el equipo Dasha
          no es responsable de daños derivados del uso de la plataforma ni de la conducta de otros
          usuarios.
        </p>
      </Section>

      <Section title="7. Cambios, ley aplicable y contacto">
        <p>
          Podemos actualizar estos Términos; publicaremos la versión vigente en esta página. Estos
          Términos se rigen por las leyes de los Estados Unidos Mexicanos, con jurisdicción en la
          ciudad de Puebla. Para cualquier duda, escríbenos a{' '}
          <a href="mailto:dashaapp.puebla@gmail.com" className="font-medium text-cobalto underline">
            dashaapp.puebla@gmail.com
          </a>
          .
        </p>
      </Section>
    </>
  );
}

export function AvisoPrivacidadContent() {
  return (
    <>
      <Section title="1. Quién es responsable de tus datos">
        <p>
          Dasha es un <strong>proyecto académico sin fines de lucro</strong> desarrollado por un
          equipo de estudiantes de Computación de la Benemérita Universidad Autónoma de Puebla
          (BUAP), en la ciudad de Puebla, México. No es una empresa ni tiene fines comerciales. El
          equipo Dasha es responsable del uso y protección de tus datos personales conforme a la Ley
          Federal de Protección de Datos Personales en Posesión de los Particulares. Para cualquier
          tema de privacidad puedes escribirnos a{' '}
          <a href="mailto:dashaapp.puebla@gmail.com" className="font-medium text-cobalto underline">
            dashaapp.puebla@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section title="2. Qué datos recabamos">
        <p>
          Para operar Dasha podemos recabar: tu nombre, correo, teléfono, ubicación aproximada o
          exacta (para reportes y rescates), las fotografías que subas, y —solo si te registras como
          voluntario— una identificación oficial con fotografía y una selfie de verificación.
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
          Usamos una cookie de sesión (esencial) para mantenerte con la sesión iniciada; sin ella no
          podrías usar tu cuenta. En la versión pública usamos Google Analytics para estadísticas de
          uso, y esa analítica{' '}
          <strong>solo se activa si aceptas las cookies no esenciales</strong> en el aviso que
          aparece al entrar. Puedes cambiar tu decisión borrando las cookies del sitio en tu
          navegador.
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
          <a href="mailto:dashaapp.puebla@gmail.com" className="font-medium text-cobalto underline">
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
          <a href="mailto:dashaapp.puebla@gmail.com" className="font-medium text-cobalto underline">
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
    </>
  );
}
