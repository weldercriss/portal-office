import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

function normalizeDateValue(value: string, type: InputHTMLAttributes<HTMLInputElement>['type']) {
  if (type !== 'date' && type !== 'datetime-local') return value;

  return value.replace(/^(\d{4})\d+(-\d{2}-\d{2}(?:T.*)?)$/, '$1$2');
}

export function Input({ className, type, value, defaultValue, onChange, max, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const isDateInput = type === 'date' || type === 'datetime-local';
  const normalizedValue = typeof value === 'string' ? normalizeDateValue(value, type) : value;
  const normalizedDefaultValue = typeof defaultValue === 'string' ? normalizeDateValue(defaultValue, type) : defaultValue;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const normalizedEventValue = normalizeDateValue(event.target.value, type);
    if (normalizedEventValue !== event.target.value) {
      event.target.value = normalizedEventValue;
    }
    onChange?.(event);
  }

  return (
    <input
      className={cn(
        'h-10 w-full rounded-[var(--radius-field)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-focus)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-hover)]',
        className,
      )}
      {...props}
      type={type}
      value={normalizedValue}
      defaultValue={normalizedDefaultValue}
      max={max ?? (isDateInput ? (type === 'date' ? '9999-12-31' : '9999-12-31T23:59') : undefined)}
      onChange={handleChange}
    />
  );
}
