import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/configuracoes/plataforma/usuarios-master', label: 'Usuários master' },
  { to: '/configuracoes/plataforma/logs', label: 'Logs' },
];

export function PlataformaLayout() {
  return (
    <div>
      <nav className="mb-4 flex flex-wrap gap-1 border-b border-[var(--color-border)]">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              [
                '-mb-px border-b-2 px-3 py-1.5 text-sm font-bold transition-colors',
                isActive
                  ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              ].join(' ')
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
