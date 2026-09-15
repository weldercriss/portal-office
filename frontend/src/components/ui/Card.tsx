import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Aplica a sombra do Tangram além da borda. */
  elevated?: boolean;
}

export function Card({ elevated = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]',
        elevated && 'shadow-elegant',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('mb-4 text-[13px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]', className)}
      {...props}
    />
  );
}
