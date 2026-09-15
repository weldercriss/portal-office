import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/configuracoes/plantoes/turnos', label: 'Turnos' },
  { to: '/configuracoes/plantoes/tipos-plantao', label: 'Tipos de plantão' },
];

export function ConfiguracoesPlantoesLayout() {
  return (
    <>
      <nav aria-label="Configurações de plantões" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              [
                'rounded-lg px-4 py-2 text-sm font-bold transition-colors',
                isActive
                  ? 'bg-[var(--color-accent)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
              ].join(' ')
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </>
  );
}
