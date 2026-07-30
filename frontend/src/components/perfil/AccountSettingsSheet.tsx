import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Loader2,
  Mail,
  Lock,
  Trash2,
  ChevronDown,
  Check,
  AlertTriangle,
  Bone,
} from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { cn } from '../../lib/cn';
import { updateMe, changePassword, deleteAccount } from '../../lib/api';
import { PasswordInput } from '../auth/PasswordInput';
import { passwordRules, isStrongPassword } from '../../lib/validation';

type AccountSettingsSheetProps = {
  initialName: string;
  initialPhone: string;
  email: string;
  canChangePassword: boolean;
  onSaved: (data: { name: string; phone: string }) => void;
  onDeleted: () => void;
  onClose: () => void;
};

// Palabra exacta que el usuario debe escribir para confirmar el borrado.
const DELETE_WORD = 'ELIMINAR';

const deleteReasons = [
  'Ya no la necesito',
  'Encontré otra aplicación',
  'Recibo demasiadas notificaciones',
  'Preocupaciones de privacidad',
  'Otro',
];

// Hoja para administrar la cuenta: datos (nombre/teléfono/correo), cambio de
// contraseña (solo cuentas con contraseña propia) y eliminación de la cuenta.
export function AccountSettingsSheet({
  initialName,
  initialPhone,
  email,
  canChangePassword,
  onSaved,
  onDeleted,
  onClose,
}: AccountSettingsSheetProps) {
  useLockBodyScroll();

  // --- Datos de la cuenta ---
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  // Nombre: solo letras (con acentos/ñ), espacios y ' . - ; entre 2 y 50
  // caracteres. Se colapsan espacios repetidos para que "aaaa   bbbb" no pase.
  const cleanName = name.trim().replace(/\s+/g, ' ');
  const nameCharsOk = /^[\p{L}\p{M}\s'.-]+$/u.test(cleanName);
  const nameValid = cleanName.length >= 2 && cleanName.length <= 50 && nameCharsOk;

  const digits = phone.replace(/\D/g, '');
  const phoneValid = digits.length === 0 || digits.length === 10;
  const canSave = nameValid && phoneValid && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSavedOk(false);
    try {
      await updateMe({ name: cleanName, phone: digits });
      setSavedOk(true);
      onSaved({ name: cleanName, phone: digits });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // --- Cambiar contraseña ---
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

  const newPwStrong = isStrongPassword(newPw);
  const pwMatches = confirmPw.length > 0 && confirmPw === newPw;
  const pwDifferent = newPw.length === 0 || newPw !== currentPw;
  const canChangePw =
    currentPw.length > 0 && newPwStrong && pwMatches && pwDifferent && !savingPw;

  const submitPassword = async () => {
    if (!canChangePw) return;
    setSavingPw(true);
    setPwError(null);
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwDone(true);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setSavingPw(false);
    }
  };

  // --- Eliminar cuenta ---
  const [delOpen, setDelOpen] = useState(false);
  const [delReason, setDelReason] = useState(deleteReasons[0]);
  const [delFeedback, setDelFeedback] = useState('');
  const [delConfirm, setDelConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  // Debe coincidir EXACTO (mayúsculas incluidas): es una acción destructiva y
  // queremos fricción deliberada. "eliMinar" no cuenta.
  const canDelete = delConfirm.trim() === DELETE_WORD && !deleting;

  const submitDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setDelError(null);
    try {
      await deleteAccount({ reason: delReason, feedback: delFeedback });
      onDeleted();
    } catch (err) {
      setDelError(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-cobalto">Ajustes de la cuenta</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full bg-neutral-100 p-2 text-neutral-600 transition-colors hover:bg-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          {/* Datos de la cuenta */}
          <section className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Nombre</span>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSavedOk(false);
                }}
                maxLength={50}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-base text-neutral-800 outline-none focus:ring-2 focus:ring-cobalto/30"
              />
              {name.length > 0 && !nameValid && (
                <span className="mt-1 block text-xs text-alerta">
                  Usa solo letras (2 a 50 caracteres).
                </span>
              )}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Teléfono</span>
              <input
                value={phone}
                onChange={(event) => {
                  // Solo dígitos, máximo 10: el campo nunca acepta letras.
                  setPhone(event.target.value.replace(/\D/g, '').slice(0, 10));
                  setSavedOk(false);
                }}
                inputMode="numeric"
                maxLength={10}
                placeholder="10 dígitos"
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-base text-neutral-800 outline-none focus:ring-2 focus:ring-cobalto/30"
              />
              {!phoneValid && (
                <span className="mt-1 block text-xs text-alerta">
                  El teléfono debe tener 10 dígitos.
                </span>
              )}
            </label>

            <div className="block">
              <span className="text-sm font-medium text-neutral-700">Correo</span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
                <Mail className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                <span className="truncate text-base text-neutral-500">{email || '—'}</span>
              </div>
              <span className="mt-1 block text-xs text-neutral-400">
                El correo con el que te registraste no se puede cambiar.
              </span>
            </div>

            {error && <p className="text-sm text-alerta">{error}</p>}

            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {savedOk && !saving ? (
                <>
                  <Check className="h-4 w-4" /> Guardado
                </>
              ) : (
                'Guardar cambios'
              )}
            </button>
          </section>

          {/* Cambiar contraseña (solo cuentas con contraseña propia) */}
          {canChangePassword && (
            <section className="border-t border-neutral-100 pt-5">
              <button
                type="button"
                onClick={() => setPwOpen((open) => !open)}
                aria-expanded={pwOpen}
                className="flex w-full items-center gap-2 text-left"
              >
                <Lock className="h-4 w-4 flex-shrink-0 text-neutral-500" />
                <span className="flex-1 text-sm font-semibold text-neutral-700">
                  Cambiar contraseña
                </span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 flex-shrink-0 text-neutral-400 transition-transform',
                    pwOpen && 'rotate-180',
                  )}
                />
              </button>

              {pwOpen && (
                <div className="mt-4 space-y-3">
                  {pwDone ? (
                    <p className="flex items-center gap-2 rounded-xl bg-exito/10 px-3 py-2.5 text-sm text-exito">
                      <Check className="h-4 w-4 flex-shrink-0" /> Tu contraseña se actualizó.
                    </p>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-neutral-500">
                          Contraseña actual
                        </label>
                        <PasswordInput
                          value={currentPw}
                          onChange={(value) => {
                            setCurrentPw(value);
                            setPwError(null);
                          }}
                          placeholder="Tu contraseña actual"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-neutral-500">
                          Nueva contraseña
                        </label>
                        <PasswordInput
                          value={newPw}
                          onChange={setNewPw}
                          placeholder="Nueva contraseña"
                        />
                        <ul className="mt-2 space-y-1">
                          {passwordRules.map((rule) => {
                            const ok = rule.test(newPw);
                            return (
                              <li key={rule.id} className="flex items-center gap-2 text-xs">
                                <Bone
                                  className={cn(
                                    'h-3.5 w-3.5 flex-shrink-0',
                                    ok ? 'text-exito' : 'text-neutral-300',
                                  )}
                                />
                                <span className={ok ? 'text-neutral-600' : 'text-neutral-400'}>
                                  {rule.label}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                        {newPw.length > 0 && !pwDifferent && (
                          <p className="mt-1 text-xs text-alerta">
                            La nueva contraseña debe ser distinta a la actual.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-neutral-500">
                          Confirmar nueva contraseña
                        </label>
                        <PasswordInput
                          value={confirmPw}
                          onChange={setConfirmPw}
                          placeholder="Repite la nueva contraseña"
                        />
                        {confirmPw.length > 0 && !pwMatches && (
                          <p className="mt-1 text-xs text-alerta">Las contraseñas no coinciden.</p>
                        )}
                      </div>

                      {pwError && <p className="text-sm text-alerta">{pwError}</p>}

                      <button
                        type="button"
                        onClick={submitPassword}
                        disabled={!canChangePw}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-cobalto py-2.5 text-sm font-semibold text-cobalto transition-colors hover:bg-cobalto/5 disabled:opacity-50"
                      >
                        {savingPw && <Loader2 className="h-4 w-4 animate-spin" />}
                        Actualizar contraseña
                      </button>
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Zona de peligro: eliminar cuenta */}
          <section className="border-t border-neutral-100 pt-5">
            <button
              type="button"
              onClick={() => setDelOpen((open) => !open)}
              aria-expanded={delOpen}
              className="flex w-full items-center gap-2 text-left"
            >
              <Trash2 className="h-4 w-4 flex-shrink-0 text-alerta" />
              <span className="flex-1 text-sm font-semibold text-alerta">Eliminar mi cuenta</span>
              <ChevronDown
                className={cn(
                  'h-5 w-5 flex-shrink-0 text-neutral-400 transition-transform',
                  delOpen && 'rotate-180',
                )}
              />
            </button>

            {delOpen && (
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-2 rounded-xl border border-alerta/20 bg-alerta/5 p-3 text-sm text-neutral-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-alerta" />
                  <p>
                    Esta acción es permanente. Se borrarán tu perfil, tus reportes y tus datos, y no
                    se pueden recuperar.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    ¿Por qué te vas? (nos ayuda a mejorar)
                  </label>
                  <select
                    value={delReason}
                    onChange={(event) => setDelReason(event.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
                  >
                    {deleteReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    ¿Algo que quieras contarnos? (opcional)
                  </label>
                  <textarea
                    value={delFeedback}
                    onChange={(event) => setDelFeedback(event.target.value)}
                    maxLength={300}
                    rows={2}
                    placeholder="Tu comentario nos ayuda a mejorar Dasha."
                    className="w-full resize-none rounded-xl border border-neutral-200 p-3 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Escribe <span className="font-bold text-alerta">{DELETE_WORD}</span> para
                    confirmar
                  </label>
                  <input
                    value={delConfirm}
                    onChange={(event) => setDelConfirm(event.target.value)}
                    autoCapitalize="characters"
                    placeholder={DELETE_WORD}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-base text-neutral-800 outline-none focus:ring-2 focus:ring-alerta/30"
                  />
                </div>

                {delError && <p className="text-sm text-alerta">{delError}</p>}

                <button
                  type="button"
                  onClick={submitDelete}
                  disabled={!canDelete}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-alerta py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Eliminar mi cuenta para siempre
                </button>
              </div>
            )}
          </section>
        </div>
      </motion.div>
    </div>
  );
}
