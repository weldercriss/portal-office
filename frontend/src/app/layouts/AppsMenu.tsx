import { useEffect, useRef, useState } from 'react';
import { SvgIcon } from '../../components/system/SvgIcon';

/**
 * Atalho para outras aplicações (ainda sem itens cadastrados — placeholder
 * pronto para quando essas aplicações forem definidas).
 */
export function AppsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Outras aplicações"
        aria-expanded={isOpen}
        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
      >
        <SvgIcon name="grid" className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 flex w-72 flex-col rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-elegant">
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <span className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              Outras aplicações
            </span>
          </div>
          <p className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
            Nenhuma aplicação conectada ainda.
          </p>
        </div>
      )}
    </div>
  );
}
