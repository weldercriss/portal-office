import type { ReactNode } from 'react';

/** Contêiner de conteúdo das páginas: largura máxima e respiro consistentes. */
export function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-[var(--page-px)] py-8">{children}</div>;
}
