import type { ChangeEvent } from 'react';

interface StatusToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

/** Chave ligado/desligado nas cores do Tangram: cyan quando ativo. */
export function StatusToggle({ checked, onChange, label }: StatusToggleProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.checked);
  }

  return (
    <label
      className="relative inline-flex h-10 cursor-pointer items-center gap-3 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3"
      title={label}
    >
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={handleChange} aria-label={label} />
      <span className="relative h-5 w-9 shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-border-strong)] transition-colors duration-200 peer-checked:bg-[var(--color-accent)]" />
      <span className="pointer-events-none absolute left-[15px] h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-4" />
    </label>
  );
}
