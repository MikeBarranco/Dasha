import { ShieldCheck, Phone, Info } from 'lucide-react';
import { GuiaAccordion } from '../components/guia/GuiaAccordion';

export function GuiaPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-cobalto">Qué hacer mientras llega ayuda</h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        Pasos rápidos y seguros para ayudar a un animalito en la calle sin ponerte en riesgo ni
        empeorar su estado, mientras un voluntario o veterinario llega.
      </p>

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-info/20 bg-info/5 px-4 py-3 text-sm text-neutral-600">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-info" />
        <p>
          Es orientación general de primeros auxilios; <span className="font-medium">no sustituye
          la atención veterinaria</span>. Ante cualquier duda o emergencia, contacta a un veterinario
          o aliado.
        </p>
      </div>

      <div className="mt-5">
        <GuiaAccordion />
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-naranja/20 bg-naranja/5 px-4 py-3">
        <Phone className="h-5 w-5 flex-shrink-0 text-naranja" />
        <p className="text-sm text-neutral-700">
          ¿Ya lo tienes ubicado? <span className="font-medium">Repórtalo</span> para que un
          voluntario cercano pueda ir por él.
        </p>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        Contenido de bienestar animal, pensado para validarse con un veterinario aliado.
      </p>
    </div>
  );
}
