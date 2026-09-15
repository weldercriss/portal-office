import type { ReactNode } from 'react';

interface ListToolbarProps {
  children: ReactNode;
  actions?: ReactNode;
}

/** Barra acima de uma lista: filtros/busca à esquerda, ações à direita. */
export function ListToolbar({ children, actions }: ListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
      <div className="flex flex-1 items-center gap-3">{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
