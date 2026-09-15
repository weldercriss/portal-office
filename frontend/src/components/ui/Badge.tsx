import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type BadgeTone = 'cyan' | 'blue' | 'teal' | 'purple' | 'neutral' | 'success' | 'warning' | 'danger';

const TONE_CLASSES: Record<BadgeTone, string> = {
  cyan: 'bg-[var(--color-accent-soft)] text-[var(--color-text-primary)]',
  blue: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
  teal: 'bg-[var(--color-teal-soft)] text-[var(--color-text-primary)]',
  purple: 'bg-[var(--color-purple-soft)] text-[var(--color-purple)]',
  neutral: 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]',
  success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-bold',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
