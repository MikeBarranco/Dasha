import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '../../lib/useInstallPrompt';
import { InstallInstructions } from './InstallInstructions';

const DISMISS_KEY = 'dasha-install-dismissed';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

// Banner que invita a instalar Dasha como app. Aparece tras unos segundos, una
// sola vez (se recuerda si lo cierran), y solo si tiene sentido: no si ya está
// instalada. En Android/escritorio lanza el instalador nativo; en iOS abre las
// instrucciones para hacerlo desde Compartir.
export function InstallBanner() {
  const { canPrompt, isIOS, isStandalone, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => wasDismissed());
  const [showIOS, setShowIOS] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Sin localStorage no se recuerda; no bloquea.
    }
  };

  const install = async () => {
    if (isIOS) {
      setShowIOS(true);
      return;
    }
    const accepted = await promptInstall();
    if (accepted) dismiss();
  };

  const eligible = !isStandalone && (canPrompt || isIOS);
  const visible = ready && eligible && !dismissed;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-sm rounded-2xl border border-neutral-200 bg-white p-3 shadow-lg md:bottom-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-cobalto/10 text-cobalto">
                <Download className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-800">Instala Dasha</p>
                <p className="text-xs text-neutral-500">Tenla como app y recibe avisos.</p>
              </div>
              <button
                type="button"
                onClick={install}
                className="flex-shrink-0 rounded-xl bg-cobalto px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Instalar
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Ahora no"
                className="flex-shrink-0 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIOS && <InstallInstructions onClose={() => setShowIOS(false)} />}
      </AnimatePresence>
    </>
  );
}
