import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
};

export function PasswordInput({
  value,
  onChange,
  onBlur,
  placeholder = 'Contraseña',
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 transition-colors focus-within:border-cobalto">
      {/* Tope de 64: bcrypt solo considera los primeros 72 bytes, así que una
          contraseña más larga daría una falsa sensación de seguridad. */}
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        maxLength={64}
        placeholder={placeholder}
        className="w-full bg-transparent py-3 text-base text-neutral-700 outline-none placeholder:text-neutral-400"
      />
      <button
        type="button"
        onClick={() => setShow((current) => !current)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="flex-shrink-0 text-neutral-400 transition-colors hover:text-neutral-600"
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}
