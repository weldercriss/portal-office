import { useEffect, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
  fitViewport?: boolean;
}

export function Dialog({ open, onOpenChange, title, children, className = 'max-w-md', fitViewport = false }: DialogProps) {
  useEffect(() => {
    if (!open || !fitViewport) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open, fitViewport]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onOpenChange(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'flex w-full flex-col overflow-y-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-elegant',
          fitViewport ? 'max-h-[calc(100dvh-2rem)] p-4 sm:p-5' : 'max-h-[85vh] p-6',
          className,
        )}
      >
        <div className="mb-5 flex shrink-0 items-start justify-between gap-4">
          <h2 className="font-bricolage text-xl font-bold tracking-[-0.3px] text-[var(--color-text-primary)]">{title}</h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
            className="rounded-[8px] p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
