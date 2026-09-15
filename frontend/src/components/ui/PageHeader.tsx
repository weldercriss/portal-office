import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
      <div>
        {/* Display em Bricolage Grotesque, como no shell do CS-OPS. */}
        <h1 className="font-bricolage text-[28px] font-bold leading-tight tracking-[-0.5px] text-[var(--color-text-primary)]">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
